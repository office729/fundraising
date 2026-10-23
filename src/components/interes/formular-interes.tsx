"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useId, useState, useTransition } from "react";

import { trimiteInteresAction } from "@/app/(marketing)/interes-actions";
import { valideazaInteres, type CampInteres, type EroriInteres } from "@/lib/popup-inscriere";

const CAMPURI: { cheie: CampInteres; eticheta: string; placeholder: string; tip: string; complet: string }[] = [
  { cheie: "nume", eticheta: "Nume și prenume", placeholder: "Cum te numești?", tip: "text", complet: "name" },
  { cheie: "organizatie", eticheta: "Organizație", placeholder: "Numele organizației tale", tip: "text", complet: "organization" },
  { cheie: "email", eticheta: "E-mail", placeholder: "adresa@organizatie.ro", tip: "email", complet: "email" },
  { cheie: "telefon", eticheta: "Telefon (opțional)", placeholder: "+40", tip: "tel", complet: "tel" },
];

// Parametrii de campanie din adresa paginii (utm_source / utm_medium / utm_campaign), ca echipa să știe de unde vine fiecare ONG. Citiți doar la trimitere.
function campanieDinAdresa(): string {
  try {
    const p = new URLSearchParams(window.location.search);
    return ["utm_source", "utm_medium", "utm_campaign"]
      .map((k) => (p.get(k) ? `${k.slice(4)}=${p.get(k)}` : ""))
      .filter(Boolean)
      .join(", ")
      .slice(0, 160);
  } catch {
    return "";
  }
}

// Formularul „Descoperă Alexandrit”, comun pop-up-ului și paginii /descopera: câmpurile, bifa de confidențialitate, trimiterea și erorile. Antetul și mesajul de
// mulțumire rămân în pagina care îl folosește; `onTrimis` anunță succesul. Datele ajung pe e-mail la echipă (vezi interes-actions.ts).
export function FormularInteres({ cale, previzualizare = false, onTrimis, nota = true }: { cale: string; previzualizare?: boolean; onTrimis: () => void; nota?: boolean }) {
  const idBaza = useId();
  const [valori, setValori] = useState({ nume: "", organizatie: "", email: "", telefon: "", acord: false, capcana: "" });
  const [erori, setErori] = useState<EroriInteres>({});
  const [eroareGenerala, setEroareGenerala] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const schimba = (cheie: keyof typeof valori, valoare: string | boolean) => {
    setValori((v) => ({ ...v, [cheie]: valoare }));
    if (cheie in erori) setErori((e) => ({ ...e, [cheie]: undefined }));
  };

  const trimite = (ev: React.FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    setEroareGenerala(null);
    const v = valideazaInteres(valori);
    if (!v.ok) {
      setErori(v.erori);
      ev.currentTarget.querySelector<HTMLElement>(`[name=${Object.keys(v.erori)[0]}]`)?.focus();
      return;
    }
    setErori({});
    startTransition(async () => {
      try {
        const r = await trimiteInteresAction({ ...v.date, capcana: valori.capcana, cale, previzualizare, campanie: campanieDinAdresa() });
        if (r.ok) onTrimis();
        else {
          if (r.campuri) setErori(r.campuri);
          setEroareGenerala(r.eroare);
        }
      } catch {
        setEroareGenerala("Nu am putut trimite acum. Încearcă din nou în câteva clipe.");
      }
    });
  };

  return (
    <form onSubmit={trimite} noValidate className="relative">
      <div className="grid gap-x-4 gap-y-4 sm:grid-cols-2">
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
              aria-describedby={erori[c.cheie] ? `${idBaza}-${c.cheie}` : undefined}
              className={`mt-1.5 h-[52px] w-full rounded-xl border bg-white px-4 text-[16px] text-[#0b1f4d] placeholder:text-[#8a96ad] focus:border-[#154a85] focus:ring-2 focus:ring-[#154a85]/25 focus:outline-none ${erori[c.cheie] ? "border-red-500" : "border-[#c9d3e3]"}`}
            />
            {erori[c.cheie] && (
              <span id={`${idBaza}-${c.cheie}`} role="alert" className="mt-1 block text-[13px] text-red-700">
                {erori[c.cheie]}
              </span>
            )}
          </label>
        ))}
      </div>

      {/* Capcană pentru roboți: ascuns oamenilor și cititoarelor de ecran. Nume fără sens pentru autocompletare (nu „website”, „url”…), ca o completare automată
          a browserului să nu facă formularul al unui om să pară trimis de robot. */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Nu completa acest câmp
          <input name="alx_extra" tabIndex={-1} autoComplete="off" value={valori.capcana} onChange={(e) => schimba("capcana", e.target.value)} />
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
      {nota && <p className="mt-4 text-center text-[15px] text-[#0b1f4d]/65">Fă primul pas spre un ONG mai bine organizat.</p>}
      {previzualizare && <p className="mt-2 text-center text-xs text-amber-700">Previzualizare: mesajul se trimite marcat [TEST].</p>}
    </form>
  );
}
