"use client";

import { BarChart3, Users, UsersRound, X } from "lucide-react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { CONSENT_KEY } from "@/lib/analytics";
import type { Locale } from "@/lib/i18n/config";
import { INTERES_UI_DICT } from "@/lib/i18n/dictionaries/interes-ui";
import { FormularInteres } from "@/components/interes/formular-interes";
import { Cristal, Eticheta } from "@/components/interes/ilustratie";
import {
  POPUP_CHEIE_ASCUNS_PANA,
  POPUP_CHEIE_PRIMA_VIZITA,
  POPUP_ZILE_ASCUNS_INCHIS,
  POPUP_ZILE_ASCUNS_TRIMIS,
  pesteCatArataPopup,
} from "@/lib/popup-inscriere";

const ZI_MS = 86_400_000;

// Citirea/scrierea în stocarea browserului poate eșua (mod privat, date blocate): pop-up-ul trebuie să meargă și fără ea.
function citesteNr(stocare: "local" | "session", cheie: string): number {
  try {
    const v = (stocare === "local" ? window.localStorage : window.sessionStorage).getItem(cheie);
    const n = v ? Number(v) : 0;
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}
function scrieNr(stocare: "local" | "session", cheie: string, valoare: number) {
  try {
    (stocare === "local" ? window.localStorage : window.sessionStorage).setItem(cheie, String(valoare));
  } catch {
    /* fără stocare: pop-up-ul poate reapărea la următoarea vizită */
  }
}

// Bannerul de cookie-uri are prioritate: pop-up-ul așteaptă până când vizitatorul a ales (accept sau refuz). Alegerea e în localStorage, iar bannerul
// anunță schimbările prin evenimentul de mai jos.
const EVENIMENT_COOKIE = "fa-cookie-consent-change";
function bannerCookieDeschis(): boolean {
  try {
    const v = window.localStorage.getItem(CONSENT_KEY);
    return v !== "granted" && v !== "denied";
  } catch {
    return false; // fără stocare bannerul nu poate păstra alegerea; nu blocăm pop-up-ul
  }
}

export function PopupInscriere({ ascuns, locale }: { ascuns: boolean; locale: Locale }) {
  const t = INTERES_UI_DICT[locale];
  const cale = usePathname();
  const idTitlu = useId();
  const [deschis, setDeschis] = useState(false);
  const [vizibil, setVizibil] = useState(false); // pentru tranziția de apariție
  const [previzualizare, setPrevizualizare] = useState(false);
  const [trimis, setTrimis] = useState(false);
  const dialog = useRef<HTMLDivElement>(null);
  const focusAnterior = useRef<HTMLElement | null>(null);

  // Programează afișarea: după 20 de secunde de la prima vizită din sesiune, dar nu înainte de lansare; nu pe paginile excluse și nu dacă vizitatorul l-a închis recent.
  useEffect(() => {
    if (ascuns) return;
    const test = new URLSearchParams(window.location.search).get("popup") === "previzualizare";
    let prima = citesteNr("session", POPUP_CHEIE_PRIMA_VIZITA);
    if (!prima) {
      prima = Date.now();
      scrieNr("session", POPUP_CHEIE_PRIMA_VIZITA, prima);
    }
    const ms = pesteCatArataPopup({ acum: Date.now(), primaVizita: prima, ascunsPana: citesteNr("local", POPUP_CHEIE_ASCUNS_PANA), cale, previzualizare: test });
    if (ms === null) return;
    const arata = () => {
      focusAnterior.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setPrevizualizare(test);
      setDeschis(true);
    };
    let asteapta: (() => void) | null = null;
    const t = setTimeout(() => {
      if (test || !bannerCookieDeschis()) return arata();
      // Bannerul încă așteaptă un răspuns: arătăm pop-up-ul imediat după ce vizitatorul alege.
      asteapta = () => {
        if (bannerCookieDeschis()) return;
        window.removeEventListener(EVENIMENT_COOKIE, asteapta!);
        window.removeEventListener("storage", asteapta!);
        setTimeout(arata, 1200);
      };
      window.addEventListener(EVENIMENT_COOKIE, asteapta);
      window.addEventListener("storage", asteapta);
    }, ms);
    return () => {
      clearTimeout(t);
      if (asteapta) {
        window.removeEventListener(EVENIMENT_COOKIE, asteapta);
        window.removeEventListener("storage", asteapta);
      }
    };
  }, [ascuns, cale]);

  // La apariție: tranziție, blocare derulare, focus pe primul câmp. La dispariție, focusul revine unde era.
  useEffect(() => {
    if (!deschis) return;
    const raf = requestAnimationFrame(() => setVizibil(true));
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Pe telefon focusul merge pe fereastră, nu pe primul câmp: altfel se deschide tastatura și acoperă tot ce a apărut.
    if (window.matchMedia("(min-width: 768px)").matches) dialog.current?.querySelector<HTMLInputElement>("input[name=nume]")?.focus();
    else dialog.current?.focus({ preventScroll: true });
    return () => {
      cancelAnimationFrame(raf);
      document.body.style.overflow = overflow;
      focusAnterior.current?.focus?.();
    };
  }, [deschis]);

  const inchide = (zile: number) => {
    if (!previzualizare) scrieNr("local", POPUP_CHEIE_ASCUNS_PANA, Date.now() + zile * ZI_MS);
    setVizibil(false);
    setDeschis(false);
  };

  if (!deschis) return null;

  // Focusul rămâne în fereastră cât e deschisă; Esc o închide.
  const tastatura = (ev: React.KeyboardEvent) => {
    if (ev.key === "Escape") {
      ev.stopPropagation();
      inchide(POPUP_ZILE_ASCUNS_INCHIS);
      return;
    }
    if (ev.key !== "Tab" || !dialog.current) return;
    const tinte = [...dialog.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), input:not([disabled]):not([tabindex='-1'])")].filter((e) => e.offsetParent !== null);
    if (tinte.length === 0) return;
    const prima = tinte[0];
    const ultima = tinte[tinte.length - 1];
    if (ev.shiftKey && document.activeElement === prima) {
      ev.preventDefault();
      ultima.focus();
    } else if (!ev.shiftKey && document.activeElement === ultima) {
      ev.preventDefault();
      prima.focus();
    }
  };

  return (
    <div
      className={`fixed inset-0 z-[2000] overflow-y-auto bg-[#00112b]/70 backdrop-blur-[2px] transition-opacity duration-300 motion-reduce:transition-none ${vizibil ? "opacity-100" : "opacity-0"}`}
      onKeyDown={tastatura}
    >
      {/* Pe ecrane mici fereastra e mai înaltă decât ecranul: se derulează de sus, fără să fie tăiată (min-h-full în loc de centrare pe overlay). */}
      <div className="flex min-h-full items-center justify-center p-3 sm:p-6" onMouseDown={(e) => e.target === e.currentTarget && inchide(POPUP_ZILE_ASCUNS_INCHIS)}>
        <div
          ref={dialog}
          role="dialog"
          aria-modal="true"
          aria-labelledby={idTitlu}
          tabIndex={-1}
          className={`relative grid w-full max-w-[980px] overflow-hidden rounded-[22px] bg-white shadow-[0_30px_80px_rgba(0,10,40,.55)] outline-none transition-transform duration-300 motion-reduce:transition-none md:grid-cols-[46fr_54fr] ${vizibil ? "translate-y-0" : "translate-y-3"}`}
        >
          <button type="button" onClick={() => inchide(POPUP_ZILE_ASCUNS_INCHIS)} aria-label={t.inchideAria} className="absolute top-3 right-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-[#0b1f4d] shadow hover:bg-white md:bg-[#eef2f8]">
            <X className="h-5 w-5" aria-hidden />
          </button>

          {/* Stânga: mesajul și ilustrația */}
          <div className="relative overflow-hidden bg-[linear-gradient(160deg,#00407a_0%,#001f4d_55%,#001231_100%)] px-7 pt-8 pb-8 text-white md:min-h-[560px] md:px-9 md:pb-[76px]">
            <Image src="/alexandrit-logo-alb.png" alt="Alexandrit" width={1730} height={332} className="h-auto w-[190px] md:w-[230px]" priority={false} />
            <h2 id={idTitlu} className="font-display mt-6 text-[34px] leading-[1.02] font-extrabold tracking-tight md:mt-9 md:text-[50px]">
              {t.mesaj.titluLinia1}
              <br />
              {t.mesaj.titluPentru}<span className="text-[#2de2a8]">{t.mesaj.titluTine}</span>
            </h2>
            <p className="mt-3 max-w-[22rem] text-[17px] leading-snug text-white/90 md:mt-4 md:text-[21px]">
              {t.mesaj.sub1}
              <br />
              {t.mesaj.sub2}
            </p>

            <div className="relative mx-auto mt-6 hidden h-[260px] w-full max-w-[420px] md:block" aria-hidden>
              <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(40,200,255,.35)_0%,rgba(0,100,220,.12)_45%,transparent_70%)]" />
              <svg className="absolute inset-0 h-full w-full" viewBox="0 0 420 260" fill="none">
                <ellipse cx="210" cy="140" rx="190" ry="78" stroke="rgba(120,220,255,.45)" strokeWidth="1.2" transform="rotate(-8 210 140)" />
                <circle cx="372" cy="104" r="3.5" fill="#bdf3ff" />
                <circle cx="60" cy="150" r="2.5" fill="#bdf3ff" />
              </svg>
              <div className="absolute top-1/2 left-1/2 h-[230px] w-[200px] -translate-x-1/2 -translate-y-1/2 drop-shadow-[0_0_30px_rgba(60,220,255,.55)]">
                <Cristal />
              </div>
              <Eticheta icon={Users} text={t.ilustratie.donatori} className="top-0 left-0" />
              <Eticheta icon={BarChart3} text={t.ilustratie.campanii} className="top-[96px] right-0" />
              <Eticheta icon={UsersRound} text={t.ilustratie.echipa} className="bottom-0 left-2" />
            </div>
            <p className="hidden text-[18px] font-semibold md:absolute md:bottom-7 md:left-9 md:mt-0 md:block">alexandrit.ro</p>
          </div>

          {/* Dreapta: formularul */}
          <div className="px-6 pt-8 pb-7 text-[#0b1f4d] md:px-9 md:pt-12">
            {trimis ? (
              <div role="status" className="flex h-full min-h-[320px] flex-col items-start justify-center">
                <p className="text-xs font-bold tracking-[.18em] uppercase">{t.multumim.eticheta}</p>
                <h3 className="font-display mt-3 text-[34px] leading-tight font-extrabold md:text-[42px]">
                  {t.multumim.titlu}<span className="text-[#06a87b]">.</span>
                </h3>
                <p className="mt-3 max-w-md text-[17px] text-[#0b1f4d]/80">{t.multumim.popup}</p>
                <button type="button" onClick={() => inchide(POPUP_ZILE_ASCUNS_TRIMIS)} className="mt-6 inline-flex h-12 items-center rounded-xl bg-[#06a87b] px-6 text-[16px] font-bold text-white hover:bg-[#058f69]">
                  {t.multumim.inchide}
                </button>
              </div>
            ) : (
              <>
                <p className="text-[12px] font-bold tracking-[.2em] uppercase md:text-[13px]">{t.formular.pentruOrganizatii}</p>
                <p className="font-display mt-3 text-[34px] leading-none font-extrabold tracking-tight md:text-[40px]" aria-hidden>
                  {t.formular.descopera}<span className="text-[#06a87b]">.</span>
                </p>
                <p className="mt-3 mb-6 text-[17px] text-[#0b1f4d]/85 md:text-[21px]">{t.formular.lasaDatele}</p>
                <FormularInteres
                  locale={locale}
                  cale={cale}
                  previzualizare={previzualizare}
                  onTrimis={() => {
                    if (!previzualizare) scrieNr("local", POPUP_CHEIE_ASCUNS_PANA, Date.now() + POPUP_ZILE_ASCUNS_TRIMIS * ZI_MS);
                    setTrimis(true);
                  }}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
