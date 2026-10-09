"use server";

import { randomUUID } from "node:crypto";

import { and, desc, eq, sql } from "drizzle-orm";

import { inregistreazaAudit } from "@/lib/audit";
import { withOrgSession, type OrgContext } from "@/lib/auth/guard";
import { appUsers, crmKv, donatorNotite, donatoriReali, fundraisingAuditLog } from "@/lib/db/schema";
import { bazaDonatori, donCte, filtruLaParametri, parseFiltruPf } from "@/lib/donatori-pf";

import { serializeazaRand, type RandPf } from "./queries-pf";

// Acțiunile CRM Persoane fizice apelate din interfață: starea de lucru a donatorului, panoul lateral, rapoartele salvate.
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATA_REGEX = /^\d{4}-\d{2}-\d{2}$/;
type Rez = { ok: true } | { ok: false; eroare: string };

export type StarePatch = {
  sunat?: boolean;
  multumit?: boolean;
  aRaspuns?: boolean;
  nuContactat?: boolean;
  reapelLa?: string | null;
  wbStage?: "reactivare" | "reactivat" | "pierdut" | null;
};

export const seteazaStareDonator = withOrgSession(async (ctx, id: string, patch: StarePatch): Promise<Rez> => {
  if (!UUID_REGEX.test(String(id))) return { ok: false, eroare: "Donator invalid." };
  const set: Partial<typeof donatoriReali.$inferInsert> = {};
  const evenimente: string[] = [];
  if (patch.sunat !== undefined) {
    set.sunatLa = patch.sunat ? new Date() : null;
    evenimente.push(patch.sunat ? "sunat" : "sunat_anulat");
  }
  if (patch.multumit !== undefined) {
    set.multumitLa = patch.multumit ? new Date() : null;
    evenimente.push(patch.multumit ? "multumit" : "multumit_anulat");
  }
  if (patch.aRaspuns !== undefined) {
    set.aRaspuns = !!patch.aRaspuns;
    evenimente.push(patch.aRaspuns ? "a_raspuns" : "a_raspuns_anulat");
  }
  if (patch.nuContactat !== undefined) {
    set.nuContactat = !!patch.nuContactat;
    evenimente.push(patch.nuContactat ? "nu_contactat" : "contactare_permisa");
  }
  if (patch.reapelLa !== undefined) {
    if (patch.reapelLa !== null && !DATA_REGEX.test(patch.reapelLa)) return { ok: false, eroare: "Data reapelului nu e validă." };
    set.reapelLa = patch.reapelLa;
    evenimente.push(patch.reapelLa ? "reapel_programat" : "reapel_scos");
  }
  if (patch.wbStage !== undefined) {
    if (patch.wbStage !== null && !["reactivare", "reactivat", "pierdut"].includes(patch.wbStage)) return { ok: false, eroare: "Etapă invalidă." };
    set.wbStage = patch.wbStage;
    evenimente.push(patch.wbStage ? `winback_${patch.wbStage}` : "winback_scos");
  }
  if (Object.keys(set).length === 0) return { ok: true };
  const r = await ctx.db.update(donatoriReali).set(set).where(and(eq(donatoriReali.id, id), eq(donatoriReali.orgId, ctx.orgId))).returning({ id: donatoriReali.id });
  if (!r[0]) return { ok: false, eroare: "Donatorul nu mai există." };
  for (const e of evenimente) {
    await inregistreazaAudit(ctx.db, { orgId: ctx.orgId, actorAppUserId: ctx.userId, actiune: `donator_${e}`, entitate: "donator", entitateId: id, detalii: {} });
  }
  return { ok: true };
});

export type PanouDonator = {
  rand: RandPf;
  donatii: { proiect: string | null; suma: number; data: string; recurenta: boolean }[];
  notite: { id: string; text: string; createdAt: string; autor: string | null }[];
  activitate: { actiune: string; la: string; autor: string | null }[];
};

// Panoul lateral: tot ce trebuie știut despre un donator, fără să părăsești lista.
export const getPanouDonator = withOrgSession(async (ctx, id: string): Promise<PanouDonator | null> => {
  if (!UUID_REGEX.test(String(id))) return null;
  const [rand] = (await ctx.db.execute(sql`with ${bazaDonatori(ctx.orgId)} select b.*, 1 as rn from base b where b.id = ${id}`)) as unknown as Record<string, unknown>[];
  if (!rand) return null;
  const email = String(rand.email).toLowerCase();
  const [donatii, notite, activitate] = await Promise.all([
    ctx.db.execute(sql`with ${donCte(ctx.orgId)} select proiect, suma, data, recurenta from don where email = ${email} order by data desc limit 15`),
    ctx.db
      .select({ id: donatorNotite.id, text: donatorNotite.text, createdAt: donatorNotite.createdAt, autor: appUsers.name })
      .from(donatorNotite)
      .leftJoin(appUsers, eq(appUsers.id, donatorNotite.createdBy))
      .where(and(eq(donatorNotite.donatorId, id), eq(donatorNotite.orgId, ctx.orgId)))
      .orderBy(desc(donatorNotite.createdAt))
      .limit(5),
    ctx.db
      .select({ actiune: fundraisingAuditLog.actiune, la: fundraisingAuditLog.createdAt, autor: appUsers.name })
      .from(fundraisingAuditLog)
      .leftJoin(appUsers, eq(appUsers.id, fundraisingAuditLog.actorAppUserId))
      .where(and(eq(fundraisingAuditLog.orgId, ctx.orgId), eq(fundraisingAuditLog.entitate, "donator"), eq(fundraisingAuditLog.entitateId, id)))
      .orderBy(desc(fundraisingAuditLog.createdAt))
      .limit(8),
  ]);
  return {
    rand: serializeazaRand(rand),
    donatii: (donatii as unknown as { proiect: string | null; suma: number; data: Date | string; recurenta: boolean }[]).map((d) => ({ proiect: d.proiect, suma: d.suma, data: new Date(d.data).toISOString(), recurenta: d.recurenta })),
    notite: notite.map((n) => ({ id: n.id, text: n.text, createdAt: n.createdAt.toISOString(), autor: n.autor })),
    activitate: activitate.map((a) => ({ actiune: a.actiune, la: a.la.toISOString(), autor: a.autor })),
  };
});

// ===== Rapoarte salvate: o combinație de segmente + filtre, cu nume =====
export type RaportPf = { id: string; nume: string; qs: string; creat: string };
const CALE_RAPOARTE = "pf_rapoarte";
const MAX_RAPOARTE = 50;

async function citesteRapoarte(ctx: Pick<OrgContext, "db" | "orgId">): Promise<RaportPf[]> {
  const [r] = await ctx.db.select({ data: crmKv.data }).from(crmKv).where(and(eq(crmKv.orgId, ctx.orgId), eq(crmKv.path, CALE_RAPOARTE))).limit(1);
  const lista = (r?.data as { rapoarte?: RaportPf[] } | undefined)?.rapoarte;
  return Array.isArray(lista) ? lista : [];
}

async function scrieRapoarte(ctx: Pick<OrgContext, "db" | "orgId">, rapoarte: RaportPf[]) {
  await ctx.db
    .insert(crmKv)
    .values({ orgId: ctx.orgId, path: CALE_RAPOARTE, data: { rapoarte }, updatedAt: new Date() })
    .onConflictDoUpdate({ target: [crmKv.orgId, crmKv.path], set: { data: { rapoarte }, updatedAt: new Date() } });
}

export const listeazaRapoartePf = withOrgSession(async (ctx): Promise<RaportPf[]> => citesteRapoarte(ctx));

export const salveazaRaportPf = withOrgSession(async (ctx, nume: string, qs: string): Promise<Rez> => {
  const n = String(nume ?? "").trim().slice(0, 80);
  if (n.length < 2) return { ok: false, eroare: "Dă raportului un nume (cel puțin 2 caractere)." };
  // Rămân doar filtrele și segmentele valide, fără pagină.
  const curat = filtruLaParametri(parseFiltruPf(new URLSearchParams(String(qs ?? "")))).toString();
  await ctx.db.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`${ctx.orgId}:${CALE_RAPOARTE}`}, 0))`);
  const lista = await citesteRapoarte(ctx);
  if (lista.length >= MAX_RAPOARTE) return { ok: false, eroare: `Poți păstra cel mult ${MAX_RAPOARTE} de rapoarte. Șterge unul.` };
  await scrieRapoarte(ctx, [{ id: randomUUID(), nume: n, qs: curat, creat: new Date().toISOString() }, ...lista]);
  return { ok: true };
});

export const stergeRaportPf = withOrgSession(async (ctx, id: string): Promise<Rez> => {
  await ctx.db.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`${ctx.orgId}:${CALE_RAPOARTE}`}, 0))`);
  await scrieRapoarte(ctx, (await citesteRapoarte(ctx)).filter((r) => r.id !== id));
  return { ok: true };
});
