import * as Sentry from "@sentry/nextjs";

import { curataUrlPentruSentry } from "@/lib/monitoring";

// Erori din browser — activ doar dacă NEXT_PUBLIC_SENTRY_DSN e setat. Fără PII, fără
// înregistrări de sesiune.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
    release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
    sendDefaultPii: false,
    tracesSampleRate: 0,
    beforeSend(event) {
      if (event.request?.url) event.request.url = curataUrlPentruSentry(event.request.url);
      if (event.request) delete event.request.query_string;
      return event;
    },
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
