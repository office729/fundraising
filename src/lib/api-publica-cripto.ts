import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

// Fără importuri de proiect (se testează direct); prefixurile sunt cele din lib/api-publica.ts (un test verifică să rămână la fel).
const PREFIX_CHEIE = "alx_live_";
const PREFIX_SECRET_WEBHOOK = "whsec_";

// Generarea cheilor API, hash-ul lor și semnarea webhook-urilor (node:crypto). Partea fără criptografie, folosită și în interfață, e în lib/api-publica.ts.
export function genereazaCheieApi(): string {
  return PREFIX_CHEIE + randomBytes(32).toString("base64url");
}
export const hashCheieApi = (cheie: string): string => createHash("sha256").update(cheie).digest("hex");
export const genereazaSecretWebhook = (): string => PREFIX_SECRET_WEBHOOK + randomBytes(24).toString("base64url");

// Semnătura trimisă în antetul X-Alexandrit-Semnatura: „t=<secunde>,v1=<HMAC-SHA256(secret, t + "." + corp)>”. Cine primește recalculează și compară, și refuză un t prea vechi.
export function semneazaWebhook(secret: string, corp: string, t: number = Math.floor(Date.now() / 1000)): string {
  const v1 = createHmac("sha256", secret).update(`${t}.${corp}`).digest("hex");
  return `t=${t},v1=${v1}`;
}
export function verificaSemnaturaWebhook(secret: string, corp: string, antet: string, acum: number = Math.floor(Date.now() / 1000), toleranta = 300): boolean {
  const t = Number(/(?:^|,)t=(\d+)/.exec(antet)?.[1]);
  const v1 = /(?:^|,)v1=([0-9a-f]{64})/.exec(antet)?.[1];
  if (!Number.isFinite(t) || !v1 || Math.abs(acum - t) > toleranta) return false;
  const asteptat = Buffer.from(createHmac("sha256", secret).update(`${t}.${corp}`).digest("hex"));
  const primit = Buffer.from(v1);
  return asteptat.length === primit.length && timingSafeEqual(asteptat, primit);
}
