"use client";

import { Download } from "lucide-react";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";

import { Breadcrumb } from "../../components/ui/breadcrumb";
import { Card } from "../../components/ui/card";
import { EmptyState } from "../../components/ui/states";
import { downloadCsv, toCsv } from "../../lib/export-csv";
import { formatDataRelativa, formatSuma } from "../../lib/format";
import { useDonatori } from "../../lib/use-data";
import { useLocale } from "../../lib/locale-context";
import { INSTRUMENTE_DICT } from "@/lib/i18n/dictionaries/instrumente";
import type { Donator } from "../../mock";

type SegmentKey = "mari-risc" | "recurenti-opriti" | "scadere" | "big-onetime" | "ambasadori";

const SEGMENT_KEYS: SegmentKey[] = ["mari-risc", "recurenti-opriti", "scadere", "big-onetime", "ambasadori"];

function inSegment(key: SegmentKey, d: Donator, medianaTotal: number): boolean {
  switch (key) {
    case "mari-risc": return d.totalDonat >= medianaTotal * 1.5 && d.segment === "in_risc";
    case "recurenti-opriti": return d.tip === "recurent" && d.status === "inactiv";
    case "scadere": return d.segment === "in_risc";
    case "big-onetime": return d.tip === "unic" && d.totalDonat >= medianaTotal * 2;
    case "ambasadori": return d.segment === "fidel" || d.scorImplicare >= 85;
    default: return false;
  }
}

export default function RadarDonatoriPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const DONATORI = useDonatori();
  const [activ, setActiv] = useState<SegmentKey>("mari-risc");
  const locale = useLocale();
  const dictRoot = INSTRUMENTE_DICT[locale];
  const dict = dictRoot.radarDonatori;

  const medianaTotal = useMemo(() => {
    const sortate = [...DONATORI].map((d) => d.totalDonat).sort((a, b) => a - b);
    return sortate[Math.floor(sortate.length / 2)] ?? 0;
  }, [DONATORI]);

  const grupuri = useMemo(() => {
    const rez: Record<SegmentKey, Donator[]> = { "mari-risc": [], "recurenti-opriti": [], scadere: [], "big-onetime": [], ambasadori: [] };
    for (const d of DONATORI) {
      for (const key of SEGMENT_KEYS) {
        if (inSegment(key, d, medianaTotal)) rez[key].push(d);
      }
    }
    return rez;
  }, [DONATORI, medianaTotal]);

  const lista = grupuri[activ];

  function exporta() {
    const csv = toCsv(lista, [
      { key: "nume", header: dictRoot.index.csv.nume },
      { key: "email", header: dictRoot.index.csv.email },
      { key: "telefon", header: dictRoot.index.csv.telefon },
      { key: "totalDonat", header: dictRoot.index.csv.totalDonat },
      { key: "ultimaDonatieLa", header: dictRoot.index.csv.ultimaDonatie },
      { key: "responsabil", header: dictRoot.index.csv.responsabil },
    ]);
    downloadCsv(`radar-donatori-${activ}-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  }

  return (
    <div className="mx-auto max-w-[1100px] space-y-5">
      <Breadcrumb items={[{ label: dictRoot.breadcrumb, href: `/${orgSlug}/crm/instrumente` }, { label: dict.breadcrumbLabel }]} />
      <div>
        <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">{dict.title}</h1>
        <p className="mt-0.5 text-[13px] text-[var(--ci-text-muted)]">{dict.subtitle}</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {SEGMENT_KEYS.map((key) => (
          <button
            key={key}
            onClick={() => setActiv(key)}
            className={`rounded-xl border p-4 text-left transition-colors ${
              activ === key ? "border-[var(--ci-primary)] bg-[var(--ci-primary-soft)]" : "border-[var(--ci-border)] bg-[var(--ci-surface)] hover:border-[var(--ci-border-strong)]"
            }`}
          >
            <p className="ci-tabular text-xl font-bold text-[var(--ci-text)]">{grupuri[key].length}</p>
            <p className="mt-1 text-[13px] font-semibold text-[var(--ci-text)]">{dict.segmente[key].titlu}</p>
            <p className="mt-0.5 text-[11px] text-[var(--ci-text-muted)]">{dict.segmente[key].descriere}</p>
          </button>
        ))}
      </div>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[13px] font-semibold text-[var(--ci-text)]">{dict.segmente[activ].titlu} — {lista.length} {dict.donatori}</p>
          <button
            onClick={exporta}
            disabled={!lista.length}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--ci-border)] px-3 text-[12px] font-medium text-[var(--ci-text)] transition-colors hover:bg-[var(--ci-surface-2)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" /> {dict.descarcaCsv}
          </button>
        </div>
        {lista.length ? (
          <div className="space-y-2">
            {lista.map((d) => (
              <div key={d.id} className="flex items-center justify-between rounded-lg border border-[var(--ci-border)] px-3.5 py-2.5">
                <div>
                  <p className="text-[13px] font-medium text-[var(--ci-text)]">{d.nume}</p>
                  <p className="text-[12px] text-[var(--ci-text-muted)]">{d.email} · {d.responsabil}</p>
                </div>
                <div className="text-right">
                  <p className="ci-tabular text-[13px] font-semibold text-[var(--ci-text)]">{formatSuma(d.totalDonat, d.moneda)}</p>
                  <p className="text-[12px] text-[var(--ci-text-muted)]">{d.ultimaDonatieLa ? formatDataRelativa(d.ultimaDonatieLa) : "—"}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title={dict.niciunDonator} />
        )}
      </Card>
    </div>
  );
}
