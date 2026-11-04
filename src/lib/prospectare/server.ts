import "server-only";

import { and, count, eq, gte, ne, sql } from "drizzle-orm";

import type { OrgContext } from "@/lib/auth/guard";
import { companies, companyNotite, contacts, prospectareCandidati, prospectareChei, prospectareJurnal, prospectareSuprimati } from "@/lib/db/schema";
import { SetSuprimate, valoareSuprimare, type TipSuprimare } from "@/lib/amprente-hmac";
import { amprentePersoana, amprentePersoanaDeVerificat } from "@/lib/gdpr-persoane";
import { decripteaza } from "@/lib/secret-box";

import { cheieStocata, type CandidatDeep } from "./deep-search";
import { REZERVARE_EXPIRA_MIN } from "./limite";
import { cheieNume, domeniuDinEmail, FURNIZORI, linkedinNormalizat, linkedinSigur, NUME_FURNIZOR, type Furnizor } from "./motor";

// Ajutoare de server pentru prospectarea de decidenți (Deep Search, „Caută pe internet (AI)”, aprobare): citirea cheilor organizației, excluderile GDPR,
// salvarea candidaților și crearea contactului la aprobare. Toate lucrează pe `ctx.db` (tranzacția organizației, RLS) și filtrează explicit după organizație.

type Db = OrgContext["db"];
export type RandCandidat = typeof prospectareCandidati.$inferSelect;

export const NUME_SURSA: Record<string, string> = { ...NUME_FURNIZOR, "web-ai": "Internet (AI)" };
export const numeSursa = (s: string): string => NUME_SURSA[s] ?? s;

// Cheile furnizorilor organizației, decriptate. O cheie care nu mai poate fi citită (ORG_SECRETS_KEY schimbată) se tratează ca lipsă.
export async function citesteChei(db: Db, orgId: string): Promise<Partial<Record<Furnizor, string>>> {
  const randuri = await db.select({ furnizor: prospectareChei.provider, enc: prospectareChei.cheieEnc }).from(prospectareChei).where(eq(prospectareChei.orgId, orgId));
  const chei: Partial<Record<Furnizor, string>> = {};
  for (const r of randuri) {
    if (!FURNIZORI.includes(r.furnizor as Furnizor)) continue;
    try {
      chei[r.furnizor as Furnizor] = decripteaza(r.enc);
    } catch {
      // cheie ilizibilă: se tratează ca neconectată
    }
  }
  return chei;
}

// Apelurile reale făcute în ultimele 24 de ore plus rezervările active (căutări în curs); rezervările uitate expiră.
export async function apeluriFolosite(db: Db, orgId: string): Promise<number> {
  const [reale, rezervate] = await Promise.all([
    db.select({ n: count() }).from(prospectareJurnal).where(and(eq(prospectareJurnal.orgId, orgId), ne(prospectareJurnal.operatie, "rezervare"), gte(prospectareJurnal.createdAt, sql`now() - interval '24 hours'`))),
    db
      .select({ n: sql<number>`coalesce(sum(${prospectareJurnal.unitati}), 0)::int` })
      .from(prospectareJurnal)
      .where(and(eq(prospectareJurnal.orgId, orgId), eq(prospectareJurnal.operatie, "rezervare"), gte(prospectareJurnal.createdAt, sql`now() - make_interval(mins => ${REZERVARE_EXPIRA_MIN})`))),
  ]);
  return (reale[0]?.n ?? 0) + (rezervate[0]?.n ?? 0);
}

// ===== Excluderi (GDPR + credite) =====
type Seturi = { chei: Set<string>; emailuri: Set<string>; linkedin: Set<string> };
export type Excluderi = {
  cunoscute: Seturi; // contactele firmei și persoanele deja hotărâte (aprobate)
  suprimate: Seturi; // au cerut să nu mai fie propuse (lista organizației)
  amprente: Set<string>; // lista „nu mai căuta” a firmei: respinși sau șterși, doar amprente (extra.nuMaiCauta)
  domeniuAlternativ: string | null; // domeniul din emailul unui contact, dacă firma nu are site
};

const seturiGoale = (): Seturi => ({ chei: new Set(), emailuri: new Set(), linkedin: new Set() });

export async function incarcaExcluderi(db: Db, orgId: string, companyId: string): Promise<Excluderi> {
  const [deLaFirma, hotarate, suprimate, [firma]] = await Promise.all([
    db.select({ nume: contacts.nume, email: contacts.email, linkedin: contacts.linkedin }).from(contacts).where(and(eq(contacts.companyId, companyId), eq(contacts.orgId, orgId))),
    db
      .select({ numeNorm: prospectareCandidati.numeNorm, email: prospectareCandidati.email, linkedin: prospectareCandidati.linkedin })
      .from(prospectareCandidati)
      .where(and(eq(prospectareCandidati.companyId, companyId), eq(prospectareCandidati.orgId, orgId), ne(prospectareCandidati.stare, "nou"))),
    db.select({ tip: prospectareSuprimati.tip, valoare: prospectareSuprimati.valoare }).from(prospectareSuprimati).where(eq(prospectareSuprimati.orgId, orgId)),
    db.select({ extra: companies.extra }).from(companies).where(and(eq(companies.id, companyId), eq(companies.orgId, orgId))).limit(1),
  ]);
  const cunoscute = seturiGoale();
  for (const c of deLaFirma) {
    const k = cheieNume(c.nume);
    if (k) cunoscute.chei.add(k);
    if (c.email) cunoscute.emailuri.add(c.email.toLowerCase());
    const l = linkedinNormalizat(c.linkedin);
    if (l) cunoscute.linkedin.add(l);
  }
  for (const c of hotarate) {
    cunoscute.chei.add(c.numeNorm);
    if (c.email) cunoscute.emailuri.add(c.email.toLowerCase());
    const l = linkedinNormalizat(c.linkedin);
    if (l) cunoscute.linkedin.add(l);
  }
  const supr = seturiSuprimate(orgId, suprimate);
  const extra = (firma?.extra ?? {}) as { nuMaiCauta?: unknown };
  const amprente = new Set(Array.isArray(extra.nuMaiCauta) ? extra.nuMaiCauta.filter((x): x is string => typeof x === "string") : []);
  return { cunoscute, suprimate: supr, amprente, domeniuAlternativ: deLaFirma.map((c) => domeniuDinEmail(c.email)).find(Boolean) ?? null };
}

export function esteExclus(e: Excluderi, orgId: string, companyId: string, p: { nume: string; email?: string | null; linkedin?: string | null }): boolean {
  const k = cheieNume(p.nume);
  const email = (p.email ?? "").toLowerCase();
  const l = linkedinNormalizat(p.linkedin);
  if (k && (e.suprimate.chei.has(k) || e.cunoscute.chei.has(k))) return true;
  if (email && (e.suprimate.emailuri.has(email) || e.cunoscute.emailuri.has(email))) return true;
  if (l && (e.suprimate.linkedin.has(l) || e.cunoscute.linkedin.has(l))) return true;
  return e.amprente.size > 0 && amprentePersoanaDeVerificat(orgId, companyId, p.nume, p.linkedin).some((h) => e.amprente.has(h));
}

// Cine a cerut să nu mai fie propus (lista organizației) nu se aprobă, nici dacă era deja în listă de la altă căutare.
export function esteSuprimataOrg(supr: Seturi, p: { numeNorm: string; email: string | null; linkedin: string | null }): boolean {
  const email = (p.email ?? "").toLowerCase();
  const l = linkedinNormalizat(p.linkedin);
  return supr.chei.has(p.numeNorm) || (email !== "" && supr.emailuri.has(email)) || (l !== "" && supr.linkedin.has(l));
}

export async function incarcaSuprimate(db: Db, orgId: string): Promise<Seturi> {
  const randuri = await db.select({ tip: prospectareSuprimati.tip, valoare: prospectareSuprimati.valoare }).from(prospectareSuprimati).where(eq(prospectareSuprimati.orgId, orgId));
  return seturiSuprimate(orgId, randuri);
}

// Lista de suprimare conține valori în clar (rânduri vechi) și amprente HMAC (rânduri noi, vezi valoareSuprimare): seturile răspund la ambele forme.
export function seturiSuprimate(orgId: string, randuri: readonly { tip: string; valoare: string }[]): Seturi {
  const dupaTip = (tip: TipSuprimare) => randuri.filter((r) => (r.tip === "email" ? "email" : r.tip === "linkedin" ? "linkedin" : "nume") === tip).map((r) => r.valoare);
  return { chei: new SetSuprimate(orgId, "nume", dupaTip("nume")), emailuri: new SetSuprimate(orgId, "email", dupaTip("email")), linkedin: new SetSuprimate(orgId, "linkedin", dupaTip("linkedin")) };
}

// Rândurile de scris în lista de suprimare ale unei persoane: doar amprente (HMAC), niciodată numele, emailul sau profilul în clar.
export function suprimariPersoana(orgId: string, p: { numeNorm?: string | null; email?: string | null; linkedin?: string | null }, motiv: string): { orgId: string; tip: TipSuprimare; valoare: string; motiv: string }[] {
  const out: { orgId: string; tip: TipSuprimare; valoare: string; motiv: string }[] = [];
  const email = (p.email ?? "").trim().toLowerCase();
  const l = linkedinNormalizat(p.linkedin);
  if (p.numeNorm) out.push({ orgId, tip: "nume", valoare: valoareSuprimare(orgId, "nume", p.numeNorm), motiv });
  if (email) out.push({ orgId, tip: "email", valoare: valoareSuprimare(orgId, "email", email), motiv });
  if (l) out.push({ orgId, tip: "linkedin", valoare: valoareSuprimare(orgId, "linkedin", l), motiv });
  return out;
}

// ===== Candidații =====
export type CandidatDeSalvat = CandidatDeep & { scor: number; prioritate: number | null; eticheta: string };

// Salvează (sau completează) candidații firmei. Un rând deja în listă se completează cu ce aduce noua căutare (surse, id-uri, email, telefon);
// unul deja aprobat sau respins nu se atinge. Întoarce câți rânduri sunt noi.
export async function salveazaCandidati(db: Db, orgId: string, companyId: string, userId: string, lista: readonly CandidatDeSalvat[]): Promise<number> {
  if (lista.length === 0) return 0;
  const toate = lista.map((c) => ({
    orgId,
    companyId,
    nume: c.nume,
    numeNorm: cheieStocata(c.nume, c.sursa),
    rol: c.rol || null,
    dept: c.dept || null,
    linkedin: linkedinSigur(c.linkedin) || null,
    // un e-mail marcat „invalid” nu se păstrează: nu ajunge la nimeni
    email: c.email && c.emailStatus !== "invalid" ? c.email : null,
    emailStatus: c.email && c.emailStatus !== "invalid" ? c.emailStatus : null,
    telefon: c.telefon || null,
    sursa: c.sursa,
    scor: c.scor,
    prioritate: c.prioritate,
    eticheta: c.eticheta || null,
    ids: c.ids ?? {},
    alteSurse: c.alteSurse ?? [],
    cerereLusha: c.cerereLusha ?? null,
    sursaUrl: c.sursaUrl ?? null,
    gasitDe: userId,
  }));
  // Două rânduri cu aceeași cheie (aceeași persoană găsită din nou de același furnizor — rândul vechi din listă și cel nou — sau doi omonimi la același furnizor) ar încălca
  // ON CONFLICT în același INSERT („cannot affect row a second time”) și ar pierde toată căutarea: rămâne un rând, cu câmpurile goale completate din celălalt.
  const peCheie = new Map<string, (typeof toate)[number]>();
  for (const r of toate) {
    const v = peCheie.get(r.numeNorm);
    peCheie.set(
      r.numeNorm,
      v
        ? {
            ...r,
            rol: r.rol ?? v.rol,
            dept: r.dept ?? v.dept,
            linkedin: r.linkedin ?? v.linkedin,
            email: r.email ?? v.email,
            emailStatus: r.email ? r.emailStatus : v.emailStatus,
            telefon: r.telefon ?? v.telefon,
            prioritate: r.prioritate ?? v.prioritate,
            eticheta: r.eticheta ?? v.eticheta,
            cerereLusha: r.cerereLusha ?? v.cerereLusha,
            sursaUrl: r.sursaUrl ?? v.sursaUrl,
            scor: Math.max(r.scor, v.scor),
            ids: { ...v.ids, ...r.ids },
            alteSurse: [...new Set([...v.alteSurse, ...r.alteSurse])].filter((s) => s !== r.sursa),
          }
        : r,
    );
  }
  const randuri = [...peCheie.values()];
  const rezultat = await db
    .insert(prospectareCandidati)
    .values(randuri)
    .onConflictDoUpdate({
      target: [prospectareCandidati.companyId, prospectareCandidati.numeNorm],
      set: {
        nume: sql`excluded.nume`,
        rol: sql`coalesce(excluded.rol, ${prospectareCandidati.rol})`,
        dept: sql`coalesce(excluded.dept, ${prospectareCandidati.dept})`,
        linkedin: sql`coalesce(excluded.linkedin, ${prospectareCandidati.linkedin})`,
        email: sql`coalesce(excluded.email, ${prospectareCandidati.email})`,
        emailStatus: sql`case when excluded.email is not null then excluded.email_status else ${prospectareCandidati.emailStatus} end`,
        telefon: sql`coalesce(excluded.telefon, ${prospectareCandidati.telefon})`,
        sursa: sql`excluded.sursa`,
        scor: sql`excluded.scor`,
        prioritate: sql`excluded.prioritate`,
        eticheta: sql`excluded.eticheta`,
        ids: sql`excluded.ids`,
        alteSurse: sql`excluded.alte_surse`,
        cerereLusha: sql`coalesce(excluded.cerere_lusha, ${prospectareCandidati.cerereLusha})`,
        sursaUrl: sql`coalesce(excluded.sursa_url, ${prospectareCandidati.sursaUrl})`,
      },
      setWhere: eq(prospectareCandidati.stare, "nou"),
    })
    .returning({ id: prospectareCandidati.id, nou: sql<boolean>`(xmax = 0)` });
  return rezultat.filter((r) => r.nou).length;
}

// Rândurile „De aprobat” ale firmei, ca să se unească cu ce aduce o nouă căutare (nu se pierd sursele găsite înainte).
export function candidatDinRand(r: RandCandidat): CandidatDeep {
  return {
    nume: r.nume,
    rol: r.rol ?? "",
    dept: r.dept ?? "",
    linkedin: r.linkedin ?? "",
    email: r.email ?? "",
    emailStatus: r.emailStatus,
    telefon: r.telefon ?? undefined,
    sursa: r.sursa,
    ids: r.ids ?? {},
    cerereLusha: r.cerereLusha ?? undefined,
    sursaUrl: r.sursaUrl ?? undefined,
    alteSurse: r.alteSurse ?? [],
    scor: r.scor,
    prioritate: r.prioritate,
    eticheta: r.eticheta ?? "",
  };
}

// ===== Respingerea: doar amprenta rămâne =====
// Persoana respinsă nu mai apare în lista „De aprobat” și nu mai e propusă pentru această firmă: amprentele (hash legat de organizație și firmă) intră în extra.nuMaiCauta,
// iar rândul își pierde datele personale (rămâne doar în numărătoarea „respinse”).
export async function respingeCuAmprenta(ctx: OrgContext, randuri: readonly RandCandidat[]): Promise<number> {
  let n = 0;
  const peFirma = new Map<string, string[]>();
  for (const c of randuri) {
    const inchis = await ctx.db
      .update(prospectareCandidati)
      .set({
        stare: "respins",
        hotaratDe: ctx.userId,
        hotaratLa: new Date(),
        nume: "[respins]",
        numeNorm: `respins:${c.id}`,
        rol: null,
        dept: null,
        linkedin: null,
        email: null,
        emailStatus: null,
        telefon: null,
        eticheta: null,
        ids: {},
        alteSurse: [],
        cerereLusha: null,
        sursaUrl: null,
      })
      .where(and(eq(prospectareCandidati.id, c.id), eq(prospectareCandidati.orgId, ctx.orgId), eq(prospectareCandidati.stare, "nou")))
      .returning({ id: prospectareCandidati.id });
    if (inchis.length === 0) continue;
    n++;
    const lista = peFirma.get(c.companyId) ?? [];
    lista.push(...amprentePersoana(ctx.orgId, c.companyId, c.nume, c.linkedin));
    peFirma.set(c.companyId, lista);
  }
  for (const [companyId, amprente] of peFirma) await adaugaAmprente(ctx, companyId, amprente);
  return n;
}

export async function adaugaAmprente(ctx: OrgContext, companyId: string, amprente: readonly string[]): Promise<void> {
  if (amprente.length === 0) return;
  await ctx.db
    .update(companies)
    .set({
      extra: sql`jsonb_set(coalesce(${companies.extra}, '{}'::jsonb), '{nuMaiCauta}', (
        select coalesce(jsonb_agg(distinct v), '[]'::jsonb) from jsonb_array_elements_text(
          coalesce(${companies.extra}->'nuMaiCauta', '[]'::jsonb) || ${JSON.stringify([...new Set(amprente)])}::text::jsonb
        ) as t(v)
      ))`,
    })
    .where(and(eq(companies.id, companyId), eq(companies.orgId, ctx.orgId)));
}

// ===== Aprobarea: persoana devine contact =====
export type DateAduse = { email: string; emailStatus: string | null; telefon: string; linkedin: string };

const azi = () => new Date().toLocaleDateString("ro-RO", { day: "2-digit", month: "2-digit", year: "numeric" });

// Creează contactul firmei din candidat, cu proveniența (furnizorul sau „web-ai”) și sursa notată (art. 14 GDPR). O persoană deja în contacte (același email sau același nume) nu se dublează.
export async function creeazaContactDinCandidat(ctx: OrgContext, c: RandCandidat, date: DateAduse): Promise<{ contactId: string; nou: boolean }> {
  const email = date.email && date.emailStatus !== "invalid" ? date.email : "";
  const existente = await ctx.db.select({ id: contacts.id, nume: contacts.nume, email: contacts.email }).from(contacts).where(and(eq(contacts.companyId, c.companyId), eq(contacts.orgId, ctx.orgId)));
  const k = cheieNume(c.nume);
  const gasit = existente.find((x) => (email && (x.email ?? "").toLowerCase() === email.toLowerCase()) || (k && cheieNume(x.nume) === k));
  if (gasit) return { contactId: gasit.id, nou: false };
  const prioritar = c.prioritate !== null && c.prioritate <= 2;
  const sursaText = c.sursa === "web-ai" ? `Internet (AI)${c.sursaUrl ? `, sursa: ${c.sursaUrl}` : ""}` : numeSursa(c.sursa);
  const [contact] = await ctx.db
    .insert(contacts)
    .values({
      orgId: ctx.orgId,
      companyId: c.companyId,
      nume: c.nume,
      rol: c.rol,
      dept: c.dept,
      email: email || null,
      emailStatus: email ? date.emailStatus : null,
      telefon: date.telefon || c.telefon || null,
      linkedin: linkedinSigur(date.linkedin || c.linkedin) || null,
      cheie: prioritar, // decidentul și omul de la finanțe sunt persoanele-cheie ale firmei
      consentSource: `prospectare:${c.sursa}`,
      provenienta: c.sursa,
      detalii: `Găsit prin prospectare (${sursaText}) la ${azi()}${c.eticheta ? `; rol: ${c.eticheta}` : ""}. De informat despre prelucrarea datelor (art. 14 GDPR).`,
      createdBy: ctx.userId,
    })
    .returning({ id: contacts.id });
  return { contactId: contact.id, nou: true };
}

// Nota pe firmă (de unde vine contactul și care e următorul pas) și responsabilul: firma fără responsabil îl primește pe cel care aprobă.
export async function noteazaAprobarea(ctx: OrgContext, c: RandCandidat): Promise<void> {
  await ctx.db.insert(companyNotite).values({
    orgId: ctx.orgId,
    companyId: c.companyId,
    text: `Prospectare: ${c.nume}${c.rol ? ` (${c.rol})` : ""} adăugat(ă) ca persoană de contact. Sursă: ${numeSursa(c.sursa)}${c.sursa === "web-ai" && c.sursaUrl ? ` (${c.sursaUrl})` : ""}. Primul contact până la ${c.urmatorPasLa ?? "—"}.`,
    createdBy: ctx.userId,
  });
  await ctx.db.update(companies).set({ ownerId: ctx.userId }).where(and(eq(companies.id, c.companyId), eq(companies.orgId, ctx.orgId), sql`${companies.ownerId} is null`));
}

export const idsValide = (ids: readonly string[], max: number): string[] => [...new Set(ids.filter((i) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(i)))].slice(0, max);
