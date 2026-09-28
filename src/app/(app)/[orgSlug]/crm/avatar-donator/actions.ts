"use server";

import { and, eq, sql } from "drizzle-orm";

import { withOrgSession } from "@/lib/auth/guard";
import { normalizeaza, type AvatarData, type StatisticiPlatforma } from "@/lib/avatar-donator/tipuri";
import { crmKv } from "@/lib/db/schema";

// Documentul „Avatar donator" al organizației: un singur rând în crm_kv (izolat pe organizație prin RLS).
const CHEIE = "avatar_donator";

export const getAvatar = withOrgSession(async (ctx): Promise<{ data: AvatarData; stat: StatisticiPlatforma | null }> => {
  const [row] = await ctx.db.select({ data: crmKv.data }).from(crmKv).where(and(eq(crmKv.orgId, ctx.orgId), eq(crmKv.path, CHEIE))).limit(1);

  // Reper real din platformă: donațiile online reușite ale organizației.
  const [s] = (await ctx.db.execute(sql`
    select
      count(*)::int donatii,
      count(distinct lower(email_donator)) filter (where email_donator is not null)::int unici,
      coalesce(sum(suma), 0)::bigint suma,
      coalesce(avg(suma), 0)::float medie,
      coalesce(percentile_cont(0.5) within group (order by suma), 0)::float mediana,
      count(*) filter (where created_at >= now() - interval '12 months')::int d12
    from fundraising_donations where org_id = ${ctx.orgId} and status = 'reusita'
  `)) as unknown as Array<{ donatii: number; unici: number; suma: number; medie: number; mediana: number; d12: number }>;

  const stat: StatisticiPlatforma | null =
    s && s.donatii > 0
      ? { donatii: s.donatii, donatoriUnici: s.unici, suma: Number(s.suma), medie: Math.round(s.medie), mediana: Math.round(s.mediana), donatii12Luni: s.d12 }
      : null;
  return { data: normalizeaza(row?.data), stat };
});

export const salveazaAvatar = withOrgSession(async (ctx, data: AvatarData): Promise<{ ok: true; actualizat: string }> => {
  const curat = normalizeaza(data);
  // Limite defensive (câmpuri text): evită documente uriașe.
  for (const r of Object.values(curat.raspunsuri)) {
    r.text = r.text.slice(0, 4000);
    r.variante = r.variante.slice(0, 500);
    r.perioada = r.perioada.slice(0, 120);
    r.responsabil = r.responsabil.slice(0, 120);
  }
  const actualizat = new Date().toISOString();
  curat.actualizat = actualizat;
  await ctx.db
    .insert(crmKv)
    .values({ orgId: ctx.orgId, path: CHEIE, data: curat, updatedAt: new Date() })
    .onConflictDoUpdate({ target: [crmKv.orgId, crmKv.path], set: { data: curat, updatedAt: new Date() } });
  return { ok: true, actualizat };
});
