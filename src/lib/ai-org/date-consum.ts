import "server-only";

import { and, count, eq, gte, sql } from "drizzle-orm";

import { db as dbGlobal } from "@/lib/db";
import { aiConsum } from "@/lib/db/schema";
import { costMediu, estimareLuna, procentBuget, ultimeleZile, ziBucuresti, type ZiConsum } from "./consum";
import { citesteConfigAi } from "./consum-server";
import { cursUsdRon } from "./curs";

export type DateConsumAi = {
  conectat: boolean;
  bugetUsd: number | null;
  cursUsdRon: number | null;
  luna: { costUsd: number; apeluri: number; cautariWeb: number; tokeniIn: number; tokeniOut: number };
  estimareUsd: number;
  procent: number | null;
  costMediuUsd: number;
  peInstrument: { instrument: string; costUsd: number; apeluri: number; cautariWeb: number }[];
  zile: ZiConsum[];
  luni: { luna: string; costUsd: number; apeluri: number; tokeniIn: number; tokeniOut: number }[];
  azi: string;
};

// Fusul orar ca literal SQL (nu parametru): altfel Postgres vede două expresii diferite în SELECT și GROUP BY.
const TZ = sql.raw("'Europe/Bucharest'");
const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// Consumul AI al organizației. Lunile și zilele se socotesc în ora României.
export async function citesteDateConsum(ctx: { db: typeof dbGlobal; orgId: string }): Promise<DateConsumAi> {
  const ceas = sql`(${aiConsum.createdAt} at time zone ${TZ})`;
  const [cfg, curs, instrumente, perZi, perLuna] = await Promise.all([
    citesteConfigAi(ctx.db, ctx.orgId, false),
    cursUsdRon(),
    ctx.db
      .select({
        instrument: aiConsum.instrument,
        cost: sql<string>`coalesce(sum(${aiConsum.costUsd}), 0)`,
        apeluri: count(),
        cautari: sql<string>`coalesce(sum(${aiConsum.cautariWeb}), 0)`,
        tin: sql<string>`coalesce(sum(${aiConsum.tokeniIn} + ${aiConsum.tokeniCacheCitire} + ${aiConsum.tokeniCacheScriere}), 0)`,
        tout: sql<string>`coalesce(sum(${aiConsum.tokeniOut}), 0)`,
      })
      .from(aiConsum)
      .where(and(eq(aiConsum.orgId, ctx.orgId), sql`${ceas} >= date_trunc('month', now() at time zone ${TZ})`))
      .groupBy(aiConsum.instrument),
    ctx.db
      .select({ zi: sql<string>`to_char(${ceas}, 'YYYY-MM-DD')`, cost: sql<string>`coalesce(sum(${aiConsum.costUsd}), 0)`, apeluri: count() })
      .from(aiConsum)
      .where(and(eq(aiConsum.orgId, ctx.orgId), gte(aiConsum.createdAt, sql`now() - interval '34 days'`)))
      .groupBy(sql`to_char(${ceas}, 'YYYY-MM-DD')`),
    ctx.db
      .select({
        luna: sql<string>`to_char(${ceas}, 'YYYY-MM')`,
        cost: sql<string>`coalesce(sum(${aiConsum.costUsd}), 0)`,
        apeluri: count(),
        tin: sql<string>`coalesce(sum(${aiConsum.tokeniIn} + ${aiConsum.tokeniCacheCitire} + ${aiConsum.tokeniCacheScriere}), 0)`,
        tout: sql<string>`coalesce(sum(${aiConsum.tokeniOut}), 0)`,
      })
      .from(aiConsum)
      .where(and(eq(aiConsum.orgId, ctx.orgId), gte(aiConsum.createdAt, sql`now() - interval '13 months'`)))
      .groupBy(sql`to_char(${ceas}, 'YYYY-MM')`),
  ]);

  const azi = ziBucuresti(new Date());
  const peInstrument = instrumente
    .map((r) => ({ instrument: r.instrument, costUsd: num(r.cost), apeluri: r.apeluri, cautariWeb: num(r.cautari) }))
    .sort((a, b) => b.costUsd - a.costUsd);
  const luna = instrumente.reduce(
    (t, r) => ({ costUsd: t.costUsd + num(r.cost), apeluri: t.apeluri + r.apeluri, cautariWeb: t.cautariWeb + num(r.cautari), tokeniIn: t.tokeniIn + num(r.tin), tokeniOut: t.tokeniOut + num(r.tout) }),
    { costUsd: 0, apeluri: 0, cautariWeb: 0, tokeniIn: 0, tokeniOut: 0 },
  );
  return {
    conectat: cfg.conectat,
    bugetUsd: cfg.bugetUsd,
    cursUsdRon: curs,
    luna: { ...luna, costUsd: Math.round(luna.costUsd * 1e6) / 1e6 },
    estimareUsd: estimareLuna(luna.costUsd, azi),
    procent: procentBuget(luna.costUsd, cfg.bugetUsd),
    costMediuUsd: costMediu(luna.costUsd, luna.apeluri),
    peInstrument,
    zile: ultimeleZile(perZi.map((r) => ({ zi: r.zi, costUsd: num(r.cost), apeluri: r.apeluri })), azi, 31),
    luni: perLuna
      .map((r) => ({ luna: r.luna, costUsd: num(r.cost), apeluri: r.apeluri, tokeniIn: num(r.tin), tokeniOut: num(r.tout) }))
      .sort((a, b) => (a.luna < b.luna ? 1 : -1)),
    azi,
  };
}
