"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { useLocale } from "../lib/locale-context";
import { COMPANII_DICT } from "@/lib/i18n/dictionaries/companii";

export function PaginaNav({ pagina, pageCount, total, pageSize }: { pagina: number; pageCount: number; total: number; pageSize: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const dict = COMPANII_DICT[locale].paginaNav;

  function mergiLa(p: number) {
    const sp = new URLSearchParams(searchParams.toString());
    if (p <= 1) sp.delete("pagina");
    else sp.set("pagina", String(p));
    router.push(`${pathname}?${sp.toString()}`);
  }

  const from = total === 0 ? 0 : (pagina - 1) * pageSize + 1;
  const to = Math.min(total, pagina * pageSize);

  return (
    <div className="flex items-center justify-between border-t border-[var(--ci-border)] px-1 pt-3">
      <p className="text-[13px] text-[var(--ci-text-muted)]">
        {dict.pagina(pagina, pageCount.toLocaleString("ro-RO"))} · {total.toLocaleString("ro-RO")} {dict.firme}
        {total > 0 && ` (${from}–${to})`}
      </p>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => mergiLa(pagina - 1)}
          disabled={pagina <= 1}
          className="inline-flex h-8 items-center rounded-lg border border-[var(--ci-border)] px-3 text-[13px] font-medium text-[var(--ci-text)] transition-colors hover:bg-[var(--ci-surface-2)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {dict.inapoi}
        </button>
        <button
          onClick={() => mergiLa(pagina + 1)}
          disabled={pagina >= pageCount}
          className="inline-flex h-8 items-center rounded-lg border border-[var(--ci-border)] px-3 text-[13px] font-medium text-[var(--ci-text)] transition-colors hover:bg-[var(--ci-surface-2)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {dict.inainte}
        </button>
      </div>
    </div>
  );
}
