import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// Criptare simetrică (AES-256-GCM) pentru secretele pe care ONG-urile ni le
// încredințează — acum, cheia Stripe proprie. Cheia de criptare NU stă în
// baza de date: vine din ORG_SECRETS_KEY (32 de octeți, base64), setată în
// Vercel. Fără ea, nimic nu se poate salva sau citi (eșuează explicit, nu
// tăcut). Generare: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
// Format stocat: v1.<iv>.<tag>.<text criptat>, toate base64 — versiunea permite
// schimbarea algoritmului mai târziu fără a strica valorile existente.

export function criptareConfigurata(): boolean {
  try {
    return cheie().length === 32;
  } catch {
    return false;
  }
}

function cheie(): Buffer {
  const raw = process.env.ORG_SECRETS_KEY;
  if (!raw) throw new Error("ORG_SECRETS_KEY nu e configurată.");
  const buf = Buffer.from(raw, "base64");
  if (buf.length !== 32) throw new Error("ORG_SECRETS_KEY trebuie să aibă 32 de octeți (base64).");
  return buf;
}

export function cripteaza(textClar: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", cheie(), iv);
  const criptat = Buffer.concat([cipher.update(textClar, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64"), tag.toString("base64"), criptat.toString("base64")].join(".");
}

export function decripteaza(payload: string): string {
  const [versiune, iv, tag, criptat] = payload.split(".");
  if (versiune !== "v1" || !iv || !tag || !criptat) throw new Error("secret_format_invalid");
  const decipher = createDecipheriv("aes-256-gcm", cheie(), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(criptat, "base64")), decipher.final()]).toString("utf8");
}

// Pentru o coloană migrată LA criptare cu date deja existente în clar (ex.
// CNP din formular230_submissions) — rândurile vechi rămân în clar până la
// backfill, cele noi sunt mereu "v1....". Verifică prefixul explicit, nu
// încearcă orbește decripteaza()+catch (ar ascunde o cheie greșită/coruptă
// pe un rând deja criptat în loc s-o semnaleze).
export function decripteazaSauLegacy(valoare: string): string {
  return valoare.startsWith("v1.") ? decripteaza(valoare) : valoare;
}
