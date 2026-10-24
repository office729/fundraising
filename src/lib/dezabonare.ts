import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { and, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { donatoriReali, emailSuppression } from "@/lib/db/schema";
import { emiteEveniment } from "@/lib/api-publica-server";
import type { FrecventaEmail } from "@/lib/igiena-email";

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

// HMAC al adresei, pentru lista de suprimare (nu stocăm adresa). Prefix de scop propriu.
export function hashSuprimare(orgId: string, email: string): string {
  const cheie = process.env.ORG_SECRETS_KEY;
  if (!cheie) throw new Error("ORG_SECRETS_KEY lipsește — nu se poate calcula lista de suprimare.");
  return createHmac("sha256", cheie).update(`suprimare:${orgId}:${email.trim().toLowerCase()}`).digest("hex");
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
    // Și în lista de suprimare — acoperă adrese care nu sunt (sau nu mai sunt) în donatori_reali.
    await tx
      .insert(emailSuppression)
      .values({ orgId, emailHash: hashSuprimare(orgId, email), motiv: "dezabonare" })
      .onConflictDoNothing();
    // Eveniment pentru webhook-urile organizației (contextul ei e necesar doar pentru coada de livrări). Savepoint: un eșec aici nu împiedică dezabonarea.
    await tx.execute(sql`select set_config('app.current_org_id', ${orgId}, true)`);
    await tx.transaction((sp) => emiteEveniment(sp as never, orgId, "donator.dezabonat", { email: email.toLowerCase() })).catch(() => {});
  });
}

// Pagina „Cât de des vrei mesaje”: ce știm despre adresă (numele organizației și alegerea de acum), ca formularul să arate starea curentă. Același context de încredere ca la
// dezabonare (public_lookup, predicate explicite pe organizație și adresă); linkul semnat e singura cheie de acces.
export type StarePreferinte = { organizatie: string; frecventa: FrecventaEmail; dezabonat: boolean };
export async function citestePreferinte(orgId: string, email: string): Promise<StarePreferinte | null> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.public_lookup', 'true', true)`);
    const [org] = (await tx.execute(sql`select name from organizations where id = ${orgId}`)) as unknown as { name: string }[];
    if (!org) return null;
    const [d] = (await tx.execute(sql`select frecventa_email, dezabonat_email_la is not null as dezabonat from donatori_reali where org_id = ${orgId} and lower(email) = ${email.toLowerCase()} limit 1`)) as unknown as { frecventa_email: FrecventaEmail; dezabonat: boolean }[];
    return { organizatie: org.name, frecventa: d?.frecventa_email === "rara" ? "rara" : "normala", dezabonat: Boolean(d?.dezabonat) };
  });
}

// „Mai rar”: cel mult un mesaj de parcurs la 30 de zile; „normala”: cum sunt setate parcursurile. Dezabonarea completă rămâne separată (dezaboneazaDonator).
export async function seteazaFrecventaDonator(orgId: string, email: string, frecventa: FrecventaEmail): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.public_lookup', 'true', true)`);
    await tx.execute(sql`update donatori_reali set frecventa_email = ${frecventa}, frecventa_email_la = now() where org_id = ${orgId} and lower(email) = ${email.toLowerCase()}`);
  });
}
