"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { setLocaleAction } from "@/lib/i18n/actions";
import type { Locale } from "@/lib/i18n/config";

const OPTIUNI: { value: Locale; label: string }[] = [
  { value: "ro", label: "RO" },
  { value: "en", label: "EN" },
];

// Comutator simplu RO/EN — setează un cookie (vezi lib/i18n/actions.ts) și
// reîmprospătează pagina curentă, ca Server Components să recitească limba.
// Folosit atât pe site-ul de prezentare cât și în header-ul dashboard-ului.
export function LanguageSwitcher({ locale, dark = false }: { locale: Locale; dark?: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [local, setLocal] = useState(locale);

  function comuta(next: Locale) {
    if (next === local) return;
    setLocal(next);
    startTransition(async () => {
      await setLocaleAction(next);
      router.refresh();
    });
  }

  return (
    <div
      className={`inline-flex items-center rounded-lg border p-0.5 text-[12px] font-bold ${
        dark ? "border-white/25" : "border-line"
      } ${pending ? "opacity-60" : ""}`}
      role="group"
      aria-label="Limbă / Language"
    >
      {OPTIUNI.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => comuta(o.value)}
          disabled={pending}
          aria-pressed={local === o.value}
          className={`rounded-md px-2 py-1 transition ${
            local === o.value
              ? dark
                ? "bg-white text-brand-blue"
                : "bg-brand-blue text-white"
              : dark
                ? "text-white/70 hover:text-white"
                : "text-muted-2 hover:text-ink"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
