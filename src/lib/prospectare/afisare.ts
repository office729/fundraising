// Texte scurte pentru interfața de prospectare (fără dependențe, ușor de testat). `locale` (implicit română) alege limba textului.

import type { Locale } from "../i18n/config";

// „acum 3 zile”, „azi”, „ieri”… după o dată ISO. `acum` se poate da explicit (teste).
export function vechime(iso: string, acum: number = Date.now(), locale: Locale = "ro"): string {
  const ms = acum - new Date(iso).getTime();
  if (locale === "en") {
    if (!Number.isFinite(ms) || ms < 0) return "just now";
    const min = Math.floor(ms / 60_000);
    if (min < 2) return "a minute ago";
    if (min < 60) return `${min} minutes ago`;
    const h = Math.floor(min / 60);
    if (h < 24) return h === 1 ? "an hour ago" : `${h} hours ago`;
    const z = Math.floor(h / 24);
    if (z === 1) return "yesterday";
    if (z < 14) return `${z} days ago`;
    const sapt = Math.floor(z / 7);
    if (sapt < 9) return `${sapt} weeks ago`;
    return `${Math.floor(z / 30)} months ago`;
  }
  if (!Number.isFinite(ms) || ms < 0) return "acum";
  const minute = Math.floor(ms / 60_000);
  if (minute < 2) return "acum un minut";
  if (minute < 60) return `acum ${minute} minute`;
  const ore = Math.floor(minute / 60);
  if (ore < 24) return ore === 1 ? "acum o oră" : `acum ${ore} ore`;
  const zile = Math.floor(ore / 24);
  if (zile === 1) return "ieri";
  if (zile < 14) return `acum ${zile} zile`;
  const saptamani = Math.floor(zile / 7);
  if (saptamani < 9) return `acum ${saptamani} săptămâni`;
  return `acum ${Math.floor(zile / 30)} luni`;
}

// Zile întregi de la o dată ISO (pentru termene).
export function zileDe(iso: string, acum: number = Date.now()): number {
  return Math.floor((acum - new Date(iso).getTime()) / 86_400_000);
}

// Data „YYYY-MM-DD” ca „23 oct.” (sau „23 oct. 2026” dacă nu e anul curent).
export function dataScurta(iso: string, acum: number = Date.now(), locale: Locale = "ro"): string {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  const anCurent = new Date(acum).getFullYear();
  return d.toLocaleDateString(locale === "en" ? "en-GB" : "ro-RO", { day: "numeric", month: "short", ...(d.getFullYear() !== anCurent ? { year: "numeric" } : {}) });
}

// Termenul unei acțiuni față de azi: „întârziat cu 2 zile”, „azi”, „mâine”, „peste 3 zile”, sau null fără termen.
export function stareTermen(termenIso: string | null, azi: string, locale: Locale = "ro"): { text: string; intarziat: boolean } | null {
  if (!termenIso) return null;
  const zile = Math.round((new Date(`${termenIso.slice(0, 10)}T12:00:00`).getTime() - new Date(`${azi.slice(0, 10)}T12:00:00`).getTime()) / 86_400_000);
  if (locale === "en") {
    if (zile < 0) return { text: `${-zile} ${-zile === 1 ? "day" : "days"} overdue`, intarziat: true };
    if (zile === 0) return { text: "today", intarziat: false };
    if (zile === 1) return { text: "tomorrow", intarziat: false };
    return { text: `in ${zile} days`, intarziat: false };
  }
  if (zile < 0) return { text: `întârziat cu ${-zile} ${-zile === 1 ? "zi" : "zile"}`, intarziat: true };
  if (zile === 0) return { text: "azi", intarziat: false };
  if (zile === 1) return { text: "mâine", intarziat: false };
  return { text: `peste ${zile} zile`, intarziat: false };
}
