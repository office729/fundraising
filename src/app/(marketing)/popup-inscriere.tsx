"use client";

import { ArrowRight, BarChart3, Users, UsersRound, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition } from "react";

import {
  POPUP_CHEIE_ASCUNS_PANA,
  POPUP_CHEIE_PRIMA_VIZITA,
  POPUP_ZILE_ASCUNS_INCHIS,
  POPUP_ZILE_ASCUNS_TRIMIS,
  pesteCatArataPopup,
  valideazaInteres,
  type CampInteres,
  type EroriInteres,
} from "@/lib/popup-inscriere";

import { CONSENT_KEY } from "@/lib/analytics";

import { trimiteInteresAction } from "./interes-actions";

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

// Cristalul din ilustrație: fațete cu degrade verde → albastru, desenate în SVG (clar la orice mărime).
function Cristal() {
  return (
    <svg viewBox="0 0 300 340" className="h-full w-full" aria-hidden>
      <defs>
        <linearGradient id="pf1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7ff3ff" />
          <stop offset="1" stopColor="#1e8fe0" />
        </linearGradient>
        <linearGradient id="pf2" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4de29a" />
          <stop offset="1" stopColor="#2fb4a6" />
        </linearGradient>
        <linearGradient id="pf3" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#58e0e8" />
          <stop offset="1" stopColor="#1578d0" />
        </linearGradient>
        <linearGradient id="pf4" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2aa6e6" />
          <stop offset="1" stopColor="#0f58b8" />
        </linearGradient>
        <linearGradient id="pf5" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1f6fd6" />
          <stop offset="1" stopColor="#0a3a95" />
        </linearGradient>
        <linearGradient id="pf6" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2fbf86" />
          <stop offset="1" stopColor="#1b66c8" />
        </linearGradient>
      </defs>
      <g stroke="rgba(255,255,255,.35)" strokeWidth="1" strokeLinejoin="round">
        <polygon points="150,0 10,125 145,150" fill="url(#pf1)" />
        <polygon points="150,0 145,150 290,85" fill="url(#pf2)" />
        <polygon points="10,125 55,215 145,150" fill="url(#pf3)" />
        <polygon points="145,150 55,215 145,335" fill="url(#pf4)" />
        <polygon points="145,150 145,335 235,265" fill="url(#pf5)" />
        <polygon points="145,150 235,265 290,85" fill="url(#pf6)" />
      </g>
      <polygon points="150,0 118,72 145,150" fill="rgba(255,255,255,.55)" />
      <polygon points="10,125 100,112 145,150" fill="rgba(255,255,255,.3)" />
    </svg>
  );
}

function Eticheta({ icon: Icon, text, className }: { icon: typeof Users; text: string; className: string }) {
  return (
    <span className={`absolute flex items-center gap-2.5 rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-[15px] font-semibold text-white shadow-[0_8px_24px_rgba(0,20,60,.35)] backdrop-blur-sm ${className}`}>
      <Icon className="h-5 w-5 text-[#2de2a8]" aria-hidden />
      {text}
    </span>
  );
}

const CAMPURI: { cheie: CampInteres; eticheta: string; placeholder: string; tip: string; complet: string; optional?: boolean }[] = [
  { cheie: "nume", eticheta: "Nume și prenume", placeholder: "Cum te numești?", tip: "text", complet: "name" },
  { cheie: "organizatie", eticheta: "Organizație", placeholder: "Numele organizației tale", tip: "text", complet: "organization" },
  { cheie: "email", eticheta: "E-mail", placeholder: "adresa@organizatie.ro", tip: "email", complet: "email" },
  { cheie: "telefon", eticheta: "Telefon (opțional)", placeholder: "+40", tip: "tel", complet: "tel", optional: true },
];

export function PopupInscriere({ ascuns }: { ascuns: boolean }) {
  const cale = usePathname();
  const idTitlu = useId();
  const [deschis, setDeschis] = useState(false);
  const [vizibil, setVizibil] = useState(false); // pentru tranziția de apariție
  const [previzualizare, setPrevizualizare] = useState(false);
  const [valori, setValori] = useState({ nume: "", organizatie: "", email: "", telefon: "", acord: false, website: "" });
  const [erori, setErori] = useState<EroriInteres>({});
  const [eroareGenerala, setEroareGenerala] = useState<string | null>(null);
  const [trimis, setTrimis] = useState(false);
  const [pending, startTransition] = useTransition();
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

  const schimba = (cheie: keyof typeof valori, valoare: string | boolean) => {
    setValori((v) => ({ ...v, [cheie]: valoare }));
    if (cheie in erori) setErori((e) => ({ ...e, [cheie]: undefined }));
  };

  const trimite = (ev: React.FormEvent) => {
    ev.preventDefault();
    setEroareGenerala(null);
    const v = valideazaInteres(valori);
    if (!v.ok) {
      setErori(v.erori);
      dialog.current?.querySelector<HTMLElement>(`[name=${Object.keys(v.erori)[0]}]`)?.focus();
      return;
    }
    setErori({});
    startTransition(async () => {
      try {
        const r = await trimiteInteresAction({ ...v.date, website: valori.website, cale, previzualizare });
        if (r.ok) {
          if (!previzualizare) scrieNr("local", POPUP_CHEIE_ASCUNS_PANA, Date.now() + POPUP_ZILE_ASCUNS_TRIMIS * ZI_MS);
          setTrimis(true);
        } else {
          if (r.campuri) setErori(r.campuri);
          setEroareGenerala(r.eroare);
        }
      } catch {
        setEroareGenerala("Nu am putut trimite acum. Încearcă din nou în câteva clipe.");
      }
    });
  };

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
        className={`relative grid w-full max-w-[980px] outline-none overflow-hidden rounded-[22px] bg-white shadow-[0_30px_80px_rgba(0,10,40,.55)] transition-transform duration-300 motion-reduce:transition-none md:grid-cols-[46fr_54fr] ${vizibil ? "translate-y-0" : "translate-y-3"}`}
      >
        <button type="button" onClick={() => inchide(POPUP_ZILE_ASCUNS_INCHIS)} aria-label="Închide" className="absolute top-3 right-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-[#0b1f4d] shadow hover:bg-white md:bg-[#eef2f8]">
          <X className="h-5 w-5" aria-hidden />
        </button>

        {/* Stânga: mesajul și ilustrația */}
        <div className="relative overflow-hidden bg-[linear-gradient(160deg,#00407a_0%,#001f4d_55%,#001231_100%)] px-7 pt-8 pb-8 text-white md:min-h-[560px] md:px-9 md:pb-[76px]">
          <Image src="/alexandrit-logo-alb.png" alt="Alexandrit" width={1730} height={332} className="h-auto w-[190px] md:w-[230px]" priority={false} />
          <h2 id={idTitlu} className="font-display mt-6 text-[34px] leading-[1.02] font-extrabold tracking-tight md:mt-9 md:text-[50px]">
            Mai mult timp
            <br />
            pentru <span className="text-[#2de2a8]">tine.</span>
          </h2>
          <p className="mt-3 max-w-[22rem] text-[17px] leading-snug text-white/90 md:mt-4 md:text-[21px]">Donatorii, campaniile și echipa.
            <br />
            Într-un singur loc.
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
            <Eticheta icon={Users} text="Donatori" className="top-0 left-0" />
            <Eticheta icon={BarChart3} text="Campanii" className="top-[96px] right-0" />
            <Eticheta icon={UsersRound} text="Echipă" className="bottom-0 left-2" />
          </div>
          <p className="hidden text-[18px] font-semibold md:absolute md:bottom-7 md:left-9 md:mt-0 md:block">alexandrit.ro</p>
        </div>

        {/* Dreapta: formularul */}
        <div className="px-6 pt-8 pb-7 text-[#0b1f4d] md:px-9 md:pt-12">
          {trimis ? (
            <div role="status" className="flex h-full min-h-[320px] flex-col items-start justify-center">
              <p className="text-xs font-bold tracking-[.18em] uppercase">Mulțumim</p>
              <h3 className="font-display mt-3 text-[34px] leading-tight font-extrabold md:text-[42px]">Am primit datele tale<span className="text-[#06a87b]">.</span></h3>
              <p className="mt-3 max-w-md text-[17px] text-[#0b1f4d]/80">Te vom contacta în curând. Între timp, poți arunca o privire pe site.</p>
              <button type="button" onClick={() => inchide(POPUP_ZILE_ASCUNS_TRIMIS)} className="mt-6 inline-flex h-12 items-center rounded-xl bg-[#06a87b] px-6 text-[16px] font-bold text-white hover:bg-[#058f69]">
                Închide
              </button>
            </div>
          ) : (
            <form onSubmit={trimite} noValidate>
              <p className="text-[12px] font-bold tracking-[.2em] uppercase md:text-[13px]">Pentru organizații care fac bine</p>
              <p className="font-display mt-3 text-[34px] leading-none font-extrabold tracking-tight md:text-[40px]" aria-hidden>
                Descoperă Alexandrit<span className="text-[#06a87b]">.</span>
              </p>
              <p className="mt-3 text-[17px] text-[#0b1f4d]/85 md:text-[21px]">Lasă-ne datele tale și te vom contacta.</p>

              <div className="mt-6 grid gap-x-4 gap-y-4 sm:grid-cols-2">
                {CAMPURI.map((c) => (
                  <label key={c.cheie} className="block">
                    <span className="text-[15px] font-bold">{c.eticheta}</span>
                    <input
                      name={c.cheie}
                      type={c.tip}
                      autoComplete={c.complet}
                      value={valori[c.cheie as "nume"]}
                      onChange={(e) => schimba(c.cheie as keyof typeof valori, e.target.value)}
                      placeholder={c.placeholder}
                      maxLength={c.cheie === "organizatie" ? 150 : c.cheie === "email" ? 254 : 100}
                      aria-invalid={Boolean(erori[c.cheie])}
                      aria-describedby={erori[c.cheie] ? `${idTitlu}-${c.cheie}` : undefined}
                      className={`mt-1.5 h-[52px] w-full rounded-xl border bg-white px-4 text-[16px] text-[#0b1f4d] placeholder:text-[#8a96ad] focus:border-[#154a85] focus:ring-2 focus:ring-[#154a85]/25 focus:outline-none ${erori[c.cheie] ? "border-red-500" : "border-[#c9d3e3]"}`}
                    />
                    {erori[c.cheie] && (
                      <span id={`${idTitlu}-${c.cheie}`} role="alert" className="mt-1 block text-[13px] text-red-700">
                        {erori[c.cheie]}
                      </span>
                    )}
                  </label>
                ))}
              </div>

              {/* Capcană pentru roboți: ascuns oamenilor și cititoarelor de ecran */}
              <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
                <label>
                  Site
                  <input name="website" tabIndex={-1} autoComplete="off" value={valori.website} onChange={(e) => schimba("website", e.target.value)} />
                </label>
              </div>

              <label className="mt-5 flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  name="acord"
                  checked={valori.acord}
                  onChange={(e) => schimba("acord", e.target.checked)}
                  aria-invalid={Boolean(erori.acord)}
                  className="mt-0.5 h-6 w-6 shrink-0 cursor-pointer rounded-md border-[#8a96ad] accent-[#06a87b]"
                />
                <span className="text-[16px] leading-snug">
                  Am citit{" "}
                  <Link href="/gdpr" target="_blank" rel="noopener noreferrer" prefetch={false} className="inline-block py-1.5 text-[#0b63d6] underline underline-offset-2">
                    Politica de confidențialitate.
                  </Link>
                </span>
              </label>
              {erori.acord && (
                <p role="alert" className="mt-1 text-[13px] text-red-700">
                  {erori.acord}
                </p>
              )}

              {eroareGenerala && (
                <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-[14px] text-red-800">
                  {eroareGenerala}
                </p>
              )}

              <button
                type="submit"
                disabled={pending}
                className="mt-5 flex h-14 w-full items-center justify-center gap-3 rounded-xl bg-[#06a87b] text-[18px] font-bold text-white transition hover:bg-[#058f69] focus-visible:ring-2 focus-visible:ring-[#154a85] focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-70"
              >
                {pending ? "Se trimite…" : "Sunt interesat de Alexandrit"}
                {!pending && <ArrowRight className="h-5 w-5" aria-hidden />}
              </button>
              <p className="mt-4 text-center text-[15px] text-[#0b1f4d]/65">Fă primul pas spre un ONG mai bine organizat.</p>
              {previzualizare && <p className="mt-2 text-center text-xs text-amber-700">Previzualizare: mesajul se trimite marcat [TEST].</p>}
            </form>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
