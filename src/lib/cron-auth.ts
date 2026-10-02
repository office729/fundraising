import "server-only";

import { timingSafeEqual } from "node:crypto";

// Autorizarea cererilor Vercel Cron (antetul `Authorization: Bearer <CRON_SECRET>`,
// pus automat de Vercel când variabila e setată în proiect) — comună tuturor
// rutelor de cron (formular230-reminder, netopia-reinnoire). Fără CRON_SECRET
// configurat, ruta apelantă trebuie să refuze să ruleze (501), nu să accepte
// orice cerere publică.
//
// Comparație în timp constant — `!==` pe string-uri scurtcircuitează la primul
// octet diferit, o scurgere de timing ce ar permite ghicirea secretului
// caracter cu caracter. Lungimile diferă aproape mereu (secretul e fix,
// headerul e controlat de client), iar timingSafeEqual aruncă în acest caz —
// de-aia comparăm mai întâi lungimea.
export function cronAutorizat(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const primit = req.headers.get("authorization");
  if (!primit) return false;
  const a = Buffer.from(primit);
  const b = Buffer.from(`Bearer ${secret}`);
  return a.length === b.length && timingSafeEqual(a, b);
}
