"use server";

import { and, count, desc, eq, gte, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { inregistreazaAudit } from "@/lib/audit";
import { withOrgFaze, withOrgSession } from "@/lib/auth/guard";
import { companies, contacts, prospectareCandidati, prospectareChei, prospectareJurnal, prospectareSuprimati } from "@/lib/db/schema";
import { EroareUtilizator, mesajSigur } from "@/lib/erori";
import { cautaDecidenti, cheieNume, crediteFurnizor, domeniuDinEmail, FURNIZORI, linkedinNormalizat, prenumeSiNume, waalaxyTrimite, type Credite, type Furnizor, type ProspectWaalaxy, type RezultatCautare } from "@/lib/prospectare/motor";
import { decripteaza } from "@/lib/secret-box";

// Prospectare de decidenți pentru o firmă (pachetul IMPACT). Folosește cheile PROPRII ale organizației la Lusha, Apollo, Prospeo și Hunter (Setări → Prospectare).
// Persoanele găsite stau în cutia „De aprobat” până le aprobă cineva din echipă; abia atunci devin contacte ale firmei.
// Apelurile către furnizori se fac în afara tranzacției (withOrgFaze), ca o conexiune la baza de date să nu stea blocată cât durează.

import { LIMITA_APELURI_PE_ZI } from "@/lib/prospectare/limite";
const OPTIUNI = { modul: "prospectare-multi" as const };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
  gasitLa: string;
};

export type StareProspectare = {
  furnizoriConfigurati: Furnizor[];
  waalaxyGata: boolean; // cheia Waalaxy e conectată și o listă e aleasă
  apeluriAzi: number;
  limitaApeluri: number;
  candidati: CandidatRand[];
};

export const getStareProspectare = withOrgSession(
  async (ctx, companyId: string): Promise<StareProspectare> => {
    if (!UUID.test(companyId)) return { furnizoriConfigurati: [], waalaxyGata: false, apeluriAzi: 0, limitaApeluri: LIMITA_APELURI_PE_ZI, candidati: [] };
    const [chei, azi, candidati] = await Promise.all([
      ctx.db.select({ furnizor: prospectareChei.provider, setari: prospectareChei.setari }).from(prospectareChei).where(eq(prospectareChei.orgId, ctx.orgId)),
      ctx.db.select({ n: count() }).from(prospectareJurnal).where(and(eq(prospectareJurnal.orgId, ctx.orgId), gte(prospectareJurnal.createdAt, sql`now() - interval '24 hours'`))),
      ctx.db
        .select()
        .from(prospectareCandidati)
        .where(and(eq(prospectareCandidati.orgId, ctx.orgId), eq(prospectareCandidati.companyId, companyId), eq(prospectareCandidati.stare, "nou")))
        .orderBy(desc(prospectareCandidati.scor)),
    ]);
    return {
      furnizoriConfigurati: chei.map((c) => c.furnizor as Furnizor).filter((p) => FURNIZORI.includes(p)),
      waalaxyGata: chei.some((c) => c.furnizor === "waalaxy" && Boolean(c.setari?.listaId)),
      apeluriAzi: azi[0]?.n ?? 0,
      limitaApeluri: LIMITA_APELURI_PE_ZI,
      candidati: candidati.map((c) => ({ id: c.id, nume: c.nume, rol: c.rol, dept: c.dept, linkedin: c.linkedin, email: c.email, emailStatus: c.emailStatus, sursa: c.sursa, scor: c.scor, gasitLa: c.gasitLa.toISOString() })),
    };
  },
  OPTIUNI,
);

export type RezultatActiune = { ok: boolean; eroare?: string; gasiti?: number; noi?: number; avertismente?: string[] };

type Pregatit = {
  companyId: string;
  firma: { nume: string; site: string | null; angajati: number | null };
  domeniuAlternativ: string | null;
  chei: Partial<Record<Furnizor, string>>;
  cunoscute: { chei: string[]; emailuri: string[]; linkedin: string[] };
  suprimate: { chei: string[]; emailuri: string[]; linkedin: string[] };
  ramase: number;
};

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

export const cautaDecidentiAction = withOrgFaze<[string], Pregatit, RezultatCautare, RezultatActiune>({
  opts: OPTIUNI,
  pregateste: async (ctx, companyId) => {
    if (!UUID.test(companyId)) throw new EroareUtilizator("Firma nu a fost găsită.");
    const [firma] = await ctx.db
      .select({ nume: companies.nume, site: companies.site, angajati: companies.nrAngajati })
      .from(companies)
      .where(and(eq(companies.id, companyId), eq(companies.orgId, ctx.orgId), sql`${companies.deletedAt} is null`))
      .limit(1);
    if (!firma) throw new EroareUtilizator("Firma nu a fost găsită.");

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
    if (Object.keys(chei).length === 0) return { gata: { ok: false, eroare: "Nu ai adăugat nicio cheie de furnizor. Adaugă-le în Setări → Prospectare." } };

    const [deLaFirma, candidatiExistenti, suprimate, azi] = await Promise.all([
      ctx.db.select({ nume: contacts.nume, email: contacts.email, linkedin: contacts.linkedin }).from(contacts).where(and(eq(contacts.companyId, companyId), eq(contacts.orgId, ctx.orgId))),
      ctx.db.select({ numeNorm: prospectareCandidati.numeNorm, email: prospectareCandidati.email, linkedin: prospectareCandidati.linkedin }).from(prospectareCandidati).where(and(eq(prospectareCandidati.companyId, companyId), eq(prospectareCandidati.orgId, ctx.orgId))),
      ctx.db.select({ tip: prospectareSuprimati.tip, valoare: prospectareSuprimati.valoare }).from(prospectareSuprimati).where(eq(prospectareSuprimati.orgId, ctx.orgId)),
      ctx.db.select({ n: count() }).from(prospectareJurnal).where(and(eq(prospectareJurnal.orgId, ctx.orgId), gte(prospectareJurnal.createdAt, sql`now() - interval '24 hours'`))),
    ]);
    const ramase = LIMITA_APELURI_PE_ZI - (azi[0]?.n ?? 0);
    if (ramase <= 0) return { gata: { ok: false, eroare: "Limita zilnică de căutări a organizației a fost atinsă; continuă mâine." } };

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
        ramase,
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
      limite: { apeluriRamase: p.ramase },
      fetchFn: fetch,
    }),
  salveaza: async (ctx, p, r): Promise<RezultatActiune> => {
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

// Aprobarea: persoana devine contact al firmei. Când persoana e adăugată din date de la un terț, organizația trebuie s-o informeze în cel mult 30 de zile (art. 14 GDPR).
// Opțional, persoana (dacă are profil LinkedIn) e trimisă și în lista Waalaxy aleasă de organizație, ca s-o abordeze pe LinkedIn. Apelul Waalaxy se face în afara tranzacției.
type PregatitAprobare = { candidatId: string; waalaxy: { cheie: string; listaId: string; campanieId: string; prospect: ProspectWaalaxy } | null };
type ExternAprobare = { trimis: boolean; eroare?: string };
export type RezultatAprobare = { error: string | null; avertisment?: string };

export const aprobaCandidat = withOrgFaze<[string, boolean], PregatitAprobare, ExternAprobare, RezultatAprobare>({
  opts: OPTIUNI,
  pregateste: async (ctx, candidatId, trimiteWaalaxy) => {
    if (!UUID.test(candidatId)) throw new EroareUtilizator("Candidatul nu a fost găsit.");
    const [c] = await ctx.db
      .select({ stare: prospectareCandidati.stare, nume: prospectareCandidati.nume, rol: prospectareCandidati.rol, linkedin: prospectareCandidati.linkedin, firma: companies.nume })
      .from(prospectareCandidati)
      .innerJoin(companies, eq(companies.id, prospectareCandidati.companyId))
      .where(and(eq(prospectareCandidati.id, candidatId), eq(prospectareCandidati.orgId, ctx.orgId)))
      .limit(1);
    if (!c || c.stare !== "nou") throw new EroareUtilizator("Candidatul nu mai e în lista „De aprobat”.");
    if (!trimiteWaalaxy) return { pregatit: { candidatId, waalaxy: null } };
    if (!c.linkedin) throw new EroareUtilizator("Persoana nu are profil LinkedIn, deci nu poate fi trimisă în Waalaxy.");
    const [w] = await ctx.db.select({ enc: prospectareChei.cheieEnc, setari: prospectareChei.setari }).from(prospectareChei).where(and(eq(prospectareChei.orgId, ctx.orgId), eq(prospectareChei.provider, "waalaxy"))).limit(1);
    if (!w?.setari?.listaId) throw new EroareUtilizator("Conectează Waalaxy și alege o listă în Setări → Prospectare.");
    let cheie: string;
    try {
      cheie = decripteaza(w.enc);
    } catch {
      throw new EroareUtilizator("Cheia Waalaxy nu mai poate fi citită; adaug-o din nou în Setări → Prospectare.");
    }
    const { prenume, nume } = prenumeSiNume(c.nume);
    const url = c.linkedin.startsWith("http") ? c.linkedin : `https://${c.linkedin}`;
    return { pregatit: { candidatId, waalaxy: { cheie, listaId: w.setari.listaId, campanieId: w.setari.campanieId ?? "", prospect: { linkedinUrl: url, prenume, nume, firma: c.firma, rol: c.rol ?? undefined } } } };
  },
  extern: async (p): Promise<ExternAprobare> => {
    if (!p.waalaxy) return { trimis: false };
    const r = await waalaxyTrimite(p.waalaxy.cheie, { listaId: p.waalaxy.listaId, campanieId: p.waalaxy.campanieId || undefined, prospecti: [p.waalaxy.prospect] }, fetch);
    return r.ok ? { trimis: true } : { trimis: false, eroare: r.eroare };
  },
  salveaza: async (ctx, p, extern): Promise<RezultatAprobare> => {
    // Stare reverificată în tranzacția de salvare: între cele două faze altcineva din echipă ar fi putut hotărî deja.
    const [c] = await ctx.db.select().from(prospectareCandidati).where(and(eq(prospectareCandidati.id, p.candidatId), eq(prospectareCandidati.orgId, ctx.orgId))).limit(1);
    if (!c || c.stare !== "nou") throw new EroareUtilizator("Candidatul nu mai e în lista „De aprobat”.");
    const [contact] = await ctx.db
      .insert(contacts)
      .values({ orgId: ctx.orgId, companyId: c.companyId, nume: c.nume, rol: c.rol, dept: c.dept, email: c.email, linkedin: c.linkedin, createdBy: ctx.userId })
      .returning({ id: contacts.id });
    await ctx.db.update(prospectareCandidati).set({ stare: "aprobat", contactId: contact.id, hotaratDe: ctx.userId, hotaratLa: new Date() }).where(eq(prospectareCandidati.id, c.id));
    await inregistreazaAudit(ctx.db, { orgId: ctx.orgId, actorAppUserId: ctx.userId, actiune: "prospectare_candidat_aprobat", entitate: "contact", entitateId: contact.id, detalii: { sursa: c.sursa, waalaxy: p.waalaxy ? (extern.trimis ? "trimis" : "esuat") : "nu" } });
    revalidatePath(`/${ctx.orgSlug}/crm/companii`);
    return { error: null, avertisment: p.waalaxy && !extern.trimis ? `Persoana a fost adăugată la contacte, dar nu a ajuns în Waalaxy: ${extern.eroare ?? "eroare necunoscută"}` : undefined };
  },
});

// Respingerea: persoana nu se mai propune pentru această firmă. Cu „nu o mai propune deloc” (ea a cerut să nu fie contactată), nu se mai propune pentru nicio firmă.
export const respingeCandidat = withOrgSession(
  async (ctx, candidatId: string, nuMaiPropune: boolean): Promise<void> => {
    if (!UUID.test(candidatId)) throw new EroareUtilizator("Candidatul nu a fost găsit.");
    const [c] = await ctx.db.select().from(prospectareCandidati).where(and(eq(prospectareCandidati.id, candidatId), eq(prospectareCandidati.orgId, ctx.orgId))).limit(1);
    if (!c || c.stare !== "nou") throw new EroareUtilizator("Candidatul nu mai e în lista „De aprobat”.");
    await ctx.db.update(prospectareCandidati).set({ stare: "respins", hotaratDe: ctx.userId, hotaratLa: new Date() }).where(eq(prospectareCandidati.id, c.id));
    if (nuMaiPropune) {
      const suprimari: { orgId: string; tip: string; valoare: string; motiv: string }[] = [{ orgId: ctx.orgId, tip: "nume", valoare: c.numeNorm, motiv: "nu mai fi propusă" }];
      if (c.email) suprimari.push({ orgId: ctx.orgId, tip: "email", valoare: c.email.toLowerCase(), motiv: "nu mai fi propusă" });
      const l = linkedinNormalizat(c.linkedin);
      if (l) suprimari.push({ orgId: ctx.orgId, tip: "linkedin", valoare: l, motiv: "nu mai fi propusă" });
      await ctx.db.insert(prospectareSuprimati).values(suprimari).onConflictDoNothing();
    }
    revalidatePath(`/${ctx.orgSlug}/crm/companii`);
  },
  OPTIUNI,
);

export async function aprobaCandidatAction(orgSlug: string, candidatId: string, trimiteWaalaxy = false): Promise<RezultatAprobare> {
  try {
    return await aprobaCandidat(orgSlug, candidatId, trimiteWaalaxy);
  } catch (e) {
    return { error: mesajSigur(e, "Nu am putut adăuga persoana. Încearcă din nou.", "prospectare-aprobare") };
  }
}

export async function respingeCandidatAction(orgSlug: string, candidatId: string, nuMaiPropune: boolean): Promise<{ error: string | null }> {
  try {
    await respingeCandidat(orgSlug, candidatId, nuMaiPropune);
    return { error: null };
  } catch (e) {
    return { error: mesajSigur(e, "Nu am putut respinge persoana. Încearcă din nou.", "prospectare-respingere") };
  }
}

export async function creditePrelucrare(orgSlug: string): Promise<CreditFurnizor[]> {
  try {
    return await getCredite(orgSlug);
  } catch {
    return [];
  }
}

export async function cautaDecidentiPentruFirma(orgSlug: string, companyId: string): Promise<RezultatActiune> {
  try {
    return await cautaDecidentiAction(orgSlug, companyId);
  } catch (e) {
    return { ok: false, eroare: mesajSigur(e, "Căutarea nu a reușit. Încearcă din nou în câteva minute.", "prospectare-cautare") };
  }
}
