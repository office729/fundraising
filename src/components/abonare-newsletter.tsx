"use client";

import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useId, useState, useTransition } from "react";

import { aboneazaNewsletterAction } from "@/app/(marketing)/newsletter-actions";
import { valideazaAbonare, type EroriAbonare } from "@/lib/abonare-newsletter";
import type { MarketingDict } from "@/lib/i18n/dictionaries/marketing";

// Abonarea la newsletter din subsolul site-ului public (tema închisă a subsolului). Adresa e confirmată prin email (double opt-in, vezi newsletter-actions.ts); acordul e o casetă
// separată, nebifată dinainte. După trimitere arătăm doar „verifică-ți emailul”, la fel indiferent dacă adresa era deja în listă.
export function AbonareNewsletter({ t }: { t: MarketingDict["footer"]["newsletter"] }) {
  const idBaza = useId();
  const [email, setEmail] = useState("");
  const [acord, setAcord] = useState(false);
  const [capcana, setCapcana] = useState("");
  const [erori, setErori] = useState<EroriAbonare>({});
  const [eroareGenerala, setEroareGenerala] = useState<string | null>(null);
  const [trimis, setTrimis] = useState(false);
  const [pending, startTransition] = useTransition();

  const mesajCamp = (cod: EroriAbonare[keyof EroriAbonare]) => (cod ? t.erori[cod] : undefined);

  const trimite = (ev: React.FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    setEroareGenerala(null);
    const v = valideazaAbonare({ email, acord });
    if (!v.ok) {
      setErori(v.erori);
      ev.currentTarget.querySelector<HTMLElement>(v.erori.email ? "[name=email]" : "[name=acord]")?.focus();
      return;
    }
    setErori({});
    startTransition(async () => {
      try {
        const r = await aboneazaNewsletterAction({ email: v.email, acord: true, capcana });
        if (r.ok) setTrimis(true);
        else if (r.cod === "campuri" && r.campuri) setErori(r.campuri);
        else setEroareGenerala(t.erori[r.cod === "campuri" ? "esec" : r.cod]);
      } catch {
        setEroareGenerala(t.erori.esec);
      }
    });
  };

  return (
    <div className="mx-auto mt-10 grid max-w-6xl grid-cols-1 gap-6 border-t border-white/10 pt-8 lg:grid-cols-2 lg:gap-12">
      <div>
        <p className="text-xs font-bold tracking-wide text-white/50 uppercase">{t.titlu}</p>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-white/75">{t.text}</p>
      </div>

      {trimis ? (
        <div role="status" className="flex items-start gap-3 rounded-xl border border-white/15 bg-white/5 p-4">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#9ce2af]" aria-hidden />
          <div>
            <p className="text-sm font-bold text-white">{t.succesTitlu}</p>
            <p className="mt-1 text-sm leading-relaxed text-white/75">{t.succesText}</p>
          </div>
        </div>
      ) : (
        <form onSubmit={trimite} noValidate className="relative max-w-xl">
          <label className="block">
            <span className="text-[13px] font-bold text-white/80">{t.emailEticheta}</span>
            <div className="mt-1.5 flex flex-col gap-2 sm:flex-row">
              <input
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (erori.email) setErori((x) => ({ ...x, email: undefined }));
                }}
                placeholder={t.placeholder}
                maxLength={254}
                aria-invalid={Boolean(erori.email)}
                aria-describedby={erori.email ? `${idBaza}-email` : undefined}
                className={`h-12 w-full rounded-lg border bg-white px-4 text-[16px] text-[#0b1f4d] placeholder:text-[#8a96ad] focus:ring-2 focus:ring-[#9ce2af]/60 focus:outline-none ${erori.email ? "border-red-400" : "border-white/20"}`}
              />
              <button
                type="submit"
                disabled={pending}
                className="h-12 shrink-0 rounded-lg bg-[#06a87b] px-6 text-[15px] font-bold text-white transition hover:bg-[#058f69] focus-visible:ring-2 focus-visible:ring-[#9ce2af] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1a2332] focus-visible:outline-none disabled:opacity-70"
              >
                {pending ? t.seTrimite : t.buton}
              </button>
            </div>
            {erori.email && (
              <span id={`${idBaza}-email`} role="alert" className="mt-1.5 block text-[13px] text-red-300">
                {mesajCamp(erori.email)}
              </span>
            )}
          </label>

          {/* Capcană pentru roboți: ascuns oamenilor și cititoarelor de ecran; nume fără sens pentru autocompletare. */}
          <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
            <label>
              {t.capcana}
              <input name="alx_extra_nl" tabIndex={-1} autoComplete="off" value={capcana} onChange={(e) => setCapcana(e.target.value)} />
            </label>
          </div>

          <label className="mt-3 flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              name="acord"
              checked={acord}
              onChange={(e) => {
                setAcord(e.target.checked);
                if (erori.acord) setErori((x) => ({ ...x, acord: undefined }));
              }}
              aria-invalid={Boolean(erori.acord)}
              className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded accent-[#06a87b]"
            />
            <span className="text-[13px] leading-snug text-white/75">
              {t.acord}{" "}
              <Link href="/gdpr" prefetch={false} className="inline-block py-1 underline underline-offset-2 hover:text-white">
                {t.politica}
              </Link>
            </span>
          </label>
          {erori.acord && (
            <p role="alert" className="mt-1.5 text-[13px] text-red-300">
              {mesajCamp(erori.acord)}
            </p>
          )}
          {eroareGenerala && (
            <p role="alert" className="mt-3 rounded-lg bg-red-500/15 px-3 py-2 text-[13px] text-red-200">
              {eroareGenerala}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
