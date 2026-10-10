"use server";

import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";

import { withOrgAdmin, type OrgContext } from "@/lib/auth/guard";
import { orgHasToolAccess } from "@/lib/billing/packages";
import { appUsers, companies, companySponsorizari, crmKv, fundraisingPages } from "@/lib/db/schema";
import { EroareUtilizator } from "@/lib/erori";
import { curataDateImpact, dateImpactGoale, type DateImpact, type ProiectImpact, PROIECT_GOL } from "@/lib/raport-impact";

// Raportul de impact se lucrează pe fișa unei firme: lista firmelor cu sponsorizări, datele propuse din sponsorizările înregistrate
// și ultima versiune salvată (crm_kv, o intrare pe firmă).
const CALE = (companyId: string) => `raport-impact/${companyId}`;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HEX = /^#[0-9a-f]{6}$/i;

// Gardul de pachet e și aici, nu doar în layout: acțiunile server pot fi apelate direct.
function verificaAcces(ctx: Pick<OrgContext, "orgPackage" | "orgCustomPlanConfig">) {
  if (!orgHasToolAccess(ctx.orgPackage, ctx.orgCustomPlanConfig, "raport-companii")) throw new EroareUtilizator("Instrumentul nu e inclus în planul organizației.");
}

export type CompanieImpactRand = { companyId: string; nume: string; total: number; nr: number };

export const listeazaCompaniiImpactAction = withOrgAdmin(async (ctx): Promise<CompanieImpactRand[]> => {
  verificaAcces(ctx);
  const r = await ctx.db
    .select({ companyId: companySponsorizari.companyId, nume: companies.nume, total: sql<number>`sum(${companySponsorizari.suma})::int`, nr: sql<number>`count(*)::int` })
    .from(companySponsorizari)
    .innerJoin(companies, eq(companies.id, companySponsorizari.companyId))
    .where(and(eq(companySponsorizari.orgId, ctx.orgId), isNull(companies.deletedAt)))
    .groupBy(companySponsorizari.companyId, companies.nume)
    .orderBy(companies.nume);
  return r;
});

export type IncarcareImpact = {
  organizatie: string;
  date: DateImpact;
  salvat: boolean; // datele vin dintr-o versiune salvată, nu din propunerea automată
  logoOngImplicit: string; // logoul organizației din Setări (https), pentru „folosește logoul din Setări”
};

async function numeAutor(ctx: Pick<OrgContext, "db" | "userId">): Promise<string> {
  const [u] = await ctx.db.select({ name: appUsers.name }).from(appUsers).where(eq(appUsers.id, ctx.userId)).limit(1);
  return (u?.name ?? "").trim().split(/\s+/)[0] ?? "";
}

// Dacă firma nu are o versiune salvată, propunem proiectele din sponsorizările ei: fiecare alocare e un proiect (cu linkul campaniei,
// dacă e o pagină din platformă), iar ce nu e alocat rămâne un rând cu numele proiectului sponsorizării.
export const incarcaImpactAction = withOrgAdmin(async (ctx, companyId: string | null, ignoraSalvat = false): Promise<IncarcareImpact> => {
  verificaAcces(ctx);
  const baza = (ctx.orgBrandColor && HEX.test(ctx.orgBrandColor) ? { accent: ctx.orgBrandColor } : {}) as Partial<DateImpact>;
  const gol: DateImpact = { ...dateImpactGoale(), ...baza, autor: await numeAutor(ctx), logoOng: ctx.orgLogoUrl && /^https:\/\//i.test(ctx.orgLogoUrl) ? ctx.orgLogoUrl : "" };
  const raspuns = (date: DateImpact, salvat: boolean): IncarcareImpact => ({ organizatie: ctx.orgName, date, salvat, logoOngImplicit: gol.logoOng });
  if (!companyId || !UUID.test(companyId)) return raspuns(gol, false);

  const [firma] = await ctx.db.select({ nume: companies.nume }).from(companies).where(and(eq(companies.id, companyId), eq(companies.orgId, ctx.orgId), isNull(companies.deletedAt))).limit(1);
  if (!firma) throw new EroareUtilizator("Firma nu a fost găsită.");

  const [kv] = await ctx.db.select({ data: crmKv.data }).from(crmKv).where(and(eq(crmKv.orgId, ctx.orgId), eq(crmKv.path, CALE(companyId)))).limit(1);
  if (kv?.data && !ignoraSalvat) {
    const salvat = curataDateImpact(kv.data);
    // Autorul și logoul rămân cele ale utilizatorului și organizației de acum, dacă versiunea salvată nu le avea.
    return raspuns({ ...salvat, firma: salvat.firma || firma.nume, autor: salvat.autor || gol.autor, logoOng: salvat.logoOng || gol.logoOng }, true);
  }

  const spons = await ctx.db
    .select({ suma: companySponsorizari.suma, data: companySponsorizari.data, proiect: companySponsorizari.proiect, alocari: companySponsorizari.alocari })
    .from(companySponsorizari)
    .where(and(eq(companySponsorizari.orgId, ctx.orgId), eq(companySponsorizari.companyId, companyId)))
    .orderBy(desc(companySponsorizari.data));
  const idPagini = [...new Set(spons.flatMap((s) => (s.alocari ?? []).map((a) => a.pageId).filter((x): x is string => !!x)))];
  const pagini = idPagini.length ? await ctx.db.select({ id: fundraisingPages.id, slug: fundraisingPages.slug }).from(fundraisingPages).where(and(eq(fundraisingPages.orgId, ctx.orgId), inArray(fundraisingPages.id, idPagini))) : [];
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://alexandrit.ro").replace(/\/$/, "");
  const linkPagina = (id: string | null) => {
    const p = pagini.find((x) => x.id === id);
    return p ? `${siteUrl}/strangere-fonduri/${ctx.orgSlug}/${p.slug}` : "";
  };
  const proiecte: ProiectImpact[] = [];
  for (const s of spons) {
    const alocate = (s.alocari ?? []).reduce((t, a) => t + a.suma, 0);
    for (const a of s.alocari ?? []) proiecte.push({ ...PROIECT_GOL, nume: a.nume, suma: a.suma, data: s.data, link: linkPagina(a.pageId) });
    if (s.suma - alocate > 0) proiecte.push({ ...PROIECT_GOL, nume: s.proiect?.trim() || "Sprijin general (nealocat unui proiect)", suma: s.suma - alocate, data: s.data });
  }
  return raspuns(curataDateImpact({ ...gol, firma: firma.nume, proiecte }), false);
});

export const salveazaImpactAction = withOrgAdmin(async (ctx, companyId: string, brut: unknown): Promise<{ ok: true } | { ok: false; eroare: string }> => {
  verificaAcces(ctx);
  if (!UUID.test(companyId)) return { ok: false, eroare: "Alege o firmă din listă ca să poți salva." };
  const [firma] = await ctx.db.select({ id: companies.id }).from(companies).where(and(eq(companies.id, companyId), eq(companies.orgId, ctx.orgId), isNull(companies.deletedAt))).limit(1);
  if (!firma) return { ok: false, eroare: "Firma nu a fost găsită." };
  const date = curataDateImpact(brut);
  await ctx.db
    .insert(crmKv)
    .values({ orgId: ctx.orgId, path: CALE(companyId), data: date, updatedAt: new Date() })
    .onConflictDoUpdate({ target: [crmKv.orgId, crmKv.path], set: { data: date, updatedAt: new Date() } });
  return { ok: true };
});
