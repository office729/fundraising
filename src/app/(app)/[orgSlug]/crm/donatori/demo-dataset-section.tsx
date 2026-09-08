"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";

import { Badge } from "../components/ui/badge";
import { useLocale } from "../lib/locale-context";
import { DONATORI_REALI_DICT } from "@/lib/i18n/dictionaries/donatori-reali";
import { DonatoriListClient } from "./donor-list-client";

// Setul demonstrativ (prototip de design, date locale) rămâne disponibil,
// dar ascuns implicit — lista de sus (donatoriReali) e acum experiența
// principală a modulului Persoane fizice.
export function DemoDatasetSection() {
  const [deschis, setDeschis] = useState(false);
  const locale = useLocale();
  const dict = DONATORI_REALI_DICT[locale].demo;

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setDeschis((v) => !v)}
        aria-expanded={deschis}
        className="flex items-center gap-2 rounded-lg border border-dashed border-[var(--ci-border)] bg-[var(--ci-surface-2)] px-3.5 py-2 text-left transition-colors hover:border-[var(--ci-border-strong)]"
      >
        <Badge tone="purple" icon={false}>
          {dict.badge}
        </Badge>
        <span className="text-[12px] font-medium text-[var(--ci-text-muted)]">{dict.toggle}</span>
        <ChevronDown className={`h-3.5 w-3.5 text-[var(--ci-text-faint)] transition-transform ${deschis ? "rotate-180" : ""}`} />
      </button>

      {deschis && (
        <div className="space-y-3">
          <p className="text-[12px] text-[var(--ci-text-muted)]">{dict.note}</p>
          <DonatoriListClient />
        </div>
      )}
    </div>
  );
}
