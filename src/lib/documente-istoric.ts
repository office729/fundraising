import "server-only";

import { and, asc, eq, gt, gte, isNull, like, lte } from "drizzle-orm";

import type { OrgContext } from "@/lib/auth/guard";
import { companies, companySponsorizari, crmKv } from "@/lib/db/schema";

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

const adaugaZile = (iso: string, n: number) => new Date(new Date(`${iso}T12:00:00Z`).getTime() + n * 86_400_000).toISOString().slice(0, 10);

export type Restanta = { companyId: string; firma: string; suma: number; data: string; zile: number };

// Sponsorizări (din ultimul an) mai vechi de 14 zile, pentru care firma nu are încă nicio scrisoare bifată ca „trimisă” după data sponsorizării.
// O firmă apare o singură dată, cu cea mai recentă sponsorizare. Cele mai vechi (cele mai întârziate) primele.
export async function multumiriRestante(db: OrgContext["db"], orgId: string, azi: string, max = 10): Promise<Restanta[]> {
  const rows = await db
    .select({ companyId: companySponsorizari.companyId, firma: companies.nume, suma: companySponsorizari.suma, data: companySponsorizari.data })
    .from(companySponsorizari)
    .innerJoin(companies, eq(companies.id, companySponsorizari.companyId))
    .where(and(eq(companySponsorizari.orgId, orgId), isNull(companies.deletedAt), gt(companySponsorizari.suma, 0), lte(companySponsorizari.data, adaugaZile(azi, -14)), gte(companySponsorizari.data, adaugaZile(azi, -365))))
    .orderBy(asc(companySponsorizari.data))
    .limit(300);
  const [kv] = await db.select({ data: crmKv.data }).from(crmKv).where(and(eq(crmKv.orgId, orgId), eq(crmKv.path, caleDoc("scrisori")))).limit(1);
  const trimise = (((kv?.data as Partial<Stare> | undefined)?.intrari ?? []) as Intrare[]).filter((i) => i.stare === "trimis" && i.firmaId);
  const ultima = new Map<string, Restanta>();
  for (const r of rows) {
    if (trimise.some((i) => i.firmaId === r.companyId && i.la.slice(0, 10) >= r.data)) continue;
    const zile = Math.round((new Date(`${azi}T12:00:00Z`).getTime() - new Date(`${r.data}T12:00:00Z`).getTime()) / 86_400_000);
    ultima.set(r.companyId, { companyId: r.companyId, firma: r.firma, suma: r.suma, data: r.data, zile });
  }
  return [...ultima.values()].sort((a, b) => b.zile - a.zile).slice(0, max);
}
