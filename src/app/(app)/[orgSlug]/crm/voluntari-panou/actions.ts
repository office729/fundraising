"use server";

import { and, eq, inArray, sql } from "drizzle-orm";

import { withOrgSession, type OrgContext } from "@/lib/auth/guard";
import {
  fundraisingAuditLog,
  fundraisingPages,
  volunteerCampaignSettings,
  volunteerFeatured,
  volunteerPanelLinks,
  volunteerShares,
  volunteerVisitors,
} from "@/lib/db/schema";
import { genereazaCodScurt } from "@/lib/short-code";
import { saptamaniDisponibile, ziuaRo } from "@/lib/voluntari-panou";
import { citesteDatePanou, type DatePanou } from "@/lib/voluntari-panou-echipa";
export type { CampaniePentruEchipa, DatePanou, VoluntarPanou } from "@/lib/voluntari-panou-echipa";

// Pagina echipei pentru panoul voluntarilor: linkul comun, campania săptămânii, setări pe campanie și activitatea voluntarilor.
// Orice membru al organizației coordonează (la fel ca în CRM Voluntari); fiecare schimbare de link intră în jurnalul de audit.

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATA_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const MAX_MESAJ = 1200;

const audit = (ctx: OrgContext, actiune: string, detalii: Record<string, unknown> = {}) =>
  ctx.db.insert(fundraisingAuditLog).values({ orgId: ctx.orgId, actorAppUserId: ctx.userId, actiune, entitate: "voluntari_panou", entitateId: ctx.orgId, detalii });

export const obtineDatePanou = withOrgSession(async (ctx): Promise<DatePanou> => citesteDatePanou(ctx));

// ===== Link =====
// Codul e unic pe toată platforma: indexul unic din baza de date împiedică orice coliziune (INSERT/UPDATE ar eșua, nu ar suprascrie).
const codNou = () => genereazaCodScurt(12);

export const creeazaLinkAction = withOrgSession(async (ctx): Promise<{ ok: true } | { ok: false; eroare: string }> => {
  const [exista] = await ctx.db.select({ id: volunteerPanelLinks.id }).from(volunteerPanelLinks).where(eq(volunteerPanelLinks.orgId, ctx.orgId)).limit(1);
  if (exista) return { ok: false, eroare: "Linkul există deja." };
  await ctx.db.insert(volunteerPanelLinks).values({ orgId: ctx.orgId, cod: codNou(), createdBy: ctx.userId });
  await audit(ctx, "voluntari_link_creat");
  return { ok: true };
});

// Codul vechi încetează să mai funcționeze imediat; voluntarii deja înscriși (cookie) trebuie să intre din nou pe linkul nou.
export const schimbaLinkAction = withOrgSession(async (ctx): Promise<{ ok: true } | { ok: false; eroare: string }> => {
  const r = await ctx.db
    .update(volunteerPanelLinks)
    .set({ cod: codNou(), activ: true, schimbatLa: new Date() })
    .where(eq(volunteerPanelLinks.orgId, ctx.orgId))
    .returning({ id: volunteerPanelLinks.id });
  if (!r[0]) return { ok: false, eroare: "Linkul nu există încă." };
  await audit(ctx, "voluntari_link_schimbat");
  return { ok: true };
});

export const comutaLinkAction = withOrgSession(async (ctx, activ: boolean): Promise<{ ok: true } | { ok: false; eroare: string }> => {
  const r = await ctx.db.update(volunteerPanelLinks).set({ activ: !!activ }).where(eq(volunteerPanelLinks.orgId, ctx.orgId)).returning({ id: volunteerPanelLinks.id });
  if (!r[0]) return { ok: false, eroare: "Linkul nu există încă." };
  await audit(ctx, activ ? "voluntari_link_pornit" : "voluntari_link_oprit");
  return { ok: true };
});

export const salveazaMesajImplicitAction = withOrgSession(async (ctx, mesaj: string): Promise<{ ok: true } | { ok: false; eroare: string }> => {
  const text = String(mesaj ?? "").trim().slice(0, MAX_MESAJ);
  const r = await ctx.db.update(volunteerPanelLinks).set({ mesajImplicit: text || null }).where(eq(volunteerPanelLinks.orgId, ctx.orgId)).returning({ id: volunteerPanelLinks.id });
  if (!r[0]) return { ok: false, eroare: "Creează întâi linkul." };
  return { ok: true };
});

// ===== Campania săptămânii =====
export const seteazaCampaniaSaptamaniiAction = withOrgSession(async (ctx, luni: string, campaignId: string): Promise<{ ok: true } | { ok: false; eroare: string }> => {
  const dozvolat = saptamaniDisponibile(ziuaRo()).some((s) => s.luni === luni);
  if (!DATA_REGEX.test(String(luni)) || !dozvolat) return { ok: false, eroare: "Alege una dintre săptămânile din listă." };
  if (!UUID_REGEX.test(String(campaignId))) return { ok: false, eroare: "Alege o campanie." };
  const [pagina] = await ctx.db
    .select({ id: fundraisingPages.id })
    .from(fundraisingPages)
    .where(and(eq(fundraisingPages.id, campaignId), eq(fundraisingPages.orgId, ctx.orgId), eq(fundraisingPages.status, "activa")))
    .limit(1);
  if (!pagina) return { ok: false, eroare: "Campania nu există sau nu mai e activă." };
  // O săptămână are o singură campanie: o alegere nouă o înlocuiește.
  await ctx.db
    .insert(volunteerFeatured)
    .values({ orgId: ctx.orgId, saptamana: luni, campaignPageId: campaignId, setatDe: ctx.userId })
    .onConflictDoUpdate({ target: [volunteerFeatured.orgId, volunteerFeatured.saptamana], set: { campaignPageId: campaignId, setatDe: ctx.userId, createdAt: new Date() } });
  return { ok: true };
});

export const scoateCampaniaSaptamaniiAction = withOrgSession(async (ctx, luni: string): Promise<{ ok: true } | { ok: false; eroare: string }> => {
  if (!DATA_REGEX.test(String(luni))) return { ok: false, eroare: "Săptămână invalidă." };
  await ctx.db.delete(volunteerFeatured).where(and(eq(volunteerFeatured.orgId, ctx.orgId), eq(volunteerFeatured.saptamana, luni)));
  return { ok: true };
});

// ===== Setări pe campanie =====
export const seteazaSetariCampanieAction = withOrgSession(
  async (ctx, campaignId: string, setari: { ascunsa: boolean; mesaj: string }): Promise<{ ok: true } | { ok: false; eroare: string }> => {
    if (!UUID_REGEX.test(String(campaignId))) return { ok: false, eroare: "Campanie invalidă." };
    const [pagina] = await ctx.db.select({ id: fundraisingPages.id }).from(fundraisingPages).where(and(eq(fundraisingPages.id, campaignId), eq(fundraisingPages.orgId, ctx.orgId))).limit(1);
    if (!pagina) return { ok: false, eroare: "Campania nu există." };
    const mesaj = String(setari.mesaj ?? "").trim().slice(0, MAX_MESAJ) || null;
    await ctx.db
      .insert(volunteerCampaignSettings)
      .values({ orgId: ctx.orgId, campaignPageId: campaignId, ascunsa: !!setari.ascunsa, mesaj })
      .onConflictDoUpdate({ target: [volunteerCampaignSettings.orgId, volunteerCampaignSettings.campaignPageId], set: { ascunsa: !!setari.ascunsa, mesaj, actualizatLa: new Date() } });
    return { ok: true };
  },
);

// Pentru fișa voluntarului din CRM: cifrele panoului pentru fișele legate (după id-ul din lista voluntarilor).
export const obtineActivitatePanouPeFise = withOrgSession(async (ctx, ids: string[]): Promise<Record<string, { distribuiri: number; ultimaActivitateLa: string | null }>> => {
  const lista = (Array.isArray(ids) ? ids : []).filter((x) => typeof x === "string").slice(0, 500);
  if (lista.length === 0) return {};
  const r = await ctx.db
    .select({
      voluntarId: volunteerVisitors.voluntarId,
      total: sql<number>`count(${volunteerShares.id})::int`,
      ultima: sql<Date | null>`max(${volunteerShares.createdAt})`,
    })
    .from(volunteerVisitors)
    .leftJoin(volunteerShares, and(eq(volunteerShares.visitorId, volunteerVisitors.id), eq(volunteerShares.orgId, ctx.orgId)))
    .where(and(eq(volunteerVisitors.orgId, ctx.orgId), inArray(volunteerVisitors.voluntarId, lista)))
    .groupBy(volunteerVisitors.voluntarId);
  const iesire: Record<string, { distribuiri: number; ultimaActivitateLa: string | null }> = {};
  for (const x of r) if (x.voluntarId) iesire[x.voluntarId] = { distribuiri: x.total, ultimaActivitateLa: x.ultima ? new Date(x.ultima).toISOString() : null };
  return iesire;
});
