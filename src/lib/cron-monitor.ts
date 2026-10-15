import "server-only";

import * as Sentry from "@sentry/nextjs";

// Bătaie de inimă pentru un cron: Sentry primește „început" și „sfârșit" și alertează dacă rularea lipsește sau durează prea mult
// (un cron care nu pornește deloc nu lasă nicio excepție, deci altfel nimeni nu află). Fără SENTRY_DSN, rulează direct, fără nicio schimbare.
// Separat de monitoring.ts: acela ajunge și în bundle-ul din browser, unde Sentry nu exportă withMonitor (build-ul pică).
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
