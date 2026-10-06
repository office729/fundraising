"use server";

import { and, eq } from "drizzle-orm";

import { withOrgSession } from "@/lib/auth/guard";
import { angajati, kpiAtribuiri, kpiDefinitii } from "@/lib/db/schema";
import { calculeazaStatus, istoricValori, obtineOverrideSezonierActiv, obtineSauCalculeazaValoareCurenta, progresProcent, type Directie, type Frecventa, type PunctIstoric, type StatusKpi, type SursaDate } from "@/lib/kpi-engine";

// Dashboard personal (Faza D) — generat AUTOMAT din KPI-urile atribuite
// profilului de angajat al utilizatorului curent (legătura app_users →
// angajati.app_user_id, setată de admin în Organizație & Echipă). Dacă
// utilizatorul nu are încă un profil de angajat, dashboardul arată un
// empty state explicativ, nu o pagină goală fără context.

export type KpiDashboardRand = {
  atribuireId: string;
  kpiDefinitieId: string;
  nume: string;
  unitate: string | null;
  directie: Directie;
  frecventa: Frecventa;
  pondere: number | null;
  targetMinim: number | null;
  targetNormal: number | null;
  targetStretch: number | null;
  valoare: number | null;
  sursa: "automat" | "manual" | null;
  progres: number | null;
  status: StatusKpi;
  istoric: PunctIstoric[];
  profilSezonierNume: string | null;
};

export type DashboardPersonal = {
  areProfil: boolean;
  angajatNume: string | null;
  kpiuri: KpiDashboardRand[];
  profileSezoniereActive: string[];
};

export const obtineDashboardPersonalAction = withOrgSession(async (ctx): Promise<DashboardPersonal> => {
  const [angajat] = await ctx.db
    .select({ id: angajati.id, nume: angajati.nume, prenume: angajati.prenume, appUserId: angajati.appUserId })
    .from(angajati)
    .where(and(eq(angajati.orgId, ctx.orgId), eq(angajati.appUserId, ctx.userId)))
    .limit(1);
  if (!angajat) return { areProfil: false, angajatNume: null, kpiuri: [], profileSezoniereActive: [] };

  const atribuiri = await ctx.db
    .select({
      atribuireId: kpiAtribuiri.id,
      kpiDefinitieId: kpiAtribuiri.kpiDefinitieId,
      nume: kpiDefinitii.nume,
      unitate: kpiDefinitii.unitate,
      directie: kpiDefinitii.directie,
      frecventa: kpiDefinitii.frecventa,
      sursaDate: kpiDefinitii.sursaDate,
      pondere: kpiAtribuiri.pondere,
      targetMinim: kpiAtribuiri.targetMinim,
      targetNormal: kpiAtribuiri.targetNormal,
      targetStretch: kpiAtribuiri.targetStretch,
    })
    .from(kpiAtribuiri)
    .innerJoin(kpiDefinitii, eq(kpiDefinitii.id, kpiAtribuiri.kpiDefinitieId))
    .where(and(eq(kpiAtribuiri.angajatId, angajat.id), eq(kpiAtribuiri.status, "activ")));

  const overrideSezonier = await obtineOverrideSezonierActiv(ctx.db, ctx.orgId);

  // Toate KPI-urile în paralel (aceeași conexiune); Promise.all păstrează ordinea.
  const kpiuri: KpiDashboardRand[] = await Promise.all(
    atribuiri.map(async (a) => {
      const sursaDate = (a.sursaDate as SursaDate | null) ?? null;
      const [{ valoare, sursa }, istoric] = await Promise.all([
        obtineSauCalculeazaValoareCurenta(ctx.db, ctx.orgId, angajat.id, a.kpiDefinitieId, angajat.appUserId, a.frecventa, sursaDate),
        istoricValori(ctx.db, angajat.id, a.kpiDefinitieId),
      ]);
      const override = overrideSezonier.get(a.kpiDefinitieId);
      const targetNormal = override?.targetOverride ?? a.targetNormal;
      return {
        atribuireId: a.atribuireId,
        kpiDefinitieId: a.kpiDefinitieId,
        nume: a.nume,
        unitate: a.unitate,
        directie: a.directie,
        frecventa: a.frecventa,
        pondere: override?.pondereOverride ?? a.pondere,
        targetMinim: a.targetMinim,
        targetNormal,
        targetStretch: a.targetStretch,
        valoare,
        sursa,
        progres: progresProcent(valoare, targetNormal, a.directie),
        status: calculeazaStatus(valoare, targetNormal, a.directie),
        istoric,
        profilSezonierNume: override?.profilNume ?? null,
      };
    }),
  );
  const profileSezoniereActive = [...new Set(kpiuri.map((k) => k.profilSezonierNume).filter((n): n is string => n !== null))];

  return { areProfil: true, angajatNume: `${angajat.nume} ${angajat.prenume ?? ""}`.trim(), kpiuri, profileSezoniereActive };
});
