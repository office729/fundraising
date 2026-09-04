import { ChevronLeft, ChevronRight } from "lucide-react";

export function Pagination({
  page,
  pageCount,
  onChange,
  total,
  pageSize,
}: {
  page: number;
  pageCount: number;
  onChange: (page: number) => void;
  total: number;
  pageSize: number;
}) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <div className="flex items-center justify-between border-t border-[var(--ci-border)] px-1 pt-3">
      <p className="text-[13px] text-[var(--ci-text-muted)]">
        {from}–{to} din {total}
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          aria-label="Pagina anterioară"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--ci-border)] text-[var(--ci-text-muted)] transition-colors hover:bg-[var(--ci-surface-2)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="ci-tabular px-2 text-[13px] text-[var(--ci-text)]">
          {page} / {Math.max(1, pageCount)}
        </span>
        <button
          onClick={() => onChange(page + 1)}
          disabled={page >= pageCount}
          aria-label="Pagina următoare"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--ci-border)] text-[var(--ci-text-muted)] transition-colors hover:bg-[var(--ci-surface-2)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
