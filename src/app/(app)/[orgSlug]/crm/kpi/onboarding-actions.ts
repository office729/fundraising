"use server";

import { and, eq, isNull, sql } from "drizzle-orm";

import { withOrgAdmin, withOrgSession } from "@/lib/auth/guard";
import { angajati, appUsers, departments, kpiAtribuiri, kpiAuditLog, kpiCategorii, kpiDefinitii, kpiValori, memberships, roluri } from "@/lib/db/schema";

// Configurarea ghidată a modulului KPI (onboarding) — pașii se bifează SINGURI din ce există deja în organizație, nu dintr-o
// listă ținută separat; așa nu se desincronizează și nu se pot „bifa degeaba”.
export type StareOnboarding = {
  departamente: number;
  roluri: number;
  angajati: number;
  angajatiCuCont: number;
  angajatiCuManager: number;
  membriPlatforma: number;
  categorii: number;
  kpi: number;
  atribuiri: number;
  valori: number;
};

const numara = async (q: Promise<{ n: number }[]>) => (await q)[0]?.n ?? 0;

export const obtineStareOnboardingAction = withOrgSession(async (ctx): Promise<StareOnboarding> => {
  const c = () => sql<number>`count(*)::int`;
  const [departamente, roluriN, ang, cuCont, cuManager, membri, categorii, kpi, atribuiri, valori] = await Promise.all([
    numara(ctx.db.select({ n: c() }).from(departments).where(eq(departments.orgId, ctx.orgId))),
    numara(ctx.db.select({ n: c() }).from(roluri).where(eq(roluri.orgId, ctx.orgId))),
    numara(ctx.db.select({ n: c() }).from(angajati).where(eq(angajati.orgId, ctx.orgId))),
    numara(ctx.db.select({ n: c() }).from(angajati).where(and(eq(angajati.orgId, ctx.orgId), sql`${angajati.appUserId} is not null`))),
    numara(ctx.db.select({ n: c() }).from(angajati).where(and(eq(angajati.orgId, ctx.orgId), sql`${angajati.managerId} is not null`))),
    numara(ctx.db.select({ n: c() }).from(memberships).where(eq(memberships.orgId, ctx.orgId))),
    numara(ctx.db.select({ n: c() }).from(kpiCategorii).where(eq(kpiCategorii.orgId, ctx.orgId))),
    numara(ctx.db.select({ n: c() }).from(kpiDefinitii).where(eq(kpiDefinitii.orgId, ctx.orgId))),
    numara(ctx.db.select({ n: c() }).from(kpiAtribuiri).where(and(eq(kpiAtribuiri.orgId, ctx.orgId), eq(kpiAtribuiri.status, "activ")))),
    numara(ctx.db.select({ n: c() }).from(kpiValori).where(eq(kpiValori.orgId, ctx.orgId))),
  ]);
  return { departamente, roluri: roluriN, angajati: ang, angajatiCuCont: cuCont, angajatiCuManager: cuManager, membriPlatforma: membri, categorii, kpi, atribuiri, valori };
});

// Aduce în „Echipă” toți membrii platformei care nu au încă un profil de angajat: un profil nou, legat de contul lor (ca să-și
// poată vedea „Performanța mea”, check-in-ul etc.). Dacă există deja un angajat cu același email și fără cont legat, se leagă
// de contul respectiv în loc să se creeze un duplicat.
export const importaMembriiInEchipaAction = withOrgAdmin(async (ctx): Promise<{ adaugati: number; legati: number }> => {
  const membri = await ctx.db
    .select({ userId: appUsers.id, email: appUsers.email, nume: appUsers.name })
    .from(memberships)
    .innerJoin(appUsers, eq(appUsers.id, memberships.userId))
    .where(eq(memberships.orgId, ctx.orgId));
  const existenti = await ctx.db.select({ id: angajati.id, appUserId: angajati.appUserId, email: angajati.email }).from(angajati).where(eq(angajati.orgId, ctx.orgId));
  const legate = new Set(existenti.map((a) => a.appUserId).filter((v): v is string => v !== null));

  let adaugati = 0;
  let legati = 0;
  for (const m of membri) {
    if (legate.has(m.userId)) continue;
    const dupaEmail = existenti.find((a) => a.appUserId === null && a.email && a.email.toLowerCase() === m.email.toLowerCase());
    if (dupaEmail) {
      const r = await ctx.db.update(angajati).set({ appUserId: m.userId }).where(and(eq(angajati.id, dupaEmail.id), eq(angajati.orgId, ctx.orgId), isNull(angajati.appUserId))).returning({ id: angajati.id });
      if (r[0]) {
        dupaEmail.appUserId = m.userId;
        legate.add(m.userId);
        legati++;
      }
      continue;
    }
    const nume = (m.nume || m.email.split("@")[0]).trim();
    await ctx.db.insert(angajati).values({ orgId: ctx.orgId, appUserId: m.userId, nume, email: m.email, status: "activ", nivelAcces: "membru" });
    legate.add(m.userId);
    adaugati++;
  }
  if (adaugati + legati > 0) {
    await ctx.db.insert(kpiAuditLog).values({ orgId: ctx.orgId, actorUserId: ctx.userId, actiune: "creeaza", entitate: "angajat", detalii: { import_membri: adaugati, legati } });
  }
  return { adaugati, legati };
});
