import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { and, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { donatoriReali } from "@/lib/db/schema";

// Link de dezabonare din emailurile de campanie (Formular 230 etc.) — semnat
// HMAC, fără stare: nu ne trebuie un tabel de tokeni. Semnătura leagă
// (organizație, email), deci un link nu poate fi refolosit pentru altă adresă.
// Cheia e ORG_SECRETS_KEY (deja obligatorie în platformă), cu prefix de scop —
// aceeași cheie nu semnează niciun alt fel de token.

function semnatura(orgId: string, email: string): string {
  const cheie = process.env.ORG_SECRETS_KEY;
  if (!cheie) throw new Error("ORG_SECRETS_KEY lipsește — nu se pot semna linkuri de dezabonare.");
  return createHmac("sha256", cheie).update(`dezabonare:${orgId}:${email.toLowerCase()}`).digest("base64url");
}

export function linkDezabonare(baseUrl: string, orgId: string, email: string): string {
  const e = Buffer.from(email.toLowerCase()).toString("base64url");
  return `${baseUrl}/dezabonare?o=${encodeURIComponent(orgId)}&e=${e}&t=${semnatura(orgId, email)}`;
}

// Întoarce emailul doar dacă semnătura e validă.
export function verificaLinkDezabonare(orgId: string | null, e: string | null, t: string | null): string | null {
  if (!orgId || !e || !t) return null;
  let email: string;
  try {
    email = Buffer.from(e, "base64url").toString("utf8");
  } catch {
    return null;
  }
  if (!email || email.length > 320) return null;
  const asteptat = Buffer.from(semnatura(orgId, email));
  const primit = Buffer.from(t);
  return asteptat.length === primit.length && timingSafeEqual(asteptat, primit) ? email : null;
}

// Marchează donatorul ca dezabonat de la emailurile de campanie. Idempotent
// (păstrează prima dată de dezabonare). Rută publică, fără sesiune → context
// de încredere public_lookup, cu predicat EXPLICIT pe (org_id, email) — RLS nu
// scopează aici, vezi CAPCANA #4 din documentation/rls-setup.sql.
export async function dezaboneazaDonator(orgId: string, email: string): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.public_lookup', 'true', true)`);
    await tx
      .update(donatoriReali)
      .set({ dezabonatEmailLa: sql`coalesce(${donatoriReali.dezabonatEmailLa}, now())` })
      .where(and(sql`${donatoriReali.orgId} = ${orgId}`, sql`lower(${donatoriReali.email}) = ${email.toLowerCase()}`));
  });
}
