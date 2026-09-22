"use client";

import { ArrowRight, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { companiiRiscPipeline } from "../../dashboard-actions";
import { formatData } from "../../lib/format";

type Rand = Awaited<ReturnType<typeof companiiRiscPipeline>>[number];

export function RiscPipelineCard({ orgSlug, ro }: { orgSlug: string; ro: boolean }) {
  const [rows, setRows] = useState<Rand[] | null>(null);
  useEffect(() => {
    companiiRiscPipeline(orgSlug).then(setRows).catch(() => setRows([]));
  }, [orgSlug]);

  // Nimic de arătat (niciun sponsor „tăcut" de peste ~10 luni) — nu afișăm
  // deloc cardul, ca să nu ocupe loc degeaba pe un pipeline sănătos.
  if (rows !== null && rows.length === 0) return null;

  return (
    <section className="overflow-hidden rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] bg-[var(--ci-surface)] shadow-[var(--ci-card-shadow)]">
      <header className="flex items-start gap-3 border-b border-[var(--ci-border)] px-5 py-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--ci-red-soft)] text-[var(--ci-red)]">
          <AlertTriangle className="h-[18px] w-[18px]" />
        </span>
        <div>
          <h2 className="ci-display text-[15px] font-bold text-[var(--ci-text)]">{ro ? "Risc pe pipeline" : "Pipeline risk"}</h2>
          <p className="mt-0.5 text-[12.5px] text-[var(--ci-text-muted)]">
            {ro ? "Sponsori care n-au mai donat de mult — contactează-i acum" : "Sponsors who haven't donated in a while — reach out now"}
          </p>
        </div>
      </header>

      {rows === null ? (
        <div className="space-y-3 p-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg bg-[var(--ci-surface-2)]" />
          ))}
        </div>
      ) : (
        <ol className="divide-y divide-[var(--ci-border)]">
          {rows.map((r) => (
            <li key={r.id}>
              <Link
                href={`/${orgSlug}/crm/companii/${r.segment}`}
                className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-[var(--ci-surface-2)]"
              >
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-[var(--ci-text)]">{r.nume}</p>
                  <p className="mt-0.5 text-[12px] text-[var(--ci-text-muted)]">
                    {ro
                      ? `N-a mai donat de ${r.luni} ${r.luni === 1 ? "lună" : "luni"} — ultima oară ${formatData(r.ultimaData)}`
                      : `No donation in ${r.luni} ${r.luni === 1 ? "month" : "months"} — last on ${formatData(r.ultimaData)}`}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-[var(--ci-text-faint)]" />
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
