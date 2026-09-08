"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { Input } from "../components/ui/input";
import { useLocale } from "../lib/locale-context";
import { DONATORI_REALI_DICT } from "@/lib/i18n/dictionaries/donatori-reali";
import { parseFiltruDonatoriReali } from "./lib/filters";

export function FilterBarReali() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const dict = DONATORI_REALI_DICT[locale].filterBar;
  const f = parseFiltruDonatoriReali(searchParams);
  const [q, setQ] = useState(f.q);

  function push(next: Record<string, string | null>) {
    const sp = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v === null || v === "") sp.delete(k);
      else sp.set(k, v);
    }
    sp.delete("pagina");
    router.push(`${pathname}?${sp.toString()}`);
  }

  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        push({ q: q.trim() || null });
      }}
    >
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={dict.cautaPlaceholder} className="h-9 w-72" />
      <button type="submit" className="h-9 rounded-lg bg-[var(--ci-primary)] px-4 text-[13px] font-semibold text-white hover:opacity-90">
        {dict.cauta}
      </button>
    </form>
  );
}
