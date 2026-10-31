"use client";

import { useEffect, useState } from "react";

import { paginaAction } from "@/app/programare/actions";

import { PROGRAMARE_UI_DICT } from "@/lib/i18n/dictionaries/programare-ui";

import { Rezervare, useLocaleProgramare } from "./rezervare";

// Calendarul de programări pentru locurile unde pagina nu își poate încărca tipurile pe server (fereastra din panou): le cere la deschidere.
export function RezervareIncarcata({ sursa, prefill, textIncarcare }: { sursa: string; prefill?: { nume?: string; email?: string; organizatie?: string }; textIncarcare?: string }) {
  const locale = useLocaleProgramare();
  const [date, setDate] = useState<Awaited<ReturnType<typeof paginaAction>> | null>(null);
  useEffect(() => {
    let activ = true;
    paginaAction().then((d) => activ && setDate(d)).catch(() => activ && setDate({ tipuri: [], cereTelefon: false }));
    return () => {
      activ = false;
    };
  }, []);
  if (!date) return <div className="rounded-2xl border border-line bg-white p-6 text-sm text-muted">{textIncarcare ?? PROGRAMARE_UI_DICT[locale].seIncarcaProgramarea}</div>;
  return <Rezervare tipuri={date.tipuri} cereTelefon={date.cereTelefon} sursa={sursa} prefill={prefill} locale={locale} />;
}
