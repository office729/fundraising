import { createHmac, timingSafeEqual } from "node:crypto";

// Tokenuri pentru check-in prin cod QR. Codul afișat de coordonator se schimbă la fiecare 5 minute (semnat cu o cheie secretă a
// serverului, legat de tură), deci o poză a codului trimisă altcuiva nu mai funcționează după cel mult 10 minute. Cheia vine din
// ORG_SECRETS_KEY (aceeași ca pentru criptarea datelor); fără ea, codul QR e dezactivat și rămâne confirmarea de către coordonator.

export const SLOT_MS = 5 * 60_000;
// Check-in permis de la o jumătate de oră înainte de începutul turei până la o oră după sfârșitul ei.
export const INAINTE_MS = 30 * 60_000;
export const DUPA_MS = 60 * 60_000;

function cheie(): Buffer | null {
  const brut = process.env.ORG_SECRETS_KEY;
  if (!brut) return null;
  const buf = Buffer.from(brut, "base64");
  return buf.length === 32 ? buf : null;
}

export const qrPrezentaDisponibil = () => cheie() !== null;

function semneaza(shiftId: string, slot: number): string | null {
  const k = cheie();
  if (!k) return null;
  return createHmac("sha256", k).update(`prezenta.${shiftId}.${slot}`).digest("base64url").slice(0, 22);
}

export function tokenPrezenta(shiftId: string, acum: number = Date.now()): string | null {
  return semneaza(shiftId, Math.floor(acum / SLOT_MS));
}

// Acceptă slotul curent și pe cel precedent (cine scanează la limita dintre două coduri nu e refuzat).
export function tokenPrezentaValid(shiftId: string, token: string, acum: number = Date.now()): boolean {
  const slot = Math.floor(acum / SLOT_MS);
  const primit = Buffer.from(String(token ?? ""));
  for (const s of [slot, slot - 1]) {
    const asteptat = semneaza(shiftId, s);
    if (!asteptat) return false;
    const a = Buffer.from(asteptat);
    if (a.length === primit.length && timingSafeEqual(a, primit)) return true;
  }
  return false;
}

// Fereastra în care se poate face check-in la o tură.
export function inFereastraCheckin(inceput: Date, sfarsit: Date, acum: number = Date.now()): boolean {
  return acum >= inceput.getTime() - INAINTE_MS && acum <= sfarsit.getTime() + DUPA_MS;
}

// Linkul coordonatorului rămâne valabil până la câteva zile după încheierea activității.
export const ZILE_LINK_COORDONATOR = 3;
export function linkCoordonatorValabil(seTerminaLa: Date, acum: number = Date.now()): boolean {
  return acum <= seTerminaLa.getTime() + ZILE_LINK_COORDONATOR * 86_400_000;
}
