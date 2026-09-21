"use client";

import Link from "next/link";
import Script from "next/script";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

// ID-ul de măsurare Google Analytics 4 — public prin natura lui (apare în
// codul paginii oricărui site care îl folosește), deci nu e secret.
const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "G-8R9P9XB8F1";

const STORAGE_KEY = "fa_cookie_consent";
const REOPEN_EVENT = "fa-cookie-consent-reopen";
const CHANGE_EVENT = "fa-cookie-consent-change";

type Alegere = "granted" | "denied";

export type BannerTexts = {
  titlu: string;
  text: string;
  accept: string;
  refuz: string;
  politica: string;
};

function citesteAlegerea(): Alegere | null {
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v === "granted" || v === "denied" ? v : null;
  } catch {
    return null;
  }
}

function salveazaAlegerea(v: Alegere | null) {
  try {
    if (v) window.localStorage.setItem(STORAGE_KEY, v);
    else window.localStorage.removeItem(STORAGE_KEY);
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
type Stare = Alegere | "unset" | "pending";

function aboneaza(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

const snapshotClient = (): Stare => citesteAlegerea() ?? "unset";
const snapshotServer = (): Stare => "pending";

export function AnalyticsConsent({ texts }: { texts: BannerTexts }) {
  const stare = useSyncExternalStore(aboneaza, snapshotClient, snapshotServer);
  const [redeschis, setRedeschis] = useState(false);

  useEffect(() => {
    const redeschide = () => setRedeschis(true);
    window.addEventListener(REOPEN_EVENT, redeschide);
    return () => window.removeEventListener(REOPEN_EVENT, redeschide);
  }, []);

  const alege = useCallback((v: Alegere) => {
    salveazaAlegerea(v);
    window.dispatchEvent(new Event(CHANGE_EVENT));
    setRedeschis(false);
    if (v === "denied") opresteAnalytics();
    else (window as unknown as Record<string, unknown>)[`ga-disable-${GA_ID}`] = false;
  }, []);

  const alegere = stare === "granted" || stare === "denied" ? stare : null;
  const bannerDeschis = stare === "unset" || (stare !== "pending" && redeschis);

  return (
    <>
      {alegere === "granted" && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
          <Script id="ga-init" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}');`}
          </Script>
        </>
      )}

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
            {texts.text}{" "}
            <Link href="/cookies" className="font-medium text-brand-green underline">
              {texts.politica}
            </Link>
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => alege("denied")}
              className="rounded-md border border-line bg-panel px-4 py-2 text-sm font-bold text-ink transition hover:bg-panel-2"
            >
              {texts.refuz}
            </button>
            <button
              type="button"
              onClick={() => alege("granted")}
              className="rounded-md border border-line bg-panel px-4 py-2 text-sm font-bold text-ink transition hover:bg-panel-2"
            >
              {texts.accept}
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
