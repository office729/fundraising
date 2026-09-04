"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";

import { DataTable } from "../components/data-table";
import { Badge } from "../components/ui/badge";
import { Select } from "../components/ui/input";
import { formatData, formatSuma } from "../lib/format";
import { useLocale } from "../lib/locale-context";
import { DONATII_DICT } from "@/lib/i18n/dictionaries/donatii";
import { companieById, DONATII, donatorById, type Donatie } from "../mock";

// Sursa unei donații e un donator sau o companie — responsabilul nu e stocat
// pe donație, ci pe sursă (aceleași câmpuri „responsabil" din modulele
// Persoane fizice / Companii), deci se rezolvă prin lookup, nu direct.
function responsabilDonatie(d: Donatie): string | undefined {
  return d.sursa === "companie" ? companieById(d.sursaId)?.responsabil : donatorById(d.sursaId)?.responsabil;
}

export default function DonatiiPage() {
  const locale = useLocale();
  const dict = DONATII_DICT[locale];
  const LUNI = dict.luni;
  const [moneda, setMoneda] = useState("toate");
  const [sursa, setSursa] = useState("toate");
  const [an, setAn] = useState("toate");
  const [luna, setLuna] = useState("toate");
  const [responsabil, setResponsabil] = useState("toate");

  const ani = useMemo(
    () => Array.from(new Set(DONATII.map((d) => new Date(d.data).getFullYear()))).sort((a, b) => b - a),
    [],
  );
  const responsabili = useMemo(
    () => Array.from(new Set(DONATII.map(responsabilDonatie).filter((r): r is string => !!r))).sort(),
    [],
  );

  const filtered = useMemo(
    () =>
      DONATII.filter((d) => {
        if (moneda !== "toate" && d.moneda !== moneda) return false;
        if (sursa !== "toate" && d.sursa !== sursa) return false;
        const data = new Date(d.data);
        if (an !== "toate" && data.getFullYear() !== Number(an)) return false;
        if (luna !== "toate" && data.getMonth() !== Number(luna)) return false;
        if (responsabil !== "toate" && responsabilDonatie(d) !== responsabil) return false;
        return true;
      }),
    [moneda, sursa, an, luna, responsabil],
  );

  const total = filtered.reduce((s, d) => s + (d.moneda === "RON" ? d.suma : 0), 0);

  const columns: ColumnDef<Donatie, unknown>[] = [
    { accessorKey: "sursaNume", header: dict.columns.sursa, cell: ({ row }) => <span className="font-medium">{row.original.sursaNume}</span> },
    { accessorKey: "sursa", header: dict.columns.tip, cell: ({ row }) => <Badge tone={row.original.sursa === "companie" ? "blue" : "neutral"}>{dict.sursaTip[row.original.sursa]}</Badge> },
    { accessorKey: "campanie", header: dict.columns.campanie },
    { accessorKey: "suma", header: dict.columns.suma, cell: ({ row }) => <span className="ci-tabular font-medium">{formatSuma(row.original.suma, row.original.moneda)}</span> },
    { accessorKey: "recurenta", header: dict.columns.recurenta, cell: ({ row }) => (row.original.recurenta ? <Badge tone="green">{dict.recurentaBadge}</Badge> : "—") },
    { accessorKey: "data", header: dict.columns.data, cell: ({ row }) => formatData(row.original.data) },
  ];

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">{dict.title}</h1>
          <p className="mt-0.5 text-[13px] text-[var(--ci-text-muted)]">{dict.subtitle(filtered.length)}</p>
        </div>
        <p className="ci-tabular text-lg font-bold text-[var(--ci-text)]">{dict.totalRon} {formatSuma(total)}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Select value={sursa} onChange={(e) => setSursa(e.target.value)} className="w-40">
          <option value="toate">{dict.filters.toateSursele}</option>
          <option value="donator">{dict.filters.persoaneFizice}</option>
          <option value="companie">{dict.filters.companii}</option>
        </Select>
        <Select value={moneda} onChange={(e) => setMoneda(e.target.value)} className="w-32">
          <option value="toate">{dict.filters.toateMonedele}</option>
          <option value="RON">RON</option>
          <option value="EUR">EUR</option>
          <option value="USD">USD</option>
        </Select>
        <Select value={luna} onChange={(e) => setLuna(e.target.value)} className="w-36">
          <option value="toate">{dict.filters.toateLunile}</option>
          {LUNI.map((l, i) => (
            <option key={l} value={i}>
              {l}
            </option>
          ))}
        </Select>
        <Select value={an} onChange={(e) => setAn(e.target.value)} className="w-28">
          <option value="toate">{dict.filters.toiAnii}</option>
          {ani.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </Select>
        <Select value={responsabil} onChange={(e) => setResponsabil(e.target.value)} className="w-48">
          <option value="toate">{dict.filters.toiResponsabilii}</option>
          {responsabili.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </Select>
      </div>

      <DataTable data={filtered} columns={columns} pageSize={15} />
    </div>
  );
}
