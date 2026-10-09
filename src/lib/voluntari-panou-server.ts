import "server-only";

import { and, asc, desc, eq, gte, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { cache } from "react";

import { db, type Tx } from "@/lib/db";
import {
  crmKv,
  fundraisingPages,
  organizations,
  volunteerCampaignSettings,
  volunteerFeatured,
  volunteerMissions,
  volunteerPanelLinks,
  volunteerShares,
  volunteerVisitors,
} from "@/lib/db/schema";
import { adaugaZile, alegeMisiune, COD_VOLUNTAR_REGEX, luniSaptamana, normalizeazaTelefon, ziuaRo, type CanalId } from "@/lib/voluntari-panou";

// Accesul public al voluntarilor (fără cont). Pașii:
//  1. codul din URL → organizație (singura citire sub app.public_lookup, doar pe volunteer_panel_links + organizations);
//  2. orice altceva rulează într-o tranzacție cu app.current_org_id setat de server, deci cu izolarea RLS obișnuită.

export type OrgPublica = { id: string; slug: string; nume: string; logoUrl: string | null; brandColor: string | null };

export const rezolvaCod = cache(async (cod: string): Promise<{ org: OrgPublica; mesajImplicit: string | null } | null> => {
  if (!COD_VOLUNTAR_REGEX.test(cod)) return null;
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.public_lookup', 'true', true)`);
    const [r] = await tx
      .select({
        orgId: volunteerPanelLinks.orgId,
        mesajImplicit: volunteerPanelLinks.mesajImplicit,
        slug: organizations.slug,
        nume: organizations.name,
        logoUrl: organizations.logoUrl,
        brandColor: organizations.brandColor,
      })
      .from(volunteerPanelLinks)
      .innerJoin(organizations, eq(organizations.id, volunteerPanelLinks.orgId))
      .where(and(eq(volunteerPanelLinks.cod, cod), eq(volunteerPanelLinks.activ, true)))
      .limit(1);
    if (!r) return null;
    return { org: { id: r.orgId, slug: r.slug, nume: r.nume, logoUrl: r.logoUrl, brandColor: r.brandColor }, mesajImplicit: r.mesajImplicit };
  });
});

export async function cuOrg<T>(orgId: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.current_org_id', ${orgId}, true)`);
    return fn(tx);
  });
}

// ===== Cookie-ul voluntarului =====
export const numeCookieVoluntar = (orgId: string) => `vp_${orgId.slice(0, 8)}`;
export const UN_AN_SECUNDE = 365 * 24 * 3600;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type Vizitator = { id: string; prenume: string; telefon: string | null; voluntarId: string | null };

export async function vizitatorDinCookie(tx: Tx, orgId: string): Promise<Vizitator | null> {
  const id = (await cookies()).get(numeCookieVoluntar(orgId))?.value;
  if (!id || !UUID_REGEX.test(id)) return null;
  const [v] = await tx
    .select({ id: volunteerVisitors.id, prenume: volunteerVisitors.prenume, telefon: volunteerVisitors.telefon, voluntarId: volunteerVisitors.voluntarId, ultima: volunteerVisitors.ultimaActivitateLa })
    .from(volunteerVisitors)
    .where(and(eq(volunteerVisitors.id, id), eq(volunteerVisitors.orgId, orgId)))
    .limit(1);
  if (!v) return null;
  // Actualizăm „ultima activitate” cel mult o dată la 10 minute (evită o scriere la fiecare deschidere de pagină).
  if (Date.now() - v.ultima.getTime() > 10 * 60 * 1000) {
    await tx.update(volunteerVisitors).set({ ultimaActivitateLa: new Date() }).where(and(eq(volunteerVisitors.id, v.id), eq(volunteerVisitors.orgId, orgId)));
  }
  return { id: v.id, prenume: v.prenume, telefon: v.telefon, voluntarId: v.voluntarId };
}

// ===== Campanii vizibile voluntarilor =====
export type CampaniePanou = {
  id: string;
  slug: string;
  titlu: string;
  poveste: string;
  imagineUrl: string | null;
  sumaTinta: number | null;
  sumaStransa: number;
  judet: string | null;
  mesaj: string | null; // mesajul propriu al echipei pentru această campanie
};

// Doar campaniile active, neascunse de echipă. O campanie legată de un beneficiar dezactivat (retras) nu apare deloc.
export async function campaniiVizibile(tx: Tx, orgId: string): Promise<CampaniePanou[]> {
  const r = await tx
    .select({
      id: fundraisingPages.id,
      slug: fundraisingPages.slug,
      titlu: fundraisingPages.titlu,
      poveste: fundraisingPages.poveste,
      imagineUrl: fundraisingPages.imagineUrl,
      sumaTinta: fundraisingPages.sumaTinta,
      sumaStransa: fundraisingPages.sumaStransa,
      judet: fundraisingPages.judet,
      mesaj: volunteerCampaignSettings.mesaj,
    })
    .from(fundraisingPages)
    .leftJoin(volunteerCampaignSettings, and(eq(volunteerCampaignSettings.campaignPageId, fundraisingPages.id), eq(volunteerCampaignSettings.orgId, orgId)))
    .where(
      and(
        eq(fundraisingPages.orgId, orgId),
        eq(fundraisingPages.status, "activa"),
        sql`coalesce(${volunteerCampaignSettings.ascunsa}, false) = false`,
        sql`not exists (select 1 from fundraising_beneficiaries b where b.campaign_page_id = ${fundraisingPages.id} and b.status = 'dezactivat')`,
      ),
    )
    .orderBy(desc(fundraisingPages.createdAt));
  return r;
}

export const progresCampanie = (c: Pick<CampaniePanou, "sumaTinta" | "sumaStransa">): number | null =>
  c.sumaTinta && c.sumaTinta > 0 ? Math.min(1, c.sumaStransa / c.sumaTinta) : null;

export async function campaniaSaptamanii(tx: Tx, orgId: string, azi: string = ziuaRo()): Promise<string | null> {
  const [r] = await tx
    .select({ id: volunteerFeatured.campaignPageId })
    .from(volunteerFeatured)
    .where(and(eq(volunteerFeatured.orgId, orgId), eq(volunteerFeatured.saptamana, luniSaptamana(azi))))
    .limit(1);
  return r?.id ?? null;
}

// ===== Misiunea zilei =====
export type ActiuneMisiune = { campaignId: string; canal: CanalId; ordine: number; facuta: boolean };

// Alocarea se face sub blocarea rândului voluntarului: două cereri simultane (două taburi) nu pot crea două misiuni diferite.
export async function asiguraMisiunea(tx: Tx, orgId: string, v: Vizitator, campanii: CampaniePanou[], vedeta: string | null): Promise<ActiuneMisiune[]> {
  const ziua = ziuaRo();
  await tx.execute(sql`select 1 from volunteer_visitors where id = ${v.id} and org_id = ${orgId} for update`);
  let randuri = await tx
    .select({ campaignId: volunteerMissions.campaignPageId, canal: volunteerMissions.canal, ordine: volunteerMissions.ordine })
    .from(volunteerMissions)
    .where(and(eq(volunteerMissions.visitorId, v.id), eq(volunteerMissions.ziua, ziua), eq(volunteerMissions.orgId, orgId)))
    .orderBy(asc(volunteerMissions.ordine));
  if (randuri.length === 0 && campanii.length > 0) {
    const alese = alegeMisiune({
      campanii: campanii.map((c) => ({ id: c.id, progres: progresCampanie(c) })),
      campaniaSaptamanii: vedeta,
      seed: `${v.id}|${ziua}`,
    });
    if (alese.length > 0) {
      await tx
        .insert(volunteerMissions)
        .values(alese.map((a, i) => ({ orgId, visitorId: v.id, ziua, ordine: i, campaignPageId: a.campaignId, canal: a.canal })))
        .onConflictDoNothing();
      randuri = alese.map((a, i) => ({ campaignId: a.campaignId, canal: a.canal, ordine: i }));
    }
  }
  const facute = await tx
    .select({ campaignId: volunteerShares.campaignPageId, canal: volunteerShares.canal })
    .from(volunteerShares)
    .where(and(eq(volunteerShares.visitorId, v.id), eq(volunteerShares.ziua, ziua), eq(volunteerShares.orgId, orgId)));
  const set = new Set(facute.map((f) => `${f.campaignId}|${f.canal}`));
  return randuri.map((r) => ({ campaignId: r.campaignId, canal: r.canal as CanalId, ordine: r.ordine, facuta: set.has(`${r.campaignId}|${r.canal}`) }));
}

// ===== Cifre și clasament =====
export async function cifreVoluntar(tx: Tx, orgId: string, visitorId: string): Promise<{ total: number; azi: number }> {
  const [r] = await tx
    .select({
      total: sql<number>`count(*)::int`,
      azi: sql<number>`count(*) filter (where ${volunteerShares.ziua} = ${ziuaRo()})::int`,
    })
    .from(volunteerShares)
    .where(and(eq(volunteerShares.visitorId, visitorId), eq(volunteerShares.orgId, orgId)));
  return { total: r?.total ?? 0, azi: r?.azi ?? 0 };
}

export async function totalOrganizatie(tx: Tx, orgId: string): Promise<number> {
  const [r] = await tx.select({ n: sql<number>`count(*)::int` }).from(volunteerShares).where(eq(volunteerShares.orgId, orgId));
  return r?.n ?? 0;
}

// Topul ultimelor 7 zile (doar prenumele; cel mult 5).
export async function topSaptamana(tx: Tx, orgId: string): Promise<{ id: string; prenume: string; nr: number }[]> {
  return tx
    .select({ id: volunteerVisitors.id, prenume: volunteerVisitors.prenume, nr: sql<number>`count(*)::int` })
    .from(volunteerShares)
    .innerJoin(volunteerVisitors, eq(volunteerVisitors.id, volunteerShares.visitorId))
    .where(and(eq(volunteerShares.orgId, orgId), gte(volunteerShares.ziua, adaugaZile(ziuaRo(), -6))))
    .groupBy(volunteerVisitors.id, volunteerVisitors.prenume)
    .orderBy(desc(sql`count(*)`), asc(volunteerVisitors.prenume))
    .limit(5);
}

// ===== Legarea de fișa din CRM Voluntari (după telefon) =====
type VoluntarRoster = { id?: unknown; telefon?: unknown; activ?: unknown };

// Fișa se leagă doar dacă telefonul se potrivește cu UN SINGUR voluntar activ (pe ultimele 9 cifre).
export async function gasesteVoluntarDupaTelefon(tx: Tx, orgId: string, telefon: string): Promise<string | null> {
  const [r] = await tx
    .select({ data: crmKv.data })
    .from(crmKv)
    .where(and(eq(crmKv.orgId, orgId), eq(crmKv.path, "voluntari-roster")))
    .limit(1);
  const lista = ((r?.data as { volunteers?: VoluntarRoster[] } | undefined)?.volunteers ?? []).filter((v) => v && v.activ !== false);
  const potriviti = lista.filter((v) => normalizeazaTelefon(typeof v.telefon === "string" ? v.telefon : null) === telefon && typeof v.id === "string" && !String(v.id).startsWith("demo-"));
  return potriviti.length === 1 ? String(potriviti[0].id) : null;
}

export const URL_BAZA = () => process.env.NEXT_PUBLIC_SITE_URL || "https://alexandrit.ro";
export const linkCampanie = (orgSlug: string, pageSlug: string, canal?: string) =>
  `${URL_BAZA()}/strangere-fonduri/${orgSlug}/${pageSlug}?utm_source=voluntari${canal ? `&utm_medium=${canal}` : ""}`;
