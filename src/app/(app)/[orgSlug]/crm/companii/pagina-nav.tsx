"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { useLocale } from "../lib/locale-context";
import { COMPANII_DICT } from "@/lib/i18n/dictionaries/companii";
import { COMPANII_FILTRE_DICT } from "@/lib/i18n/dictionaries/companii-filtre-ui";

export function PaginaNav({ pagina, pageCount, total, pageSize }: { pagina: number; pageCount: number; total: number; pageSize: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const dict = COMPANII_DICT[locale].paginaNav;
  const df = COMPANII_FILTRE_DICT[locale];
  const doarCuContacte = searchParams.get("contact") === "cu";

  // „Doar firmele cu contacte”, lângă paginare: aceeași alegere ca „Contact → Cu contact” de sus.
  function comutaContacte() {
    const sp = new URLSearchParams(searchParams.toString());
    if (doarCuContacte) sp.delete("contact");
    else sp.set("contact", "cu");
    sp.delete("pagina");
    sp.delete("r");
    router.push(`${pathname}?${sp.toString()}`);
  }

  function mergiLa(p: number) {
    const sp = new URLSearchParams(searchParams.toString());
    if (p <= 1) sp.delete("pagina");
    else sp.set("pagina", String(p));
    router.push(`${pathname}?${sp.toString()}`);
  }

  const from = total === 0 ? 0 : (pagina - 1) * pageSize + 1;
  const to = Math.min(total, pagina * pageSize);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--ci-border)] px-1 pt-3">
      <p className="text-[13px] text-[var(--ci-text-muted)]">
        {dict.pagina(pagina, pageCount.toLocaleString("ro-RO"))} · {total.toLocaleString("ro-RO")} {dict.firme}
        {total > 0 && ` (${from}–${to})`}
      </p>
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={comutaContacte}
          aria-pressed={doarCuContacte}
          title={doarCuContacte ? df.doarCuContacteTitleOn : df.doarCuContacteTitle}
          className={`inline-flex h-8 items-center gap-1 rounded-[var(--ci-radius-btn)] border px-3 text-[13px] font-medium transition-colors ${doarCuContacte ? "border-[var(--ci-primary)] bg-[var(--ci-primary)] text-white" : "border-[var(--ci-border)] text-[var(--ci-text)] hover:bg-[var(--ci-surface-2)]"}`}
        >
          👤 {df.doarCuContacte}
          {doarCuContacte && <span aria-hidden> ✕</span>}
        </button>
        <button
          onClick={() => mergiLa(pagina - 1)}
          disabled={pagina <= 1}
          className="inline-flex h-8 items-center rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] px-3 text-[13px] font-medium text-[var(--ci-text)] transition-colors hover:bg-[var(--ci-surface-2)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {dict.inapoi}
        </button>
        <button
          onClick={() => mergiLa(pagina + 1)}
          disabled={pagina >= pageCount}
          className="inline-flex h-8 items-center rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] px-3 text-[13px] font-medium text-[var(--ci-text)] transition-colors hover:bg-[var(--ci-surface-2)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {dict.inainte}
        </button>
      </div>
    </div>
  );
}
