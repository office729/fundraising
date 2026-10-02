import "server-only";

import { and, desc, eq, sql } from "drizzle-orm";

import type { OrgContext } from "@/lib/auth/guard";
import { kpiValori } from "@/lib/db/schema";

// Motorul KPI (Faza C) — calculează valori AUTOMATE pentru KPI-urile legate
// de o sursă de date reală (sursaDate.tip !== 'manual'), din activitatea deja
// existentă în CRM — nicio dublă introducere de date.
//
// Un singur adaptor REAL e conectat acum: 'crm' (cele 6 semnale deja folosite
// de modulul vechi kpi-echipa — companii/contacte/apeluri/sponsorizari/
// notite/etape, verificate coloană cu coloană). Restul tipurilor de sursă
// (task/proiect/donatori/voluntari/beneficiari/formular/financiar/eveniment/
// api_extern) întorc null ("sursă încă neconectată") în loc să ghicească
// o schemă nesigură — un KPI "automat" care ar calcula greșit, tăcut, e mai
// rău decât unul care cere completare manuală până se conectează sursa reală.

export type SursaDate = {
  tip: "crm" | "task" | "proiect" | "donatori" | "companii" | "voluntari" | "beneficiari" | "formular" | "financiar" | "eveniment" | "manual" | "api_extern";
  metric?: string;
  filtru?: string;
  agregare?: string;
};

const TABELE_CRM: Record<string, { tabel: string; actorCol: string; dataCol: string; filtruSuplimentar?: string }> = {
  companii: { tabel: "companies", actorCol: "updated_by", dataCol: "updated_at", filtruSuplimentar: "deleted_at is null" },
  contacte: { tabel: "contacts", actorCol: "created_by", dataCol: "created_at" },
  apeluri: { tabel: "apeluri", actorCol: "initiator_id", dataCol: "created_at" },
  sponsorizari: { tabel: "company_sponsorizari", actorCol: "created_by", dataCol: "created_at" },
  notite: { tabel: "company_notite", actorCol: "created_by", dataCol: "created_at" },
  etape: { tabel: "company_stage_log", actorCol: "by_user_id", dataCol: "created_at" },
};

export const METRICI_CRM_DISPONIBILE = Object.keys(TABELE_CRM);

// `cfg` vine STRICT din TABELE_CRM (allowlist proprie, nu din input extern) —
// sql.raw e sigur aici, numele de tabel/coloană nu ating niciodată un string
// primit de la client.
function queryCrm(cfg: (typeof TABELE_CRM)[string], orgId: string, appUserId: string, periodStart: string, periodEndExclusive: string) {
  const filtru = cfg.filtruSuplimentar ? sql.raw(`and ${cfg.filtruSuplimentar}`) : sql``;
  return sql`
    select count(*)::int as n from ${sql.raw(cfg.tabel)}
    where org_id = ${orgId} and ${sql.raw(cfg.actorCol)} = ${appUserId}
      and ${sql.raw(cfg.dataCol)} >= ${periodStart}::date and ${sql.raw(cfg.dataCol)} < ${periodEndExclusive}::date
      ${filtru}
  `;
}

// Întoarce null = "nu se poate calcula automat" (sursă neconectată SAU
// angajatul nu are cont de login) — apelantul cade pe completare manuală,
// niciodată nu afișează 0 ca și cum ar fi un rezultat real calculat.
export async function calculeazaValoareAutomata(
  dbCtx: OrgContext["db"],
  orgId: string,
  sursaDate: SursaDate | null,
  appUserId: string | null,
  periodStart: string,
  periodEndExclusive: string,
): Promise<number | null> {
  if (!appUserId || !sursaDate || sursaDate.tip === "manual") return null;
  if (sursaDate.tip === "crm" && sursaDate.metric && sursaDate.metric in TABELE_CRM) {
    const rows = (await dbCtx.execute(queryCrm(TABELE_CRM[sursaDate.metric], orgId, appUserId, periodStart, periodEndExclusive))) as unknown as { n: number }[];
    return rows[0]?.n ?? 0;
  }
  return null;
}

export type Frecventa = "zilnic" | "saptamanal" | "lunar" | "trimestrial" | "anual" | "custom";

const ISO_LOCAL = (d: Date) => d.toLocaleDateString("en-CA");

// Perioada curentă pentru o frecvență dată — folosită atât pentru calculul
// automat cât și pentru intrarea manuală implicită. "custom" cade pe lunar
// (interval personalizat per-atribuire e în afara scopului acestei faze).
export function perioadaCurenta(frecventa: Frecventa, acum: Date = new Date()): { start: string; endExclusiv: string } {
  if (frecventa === "zilnic") {
    const start = ISO_LOCAL(acum);
    const end = ISO_LOCAL(new Date(acum.getTime() + 24 * 60 * 60 * 1000));
    return { start, endExclusiv: end };
  }
  if (frecventa === "saptamanal") {
    const zi = (acum.getDay() + 6) % 7; // luni = 0
    const luni = new Date(acum);
    luni.setDate(acum.getDate() - zi);
    const lunUrm = new Date(luni);
    lunUrm.setDate(luni.getDate() + 7);
    return { start: ISO_LOCAL(luni), endExclusiv: ISO_LOCAL(lunUrm) };
  }
  if (frecventa === "trimestrial") {
    const trimestru = Math.floor(acum.getMonth() / 3);
    const start = new Date(acum.getFullYear(), trimestru * 3, 1);
    const end = new Date(acum.getFullYear(), trimestru * 3 + 3, 1);
    return { start: ISO_LOCAL(start), endExclusiv: ISO_LOCAL(end) };
  }
  if (frecventa === "anual") {
    return { start: `${acum.getFullYear()}-01-01`, endExclusiv: `${acum.getFullYear() + 1}-01-01` };
  }
  // lunar + custom (fallback)
  const start = new Date(acum.getFullYear(), acum.getMonth(), 1);
  const end = new Date(acum.getFullYear(), acum.getMonth() + 1, 1);
  return { start: ISO_LOCAL(start), endExclusiv: ISO_LOCAL(end) };
}

// --- Status & progres (Faza D — KPI Card) -----------------------------

export type Directie = "mai_mare_mai_bine" | "mai_mic_mai_bine" | "egal_cu_target" | "interval_optim";
export type StatusKpi = "neinceput" | "in_grafic" | "necesita_atentie" | "restant" | "finalizat";

// Progresul e exprimat mereu ca "procent spre target" — pentru direcția
// inversă (mai mic e mai bine), un progres bun înseamnă valoare SUB target,
// nu o scădere liniară. 12 ore când targetul e "sub 24 ore" = depășit, nu
// doar atins pe jumătate.
export function progresProcent(valoare: number | null, targetNormal: number | null, directie: Directie): number | null {
  if (valoare === null || targetNormal === null || targetNormal === 0) return null;
  if (directie === "mai_mic_mai_bine") return Math.round(Math.min(2, targetNormal / Math.max(valoare, 0.0001)) * 100);
  if (directie === "egal_cu_target") return Math.round((1 - Math.min(1, Math.abs(valoare - targetNormal) / targetNormal)) * 100);
  return Math.round(Math.min(2, valoare / targetNormal) * 100);
}

export function calculeazaStatus(valoare: number | null, targetNormal: number | null, directie: Directie): StatusKpi {
  if (valoare === null) return "neinceput";
  const progres = progresProcent(valoare, targetNormal, directie);
  if (progres === null) return "in_grafic"; // fără target — doar se afișează valoarea, fără evaluare
  if (progres >= 100) return "finalizat";
  if (progres >= 70) return "in_grafic";
  if (progres >= 40) return "necesita_atentie";
  return "restant";
}

// Valoarea perioadei CURENTE — calculează automat (dacă sursa e conectată) și
// o persistă, altfel citește ultima valoare manuală salvată pentru perioadă.
// Reutilizat atât de pagina de Atribuiri cât și de Dashboardul personal, ca
// cele două să arate mereu aceeași cifră.
export async function obtineSauCalculeazaValoareCurenta(
  dbCtx: OrgContext["db"],
  orgId: string,
  angajatId: string,
  kpiDefinitieId: string,
  appUserId: string | null,
  frecventa: Frecventa,
  sursaDate: SursaDate | null,
): Promise<{ valoare: number | null; sursa: "automat" | "manual" | null; perioadaStart: string }> {
  const { start, endExclusiv } = perioadaCurenta(frecventa);

  if (sursaDate && sursaDate.tip !== "manual") {
    const valoareAutomata = await calculeazaValoareAutomata(dbCtx, orgId, sursaDate, appUserId, start, endExclusiv);
    if (valoareAutomata !== null) {
      await dbCtx
        .insert(kpiValori)
        .values({ orgId, angajatId, kpiDefinitieId, perioadaStart: start, perioadaTip: frecventa, valoare: valoareAutomata, sursa: "automat" })
        .onConflictDoUpdate({
          target: [kpiValori.angajatId, kpiValori.kpiDefinitieId, kpiValori.perioadaStart, kpiValori.perioadaTip],
          set: { valoare: valoareAutomata, sursa: "automat", createdAt: new Date() },
        });
      return { valoare: valoareAutomata, sursa: "automat", perioadaStart: start };
    }
  }

  const [existenta] = await dbCtx
    .select({ valoare: kpiValori.valoare, sursa: kpiValori.sursa })
    .from(kpiValori)
    .where(and(eq(kpiValori.angajatId, angajatId), eq(kpiValori.kpiDefinitieId, kpiDefinitieId), eq(kpiValori.perioadaStart, start), eq(kpiValori.perioadaTip, frecventa)))
    .limit(1);
  return { valoare: existenta?.valoare ?? null, sursa: existenta?.sursa ?? null, perioadaStart: start };
}

export type PunctIstoric = { perioadaStart: string; valoare: number };

// Ultimele N perioade înregistrate (automat sau manual) pentru un KPI — sursa
// pentru sparkline-ul din KpiCard; întoarce [] dacă nu există încă istoric
// (normal pentru un KPI nou, Trend arată un empty state, nu un grafic gol).
export async function istoricValori(dbCtx: OrgContext["db"], angajatId: string, kpiDefinitieId: string, limita = 6): Promise<PunctIstoric[]> {
  const rows = await dbCtx
    .select({ perioadaStart: kpiValori.perioadaStart, valoare: kpiValori.valoare })
    .from(kpiValori)
    .where(and(eq(kpiValori.angajatId, angajatId), eq(kpiValori.kpiDefinitieId, kpiDefinitieId)))
    .orderBy(desc(kpiValori.perioadaStart))
    .limit(limita);
  return rows.reverse();
}
