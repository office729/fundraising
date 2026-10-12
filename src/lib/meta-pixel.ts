import { esteCaleCuPixel, evenimentMeta } from "./meta-pixel-cale";

// Pixelul Meta (Facebook) pentru remarketing pe site-ul public. Inert până când `NEXT_PUBLIC_META_PIXEL_ID` e setat și vizitatorul
// a acceptat separat „cookie-urile de publicitate” din banner (alegerea e distinctă de cea pentru statistici).
// Nu se trimit date personale (fără potrivire avansată, fără detectare automată a butoanelor/formularelor).

export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "";
export const CONSENT_MARKETING_KEY = "fa_cookie_marketing";

type Fbq = ((...args: unknown[]) => void) & { callMethod?: (...args: unknown[]) => void; queue?: unknown[]; loaded?: boolean; version?: string; push?: unknown };
type FbWindow = Window & { fbq?: Fbq; _fbq?: Fbq; __faMetaInit?: boolean };

export const pixelConfigurat = () => META_PIXEL_ID !== "";

export function esteAcordMarketing(): boolean {
  try {
    return window.localStorage.getItem(CONSENT_MARKETING_KEY) === "granted";
  } catch {
    return false;
  }
}

function incarcaScript(w: FbWindow) {
  if (w.fbq) return;
  const n: Fbq = function (...args: unknown[]) {
    if (n.callMethod) n.callMethod(...args);
    else n.queue!.push(args);
  } as Fbq;
  w.fbq = n;
  if (!w._fbq) w._fbq = n;
  n.push = n;
  n.loaded = true;
  n.version = "2.0";
  n.queue = [];
  const s = document.createElement("script");
  s.async = true;
  s.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(s);
}

// Idempotent. Pornește Pixelul doar dacă există acord, ID configurat și pagina e una publică de site.
export function initMetaPixel(): boolean {
  if (typeof window === "undefined" || !pixelConfigurat() || !esteAcordMarketing()) return false;
  if (!esteCaleCuPixel(window.location.pathname)) return false;
  const w = window as FbWindow;
  if (w.__faMetaInit) {
    w.fbq?.("consent", "grant");
    return true;
  }
  w.__faMetaInit = true;
  incarcaScript(w);
  const fbq = w.fbq!;
  fbq("consent", "grant");
  fbq("set", "autoConfig", false, META_PIXEL_ID); // fără detectarea automată a butoanelor și a câmpurilor de formular
  fbq("init", META_PIXEL_ID);
  fbq("track", "PageView");
  return true;
}

// La schimbarea paginii în aplicația single-page: PageView doar pe paginile permise.
export function paginaNouaMeta() {
  if (typeof window === "undefined" || !esteAcordMarketing() || !esteCaleCuPixel(window.location.pathname)) return;
  const w = window as FbWindow;
  // Prima pagină permisă după încărcare pornește Pixelul (care trimite singur PageView); următoarele trimit PageView aici.
  if (!w.__faMetaInit) {
    initMetaPixel();
    return;
  }
  w.fbq?.("track", "PageView");
}

// Retragerea acordului: oprește trimiterea și șterge cookie-urile Meta de pe domeniu.
export function revocaMeta() {
  if (typeof window === "undefined") return;
  const w = window as FbWindow;
  w.fbq?.("consent", "revoke");
  const host = window.location.hostname;
  const parti = host.split(".");
  const domenii = ["", host, `.${host}`];
  if (parti.length > 2) domenii.push(`.${parti.slice(-2).join(".")}`);
  for (const nume of ["_fbp", "_fbc"]) {
    for (const d of domenii) document.cookie = `${nume}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${d ? `; domain=${d}` : ""}`;
  }
}

// Evenimentele aplicației (sign_up, generate_lead, cta_trial_click) → Meta; doar cu acord și doar pe paginile publice de site.
export function trimiteLaMeta(nume: string) {
  if (typeof window === "undefined" || !pixelConfigurat() || !esteAcordMarketing()) return;
  if (!esteCaleCuPixel(window.location.pathname)) return;
  const ev = evenimentMeta(nume);
  if (!ev) return;
  if (!initMetaPixel()) return;
  (window as FbWindow).fbq?.(ev.standard ? "track" : "trackCustom", ev.nume);
}
