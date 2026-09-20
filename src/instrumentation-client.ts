import * as Sentry from "@sentry/nextjs";

// Erori din browser — activ doar dacă NEXT_PUBLIC_SENTRY_DSN e setat. Fără PII, fără
// înregistrări de sesiune.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
    sendDefaultPii: false,
    tracesSampleRate: 0,
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
