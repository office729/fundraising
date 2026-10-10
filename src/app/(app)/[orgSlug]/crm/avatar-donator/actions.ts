"use server";

import { and, eq, sql } from "drizzle-orm";

import { withOrgSession } from "@/lib/auth/guard";
import { construiesteAvatare, type RezultatAvatare } from "@/lib/avatar-donator/avatare-reale";
import { obtineDateAvatare } from "@/lib/avatar-donator/avatare-reale-db";
import { normalizeaza, type AvatarData, type StatisticiPlatforma } from "@/lib/avatar-donator/tipuri";
import { crmKv } from "@/lib/db/schema";
import { sectiuneSigura } from "@/lib/sectiune-sigura";
import { obtineSegmenteReale, type SegmentStat } from "@/lib/segmente-donatori";

// Documentul „Avatar donator" al organizației: un singur rând în crm_kv (izolat pe organizație prin RLS).
const CHEIE = "avatar_donator";

export const getAvatar = withOrgSession(async (ctx): Promise<{ data: AvatarData; stat: StatisticiPlatforma | null; segmente: SegmentStat[] | null; avatare: RezultatAvatare | null }> => {
  const [row] = await ctx.db.select({ data: crmKv.data }).from(crmKv).where(and(eq(crmKv.orgId, ctx.orgId), eq(crmKv.path, CHEIE))).limit(1);

  // Reper real din platformă: donațiile online reușite ale organizației. Sumele sunt NETE de rambursări, iar donațiile
  // unice sunt separate de încasările lunare (fiecare reînnoire de abonament e un rând), ca media/mediana să aibă sens.
  const [s] = (await ctx.db.execute(sql`
    with d as (
      select greatest(suma - suma_rambursata, 0) net, recurenta, stripe_subscription_id, abonament_activ, email_donator, created_at
      from fundraising_donations where org_id = ${ctx.orgId} and status = 'reusita'
    )
    select
      count(*) filter (where not recurenta)::int unice,
      count(distinct lower(email_donator)) filter (where email_donator is not null)::int donatori,
      coalesce(sum(net), 0)::bigint suma,
      coalesce(avg(net) filter (where not recurenta), 0)::float medie_unica,
      coalesce(percentile_cont(0.5) within group (order by net) filter (where not recurenta), 0)::float mediana_unica,
      count(*) filter (where not recurenta and created_at >= now() - interval '12 months')::int unice12,
      count(*) filter (where recurenta)::int incasari_rec,
      coalesce(percentile_cont(0.5) within group (order by net) filter (where recurenta), 0)::float mediana_lunara,
      count(distinct stripe_subscription_id) filter (where recurenta and abonament_activ)::int abonamente,
      coalesce(sum(net) filter (where recurenta), 0)::bigint suma_rec
    from d
  `)) as unknown as Array<{
    unice: number; donatori: number; suma: number; medie_unica: number; mediana_unica: number; unice12: number;
    incasari_rec: number; mediana_lunara: number; abonamente: number; suma_rec: number;
  }>;

  const stat: StatisticiPlatforma | null =
    s && (s.unice > 0 || s.incasari_rec > 0)
      ? {
          donatii: s.unice,
          donatoriUnici: s.donatori,
          suma: Number(s.suma),
          medieUnica: Math.round(s.medie_unica),
          medianaUnica: Math.round(s.mediana_unica),
          donatii12Luni: s.unice12,
          incasariRecurente: s.incasari_rec,
          medianaLunara: Math.round(s.mediana_lunara),
          abonamenteActive: s.abonamente,
          procentRecurent: Number(s.suma) > 0 ? Math.round((Number(s.suma_rec) / Number(s.suma)) * 100) : 0,
        }
      : null;
  // Segmentele reale ale donatorilor (secțiune secundară: dacă pică, fișa merge și fără ele).
  const segmente = await sectiuneSigura(ctx, "avatar-segmente", (db) => obtineSegmenteReale(db, ctx.orgId), null as SegmentStat[] | null);
  const data = normalizeaza(row?.data);
  // Avatarele din date reale (doar cifre agregate; secțiune secundară: dacă pică, pagina merge și fără ele).
  const canaleIntroduse = Object.values(data.canale).some((c) => c.urmaritori.trim() || c.reach30.trim() || c.engagement.trim());
  const avatare = await sectiuneSigura(ctx, "avatare-reale", async (db) => construiesteAvatare(await obtineDateAvatare(db, ctx.orgId, canaleIntroduse)), null as RezultatAvatare | null);
  return { data, stat, segmente, avatare };
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
  // Fișele de avatar (varianta simplă): aceleași limite defensive ca la chestionar.
  const taie = (r: Record<string, string>) => {
    for (const k of Object.keys(r)) r[k] = String(r[k] ?? "").slice(0, 4000);
  };
  taie(curat.rezumat);
  for (const lista of [curat.validari, ...curat.fiseExtra.map((f) => f.validari)]) {
    for (const v of lista) {
      v.persoana = v.persoana.slice(0, 120);
      v.nota = v.nota.slice(0, 500);
    }
  }
  for (const f of curat.fiseExtra) {
    taie(f.rezumat);
    f.nume = f.nume.slice(0, 120);
    f.donatieUnica = f.donatieUnica.slice(0, 40);
    f.lunar = f.lunar.slice(0, 40);
  }
  const actualizat = new Date().toISOString();
  curat.actualizat = actualizat;
  await ctx.db
    .insert(crmKv)
    .values({ orgId: ctx.orgId, path: CHEIE, data: curat, updatedAt: new Date() })
    .onConflictDoUpdate({ target: [crmKv.orgId, crmKv.path], set: { data: curat, updatedAt: new Date() } });
  return { ok: true, actualizat };
});
