// Google Analytics 4 — inițializare + trimitere de evenimente, ambele DOAR după
// acordul vizitatorului din bannerul de cookie-uri (components/analytics-consent.tsx).
// Fără acord, niciuna dintre funcții nu face nimic: nu se încarcă scriptul Google
// și nu se trimite niciun eveniment.

// ID-ul de măsurare e public prin natura lui (apare în codul oricărei pagini care
// folosește GA), deci nu e secret.
export const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "G-8R9P9XB8F1";
export const CONSENT_KEY = "fa_cookie_consent";

type GtagWindow = Window & {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
  __faGaInit?: boolean;
};

// Pagini cu date personale sau cu tokenuri în URL (adresa de email din linkul de dezabonare, formularul 230, donațiile,
// invitațiile, rezultatul plății): analiza NU rulează deloc aici, chiar dacă vizitatorul a acceptat statisticile —
// notele de informare ale donatorilor nu menționează Google și URL-ul ar ajunge la Google ca `page_location`.
const PRIMUL_SEGMENT_EXCLUS = new Set([
  "f230",
  "strangere-fonduri",
  "dezabonare",
  "invite",
  "invite-beneficiar",
  "auth",
  "reset-password",
  "beneficiar",
  "s",
]);

export function esteCaleExclusaDinAnaliza(pathname: string): boolean {
  return PRIMUL_SEGMENT_EXCLUS.has(pathname.split("/")[1] ?? "");
}

// Identificatori din adresele dashboard-ului (UUID-uri de donatori/companii, sufixul de 8 caractere din „denumire-c2607e5a")
// nu trebuie să ajungă la Google: se înlocuiesc cu „:id" în `page_path`.
export function caleFaraIdentificatori(pathname: string): string {
  return pathname
    .split("/")
    .map((seg) => (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(seg) || /-[0-9a-f]{8}$/i.test(seg) ? ":id" : seg))
    .join("/");
}

// Google respectă `window['ga-disable-<ID>']` la FIECARE cerere — așa oprim și page_view-urile automate la navigări
// din aplicație (fără reîncărcare) spre o cale exclusă, și le reactivăm la întoarcerea pe una permisă.
export function aplicaExcluderea(pathname: string) {
  if (typeof window === "undefined") return;
  (window as unknown as Record<string, unknown>)[`ga-disable-${GA_ID}`] = esteCaleExclusaDinAnaliza(pathname);
}

export function esteAcordDat(): boolean {
  try {
    return window.localStorage.getItem(CONSENT_KEY) === "granted";
  } catch {
    return false;
  }
}

// Idempotent: prima apelare definește gtag, pune în coadă `js` + `config` (în
// această ordine, înaintea oricărui eveniment) și adaugă scriptul Google.
export function ensureAnalyticsInit() {
  if (typeof window === "undefined") return;
  if (esteCaleExclusaDinAnaliza(window.location.pathname)) return; // nu încărcăm scriptul Google pe pagini cu date personale
  const w = window as GtagWindow;
  if (w.__faGaInit) return;
  w.__faGaInit = true;

  w.dataLayer = w.dataLayer || [];
  w.gtag = function gtag() {
    // gtag.js recunoaște doar obiecte `arguments`, nu array-uri.
    // eslint-disable-next-line prefer-rest-params
    w.dataLayer!.push(arguments);
  };
  w.gtag("js", new Date());
  w.gtag("config", GA_ID);

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(script);
}

export function trackEvent(name: string, params: Record<string, unknown> = {}) {
  if (typeof window === "undefined" || !esteAcordDat()) return;
  if (esteCaleExclusaDinAnaliza(window.location.pathname)) return;
  ensureAnalyticsInit();
  (window as GtagWindow).gtag?.("event", name, params);
}

// Distinge paginile publice de site (marketing/autentificare) de cele din
// dashboard-ul unei organizații (/<orgSlug>/...) în rapoartele GA4, plus,
// pentru cele din dashboard, slug-ul organizației.
//
// Trimis ca EVENIMENT propriu (`page_context`), nu prin `gtag('set', ...)` —
// verificat direct, live, cu evenimente de test: `gtag('set', {content_group})`
// NU se propagă la evenimentul automat `page_view` generat de Google (nici la
// cel de la încărcare, nici la niciun eveniment ulterior trimis prin gtag),
// deci acel parametru dispărea mereu din cererea reală. Un eveniment separat,
// prin trackEvent() (deja verificat că ajunge corect), e mecanismul robust —
// `content_group`/`org_slug` apar ca parametri de eveniment (ep.content_group,
// ep.org_slug) și devin coloane filtrabile în rapoarte după ce sunt
// înregistrate ca dimensiuni personalizate: Admin → Definiții dimensiuni.
export function trimitePaginaContext(group: "public" | "dashboard", orgSlug?: string, pagePath?: string) {
  trackEvent("page_context", { content_group: group, org_slug: orgSlug, page_path: pagePath ? caleFaraIdentificatori(pagePath) : undefined });
}
