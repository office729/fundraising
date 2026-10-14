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
  // js.stripe.com — necesar pentru Stripe.js încărcat client-side pe pagina
  // publică de donații (butoanele Apple Pay/Google Pay/PayPal, Elements) —
  // vezi express-checkout.tsx. Fără el, loadStripe() eșuează silențios (CSP
  // blochează scriptul, fără nicio eroare vizibilă donatorului).
  `script-src 'self' 'unsafe-inline' https://assets.calendly.com https://www.googletagmanager.com https://connect.facebook.net https://js.stripe.com${isDev ? " 'unsafe-eval'" : ""}`,
  `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://assets.calendly.com`,
  `img-src 'self' data: blob: https:`,
  `font-src 'self' data: https://fonts.gstatic.com`,
  // `data:` — necesar ca fetch() să poată citi imaginea semnăturii olografe
  // (canvas.toDataURL) la completarea PDF-ului Formularului 230 (pdf-lib).
  `connect-src 'self' data: https://fonts.googleapis.com https://fonts.gstatic.com https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://js.stripe.com https://m.stripe.network https://calendly.com https://*.ingest.sentry.io https://*.ingest.de.sentry.io https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com https://connect.facebook.net https://www.facebook.com https://*.twilio.com wss://*.twilio.com${isDev ? " ws:" : ""}`,
  // js.stripe.com/pay.google.com — iframe-uri interne folosite de Stripe
  // Elements (ExpressCheckoutElement) pentru Google Pay/Link; checkout.stripe.com
  // rămâne pentru fluxul vechi (redirect Checkout Session), neatins.
  `frame-src 'self' https://checkout.stripe.com https://billing.stripe.com https://js.stripe.com https://pay.google.com https://calendly.com`,
  `frame-ancestors 'none'`,
  `form-action 'self' https://*.supabase.co https://checkout.stripe.com`,
  `base-uri 'self'`,
  `object-src 'none'`,
].join("; ");

// Singura pagină care poate fi încorporată în iframe pe site-urile organizațiilor: formularul de donație din widget (public/embed.js).
// Conține doar formularul unei campanii active; toate celelalte pagini rămân cu `frame-ancestors 'none'`.
const cspWidget = csp.replace("frame-ancestors 'none'", "frame-ancestors *");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=()" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
];

const nextConfig: NextConfig = {
  // Acțiunile de server primesc implicit cel mult 1 MB; încărcările de documente (granturi, firme) au nevoie de mai mult. 4 MB e și plafonul
  // corpului de cerere pe Vercel, deci fișierele mai mari ar fi oricum refuzate de platformă.
  experimental: { serverActions: { bodySizeLimit: "4mb" } },
  // Adresa veche a paginii „Automatizări" rămâne funcțională.
  async redirects() {
    return [{ source: "/automatizare", destination: "/automatizari", permanent: true }];
  },
  async headers() {
    // Aceleași headere de securitate peste tot, inclusiv /api/stripe/webhook —
    // Stripe ignoră headerele orientate spre pagini din răspuns, deci nu
    // există niciun motiv să existe o excepție (și Next.js 16 nu acceptă
    // oricum un `headers: []` gol pe o rută).
    // Fișierele statice din public/ nu au hash în nume: cache de o zi + revalidare în fundal, nu
    // `max-age=0` (care cerea o verificare la server la fiecare vizită). Imuabil n-ar fi sigur la înlocuiri.
    const cacheStatic = [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }];
    return [
      // Toate paginile, în afară de widget: cu X-Frame-Options și frame-ancestors 'none'.
      { source: "/:path((?!strangere-fonduri/[^/]+/[^/]+/embed$).*)", headers: securityHeaders },
      // Widgetul: aceleași antete, dar fără X-Frame-Options și cu frame-ancestors deschis.
      {
        source: "/strangere-fonduri/:org/:page/embed",
        headers: securityHeaders.filter((h) => h.key !== "X-Frame-Options").map((h) => (h.key === "Content-Security-Policy" ? { ...h, value: cspWidget } : h)),
      },
      { source: "/vendor/:path*", headers: cacheStatic },
      { source: "/fonts/:path*", headers: cacheStatic },
      { source: "/logos-platforme/:path*", headers: cacheStatic },
    ];
  },
};

export default nextConfig;
