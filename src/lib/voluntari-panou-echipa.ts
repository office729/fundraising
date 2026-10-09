import "server-only";

import { and, eq, gte, sql } from "drizzle-orm";

import type { OrgContext } from "@/lib/auth/guard";
import { crmKv, fundraisingPages, volunteerCampaignSettings, volunteerFeatured, volunteerPanelLinks, volunteerShares, volunteerVisitors } from "@/lib/db/schema";
import { adaugaZile, luniSaptamana, saptamaniDisponibile, ziuaRo } from "@/lib/voluntari-panou";
import { URL_BAZA } from "@/lib/voluntari-panou-server";

// Citirea datelor paginii echipei (linkul, campaniile, programul săptămânilor, voluntarii). Separat de acțiunile de server,
// ca să nu fie expusă ca acțiune apelabilă din browser (primește orgId) și ca să poată fi testată.

export type CampaniePentruEchipa = {
  id: string;
  slug: string;
  titlu: string;
  status: "activa" | "inchisa";
  ascunsa: boolean;
  mesaj: string;
  distribuiri: number;
  distribuiri7: number;
  pecanale: Record<string, number>;
};

export type VoluntarPanou = {
  id: string;
  prenume: string;
  telefon: string | null;
  legatDe: string | null; // numele din fișa CRM, dacă s-a legat
  voluntarId: string | null;
  distribuiri: number;
  distribuiri7: number;
  intratLa: string;
  ultimaActivitateLa: string;
};

export type DatePanou = {
  link: { cod: string; url: string; activ: boolean; mesajImplicit: string; schimbatLa: string | null } | null;
  campanii: CampaniePentruEchipa[];
  saptamani: { luni: string; eticheta: string; campaignId: string | null }[];
  voluntari: VoluntarPanou[];
  cifre: { voluntari: number; activi7: number; distribuiri: number; distribuiri7: number };
};

export async function citesteDatePanou(ctx: { db: OrgContext["db"]; orgId: string }): Promise<DatePanou> {
  const azi = ziuaRo();
  const limita7 = adaugaZile(azi, -6);

  const [linkRand] = await ctx.db.select().from(volunteerPanelLinks).where(eq(volunteerPanelLinks.orgId, ctx.orgId)).limit(1);

  const pagini = await ctx.db
    .select({
      id: fundraisingPages.id,
      slug: fundraisingPages.slug,
      titlu: fundraisingPages.titlu,
      status: fundraisingPages.status,
      ascunsa: volunteerCampaignSettings.ascunsa,
      mesaj: volunteerCampaignSettings.mesaj,
    })
    .from(fundraisingPages)
    .leftJoin(volunteerCampaignSettings, and(eq(volunteerCampaignSettings.campaignPageId, fundraisingPages.id), eq(volunteerCampaignSettings.orgId, ctx.orgId)))
    .where(eq(fundraisingPages.orgId, ctx.orgId))
    .orderBy(sql`${fundraisingPages.status} asc`, sql`${fundraisingPages.createdAt} desc`);

  const distribCampanii = await ctx.db
    .select({
      id: volunteerShares.campaignPageId,
      canal: volunteerShares.canal,
      n: sql<number>`count(*)::int`,
      n7: sql<number>`count(*) filter (where ${volunteerShares.ziua} >= ${limita7})::int`,
    })
    .from(volunteerShares)
    .where(eq(volunteerShares.orgId, ctx.orgId))
    .groupBy(volunteerShares.campaignPageId, volunteerShares.canal);

  const campanii: CampaniePentruEchipa[] = pagini.map((p) => {
    const randuri = distribCampanii.filter((d) => d.id === p.id);
    return {
      id: p.id,
      slug: p.slug,
      titlu: p.titlu,
      status: p.status,
      ascunsa: p.ascunsa ?? false,
      mesaj: p.mesaj ?? "",
      distribuiri: randuri.reduce((s, r) => s + r.n, 0),
      distribuiri7: randuri.reduce((s, r) => s + r.n7, 0),
      pecanale: Object.fromEntries(randuri.map((r) => [r.canal, r.n])),
    };
  });

  const saptamaniAlese = await ctx.db
    .select({ luni: volunteerFeatured.saptamana, campaignId: volunteerFeatured.campaignPageId })
    .from(volunteerFeatured)
    .where(and(eq(volunteerFeatured.orgId, ctx.orgId), gte(volunteerFeatured.saptamana, luniSaptamana(azi))));
  const saptamani = saptamaniDisponibile(azi).map((s) => ({ ...s, campaignId: saptamaniAlese.find((x) => x.luni === s.luni)?.campaignId ?? null }));

  const vizitatori = await ctx.db
    .select({
      id: volunteerVisitors.id,
      prenume: volunteerVisitors.prenume,
      telefon: volunteerVisitors.telefon,
      voluntarId: volunteerVisitors.voluntarId,
      intratLa: volunteerVisitors.createdAt,
      ultima: volunteerVisitors.ultimaActivitateLa,
      total: sql<number>`count(${volunteerShares.id})::int`,
      sapt: sql<number>`count(${volunteerShares.id}) filter (where ${volunteerShares.ziua} >= ${limita7})::int`,
    })
    .from(volunteerVisitors)
    .leftJoin(volunteerShares, and(eq(volunteerShares.visitorId, volunteerVisitors.id), eq(volunteerShares.orgId, ctx.orgId)))
    .where(eq(volunteerVisitors.orgId, ctx.orgId))
    .groupBy(volunteerVisitors.id)
    .orderBy(sql`${volunteerVisitors.ultimaActivitateLa} desc`)
    .limit(300);

  // Numele din fișa CRM pentru cei legați (după id-ul din lista voluntarilor).
  const legati = vizitatori.map((v) => v.voluntarId).filter((x): x is string => !!x);
  const numePeId = new Map<string, string>();
  if (legati.length > 0) {
    const [roster] = await ctx.db.select({ data: crmKv.data }).from(crmKv).where(and(eq(crmKv.orgId, ctx.orgId), eq(crmKv.path, "voluntari-roster"))).limit(1);
    for (const v of ((roster?.data as { volunteers?: { id?: unknown; nume?: unknown }[] } | undefined)?.volunteers ?? [])) {
      if (typeof v.id === "string" && typeof v.nume === "string") numePeId.set(v.id, v.nume);
    }
  }

  const voluntari: VoluntarPanou[] = vizitatori.map((v) => ({
    id: v.id,
    prenume: v.prenume,
    telefon: v.telefon,
    voluntarId: v.voluntarId,
    legatDe: v.voluntarId ? (numePeId.get(v.voluntarId) ?? null) : null,
    distribuiri: v.total,
    distribuiri7: v.sapt,
    intratLa: v.intratLa.toISOString(),
    ultimaActivitateLa: v.ultima.toISOString(),
  }));

  return {
    link: linkRand
      ? { cod: linkRand.cod, url: `${URL_BAZA()}/voluntar/${linkRand.cod}`, activ: linkRand.activ, mesajImplicit: linkRand.mesajImplicit ?? "", schimbatLa: linkRand.schimbatLa?.toISOString() ?? null }
      : null,
    campanii,
    saptamani,
    voluntari,
    cifre: {
      voluntari: voluntari.length,
      activi7: voluntari.filter((v) => v.distribuiri7 > 0).length,
      distribuiri: voluntari.reduce((s, v) => s + v.distribuiri, 0),
      distribuiri7: voluntari.reduce((s, v) => s + v.distribuiri7, 0),
    },
  };
}
