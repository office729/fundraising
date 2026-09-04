"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";

export function SidePanel({
  open,
  onClose,
  title,
  subtitle,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`fixed inset-0 z-50 transition-opacity ${open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}
      aria-hidden={!open}
    >
      <button
        aria-label="Închide"
        onClick={onClose}
        className="absolute inset-0 bg-[var(--ci-text)]/30"
      />
      <div
        role="dialog"
        aria-modal="true"
        className={`ci-scrollbar absolute top-0 right-0 h-full w-full max-w-md overflow-y-auto border-l border-[var(--ci-border)] bg-[var(--ci-surface)] shadow-[var(--ci-shadow-lg)] transition-transform duration-200 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-[var(--ci-border)] bg-[var(--ci-surface)] px-5 py-4">
          <div>
            <h2 className="ci-display text-[15px] font-semibold text-[var(--ci-text)]">{title}</h2>
            {subtitle && <p className="mt-0.5 text-[13px] text-[var(--ci-text-muted)]">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Închide"
            className="rounded-lg p-1.5 text-[var(--ci-text-muted)] transition-colors hover:bg-[var(--ci-surface-2)] hover:text-[var(--ci-text)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
