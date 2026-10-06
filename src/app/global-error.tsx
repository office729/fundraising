"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

// Ultima plasă: erori în layout-ul rădăcină. Fără stiluri din aplicație (layout-ul lipsește), deci stil minim inline.
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);
  return (
    <html lang="ro">
      <body style={{ fontFamily: "system-ui, sans-serif", textAlign: "center", padding: "96px 24px" }}>
        <h1 style={{ fontSize: 20 }}>Ceva n-a mers bine / Something went wrong</h1>
        <p style={{ marginTop: 12, fontSize: 14 }}>Reîncarcă pagina. / Please reload the page.</p>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- fără layout/router disponibil în global-error; navigare completă intenționată */}
        <a href="/" style={{ display: "inline-block", marginTop: 20, fontSize: 14 }}>
          Acasă / Home
        </a>
      </body>
    </html>
  );
}
