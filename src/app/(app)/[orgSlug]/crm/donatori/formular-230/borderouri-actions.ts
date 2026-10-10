"use server";

import { and, asc, eq, inArray, isNull, like, not, sql } from "drizzle-orm";

import { inregistreazaAudit } from "@/lib/audit";
import { withOrgAdmin } from "@/lib/auth/guard";
import { adresaAnaf, atribuieBorderouri, MAX_PE_BORDEROU, type DateBorderou } from "@/lib/borderou230";
import { formular230Beneficiari, formular230Submissions, organizations } from "@/lib/db/schema";
import { EroareUtilizator } from "@/lib/erori";
import { criptareConfigurata, cripteaza, decripteazaSauLegacy } from "@/lib/secret-box";

const F = formular230Submissions;
const anFormular = sql<number>`coalesce(${F.an}, extract(year from ${F.createdAt})::int)`;

export type BorderouSumar = {
  beneficiarId: string | null;
  beneficiarNume: string;
  an: number;
  nr: number;
  nrFormulare: number;
  nrDepuse: number;
  max: number;
};

// Atribuie formularele noi borderourilor (max. 50 per borderou; când se umple unul, se deschide următorul) și întoarce
// sumarul pe borderouri. Formularele deja atribuite nu se mută niciodată.
export const listeazaBorderouri = withOrgAdmin(async (ctx): Promise<BorderouSumar[]> => {
  // Formularele primite ÎNAINTE de criptarea CNP-ului au CNP-ul în clar, iar baza de date refuză orice UPDATE pe un rând așa
  // (constrângerea f230_cnp_criptat) — deci nici borderoul, nici „depus” nu se puteau salva. Le criptăm acum, cu aceeași cheie
  // și același format ca la formularele noi (idempotent: atinge doar rândurile al căror CNP nu începe cu „v1.”).
  if (criptareConfigurata()) {
    const vechi = await ctx.db.select({ id: F.id, cnp: F.cnp }).from(F).where(and(eq(F.orgId, ctx.orgId), not(like(F.cnp, "v1.%"))));
    for (const r of vechi) {
      await ctx.db.update(F).set({ cnp: cripteaza(r.cnp) }).where(and(eq(F.orgId, ctx.orgId), eq(F.id, r.id), not(like(F.cnp, "v1.%"))));
    }
    if (vechi.length > 0) {
      await inregistreazaAudit(ctx.db, { orgId: ctx.orgId, actorAppUserId: ctx.userId, actiune: "f230_cnp_criptat_automat", entitate: "formular230", detalii: { randuri: vechi.length } });
    }
  }

  const randuri = await ctx.db
    .select({ id: F.id, beneficiarId: F.beneficiarId, an: anFormular, borderouNr: F.borderouNr, createdAt: F.createdAt, procesat: F.procesatAnaf })
    .from(F)
    .where(eq(F.orgId, ctx.orgId))
    .orderBy(asc(F.createdAt));

  const noi = atribuieBorderouri(randuri.map((r) => ({ id: r.id, beneficiarId: r.beneficiarId, an: r.an, borderouNr: r.borderouNr, createdAt: r.createdAt })));
  if (noi.size > 0) {
    const dupaNr = new Map<number, string[]>();
    for (const [id, nr] of noi) dupaNr.set(nr, [...(dupaNr.get(nr) ?? []), id]);
    // Un UPDATE per (grup, număr) — id-urile sunt ale unui singur borderou, deci cel mult câteva zeci de rânduri.
    for (const [nr, ids] of dupaNr) {
      await ctx.db.update(F).set({ borderouNr: nr }).where(and(eq(F.orgId, ctx.orgId), inArray(F.id, ids), isNull(F.borderouNr)));
    }
    for (const r of randuri) if (noi.has(r.id)) r.borderouNr = noi.get(r.id)!;
  }

  const beneficiari = await ctx.db.select({ id: formular230Beneficiari.id, nume: formular230Beneficiari.nume }).from(formular230Beneficiari).where(eq(formular230Beneficiari.orgId, ctx.orgId));
  const numeBeneficiar = new Map(beneficiari.map((b) => [b.id, b.nume]));

  const grupuri = new Map<string, BorderouSumar>();
  for (const r of randuri) {
    if (r.borderouNr == null) continue;
    const cheie = `${r.beneficiarId ?? "-"}|${r.an}|${r.borderouNr}`;
    const g = grupuri.get(cheie) ?? {
      beneficiarId: r.beneficiarId,
      beneficiarNume: (r.beneficiarId && numeBeneficiar.get(r.beneficiarId)) || ctx.orgName,
      an: r.an,
      nr: r.borderouNr,
      nrFormulare: 0,
      nrDepuse: 0,
      max: MAX_PE_BORDEROU,
    };
    g.nrFormulare += 1;
    if (r.procesat) g.nrDepuse += 1;
    grupuri.set(cheie, g);
  }
  return [...grupuri.values()].sort((a, b) => b.an - a.an || a.beneficiarNume.localeCompare(b.beneficiarNume, "ro") || a.nr - b.nr);
});

const cifreCui = (s: string) => s.replace(/^\s*RO/i, "").replace(/\D/g, "");

const dd = (d: Date) => d.toLocaleDateString("ro-RO", { timeZone: "Europe/Bucharest", day: "2-digit", month: "2-digit", year: "numeric" });

// Datele complete ale unui borderou (cu CNP decriptat), pentru generarea Excel / PDF / XML. Doar owner/admin; accesul se înregistrează.
export const obtineDateBorderou = withOrgAdmin(async (ctx, beneficiarId: string | null, an: number, nr: number): Promise<DateBorderou> => {
  const conditii = [eq(F.orgId, ctx.orgId), eq(F.borderouNr, nr), sql`${anFormular} = ${an}`, beneficiarId ? eq(F.beneficiarId, beneficiarId) : isNull(F.beneficiarId)];
  const randuri = await ctx.db
    .select()
    .from(F)
    .where(and(...conditii))
    .orderBy(asc(F.createdAt))
    .limit(MAX_PE_BORDEROU);
  if (randuri.length === 0) throw new EroareUtilizator("Borderoul nu a fost găsit.");

  let entitate: DateBorderou["entitate"] = { den: ctx.orgName, cui: "", iban: "" };
  let beneficiarCif = "";
  if (beneficiarId) {
    const [b] = await ctx.db.select({ nume: formular230Beneficiari.nume, cif: formular230Beneficiari.cif, iban: formular230Beneficiari.iban }).from(formular230Beneficiari).where(and(eq(formular230Beneficiari.id, beneficiarId), eq(formular230Beneficiari.orgId, ctx.orgId))).limit(1);
    if (b) {
      entitate = { den: b.nume, cui: b.cif ?? "", iban: b.iban ?? "" };
      beneficiarCif = b.cif ?? "";
    }
  }
  // Domiciliul fiscal îl avem doar pentru organizația însăși; pentru alt beneficiar (alt CIF) rămâne gol, de completat în formular.
  const [o] = await ctx.db.select({ cif: organizations.cif, adresaSediu: organizations.adresaSediu, judet: organizations.judet, iban: organizations.iban }).from(organizations).where(eq(organizations.id, ctx.orgId)).limit(1);
  if (!entitate.cui) entitate.cui = o?.cif ?? "";
  const esteOrganizatia = !beneficiarCif || cifreCui(beneficiarCif) === cifreCui(o?.cif ?? "");
  if (esteOrganizatia && o?.adresaSediu) {
    const sediu = o.adresaSediu.trim();
    entitate.adresa = o.judet && !sediu.toLowerCase().includes(o.judet.toLowerCase()) ? `${sediu}, jud. ${o.judet}` : sediu;
  }
  if (!entitate.iban && esteOrganizatia) entitate.iban = o?.iban ?? "";

  await inregistreazaAudit(ctx.db, {
    orgId: ctx.orgId,
    actorAppUserId: ctx.userId,
    actiune: "f230_borderou_export",
    entitate: "formular230",
    detalii: { borderou: nr, an, randuri: randuri.length },
  });

  const acum = new Date();
  return {
    nr,
    an,
    dataBorderou: dd(acum),
    luna: Number(acum.toLocaleDateString("en-US", { timeZone: "Europe/Bucharest", month: "numeric" })),
    entitate,
    declaratii: randuri.map((s, i) => ({
      nrPoz: i + 1,
      nume: s.nume,
      initiala: s.initialaTatalui ?? "",
      prenume: s.prenume,
      cnp: decripteazaSauLegacy(s.cnp),
      adresa: adresaAnaf(s),
      telefon: s.telefon ?? "",
      email: s.email,
      doiAni: s.distributie2Ani,
      acord: s.consimtamant,
      dataCompletarii: dd(s.createdAt),
    })),
  };
});

// „Depus la ANAF” pentru toate formularele unui borderou (aceeași bifă ca la fiecare formular în parte).
export const marcheazaBorderouDepus = withOrgAdmin(async (ctx, beneficiarId: string | null, an: number, nr: number, depus: boolean): Promise<void> => {
  await ctx.db
    .update(F)
    .set({ procesatAnaf: depus })
    .where(and(eq(F.orgId, ctx.orgId), eq(F.borderouNr, nr), sql`${anFormular} = ${an}`, beneficiarId ? eq(F.beneficiarId, beneficiarId) : isNull(F.beneficiarId)));
});
