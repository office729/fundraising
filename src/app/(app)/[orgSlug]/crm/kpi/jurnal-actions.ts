"use server";

import { desc, eq } from "drizzle-orm";

import { withOrgAdmin } from "@/lib/auth/guard";
import { appUsers, kpiAuditLog } from "@/lib/db/schema";

export type IntrareJurnal = {
  id: string;
  la: string; // ISO
  actor: string | null;
  actiune: string;
  entitate: string;
  detalii: string | null;
};

// Jurnalul de modificări KPI — ultimele 300 de intrări (cine, ce, când). Doar owner/admin. `detalii` se afișează ca text scurt,
// fără câmpuri sensibile.
export const listeazaJurnalAction = withOrgAdmin(async (ctx): Promise<IntrareJurnal[]> => {
  const rows = await ctx.db
    .select({ id: kpiAuditLog.id, la: kpiAuditLog.createdAt, actiune: kpiAuditLog.actiune, entitate: kpiAuditLog.entitate, detalii: kpiAuditLog.detalii, actor: appUsers.name, actorEmail: appUsers.email })
    .from(kpiAuditLog)
    .leftJoin(appUsers, eq(appUsers.id, kpiAuditLog.actorUserId))
    .where(eq(kpiAuditLog.orgId, ctx.orgId))
    .orderBy(desc(kpiAuditLog.createdAt))
    .limit(300);
  return rows.map((r) => {
    const d = (r.detalii ?? {}) as Record<string, unknown>;
    const text = Object.entries(d)
      .filter(([, v]) => v !== null && v !== undefined && typeof v !== "object")
      .slice(0, 6)
      .map(([k, v]) => `${k}: ${String(v).slice(0, 80)}`)
      .join(" · ");
    return { id: r.id, la: r.la.toISOString(), actor: r.actor || r.actorEmail || null, actiune: r.actiune, entitate: r.entitate, detalii: text || null };
  });
});