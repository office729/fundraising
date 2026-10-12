import { createHmac, timingSafeEqual } from "node:crypto";

// Linkul din emailul trimis unui donator lunar ca să-și gestioneze donația — semnat HMAC, fără stare (nu ne trebuie un tabel de tokeni).
// Semnătura leagă (organizație, email, expirare): linkul nu poate fi refolosit pentru altă adresă sau altă organizație și expiră.
// Prefix de scop propriu, ca aceeași cheie să nu semneze alt fel de token. Funcțiile primesc cheia, ca să poată fi testate fără mediu.

export const VALABILITATE_LINK_MS = 60 * 60 * 1000; // o oră

const semnatura = (cheie: string, orgId: string, email: string, expiraLa: number) =>
  createHmac("sha256", cheie).update(`portal-donator:${orgId}:${email.toLowerCase()}:${expiraLa}`).digest("base64url");

export function parametriLinkPortal(cheie: string, orgId: string, email: string, acum = Date.now()): { e: string; x: string; t: string } {
  const expiraLa = acum + VALABILITATE_LINK_MS;
  return { e: Buffer.from(email.toLowerCase()).toString("base64url"), x: String(expiraLa), t: semnatura(cheie, orgId, email, expiraLa) };
}

// Întoarce emailul doar dacă semnătura e validă și linkul nu a expirat.
export function verificaLinkPortal(cheie: string, orgId: string, e: string | null | undefined, x: string | null | undefined, t: string | null | undefined, acum = Date.now()): string | null {
  if (!orgId || !e || !x || !t) return null;
  const expiraLa = Number(x);
  if (!Number.isFinite(expiraLa) || expiraLa < acum || expiraLa > acum + 2 * VALABILITATE_LINK_MS) return null;
  let email: string;
  try {
    email = Buffer.from(e, "base64url").toString("utf8");
  } catch {
    return null;
  }
  if (!email || email.length > 320) return null;
  const asteptat = Buffer.from(semnatura(cheie, orgId, email, expiraLa));
  const primit = Buffer.from(t);
  return asteptat.length === primit.length && timingSafeEqual(asteptat, primit) ? email.toLowerCase() : null;
}
