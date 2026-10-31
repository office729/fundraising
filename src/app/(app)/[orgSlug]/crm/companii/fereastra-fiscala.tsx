import Link from "next/link";

import { ferestreFiscale } from "@/lib/ferestre-fiscale";
import type { Locale } from "@/lib/i18n/config";
import { COMPANII_UI_DICT } from "@/lib/i18n/dictionaries/companii-ui";

// Banner cu numărătoare inversă, vizibil doar cât e deschisă o fereastră fiscală (vezi lib/ferestre-fiscale.ts), cu legătură la lista de firme potrivită.
const LEGATURI = {
  d177: { href: "?elig=1&ordine=contactabilitate" },
  sponsorizare20: { href: "?sprint=1" },
} as const;

export function FereastraFiscala({ orgSlug, locale }: { orgSlug: string; locale: Locale }) {
  const ui = COMPANII_UI_DICT[locale].ferestre;
  const ferestre = ferestreFiscale(new Date());
  if (ferestre.length === 0) return null;
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2" aria-label={ui.aria}>
      {ferestre.map((f) => (
        <div key={f.cheie} className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] bg-[var(--ci-surface)] px-4 py-3">
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-[var(--ci-text)]">{ui.titlu[f.cheie] ?? f.titlu}</p>
            <p className="mt-0.5 text-[12px] text-[var(--ci-text-muted)]">
              {ui.text(f.zileRamase, ui.termen[f.cheie] ?? f.termenText)}
            </p>
            <Link href={`/${orgSlug}/crm/companii${LEGATURI[f.cheie].href}`} className="mt-1 inline-block text-[12.5px] font-semibold text-[var(--ci-primary)] hover:underline">
              {ui.legatura[f.cheie]} →
            </Link>
          </div>
          <span className="ci-tabular shrink-0 rounded-full bg-[var(--ci-primary-soft)] px-3 py-1 text-[13px] font-bold text-[var(--ci-primary)]">
            {ui.zile(f.zileRamase)}
          </span>
        </div>
      ))}
    </div>
  );
}
