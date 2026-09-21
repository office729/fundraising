"use server";

import { and, eq } from "drizzle-orm";

import { withOrgAdmin, withOrgSession, type OrgContext } from "@/lib/auth/guard";
import { ONG_CAMPURI } from "@/lib/contract-sponsorizare";
import { crmKv } from "@/lib/db/schema";

// Datele ONG-ului (beneficiarul din contract) stau în același document „config" din crm_kv
// pe care îl folosește și CRM PJ (instrumentul HTML) — o singură sursă pentru amândouă.
const CHEIE = "config";
const CAMPURI = new Set(ONG_CAMPURI.map((c) => c.key));

async function citeste(db: OrgContext["db"], orgId: string): Promise<Record<string, unknown>> {
  const rows = await db.select({ data: crmKv.data }).from(crmKv).where(and(eq(crmKv.orgId, orgId), eq(crmKv.path, CHEIE))).limit(1);
  const d = rows[0]?.data;
  return d && typeof d === "object" && !Array.isArray(d) ? (d as Record<string, unknown>) : {};
}

export const citesteDateOng = withOrgSession(async (ctx): Promise<Record<string, string>> => {
  const cfg = await citeste(ctx.db, ctx.orgId);
  const out: Record<string, string> = {};
  for (const k of CAMPURI) out[k] = typeof cfg[k] === "string" ? (cfg[k] as string) : "";
  return out;
});

// Doar owner/admin: contractele pleacă în numele organizației.
export const salveazaDateOng = withOrgAdmin(async (ctx, valori: Record<string, string>): Promise<{ ok: boolean; error: string | null }> => {
  const curat: Record<string, string> = {};
  for (const [k, v] of Object.entries(valori)) {
    if (CAMPURI.has(k) && typeof v === "string") curat[k] = v.trim().slice(0, 300);
  }
  const existent = await citeste(ctx.db, ctx.orgId);
  const data = { ...existent, ...curat };
  await ctx.db
    .insert(crmKv)
    .values({ orgId: ctx.orgId, path: CHEIE, data, updatedAt: new Date() })
    .onConflictDoUpdate({ target: [crmKv.orgId, crmKv.path], set: { data, updatedAt: new Date() } });
  return { ok: true, error: null };
});
