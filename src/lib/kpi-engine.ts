import "server-only";

import { and, desc, eq, inArray, sql } from "drizzle-orm";

import type { OrgContext } from "@/lib/auth/guard";
import { sqlArray } from "@/lib/sql-array";
import { angajati, kpiAtribuiri, kpiDefinitii, kpiProfiluriSezoniere, kpiProfiluriSezoniereItemi, kpiValori, roluri } from "@/lib/db/schema";

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
      -- limitele perioadei sunt zile calendaristice din România: ancorate în Europe/Bucharest, nu în UTC (altfel activitatea
      -- dintre 00:00 și 03:00 pe 1 a lunii/săptămânii cădea în perioada anterioară)
      and ${sql.raw(cfg.dataCol)} >= (${periodStart}::date)::timestamp at time zone 'Europe/Bucharest'
      and ${sql.raw(cfg.dataCol)} < (${periodEndExclusive}::date)::timestamp at time zone 'Europe/Bucharest'
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

// "Azi"/"săptămâna asta"/"luna asta" trebuie să însemne ziua/săptămâna/luna
// din România, NU ziua serverului — majoritatea platformelor de hosting
// rulează cu TZ=UTC, deci fără fixare explicită, o activitate de după ora
// 21:00/22:00 România ar putea cădea în ziua/perioada greșită (deja a doua
// zi în UTC). Construim un Date ale cărui câmpuri UTC reprezintă exact ora
// de perete din București — restul funcției folosește DOAR getUTC*/Date.UTC,
// niciodată metodele locale (acelea ar depinde iar de TZ-ul procesului).
function dataBucuresti(d: Date): Date {
  const parti = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Bucharest",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (tip: string) => Number(parti.find((p) => p.type === tip)?.value ?? 0);
  return new Date(Date.UTC(get("year"), get("month") - 1, get("day"), get("hour") % 24, get("minute"), get("second")));
}

const ISO_UTC = (d: Date) => d.toISOString().slice(0, 10);

// Perioada curentă pentru o frecvență dată — folosită atât pentru calculul
// automat cât și pentru intrarea manuală implicită. "custom" cade pe lunar
// (interval personalizat per-atribuire e în afara scopului acestei faze).
export function perioadaCurenta(frecventa: Frecventa, acum: Date = new Date()): { start: string; endExclusiv: string } {
  const b = dataBucuresti(acum);

  if (frecventa === "zilnic") {
    const start = ISO_UTC(b);
    const end = new Date(b);
    end.setUTCDate(b.getUTCDate() + 1);
    return { start, endExclusiv: ISO_UTC(end) };
  }
  if (frecventa === "saptamanal") {
    const zi = (b.getUTCDay() + 6) % 7; // luni = 0
    const luni = new Date(b);
    luni.setUTCDate(b.getUTCDate() - zi);
    const lunUrm = new Date(luni);
    lunUrm.setUTCDate(luni.getUTCDate() + 7);
    return { start: ISO_UTC(luni), endExclusiv: ISO_UTC(lunUrm) };
  }
  if (frecventa === "trimestrial") {
    const trimestru = Math.floor(b.getUTCMonth() / 3);
    const start = new Date(Date.UTC(b.getUTCFullYear(), trimestru * 3, 1));
    const end = new Date(Date.UTC(b.getUTCFullYear(), trimestru * 3 + 3, 1));
    return { start: ISO_UTC(start), endExclusiv: ISO_UTC(end) };
  }
  if (frecventa === "anual") {
    return { start: `${b.getUTCFullYear()}-01-01`, endExclusiv: `${b.getUTCFullYear() + 1}-01-01` };
  }
  // lunar + custom (fallback)
  const start = new Date(Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), 1));
  const end = new Date(Date.UTC(b.getUTCFullYear(), b.getUTCMonth() + 1, 1));
  return { start: ISO_UTC(start), endExclusiv: ISO_UTC(end) };
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
  // "interval_optim" tratat ca egal_cu_target (distanță simetrică de la
  // target) — prea mult sau prea puțin sunt ambele "rău", la fel ca la un
  // target exact. Fără limite min/max separate de interval în schemă încă,
  // e aproximarea corectă conceptual, nu doar "mai mare e mai bine" (greșit
  // pentru un interval optim — ar ignora complet excesul).
  if (directie === "egal_cu_target" || directie === "interval_optim") {
    return Math.round((1 - Math.min(1, Math.abs(valoare - targetNormal) / targetNormal)) * 100);
  }
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

// --- Profiluri KPI sezoniere (Faza F) ----------------------------------
// Un profil sezonier se aplică ORG-WIDE pe durata lui, nu per atribuire:
// pentru KPI-urile incluse, targetul/ponderea din profil înlocuiesc temporar
// pe cele normale din kpi_atribuiri. După perioadă revine automat la normal
// — pur și simplu data curentă nu se mai potrivește intervalul, nimic de
// "dezactivat" manual. Un profil `recurent` se reactivează în fiecare an pe
// aceleași lună/zi (anul din dataStart/dataSfarsit e ignorat la comparație).

export type OverrideSezonier = { targetOverride: number | null; pondereOverride: number | null; profilNume: string };

function inIntervalSezonier(lunaZi: string, startLunaZi: string, endLunaZi: string): boolean {
  if (startLunaZi <= endLunaZi) return lunaZi >= startLunaZi && lunaZi <= endLunaZi;
  return lunaZi >= startLunaZi || lunaZi <= endLunaZi; // interval ce trece peste Anul Nou (ex. 20-12 → 10-01)
}

export async function obtineOverrideSezonierActiv(dbCtx: OrgContext["db"], orgId: string, acum: Date = new Date()): Promise<Map<string, OverrideSezonier>> {
  const azi = ISO_UTC(dataBucuresti(acum));
  const lunaZi = azi.slice(5);

  const profiluri = await dbCtx
    .select({ id: kpiProfiluriSezoniere.id, nume: kpiProfiluriSezoniere.nume, dataStart: kpiProfiluriSezoniere.dataStart, dataSfarsit: kpiProfiluriSezoniere.dataSfarsit, recurent: kpiProfiluriSezoniere.recurent })
    .from(kpiProfiluriSezoniere)
    .where(eq(kpiProfiluriSezoniere.orgId, orgId));

  const activeIds = profiluri
    .filter((p) => (p.recurent ? inIntervalSezonier(lunaZi, p.dataStart.slice(5), p.dataSfarsit.slice(5)) : azi >= p.dataStart && azi <= p.dataSfarsit))
    .map((p) => p.id);
  if (activeIds.length === 0) return new Map();

  const itemi = await dbCtx
    .select({ profilId: kpiProfiluriSezoniereItemi.profilId, kpiDefinitieId: kpiProfiluriSezoniereItemi.kpiDefinitieId, targetOverride: kpiProfiluriSezoniereItemi.targetOverride, pondereOverride: kpiProfiluriSezoniereItemi.pondereOverride })
    .from(kpiProfiluriSezoniereItemi)
    .where(inArray(kpiProfiluriSezoniereItemi.profilId, activeIds));

  const numeProfil = new Map(profiluri.map((p) => [p.id, p.nume]));
  const rezultat = new Map<string, OverrideSezonier>();
  for (const it of itemi) {
    rezultat.set(it.kpiDefinitieId, { targetOverride: it.targetOverride as number | null, pondereOverride: it.pondereOverride, profilNume: numeProfil.get(it.profilId) ?? "" });
  }
  return rezultat;
}

// --- Rezumate pe echipă (Faza E — dashboard Manager/Departament/Organizație) ---
// SPRE DEOSEBIRE de dashboard-ul personal (Faza D), care recalculează live
// KPI-urile automate la fiecare vizită, aici citim DOAR ultima valoare deja
// salvată în kpi_valori (din ultima vizită personală a fiecărui angajat sau
// din Atribuiri) — niciodată nu (re)calculăm pentru M angajați × N KPI pe o
// singură cerere. Motiv găsit la audit: bucla per-angajat × per-KPI, cu
// scriere la fiecare citire, nu scalează dincolo de câțiva angajați (vezi
// plan) — aici totul e DOAR 3 interogări în bloc, indiferent de mărimea
// echipei.

export type StareKpiAngajat = { nume: string; valoare: number | null; targetNormal: number | null; unitate: string | null; status: StatusKpi; progres: number | null; profilSezonierNume: string | null; pondere: number | null };
export type RezumatAngajat = {
  angajatId: string;
  nume: string;
  prenume: string | null;
  roleNume: string | null;
  kpiuri: StareKpiAngajat[];
  // Scor Mode 2: dacă cel puțin o atribuire are pondere setată, scorul e
  // media ponderată (Σ progres×pondere / Σpondere) — altfel cade pe media
  // simplă (Mode 1, echivalent cu ce calcula motorul înainte de Faza F).
  scorMediu: number | null;
  restante: number;
  finalizate: number;
};

export async function obtineRezumateAngajati(dbCtx: OrgContext["db"], orgId: string, angajatIds: string[]): Promise<RezumatAngajat[]> {
  if (angajatIds.length === 0) return [];

  const angajatiRows = await dbCtx
    .select({ id: angajati.id, nume: angajati.nume, prenume: angajati.prenume, roleId: angajati.roleId })
    .from(angajati)
    .where(and(eq(angajati.orgId, orgId), inArray(angajati.id, angajatIds)));

  const roleIds = [...new Set(angajatiRows.map((a) => a.roleId).filter((id): id is string => id !== null))];
  const roluriRows = roleIds.length ? await dbCtx.select({ id: roluri.id, nume: roluri.nume }).from(roluri).where(inArray(roluri.id, roleIds)) : [];
  const roluriMap = new Map(roluriRows.map((r) => [r.id, r.nume]));

  const atribuiriRows = await dbCtx
    .select({
      angajatId: kpiAtribuiri.angajatId,
      kpiDefinitieId: kpiAtribuiri.kpiDefinitieId,
      pondere: kpiAtribuiri.pondere,
      targetNormal: kpiAtribuiri.targetNormal,
      kpiNume: kpiDefinitii.nume,
      unitate: kpiDefinitii.unitate,
      directie: kpiDefinitii.directie,
    })
    .from(kpiAtribuiri)
    .innerJoin(kpiDefinitii, eq(kpiDefinitii.id, kpiAtribuiri.kpiDefinitieId))
    .where(and(eq(kpiAtribuiri.orgId, orgId), inArray(kpiAtribuiri.angajatId, angajatIds), eq(kpiAtribuiri.status, "activ")));

  // Cea mai recentă valoare per (angajat, kpi) — un singur DISTINCT ON, nu o
  // interogare pe fiecare pereche.
  const valoriRows = (await dbCtx.execute(sql`
    select distinct on (angajat_id, kpi_definitie_id) angajat_id, kpi_definitie_id, valoare
    from kpi_valori
    where org_id = ${orgId} and angajat_id = any(${sqlArray(angajatIds, "uuid")})
    order by angajat_id, kpi_definitie_id, perioada_start desc
  `)) as unknown as { angajat_id: string; kpi_definitie_id: string; valoare: number }[];
  const valoareMap = new Map(valoriRows.map((r) => [`${r.angajat_id}:${r.kpi_definitie_id}`, r.valoare]));

  const overrideSezonier = await obtineOverrideSezonierActiv(dbCtx, orgId);

  return angajatiRows.map((a) => {
    const atribuiri = atribuiriRows.filter((x) => x.angajatId === a.id);
    const kpiuri: StareKpiAngajat[] = atribuiri.map((x) => {
      const valoare = valoareMap.get(`${a.id}:${x.kpiDefinitieId}`) ?? null;
      const override = overrideSezonier.get(x.kpiDefinitieId);
      const targetNormal = override?.targetOverride ?? x.targetNormal;
      return {
        nume: x.kpiNume,
        valoare,
        targetNormal,
        unitate: x.unitate,
        status: calculeazaStatus(valoare, targetNormal, x.directie),
        progres: progresProcent(valoare, targetNormal, x.directie),
        profilSezonierNume: override?.profilNume ?? null,
        pondere: override?.pondereOverride ?? x.pondere,
      };
    });
    const cuTarget = kpiuri.filter((k) => k.progres !== null);
    const totalPondere = cuTarget.reduce((s, k) => s + (k.pondere ?? 0), 0);
    const scorMediu = !cuTarget.length
      ? null
      : totalPondere > 0
        ? Math.round(cuTarget.reduce((s, k) => s + Math.min(100, k.progres as number) * (k.pondere ?? 0), 0) / totalPondere)
        : Math.round(cuTarget.reduce((s, k) => s + Math.min(100, k.progres as number), 0) / cuTarget.length);
    return {
      angajatId: a.id,
      nume: a.nume,
      prenume: a.prenume,
      roleNume: a.roleId ? (roluriMap.get(a.roleId) ?? null) : null,
      kpiuri,
      scorMediu,
      restante: kpiuri.filter((k) => k.status === "restant").length,
      finalizate: kpiuri.filter((k) => k.status === "finalizat").length,
    };
  });
}
