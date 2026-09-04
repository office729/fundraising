"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { Input, Select } from "../../components/ui/input";
import { useLocale } from "../../lib/locale-context";
import { FORMULAR230_DICT } from "@/lib/i18n/dictionaries/formular230";
import { JUDETE } from "@/lib/judete";
import { INTERVALE_VARSTA } from "@/lib/varsta-cnp";

export function FilterBar({
  ani,
  beneficiari,
}: {
  ani: number[];
  beneficiari: { slug: string; nume: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const dict = FORMULAR230_DICT[locale].filter;
  const [localitate, setLocalitate] = useState(searchParams.get("localitate") ?? "");

  function push(next: Record<string, string | null>) {
    const sp = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v === null || v === "toate" || v === "") sp.delete(k);
      else sp.set(k, v);
    }
    // Un filtru nou schimbă rezultatele — revenim la pagina 1, altfel poți
    // rămâne pe o pagină care nu mai există pentru noile filtre.
    sp.delete("pagina");
    router.push(`${pathname}?${sp.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={searchParams.get("beneficiar") ?? "toate"}
        onChange={(e) => push({ beneficiar: e.target.value })}
        className="h-8 w-auto text-[12px]"
      >
        <option value="toate">{dict.toateConturile}</option>
        {beneficiari.map((b) => (
          <option key={b.slug} value={b.slug}>
            {b.nume}
          </option>
        ))}
      </Select>

      <Select value={searchParams.get("an") ?? "toate"} onChange={(e) => push({ an: e.target.value })} className="h-8 w-auto text-[12px]">
        <option value="toate">{dict.toiAnii}</option>
        {ani.map((a) => (
          <option key={a} value={a}>
            {a}
          </option>
        ))}
      </Select>

      <Select value={searchParams.get("judet") ?? "toate"} onChange={(e) => push({ judet: e.target.value })} className="h-8 w-auto text-[12px]">
        <option value="toate">{dict.toateJudetele}</option>
        {JUDETE.map((j) => (
          <option key={j} value={j}>
            {j}
          </option>
        ))}
      </Select>

      <Select value={searchParams.get("varsta") ?? "toate"} onChange={(e) => push({ varsta: e.target.value })} className="h-8 w-auto text-[12px]">
        <option value="toate">{dict.toateVarstele}</option>
        {INTERVALE_VARSTA.map((i) => (
          <option key={i.key} value={i.key}>
            {i.label}
          </option>
        ))}
      </Select>

      <form
        className="flex items-center gap-1.5"
        onSubmit={(e) => {
          e.preventDefault();
          push({ localitate: localitate.trim() || null });
        }}
      >
        <Input
          value={localitate}
          onChange={(e) => setLocalitate(e.target.value)}
          placeholder={dict.localitate}
          className="h-8 w-36 text-[12px]"
        />
      </form>
    </div>
  );
}
