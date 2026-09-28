"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { type OrgContext, withOrgAdmin } from "@/lib/auth/guard";
import { crmKv } from "@/lib/db/schema";
import { numaraZileLucratoare } from "@/lib/kpi-echipa";
import {
  campAplicabil,
  OBI_CAMPURI,
  OBI_MECANISME,
  type ObiAnual,
  type ObiCamp,
  type ObiLunar,
  type ObiMecanism,
  type ObiMecFull,
  type ObiectiveOrg,
  type TendintaOrg,
} from "@/lib/kpi-obiective";

// Obiectivele organizației stau în crm_kv 'kpi_obiective', izolat pe organizație:
// { obiLunar, obiAnual, realManual: { "YYYY-MM": { f230: { suma } } } }. Doar owner/admin le văd și le editează.
const OBI_KEY = "kpi_obiective";
const MECANISME = OBI_MECANISME.map((m) => m.key);
const ISO_LOCAL = (d: Date) => d.toLocaleDateString("en-CA");

type Stocat = { obiLunar?: ObiLunar; obiAnual?: ObiAnual; realManual?: Record<string, ObiLunar> };

async function citeste(db: OrgContext["db"], orgId: string): Promise<Stocat> {
  const [row] = await db.select({ data: crmKv.data }).from(crmKv).where(and(eq(crmKv.orgId, orgId), eq(crmKv.path, OBI_KEY))).limit(1);
  return row?.data && typeof row.data === "object" ? (row.data as Stocat) : {};
}
async function scrie(db: OrgContext["db"], orgId: string, data: Stocat) {
  await db
    .insert(crmKv)
    .values({ orgId, path: OBI_KEY, data, updatedAt: new Date() })
    .onConflictDoUpdate({ target: [crmKv.orgId, crmKv.path], set: { data, updatedAt: new Date() } });
}

const golLunar = (): ObiLunar => ({ d177: {}, mec20: {}, f230: {} });
const golFull = (): ObiMecFull => {
  const z = () => ({ suma: 0, apeluri: 0, inregistrari: 0 });
  return { d177: z(), mec20: z(), f230: z() };
};
function lunaAnt(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 2, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
const ultimaZi = (ym: string) => ISO_LOCAL(new Date(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)), 0));

// Realizat FINAL pe o lună: sume + număr de sponsorizări pe D177/20% (din sponsorizările înregistrate,
// pe firmele marcate cu mecanismul respectiv), apeluri către acele firme, formulare 230 primite,
// iar suma 230 vine manual din blob.
async function realizatLuna(ctx: OrgContext, ym: string, stocat: Stocat): Promise<ObiMecFull> {
  const out = golFull();
  const start = `${ym}-01`;
  const end = ultimaZi(ym);

  const [spons] = (await ctx.db.execute(sql`
    select
      coalesce(sum(s.suma) filter (where c.d177), 0)::bigint d177_suma,
      count(*) filter (where c.d177)::int d177_n,
      coalesce(sum(s.suma) filter (where c.mec20), 0)::bigint mec20_suma,
      count(*) filter (where c.mec20)::int mec20_n
    from company_sponsorizari s join companies c on c.id = s.company_id
    where s.org_id = ${ctx.orgId} and c.deleted_at is null and s.data >= ${start}::date and s.data <= ${end}::date
  `)) as unknown as Array<{ d177_suma: number; d177_n: number; mec20_suma: number; mec20_n: number }>;
  out.d177.suma = Number(spons?.d177_suma ?? 0);
  out.d177.inregistrari = spons?.d177_n ?? 0;
  out.mec20.suma = Number(spons?.mec20_suma ?? 0);
  out.mec20.inregistrari = spons?.mec20_n ?? 0;

  const [apeluri] = (await ctx.db.execute(sql`
    select
      count(*) filter (where c.d177)::int d177,
      count(*) filter (where c.mec20)::int mec20
    from apeluri a join companies c on c.id = a.company_id
    where a.org_id = ${ctx.orgId} and a.created_at >= ${start}::date and a.created_at < (${end}::date + interval '1 day')
  `)) as unknown as Array<{ d177: number; mec20: number }>;
  out.d177.apeluri = apeluri?.d177 ?? 0;
  out.mec20.apeluri = apeluri?.mec20 ?? 0;

  const [f230] = (await ctx.db.execute(sql`
    select count(*)::int n from formular230_submissions
    where org_id = ${ctx.orgId} and created_at >= ${start}::date and created_at < (${end}::date + interval '1 day')
  `)) as unknown as Array<{ n: number }>;
  out.f230.inregistrari = f230?.n ?? 0;
  out.f230.suma = Number((stocat.realManual?.[ym]?.f230 as { suma?: number } | undefined)?.suma ?? 0);
  return out;
}

export const getObiective = withOrgAdmin(async (ctx, range?: { de?: string }): Promise<ObiectiveOrg> => {
  const dOk = range?.de && /^\d{4}-\d{2}-\d{2}$/.test(range.de) ? range.de : null;
  const acum = new Date();
  const luna = dOk ? dOk.slice(0, 7) : `${acum.getFullYear()}-${String(acum.getMonth() + 1).padStart(2, "0")}`;
  const an = luna.slice(0, 4);
  const monthStart = `${luna}-01`;
  const monthEnd = ultimaZi(luna);
  const lunaLabel = new Date(monthStart + "T12:00:00").toLocaleDateString("ro-RO", { month: "long", year: "numeric" });
  const stocat = await citeste(ctx.db, ctx.orgId);

  const [realizat, realizatPrev, anual] = await Promise.all([
    realizatLuna(ctx, luna, stocat),
    realizatLuna(ctx, lunaAnt(luna), stocat),
    ctx.db.execute(sql`
      select
        coalesce((select sum(s.suma) from company_sponsorizari s join companies c on c.id = s.company_id
          where s.org_id = ${ctx.orgId} and c.deleted_at is null and extract(year from s.data) = ${Number(an)}), 0)::bigint financiar,
        (select count(distinct s.company_id) from company_sponsorizari s join companies c on c.id = s.company_id
          where s.org_id = ${ctx.orgId} and c.deleted_at is null and extract(year from s.data) = ${Number(an)})::int firme,
        (select count(*) from formular230_submissions where org_id = ${ctx.orgId} and extract(year from created_at) = ${Number(an)})::int formulare230
    `) as unknown as Promise<Array<{ financiar: number; firme: number; formulare230: number }>>,
  ]);

  // Ritm = zile lucrătoare scurse ÷ total (fără weekend/sărbători), pe lună și pe an.
  const azi = ISO_LOCAL(acum);
  const zileTotal = numaraZileLucratoare(monthStart, monthEnd);
  const capEnd = azi < monthEnd ? azi : monthEnd;
  const zileScurse = azi < monthStart ? 0 : numaraZileLucratoare(monthStart, capEnd);
  const yStart = `${an}-01-01`;
  const yEnd = `${an}-12-31`;
  const totalY = numaraZileLucratoare(yStart, yEnd);
  const scurseY = azi < yStart ? 0 : numaraZileLucratoare(yStart, azi < yEnd ? azi : yEnd);

  return {
    luna,
    lunaLabel,
    an,
    obiLunar: { ...golLunar(), ...(stocat.obiLunar ?? {}) },
    obiAnual: stocat.obiAnual ?? {},
    realManual: { ...golLunar(), ...(stocat.realManual?.[luna] ?? {}) },
    realizat,
    realizatPrev,
    autoAnual: { financiar: Number(anual[0]?.financiar ?? 0), firme: anual[0]?.firme ?? 0, formulare230: anual[0]?.formulare230 ?? 0 },
    pace: {
      lunarPct: zileTotal ? Math.round((zileScurse / zileTotal) * 100) : 0,
      anualPct: totalY ? Math.round((scurseY / totalY) * 100) : 0,
      zileScurse,
      zileTotal,
    },
  };
});

const numarPozitiv = (v: unknown) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n > 0 ? Math.min(1_000_000_000, n) : undefined;
};
function curataLunar(src: ObiLunar): ObiLunar {
  const out = golLunar();
  for (const mec of MECANISME) {
    const m = (src?.[mec] ?? {}) as Record<string, unknown>;
    for (const camp of OBI_CAMPURI) {
      if (!campAplicabil(mec as ObiMecanism, camp.key)) continue;
      const v = numarPozitiv(m[camp.key]);
      if (v !== undefined) out[mec as ObiMecanism][camp.key as ObiCamp] = v;
    }
  }
  return out;
}

// Salvează obiectivele lunare + realizatul manual al lunii (suma 230). Obiectivele anuale se editează separat.
export const salveazaObiective = withOrgAdmin(
  async (ctx, input: { luna: string; obiLunar: ObiLunar; realManualLuna: ObiLunar }): Promise<{ ok: true }> => {
    if (!/^\d{4}-\d{2}$/.test(input.luna ?? "")) throw new Error("Lună invalidă.");
    const stocat = await citeste(ctx.db, ctx.orgId);
    const realManual = { ...(stocat.realManual ?? {}) };
    realManual[input.luna] = curataLunar(input.realManualLuna);
    await scrie(ctx.db, ctx.orgId, { obiLunar: curataLunar(input.obiLunar), obiAnual: stocat.obiAnual ?? {}, realManual });
    revalidatePath(`/${ctx.orgSlug}/crm/kpi-echipa`);
    return { ok: true };
  },
);

// Editează UN obiectiv anual direct de pe card. Valoare 0/gol = șterge obiectivul.
export const setObiectivAnual = withOrgAdmin(async (ctx, cheie: "financiar" | "firme" | "formulare230", valoare: number): Promise<{ ok: true }> => {
  if (!["financiar", "firme", "formulare230"].includes(cheie)) throw new Error("Obiectiv necunoscut.");
  const stocat = await citeste(ctx.db, ctx.orgId);
  const obiAnual: ObiAnual = { ...(stocat.obiAnual ?? {}) };
  const v = Math.round(Number(valoare));
  if (Number.isFinite(v) && v > 0) obiAnual[cheie] = Math.min(100_000_000_000, v);
  else delete obiAnual[cheie];
  await scrie(ctx.db, ctx.orgId, { obiLunar: stocat.obiLunar ?? golLunar(), obiAnual, realManual: stocat.realManual ?? {} });
  revalidatePath(`/${ctx.orgSlug}/crm/kpi-echipa`);
  return { ok: true };
});

// Tendință pe ultimele 6 luni — serii lunare pe organizație.
export const getTendinta = withOrgAdmin(async (ctx): Promise<TendintaOrg> => {
  const acum = new Date();
  const luni: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(Date.UTC(acum.getFullYear(), acum.getMonth() - i, 1));
    luni.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  }
  const start = `${luni[0]}-01`;
  const idx = new Map(luni.map((m, i) => [m, i]));
  const serie = (rows: Array<{ ym: string; n: number | string }>) => {
    const v = luni.map(() => 0);
    for (const r of rows) if (idx.has(r.ym)) v[idx.get(r.ym)!] = Number(r.n ?? 0);
    return v;
  };
  type Rand = Array<{ ym: string; n: number | string }>;
  const [suma, spons, f230, apeluri, contacte, donatii] = await Promise.all([
    ctx.db.execute(sql`select to_char(s.data, 'YYYY-MM') ym, sum(s.suma)::bigint n from company_sponsorizari s join companies c on c.id = s.company_id
      where s.org_id = ${ctx.orgId} and c.deleted_at is null and s.data >= ${start}::date group by ym`) as unknown as Promise<Rand>,
    ctx.db.execute(sql`select to_char(s.data, 'YYYY-MM') ym, count(*)::int n from company_sponsorizari s join companies c on c.id = s.company_id
      where s.org_id = ${ctx.orgId} and c.deleted_at is null and s.data >= ${start}::date group by ym`) as unknown as Promise<Rand>,
    ctx.db.execute(sql`select to_char(created_at, 'YYYY-MM') ym, count(*)::int n from formular230_submissions
      where org_id = ${ctx.orgId} and created_at >= ${start}::date group by ym`) as unknown as Promise<Rand>,
    ctx.db.execute(sql`select to_char(created_at, 'YYYY-MM') ym, count(*)::int n from apeluri
      where org_id = ${ctx.orgId} and created_at >= ${start}::date group by ym`) as unknown as Promise<Rand>,
    ctx.db.execute(sql`select to_char(created_at, 'YYYY-MM') ym, count(*)::int n from contacts
      where org_id = ${ctx.orgId} and created_at >= ${start}::date group by ym`) as unknown as Promise<Rand>,
    ctx.db.execute(sql`select to_char(created_at, 'YYYY-MM') ym, coalesce(sum(suma), 0)::bigint n from fundraising_donations
      where org_id = ${ctx.orgId} and status = 'reusita' and created_at >= ${start}::date group by ym`) as unknown as Promise<Rand>,
  ]);

  return {
    luni,
    serii: [
      { cheie: "suma", label: "Sumă sponsorizată", bani: true, valori: serie(suma) },
      { cheie: "spons", label: "Sponsorizări înregistrate", valori: serie(spons) },
      { cheie: "donatii", label: "Donații online", bani: true, valori: serie(donatii) },
      { cheie: "f230", label: "Formulare 230", valori: serie(f230) },
      { cheie: "apeluri", label: "Apeluri", valori: serie(apeluri) },
      { cheie: "contacte", label: "Contacte adăugate", valori: serie(contacte) },
    ],
  };
});
