"use client";

import { useFocusTrap } from "@/lib/use-focus-trap";
import { X } from "lucide-react";
import { useId, useRef } from "react";
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
  const dialogRef = useRef<HTMLDivElement>(null);
  // id unic per instanță: două dialoguri deschise odată nu mai împart același `aria-labelledby`.
  const titluId = useId();
  useFocusTrap(open, dialogRef, onClose);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        aria-label="Închide"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 bg-[var(--ci-text)]/40 backdrop-blur-[1px]"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titluId}
        tabIndex={-1}
        className={`relative w-full ${width} rounded-[var(--ci-radius-dialog)] border border-[var(--ci-border)] bg-[var(--ci-surface)] shadow-[var(--ci-shadow-lg)]`}
      >
        <div className="flex items-center justify-between border-b border-[var(--ci-border)] px-5 py-4">
          <h2 id={titluId} className="ci-display text-[15px] font-semibold text-[var(--ci-text)]">
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Închide"
            className="rounded-[var(--ci-radius-btn)] p-1.5 text-[var(--ci-text-muted)] transition-colors hover:bg-[var(--ci-surface-2)] hover:text-[var(--ci-text)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}
