import "server-only";

import { sql } from "drizzle-orm";
import { headers } from "next/headers";

import { db } from "@/lib/db";

// IP-ul clientului — pe Vercel, x-forwarded-for e setat de proxy-ul lor
// propriu (nu poate fi falsificat de vizitator); primul segment e cel real,
// restul sunt hop-uri intermediare. Fallback pe x-real-ip pentru alte medii.
export async function obtineIpClient(): Promise<string> {
  const h = await headers();
  const forwardedFor = h.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0]!.trim();
  return h.get("x-real-ip") ?? "necunoscut";
}

// Limitare de rată cu fereastră fixă — un singur UPSERT atomic
// (INSERT ... ON CONFLICT ... DO UPDATE ... RETURNING) evită race condition-uri
// între cereri concurente fără SELECT-then-UPDATE. Când fereastra curentă a
// expirat, contorul se resetează la 1 (fereastră nouă) în loc să se acumuleze
// la infinit. Politica RLS de pe auth_rate_limits e complet permisivă (vezi
// documentation/rls-setup.sql) — siguranța reală vine din acest UPSERT, nu din RLS.
export async function verificaLimitaRata(
  actiune: string,
  identificator: string,
  maxIncercari: number,
  fereastraMinute: number,
): Promise<boolean> {
  const rezultat = await db.execute<{ incercari: number }>(sql`
    insert into auth_rate_limits (actiune, identificator, incercari, fereastra_start)
    values (${actiune}, ${identificator}, 1, now())
    on conflict (actiune, identificator) do update set
      incercari = case
        when auth_rate_limits.fereastra_start < now() - (${fereastraMinute} * interval '1 minute')
          then 1
        else auth_rate_limits.incercari + 1
      end,
      fereastra_start = case
        when auth_rate_limits.fereastra_start < now() - (${fereastraMinute} * interval '1 minute')
          then now()
        else auth_rate_limits.fereastra_start
      end
    returning incercari
  `);
  const incercari = Number(rezultat[0]?.incercari ?? 0);
  return incercari <= maxIncercari;
}
