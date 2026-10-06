"use server";

import { and, eq, like, sql } from "drizzle-orm";

import { type OrgContext, withOrgAdmin } from "@/lib/auth/guard";
import { crmKv, fundraisingPages } from "@/lib/db/schema";
import { EroareUtilizator } from "@/lib/erori";
import { segmentFirma } from "@/lib/id-scurt";
import { sqlJudetNormalizat, zonaJudet } from "@/lib/judet-zona";
import { sqlArray } from "@/lib/sql-array";

// Panoul „Top 100 companii din județul cazului” — starea per caz (status dintr-un clic, firme scoase cu motiv)
// stă în crm_kv, cheia „caz_top:<id pagină>”, ca să nu fie nevoie de o migrare.

export type StatusTop = "abordat" | "interesat" | "sponsor" | "refuz";
const STATUSURI: StatusTop[] = ["abordat", "interesat", "sponsor", "refuz"];
type StareTop = { statusuri: Record<string, StatusTop>; scoase: Record<string, string> };

const cheie = (pageId: string) => `caz_top:${pageId}`;

async function citesteStare(ctx: OrgContext, pageId: string): Promise<StareTop> {
  const [r] = await ctx.db.select({ data: crmKv.data }).from(crmKv).where(and(eq(crmKv.orgId, ctx.orgId), eq(crmKv.path, cheie(pageId)))).limit(1);
  const d = (r?.data ?? {}) as Partial<StareTop>;
  return { statusuri: d.statusuri ?? {}, scoase: d.scoase ?? {} };
}

async function scrieStare(ctx: OrgContext, pageId: string, stare: StareTop) {
  await ctx.db
    .insert(crmKv)
    .values({ orgId: ctx.orgId, path: cheie(pageId), data: stare, updatedAt: new Date() })
    .onConflictDoUpdate({ target: [crmKv.orgId, crmKv.path], set: { data: stare, updatedAt: new Date() } });
}

async function verificaPagina(ctx: OrgContext, pageId: string) {
  const [p] = await ctx.db.select({ judet: fundraisingPages.judet }).from(fundraisingPages).where(and(eq(fundraisingPages.id, pageId), eq(fundraisingPages.orgId, ctx.orgId))).limit(1);
  if (!p) throw new EroareUtilizator("Campania nu a fost găsită.");
  return p;
}

export type FirmaTop = {
  id: string;
  segment: string;
  nume: string;
  ca: number | null;
  nrContacte: number;
  linkedin: string | null;
  facebook: string | null;
  negasit: boolean;
  status: StatusTop | null;
  altCaz: string | null;
  pozitie: number;
};
export type TopCompaniiCaz = {
  judet: string | null;
  firme: FirmaTop[];
  scoase: { id: string; nume: string; motiv: string }[];
};

type RandSql = { id: string; nume: string; ca: string | number | null; linkedin: string | null; facebook: string | null; negasit: boolean; nr_contacte: number };

// Firmă „nouă” = nu a sponsorizat niciodată (câștigată, sumă sponsorizată, recurentă, cu contract sau cu rânduri de sponsorizare).
// coalesce(..., false) la boolean-ul „recurent”: fără el, NOT NULL ar elimina din greșeală rândurile cu valoare lipsă.
const NU_A_SPONSORIZAT = sql`(coalesce(c.status::text, 'open') <> 'won' and coalesce(c.suma_sponsorizata, 0) = 0 and not coalesce(c.recurent, false)
  and c.numar_contract is null and c.contract_status is null
  and not exists (select 1 from company_sponsorizari s where s.company_id = c.id))`;

export const getTopCompaniiCaz = withOrgAdmin(async (ctx, pageId: string): Promise<TopCompaniiCaz> => {
  const pagina = await verificaPagina(ctx, pageId);
  const zona = zonaJudet(pagina.judet);
  if (zona.length === 0) return { judet: pagina.judet, firme: [], scoase: [] };

  const stare = await citesteStare(ctx, pageId);
  const marcateIds = Object.keys(stare.statusuri);
  const scoaseIds = Object.keys(stare.scoase);

  const rows = (await ctx.db.execute(sql`
    select c.id, c.nume, c.ca, c.linkedin, c.facebook, jsonb_exists(coalesce(c.extra, '{}'::jsonb), 'negasit') as negasit,
           (select count(*)::int from contacts k where k.company_id = c.id) as nr_contacte
    from companies c
    where c.org_id = ${ctx.orgId} and c.deleted_at is null
      and ${sqlJudetNormalizat(sql`c.judet`)} = any(${sqlArray(zona)})
      and (${NU_A_SPONSORIZAT} or c.id::text = any(${sqlArray(marcateIds)}))
      and not (c.id::text = any(${sqlArray(scoaseIds)}))
    order by c.ca desc nulls last, c.nume
  `)) as unknown as RandSql[];

  // Firmele deja bifate la acest caz rămân mereu în panou; restul completează până la 100, după cifra de afaceri.
  const marcate = rows.filter((r) => stare.statusuri[r.id]);
  const nemarcate = rows.filter((r) => !stare.statusuri[r.id]).slice(0, Math.max(0, 100 - marcate.length));
  const alese = [...marcate, ...nemarcate].sort((a, b) => Number(b.ca ?? -1) - Number(a.ca ?? -1) || a.nume.localeCompare(b.nume, "ro"));

  // Avertizare: firma e deja lucrată la ALT caz.
  const [altele, titluri] = await Promise.all([
    ctx.db
      .select({ path: crmKv.path, data: crmKv.data })
      .from(crmKv)
      .where(and(eq(crmKv.orgId, ctx.orgId), like(crmKv.path, "caz_top:%"))),
    ctx.db.select({ id: fundraisingPages.id, titlu: fundraisingPages.titlu }).from(fundraisingPages).where(eq(fundraisingPages.orgId, ctx.orgId)),
  ]);
  const titluDupaId = new Map(titluri.map((t) => [t.id, t.titlu]));
  const altCaz = new Map<string, string>();
  for (const o of altele) {
    const id = o.path.slice("caz_top:".length);
    if (id === pageId) continue;
    const st = ((o.data ?? {}) as Partial<StareTop>).statusuri ?? {};
    for (const companyId of Object.keys(st)) if (!altCaz.has(companyId)) altCaz.set(companyId, titluDupaId.get(id) ?? "alt caz");
  }

  const firme: FirmaTop[] = alese.map((r, i) => ({
    id: r.id,
    segment: segmentFirma(r.nume, r.id),
    nume: r.nume,
    ca: r.ca == null ? null : Number(r.ca),
    nrContacte: r.nr_contacte,
    linkedin: r.linkedin,
    facebook: r.facebook,
    negasit: r.negasit,
    status: stare.statusuri[r.id] ?? null,
    altCaz: altCaz.get(r.id) ?? null,
    pozitie: i + 1,
  }));

  let scoase: TopCompaniiCaz["scoase"] = [];
  if (scoaseIds.length) {
    const nume = (await ctx.db.execute(sql`select id, nume from companies where org_id = ${ctx.orgId} and id::text = any(${sqlArray(scoaseIds)})`)) as unknown as { id: string; nume: string }[];
    scoase = nume.map((n) => ({ id: n.id, nume: n.nume, motiv: stare.scoase[n.id] ?? "" }));
  }
  return { judet: pagina.judet, firme, scoase };
});

export const seteazaStatusTop = withOrgAdmin(async (ctx, pageId: string, companyId: string, status: StatusTop | null): Promise<{ error: string | null }> => {
  await verificaPagina(ctx, pageId);
  if (status !== null && !STATUSURI.includes(status)) return { error: "Status necunoscut." };
  const stare = await citesteStare(ctx, pageId);
  if (status === null) delete stare.statusuri[companyId];
  else stare.statusuri[companyId] = status;
  await scrieStare(ctx, pageId, stare);
  return { error: null };
});

export const scoateDinTop = withOrgAdmin(async (ctx, pageId: string, companyId: string, motiv: string): Promise<{ error: string | null }> => {
  await verificaPagina(ctx, pageId);
  const stare = await citesteStare(ctx, pageId);
  stare.scoase[companyId] = motiv.trim().slice(0, 200) || "fără motiv";
  delete stare.statusuri[companyId];
  await scrieStare(ctx, pageId, stare);
  return { error: null };
});

export const punePeLocInTop = withOrgAdmin(async (ctx, pageId: string, companyId: string): Promise<{ error: string | null }> => {
  await verificaPagina(ctx, pageId);
  const stare = await citesteStare(ctx, pageId);
  delete stare.scoase[companyId];
  await scrieStare(ctx, pageId, stare);
  return { error: null };
});

// „Sponsori din zonă”: firmele din județ (București + Ilfov = o zonă) care au sponsorizat deja.
// Sumele nealocate (suma disponibilă) le vede doar adminul; editorii primesc doar „bani deja alocați”.
export type SponsorZona = { id: string; segment: string; nume: string; sumaAlocata: number; sumaNealocata: number | null };
export const getSponsoriZona = withOrgAdmin(async (ctx, pageId: string): Promise<{ judet: string | null; sponsori: SponsorZona[] }> => {
  const pagina = await verificaPagina(ctx, pageId);
  const zona = zonaJudet(pagina.judet);
  if (zona.length === 0) return { judet: pagina.judet, sponsori: [] };
  const arataNealocat = ctx.role === "owner" || ctx.role === "admin";
  const rows = (await ctx.db.execute(sql`
    select c.id, c.nume, coalesce(c.suma_sponsorizata, 0)::int as alocat, c.suma_disponibila as nealocat
    from companies c
    where c.org_id = ${ctx.orgId} and c.deleted_at is null
      and ${sqlJudetNormalizat(sql`c.judet`)} = any(${sqlArray(zona)})
      and (coalesce(c.suma_sponsorizata, 0) > 0 or c.status::text = 'won' or exists (select 1 from company_sponsorizari s where s.company_id = c.id))
    order by c.suma_sponsorizata desc nulls last, c.nume
    limit 100
  `)) as unknown as { id: string; nume: string; alocat: number; nealocat: number | null }[];
  return {
    judet: pagina.judet,
    sponsori: rows.map((r) => ({ id: r.id, segment: segmentFirma(r.nume, r.id), nume: r.nume, sumaAlocata: r.alocat, sumaNealocata: arataNealocat ? r.nealocat : null })),
  };
});
