import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

// Content Security Policy — allow-list minim: Supabase (auth+db), Stripe
// (Checkout redirect + billing portal + webhook nu ating browserul) și
// Calendly (embed inline pentru consiliere 1 la 1 — vezi
// components/calendly-inline-widget.tsx) și Google Analytics 4 (scriptul gtag
// se încarcă doar după acordul din bannerul de cookie-uri — vezi
// components/analytics-consent.tsx; fără aceste domenii CSP îl blochează).
// `unsafe-inline` în script-src: verificat explicit (audit de securitate) —
// rămâne intenționat. Eliminarea lui (ex. via nonce per-request în proxy.ts)
// ar rupe cele 8 instrumente CRM randate în iframe srcDoc, same-origin, fără
// CSP proprie (vezi modules/crm/shared/standalone-tool-frame.tsx) — acelea
// au scripturi inline statice cu date interpolate (JSON.stringify), fără
// niciun sink care să injecteze markup/JS din input necontrolat. Rămâne o
// recomandare de hardening, nu o vulnerabilitate activă.
const csp = [
  `default-src 'self'`,
  `script-src 'self' 'unsafe-inline' https://assets.calendly.com https://www.googletagmanager.com${isDev ? " 'unsafe-eval'" : ""}`,
  `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://assets.calendly.com`,
  `img-src 'self' data: blob: https:`,
  `font-src 'self' data: https://fonts.gstatic.com`,
  // `data:` — necesar ca fetch() să poată citi imaginea semnăturii olografe
  // (canvas.toDataURL) la completarea PDF-ului Formularului 230 (pdf-lib).
  `connect-src 'self' data: https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://calendly.com https://*.ingest.sentry.io https://*.ingest.de.sentry.io https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com${isDev ? " ws:" : ""}`,
  `frame-src 'self' https://checkout.stripe.com https://billing.stripe.com https://calendly.com`,
  `frame-ancestors 'none'`,
  `form-action 'self' https://*.supabase.co https://checkout.stripe.com`,
  `base-uri 'self'`,
  `object-src 'none'`,
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
];

const nextConfig: NextConfig = {
  async headers() {
    // Aceleași headere de securitate peste tot, inclusiv /api/stripe/webhook —
    // Stripe ignoră headerele orientate spre pagini din răspuns, deci nu
    // există niciun motiv să existe o excepție (și Next.js 16 nu acceptă
    // oricum un `headers: []` gol pe o rută).
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
