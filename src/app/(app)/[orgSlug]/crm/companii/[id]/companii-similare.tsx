"use client";

import Link from "next/link";
import { useState } from "react";

import { Badge } from "../../components/ui/badge";
import { Card } from "../../components/ui/card";

export type FirmaSimilara = { id: string; nume: string; judet: string | null; banda: "A" | "B" | "C"; suma: number; esteSponsor: boolean; href: string };

// Firme din același domeniu (același cod CAEN), cu cele care n-au sponsorizat primele: dacă o firmă ca asta a spus da, merită încercate și celelalte.
export function CompaniiSimilare({ caen, judet, lista }: { caen: string; judet: string | null; lista: FirmaSimilara[] }) {
  const [doarJudet, setDoarJudet] = useState(false);
  const vizibile = (doarJudet && judet ? lista.filter((f) => f.judet === judet) : lista).slice(0, 10);
  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-bold text-[var(--ci-text)]">Firme similare</h2>
          <p className="mt-0.5 text-[12.5px] text-[var(--ci-text-muted)]">Același domeniu de activitate (CAEN {caen.replace(/[^0-9]/g, "").slice(0, 4)}). Cele care n-au sponsorizat încă apar primele.</p>
        </div>
        {judet && (
          <div role="group" aria-label="Zona" className="flex rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] p-0.5 text-[12px]">
            {[
              [false, "Toată țara"],
              [true, `Doar ${judet}`],
            ].map(([val, eticheta]) => (
              <button key={String(val)} type="button" aria-pressed={doarJudet === val} onClick={() => setDoarJudet(val as boolean)} className={`rounded-[calc(var(--ci-radius-btn)-2px)] px-2.5 py-1 font-medium ${doarJudet === val ? "bg-[var(--ci-surface-2)] text-[var(--ci-text)]" : "text-[var(--ci-text-muted)] hover:text-[var(--ci-text)]"}`}>
                {eticheta as string}
              </button>
            ))}
          </div>
        )}
      </div>
      {vizibile.length === 0 ? (
        <p className="mt-3 text-[13px] text-[var(--ci-text-muted)]">Nicio firmă similară în această zonă.</p>
      ) : (
        <ul className="mt-3 divide-y divide-[var(--ci-border)]">
          {vizibile.map((f) => (
            <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <div className="min-w-0">
                <Link prefetch={false} href={f.href} className="truncate text-[13px] font-semibold text-[var(--ci-text)] hover:underline">
                  {f.nume}
                </Link>
                {f.judet && <span className="ml-2 text-[12px] text-[var(--ci-text-muted)]">{f.judet}</span>}
              </div>
              <div className="flex items-center gap-1.5">
                {f.esteSponsor && (
                  <Badge tone="purple" icon={false}>
                    deja sponsor
                  </Badge>
                )}
                <Badge tone={f.banda === "A" ? "green" : f.banda === "B" ? "amber" : "neutral"} icon={false}>
                  {f.banda}
                </Badge>
                <span className="ci-tabular w-24 text-right text-[12.5px] text-[var(--ci-text-muted)]">{f.suma > 0 ? `~${f.suma.toLocaleString("ro-RO")} lei` : "—"}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
