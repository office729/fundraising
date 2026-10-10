import "server-only";

import { and, eq, like } from "drizzle-orm";

import type { OrgContext } from "@/lib/auth/guard";
import { crmKv } from "@/lib/db/schema";

// Istoricul documentelor (scrisori, certificate, rapoarte) stă în crm_kv, pe organizație: o intrare pe tip, cu `numere` (contorul pe an)
// și `intrari` (ultimele documente exportate, cu datele lor fără logo-uri).
export type TipDoc = "scrisori" | "certificate" | "rapoarte";
export const TIPURI_DOC: TipDoc[] = ["scrisori", "certificate", "rapoarte"];
export type StareDoc = "exportat" | "trimis";

export type Intrare = { id: string; la: string; autor: string; titlu: string; firmaId: string | null; numar: string; stare: StareDoc; trimisLa: string | null; date: unknown };
export type Stare = { numere: Record<string, number>; intrari: Intrare[] };

export const caleDoc = (tip: TipDoc) => `documente/${tip}`;

// Când se șterge o firmă, documentele ei (care conțin numele administratorului și adresa) se șterg din istoric.
export async function stergeDocumenteFirma(db: OrgContext["db"], orgId: string, firmaId: string): Promise<void> {
  const randuri = await db
    .select({ path: crmKv.path, data: crmKv.data })
    .from(crmKv)
    .where(and(eq(crmKv.orgId, orgId), like(crmKv.path, "documente/%")))
    .for("update");
  for (const r of randuri) {
    const d = (r.data ?? {}) as Partial<Stare>;
    if (!Array.isArray(d.intrari)) continue;
    const ramase = d.intrari.filter((i) => i.firmaId !== firmaId);
    if (ramase.length === d.intrari.length) continue;
    await db
      .update(crmKv)
      .set({ data: { numere: d.numere ?? {}, intrari: ramase }, updatedAt: new Date() })
      .where(and(eq(crmKv.orgId, orgId), eq(crmKv.path, r.path)));
  }
}
