"use client";

import { ritmInCuvinte, urmatoareaDepasita, type Analiza, type NivelRisc } from "@/lib/analiza-donator";
import { COMPONENTE_UI_DICT } from "@/lib/i18n/dictionaries/componente-ui";

import { formatData, formatSuma } from "../lib/format";
import { useLocale } from "../lib/locale-context";
import { Badge, type StatusTone } from "./ui/badge";
import { Card } from "./ui/card";

// Cardul „Analiza donatorului”: doar afișare, calculul vine din analizeazaDonator (lib/analiza-donator.ts). Textele calculate acolo (motivul
// riscului, eticheta, ritmul) sunt în română; în engleză se redau din tiparele lor (vezi dicționarul).
const TON: Record<NivelRisc, StatusTone> = { scazut: "green", mediu: "amber", ridicat: "red", necunoscut: "neutral" };

export function AnalizaDonatorCard({ analiza, moneda = "lei", titlu }: { analiza: Analiza; moneda?: string; titlu?: string }) {
  const locale = useLocale();
  const t = COMPONENTE_UI_DICT[locale].analiza;
  const a = analiza;
  const depasita = urmatoareaDepasita(a);
  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="ci-display text-[15px] font-semibold text-[var(--ci-text)]">{titlu ?? t.titlu}</h2>
        <Badge tone={TON[a.risc]} icon={false}>
          {t.risc[a.risc]}
          {a.eticheta ? ` · ${a.eticheta}` : ""}
        </Badge>
      </div>
      <p className="mt-2 text-[13px] leading-relaxed text-[var(--ci-text-muted)]">{a.riscMotiv}</p>

      <div className="mt-4 grid grid-cols-2 gap-4 border-t border-[var(--ci-border)] pt-4 sm:grid-cols-4">
        <Camp label={t.ritm} value={ritmInCuvinte(a.cadentaZile, locale)} />
        <Camp label={depasita ? t.eraAsteptata : t.urmatoarea} value={a.urmatoareaAt ? formatData(a.urmatoareaAt, locale) : "—"} />
        <Camp label={t.ritmValoric} value={a.valoareAnuala != null ? formatSuma(a.valoareAnuala, moneda, locale) : "—"} />
        <Camp label={t.valoareViitor} value={a.valoareViitor != null ? formatSuma(a.valoareViitor, moneda, locale) : "—"} />
      </div>
      <p className="mt-3 text-[11.5px] leading-relaxed text-[var(--ci-text-faint)]">{t.nota(a.nr, formatSuma(a.total, moneda, locale))}</p>
    </Card>
  );
}

function Camp({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[12px] text-[var(--ci-text-muted)]">{label}</p>
      <p className="ci-tabular mt-0.5 text-[14px] font-semibold text-[var(--ci-text)]">{value}</p>
    </div>
  );
}
