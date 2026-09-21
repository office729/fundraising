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
  ensureAnalyticsInit();
  (window as GtagWindow).gtag?.("event", name, params);
}
