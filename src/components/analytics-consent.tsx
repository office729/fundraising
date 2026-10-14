"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

import { CONSENT_KEY as STORAGE_KEY, ensureAnalyticsInit, GA_ID } from "@/lib/analytics";
import { CONSENT_MARKETING_KEY, initMetaPixel, paginaNouaMeta, pixelConfigurat, revocaMeta } from "@/lib/meta-pixel";

const REOPEN_EVENT = "fa-cookie-consent-reopen";
const CHANGE_EVENT = "fa-cookie-consent-change";

type Alegere = "granted" | "denied";

export type BannerTexts = {
  titlu: string;
  text: string;
  accept: string;
  refuz: string;
  politica: string;
  // Alegerea separată pentru publicitate (Pixelul Meta): apare doar dacă NEXT_PUBLIC_META_PIXEL_ID e setat.
  textCuPublicitate: string;
  statistici: string;
  publicitate: string;
  salveaza: string;
  acceptaToate: string;
  refuzaToate: string;
};

function citeste(cheie: string): Alegere | null {
  try {
    const v = window.localStorage.getItem(cheie);
    return v === "granted" || v === "denied" ? v : null;
  } catch {
    return null;
  }
}

function salveaza(cheie: string, v: Alegere) {
  try {
    window.localStorage.setItem(cheie, v);
  } catch {
    // Storage blocat: alegerea rămâne valabilă doar pe pagina curentă.
  }
}

// La retragerea acordului ștergem cookie-urile _ga* deja setate (pe host și pe
// domeniul părinte) și oprim orice trimitere ulterioară către Google.
function opresteAnalytics() {
  (window as unknown as Record<string, unknown>)[`ga-disable-${GA_ID}`] = true;
  const host = window.location.hostname;
  const parti = host.split(".");
  const domenii = ["", host, `.${host}`];
  if (parti.length > 2) domenii.push(`.${parti.slice(-2).join(".")}`);
  document.cookie
    .split(";")
    .map((c) => c.split("=")[0].trim())
    .filter((nume) => nume === "_ga" || nume.startsWith("_ga_"))
    .forEach((nume) => {
      for (const d of domenii) {
        document.cookie = `${nume}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${d ? `; domain=${d}` : ""}`;
      }
    });
}

// "pending" = încă nu știm (randare pe server / înainte de hidratare) — bannerul
// nu apare atunci, ca să nu clipească pentru cine a ales deja.
type Stare = { analytics: Alegere | "unset" | "pending"; marketing: Alegere | "unset" | "pending" };
const SERVER: Stare = { analytics: "pending", marketing: "pending" };

function aboneaza(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

// Snapshot-ul trebuie să fie stabil între apeluri (altfel React se reîncarcă la infinit): îl păstrăm și îl înlocuim doar dacă s-a schimbat ceva.
let ultim: Stare = SERVER;
function snapshotClient(): Stare {
  const nou: Stare = { analytics: citeste(STORAGE_KEY) ?? "unset", marketing: citeste(CONSENT_MARKETING_KEY) ?? "unset" };
  if (nou.analytics !== ultim.analytics || nou.marketing !== ultim.marketing) ultim = nou;
  return ultim;
}
const snapshotServer = (): Stare => SERVER;

export function AnalyticsConsent({ texts }: { texts: BannerTexts }) {
  const stare = useSyncExternalStore(aboneaza, snapshotClient, snapshotServer);
  const pathname = usePathname();
  const [redeschis, setRedeschis] = useState(false);
  const cuPublicitate = pixelConfigurat();
  const [bifaStatistici, setBifaStatistici] = useState(false);
  const [bifaPublicitate, setBifaPublicitate] = useState(false);
  const ultimaCale = useRef(pathname);

  useEffect(() => {
    const redeschide = () => {
      // La redeschidere, casetele arată alegerea curentă.
      setBifaStatistici(citeste(STORAGE_KEY) === "granted");
      setBifaPublicitate(citeste(CONSENT_MARKETING_KEY) === "granted");
      setRedeschis(true);
    };
    window.addEventListener(REOPEN_EVENT, redeschide);
    return () => window.removeEventListener(REOPEN_EVENT, redeschide);
  }, []);

  const aplica = useCallback((statistici: boolean, publicitate: boolean) => {
    salveaza(STORAGE_KEY, statistici ? "granted" : "denied");
    if (pixelConfigurat()) salveaza(CONSENT_MARKETING_KEY, publicitate ? "granted" : "denied");
    window.dispatchEvent(new Event(CHANGE_EVENT));
    setRedeschis(false);
    if (!statistici) opresteAnalytics();
    else (window as unknown as Record<string, unknown>)[`ga-disable-${GA_ID}`] = false;
    if (pixelConfigurat() && !publicitate) revocaMeta();
  }, []);

  const statisticiAcceptate = stare.analytics === "granted";
  const publicitateAcceptata = stare.marketing === "granted";
  const necunoscut = stare.analytics === "pending";
  // Dacă există Pixel configurat, cine a ales deja doar pentru statistici e întrebat o singură dată și despre publicitate.
  const esteWidget = pathname?.endsWith("/embed") ?? false;
  const bannerDeschis = !esteWidget && !necunoscut && (stare.analytics === "unset" || (cuPublicitate && stare.marketing === "unset") || redeschis);

  useEffect(() => {
    if (statisticiAcceptate) ensureAnalyticsInit();
  }, [statisticiAcceptate]);

  useEffect(() => {
    if (publicitateAcceptata) initMetaPixel();
  }, [publicitateAcceptata]);

  // PageView Meta la navigarea între pagini (prima încărcare e trimisă de initMetaPixel).
  useEffect(() => {
    if (ultimaCale.current === pathname) return;
    ultimaCale.current = pathname;
    if (publicitateAcceptata) paginaNouaMeta();
  }, [pathname, publicitateAcceptata]);

  return (
    <>
      {bannerDeschis && (
        <div
          role="dialog"
          aria-labelledby="fa-cookie-titlu"
          className="fixed inset-x-3 bottom-3 z-[9999] mx-auto max-w-2xl rounded-xl border border-line bg-panel p-4 shadow-2xl sm:p-5"
        >
          <p id="fa-cookie-titlu" className="text-sm font-bold text-ink">
            {texts.titlu}
          </p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-body">
            {cuPublicitate ? texts.textCuPublicitate : texts.text}{" "}
            <Link href="/cookies" className="font-medium text-brand-green underline">
              {texts.politica}
            </Link>
          </p>
          {cuPublicitate && (
            <div className="mt-3 flex flex-col gap-2 text-[13px] text-ink">
              <label className="flex items-start gap-2">
                <input type="checkbox" checked={bifaStatistici} onChange={(e) => setBifaStatistici(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-line" />
                <span>{texts.statistici}</span>
              </label>
              <label className="flex items-start gap-2">
                <input type="checkbox" checked={bifaPublicitate} onChange={(e) => setBifaPublicitate(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-line" />
                <span>{texts.publicitate}</span>
              </label>
            </div>
          )}
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => aplica(false, false)}
              className="rounded-md border border-line bg-panel px-4 py-2 text-sm font-bold text-ink transition hover:bg-panel-2"
            >
              {cuPublicitate ? texts.refuzaToate : texts.refuz}
            </button>
            {cuPublicitate && (
              <button
                type="button"
                onClick={() => aplica(bifaStatistici, bifaPublicitate)}
                className="rounded-md border border-line bg-panel px-4 py-2 text-sm font-bold text-ink transition hover:bg-panel-2"
              >
                {texts.salveaza}
              </button>
            )}
            <button
              type="button"
              onClick={() => aplica(true, true)}
              className="rounded-md bg-brand-green px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-green-hover"
            >
              {cuPublicitate ? texts.acceptaToate : texts.accept}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// Buton pentru pagina de politică: redeschide bannerul, ca vizitatorul să-și
// poată schimba oricând alegerea (acordul se retrage la fel de ușor cum se dă).
export function CookieSettingsButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(REOPEN_EVENT))}
      className="rounded-md border border-line bg-panel px-4 py-2 text-sm font-bold text-ink transition hover:bg-panel-2"
    >
      {label}
    </button>
  );
}
