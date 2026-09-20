import * as Sentry from "@sentry/nextjs";

// Monitorizare erori (Sentry). Activă DOAR dacă SENTRY_DSN e setat în mediu (Vercel);
// fără el nu se trimite nimic și aplicația se comportă exact ca înainte.
// Nu trimitem date personale: sendDefaultPii e oprit. Pentru date în UE, creează
// proiectul Sentry pe regiunea EU (DSN cu domeniul ingest.de.sentry.io).
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" && process.env.NEXT_RUNTIME !== "edge") return;
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;
  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    sendDefaultPii: false,
    tracesSampleRate: 0,
  });
}

export const onRequestError = Sentry.captureRequestError;
