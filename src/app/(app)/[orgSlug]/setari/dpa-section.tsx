"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import type { Locale } from "@/lib/i18n/config";

import { acceptaDpaAction } from "./dpa-actions";

const T = {
  ro: {
    titlu: "Acord de prelucrare a datelor (DPA)",
    desc: "Organizația ta este operator pentru datele din CRM, iar Alexandrit le prelucrează ca persoană împuternicită (art. 28 GDPR). Acordul se acceptă o dată de către un owner sau admin, în numele organizației.",
    citeste: "Citește acordul",
    acceptat: (data: string) => `Acceptat la ${data}.`,
    versiuneNoua: "A apărut o versiune nouă a acordului — te rugăm să o accepți din nou.",
    bifa: "Am citit Acordul de prelucrare a datelor și îl accept în numele organizației.",
    buton: "Acceptă acordul",
    seSalveaza: "Se înregistrează...",
  },
  en: {
    titlu: "Data Processing Agreement (DPA)",
    desc: "Your organization is the controller for the CRM data, and Alexandrit processes it as a processor (Art. 28 GDPR). The agreement is accepted once by an owner or admin, on behalf of the organization.",
    citeste: "Read the agreement",
    acceptat: (data: string) => `Accepted on ${data}.`,
    versiuneNoua: "A new version of the agreement is available — please accept it again.",
    bifa: "I have read the Data Processing Agreement and accept it on behalf of the organization.",
    buton: "Accept the agreement",
    seSalveaza: "Recording...",
  },
} as const;

export function DpaSection({
  orgSlug,
  locale,
  acceptatLa,
  versiuneCurenta,
}: {
  orgSlug: string;
  locale: Locale;
  // ISO — null dacă nu a acceptat niciodată; `versiuneCurenta` = true când ultima versiune acceptată e cea în vigoare.
  acceptatLa: string | null;
  versiuneCurenta: boolean;
}) {
  const t = T[locale];
  const router = useRouter();
  const [bifa, setBifa] = useState(false);
  const [eroare, setEroare] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const data = acceptatLa ? new Date(acceptatLa).toLocaleDateString(locale === "ro" ? "ro-RO" : "en-US") : null;

  return (
    <section id="dpa" className="mt-8 scroll-mt-4 rounded-xl border border-line bg-panel p-5">
      <h2 className="font-medium text-ink">{t.titlu}</h2>
      <p className="mt-1 text-xs leading-relaxed text-muted">{t.desc}</p>
      <Link prefetch={false} href="/dpa" target="_blank" className="mt-2 inline-block text-sm font-medium text-brand-green underline">
        {t.citeste}
      </Link>

      {versiuneCurenta && data ? (
        <p className="mt-3 text-sm font-medium text-brand-green">✓ {t.acceptat(data)}</p>
      ) : (
        <div className="mt-3">
          {data && <p className="mb-2 text-sm text-amber-700">{t.versiuneNoua}</p>}
          <label className="flex items-start gap-2.5 text-[13px] leading-relaxed text-body">
            <input type="checkbox" checked={bifa} onChange={(e) => setBifa(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 rounded border-line" />
            <span>{t.bifa}</span>
          </label>
          {eroare && <p className="mt-2 text-sm text-red-600">{eroare}</p>}
          <button
            type="button"
            disabled={!bifa || pending}
            onClick={() =>
              startTransition(async () => {
                setEroare(null);
                const r = await acceptaDpaAction(orgSlug);
                if (r.error) setEroare(r.error);
                else router.refresh();
              })
            }
            className="mt-3 rounded-lg bg-brand-green px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-green-hover disabled:opacity-50"
          >
            {pending ? t.seSalveaza : t.buton}
          </button>
        </div>
      )}
    </section>
  );
}
