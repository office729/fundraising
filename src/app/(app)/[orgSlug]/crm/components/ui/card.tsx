import type { ReactNode } from "react";

import { cn } from "../../lib/cn";

export function Card({
  children,
  className,
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-[var(--ci-border)] bg-[var(--ci-surface)] shadow-[var(--ci-shadow-sm)]",
        padded && "p-5",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h3 className="ci-display text-[15px] font-semibold text-[var(--ci-text)]">{title}</h3>
        {subtitle && <p className="mt-0.5 text-[13px] text-[var(--ci-text-muted)]">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
