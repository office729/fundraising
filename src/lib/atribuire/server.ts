import "server-only";

import { createHmac } from "node:crypto";

import { and, asc, eq, gte, isNull, sql } from "drizzle-orm";
import { cookies, headers } from "next/headers";

import { obtineIpClient, verificaLimitaRata } from "@/lib/auth/rate-limit";
import { db } from "@/lib/db";
import {
  atribConversii,
  atribEvenimente,
  crmKv,
  formular230Beneficiari,
  fundraisingPages,
  organizations,
} from "@/lib/db/schema";
import { raporteazaEroare } from "@/lib/monitoring";
import {
  clasificaDispozitiv,
  esteBot,
} from "@/lib/statistici-campanii/clasificare";

import {
  caleCurata,
  clasifica,
  esteCanal,
  esteMetoda,
  esteTip,
  FEREASTRA_IMPLICITA_ZILE,
  FEREASTRA_MAXIMA_ZILE,
  FEREASTRA_MINIMA_ZILE,
  MODEL_VERSIUNE,
  parseazaContext,
  type Clasificare,
  type ContextAtribuire,
  type Flux,
  type Semnale,
} from "./clasificare";
import {
  alegeAtribuire,
  atribuireDintrOAtingere,
  type AtingereAtribuita,
  type RezultatAtribuire,
  type SesiuneObservata,
} from "./model";

// Evenimentele permise pe fiecare flux. „sponsorizare20” nu are pagini publice (contractele se generează în CRM), deci nu primește evenimente de pe web.
export const EVENIMENTE_PE_FLUX: Record<Flux, string[]> = {
  campanie: ["vizita", "click_doneaza", "start_donatie"],
  f230: ["vizita", "start_formular"],
  sponsorizare20: [],
  platforma: ["vizita", "inscriere_pornita"],
};

export type ContextDb = typeof db;

const ziuaRo = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Bucharest",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

// În afara unei cereri (teste, scripturi) nu există antete: domeniile proprii rămân cele din configurare.
async function hostCurent(): Promise<string | null> {
  try {
    return (await headers()).get("host");
  } catch {
    return null;
  }
}

export function gazdeProprii(host: string | null): string[] {
  let site = "alexandrit.ro";
  try {
    site = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://alexandrit.ro")
      .hostname;
  } catch {
    // adresa de site invalidă: rămâne valoarea implicită
  }
  return [host ?? "", site, "alexandrit.ro"]
    .map((x) => x.replace(/^www\./, "").split(":")[0]!)
    .filter(Boolean);
}

// ---------- fereastra de atribuire (configurabilă pe organizație) ----------

const CHEIE_CONFIG = "atribuire-config";
export const limiteazaFereastra = (z: unknown): number => {
  const n = typeof z === "number" ? z : Number(z);
  return Number.isFinite(n)
    ? Math.min(
        FEREASTRA_MAXIMA_ZILE,
        Math.max(FEREASTRA_MINIMA_ZILE, Math.round(n)),
      )
    : FEREASTRA_IMPLICITA_ZILE;
};

export async function citesteFereastra(
  dbx: ContextDb,
  orgId: string,
): Promise<number> {
  try {
    const [r] = await dbx
      .select({ data: crmKv.data })
      .from(crmKv)
      .where(and(eq(crmKv.orgId, orgId), eq(crmKv.path, CHEIE_CONFIG)))
      .limit(1);
    const d = r?.data as { fereastraZile?: unknown } | null | undefined;
    return d && d.fereastraZile !== undefined
      ? limiteazaFereastra(d.fereastraZile)
      : FEREASTRA_IMPLICITA_ZILE;
  } catch {
    return FEREASTRA_IMPLICITA_ZILE;
  }
}

export async function salveazaFereastra(
  dbx: ContextDb,
  orgId: string,
  zile: number,
): Promise<number> {
  const fereastraZile = limiteazaFereastra(zile);
  await dbx
    .insert(crmKv)
    .values({
      orgId,
      path: CHEIE_CONFIG,
      data: { fereastraZile },
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [crmKv.orgId, crmKv.path],
      set: { data: { fereastraZile }, updatedAt: new Date() },
    });
  return fereastraZile;
}

// ---------- înregistrarea unui eveniment (apelată din acțiunea publică) ----------

async function vizitatorZilnic(
  ziua: string,
  ip: string,
  ua: string | null,
): Promise<string | null> {
  const cheie = process.env.ORG_SECRETS_KEY;
  if (!cheie) return null; // fără cheie dedicată nu înregistrăm amprente (o cheie de rezervă le-ar face ușor de regăsit din IP)
  return createHmac("sha256", cheie)
    .update(`atrib|${ziua}|${ip}|${ua ?? ""}`)
    .digest("hex")
    .slice(0, 32);
}

export type EvenimentDeScris = {
  flux: Flux;
  tip: string;
  orgSlug: string | null;
  pageSlug: string | null;
  beneficiarSlug: string | null;
  vizitator: string;
  sesiune: string;
  persistent: boolean;
  c: Clasificare;
  cale: string | null;
  dispozitiv: string;
  ziua: string;
  // Momentul evenimentului (implicit acum); folosit la teste și reimporturi.
  la?: Date;
};

// Partea de bază de date a înregistrării: organizația, campania și contul de Formular 230 se rezolvă pe server din slug-uri, apoi se scrie în contextul organizației.
export async function scrieEveniment(
  v: EvenimentDeScris,
  dbx: ContextDb = db,
): Promise<void> {
  const { c } = v;
  await dbx.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.public_lookup', 'true', true)`);
    let orgId: string | null = null;
    let pageId: string | null = null;
    let beneficiarId: string | null = null;
    if (v.flux === "platforma") {
      await tx.execute(
        sql`select set_config('app.atribuire_site', 'true', true)`,
      );
    } else {
      if (!v.orgSlug) return;
      const [org] = await tx
        .select({ id: organizations.id })
        .from(organizations)
        .where(eq(organizations.slug, v.orgSlug))
        .limit(1);
      if (!org) return;
      orgId = org.id;
      if (v.flux === "campanie") {
        if (!v.pageSlug) return;
        const [pagina] = await tx
          .select({ id: fundraisingPages.id })
          .from(fundraisingPages)
          .where(
            and(
              eq(fundraisingPages.orgId, org.id),
              eq(fundraisingPages.slug, v.pageSlug),
            ),
          )
          .limit(1);
        if (!pagina) return;
        pageId = pagina.id;
      } else if (v.flux === "f230") {
        if (!v.beneficiarSlug) return;
        const [b] = await tx
          .select({ id: formular230Beneficiari.id })
          .from(formular230Beneficiari)
          .where(
            and(
              eq(formular230Beneficiari.orgId, org.id),
              eq(formular230Beneficiari.slug, v.beneficiarSlug),
            ),
          )
          .limit(1);
        if (!b) return;
        beneficiarId = b.id;
      }
      // Scrierea trece prin izolarea pe organizație, ca orice altă scriere de tenant.
      await tx.execute(
        sql`select set_config('app.current_org_id', ${org.id}, true)`,
      );
    }
    await tx.insert(atribEvenimente).values({
      orgId,
      flux: v.flux,
      tip: v.tip,
      pageId,
      beneficiarId,
      vizitatorId: v.vizitator,
      persistent: v.persistent,
      sesiuneId: v.sesiune,
      sursa: c.sursa,
      canal: c.canal,
      tipPromovare: c.tip,
      metoda: c.metoda,
      campanieMarketing: c.campanie,
      continut: c.continut,
      termen: c.termen,
      utmId: c.utmId,
      adClickTip: c.adClickTip,
      adClickId: c.adClickId,
      referrerHost: c.referrerHost,
      cale: v.cale,
      dispozitiv: v.dispozitiv,
      ziua: v.ziua,
        ...(v.la ? { la: v.la } : {}),
    });
  });
}

export type IntrareEveniment = {
  flux: Flux;
  tip: string;
  orgSlug?: string | null;
  pageSlug?: string | null;
  beneficiarSlug?: string | null;
  ctx: string;
  cale: string;
};

export async function inregistreazaEveniment(
  i: IntrareEveniment,
): Promise<void> {
  try {
    if (!(EVENIMENTE_PE_FLUX[i.flux] ?? []).includes(i.tip)) return;
    // Previzualizările de pe Vercel folosesc aceeași bază: nu le numărăm ca trafic real.
    if (process.env.VERCEL_ENV === "preview") return;
    const h = await headers();
    // Semnalele „nu mă urmări” ale browserului se respectă.
    if (h.get("dnt") === "1" || h.get("sec-gpc") === "1") return;
    const ua = h.get("user-agent");
    if (esteBot(ua)) return;
    // Membrii echipei (sesiune de autentificare) care își privesc propriile pagini nu se numără ca public.
    const biscuiti = await cookies();
    if (
      biscuiti
        .getAll()
        .some((c) => c.name.startsWith("sb-") && c.name.includes("auth-token"))
    )
      return;

    const ip = await obtineIpClient();
    if (!(await verificaLimitaRata("atrib-eveniment", ip, 300, 10))) return;

    const ctx = parseazaContext(i.ctx);
    const ziua = ziuaRo();
    const semnale = ctx?.semnale ?? {};
    let vizitator: string | null;
    let sesiune: string;
    let persistent = false;
    if (ctx?.v && ctx.s) {
      vizitator = ctx.v;
      sesiune = ctx.s;
      persistent = true;
    } else {
      vizitator = await vizitatorZilnic(ziua, ip, ua);
      sesiune = vizitator ?? "";
    }
    if (!vizitator) return;
    const c = clasifica(semnale, gazdeProprii(h.get("host")));
    const cale = caleCurata(i.cale);
    const dispozitiv = clasificaDispozitiv(ua);

    await scrieEveniment({
      flux: i.flux,
      tip: i.tip,
      orgSlug: i.orgSlug ?? null,
      pageSlug: i.pageSlug ?? null,
      beneficiarSlug: i.beneficiarSlug ?? null,
      vizitator,
      sesiune,
      persistent,
      c,
      cale,
      dispozitiv,
      ziua,
    });
  } catch (e) {
    raporteazaEroare("atribuire-eveniment", e, { flux: i.flux, tip: i.tip });
  }
}

// ---------- instantaneul de atribuire al unei conversii ----------

const dinRand = (r: {
  sesiuneId: string;
  la: Date;
  sursa: string;
  canal: string;
  tipPromovare: string;
  metoda: string;
  campanieMarketing: string | null;
  continut: string | null;
  termen: string | null;
  utmId: string | null;
  adClickTip: string | null;
  adClickId: string | null;
  referrerHost: string | null;
}): SesiuneObservata => ({
  sesiuneId: r.sesiuneId,
  la: r.la,
  clasificare: {
    sursa: r.sursa,
    canal: esteCanal(r.canal) ? r.canal : "altele",
    tip: esteTip(r.tipPromovare) ? r.tipPromovare : "nedeterminat",
    metoda: esteMetoda(r.metoda) ? r.metoda : "necunoscut",
    campanie: r.campanieMarketing,
    continut: r.continut,
    termen: r.termen,
    utmId: r.utmId,
    adClickTip: (r.adClickTip as Clasificare["adClickTip"]) ?? null,
    adClickId: r.adClickId,
    referrerHost: r.referrerHost,
  },
});

// Sesiunile unui vizitator: câte o clasificare pe sesiune (cea a primului eveniment al sesiunii). Pentru cei fără acord (amprentă zilnică) nu există istoric între zile.
export async function sesiuniVizitator(
  dbx: ContextDb,
  orgId: string | null,
  vizitatorId: string,
  dupa: Date | null = null,
): Promise<SesiuneObservata[]> {
  const rows = await dbx
    .select({
      sesiuneId: atribEvenimente.sesiuneId,
      la: atribEvenimente.la,
      sursa: atribEvenimente.sursa,
      canal: atribEvenimente.canal,
      tipPromovare: atribEvenimente.tipPromovare,
      metoda: atribEvenimente.metoda,
      campanieMarketing: atribEvenimente.campanieMarketing,
      continut: atribEvenimente.continut,
      termen: atribEvenimente.termen,
      utmId: atribEvenimente.utmId,
      adClickTip: atribEvenimente.adClickTip,
      adClickId: atribEvenimente.adClickId,
      referrerHost: atribEvenimente.referrerHost,
    })
    .from(atribEvenimente)
    .where(
      and(
        orgId
          ? eq(atribEvenimente.orgId, orgId)
          : isNull(atribEvenimente.orgId),
        eq(atribEvenimente.vizitatorId, vizitatorId),
        dupa ? gte(atribEvenimente.la, dupa) : undefined,
      ),
    )
    .orderBy(asc(atribEvenimente.la))
    .limit(500);
  const prima = new Map<string, SesiuneObservata>();
  for (const r of rows)
    if (!prima.has(r.sesiuneId)) prima.set(r.sesiuneId, dinRand(r));
  return [...prima.values()];
}

export type IntrareConversie = {
  orgId: string | null;
  tip: "donatie" | "f230" | "lead" | "cont";
  entitateId: string;
  flux: Flux;
  pageId?: string | null;
  beneficiarId?: string | null;
  ctx: string | null | undefined;
  // Contextul bazei de date în care se scrie: pentru conversiile unei organizații, org_id e deja setat; pentru platformă se setează app.atribuire_site aici.
  dbx?: ContextDb;
  acum?: Date;
};

const campuri = (p: string, a: AtingereAtribuita | null) =>
  a
    ? {
        [`${p}Sursa`]: a.sursa,
        [`${p}Canal`]: a.canal,
        [`${p}Tip`]: a.tip,
        [`${p}Metoda`]: a.metoda,
        [`${p}Campanie`]: a.campanie,
        [`${p}Continut`]: a.continut,
      }
    : {};

// Calculează atribuirea conversiei din istoricul vizitatorului (dacă există) și din adresa curentă, apoi o salvează o singură dată pe conversie.
// Nu aruncă niciodată: măsurarea nu are voie să strice o donație, un formular sau o înscriere.
export async function inregistreazaConversie(
  i: IntrareConversie,
): Promise<void> {
  try {
    const acum = i.acum ?? new Date();
    const ctx: ContextAtribuire | null = parseazaContext(i.ctx);
    const proprii = gazdeProprii(await hostCurent());
    const adresaCurenta = clasifica(ctx?.semnale ?? ({} as Semnale), proprii);
    const executa = async (tx: ContextDb) => {
      const fereastra = i.orgId
        ? await citesteFereastra(tx, i.orgId)
        : FEREASTRA_IMPLICITA_ZILE;
      let rezultat: RezultatAtribuire;
      const persistent = !!(ctx?.v && ctx.s);
      if (persistent) {
        const sesiuni = await sesiuniVizitator(tx, i.orgId, ctx!.v!);
        // Dacă evenimentul vizitei nu s-a înregistrat (limită de cereri, rețea), adresa curentă ține loc de sesiune.
        if (!sesiuni.some((s) => s.sesiuneId === ctx!.s))
          sesiuni.push({
            sesiuneId: ctx!.s!,
            la: acum,
            clasificare: adresaCurenta,
          });
        rezultat = alegeAtribuire(sesiuni, ctx!.s!, acum, fereastra);
      } else {
        rezultat = atribuireDintrOAtingere(adresaCurenta, acum);
      }
      const v = {
        orgId: i.orgId,
        tip: i.tip,
        entitateId: i.entitateId,
        flux: i.flux,
        pageId: i.pageId ?? null,
        beneficiarId: i.beneficiarId ?? null,
        vizitatorId: persistent ? ctx!.v! : null,
        sesiuneId: persistent ? ctx!.s! : null,
        persistent,
        consimtamant: persistent ? "acord-statistici" : "fara-stocare",
        model: MODEL_VERSIUNE,
        fereastraZile: fereastra,
        conversieLa: acum,
        primaLa: rezultat.prima?.la ?? null,
        ultLa: rezultat.ultima?.la ?? null,
        ...campuri("prima", rezultat.prima),
        ...campuri("ses", rezultat.sesiune),
        ...campuri("ult", rezultat.ultima),
      };
      await tx
        .insert(atribConversii)
        .values(v as typeof atribConversii.$inferInsert)
        .onConflictDoNothing();
    };
    if (i.dbx) {
      await executa(i.dbx);
    } else {
      await db.transaction(async (tx) => {
        if (i.orgId)
          await tx.execute(
            sql`select set_config('app.current_org_id', ${i.orgId}, true)`,
          );
        else
          await tx.execute(
            sql`select set_config('app.atribuire_site', 'true', true)`,
          );
        await executa(tx as unknown as ContextDb);
      });
    }
  } catch (e) {
    raporteazaEroare("atribuire-conversie", e, {
      tip: i.tip,
      orgId: i.orgId ?? undefined,
    });
  }
}
