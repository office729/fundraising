import { AlertCircle, Inbox } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "../../lib/cn";

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
}: {
  icon?: typeof Inbox;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--ci-border)] px-6 py-14 text-center">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--ci-surface-2)] text-[var(--ci-text-faint)]">
        <Icon className="h-5 w-5" />
      </div>
      <p className="ci-display text-sm font-semibold text-[var(--ci-text)]">{title}</p>
      {description && <p className="mt-1 max-w-sm text-[13px] text-[var(--ci-text-muted)]">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ title = "A apărut o eroare", description, retry }: {
  title?: string;
  description?: string;
  retry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-[var(--ci-red-soft)] bg-[var(--ci-red-soft)] px-6 py-14 text-center">
      <AlertCircle className="mb-3 h-6 w-6 text-[var(--ci-red)]" />
      <p className="ci-display text-sm font-semibold text-[var(--ci-text)]">{title}</p>
      {description && <p className="mt-1 max-w-sm text-[13px] text-[var(--ci-text-muted)]">{description}</p>}
      {retry && (
        <button
          onClick={retry}
          className="mt-4 rounded-lg bg-[var(--ci-red)] px-3.5 h-9 text-sm font-medium text-white hover:opacity-90"
        >
          Încearcă din nou
        </button>
      )}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-[var(--ci-surface-2)]", className)} />;
}
