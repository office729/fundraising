"use server";

import { and, count, desc, eq, gte, inArray, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { inregistreazaAudit } from "@/lib/audit";
import { withOrgFaze, withOrgSession } from "@/lib/auth/guard";
import { appUsers, companies, companyNotite, contacts, prospectareCandidati, prospectareChei, prospectareJurnal, prospectareSuprimati } from "@/lib/db/schema";
import { EroareUtilizator, mesajSigur } from "@/lib/erori";
import {
  apolloImbogatesteFirma,
  cautaDecidenti,
  cheieNume,
  crediteFurnizor,
  domeniuDinEmail,
  domeniuDinSite,
  FURNIZORI,
  grupRol,
  linkedinNormalizat,
  linkedinSigur,
  NUME_FURNIZOR,
  prenumeSiNume,
  waalaxyTrimite,
  type Credite,
  type DateFirmaApollo,
  type Furnizor,
  type ProspectWaalaxy,
  type Rezultat,
  type RezultatCautare,
} from "@/lib/prospectare/motor";
import { adaugaZileLucratoare, APELURI_REZERVATE_PER_CAUTARE, aziBucuresti, COOLDOWN_CAUTARE_ORE, LIMITA_APELURI_PE_ZI, REZERVARE_EXPIRA_MIN } from "@/lib/prospectare/limite";
import { decripteaza } from "@/lib/secret-box";
import { noteazaInvitatie } from "@/lib/waalaxy-server";
import { getLocale } from "@/lib/i18n/get-locale";
import { COMPANII_UI_DICT } from "@/lib/i18n/dictionaries/companii-ui";

// Mesajele afișate utilizatorului, în limba aleasă (cookie-ul de limbă).
const mesaje = async () => COMPANII_UI_DICT[await getLocale()].msg;

// Prospectare de decidenți pentru o firmă (pachetul IMPACT). Folosește cheile PROPRII ale organizației la Lusha, Apollo, Prospeo și Hunter (Setări → Prospectare).
// Persoanele găsite stau în cutia „De aprobat” până le aprobă cineva din echipă; abia atunci devin contacte ale firmei, cu un responsabil și un prim pas cu termen.
// Apelurile către furnizori se fac în afara tranzacției (withOrgFaze), ca o conexiune la baza de date să nu stea blocată cât durează.

const OPTIUNI = { modul: "prospectare-multi" as const };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const esteAdminRol = (rol: string) => rol === "owner" || rol === "admin";

export type CandidatRand = {
  id: string;
  nume: string;
  rol: string | null;
  dept: string | null;
  linkedin: string | null;
  email: string | null;
  emailStatus: string | null;
  sursa: string;
  scor: number;
  eticheta: string | null;
  gasitLa: string;
};

export type StareProspectare = {
  furnizoriConfigurati: Furnizor[];
  waalaxyGata: boolean; // cheia Waalaxy e conectată și o listă e aleasă
  esteAdmin: boolean; // doar administratorii pot adăuga chei sau repeta o căutare recentă
  apeluriAzi: number;
  limitaApeluri: number;
  ultimaCautare: { la: string; deCine: string | null } | null;
  candidati: CandidatRand[];
};

// Apelurile reale făcute în ultimele 24 de ore plus rezervările active (căutări în curs); rezervările uitate expiră.
async function apeluriFolosite(db: Parameters<Parameters<typeof withOrgSession>[0]>[0]["db"], orgId: string): Promise<number> {
  const [reale, rezervate] = await Promise.all([
    db.select({ n: count() }).from(prospectareJurnal).where(and(eq(prospectareJurnal.orgId, orgId), ne(prospectareJurnal.operatie, "rezervare"), gte(prospectareJurnal.createdAt, sql`now() - interval '24 hours'`))),
    db
      .select({ n: sql<number>`coalesce(sum(${prospectareJurnal.unitati}), 0)::int` })
      .from(prospectareJurnal)
      .where(and(eq(prospectareJurnal.orgId, orgId), eq(prospectareJurnal.operatie, "rezervare"), gte(prospectareJurnal.createdAt, sql`now() - make_interval(mins => ${REZERVARE_EXPIRA_MIN})`))),
  ]);
  return (reale[0]?.n ?? 0) + (rezervate[0]?.n ?? 0);
}

export const getStareProspectare = withOrgSession(
  async (ctx, companyId: string): Promise<StareProspectare> => {
    const gol: StareProspectare = { furnizoriConfigurati: [], waalaxyGata: false, esteAdmin: esteAdminRol(ctx.role), apeluriAzi: 0, limitaApeluri: LIMITA_APELURI_PE_ZI, ultimaCautare: null, candidati: [] };
    if (!UUID.test(companyId)) return gol;
    const [chei, azi, ultima, candidati] = await Promise.all([
      ctx.db.select({ furnizor: prospectareChei.provider, setari: prospectareChei.setari }).from(prospectareChei).where(eq(prospectareChei.orgId, ctx.orgId)),
      apeluriFolosite(ctx.db, ctx.orgId),
      ctx.db
        .select({ la: prospectareJurnal.createdAt, nume: appUsers.name, email: appUsers.email })
        .from(prospectareJurnal)
        .leftJoin(appUsers, eq(appUsers.id, prospectareJurnal.userId))
        .where(and(eq(prospectareJurnal.orgId, ctx.orgId), eq(prospectareJurnal.companyId, companyId), eq(prospectareJurnal.operatie, "cautare")))
        .orderBy(desc(prospectareJurnal.createdAt))
        .limit(1),
      ctx.db
        .select()
        .from(prospectareCandidati)
        .where(and(eq(prospectareCandidati.orgId, ctx.orgId), eq(prospectareCandidati.companyId, companyId), eq(prospectareCandidati.stare, "nou")))
        .orderBy(desc(prospectareCandidati.scor)),
    ]);
    return {
      ...gol,
      furnizoriConfigurati: chei.map((c) => c.furnizor as Furnizor).filter((p) => FURNIZORI.includes(p)),
      waalaxyGata: chei.some((c) => c.furnizor === "waalaxy" && Boolean(c.setari?.listaId)),
      apeluriAzi: azi,
      ultimaCautare: ultima[0] ? { la: ultima[0].la.toISOString(), deCine: ultima[0].nume || (ultima[0].email ? ultima[0].email.split("@")[0] : null) } : null,
      candidati: candidati.map((c) => ({
        id: c.id,
        nume: c.nume,
        rol: c.rol,
        dept: c.dept,
        linkedin: c.linkedin,
        email: c.email,
        emailStatus: c.emailStatus,
        sursa: c.sursa,
        scor: c.scor,
        eticheta: c.eticheta,
        gasitLa: c.gasitLa.toISOString(),
      })),
    };
  },
  OPTIUNI,
);

// Creditele rămase în conturile organizației, citite de la furnizori (apeluri de cont gratuite). Apollo și Waalaxy nu le expun: apar doar ca „conectat”.
export type CreditFurnizor = { furnizor: Furnizor | "waalaxy"; conectat: boolean; credite: Credite | null; eroare?: string };

export const getCredite = withOrgFaze<[], { chei: Partial<Record<Furnizor, string>>; waalaxy: boolean }, CreditFurnizor[], CreditFurnizor[]>({
  opts: OPTIUNI,
  pregateste: async (ctx) => {
    const randuri = await ctx.db.select({ furnizor: prospectareChei.provider, enc: prospectareChei.cheieEnc }).from(prospectareChei).where(eq(prospectareChei.orgId, ctx.orgId));
    const chei: Partial<Record<Furnizor, string>> = {};
    let waalaxy = false;
    for (const r of randuri) {
      if (r.furnizor === "waalaxy") waalaxy = true;
      if (!FURNIZORI.includes(r.furnizor as Furnizor)) continue;
      try {
        chei[r.furnizor as Furnizor] = decripteaza(r.enc);
      } catch {
        // cheie ilizibilă: se tratează ca neconectată
      }
    }
    return { pregatit: { chei, waalaxy } };
  },
  extern: async (p): Promise<CreditFurnizor[]> => {
    const rezultate = await Promise.all(
      FURNIZORI.map(async (f): Promise<CreditFurnizor> => {
        const cheie = p.chei[f];
        if (!cheie) return { furnizor: f, conectat: false, credite: null };
        const r = await crediteFurnizor(f, cheie, fetch);
        return r.ok ? { furnizor: f, conectat: true, credite: r.date } : { furnizor: f, conectat: true, credite: null, eroare: r.eroare };
      }),
    );
    return [...rezultate, { furnizor: "waalaxy", conectat: p.waalaxy, credite: null }];
  },
  salveaza: async (_ctx, _p, r) => r,
});

export type RezultatActiune = {
  ok: boolean;
  eroare?: string;
  gasiti?: number;
  noi?: number;
  avertismente?: string[];
  // Firma a fost căutată recent: se cere confirmare (doar administratorii o pot da), ca să nu se plătească de două ori aceleași rezultate.
  deja?: { la: string; deCine: string | null; poateForta: boolean };
};

type Pregatit = {
  companyId: string;
  firma: { nume: string; site: string | null; angajati: number | null };
  domeniuAlternativ: string | null;
  chei: Partial<Record<Furnizor, string>>;
  cunoscute: { chei: string[]; emailuri: string[]; linkedin: string[] };
  suprimate: { chei: string[]; emailuri: string[]; linkedin: string[] };
  rezerva: number;
  rezervareId: string;
};

export const cautaDecidentiAction = withOrgFaze<[string, boolean], Pregatit, RezultatCautare, RezultatActiune>({
  opts: OPTIUNI,
  pregateste: async (ctx, companyId, forteaza) => {
    const m = await mesaje();
    if (!UUID.test(companyId)) throw new EroareUtilizator(m.firmaNegasita);
    const [firma] = await ctx.db
      .select({ nume: companies.nume, site: companies.site, angajati: companies.nrAngajati })
      .from(companies)
      .where(and(eq(companies.id, companyId), eq(companies.orgId, ctx.orgId), sql`${companies.deletedAt} is null`))
      .limit(1);
    if (!firma) throw new EroareUtilizator(m.firmaNegasita);

    const chei: Partial<Record<Furnizor, string>> = {};
    const randuriChei = await ctx.db.select({ furnizor: prospectareChei.provider, enc: prospectareChei.cheieEnc }).from(prospectareChei).where(eq(prospectareChei.orgId, ctx.orgId));
    for (const r of randuriChei) {
      if (!FURNIZORI.includes(r.furnizor as Furnizor)) continue;
      try {
        chei[r.furnizor as Furnizor] = decripteaza(r.enc);
      } catch {
        // cheie ilizibilă (ORG_SECRETS_KEY schimbată): se tratează ca lipsă
      }
    }
    if (Object.keys(chei).length === 0) return { gata: { ok: false, eroare: m.nicioCheie } };

    // Aceeași firmă nu se caută din nou fără confirmare: descoperirea se plătește de fiecare dată. Repetarea o poate cere doar un administrator.
    const [recenta] = await ctx.db
      .select({ la: prospectareJurnal.createdAt, nume: appUsers.name, email: appUsers.email })
      .from(prospectareJurnal)
      .leftJoin(appUsers, eq(appUsers.id, prospectareJurnal.userId))
      .where(
        and(
          eq(prospectareJurnal.orgId, ctx.orgId),
          eq(prospectareJurnal.companyId, companyId),
          eq(prospectareJurnal.operatie, "cautare"),
          eq(prospectareJurnal.ok, true),
          gte(prospectareJurnal.createdAt, sql`now() - make_interval(hours => ${COOLDOWN_CAUTARE_ORE})`),
        ),
      )
      .orderBy(desc(prospectareJurnal.createdAt))
      .limit(1);
    const poateForta = esteAdminRol(ctx.role);
    if (recenta && !(forteaza && poateForta)) {
      return {
        gata: {
          ok: false,
          eroare: poateForta
            ? m.cautataRecentAdmin
            : m.cautataRecentMembru,
          deja: { la: recenta.la.toISOString(), deCine: recenta.nume || (recenta.email ? recenta.email.split("@")[0] : null), poateForta },
        },
      };
    }

    // Limita zilnică: citire, verificare și rezervare într-o singură tranzacție, sub un lock pe organizație. Fără rezervare, N căutări simultane ar vedea
    // toate aceeași limită liberă și ar depăși-o împreună.
    await ctx.db.execute(sql`select pg_advisory_xact_lock(hashtext(${ctx.orgId}))`);
    const folosite = await apeluriFolosite(ctx.db, ctx.orgId);
    const ramase = LIMITA_APELURI_PE_ZI - folosite;
    if (ramase <= 0) return { gata: { ok: false, eroare: m.limitaZilnica } };
    const rezerva = Math.min(ramase, APELURI_REZERVATE_PER_CAUTARE);
    const [rezervare] = await ctx.db
      .insert(prospectareJurnal)
      .values({ orgId: ctx.orgId, provider: "rezervare", operatie: "rezervare", ok: true, unitati: rezerva, companyId, userId: ctx.userId })
      .returning({ id: prospectareJurnal.id });

    const [deLaFirma, candidatiExistenti, suprimate] = await Promise.all([
      ctx.db.select({ nume: contacts.nume, email: contacts.email, linkedin: contacts.linkedin }).from(contacts).where(and(eq(contacts.companyId, companyId), eq(contacts.orgId, ctx.orgId))),
      ctx.db.select({ numeNorm: prospectareCandidati.numeNorm, email: prospectareCandidati.email, linkedin: prospectareCandidati.linkedin }).from(prospectareCandidati).where(and(eq(prospectareCandidati.companyId, companyId), eq(prospectareCandidati.orgId, ctx.orgId))),
      ctx.db.select({ tip: prospectareSuprimati.tip, valoare: prospectareSuprimati.valoare }).from(prospectareSuprimati).where(eq(prospectareSuprimati.orgId, ctx.orgId)),
    ]);

    const cunoscute = { chei: new Set<string>(), emailuri: new Set<string>(), linkedin: new Set<string>() };
    for (const c of deLaFirma) {
      const k = cheieNume(c.nume);
      if (k) cunoscute.chei.add(k);
      if (c.email) cunoscute.emailuri.add(c.email.toLowerCase());
      const l = linkedinNormalizat(c.linkedin);
      if (l) cunoscute.linkedin.add(l);
    }
    for (const c of candidatiExistenti) {
      cunoscute.chei.add(c.numeNorm);
      if (c.email) cunoscute.emailuri.add(c.email.toLowerCase());
      const l = linkedinNormalizat(c.linkedin);
      if (l) cunoscute.linkedin.add(l);
    }
    const supr = { chei: [] as string[], emailuri: [] as string[], linkedin: [] as string[] };
    for (const s of suprimate) (s.tip === "email" ? supr.emailuri : s.tip === "linkedin" ? supr.linkedin : supr.chei).push(s.valoare);

    // Domeniul din e-mailul unui contact existent ajută când firma nu are site completat.
    const domeniuAlternativ = deLaFirma.map((c) => domeniuDinEmail(c.email)).find(Boolean) ?? null;
    return {
      pregatit: {
        companyId,
        firma: { nume: firma.nume, site: firma.site, angajati: firma.angajati },
        domeniuAlternativ,
        chei,
        cunoscute: { chei: [...cunoscute.chei], emailuri: [...cunoscute.emailuri], linkedin: [...cunoscute.linkedin] },
        suprimate: supr,
        rezerva,
        rezervareId: rezervare.id,
      },
    };
  },
  extern: (p) =>
    cautaDecidenti({
      firma: p.firma,
      domeniuAlternativ: p.domeniuAlternativ,
      chei: p.chei,
      cunoscute: { chei: new Set(p.cunoscute.chei), emailuri: new Set(p.cunoscute.emailuri), linkedin: new Set(p.cunoscute.linkedin) },
      suprimate: { chei: new Set(p.suprimate.chei), emailuri: new Set(p.suprimate.emailuri), linkedin: new Set(p.suprimate.linkedin) },
      limite: { apeluriRamase: p.rezerva },
      fetchFn: fetch,
    }),
  salveaza: async (ctx, p, r): Promise<RezultatActiune> => {
    // Apelurile reale înlocuiesc rezervarea (care se șterge), chiar dacă nu s-a găsit nimeni: creditele s-au consumat oricum.
    await ctx.db.delete(prospectareJurnal).where(and(eq(prospectareJurnal.id, p.rezervareId), eq(prospectareJurnal.orgId, ctx.orgId)));
    if (r.apeluri.length > 0) {
      await ctx.db.insert(prospectareJurnal).values(r.apeluri.map((a) => ({ orgId: ctx.orgId, provider: a.furnizor, operatie: a.operatie, ok: a.ok, unitati: a.unitati, companyId: p.companyId, userId: ctx.userId })));
    }
    let noi = 0;
    if (r.candidati.length > 0) {
      const inserati = await ctx.db
        .insert(prospectareCandidati)
        .values(
          r.candidati.map((c) => ({
            orgId: ctx.orgId,
            companyId: p.companyId,
            nume: c.nume,
            numeNorm: cheieNume(c.nume),
            rol: c.rol || null,
            dept: c.dept || null,
            linkedin: c.linkedin || null,
            // un e-mail marcat „invalid” nu se păstrează: nu ajunge la nimeni
            email: c.email && c.emailStatus !== "invalid" ? c.email : null,
            emailStatus: c.email && c.emailStatus !== "invalid" ? c.emailStatus : null,
            sursa: c.sursa,
            scor: c.scor,
            prioritate: c.prioritate,
            eticheta: c.eticheta || null,
            gasitDe: ctx.userId,
          })),
        )
        .onConflictDoNothing()
        .returning({ id: prospectareCandidati.id });
      noi = inserati.length;
    }
    revalidatePath(`/${ctx.orgSlug}/crm/companii`);
    return { ok: true, gasiti: r.candidati.length, noi, avertismente: r.erori };
  },
});

// Verifică dacă o persoană a cerut să nu mai fie propusă (după nume, e-mail sau LinkedIn).
async function esteSuprimata(
  db: Parameters<Parameters<typeof withOrgSession>[0]>[0]["db"],
  orgId: string,
  c: { numeNorm: string; email: string | null; linkedin: string | null },
): Promise<boolean> {
  const randuri = await db.select({ tip: prospectareSuprimati.tip, valoare: prospectareSuprimati.valoare }).from(prospectareSuprimati).where(eq(prospectareSuprimati.orgId, orgId));
  const email = (c.email || "").toLowerCase();
  const linkedin = linkedinNormalizat(c.linkedin);
  return randuri.some((r) => (r.tip === "nume" && r.valoare === c.numeNorm) || (r.tip === "email" && email !== "" && r.valoare === email) || (r.tip === "linkedin" && linkedin !== "" && r.valoare === linkedin));
}

// Aprobarea: persoana devine contact al firmei, cu un responsabil (cine aprobă) și un prim pas cu termen în 2 zile lucrătoare (coada „De contactat azi”).
// Când persoana e adăugată din date de la un terț, organizația trebuie s-o informeze (art. 14 GDPR).
// Opțional, persoana (dacă are profil LinkedIn) e trimisă și în lista Waalaxy aleasă de organizație (abordare pe LinkedIn); campania se alege după rolul ei,
// dacă organizația a stabilit una pentru acel rol. Apelul Waalaxy se face în afara tranzacției. Poarta de aprobare e atomică: un singur apel reușește.
type PregatitAprobare = { candidatId: string; waalaxy: { cheie: string; listaId: string; campanieId: string; prospect: ProspectWaalaxy } | null };
type ExternAprobare = { trimis: boolean; eroare?: string };
export type RezultatAprobare = { error: string | null; avertisment?: string };

export const aprobaCandidat = withOrgFaze<[string, boolean], PregatitAprobare, ExternAprobare, RezultatAprobare>({
  opts: OPTIUNI,
  pregateste: async (ctx, candidatId, trimiteWaalaxy) => {
    const m = await mesaje();
    if (!UUID.test(candidatId)) throw new EroareUtilizator(m.candidatNegasit);
    const [c] = await ctx.db
      .select({
        stare: prospectareCandidati.stare,
        nume: prospectareCandidati.nume,
        numeNorm: prospectareCandidati.numeNorm,
        rol: prospectareCandidati.rol,
        email: prospectareCandidati.email,
        linkedin: prospectareCandidati.linkedin,
        prioritate: prospectareCandidati.prioritate,
        firma: companies.nume,
      })
      .from(prospectareCandidati)
      .innerJoin(companies, eq(companies.id, prospectareCandidati.companyId))
      .where(and(eq(prospectareCandidati.id, candidatId), eq(prospectareCandidati.orgId, ctx.orgId)))
      .limit(1);
    if (!c || c.stare !== "nou") throw new EroareUtilizator(m.candidatNuMaiEInLista);
    // Cine a cerut să nu mai fie propusă nu se aprobă (nici dacă era deja în listă de la altă căutare); rândul se marchează respins.
    if (await esteSuprimata(ctx.db, ctx.orgId, c)) {
      await ctx.db.update(prospectareCandidati).set({ stare: "respins", hotaratDe: ctx.userId, hotaratLa: new Date() }).where(and(eq(prospectareCandidati.id, candidatId), eq(prospectareCandidati.stare, "nou")));
      return { gata: { error: m.persoanaCeruta } };
    }
    if (trimiteWaalaxy !== true) return { pregatit: { candidatId, waalaxy: null } };
    const linkedin = linkedinSigur(c.linkedin);
    if (!linkedin) throw new EroareUtilizator(m.faraLinkedinValid);
    const [w] = await ctx.db.select({ enc: prospectareChei.cheieEnc, setari: prospectareChei.setari }).from(prospectareChei).where(and(eq(prospectareChei.orgId, ctx.orgId), eq(prospectareChei.provider, "waalaxy"))).limit(1);
    if (!w?.setari?.listaId) throw new EroareUtilizator(m.conecteazaWaalaxy);
    let cheie: string;
    try {
      cheie = decripteaza(w.enc);
    } catch {
      throw new EroareUtilizator(m.waalaxyIlizibila);
    }
    const grup = grupRol(c.prioritate);
    const campanieId = (grup !== "altul" && w.setari[`campanie_${grup}`]) || w.setari.campanieId || "";
    const { prenume, nume } = prenumeSiNume(c.nume);
    return { pregatit: { candidatId, waalaxy: { cheie, listaId: w.setari.listaId, campanieId, prospect: { linkedinUrl: linkedin, prenume, nume, firma: c.firma, rol: c.rol ?? undefined } } } };
  },
  extern: async (p): Promise<ExternAprobare> => {
    if (!p.waalaxy) return { trimis: false };
    const r = await waalaxyTrimite(p.waalaxy.cheie, { listaId: p.waalaxy.listaId, campanieId: p.waalaxy.campanieId || undefined, prospecti: [p.waalaxy.prospect] }, fetch);
    return r.ok ? { trimis: true } : { trimis: false, eroare: r.eroare };
  },
  salveaza: async (ctx, p, extern): Promise<RezultatAprobare> => {
    const m = await mesaje();
    // Poarta atomică: doar cine trece rândul din „nou” în „aprobat” continuă; un al doilea apel simultan nu găsește nimic și se oprește.
    const [c] = await ctx.db
      .update(prospectareCandidati)
      .set({ stare: "aprobat", hotaratDe: ctx.userId, hotaratLa: new Date(), responsabilId: ctx.userId, stadiu: "de_contactat", urmatorPasLa: adaugaZileLucratoare(aziBucuresti(), 2) })
      .where(and(eq(prospectareCandidati.id, p.candidatId), eq(prospectareCandidati.orgId, ctx.orgId), eq(prospectareCandidati.stare, "nou")))
      .returning();
    if (!c) throw new EroareUtilizator(m.candidatNuMaiEInLista);
    if (await esteSuprimata(ctx.db, ctx.orgId, c)) throw new EroareUtilizator(m.persoanaCeruta);
    const prioritar = c.prioritate !== null && c.prioritate <= 2;
    const azi = new Date().toLocaleDateString("ro-RO", { day: "2-digit", month: "2-digit", year: "numeric" });
    const [contact] = await ctx.db
      .insert(contacts)
      .values({
        orgId: ctx.orgId,
        companyId: c.companyId,
        nume: c.nume,
        rol: c.rol,
        dept: c.dept,
        email: c.email,
        linkedin: linkedinSigur(c.linkedin) || null,
        cheie: prioritar, // decidentul și omul de la finanțe sunt persoanele-cheie ale firmei
        consentSource: `prospectare:${c.sursa}`,
        detalii: `Găsit prin prospectare (${NUME_FURNIZOR[c.sursa as Furnizor] ?? c.sursa}) la ${azi}${c.eticheta ? `; rol: ${c.eticheta}` : ""}. De informat despre prelucrarea datelor (art. 14 GDPR).`,
        createdBy: ctx.userId,
      })
      .returning({ id: contacts.id });
    await ctx.db.update(prospectareCandidati).set({ contactId: contact.id }).where(eq(prospectareCandidati.id, c.id));
    // Ajunsă în Waalaxy, persoana e „invitat” (pâlnia și listele de urmărit pornesc de aici); răspunsurile vin apoi prin webhook.
    if (p.waalaxy && extern.trimis) await noteazaInvitatie(ctx.db, ctx.orgId, { contactId: contact.id, companyId: c.companyId, campanie: p.waalaxy.campanieId || null });
    // Notă pe firmă, ca echipa să vadă de unde vine contactul și care e următorul pas.
    await ctx.db.insert(companyNotite).values({
      orgId: ctx.orgId,
      companyId: c.companyId,
      text: `Prospectare: ${c.nume}${c.rol ? ` (${c.rol})` : ""} adăugat(ă) ca persoană de contact. Sursă: ${NUME_FURNIZOR[c.sursa as Furnizor] ?? c.sursa}. Primul contact până la ${c.urmatorPasLa ?? "—"}.`,
      createdBy: ctx.userId,
    });
    // Firma fără responsabil primește, pe cel care aprobă.
    await ctx.db.update(companies).set({ ownerId: ctx.userId }).where(and(eq(companies.id, c.companyId), eq(companies.orgId, ctx.orgId), sql`${companies.ownerId} is null`));
    await inregistreazaAudit(ctx.db, { orgId: ctx.orgId, actorAppUserId: ctx.userId, actiune: "prospectare_candidat_aprobat", entitate: "contact", entitateId: contact.id, detalii: { sursa: c.sursa, waalaxy: p.waalaxy ? (extern.trimis ? "trimis" : "esuat") : "nu" } });
    revalidatePath(`/${ctx.orgSlug}/crm/companii`);
    revalidatePath(`/${ctx.orgSlug}/crm/prospectare`);
    return { error: null, avertisment: p.waalaxy && !extern.trimis ? m.waalaxyNeajuns(extern.eroare ?? m.eroareNecunoscuta) : undefined };
  },
});

// Respingerea: persoana nu se mai propune pentru această firmă. „Ea a cerut să nu fie contactată” (nuMaiPropune) o exclude pentru toată organizația și
// scoate din „De aprobat” și celelalte rânduri ale ei (de la alte firme), ca să nu fie aprobată din greșeală.
export const respingeCandidat = withOrgSession(
  async (ctx, candidatId: string, nuMaiPropune: boolean): Promise<void> => {
    const m = await mesaje();
    if (!UUID.test(candidatId)) throw new EroareUtilizator(m.candidatNegasit);
    const [c] = await ctx.db.select().from(prospectareCandidati).where(and(eq(prospectareCandidati.id, candidatId), eq(prospectareCandidati.orgId, ctx.orgId))).limit(1);
    if (!c || c.stare !== "nou") throw new EroareUtilizator(m.candidatNuMaiEInLista);
    await ctx.db.update(prospectareCandidati).set({ stare: "respins", hotaratDe: ctx.userId, hotaratLa: new Date() }).where(and(eq(prospectareCandidati.id, c.id), eq(prospectareCandidati.stare, "nou")));
    if (nuMaiPropune === true) {
      const l = linkedinNormalizat(c.linkedin);
      const email = c.email ? c.email.toLowerCase() : "";
      const suprimari: { orgId: string; tip: string; valoare: string; motiv: string }[] = [{ orgId: ctx.orgId, tip: "nume", valoare: c.numeNorm, motiv: "a cerut să nu fie contactată" }];
      if (email) suprimari.push({ orgId: ctx.orgId, tip: "email", valoare: email, motiv: "a cerut să nu fie contactată" });
      if (l) suprimari.push({ orgId: ctx.orgId, tip: "linkedin", valoare: l, motiv: "a cerut să nu fie contactată" });
      await ctx.db.insert(prospectareSuprimati).values(suprimari).onConflictDoNothing();
      // Aceeași persoană, de la alte firme, încă în „De aprobat”.
      const deAprobat = await ctx.db
        .select({ id: prospectareCandidati.id, numeNorm: prospectareCandidati.numeNorm, email: prospectareCandidati.email, linkedin: prospectareCandidati.linkedin })
        .from(prospectareCandidati)
        .where(and(eq(prospectareCandidati.orgId, ctx.orgId), eq(prospectareCandidati.stare, "nou")));
      const ids = deAprobat
        .filter((x) => x.numeNorm === c.numeNorm || (email !== "" && (x.email || "").toLowerCase() === email) || (l !== "" && linkedinNormalizat(x.linkedin) === l))
        .map((x) => x.id);
      if (ids.length > 0) await ctx.db.update(prospectareCandidati).set({ stare: "respins", hotaratDe: ctx.userId, hotaratLa: new Date() }).where(and(inArray(prospectareCandidati.id, ids), eq(prospectareCandidati.stare, "nou")));
      await inregistreazaAudit(ctx.db, { orgId: ctx.orgId, actorAppUserId: ctx.userId, actiune: "prospectare_persoana_exclusa", entitate: "organizatie", entitateId: ctx.orgId, detalii: { sursa: c.sursa } });
    }
    revalidatePath(`/${ctx.orgSlug}/crm/companii`);
    revalidatePath(`/${ctx.orgSlug}/crm/prospectare`);
  },
  OPTIUNI,
);

export async function aprobaCandidatAction(orgSlug: string, candidatId: string, trimiteWaalaxy = false): Promise<RezultatAprobare> {
  const m = await mesaje();
  try {
    return await aprobaCandidat(orgSlug, candidatId, trimiteWaalaxy === true);
  } catch (e) {
    return { error: mesajSigur(e, m.nuAmPututAdauga, "prospectare-aprobare") };
  }
}

export async function respingeCandidatAction(orgSlug: string, candidatId: string, nuMaiPropune = false): Promise<{ error: string | null }> {
  const m = await mesaje();
  try {
    await respingeCandidat(orgSlug, candidatId, nuMaiPropune === true);
    return { error: null };
  } catch (e) {
    return { error: mesajSigur(e, m.nuAmPututRespinge, "prospectare-respingere") };
  }
}

export async function creditePrelucrare(orgSlug: string): Promise<CreditFurnizor[]> {
  try {
    return await getCredite(orgSlug);
  } catch {
    return [];
  }
}

export async function cautaDecidentiPentruFirma(orgSlug: string, companyId: string, forteaza = false): Promise<RezultatActiune> {
  const m = await mesaje();
  try {
    return await cautaDecidentiAction(orgSlug, companyId, forteaza === true);
  } catch (e) {
    return { ok: false, eroare: mesajSigur(e, m.cautareEsuata, "prospectare-cautare") };
  }
}

export type RezultatImbogatire = { ok: boolean; eroare?: string; completat?: string[]; mesaj?: string };

// Îmbogățirea firmei la Apollo (cu cheia ORGANIZAȚIEI): completează industria și numărul de angajați DOAR unde lipsesc, fără să atingă datele introduse de mână sau cele din ANAF.
// Se notează când s-a făcut (extra.imbogatitLa), ca firma să apară în lista „îmbogățite recent, de abordat”. Fără cheie Apollo, nu se întâmplă nimic.
export const imbogatesteFirmaAction = withOrgFaze<[string], { companyId: string; firma: { nume: string; site: string | null; industrie: string | null; nrAngajati: number | null; domeniuEmail: string | null }; cheie: string }, Rezultat<DateFirmaApollo | null>, RezultatImbogatire>({
  opts: OPTIUNI,
  pregateste: async (ctx, companyId) => {
    const m = await mesaje();
    if (!UUID.test(companyId)) throw new EroareUtilizator(m.firmaNegasita);
    const [firma] = await ctx.db
      .select({ nume: companies.nume, site: companies.site, industrie: companies.industrie, nrAngajati: companies.nrAngajati })
      .from(companies)
      .where(and(eq(companies.id, companyId), eq(companies.orgId, ctx.orgId), sql`${companies.deletedAt} is null`))
      .limit(1);
    if (!firma) throw new EroareUtilizator(m.firmaNegasita);
    if ((firma.industrie ?? "").trim() && firma.nrAngajati != null) return { gata: { ok: true, completat: [], mesaj: m.firmaAreDeja } };
    const [rand] = await ctx.db.select({ enc: prospectareChei.cheieEnc }).from(prospectareChei).where(and(eq(prospectareChei.orgId, ctx.orgId), eq(prospectareChei.provider, "apollo"))).limit(1);
    if (!rand) return { gata: { ok: false, eroare: m.conecteazaApollo } };
    let cheie: string;
    try {
      cheie = decripteaza(rand.enc);
    } catch {
      return { gata: { ok: false, eroare: m.apolloIlizibila } };
    }
    const [contactEmail] = await ctx.db.select({ email: contacts.email }).from(contacts).where(and(eq(contacts.companyId, companyId), eq(contacts.orgId, ctx.orgId), sql`coalesce(${contacts.email}, '') <> ''`)).limit(1);
    return { pregatit: { companyId, firma: { ...firma, domeniuEmail: domeniuDinEmail(contactEmail?.email) }, cheie } };
  },
  extern: async ({ firma, cheie }) => apolloImbogatesteFirma(cheie, { nume: firma.nume, domeniu: domeniuDinSite(firma.site) ?? firma.domeniuEmail }, fetch),
  salveaza: async (ctx, { companyId, firma }, rezultat): Promise<RezultatImbogatire> => {
    const m = await mesaje();
    if (!rezultat.ok) return { ok: false, eroare: rezultat.eroare };
    await ctx.db.insert(prospectareJurnal).values({ orgId: ctx.orgId, provider: "apollo", operatie: "imbogatire_firma", ok: true, unitati: 1, companyId, userId: ctx.userId });
    if (!rezultat.date) return { ok: true, completat: [], mesaj: m.apolloNegasit };
    const completat: string[] = [];
    const seteaza: { industrie?: string; nrAngajati?: number } = {};
    if (!(firma.industrie ?? "").trim() && rezultat.date.industrie) {
      seteaza.industrie = rezultat.date.industrie;
      completat.push(m.industrie);
    }
    if (firma.nrAngajati == null && rezultat.date.nrAngajati != null) {
      seteaza.nrAngajati = rezultat.date.nrAngajati;
      completat.push(m.nrAngajatiCompletat);
    }
    if (completat.length === 0) return { ok: true, completat, mesaj: m.avea };
    // Doar ce lipsea (condițiile din WHERE repetă verificarea, ca o modificare făcută între timp să nu fie suprascrisă) + data îmbogățirii.
    await ctx.db.execute(sql`
      update companies set
        industrie = case when coalesce(btrim(industrie), '') = '' then coalesce(${seteaza.industrie ?? null}, industrie) else industrie end,
        nr_angajati = coalesce(nr_angajati, ${seteaza.nrAngajati ?? null}),
        extra = coalesce(extra, '{}'::jsonb) || jsonb_build_object('imbogatitLa', ${new Date().toISOString()}::text)
      where id = ${companyId} and org_id = ${ctx.orgId}`);
    return { ok: true, completat, mesaj: m.amCompletat(completat.join(m.si)) };
  },
});

export async function imbogatesteFirma(orgSlug: string, companyId: string): Promise<RezultatImbogatire> {
  const m = await mesaje();
  try {
    return await imbogatesteFirmaAction(orgSlug, companyId);
  } catch (e) {
    return { ok: false, eroare: mesajSigur(e, m.nuAmPututImbogati, "prospectare-imbogatire-firma") };
  }
}
