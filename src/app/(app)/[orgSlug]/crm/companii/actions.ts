"use server";

import { randomUUID } from "node:crypto";

import { and, asc, eq, isNotNull, isNull, sql } from "drizzle-orm";

import { parseazaNumarRo } from "@/lib/numere-ro";
import { type OrgContext, withOrgSession } from "@/lib/auth/guard";
import { celMaiRecentBilant, curataCui, verificaStareFiscala } from "@/lib/anaf";
import { gasesteJudet } from "@/lib/judete";
import { getLimiteleEfective, subCota } from "@/lib/billing/quota";
import { ETAPE_PATH_KEYS, bifeDinEtapa, etapaCurenta } from "@/lib/etape-companie";
import { valideazaAlocari } from "@/lib/alocari-sponsorizare";
import { amprentePersoana } from "@/lib/gdpr-persoane";
import { valideazaFacebook, valideazaLinkedin } from "@/lib/pagini-sociale";
import { normalizeazaTelefonE164 } from "@/lib/telefon";
import { urlWebSigur } from "@/lib/validation";
import { apeluri, companies, companyNotite, companySponsorizari, companyStageLog, contacts } from "@/lib/db/schema";

export type ActionState = { error: string | null };

// „Lucrat de utilizatorul curent” — alimentează butonul „Lucrate recent” din listă (companies.updated_by +
// updated_at, care se actualizează singur la orice UPDATE).
async function marcheazaLucrat(ctx: OrgContext, companyId: string) {
  await ctx.db.update(companies).set({ updatedBy: ctx.userId }).where(and(eq(companies.id, companyId), eq(companies.orgId, ctx.orgId)));
}

// Recalculează cache-ul companies.suma_sponsorizata din SUM-ul real al
// company_sponsorizari — apelat după orice adăugare/ștergere de sponsorizare,
// ca lista de companii (care afișează cache-ul, nu recalculează live) să nu
// rămână desincronizată.
async function recalculeazaSumaSponsorizata(db: OrgContext["db"], companyId: string) {
  const [{ suma }] = await db
    .select({ suma: sql<number>`coalesce(sum(${companySponsorizari.suma}), 0)::int` })
    .from(companySponsorizari)
    .where(eq(companySponsorizari.companyId, companyId));
  await db.update(companies).set({ sumaSponsorizata: suma }).where(eq(companies.id, companyId));
}

// Marcaje "Cum sponsorizează" — autosave, un singur câmp per apel. Cald/Rece
// se exclud reciproc prin design (o singură coloană enum `temperatura`),
// Recurent/D177/mec20(20%)/Decembrie sunt independente.
export const comutaMarcaj = withOrgSession(
  async (
    ctx,
    companyId: string,
    marcaj: "cald" | "rece" | "recurent" | "d177" | "d177Incasat" | "mec20" | "decembrie",
    activ: boolean,
  ): Promise<ActionState> => {
    const set: Partial<typeof companies.$inferInsert> = { updatedBy: ctx.userId };
    if (marcaj === "cald") set.temperatura = activ ? "cald" : null;
    else if (marcaj === "rece") set.temperatura = activ ? "rece" : null;
    else if (marcaj === "recurent") set.recurent = activ;
    else if (marcaj === "d177") set.d177 = activ;
    else if (marcaj === "d177Incasat") set.d177Incasat = activ;
    else if (marcaj === "mec20") set.mec20 = activ;
    else if (marcaj === "decembrie") set.decembrie = activ;

    const r = await ctx.db
      .update(companies)
      .set(set)
      .where(and(eq(companies.id, companyId), eq(companies.orgId, ctx.orgId)))
      .returning({ id: companies.id });
    if (!r[0]) return { error: "Firma nu a fost găsită." };
    return { error: null };
  },
);

export const seteazaResponsabil = withOrgSession(async (ctx, companyId: string, ownerId: string | null): Promise<ActionState> => {
  const r = await ctx.db
    .update(companies)
    .set({ ownerId })
    .where(and(eq(companies.id, companyId), eq(companies.orgId, ctx.orgId)))
    .returning({ id: companies.id });
  if (!r[0]) return { error: "Firma nu a fost găsită." };
  return { error: null };
});

export const actualizeazaContract = withOrgSession(
  async (
    ctx,
    companyId: string,
    date: { numarContract: string | null; dataSemnare: string | null; contractStatus: "trimis" | "asteptare" | "semnat" | "anulat" | null },
  ): Promise<ActionState> => {
    const r = await ctx.db
      .update(companies)
      .set({ numarContract: date.numarContract, dataSemnare: date.dataSemnare, contractStatus: date.contractStatus, updatedBy: ctx.userId })
      .where(and(eq(companies.id, companyId), eq(companies.orgId, ctx.orgId)))
      .returning({ id: companies.id });
    if (!r[0]) return { error: "Firma nu a fost găsită." };
    return { error: null };
  },
);

export type AdaugaSponsorizareState = ActionState;
export const adaugaSponsorizare = withOrgSession(
  async (ctx, _prev: AdaugaSponsorizareState, formData: FormData): Promise<AdaugaSponsorizareState> => {
    const companyId = String(formData.get("companyId") ?? "").trim();
    const suma = Math.round(Number(formData.get("suma")));
    const data = String(formData.get("data") ?? "").trim();
    const proiect = String(formData.get("proiect") ?? "").trim();
    const nota = String(formData.get("nota") ?? "").trim();

    if (!companyId || !Number.isFinite(suma) || suma <= 0) return { error: "Suma trebuie să fie un număr pozitiv." };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return { error: "Data e obligatorie." };
    let alocariBrut: unknown = [];
    try {
      alocariBrut = JSON.parse(String(formData.get("alocari") ?? "[]"));
    } catch {
      return { error: "Defalcarea sumei nu a putut fi citită." };
    }
    const al = valideazaAlocari(suma, alocariBrut);
    if (!al.ok) return { error: al.eroare };

    const firma = await ctx.db.select({ id: companies.id }).from(companies).where(and(eq(companies.id, companyId), eq(companies.orgId, ctx.orgId))).limit(1);
    if (!firma[0]) return { error: "Firma nu a fost găsită." };

    await ctx.db.insert(companySponsorizari).values({
      id: randomUUID(),
      orgId: ctx.orgId,
      companyId,
      suma,
      data,
      proiect: proiect || null,
      nota: nota || null,
      alocari: al.alocari.length ? al.alocari : null,
      createdBy: ctx.userId,
    });
    await recalculeazaSumaSponsorizata(ctx.db, companyId);
    await marcheazaLucrat(ctx, companyId);
    return { error: null };
  },
);

// Defalcarea ulterioară (sau corectarea ei) pe o sponsorizare deja înregistrată.
export const seteazaAlocariSponsorizare = withOrgSession(async (ctx, id: string, alocari: unknown): Promise<ActionState> => {
  const [s] = await ctx.db
    .select({ suma: companySponsorizari.suma, companyId: companySponsorizari.companyId })
    .from(companySponsorizari)
    .where(and(eq(companySponsorizari.id, id), eq(companySponsorizari.orgId, ctx.orgId)))
    .limit(1);
  if (!s) return { error: "Sponsorizarea nu a fost găsită." };
  const al = valideazaAlocari(s.suma, alocari);
  if (!al.ok) return { error: al.eroare };
  await ctx.db
    .update(companySponsorizari)
    .set({ alocari: al.alocari.length ? al.alocari : null })
    .where(and(eq(companySponsorizari.id, id), eq(companySponsorizari.orgId, ctx.orgId)));
  await marcheazaLucrat(ctx, s.companyId);
  return { error: null };
});

export const stergeSponsorizare = withOrgSession(async (ctx, id: string, companyId: string): Promise<ActionState> => {
  const r = await ctx.db
    .delete(companySponsorizari)
    .where(and(eq(companySponsorizari.id, id), eq(companySponsorizari.orgId, ctx.orgId)))
    .returning({ id: companySponsorizari.id });
  if (!r[0]) return { error: "Sponsorizarea nu a fost găsită." };
  await recalculeazaSumaSponsorizata(ctx.db, companyId);
  return { error: null };
});

export const adaugaNotita = withOrgSession(async (ctx, companyId: string, text: string): Promise<ActionState> => {
  const trimmed = text.trim();
  if (!trimmed) return { error: "Notița e goală." };
  const firma = await ctx.db.select({ id: companies.id }).from(companies).where(and(eq(companies.id, companyId), eq(companies.orgId, ctx.orgId))).limit(1);
  if (!firma[0]) return { error: "Firma nu a fost găsită." };
  await ctx.db.insert(companyNotite).values({ id: randomUUID(), orgId: ctx.orgId, companyId, text: trimmed, createdBy: ctx.userId });
  await marcheazaLucrat(ctx, companyId);
  return { error: null };
});

export const editeazaNotita = withOrgSession(async (ctx, id: string, text: string): Promise<ActionState> => {
  const trimmed = text.trim();
  if (!trimmed) return { error: "Notița e goală." };
  const r = await ctx.db
    .update(companyNotite)
    .set({ text: trimmed, editatLa: new Date() })
    .where(and(eq(companyNotite.id, id), eq(companyNotite.orgId, ctx.orgId)))
    .returning({ id: companyNotite.id });
  if (!r[0]) return { error: "Notița nu a fost găsită." };
  return { error: null };
});

export const stergeNotita = withOrgSession(async (ctx, id: string): Promise<ActionState> => {
  await ctx.db.delete(companyNotite).where(and(eq(companyNotite.id, id), eq(companyNotite.orgId, ctx.orgId)));
  return { error: null };
});

export type AdaugaContactState = ActionState;
export const adaugaContact = withOrgSession(async (ctx, _prev: AdaugaContactState, formData: FormData): Promise<AdaugaContactState> => {
  const companyId = String(formData.get("companyId") ?? "").trim();
  const nume = String(formData.get("nume") ?? "").trim();
  const rol = String(formData.get("rol") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const telefon = String(formData.get("telefon") ?? "").trim();
  const linkedin = String(formData.get("linkedin") ?? "").trim();
  const dept = String(formData.get("dept") ?? "").trim();

  if (!companyId || !nume) return { error: "Numele contactului e obligatoriu." };
  if (linkedin && !urlWebSigur(linkedin)) return { error: "Linkul LinkedIn nu e o adresă web validă (http/https)." };
  const firma = await ctx.db.select({ id: companies.id }).from(companies).where(and(eq(companies.id, companyId), eq(companies.orgId, ctx.orgId))).limit(1);
  if (!firma[0]) return { error: "Firma nu a fost găsită." };

  await ctx.db.insert(contacts).values({
    id: randomUUID(),
    orgId: ctx.orgId,
    companyId,
    nume,
    rol: rol || null,
    dept: dept || null,
    email: email || null,
    telefon: telefon || null,
    linkedin: urlWebSigur(linkedin),
    createdBy: ctx.userId,
  });
  await marcheazaLucrat(ctx, companyId);
  return { error: null };
});

// Contact „direct” / prioritar (inimioara din lista de contacte).
export const comutaContactCheie = withOrgSession(async (ctx, id: string, cheie: boolean): Promise<ActionState> => {
  await ctx.db.update(contacts).set({ cheie }).where(and(eq(contacts.id, id), eq(contacts.orgId, ctx.orgId)));
  return { error: null };
});

// Câmpuri de lucru ne-mapate în coloane (companies.extra, jsonb) — îmbinare superficială, fără migrare.
type ExtraFirma = {
  etapeBifate?: string[];
  negasit?: { la: string; de: string; deNume: string | null };
  linkedinAdaugat?: { la: string; de: string };
  facebookAdaugat?: { la: string; de: string };
  nuMaiCauta?: string[];
  deAprobat?: PersoanaDeAprobat[];
};
export type PersoanaDeAprobat = {
  id: string;
  nume: string;
  functie: string | null;
  departament: string | null;
  sursa: string | null;
  email: string | null;
  emailStare: "verificat" | "neverificat" | "invalid" | "nesigur" | null;
  telefon: string | null;
  linkedin: string | null;
  adaugatLa?: string; // ISO — după 60 de zile fără aprobare, persoana se șterge (cron gdpr-persoane)
};

async function citesteExtra(ctx: OrgContext, companyId: string) {
  const [r] = await ctx.db
    .select({ extra: companies.extra, stage: companies.stage, status: companies.status })
    .from(companies)
    .where(and(eq(companies.id, companyId), eq(companies.orgId, ctx.orgId)))
    .limit(1);
  return r ? { extra: (r.extra ?? {}) as ExtraFirma, stage: r.stage, status: r.status } : null;
}

async function scrieExtra(ctx: OrgContext, companyId: string, patch: Partial<ExtraFirma>, scoate: (keyof ExtraFirma)[] = [], campuri: Partial<typeof companies.$inferInsert> = {}) {
  let expr = sql`coalesce(${companies.extra}, '{}'::jsonb)`;
  for (const k of scoate) expr = sql`(${expr}) - ${k}::text`;
  if (Object.keys(patch).length) expr = sql`(${expr}) || ${JSON.stringify(patch)}::text::jsonb`;
  await ctx.db
    .update(companies)
    .set({ extra: expr, updatedBy: ctx.userId, ...campuri })
    .where(and(eq(companies.id, companyId), eq(companies.orgId, ctx.orgId)));
}

type StageEnum = NonNullable<(typeof companies.$inferInsert)["stage"]>;

async function jurnalEtapa(ctx: OrgContext, companyId: string, de: { stage: string; status: string }, spre: { stage: string; status: string }) {
  if (de.stage === spre.stage && de.status === spre.status) return;
  await ctx.db.insert(companyStageLog).values({
    orgId: ctx.orgId,
    companyId,
    fromStage: de.stage as StageEnum,
    toStage: spre.stage as StageEnum,
    fromStatus: de.status as "open" | "won" | "lost" | "parked",
    toStatus: spre.status as "open" | "won" | "lost" | "parked",
    byUserId: ctx.userId,
  });
}

// Path-ul din fișa firmei: clic pe o etapă o bifează / debifează (salvare imediată). Etapa curentă
// (companies.stage) = cea mai avansată bifată, după ordinea din lib/etape-companie.ts — aceeași listă ca în interfață.
// Clic pe „Nou” șterge toate bifele. O firmă respinsă se redeschide la orice bifare.
export const comutaEtapaBifata = withOrgSession(async (ctx, companyId: string, etapa: string): Promise<ActionState> => {
  if (!ETAPE_PATH_KEYS.includes(etapa)) return { error: "Etapă necunoscută." };
  const firma = await citesteExtra(ctx, companyId);
  if (!firma) return { error: "Firma nu a fost găsită." };

  const bifateAcum = new Set(firma.extra.etapeBifate ?? bifeDinEtapa(firma.stage));
  if (etapa === "nou") bifateAcum.clear();
  else if (bifateAcum.has(etapa)) bifateAcum.delete(etapa);
  else bifateAcum.add(etapa);

  const bifate = ETAPE_PATH_KEYS.filter((k) => bifateAcum.has(k));
  const statusNou = firma.status === "lost" ? "open" : firma.status;
  // O firmă câștigată rămâne la „sponsorizat”; bifele se păstrează pentru cazul în care rezultatul se retrage.
  const stageNou = statusNou === "won" ? "sponsorizat" : etapaCurenta(bifate);

  await scrieExtra(ctx, companyId, { etapeBifate: bifate }, [], { stage: stageNou as StageEnum, status: statusNou });
  await jurnalEtapa(ctx, companyId, { stage: firma.stage, status: firma.status }, { stage: stageNou, status: statusNou });
  return { error: null };
});

// „Sponsorizat” (câștigată) și „Respins” (pierdută) sunt rezultate separate de path; al doilea clic le retrage.
export const seteazaRezultat = withOrgSession(async (ctx, companyId: string, rezultat: "sponsorizat" | "respins", activ: boolean): Promise<ActionState> => {
  if (rezultat !== "sponsorizat" && rezultat !== "respins") return { error: "Rezultat necunoscut." };
  const firma = await citesteExtra(ctx, companyId);
  if (!firma) return { error: "Firma nu a fost găsită." };

  const bifate = firma.extra.etapeBifate ?? bifeDinEtapa(firma.stage === "sponsorizat" ? "contract_semnat" : firma.stage);
  const statusNou = !activ ? "open" : rezultat === "sponsorizat" ? "won" : "lost";
  const stageNou = statusNou === "won" ? "sponsorizat" : etapaCurenta(bifate);

  await scrieExtra(ctx, companyId, { etapeBifate: [...bifate] }, [], { stage: stageNou as StageEnum, status: statusNou });
  await jurnalEtapa(ctx, companyId, { stage: firma.stage, status: firma.status }, { stage: stageNou, status: statusNou });
  return { error: null };
});
export const stergeContact = withOrgSession(async (ctx, id: string): Promise<ActionState> => {
  const [contact] = await ctx.db
    .select({ companyId: contacts.companyId, nume: contacts.nume, linkedin: contacts.linkedin, telefon: contacts.telefon })
    .from(contacts)
    .where(and(eq(contacts.id, id), eq(contacts.orgId, ctx.orgId)))
    .limit(1);
  if (!contact) return { error: null };
  await ctx.db.delete(contacts).where(and(eq(contacts.id, id), eq(contacts.orgId, ctx.orgId)));
  // GDPR: ștergerea înseamnă ștergere efectivă — și din jurnalul de apeluri, unde rămăsese numele / telefonul ca „snapshot”.
  // Apelurile rămân (pentru statistici / KPI), dar fără datele persoanei.
  if (contact.telefon) {
    await ctx.db
      .update(apeluri)
      .set({ catreNume: null, catreTelefon: "[șters]" })
      .where(and(eq(apeluri.orgId, ctx.orgId), eq(apeluri.companyId, contact.companyId), eq(apeluri.catreTelefon, normalizeazaTelefonE164(contact.telefon) ?? contact.telefon)));
  }  // GDPR: persoana ștearsă intră în lista „nu mai căuta” doar ca amprentă (hash), nu cu numele.
  const amprente = amprentePersoana(ctx.orgId, contact.companyId, contact.nume, contact.linkedin);
  await ctx.db
    .update(companies)
    .set({
      extra: sql`jsonb_set(coalesce(${companies.extra}, '{}'::jsonb), '{nuMaiCauta}', (
        select coalesce(jsonb_agg(distinct v), '[]'::jsonb) from jsonb_array_elements_text(
          coalesce(${companies.extra}->'nuMaiCauta', '[]'::jsonb) || ${JSON.stringify(amprente)}::text::jsonb
        ) as t(v)
      ))`,
    })
    .where(and(eq(companies.id, contact.companyId), eq(companies.orgId, ctx.orgId)));
  return { error: null };
});

export type AdaugaFirmaState = ActionState & { id?: string };
export const adaugaFirma = withOrgSession(async (ctx, _prev: AdaugaFirmaState, formData: FormData): Promise<AdaugaFirmaState> => {
  const txt = (k: string) => {
    const v = String(formData.get(k) ?? "").trim();
    return v || null;
  };
  const numar = (k: string): number | null | "invalid" => {
    const brut = String(formData.get(k) ?? "").trim();
    if (!brut) return null;
    const n = Math.round(Number(brut.replace(/\s/g, "")));
    return Number.isFinite(n) ? n : "invalid";
  };

  const nume = txt("nume");
  const site = txt("site");
  const sumaContract = numar("sumaContract");
  const ca = numar("ca");
  const profit = numar("profit");
  const nrAngajati = numar("nrAngajati");
  const anInfiintare = numar("anInfiintare");
  const anBilant = numar("anBilant");
  const dataSemnare = txt("dataSemnare");

  if (!nume) return { error: "Numele firmei e obligatoriu." };
  if (site && !urlWebSigur(site)) return { error: "Site-ul nu e o adresă web validă (http/https)." };
  if (sumaContract === "invalid" || (sumaContract !== null && sumaContract < 0)) return { error: "Suma contractului trebuie să fie un număr pozitiv." };
  for (const [n, v] of [["Cifra de afaceri", ca], ["Profitul", profit], ["Numărul de angajați", nrAngajati], ["Anul înființării", anInfiintare]] as const) {
    if (v === "invalid") return { error: `${n} trebuie să fie un număr.` };
  }
  if (dataSemnare && !/^\d{4}-\d{2}-\d{2}$/.test(dataSemnare)) return { error: "Data semnării nu e validă." };

  // Linkurile de pagină de firmă — aceeași validare ca în fișă (lib/pagini-sociale.ts).
  let linkedin: string | null = null;
  let facebook: string | null = null;
  const li = txt("linkedin");
  if (li) {
    const r = valideazaLinkedin(li);
    if (!r.ok) return { error: r.eroare };
    linkedin = r.url;
  }
  const fb = txt("facebook");
  if (fb) {
    const r = valideazaFacebook(fb);
    if (!r.ok) return { error: r.eroare };
    facebook = r.url;
  }

  const limite = getLimiteleEfective(ctx.orgPackage, ctx.orgCustomPlanConfig);
  if (limite.companiiPj !== null) {
    const [{ firmeCount }] = await ctx.db
      .select({ firmeCount: sql<number>`count(*)`.mapWith(Number) })
      .from(companies)
      .where(and(eq(companies.orgId, ctx.orgId), isNull(companies.deletedAt)));
    if (!subCota(firmeCount, limite.companiiPj)) {
      return {
        error: `Ai atins limita de ${limite.companiiPj} companii a pachetului tău — șterge o firmă existentă sau treci la un pachet mai mare.`,
      };
    }
  }

  const id = randomUUID();
  const acum = new Date();
  const azi = acum.toLocaleDateString("en-CA", { timeZone: "Europe/Bucharest" });
  const numarContract = txt("numarContract");
  await ctx.db.insert(companies).values({
    id,
    orgId: ctx.orgId,
    nume,
    cui: txt("cui"),
    nrRegCom: txt("nrRegCom"),
    judet: txt("judet"),
    localitate: txt("localitate"),
    adresa: txt("adresa"),
    caen: txt("caen"),
    industrie: txt("industrie"),
    anInfiintare: typeof anInfiintare === "number" ? anInfiintare : null,
    site: site ? urlWebSigur(site) : null,
    linkedin,
    facebook,
    administrator: txt("administrator"),
    ...(formData.get("anafActiv") != null
      ? {
          anafActiv: formData.get("anafActiv") === "1",
          anafVerificatLa: acum,
          anBilant: typeof anBilant === "number" ? anBilant : null,
          sursaFin: "ANAF",
        }
      : {}),
    ca: typeof ca === "number" ? ca : null,
    profit: typeof profit === "number" ? profit : null,
    nrAngajati: typeof nrAngajati === "number" ? nrAngajati : null,
    numarContract,
    dataSemnare,
    sumaPropusa: typeof sumaContract === "number" ? sumaContract : null,
    nota: txt("nota"),
    // Marcajele listei din care s-a adăugat firma (ex. D177).
    d177: formData.getAll("marcaj").includes("d177"),
    decembrie: formData.getAll("marcaj").includes("decembrie"),
    mec20: formData.getAll("marcaj").includes("caz"),
    updatedBy: ctx.userId,
    // Linkurile adăugate acum contează pentru indicatorul KPI „Firme cu LinkedIn / Facebook adăugat”.
    extra: {
      ...(linkedin ? { linkedinAdaugat: { la: acum.toISOString(), de: ctx.userId } } : {}),
      ...(facebook ? { facebookAdaugat: { la: acum.toISOString(), de: ctx.userId } } : {}),
    },
  });

  // Suma contractului se înregistrează și ca sponsorizare (tabul „Sponsorizări”, totaluri, statistici); poate fi
  // defalcată pe campanii / destinatari de acolo.
  if (sumaContract !== null && sumaContract > 0) {
    await ctx.db.insert(companySponsorizari).values({
      id: randomUUID(),
      orgId: ctx.orgId,
      companyId: id,
      suma: sumaContract,
      data: dataSemnare ?? azi,
      proiect: numarContract ? `Contract ${numarContract}` : null,
      createdBy: ctx.userId,
    });
    await recalculeazaSumaSponsorizata(ctx.db, id);
  }
  return { error: null, id };
});
// „Adu date din ANAF” din formularul de firmă nouă: pe baza CUI-ului întoarce datele de identificare și ultimul bilanț
// (nu scrie nimic în baza de date — formularul le preia și le salvează odată cu firma).
export type DateAnaf = {
  denumire: string | null;
  activ: boolean;
  caen: string | null;
  nrRegCom: string | null;
  adresa: string | null;
  judet: string | null;
  localitate: string | null;
  anInfiintare: number | null;
  ca: number | null;
  profit: number | null;
  nrAngajati: number | null;
  anBilant: number | null;
};
export const cautaDateAnaf = withOrgSession(async (_ctx, cui: string): Promise<ActionState & { date?: DateAnaf }> => {
  if (!curataCui(cui)) return { error: "Introdu un CUI valid." };
  let stare: Awaited<ReturnType<typeof verificaStareFiscala>>;
  try {
    stare = await verificaStareFiscala(cui);
  } catch {
    return { error: "ANAF nu a răspuns — încearcă din nou peste puțin timp." };
  }
  if (!stare) return { error: `Niciun rezultat ANAF pentru CUI ${curataCui(cui)} — verifică dacă e corect.` };
  const bilant = await celMaiRecentBilant(cui).catch(() => null);
  const anInreg = stare.dataInregistrare ? Number(stare.dataInregistrare.slice(0, 4)) : NaN;
  return {
    error: null,
    date: {
      denumire: stare.denumire,
      activ: stare.activ,
      caen: stare.codCaen,
      nrRegCom: stare.nrRegCom,
      adresa: stare.adresa,
      judet: gasesteJudet(stare.judet) ?? gasesteJudet(stare.adresa),
      localitate: stare.localitate,
      anInfiintare: Number.isFinite(anInreg) && anInreg > 1800 ? anInreg : null,
      ca: bilant?.cifraAfaceri ?? null,
      profit: bilant?.profitNet ?? null,
      nrAngajati: bilant?.numarSalariati ?? null,
      anBilant: bilant?.an ?? null,
    },
  };
});

// Scor de capacitate REAL: preia din ANAF (stare fiscală + ultimul bilanț
// depus) și scrie direct în ca/profit/nrAngajati/anBilant — aceleași coloane
// pe care lib/scor-companie.ts le folosește deja la „Mărime & profitabilitate",
// deci scorul de pe fișă se actualizează singur, fără nicio schimbare acolo.
// Nu suprascrie un CUI lipsă — echipa trebuie să-l completeze întâi (tab Editare).
export type VerificaAnafState = ActionState & {
  denumire?: string | null;
  activ?: boolean;
  anBilant?: number | null;
};
export const verificaAnaf = withOrgSession(async (ctx, companyId: string): Promise<VerificaAnafState> => {
  const [firma] = await ctx.db.select({ cui: companies.cui }).from(companies).where(and(eq(companies.id, companyId), eq(companies.orgId, ctx.orgId))).limit(1);
  if (!firma) return { error: "Firma nu a fost găsită." };
  if (!firma.cui || !firma.cui.trim()) return { error: "Completează întâi CUI-ul firmei (tab Editare) — ANAF caută firmele după CUI." };

  let stare: Awaited<ReturnType<typeof verificaStareFiscala>>;
  try {
    stare = await verificaStareFiscala(firma.cui);
  } catch {
    return { error: "ANAF nu a răspuns — încearcă din nou peste puțin timp." };
  }
  if (!stare) return { error: `Niciun rezultat ANAF pentru CUI ${firma.cui} — verifică dacă e corect.` };

  const bilant = await celMaiRecentBilant(firma.cui).catch(() => null);

  await ctx.db
    .update(companies)
    .set({
      anafActiv: stare.activ,
      anafVerificatLa: new Date(),
      ...(bilant
        ? {
            ca: bilant.cifraAfaceri ?? undefined,
            profit: bilant.profitNet ?? undefined,
            profitTip: bilant.profitNet != null ? (bilant.profitNet >= 0 ? "profit" : "pierdere") : undefined,
            nrAngajati: bilant.numarSalariati ?? undefined,
            anBilant: bilant.an,
            sursaFin: "ANAF",
          }
        : {}),
      updatedBy: ctx.userId,
    })
    .where(and(eq(companies.id, companyId), eq(companies.orgId, ctx.orgId)));

  return { error: null, denumire: stare.denumire, activ: stare.activ, anBilant: bilant?.an ?? null };
});

export type EditeazaFirmaState = ActionState;
export const editeazaFirma = withOrgSession(async (ctx, companyId: string, formData: FormData): Promise<EditeazaFirmaState> => {
  const str = (k: string) => {
    const v = formData.get(k);
    if (v == null) return undefined;
    const s = String(v).trim();
    return s || null;
  };
  const num = (k: string) => {
    const v = formData.get(k);
    if (v == null || v === "") return undefined;
    const n = Math.round(Number(v));
    return Number.isFinite(n) ? n : undefined;
  };
  const nume = str("nume");
  if (nume === null) return { error: "Numele firmei e obligatoriu." };
  // Linkurile ajung în href-uri afișate altor utilizatori — doar http(s).
  const urlCamp = (k: string) => {
    const brut = str(k);
    return brut ? urlWebSigur(brut) : brut;
  };
  for (const k of ["site", "linkedin", "facebook"]) {
    const brut = str(k);
    if (brut && !urlWebSigur(brut)) return { error: `Câmpul „${k}” nu e o adresă web validă (http/https).` };
  }

  const r = await ctx.db
    .update(companies)
    .set({
      ...(nume !== undefined ? { nume } : {}),
      cui: str("cui"),
      judet: str("judet"),
      localitate: str("localitate"),
      adresa: str("adresa"),
      caen: str("caen"),
      industrie: str("industrie"),
      site: urlCamp("site"),
      linkedin: urlCamp("linkedin"),
      facebook: urlCamp("facebook"),
      administrator: str("administrator"),
      ca: num("ca"),
      profit: num("profit"),
      nrAngajati: num("nrAngajati"),
      nota: str("nota"),
      updatedBy: ctx.userId,
    })
    .where(and(eq(companies.id, companyId), eq(companies.orgId, ctx.orgId)))
    .returning({ id: companies.id });
  if (!r[0]) return { error: "Firma nu a fost găsită." };
  return { error: null };
});

// Ștergere = soft-delete (deletedAt), la fel ca /api/[orgSlug]/crm-companies —
// firma dispare din listă/statistici, dar rândul rămâne pentru audit/CRM PJ.
export const stergeFirma = withOrgSession(async (ctx, companyId: string): Promise<ActionState> => {
  const r = await ctx.db
    .update(companies)
    .set({ deletedAt: new Date(), updatedBy: ctx.userId })
    .where(and(eq(companies.id, companyId), eq(companies.orgId, ctx.orgId)))
    .returning({ id: companies.id });
  if (!r[0]) return { error: "Firma nu a fost găsită." };
  return { error: null };
});

// "Calendar de lucru" — firmele cu o urmărire (followupAt) programată,
// cronologic. Coloana e reală, existentă deja (companies.followupAt) — nu e
// un tabel/entitate nou creat(ă) pentru acest buton.
export const getCalendarLucru = withOrgSession(async (ctx) => {
  return ctx.db
    .select({ id: companies.id, nume: companies.nume, followupAt: companies.followupAt, judet: companies.judet })
    .from(companies)
    .where(and(eq(companies.orgId, ctx.orgId), isNotNull(companies.followupAt), sql`${companies.deletedAt} is null`))
    .orderBy(asc(companies.followupAt))
    .limit(200);
});

export type ImportCsvState = ActionState & { importate?: number; ignorate?: number; duplicate?: number; pesteCota?: number };

// Plafon de rânduri pe un import (peste el, cererea riscă să depășească limita de timp/memorie).
const MAX_RANDURI_IMPORT = 5000;

// CUI normalizat (fără spații și prefixul RO) — pentru deduplicare.
function normalizeazaCui(cui: string): string {
  return cui.replace(/\s+/g, "").toUpperCase().replace(/^RO/, "");
}

const CSV_COLOANE = ["nume", "cui", "judet", "localitate", "caen", "industrie", "site", "administrator", "ca", "profit", "nrAngajati"] as const;

function parseCsvLine(line: string, sep: string = ","): string[] {
  // Parser CSV minimal, suficient pentru export standard (virgulă, ghilimele
  // duble pentru câmpuri cu virgulă/ghilimele interioare) — nu un parser RFC
  // 4180 complet, dar acoperă exporturile obișnuite din Excel/Google Sheets.
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        cur += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === sep) {
      out.push(cur);
      cur = "";
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

// Împarte textul în înregistrări, respectând câmpurile între ghilimele care conțin ruperi de rând (un simplu split pe
// rând ar fi tăiat un câmp în două și ar fi decalat coloanele).
function imparteInInregistrari(text: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (inQuotes && text[i + 1] === '"') {
        cur += '""';
        i++;
        continue;
      }
      inQuotes = !inQuotes;
      cur += c;
    } else if ((c === "\n" || c === "\r") && !inQuotes) {
      if (c === "\r" && text[i + 1] === "\n") i++;
      out.push(cur);
      cur = "";
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out.filter((l) => l.trim().length > 0);
}

// Excel în varianta românească exportă CSV cu „;" (virgula e separator zecimal): alegem separatorul cel mai frecvent din antet.
function detecteazaSeparator(antet: string): string {
  const numara = (ch: string) => antet.split(ch).length - 1;
  const candidati = [",", ";", "\t"].map((ch) => ({ ch, n: numara(ch) }));
  candidati.sort((a, b) => b.n - a.n);
  return candidati[0].n > 0 ? candidati[0].ch : ",";
}

// Import CSV real — antet obligatoriu, coloane recunoscute din CSV_COLOANE
// (restul sunt ignorate). Fără fișiere/Storage — textul CSV vine direct din
// formular (citit client-side cu FileReader, trimis ca string).
export const importaFirmeCsv = withOrgSession(async (ctx, csvText: string): Promise<ImportCsvState> => {
  const linii = imparteInInregistrari(csvText.replace(/^﻿/, ""));
  if (linii.length < 2) return { error: "Fișierul CSV e gol sau nu are decât antet." };
  if (linii.length - 1 > MAX_RANDURI_IMPORT) {
    return { error: `Fișierul are prea multe rânduri (maxim ${MAX_RANDURI_IMPORT} pe import) — împarte-l în mai multe fișiere.` };
  }

  const sep = detecteazaSeparator(linii[0]);
  const antet = parseCsvLine(linii[0], sep).map((h) => h.trim().toLowerCase());
  const indexNume = antet.indexOf("nume");
  if (indexNume === -1) return { error: "CSV-ul trebuie să aibă o coloană „nume”." };

  const coloaneIndex = CSV_COLOANE.map((c) => ({ col: c, idx: antet.indexOf(c.toLowerCase()) }));

  // Cota de companii a pachetului se aplică și la import (înainte ocolea limita: se insera orice
  // număr de rânduri). Rândurile peste cotă nu se importă și sunt raportate separat.
  const limite = getLimiteleEfective(ctx.orgPackage, ctx.orgCustomPlanConfig);
  const [{ firmeCount }] = await ctx.db
    .select({ firmeCount: sql<number>`count(*)`.mapWith(Number) })
    .from(companies)
    .where(and(eq(companies.orgId, ctx.orgId), isNull(companies.deletedAt)));
  let locuriRamase = limite.companiiPj === null ? Number.POSITIVE_INFINITY : Math.max(0, limite.companiiPj - firmeCount);

  // Deduplicare după CUI: față de firmele existente și față de rândurile anterioare din fișier.
  const existente = await ctx.db
    .select({ cui: companies.cui })
    .from(companies)
    .where(and(eq(companies.orgId, ctx.orgId), isNull(companies.deletedAt), isNotNull(companies.cui)));
  const cuiVazute = new Set(existente.map((r) => normalizeazaCui(r.cui ?? "")).filter(Boolean));

  let importate = 0;
  let ignorate = 0;
  let duplicate = 0;
  let pesteCota = 0;
  const randuri: (typeof companies.$inferInsert)[] = [];
  for (const linie of linii.slice(1)) {
    const valori = parseCsvLine(linie, sep);
    const nume = valori[indexNume]?.trim();
    if (!nume) {
      ignorate++;
      continue;
    }
    const rand: Record<string, unknown> = { id: randomUUID(), orgId: ctx.orgId, nume, updatedBy: ctx.userId };
    for (const { col, idx } of coloaneIndex) {
      if (col === "nume" || idx === -1) continue;
      const v = valori[idx]?.trim();
      if (!v) continue;
      if (col === "ca" || col === "profit" || col === "nrAngajati") {
        const n = parseazaNumarRo(v);
        if (n !== null) rand[col] = Math.round(n);
      } else if (col === "site") {
        const url = urlWebSigur(v);
        if (url) rand[col] = url;
      } else {
        rand[col] = v;
      }
    }
    if (typeof rand.cui === "string" && rand.cui) {
      const n = normalizeazaCui(rand.cui);
      if (n && cuiVazute.has(n)) {
        duplicate++;
        continue;
      }
      if (n) cuiVazute.add(n);
    }
    if (locuriRamase <= 0) {
      pesteCota++;
      continue;
    }
    locuriRamase--;
    randuri.push(rand as typeof companies.$inferInsert);
  }

  // Inserare în loturi (nu rând cu rând).
  for (let i = 0; i < randuri.length; i += 200) {
    const lot = randuri.slice(i, i + 200);
    await ctx.db.insert(companies).values(lot);
    importate += lot.length;
  }

  if (importate === 0 && pesteCota > 0 && limite.companiiPj !== null) {
    return {
      error: `Ai atins limita de ${limite.companiiPj} companii a pachetului tău — șterge firme existente sau treci la un pachet mai mare.`,
    };
  }
  return { error: null, importate, ignorate, duplicate, pesteCota };
});
