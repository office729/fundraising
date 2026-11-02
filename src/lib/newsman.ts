import { esteAcordMarketing } from "./meta-pixel";
import { esteCaleCuPixel } from "./meta-pixel-cale";
import { esteCookieNewsman, semnalConsimtamant } from "./newsman-consimtamant";

// Newsman Remarketing (lista alexandrit.ro): identifică abonatul care ajunge pe site dintr-un newsletter și atribuie conversiile emailurilor. Inert până când vizitatorul a
// bifat „Marketing” în bannerul de cookie-uri (aceeași alegere ca pentru Pixelul Meta: components/analytics-consent.tsx) și rulează doar pe paginile publice de prezentare,
// niciodată pe aplicație, pe paginile de campanie sau pe cele cu date personale (aceeași listă ca la Pixel). Nu trimitem date de contact.
// ID-ul de site e public prin natură (apare în codul oricărei pagini care folosește Newsman), ca ID-ul Google Analytics. Valoare goală în mediu = dezactivat.

const ID_IMPLICIT = "96404-14305-000000000000000000000000-bdcb87dcf22fa73f689fe962f693c87f";
export const NEWSMAN_SITE_ID = process.env.NEXT_PUBLIC_NEWSMAN_SITE_ID ?? ID_IMPLICIT;

export const newsmanConfigurat = () => NEWSMAN_SITE_ID !== "";

type NzmWindow = Window & {
  _nzm?: unknown[] & Record<string, (...args: unknown[]) => void>;
  _nzm_config?: { js_prefix?: string };
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
  __faNewsmanInit?: boolean;
  __faNewsmanAcord?: boolean;
};

// Semnalul de consimțământ pe care îl citește scriptul Newsman. Definește `gtag` doar dacă nu există (Google Analytics îl redefinește identic când se încarcă).
function trimiteConsimtamant(acordat: boolean) {
  const w = window as NzmWindow;
  if (w.__faNewsmanAcord === acordat) return; // semnalul se trimite doar la schimbare
  w.__faNewsmanAcord = acordat;
  w.dataLayer = w.dataLayer || [];
  if (!w.gtag) {
    w.gtag = function gtag() {
      // gtag.js recunoaște doar obiecte `arguments`, nu array-uri.
      // eslint-disable-next-line prefer-rest-params
      w.dataLayer!.push(arguments);
    };
  }
  w.gtag("consent", "update", semnalConsimtamant(acordat));
}

// Același cod ca fragmentul din contul Newsman (Remarketing), scris fără HTML inline: pune în coadă comenzile și adaugă scriptul t.js.
function incarcaScript(w: NzmWindow) {
  const nzm = (w._nzm = w._nzm || ([] as unknown as NonNullable<NzmWindow["_nzm"]>));
  w._nzm_config = w._nzm_config || {};
  for (const m of ["identify", "track", "run"]) {
    nzm[m] = (...args: unknown[]) => {
      (nzm as unknown[]).push([m].concat(args as string[]));
    };
  }
  const s = document.createElement("script");
  s.async = true;
  s.src = `${w._nzm_config.js_prefix || "https://t.newsmanapp.com"}/jt/t.js`;
  s.setAttribute("data-site-id", NEWSMAN_SITE_ID);
  const primul = document.getElementsByTagName("script")[0];
  if (primul?.parentNode) primul.parentNode.insertBefore(s, primul);
  else document.head.appendChild(s);
}

// Idempotent. Pornește doar cu acord pentru marketing, ID configurat și pe o pagină publică de site.
export function initNewsman(): boolean {
  if (typeof window === "undefined" || !newsmanConfigurat() || !esteAcordMarketing()) return false;
  if (!esteCaleCuPixel(window.location.pathname)) return false;
  const w = window as NzmWindow;
  trimiteConsimtamant(true);
  if (w.__faNewsmanInit) return true;
  w.__faNewsmanInit = true;
  incarcaScript(w);
  return true;
}

// Retragerea acordului: semnalul devine „refuzat” (scriptul oprește urmărirea) și ștergem cookie-urile Newsman de pe domeniu.
export function revocaNewsman() {
  if (typeof window === "undefined") return;
  if ((window as NzmWindow).__faNewsmanInit) trimiteConsimtamant(false);
  const host = window.location.hostname;
  const parti = host.split(".");
  const domenii = ["", host, `.${host}`];
  if (parti.length > 2) domenii.push(`.${parti.slice(-2).join(".")}`);
  document.cookie
    .split(";")
    .map((c) => c.split("=")[0].trim())
    .filter(esteCookieNewsman)
    .forEach((nume) => {
      for (const d of domenii) document.cookie = `${nume}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${d ? `; domain=${d}` : ""}`;
    });
}
