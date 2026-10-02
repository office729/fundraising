"use server";

import { and, desc, eq } from "drizzle-orm";

import { type OrgContext, withOrgAdmin, withOrgSession } from "@/lib/auth/guard";
import { angajati, kpiAtribuiri, kpiAuditLog, kpiDefinitii, kpiValori } from "@/lib/db/schema";
import { EroareUtilizator } from "@/lib/erori";
import { calculeazaValoareAutomata, perioadaCurenta, type Frecventa, type SursaDate } from "@/lib/kpi-engine";

// Atribuiri & Targeturi + motorul KPI (Faza C) — leagă un KPI din bibliotecă
// de UN angajat, cu target/pondere proprii; valorile (kpi_valori) se scriu
// fie automat (sursă conectată), fie manual, cu istoric în kpi_audit_log.

// Citirea/scrierea datelor KPI ale UNUI angajat e permisă doar lui însuși
// (dacă are cont legat) sau unui owner/admin — altfel orice membru al org-ului
// ar putea citi SAU falsifica targetul/valorile unui coleg, doar trecând alt
// angajatId ca parametru (server action = rută de rețea reală, nu doar un
// buton din UI care "nu arată" acel ID). Modelul Manager/Admin Departament
// din plan rămâne pentru Faza E — pragul de mai jos e minimul corect acum:
// Angajat vede/scrie DOAR al lui, Org Admin vede/scrie tot.
async function verificaAccesAngajat(ctx: OrgContext, angajatId: string): Promise<void> {
  if (ctx.role === "owner" || ctx.role === "admin") return;
  const [angajat] = await ctx.db.select({ appUserId: angajati.appUserId }).from(angajati).where(and(eq(angajati.id, angajatId), eq(angajati.orgId, ctx.orgId))).limit(1);
  if (!angajat || angajat.appUserId !== ctx.userId) throw new EroareUtilizator("Nu ai acces la datele acestui angajat.");
}

export type AtribuireRand = {
  id: string;
  angajatId: string;
  kpiDefinitieId: string;
  kpiNume: string;
  kpiTip: string;
  kpiUnitate: string | null;
  kpiFrecventa: Frecventa;
  kpiEsteManual: boolean;
  kpiSursaDate: SursaDate | null;
  pondere: number | null;
  targetMinim: number | null;
  targetNormal: number | null;
  targetStretch: number | null;
  proRata: boolean;
  status: "activ" | "inactiv";
};

export const listeazaAtribuiriAction = withOrgSession(async (ctx, angajatId: string): Promise<AtribuireRand[]> => {
  await verificaAccesAngajat(ctx, angajatId);
  const rows = await ctx.db
    .select({
      id: kpiAtribuiri.id,
      angajatId: kpiAtribuiri.angajatId,
      kpiDefinitieId: kpiAtribuiri.kpiDefinitieId,
      kpiNume: kpiDefinitii.nume,
      kpiTip: kpiDefinitii.tip,
      kpiUnitate: kpiDefinitii.unitate,
      kpiFrecventa: kpiDefinitii.frecventa,
      kpiEsteManual: kpiDefinitii.esteManual,
      kpiSursaDate: kpiDefinitii.sursaDate,
      pondere: kpiAtribuiri.pondere,
      targetMinim: kpiAtribuiri.targetMinim,
      targetNormal: kpiAtribuiri.targetNormal,
      targetStretch: kpiAtribuiri.targetStretch,
      proRata: kpiAtribuiri.proRata,
      status: kpiAtribuiri.status,
    })
    .from(kpiAtribuiri)
    .innerJoin(kpiDefinitii, eq(kpiDefinitii.id, kpiAtribuiri.kpiDefinitieId))
    .where(and(eq(kpiAtribuiri.orgId, ctx.orgId), eq(kpiAtribuiri.angajatId, angajatId)))
    .orderBy(kpiDefinitii.nume);
  return rows.map((r) => ({ ...r, kpiSursaDate: (r.kpiSursaDate as SursaDate | null) ?? null }));
});

export type AtribuireInput = {
  kpiDefinitieId: string;
  pondere: number | null;
  targetMinim: number | null;
  targetNormal: number | null;
  targetStretch: number | null;
  proRata: boolean;
};

// Suma ponderilor active NU e validată la 100% aici (intenționat — vezi plan,
// o organizație abia la început poate avea un singur KPI configurat), dar
// o pondere individuală în afara [0,100] nu are sens sub nicio interpretare.
function valideazaPondere(pondere: number | null): void {
  if (pondere !== null && (pondere < 0 || pondere > 100)) throw new EroareUtilizator("Ponderea trebuie să fie între 0 și 100.");
}

export const creeazaAtribuireAction = withOrgAdmin(async (ctx, angajatId: string, input: AtribuireInput) => {
  valideazaPondere(input.pondere);
  const [angajat] = await ctx.db.select({ id: angajati.id }).from(angajati).where(and(eq(angajati.id, angajatId), eq(angajati.orgId, ctx.orgId))).limit(1);
  if (!angajat) throw new EroareUtilizator("Angajatul nu a fost găsit.");
  await ctx.db
    .insert(kpiAtribuiri)
    .values({ orgId: ctx.orgId, angajatId, ...input })
    .onConflictDoUpdate({ target: [kpiAtribuiri.angajatId, kpiAtribuiri.kpiDefinitieId], set: { ...input, status: "activ" } });
  await ctx.db.insert(kpiAuditLog).values({ orgId: ctx.orgId, actorUserId: ctx.userId, actiune: "atribuie", entitate: "kpi_atribuire", entitateId: angajatId, detalii: { ...input } });
});

export const actualizeazaAtribuireAction = withOrgAdmin(async (ctx, id: string, input: AtribuireInput) => {
  valideazaPondere(input.pondere);
  const [existenta] = await ctx.db.select({ pondere: kpiAtribuiri.pondere, targetNormal: kpiAtribuiri.targetNormal }).from(kpiAtribuiri).where(and(eq(kpiAtribuiri.id, id), eq(kpiAtribuiri.orgId, ctx.orgId))).limit(1);
  if (!existenta) throw new EroareUtilizator("Atribuirea nu a fost găsită.");
  await ctx.db.update(kpiAtribuiri).set(input).where(and(eq(kpiAtribuiri.id, id), eq(kpiAtribuiri.orgId, ctx.orgId)));
  await ctx.db.insert(kpiAuditLog).values({
    orgId: ctx.orgId,
    actorUserId: ctx.userId,
    actiune: "editeaza_atribuire",
    entitate: "kpi_atribuire",
    entitateId: id,
    detalii: { ponderVechi: existenta.pondere, ponderNou: input.pondere, targetVechi: existenta.targetNormal, targetNou: input.targetNormal },
  });
});

export const stergeAtribuireAction = withOrgAdmin(async (ctx, id: string) => {
  await ctx.db.delete(kpiAtribuiri).where(and(eq(kpiAtribuiri.id, id), eq(kpiAtribuiri.orgId, ctx.orgId)));
  await ctx.db.insert(kpiAuditLog).values({ orgId: ctx.orgId, actorUserId: ctx.userId, actiune: "sterge_atribuire", entitate: "kpi_atribuire", entitateId: id, detalii: {} });
});

// --- Valori (automat + manual) ----------------------------------------

export type ValoarePerioada = { valoare: number | null; sursa: "automat" | "manual" | null; comentariu: string | null; dovadaUrl: string | null; actualizatLa: Date | null; perioadaStart: string };

// Valoarea perioadei CURENTE (după frecvența KPI-ului) — dacă sursa e
// automată, (re)calculează live din activitatea reală și o persistă; dacă
// sursa nu e conectată, întoarce ce a fost introdus manual ultima dată.
export const obtineValoareCurentaAction = withOrgSession(async (ctx, angajatId: string, kpiDefinitieId: string): Promise<ValoarePerioada> => {
  await verificaAccesAngajat(ctx, angajatId);
  const [definitie] = await ctx.db.select({ frecventa: kpiDefinitii.frecventa, sursaDate: kpiDefinitii.sursaDate }).from(kpiDefinitii).where(and(eq(kpiDefinitii.id, kpiDefinitieId), eq(kpiDefinitii.orgId, ctx.orgId))).limit(1);
  if (!definitie) throw new EroareUtilizator("KPI-ul nu a fost găsit.");
  const [angajat] = await ctx.db.select({ appUserId: angajati.appUserId }).from(angajati).where(and(eq(angajati.id, angajatId), eq(angajati.orgId, ctx.orgId))).limit(1);
  const { start, endExclusiv } = perioadaCurenta(definitie.frecventa);

  const sursaDate = (definitie.sursaDate as SursaDate | null) ?? null;
  if (sursaDate && sursaDate.tip !== "manual") {
    const valoareAutomata = await calculeazaValoareAutomata(ctx.db, ctx.orgId, sursaDate, angajat?.appUserId ?? null, start, endExclusiv);
    if (valoareAutomata !== null) {
      await ctx.db
        .insert(kpiValori)
        .values({ orgId: ctx.orgId, angajatId, kpiDefinitieId, perioadaStart: start, perioadaTip: definitie.frecventa, valoare: valoareAutomata, sursa: "automat" })
        .onConflictDoUpdate({ target: [kpiValori.angajatId, kpiValori.kpiDefinitieId, kpiValori.perioadaStart, kpiValori.perioadaTip], set: { valoare: valoareAutomata, sursa: "automat", createdAt: new Date() } });
      return { valoare: valoareAutomata, sursa: "automat", comentariu: null, dovadaUrl: null, actualizatLa: new Date(), perioadaStart: start };
    }
  }

  const [existenta] = await ctx.db
    .select({ valoare: kpiValori.valoare, sursa: kpiValori.sursa, comentariu: kpiValori.comentariu, dovadaUrl: kpiValori.dovadaUrl, createdAt: kpiValori.createdAt })
    .from(kpiValori)
    .where(and(eq(kpiValori.angajatId, angajatId), eq(kpiValori.kpiDefinitieId, kpiDefinitieId), eq(kpiValori.perioadaStart, start), eq(kpiValori.perioadaTip, definitie.frecventa)))
    .limit(1);
  if (!existenta) return { valoare: null, sursa: null, comentariu: null, dovadaUrl: null, actualizatLa: null, perioadaStart: start };
  return { valoare: existenta.valoare, sursa: existenta.sursa, comentariu: existenta.comentariu, dovadaUrl: existenta.dovadaUrl, actualizatLa: existenta.createdAt, perioadaStart: start };
});

// Introducere/corectare MANUALĂ — păstrează istoricul schimbării (valoare
// veche → nouă) în kpi_audit_log, nu printr-un rând kpi_valori duplicat.
export const inregistreazaValoareManualaAction = withOrgSession(
  async (ctx, angajatId: string, kpiDefinitieId: string, valoare: number, comentariu: string | null, dovadaUrl: string | null) => {
    await verificaAccesAngajat(ctx, angajatId);
    const [definitie] = await ctx.db.select({ frecventa: kpiDefinitii.frecventa }).from(kpiDefinitii).where(and(eq(kpiDefinitii.id, kpiDefinitieId), eq(kpiDefinitii.orgId, ctx.orgId))).limit(1);
    if (!definitie) throw new EroareUtilizator("KPI-ul nu a fost găsit.");
    const { start } = perioadaCurenta(definitie.frecventa);

    const [veche] = await ctx.db
      .select({ valoare: kpiValori.valoare })
      .from(kpiValori)
      .where(and(eq(kpiValori.angajatId, angajatId), eq(kpiValori.kpiDefinitieId, kpiDefinitieId), eq(kpiValori.perioadaStart, start), eq(kpiValori.perioadaTip, definitie.frecventa)))
      .limit(1);

    await ctx.db
      .insert(kpiValori)
      .values({ orgId: ctx.orgId, angajatId, kpiDefinitieId, perioadaStart: start, perioadaTip: definitie.frecventa, valoare, sursa: "manual", comentariu, dovadaUrl, inregistratDe: ctx.userId })
      .onConflictDoUpdate({
        target: [kpiValori.angajatId, kpiValori.kpiDefinitieId, kpiValori.perioadaStart, kpiValori.perioadaTip],
        set: { valoare, sursa: "manual", comentariu, dovadaUrl, inregistratDe: ctx.userId, createdAt: new Date() },
      });

    await ctx.db.insert(kpiAuditLog).values({
      orgId: ctx.orgId,
      actorUserId: ctx.userId,
      actiune: "inregistreaza_valoare",
      entitate: "kpi_valoare",
      entitateId: kpiDefinitieId,
      detalii: { angajatId, perioadaStart: start, valoareVeche: veche?.valoare ?? null, valoareNoua: valoare, comentariu },
    });
  },
);

// Istoricul modificărilor manuale ale unui KPI pentru un angajat — din audit log.
export type IstoricValoare = { valoareVeche: number | null; valoareNoua: number; comentariu: string | null; la: Date };

export const listeazaIstoricValoareAction = withOrgSession(async (ctx, angajatId: string, kpiDefinitieId: string): Promise<IstoricValoare[]> => {
  await verificaAccesAngajat(ctx, angajatId);
  const rows = await ctx.db
    .select({ detalii: kpiAuditLog.detalii, createdAt: kpiAuditLog.createdAt })
    .from(kpiAuditLog)
    .where(and(eq(kpiAuditLog.orgId, ctx.orgId), eq(kpiAuditLog.actiune, "inregistreaza_valoare"), eq(kpiAuditLog.entitateId, kpiDefinitieId)))
    .orderBy(desc(kpiAuditLog.createdAt))
    .limit(20);
  return rows
    .map((r) => ({ detalii: r.detalii as { angajatId?: string; valoareVeche: number | null; valoareNoua: number; comentariu: string | null }, la: r.createdAt }))
    .filter((r) => r.detalii.angajatId === angajatId)
    .map((r) => ({ valoareVeche: r.detalii.valoareVeche, valoareNoua: r.detalii.valoareNoua, comentariu: r.detalii.comentariu, la: r.la }));
});
