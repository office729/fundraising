"use server";

import { and, asc, desc, eq } from "drizzle-orm";

import { withOrgAdmin, withOrgSession } from "@/lib/auth/guard";
import { kpiAuditLog, kpiCategorii, kpiDefinitii, kpiSabloane, kpiSabloaneItemi, roluri } from "@/lib/db/schema";
import { EroareUtilizator } from "@/lib/erori";

// KPI Library (Faza B) — orice membru CITEȘTE (ca să vadă ce KPI există),
// doar owner/admin pot crea/edita/șterge. Fără nimic hardcodat: cele 14
// categorii „sugerate" sunt DATE inserate o dată (seed), nu constante în cod
// — organizația le poate redenumi/șterge/adăuga altele liber după aceea.

const CATEGORII_DEFAULT = [
  "ACTIVITATE",
  "REZULTATE",
  "CALITATE",
  "FOLLOW-UP",
  "IMPACT",
  "FUNDRAISING",
  "DONATORI",
  "VOLUNTARI",
  "PROIECTE",
  "COMUNICARE",
  "FINANCIAR",
  "ADMINISTRATIV",
  "BENEFICIARI",
  "PARTENERIATE",
];

// --- Categorii ---------------------------------------------------------

export type CategorieRand = { id: string; nume: string; culoare: string | null; ordine: number; esteDefault: boolean };

export const listeazaCategoriiAction = withOrgSession(async (ctx): Promise<CategorieRand[]> => {
  return ctx.db
    .select({ id: kpiCategorii.id, nume: kpiCategorii.nume, culoare: kpiCategorii.culoare, ordine: kpiCategorii.ordine, esteDefault: kpiCategorii.esteDefault })
    .from(kpiCategorii)
    .where(eq(kpiCategorii.orgId, ctx.orgId))
    .orderBy(asc(kpiCategorii.ordine), asc(kpiCategorii.nume));
});

// Rulat o singură dată, la prima vizită a bibliotecii KPI (dacă org-ul nu are
// încă nicio categorie) — inserează cele 14 sugerate ca punct de pornire,
// editabile/ștergeabile liber după. Niciodată suprascrie categorii existente.
export const seedeazaCategoriiDefaultAction = withOrgAdmin(async (ctx): Promise<CategorieRand[]> => {
  const existente = await ctx.db.select({ id: kpiCategorii.id }).from(kpiCategorii).where(eq(kpiCategorii.orgId, ctx.orgId)).limit(1);
  if (existente.length === 0) {
    await ctx.db.insert(kpiCategorii).values(CATEGORII_DEFAULT.map((nume, i) => ({ orgId: ctx.orgId, nume, ordine: i, esteDefault: true })));
  }
  return ctx.db
    .select({ id: kpiCategorii.id, nume: kpiCategorii.nume, culoare: kpiCategorii.culoare, ordine: kpiCategorii.ordine, esteDefault: kpiCategorii.esteDefault })
    .from(kpiCategorii)
    .where(eq(kpiCategorii.orgId, ctx.orgId))
    .orderBy(asc(kpiCategorii.ordine), asc(kpiCategorii.nume));
});

export const creeazaCategorieAction = withOrgAdmin(async (ctx, nume: string, culoare: string | null) => {
  if (!nume.trim()) throw new EroareUtilizator("Numele categoriei e obligatoriu.");
  const [{ maxOrdine }] = await ctx.db
    .select({ maxOrdine: kpiCategorii.ordine })
    .from(kpiCategorii)
    .where(eq(kpiCategorii.orgId, ctx.orgId))
    .orderBy(desc(kpiCategorii.ordine))
    .limit(1)
    .then((r) => (r.length ? r : [{ maxOrdine: -1 }]));
  await ctx.db.insert(kpiCategorii).values({ orgId: ctx.orgId, nume: nume.trim(), culoare, ordine: maxOrdine + 1, esteDefault: false });
});

export const actualizeazaCategorieAction = withOrgAdmin(async (ctx, id: string, nume: string, culoare: string | null) => {
  if (!nume.trim()) throw new EroareUtilizator("Numele categoriei e obligatoriu.");
  await ctx.db.update(kpiCategorii).set({ nume: nume.trim(), culoare }).where(and(eq(kpiCategorii.id, id), eq(kpiCategorii.orgId, ctx.orgId)));
});

export const stergeCategorieAction = withOrgAdmin(async (ctx, id: string) => {
  await ctx.db.update(kpiDefinitii).set({ categorieId: null }).where(and(eq(kpiDefinitii.categorieId, id), eq(kpiDefinitii.orgId, ctx.orgId)));
  await ctx.db.delete(kpiCategorii).where(and(eq(kpiCategorii.id, id), eq(kpiCategorii.orgId, ctx.orgId)));
});

// --- Definiții KPI (KPI Library) --------------------------------------------

export type SursaDate = {
  tip: "crm" | "task" | "proiect" | "donatori" | "companii" | "voluntari" | "beneficiari" | "formular" | "financiar" | "eveniment" | "manual" | "api_extern";
  metric?: string;
  filtru?: string;
  agregare?: string;
};

export type DefinitieRand = {
  id: string;
  categorieId: string | null;
  nume: string;
  descriere: string | null;
  tip: "numeric" | "percentage" | "currency" | "boolean" | "rating" | "duration" | "ratio" | "milestone" | "custom";
  unitate: string | null;
  directie: "mai_mare_mai_bine" | "mai_mic_mai_bine" | "egal_cu_target" | "interval_optim";
  frecventa: "zilnic" | "saptamanal" | "lunar" | "trimestrial" | "anual" | "custom";
  sursaDate: SursaDate | null;
  esteManual: boolean;
  esteActiv: boolean;
};

export const listeazaDefinitiiAction = withOrgSession(async (ctx): Promise<DefinitieRand[]> => {
  const rows = await ctx.db
    .select({
      id: kpiDefinitii.id,
      categorieId: kpiDefinitii.categorieId,
      nume: kpiDefinitii.nume,
      descriere: kpiDefinitii.descriere,
      tip: kpiDefinitii.tip,
      unitate: kpiDefinitii.unitate,
      directie: kpiDefinitii.directie,
      frecventa: kpiDefinitii.frecventa,
      sursaDate: kpiDefinitii.sursaDate,
      esteManual: kpiDefinitii.esteManual,
      esteActiv: kpiDefinitii.esteActiv,
    })
    .from(kpiDefinitii)
    .where(eq(kpiDefinitii.orgId, ctx.orgId))
    .orderBy(asc(kpiDefinitii.nume));
  return rows.map((r) => ({ ...r, sursaDate: (r.sursaDate as SursaDate | null) ?? null }));
});

export type DefinitieInput = {
  nume: string;
  descriere: string | null;
  categorieId: string | null;
  tip: DefinitieRand["tip"];
  unitate: string | null;
  directie: DefinitieRand["directie"];
  frecventa: DefinitieRand["frecventa"];
  sursaDate: SursaDate | null;
  esteManual: boolean;
};

export const creeazaDefinitieAction = withOrgAdmin(async (ctx, input: DefinitieInput) => {
  if (!input.nume.trim()) throw new EroareUtilizator("Numele KPI-ului e obligatoriu.");
  const [rand] = await ctx.db
    .insert(kpiDefinitii)
    .values({ orgId: ctx.orgId, ...input, nume: input.nume.trim(), createdBy: ctx.userId })
    .returning({ id: kpiDefinitii.id });
  await ctx.db.insert(kpiAuditLog).values({ orgId: ctx.orgId, actorUserId: ctx.userId, actiune: "creeaza", entitate: "kpi_definitie", entitateId: rand.id, detalii: { nume: input.nume } });
  return rand.id;
});

export const actualizeazaDefinitieAction = withOrgAdmin(async (ctx, id: string, input: DefinitieInput) => {
  if (!input.nume.trim()) throw new EroareUtilizator("Numele KPI-ului e obligatoriu.");
  const [existent] = await ctx.db.select({ nume: kpiDefinitii.nume }).from(kpiDefinitii).where(and(eq(kpiDefinitii.id, id), eq(kpiDefinitii.orgId, ctx.orgId))).limit(1);
  if (!existent) throw new EroareUtilizator("KPI-ul nu a fost găsit.");
  await ctx.db.update(kpiDefinitii).set({ ...input, nume: input.nume.trim() }).where(and(eq(kpiDefinitii.id, id), eq(kpiDefinitii.orgId, ctx.orgId)));
  await ctx.db.insert(kpiAuditLog).values({
    orgId: ctx.orgId,
    actorUserId: ctx.userId,
    actiune: "editeaza",
    entitate: "kpi_definitie",
    entitateId: id,
    detalii: { numeVechi: existent.nume, numeNou: input.nume },
  });
});

export const duplicaDefinitieAction = withOrgAdmin(async (ctx, id: string) => {
  const [sursa] = await ctx.db.select().from(kpiDefinitii).where(and(eq(kpiDefinitii.id, id), eq(kpiDefinitii.orgId, ctx.orgId))).limit(1);
  if (!sursa) throw new EroareUtilizator("KPI-ul nu a fost găsit.");
  await ctx.db.insert(kpiDefinitii).values({
    orgId: ctx.orgId,
    categorieId: sursa.categorieId,
    nume: `${sursa.nume} (copie)`,
    descriere: sursa.descriere,
    tip: sursa.tip,
    unitate: sursa.unitate,
    directie: sursa.directie,
    frecventa: sursa.frecventa,
    sursaDate: sursa.sursaDate,
    esteManual: sursa.esteManual,
    esteActiv: false,
    createdBy: ctx.userId,
  });
});

export const comutaActivDefinitieAction = withOrgAdmin(async (ctx, id: string, activ: boolean) => {
  await ctx.db.update(kpiDefinitii).set({ esteActiv: activ }).where(and(eq(kpiDefinitii.id, id), eq(kpiDefinitii.orgId, ctx.orgId)));
});

export const stergeDefinitieAction = withOrgAdmin(async (ctx, id: string) => {
  await ctx.db.delete(kpiDefinitii).where(and(eq(kpiDefinitii.id, id), eq(kpiDefinitii.orgId, ctx.orgId)));
});

// --- Șabloane KPI per rol ----------------------------------------------

export type SablonItemRand = { kpiDefinitieId: string; pondere: number | null; targetDefault: unknown };
export type SablonRand = { id: string; nume: string; descriere: string | null; roleId: string | null; roleNume: string | null; itemi: SablonItemRand[] };

export const listeazaSabloaneAction = withOrgSession(async (ctx): Promise<SablonRand[]> => {
  const sabloane = await ctx.db
    .select({ id: kpiSabloane.id, nume: kpiSabloane.nume, descriere: kpiSabloane.descriere, roleId: kpiSabloane.roleId, roleNume: roluri.nume })
    .from(kpiSabloane)
    .leftJoin(roluri, eq(roluri.id, kpiSabloane.roleId))
    .where(eq(kpiSabloane.orgId, ctx.orgId))
    .orderBy(asc(kpiSabloane.nume));

  const itemi = await ctx.db
    .select({ sablonId: kpiSabloaneItemi.sablonId, kpiDefinitieId: kpiSabloaneItemi.kpiDefinitieId, pondere: kpiSabloaneItemi.pondere, targetDefault: kpiSabloaneItemi.targetDefault })
    .from(kpiSabloaneItemi)
    .innerJoin(kpiSabloane, eq(kpiSabloane.id, kpiSabloaneItemi.sablonId))
    .where(eq(kpiSabloane.orgId, ctx.orgId));

  return sabloane.map((s) => ({ ...s, itemi: itemi.filter((i) => i.sablonId === s.id).map(({ kpiDefinitieId, pondere, targetDefault }) => ({ kpiDefinitieId, pondere, targetDefault })) }));
});

export const creeazaSablonAction = withOrgAdmin(
  async (ctx, nume: string, descriere: string | null, roleId: string | null, itemi: { kpiDefinitieId: string; pondere: number | null }[]) => {
    if (!nume.trim()) throw new EroareUtilizator("Numele șablonului e obligatoriu.");
    const [sablon] = await ctx.db.insert(kpiSabloane).values({ orgId: ctx.orgId, nume: nume.trim(), descriere, roleId }).returning({ id: kpiSabloane.id });
    if (itemi.length > 0) {
      await ctx.db.insert(kpiSabloaneItemi).values(itemi.map((i) => ({ sablonId: sablon.id, kpiDefinitieId: i.kpiDefinitieId, pondere: i.pondere })));
    }
  },
);

export const stergeSablonAction = withOrgAdmin(async (ctx, id: string) => {
  await ctx.db.delete(kpiSabloaneItemi).where(eq(kpiSabloaneItemi.sablonId, id));
  await ctx.db.delete(kpiSabloane).where(and(eq(kpiSabloane.id, id), eq(kpiSabloane.orgId, ctx.orgId)));
});
