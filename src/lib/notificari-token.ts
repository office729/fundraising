import { createHmac, timingSafeEqual } from "node:crypto";

// Semnătura linkurilor de dezabonare de la notificările pe e-mail ale utilizatorilor (fără stare: nu ne trebuie un tabel de tokeni). Leagă
// (scop, utilizator), deci un link nu poate fi refolosit pentru alt utilizator sau alt tip de notificare. Cheia vine din exterior (ORG_SECRETS_KEY),
// ca funcția să rămână pură și testabilă; prefixul de scop face ca aceeași cheie să nu semneze alt fel de token.

export type TipNotificare = "rezumat-calendar" | "invitatie-feedback";
export const TIPURI_NOTIFICARE: TipNotificare[] = ["rezumat-calendar", "invitatie-feedback"];
export const esteTipNotificare = (x: unknown): x is TipNotificare => typeof x === "string" && (TIPURI_NOTIFICARE as string[]).includes(x);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function semneazaNotificare(cheie: string, tip: TipNotificare, userId: string): string {
  return createHmac("sha256", cheie).update(`notificare:${tip}:${userId.toLowerCase()}`).digest("base64url");
}

export function verificaSemnaturaNotificare(cheie: string, tip: string | null, userId: string | null, semnatura: string | null): boolean {
  if (!cheie || !esteTipNotificare(tip) || !userId || !UUID.test(userId) || !semnatura) return false;
  const asteptat = Buffer.from(semneazaNotificare(cheie, tip, userId));
  const primit = Buffer.from(semnatura);
  return asteptat.length === primit.length && timingSafeEqual(asteptat, primit);
}
