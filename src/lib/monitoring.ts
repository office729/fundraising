import * as Sentry from "@sentry/nextjs";

import { categorieZona, trebuieRaportat } from "./monitoring-categorii";

// Raportare de erori pentru căile care mută bani sau date (webhook-uri Stripe/
// Netopia, cron, Formular 230). Până acum acolo se făcea doar console.error și
// se răspundea 500/200 — Sentry vedea DOAR excepțiile necaptate
// (onRequestError), deci o plată pierdută nu declanșa nicio alertă.

// Erorile Drizzle includ în mesaj interogarea ȘI parametrii ei ("...\nparams: a,b"),
// adică nume, emailuri, CNP criptat, semnături. Păstrăm doar interogarea, scurtată.
export function curataMesajEroare(mesaj: string): string {
  const i = mesaj.search(/\r?\n\s*params:/i);
  return (i >= 0 ? mesaj.slice(0, i) : mesaj).slice(0, 500);
}

// URL-urile unor pagini conțin date personale sau tokenuri (linkul de dezabonare are emailul în base64, invitațiile au
// tokenul în cale): le tăiem înainte să ajungă la Sentry (query string + segmentul de token).
export function curataUrlPentruSentry(url: string): string {
  const faraQuery = url.split("?")[0].split("#")[0];
  return faraQuery.replace(/\/(invite|invite-beneficiar)\/[^/]+/, "/$1/:token");
}

type Extra = Record<string, string | number | boolean | null | undefined>;

export function raporteazaEroare(zona: string, e: unknown, extra?: Extra): void {
  const mesaj = e instanceof Error ? curataMesajEroare(e.message) : curataMesajEroare(String(e));
  const cod = e && typeof e === "object" && "code" in e ? String((e as { code: unknown }).code) : undefined;
  console.error(`[${zona}] ${mesaj}`, { ...(cod ? { cod } : {}), ...extra });
  Sentry.captureException(e, { tags: { zona, categorie: categorieZona(zona) }, extra });
}

// Situații anormale fără excepție (ex. sumă Netopia diferită de comandă) — cer
// intervenție manuală, deci ajung în Sentry ca avertisment, nu doar în loguri.
export function raporteazaAvertisment(zona: string, mesaj: string, extra?: Extra): void {
  console.warn(`[${zona}] ${mesaj}`, extra ?? {});
  Sentry.captureMessage(`[${zona}] ${mesaj}`, { level: "warning", tags: { zona, categorie: categorieZona(zona) }, extra });
}

// Pentru situații provocate de cereri externe (semnătură respinsă pe endpoint-uri publice): cel mult o raportare pe cheie la 10 minute pe instanță,
// ca un scanner să nu epuizeze cota Sentry, dar o configurare greșită (cheie/secret) să fie totuși văzută.
const ultimeRaportari = new Map<string, number>();
export function raporteazaAvertismentLimitat(zona: string, mesaj: string, cheie: string, extra?: Extra): void {
  if (!trebuieRaportat(ultimeRaportari, `${zona}:${cheie}`, Date.now(), 10 * 60_000)) return;
  raporteazaAvertisment(zona, mesaj, extra);
}

// Bătaie de inimă pentru un cron: Sentry primește „început" și „sfârșit" și alertează dacă rularea lipsește sau durează prea mult
// (un cron care nu pornește deloc nu lasă nicio excepție, deci altfel nimeni nu află). Fără SENTRY_DSN, rulează direct, fără nicio schimbare.
export function cuMonitorCron<T>(slug: string, cron: string, durataMaximaMin: number, lucru: () => Promise<T>): Promise<T> {
  if (!process.env.SENTRY_DSN) return lucru();
  return Sentry.withMonitor(slug, lucru, {
    schedule: { type: "crontab", value: cron },
    // Vercel pornește cron-urile cu o întârziere de până la câteva minute.
    checkinMargin: 30,
    maxRuntime: durataMaximaMin,
    timezone: "UTC",
  });
}
