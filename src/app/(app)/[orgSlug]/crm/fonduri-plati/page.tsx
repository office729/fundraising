"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Download } from "lucide-react";
import { useMemo, useState } from "react";

import { DataTable } from "../components/data-table";
import { Badge, type StatusTone } from "../components/ui/badge";
import { Card } from "../components/ui/card";
import { Select } from "../components/ui/input";
import { SidePanel } from "../components/ui/side-panel";
import { formatData, formatSuma } from "../lib/format";
import { useLocale } from "../lib/locale-context";
import { FONDURI_PLATI_DICT } from "@/lib/i18n/dictionaries/fonduri-plati";
import { ALOCARI_PLATI, type AlocarePlata } from "../mock";

const STATUS_TONE: Record<AlocarePlata["status"], StatusTone> = { incasat: "blue", alocat: "amber", achitat: "green", in_asteptare: "neutral" };

export default function FonduriPlatiPage() {
  const locale = useLocale();
  const dict = FONDURI_PLATI_DICT[locale];
  const STATUS_LABEL = dict.statusLabel;
  const [status, setStatus] = useState("toate");
  const [selected, setSelected] = useState<AlocarePlata | null>(null);

  const filtered = useMemo(() => ALOCARI_PLATI.filter((p) => status === "toate" || p.status === status), [status]);

  const totale = useMemo(
    () => ({
      incasat: filtered.reduce((s, p) => s + p.incasat, 0),
      alocat: filtered.reduce((s, p) => s + p.alocat, 0),
      achitat: filtered.reduce((s, p) => s + p.achitat, 0),
    }),
    [filtered],
  );

  const columns: ColumnDef<AlocarePlata, unknown>[] = [
    { accessorKey: "beneficiarNume", header: dict.columns.beneficiar, cell: ({ row }) => <span className="font-medium">{row.original.beneficiarNume}</span> },
    { accessorKey: "incasat", header: dict.columns.incasat, cell: ({ row }) => <span className="ci-tabular">{formatSuma(row.original.incasat, row.original.moneda)}</span> },
    { accessorKey: "alocat", header: dict.columns.alocat, cell: ({ row }) => <span className="ci-tabular">{formatSuma(row.original.alocat, row.original.moneda)}</span> },
    { accessorKey: "achitat", header: dict.columns.achitat, cell: ({ row }) => <span className="ci-tabular font-medium">{formatSuma(row.original.achitat, row.original.moneda)}</span> },
    { accessorKey: "status", header: dict.columns.status, cell: ({ row }) => <Badge tone={STATUS_TONE[row.original.status]}>{STATUS_LABEL[row.original.status]}</Badge> },
    { accessorKey: "la", header: dict.columns.data, cell: ({ row }) => formatData(row.original.la) },
  ];

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">{dict.title}</h1>
          <p className="mt-0.5 text-[13px] text-[var(--ci-text-muted)]">{dict.subtitle(filtered.length)}</p>
        </div>
        <button className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[var(--ci-border)] px-3.5 text-sm font-medium text-[var(--ci-text)] hover:bg-[var(--ci-surface-2)]">
          <Download className="h-4 w-4" /> {dict.export}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><p className="text-[12px] text-[var(--ci-text-muted)]">{dict.totalIncasat}</p><p className="ci-tabular mt-1 text-lg font-bold text-[var(--ci-text)]">{formatSuma(totale.incasat)}</p></Card>
        <Card><p className="text-[12px] text-[var(--ci-text-muted)]">{dict.totalAlocat}</p><p className="ci-tabular mt-1 text-lg font-bold text-[var(--ci-text)]">{formatSuma(totale.alocat)}</p></Card>
        <Card><p className="text-[12px] text-[var(--ci-text-muted)]">{dict.totalAchitat}</p><p className="ci-tabular mt-1 text-lg font-bold text-[var(--ci-text)]">{formatSuma(totale.achitat)}</p></Card>
      </div>

      <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-44">
        <option value="toate">{dict.toateStatusurile}</option>
        {Object.entries(STATUS_LABEL).map(([k, v]) => (
          <option key={k} value={k}>{v}</option>
        ))}
      </Select>

      <DataTable data={filtered} columns={columns} onRowClick={setSelected} pageSize={15} />

      <SidePanel open={!!selected} onClose={() => setSelected(null)} title={selected?.beneficiarNume ?? ""} subtitle={dict.sidePanel.subtitle}>
        {selected && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Row label={dict.columns.incasat} value={formatSuma(selected.incasat, selected.moneda)} />
              <Row label={dict.columns.alocat} value={formatSuma(selected.alocat, selected.moneda)} />
              <Row label={dict.columns.achitat} value={formatSuma(selected.achitat, selected.moneda)} />
              <Row label={dict.sidePanel.documentJustificativ} value={selected.documentJustificativ ?? "—"} />
            </div>
            <div>
              <p className="mb-2 text-[12px] font-semibold tracking-wide text-[var(--ci-text-faint)] uppercase">{dict.sidePanel.jurnalulModificarilor}</p>
              <div className="space-y-2 border-l-2 border-[var(--ci-border)] pl-3">
                <JournalRow text={dict.sidePanel.platMarcataAchitat} author="Andreea Vasilescu" date={selected.la} />
                <JournalRow text={dict.sidePanel.sumaAlocataBeneficiarului} author="Vlad Placintă" date={selected.la} />
              </div>
            </div>
          </div>
        )}
      </SidePanel>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-[var(--ci-border)] py-2 last:border-0">
      <span className="text-[13px] text-[var(--ci-text-muted)]">{label}</span>
      <span className="text-[13px] font-medium text-[var(--ci-text)]">{value}</span>
    </div>
  );
}

function JournalRow({ text, author, date }: { text: string; author: string; date: string }) {
  return (
    <div className="pb-1">
      <p className="text-[13px] text-[var(--ci-text)]">{text}</p>
      <p className="text-[12px] text-[var(--ci-text-faint)]">{author} · {formatData(date)}</p>
    </div>
  );
}
