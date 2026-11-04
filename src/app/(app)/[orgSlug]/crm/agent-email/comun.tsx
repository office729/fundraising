"use client";

import { CheckCircle2, X, XCircle } from "lucide-react";

import type { MesajClient } from "@/lib/agent-email/tipuri";

// Ajutoare comune ale paginii „Agent email”: mesaje de confirmare / eroare în pagină, formatări de dată și reguli de afișare.

export type Notif = { tip: "ok" | "eroare"; text: string } | null;
export type Anunta = (tip: "ok" | "eroare", text: string) => void;

export function Notificare({ n, onInchide }: { n: Notif; onInchide: () => void }) {
  return (
    <div aria-live="polite" className="min-h-0">
      {n && (
        <div
          role={n.tip === "eroare" ? "alert" : "status"}
          className={`flex items-start gap-2 rounded-[var(--ci-radius-card)] px-3 py-2 text-[13px] ${n.tip === "eroare" ? "bg-[var(--ci-red-soft)] text-[var(--ci-red)]" : "bg-[var(--ci-green-soft)] text-[var(--ci-green)]"}`}
        >
          {n.tip === "eroare" ? <XCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />}
          <span className="min-w-0 flex-1 break-words">{n.text}</span>
          <button type="button" onClick={onInchide} aria-label="×" className="shrink-0 opacity-70 hover:opacity-100">
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
      )}
    </div>
  );
}

export const loc = (locale: "ro" | "en") => (locale === "ro" ? "ro-RO" : "en-GB");
export const fmtData = (iso: string, locale: "ro" | "en") => new Date(iso).toLocaleDateString(loc(locale), { day: "numeric", month: "short" });
export const fmtDataAn = (iso: string, locale: "ro" | "en") => new Date(iso).toLocaleDateString(loc(locale), { day: "numeric", month: "short", year: "numeric" });
export const fmtDataOra = (iso: string, locale: "ro" | "en") => new Date(iso).toLocaleString(loc(locale), { dateStyle: "short", timeStyle: "short" });

// Un răspuns al omului (nu unul automat, de concediu).
export const areRaspunsReal = (m: MesajClient): boolean => m.raspunsuri.some((r) => !r.automat && r.eticheta !== "automat");
export const raspunsNecitit = (m: MesajClient): boolean => m.raspunsuri.some((r) => !r.citit && !r.automat);

export const clasaCamp = "w-full rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] bg-[var(--ci-surface)] px-3 py-2 text-[14px] text-[var(--ci-text)] outline-none focus:border-[var(--ci-primary)]";
