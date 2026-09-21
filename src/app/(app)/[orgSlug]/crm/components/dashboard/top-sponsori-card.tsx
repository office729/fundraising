"use client";

import { ArrowRight, Trophy } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { topFirmeSponsori } from "../../dashboard-actions";
import { formatSuma } from "../../lib/format";

type Rand = Awaited<ReturnType<typeof topFirmeSponsori>>[number];

// Aur / argint / bronz pentru podium; restul discret.
const MEDALII = [
  "from-amber-300 to-amber-500 text-amber-950",
  "from-slate-200 to-slate-400 text-slate-800",
  "from-orange-300 to-orange-500 text-orange-950",
];

function initiale(nume: string) {
  return nume
    .replace(/\b(S\.?R\.?L\.?|S\.?A\.?|SRL|SA)\b/gi, "")
    .split(/[\s-]+/)
    .filter((p) => /[A-Za-zĂÂÎȘȚăâîșț]/.test(p))
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("");
}

export function TopSponsoriCard({ orgSlug, ro }: { orgSlug: string; ro: boolean }) {
  const [rows, setRows] = useState<Rand[] | null>(null);
  useEffect(() => {
    topFirmeSponsori(orgSlug).then(setRows).catch(() => setRows([]));
  }, [orgSlug]);

  const total = rows?.reduce((s, r) => s + r.total, 0) ?? 0;
  const max = rows?.[0]?.total ?? 1;

  return (
    <section className="overflow-hidden rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] bg-[var(--ci-surface)] shadow-[var(--ci-card-shadow)]">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--ci-border)] px-5 py-4">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--ci-amber-soft)] text-[var(--ci-amber)]">
            <Trophy className="h-[18px] w-[18px]" />
          </span>
          <div>
            <h2 className="ci-display text-[15px] font-bold text-[var(--ci-text)]">{ro ? "Top firme sponsori" : "Top sponsor companies"}</h2>
            <p className="mt-0.5 text-[12.5px] text-[var(--ci-text-muted)]">
              {ro ? "Cei mai mari sponsori, în total" : "Largest sponsors, all time"}
              {rows && rows.length > 0 && (
                <>
                  {" · "}
                  <span className="ci-tabular font-semibold text-[var(--ci-text)]">{formatSuma(total)}</span>
                </>
              )}
            </p>
          </div>
        </div>
        <Link
          href={`/${orgSlug}/crm/companii`}
          className="group flex items-center gap-1 text-[12.5px] font-semibold text-[var(--ci-primary)] hover:underline"
        >
          {ro ? "Vezi toate" : "View all"}
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </header>

      {rows === null ? (
        <div className="space-y-3 p-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg bg-[var(--ci-surface-2)]" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="p-5 text-[13px] text-[var(--ci-text-muted)]">
          {ro ? "Nicio sponsorizare înregistrată încă. Adaugă sponsorizări din fișa unei companii." : "No sponsorship recorded yet. Add sponsorships from a company page."}
        </p>
      ) : (
        <ol className="divide-y divide-[var(--ci-border)]">
          {rows.map((r, i) => {
            const pct = Math.max(4, Math.round((r.total / max) * 100));
            const parte = total > 0 ? Math.round((r.total / total) * 100) : 0;
            return (
              <li key={r.id}>
                <Link
                  href={`/${orgSlug}/crm/companii/${r.segment}`}
                  className="flex items-center gap-3.5 px-5 py-3 transition-colors hover:bg-[var(--ci-surface-2)]"
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${
                      i < 3 ? `bg-gradient-to-br ${MEDALII[i]}` : "bg-[var(--ci-surface-2)] text-[var(--ci-text-muted)]"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--ci-primary-soft)] text-[11px] font-bold text-[var(--ci-primary)] sm:flex">
                    {initiale(r.nume) || "•"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="truncate text-[13px] font-semibold text-[var(--ci-text)]">{r.nume}</p>
                      <p className="ci-tabular shrink-0 text-[13px] font-bold text-[var(--ci-text)]">{formatSuma(r.total)}</p>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2.5">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--ci-surface-2)]">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[var(--ci-primary)] to-[var(--ci-blue)]"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="ci-tabular w-24 shrink-0 text-right text-[11px] text-[var(--ci-text-muted)]">
                        {parte}% · {r.numar} {ro ? (r.numar === 1 ? "sponsorizare" : "sponsorizări") : r.numar === 1 ? "sponsorship" : "sponsorships"}
                      </span>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
