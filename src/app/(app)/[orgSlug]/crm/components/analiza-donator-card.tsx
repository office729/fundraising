import { ritmInCuvinte, urmatoareaDepasita, type Analiza, type NivelRisc } from "@/lib/analiza-donator";

import { formatData, formatSuma } from "../lib/format";
import { Badge, type StatusTone } from "./ui/badge";
import { Card } from "./ui/card";

// Cardul „Analiza donatorului”: doar afișare, calculul vine din analizeazaDonator (lib/analiza-donator.ts), deci rulează pe server și în client.
const TON: Record<NivelRisc, StatusTone> = { scazut: "green", mediu: "amber", ridicat: "red", necunoscut: "neutral" };
const ETICHETA_RISC: Record<NivelRisc, string> = { scazut: "Risc scăzut", mediu: "Risc mediu", ridicat: "Risc ridicat", necunoscut: "Fără date" };

export function AnalizaDonatorCard({ analiza, moneda = "lei", titlu = "Analiza donatorului" }: { analiza: Analiza; moneda?: string; titlu?: string }) {
  const a = analiza;
  const depasita = urmatoareaDepasita(a);
  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="ci-display text-[15px] font-semibold text-[var(--ci-text)]">{titlu}</h2>
        <Badge tone={TON[a.risc]} icon={false}>
          {ETICHETA_RISC[a.risc]}
          {a.eticheta ? ` · ${a.eticheta}` : ""}
        </Badge>
      </div>
      <p className="mt-2 text-[13px] leading-relaxed text-[var(--ci-text-muted)]">{a.riscMotiv}</p>

      <div className="mt-4 grid grid-cols-2 gap-4 border-t border-[var(--ci-border)] pt-4 sm:grid-cols-4">
        <Camp label="Ritm" value={ritmInCuvinte(a.cadentaZile)} />
        <Camp label={depasita ? "Era așteptată (depășită)" : "Următoarea donație (estimat)"} value={a.urmatoareaAt ? formatData(a.urmatoareaAt) : "—"} />
        <Camp label="Ritm valoric pe an" value={a.valoareAnuala != null ? formatSuma(a.valoareAnuala, moneda) : "—"} />
        <Camp label="Valoare estimată de viitor" value={a.valoareViitor != null ? formatSuma(a.valoareViitor, moneda) : "—"} />
      </div>
      <p className="mt-3 text-[11.5px] leading-relaxed text-[var(--ci-text-faint)]">
        Estimări calculate din istoricul de donații ({a.nr} {a.nr === 1 ? "donație" : "donații"}, total {formatSuma(a.total, moneda)}), fără servicii externe. „Valoarea estimată de viitor” presupune că donatorul rămâne activ în ritmul actual,
        pe 3 ani la risc scăzut, 1,5 ani la risc mediu și 6 luni la risc ridicat.
      </p>
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
