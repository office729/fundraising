import Link from "next/link";

import { ferestreFiscale } from "@/lib/ferestre-fiscale";

// Banner cu numărătoare inversă, vizibil doar cât e deschisă o fereastră fiscală (vezi lib/ferestre-fiscale.ts), cu legătură la lista de firme potrivită.
const LEGATURI = {
  d177: { href: "?elig=1&ordine=contactabilitate", text: "Firme eligibile D177, cele mai ușor de abordat întâi" },
  sponsorizare20: { href: "?sprint=1", text: "Sprint fiscal: firme cu capacitate, încă nesemnate" },
} as const;

export function FereastraFiscala({ orgSlug }: { orgSlug: string }) {
  const ferestre = ferestreFiscale(new Date());
  if (ferestre.length === 0) return null;
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2" aria-label="Ferestre fiscale deschise">
      {ferestre.map((f) => (
        <div key={f.cheie} className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] bg-[var(--ci-surface)] px-4 py-3">
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-[var(--ci-text)]">{f.titlu}</p>
            <p className="mt-0.5 text-[12px] text-[var(--ci-text-muted)]">
              {f.zileRamase === 0 ? "Azi e ultima zi, " : `Mai sunt ${f.zileRamase} ${f.zileRamase === 1 ? "zi" : "zile"} până la `}
              termenul de {f.termenText}.
            </p>
            <Link href={`/${orgSlug}/crm/companii${LEGATURI[f.cheie].href}`} className="mt-1 inline-block text-[12.5px] font-semibold text-[var(--ci-primary)] hover:underline">
              {LEGATURI[f.cheie].text} →
            </Link>
          </div>
          <span className="ci-tabular shrink-0 rounded-full bg-[var(--ci-primary-soft)] px-3 py-1 text-[13px] font-bold text-[var(--ci-primary)]">
            {f.zileRamase} {f.zileRamase === 1 ? "zi" : "zile"}
          </span>
        </div>
      ))}
    </div>
  );
}
