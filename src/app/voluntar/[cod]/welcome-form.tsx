"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { adaugaTelefonAction, intraAction } from "./actions";

const camp =
  "w-full rounded-xl border border-[var(--vp-line)] bg-white px-3.5 py-3 text-[16px] text-[var(--vp-ink)] placeholder:text-[#a79a90] focus:border-[var(--vp-brand)] focus:ring-2 focus:ring-[var(--vp-brand)]/25 focus:outline-none";

export function WelcomeForm({ cod, orgNume }: { cod: string; orgNume: string }) {
  const router = useRouter();
  const [prenume, setPrenume] = useState("");
  const [telefon, setTelefon] = useState("");
  const [eroare, setEroare] = useState("");
  const [pending, start] = useTransition();

  function trimite(e: React.FormEvent) {
    e.preventDefault();
    setEroare("");
    start(async () => {
      const r = await intraAction(cod, prenume, telefon);
      if (r.ok) router.refresh();
      else setEroare(r.eroare);
    });
  }

  return (
    <form onSubmit={trimite} className="rounded-2xl border border-[var(--vp-line)] bg-white p-5 shadow-sm" noValidate>
      <h2 className="font-display text-[20px] font-bold">Bine ai venit, voluntarule!</h2>
      <p className="mt-1 text-[14px] text-[var(--vp-muted)]">
        Alături de {orgNume}, dai mai departe campaniile către oamenii tăi. Durează un minut să începi.
      </p>

      <label htmlFor="vp-prenume" className="mt-4 block text-[13px] font-semibold">
        Prenumele tău
      </label>
      <input id="vp-prenume" className={`${camp} mt-1`} autoComplete="given-name" maxLength={40} value={prenume} onChange={(e) => setPrenume(e.target.value)} placeholder="ex. Maria" required />

      <label htmlFor="vp-telefon" className="mt-3 block text-[13px] font-semibold">
        Telefon <span className="font-normal text-[var(--vp-muted)]">(opțional)</span>
      </label>
      <input id="vp-telefon" className={`${camp} mt-1`} type="tel" inputMode="tel" autoComplete="tel" maxLength={20} value={telefon} onChange={(e) => setTelefon(e.target.value)} placeholder="ex. 0722 123 456" />
      <p className="mt-1.5 text-[12.5px] text-[var(--vp-muted)]">Cu telefonul, echipa te recunoaște dacă ești deja în lista de voluntari și îți vede contribuția. Nu îl afișăm nimănui.</p>

      {eroare && (
        <p role="alert" className="mt-3 rounded-lg bg-[#fdecea] px-3 py-2 text-[13.5px] text-[#9b2c20]">
          {eroare}
        </p>
      )}
      <button
        type="submit"
        disabled={pending || prenume.trim().length < 2}
        className="mt-4 w-full rounded-xl bg-[var(--vp-brand)] px-4 py-3 text-[16px] font-semibold text-white transition active:scale-[.99] disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-[var(--vp-brand)] focus-visible:ring-offset-2 focus-visible:outline-none"
      >
        {pending ? "Se pregătește…" : "Începe"}
      </button>
    </form>
  );
}

// Pentru cine a intrat fără telefon: îl adaugă ulterior ca echipa să-l recunoască.
export function TelefonForm({ cod }: { cod: string }) {
  const router = useRouter();
  const [telefon, setTelefon] = useState("");
  const [mesaj, setMesaj] = useState("");
  const [pending, start] = useTransition();

  function trimite(e: React.FormEvent) {
    e.preventDefault();
    setMesaj("");
    start(async () => {
      const r = await adaugaTelefonAction(cod, telefon);
      if (!r.ok) return setMesaj(r.eroare);
      setMesaj(r.legat ? "Te-am găsit în lista noastră. Mulțumim!" : "Telefon salvat. Dacă ești în lista echipei, te vom lega.");
      router.refresh();
    });
  }

  return (
    <form onSubmit={trimite} className="rounded-2xl border border-[var(--vp-line)] bg-white p-4">
      <p className="text-[14px] font-semibold">Ești deja în lista noastră de voluntari?</p>
      <p className="mt-0.5 text-[13px] text-[var(--vp-muted)]">Adaugă-ți telefonul și contribuția ta apare în fișa ta.</p>
      <div className="mt-3 flex gap-2">
        <input
          aria-label="Telefon"
          className={camp}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          maxLength={20}
          value={telefon}
          onChange={(e) => setTelefon(e.target.value)}
          placeholder="0722 123 456"
        />
        <button type="submit" disabled={pending || telefon.trim().length < 9} className="shrink-0 rounded-xl bg-[var(--vp-ink)] px-4 text-[14px] font-semibold text-white disabled:opacity-50">
          {pending ? "…" : "Trimite"}
        </button>
      </div>
      {mesaj && (
        <p role="status" className="mt-2 text-[13px] text-[var(--vp-muted)]">
          {mesaj}
        </p>
      )}
    </form>
  );
}
