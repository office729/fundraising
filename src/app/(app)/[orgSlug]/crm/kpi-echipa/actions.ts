"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { type OrgContext, withOrgAdmin, withOrgSession } from "@/lib/auth/guard";
import { appUsers, crmKv, memberships } from "@/lib/db/schema";
import {
  esteManualKpi,
  KPI_LABEL,
  KPI_MANUAL,
  KPI_METRICE,
  numaraZileLucratoare,
  type KpiEchipa,
  type KpiMetric,
  type KpiPersonal,
  type KpiPersonalMetric,
  type KpiRow,
} from "@/lib/kpi-echipa";

// Țintele lunare (setate de admin) și contorul manual „+1" stau în crm_kv, per organizație
// (izolat prin RLS, ca restul datelor de tenant).
const TINTE_KEY = "kpi_tinte"; // { [userId]: { [metric]: număr } }
const LOG_KEY = "kpi_log"; // { [userId]: [{ ts, metric }] }

type Tinte = Record<string, Partial<Record<KpiMetric, number>>>;
type LogManual = Record<string, Array<{ ts: string; metric: string }>>;

async function citesteKv<T>(db: OrgContext["db"], orgId: string, path: string, gol: T): Promise<T> {
  const [row] = await db.select({ data: crmKv.data }).from(crmKv).where(and(eq(crmKv.orgId, orgId), eq(crmKv.path, path))).limit(1);
  return row?.data && typeof row.data === "object" ? (row.data as T) : gol;
}
async function scrieKv(db: OrgContext["db"], orgId: string, path: string, data: unknown) {
  await db
    .insert(crmKv)
    .values({ orgId, path, data, updatedAt: new Date() })
    .onConflictDoUpdate({ target: [crmKv.orgId, crmKv.path], set: { data, updatedAt: new Date() } });
}

const DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;
const ISO_LOCAL = (d: Date) => d.toLocaleDateString("en-CA");

// Cele 7 semnale automate, din activitatea reală din CRM — o singură interogare pivotată pe (utilizator, metrică).
// Fiecare rând-sursă are autorul + momentul; `org` e filtrat pe fiecare tabel (defensiv, pe lângă RLS).
function semnale(orgId: string) {
  return sql`
    select uid, metric, ts from (
      select updated_by uid, 'companii' metric, updated_at ts from companies where org_id = ${orgId} and deleted_at is null and updated_by is not null
      union all select created_by, 'contacte', created_at from contacts where org_id = ${orgId} and created_by is not null
      union all select initiator_id, 'apeluri', created_at from apeluri where org_id = ${orgId} and initiator_id is not null
      union all select created_by, 'sponsorizari', created_at from company_sponsorizari where org_id = ${orgId} and created_by is not null
      union all select created_by, 'notite', created_at from company_notite where org_id = ${orgId} and created_by is not null
      union all select by_user_id, 'etape', created_at from company_stage_log where org_id = ${orgId} and by_user_id is not null
      -- „Firme cu LinkedIn / Facebook adăugat”: firme DISTINCTE la care s-a adăugat un link NOU (companies.extra, vezi fisa-actions.ts).
      -- Dacă același om a adăugat ambele linkuri în aceeași zi, firma se numără o singură dată.
      union all select (extra->'linkedinAdaugat'->>'de')::uuid, 'linkuri', (extra->'linkedinAdaugat'->>'la')::timestamptz
        from companies where org_id = ${orgId} and deleted_at is null and jsonb_exists(coalesce(extra, '{}'::jsonb), 'linkedinAdaugat')
      union all select (extra->'facebookAdaugat'->>'de')::uuid, 'linkuri', (extra->'facebookAdaugat'->>'la')::timestamptz
        from companies where org_id = ${orgId} and deleted_at is null and jsonb_exists(coalesce(extra, '{}'::jsonb), 'facebookAdaugat')
          and not (jsonb_exists(extra, 'linkedinAdaugat')
            and extra->'linkedinAdaugat'->>'de' = extra->'facebookAdaugat'->>'de'
            and ((extra->'linkedinAdaugat'->>'la')::timestamptz at time zone 'Europe/Bucharest')::date = ((extra->'facebookAdaugat'->>'la')::timestamptz at time zone 'Europe/Bucharest')::date)
    ) s`;
}

async function membri(db: OrgContext["db"], orgId: string) {
  return db
    .select({ id: appUsers.id, name: appUsers.name, email: appUsers.email })
    .from(memberships)
    .innerJoin(appUsers, eq(appUsers.id, memberships.userId))
    .where(eq(memberships.orgId, orgId));
}

// KPI-ul întregii echipe pe o perioadă (implicit: luna curentă) — doar owner/admin.
export const getKpiEchipa = withOrgAdmin(async (ctx, range?: { de?: string; la?: string }): Promise<KpiEchipa> => {
  const dOk = range?.de && DATA_ISO.test(range.de) ? range.de : null;
  const lOk = range?.la && DATA_ISO.test(range.la) ? range.la : null;
  const eArbitrara = !!(dOk && lOk);
  const acum = new Date();
  const de = eArbitrara ? dOk! : `${acum.getFullYear()}-${String(acum.getMonth() + 1).padStart(2, "0")}-01`;
  const la = eArbitrara ? lOk! : ISO_LOCAL(acum);
  // Doar zile lucrătoare (L–V, fără sărbători legale); baza lunară = zilele lucrătoare reale ale lunii lui `de`.
  const zileLucratoare = numaraZileLucratoare(de, la);
  const refYm = de.slice(0, 7);
  const refEnd = ISO_LOCAL(new Date(Number(refYm.slice(0, 4)), Number(refYm.slice(5, 7)), 0));
  const bazaLunara = numaraZileLucratoare(`${refYm}-01`, refEnd);

  const dbRows = (await ctx.db.execute(sql`
    select uid, metric, count(*)::int n from (${semnale(ctx.orgId)}) x
    where ts >= ${de}::date and ts < (${la}::date + interval '1 day')
    group by uid, metric
  `)) as unknown as Array<{ uid: string; metric: KpiMetric; n: number }>;
  const realMap = new Map<string, Record<string, number>>();
  for (const r of dbRows) {
    const m = realMap.get(r.uid) ?? {};
    m[r.metric] = r.n;
    realMap.set(r.uid, m);
  }

  const log = await citesteKv<LogManual>(ctx.db, ctx.orgId, LOG_KEY, {});
  const d0 = new Date(de + "T00:00:00").getTime();
  const d1 = new Date(la + "T23:59:59").getTime();
  const tinte = await citesteKv<Tinte>(ctx.db, ctx.orgId, TINTE_KEY, {});

  const echipa = await membri(ctx.db, ctx.orgId);
  const rows: KpiRow[] = echipa
    .map((u) => {
      const rm = realMap.get(u.id) ?? {};
      const realizat = Object.fromEntries(KPI_METRICE.map((k) => [k, rm[k] ?? 0])) as Record<KpiMetric, number>;
      for (const k of KPI_MANUAL) realizat[k] = 0;
      for (const e of Array.isArray(log[u.id]) ? log[u.id] : []) {
        const t = new Date(e.ts).getTime();
        if (esteManualKpi(e.metric) && t >= d0 && t <= d1) realizat[e.metric] += 1;
      }
      const t = tinte[u.id] ?? {};
      const tintaLunara: Partial<Record<KpiMetric, number>> = {};
      for (const k of KPI_METRICE) if (typeof t[k] === "number" && t[k]! > 0) tintaLunara[k] = t[k];
      return { id: u.id, nume: u.name || u.email, realizat, tintaLunara };
    })
    .sort((a, b) => a.nume.localeCompare(b.nume, "ro"));

  return { perioada: { de, la }, eArbitrara, zileLucratoare, bazaLunara, rows };
});

// Salvează țintele LUNARE (doar owner/admin). tinte = { [userId]: { metric: număr } }.
export const salveazaKpiTinte = withOrgAdmin(async (ctx, tinte: Tinte): Promise<{ ok: true }> => {
  const idsMembri = new Set((await membri(ctx.db, ctx.orgId)).map((m) => m.id));
  const curat: Tinte = {};
  for (const [uid, m] of Object.entries(tinte ?? {})) {
    if (!idsMembri.has(uid) || !m || typeof m !== "object") continue;
    const per: Partial<Record<KpiMetric, number>> = {};
    for (const k of KPI_METRICE) {
      const v = Math.round(Number((m as Record<string, unknown>)[k]));
      if (Number.isFinite(v) && v > 0) per[k] = Math.min(100000, v);
    }
    if (Object.keys(per).length) curat[uid] = per;
  }
  await scrieKv(ctx.db, ctx.orgId, TINTE_KEY, curat);
  revalidatePath(`/${ctx.orgSlug}/crm/kpi-echipa`);
  return { ok: true };
});

// KPI-ul PROPRIU al utilizatorului logat — fiecare își vede doar datele lui.
export const getKpiPersonal = withOrgSession(async (ctx): Promise<KpiPersonal> => {
  const uid = ctx.userId;
  const acum = new Date();
  const an = String(acum.getFullYear());
  const lunaLabel = acum.toLocaleDateString("ro-RO", { month: "long", year: "numeric" });

  const rows = (await ctx.db.execute(sql`
    select metric,
      count(*) filter (where (ts at time zone 'Europe/Bucharest')::date = (now() at time zone 'Europe/Bucharest')::date)::int azi,
      count(*) filter (where ts >= date_trunc('week', now()))::int sapt,
      count(*) filter (where ts >= date_trunc('month', now()))::int luna,
      count(*) filter (where ts >= date_trunc('year', now()))::int an
    from (${semnale(ctx.orgId)}) x where uid = ${uid} group by metric
  `)) as unknown as Array<{ metric: string; azi: number; sapt: number; luna: number; an: number }>;
  const real = new Map(rows.map((r) => [r.metric, r]));

  // Începutul săptămânii (luni) și repere de zile lucrătoare pentru „ritm".
  const luni = new Date(acum);
  luni.setDate(acum.getDate() - ((acum.getDay() + 6) % 7));
  const luniIso = ISO_LOCAL(luni);
  const aziIso = ISO_LOCAL(acum);
  const lunaIso = aziIso.slice(0, 7);

  // Contor manual propriu: azi / săptămână / lună / an.
  const log = await citesteKv<LogManual>(ctx.db, ctx.orgId, LOG_KEY, {});
  const man: Record<string, { azi: number; sapt: number; luna: number; an: number }> = {};
  for (const e of Array.isArray(log[uid]) ? log[uid] : []) {
    const d = new Date(e.ts);
    if (Number.isNaN(d.getTime())) continue;
    const di = ISO_LOCAL(d);
    const b = (man[e.metric] ||= { azi: 0, sapt: 0, luna: 0, an: 0 });
    if (String(d.getFullYear()) === an) b.an += 1;
    if (di.slice(0, 7) === lunaIso) b.luna += 1;
    if (di >= luniIso) b.sapt += 1;
    if (di === aziIso) b.azi += 1;
  }

  const tinte = (await citesteKv<Tinte>(ctx.db, ctx.orgId, TINTE_KEY, {}))[uid] ?? {};

  const y = acum.getFullYear();
  const m = acum.getMonth();
  const monthStart = `${an}-${String(m + 1).padStart(2, "0")}-01`;
  const monthEnd = ISO_LOCAL(new Date(y, m + 1, 0));
  const zileLunaTotal = numaraZileLucratoare(monthStart, monthEnd) || 1;
  const zileLunaScurse = numaraZileLucratoare(monthStart, aziIso < monthEnd ? aziIso : monthEnd);
  const zileAnTotal = numaraZileLucratoare(`${an}-01-01`, `${an}-12-31`) || 1;
  const zileAnScurse = numaraZileLucratoare(`${an}-01-01`, aziIso);
  const vineri = new Date(luni);
  vineri.setDate(luni.getDate() + 4);
  const vineriIso = ISO_LOCAL(vineri);
  const zileSaptTotal = numaraZileLucratoare(luniIso, vineriIso) || 1;
  const zileSaptScurse = numaraZileLucratoare(luniIso, aziIso < vineriIso ? aziIso : vineriIso);

  const gol = { azi: 0, sapt: 0, luna: 0, an: 0 };
  let metrice: KpiPersonalMetric[] = KPI_METRICE.map((cheie) => {
    const manual = esteManualKpi(cheie);
    const r = manual ? man[cheie] ?? gol : real.get(cheie) ?? gol;
    const tl = tinte[cheie];
    return {
      cheie,
      label: KPI_LABEL[cheie],
      manual,
      azi: r.azi,
      sapt: r.sapt,
      luna: r.luna,
      an: r.an,
      tintaZi: tl ? Math.max(1, Math.round(tl / zileLunaTotal)) : null,
      tintaSapt: tl ? Math.max(1, Math.round((tl * zileSaptTotal) / zileLunaTotal)) : null,
      tintaLuna: tl ?? null,
      tintaAn: tl ? tl * 12 : null,
    };
  });
  // Cu ținte setate, vezi doar metricile tale; fără ținte, vezi producția (fără contoarele manuale, care n-au sens fără țintă).
  const cuTinta = metrice.filter((mt) => tinte[mt.cheie] != null);
  metrice = cuTinta.length ? cuTinta : metrice.filter((mt) => !mt.manual);

  return {
    nume: ctx.userName || ctx.userEmail || "",
    lunaLabel,
    an,
    paceSaptPct: Math.round((zileSaptScurse / zileSaptTotal) * 100),
    paceLunaPct: Math.round((zileLunaScurse / zileLunaTotal) * 100),
    paceAnPct: Math.round((zileAnScurse / zileAnTotal) * 100),
    areTinte: Object.keys(tinte).length > 0,
    metrice,
  };
});

// Contor manual „+1" pentru metricile fără sursă automată — fiecare își loghează propriile acțiuni.
export const logKpi = withOrgSession(async (ctx, metric: string): Promise<{ ok: true }> => {
  if (!esteManualKpi(metric)) throw new Error("Metrică fără contor manual.");
  const log = await citesteKv<LogManual>(ctx.db, ctx.orgId, LOG_KEY, {});
  const arr = Array.isArray(log[ctx.userId]) ? log[ctx.userId] : [];
  arr.unshift({ ts: new Date().toISOString(), metric });
  log[ctx.userId] = arr.slice(0, 5000);
  await scrieKv(ctx.db, ctx.orgId, LOG_KEY, log);
  revalidatePath(`/${ctx.orgSlug}/crm/kpi-echipa`);
  return { ok: true };
});

// Anulează ultima intrare de azi (dacă a apăsat din greșeală).
export const anuleazaKpi = withOrgSession(async (ctx, metric: string): Promise<{ ok: true }> => {
  const log = await citesteKv<LogManual>(ctx.db, ctx.orgId, LOG_KEY, {});
  const arr = Array.isArray(log[ctx.userId]) ? log[ctx.userId] : [];
  const azi = ISO_LOCAL(new Date());
  const idx = arr.findIndex((e) => e.metric === metric && ISO_LOCAL(new Date(e.ts)) === azi);
  if (idx >= 0) {
    arr.splice(idx, 1);
    log[ctx.userId] = arr;
    await scrieKv(ctx.db, ctx.orgId, LOG_KEY, log);
    revalidatePath(`/${ctx.orgSlug}/crm/kpi-echipa`);
  }
  return { ok: true };
});
