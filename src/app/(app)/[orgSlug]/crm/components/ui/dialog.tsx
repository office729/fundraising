"use client";

import { X } from "lucide-react";
import { useEffect } from "react";
import type { ReactNode } from "react";

export function Dialog({
  open,
  onClose,
  title,
  children,
  width = "max-w-lg",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width?: string;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        aria-label="Închide"
        onClick={onClose}
        className="absolute inset-0 bg-[var(--ci-text)]/40 backdrop-blur-[1px]"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ci-dialog-title"
        className={`relative w-full ${width} rounded-2xl border border-[var(--ci-border)] bg-[var(--ci-surface)] shadow-[var(--ci-shadow-lg)]`}
      >
        <div className="flex items-center justify-between border-b border-[var(--ci-border)] px-5 py-4">
          <h2 id="ci-dialog-title" className="ci-display text-[15px] font-semibold text-[var(--ci-text)]">
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Închide"
            className="rounded-lg p-1.5 text-[var(--ci-text-muted)] transition-colors hover:bg-[var(--ci-surface-2)] hover:text-[var(--ci-text)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}
