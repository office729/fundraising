"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { ChevronDown, Phone, Search, Settings2, X } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { Avatar } from "../components/ui/avatar";
import { Badge, type StatusTone } from "../components/ui/badge";
import { Card } from "../components/ui/card";
import { DataTable } from "../components/data-table";
import { HeartToggle } from "../components/heart-toggle";
import { EmptyState } from "../components/ui/states";
import { Input } from "../components/ui/input";
import { formatDataRelativa, formatSuma } from "../lib/format";
import { useLocale } from "../lib/locale-context";
import { DONATORI_LIST_DICT } from "@/lib/i18n/dictionaries/donatori-list";
import { getMultumitMap, getSunatMap, setMultumit, setSunat, useLocalStoreValue } from "../lib/local-store";
import { useDonatori } from "../lib/use-data";
import { DONATII } from "../mock";
import type { Donator, SegmentDonator } from "../mock";

const SEGMENT_TONE: Record<SegmentDonator, StatusTone> = {
  nou: "blue", fidel: "green", major: "green", recurent: "blue",
  in_risc: "amber", inactiv: "neutral", reactivat: "blue",
};

const EMPTY: Record<string, boolean> = {};

const SEGMENTE: SegmentDonator[] = ["nou", "fidel", "major", "recurent", "in_risc", "inactiv", "reactivat"];

// Filtrele de mai jos (chip-uri) folosesc doar câmpuri care EXISTĂ real în
// schema mock (tip/status/segment/consimtamant) — nu inventăm concepte noi.
// Segmentele RFM (nou/fidel/major/...) erau înainte într-un dropdown separat
// — le-am adus aici ca să fie un singur rând de filtre, nu două controale
// diferite pentru concepte similare. De sunat/Sunați/Mulțumiți nu au
// echivalent în mock, sunt urmărite local (vezi lib/local-store.ts).
function chipPredicat(
  key: string,
  d: Donator,
  medianDonat: number,
  sunatMap: Record<string, boolean>,
  multumitMap: Record<string, boolean>,
): boolean {
  if ((SEGMENTE as string[]).includes(key)) return d.segment === key;
  switch (key) {
    case "recurenti": return d.tip === "recurent";
    case "unica": return d.tip === "unic";
    case "cutelefon": return !!d.telefon;
    case "desunat": return !!d.telefon && !sunatMap[d.id];
    case "sunati": return !!sunatMap[d.id];
    case "multumiti": return !!multumitMap[d.id];
    case "lunari": return d.tip === "recurent" && d.status === "activ";
    case "candidati": return d.tip === "unic" && d.totalDonat >= medianDonat;
    case "winback": return d.segment === "reactivat";
    case "consimt": return d.consimtamant === "da";
    case "faraconsimt": return d.consimtamant === "nu";
    case "noi": return d.status === "nou";
    case "activi": return d.status === "activ";
    case "dormanti": return d.status === "inactiv";
    default: return true;
  }
}

const CHIP_KEYS = [
  "toti", "recurenti", "unica", "top", "cutelefon", "desunat", "sunati", "multumiti",
  "lunari", "candidati", "winback", "consimt", "faraconsimt", "noi", "activi", "dormanti",
  ...SEGMENTE,
] as const;
const LOCAL_CHIPS = new Set(["desunat", "sunati", "multumiti"]);

export function DonatoriListClient() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const router = useRouter();
  const locale = useLocale();
  const dict = DONATORI_LIST_DICT[locale];
  const [q, setQ] = useState("");
  const [chip, setChip] = useState("toti");
  const [filtreDeschise, setFiltreDeschise] = useState(false);
  const DONATORI = useDonatori();
  const sunatMap = useLocalStoreValue(getSunatMap, EMPTY);
  const multumitMap = useLocalStoreValue(getMultumitMap, EMPTY);

  const chipLabel = (key: string) => dict.chip[key as keyof typeof dict.chip] ?? dict.segment[key] ?? key;

  const medianDonat = useMemo(() => {
    const sortate = [...DONATORI].map((d) => d.totalDonat).sort((a, b) => a - b);
    return sortate[Math.floor(sortate.length / 2)] ?? 0;
  }, [DONATORI]);

  const stats = useMemo(() => {
    const recurenti = DONATORI.filter((d) => d.tip === "recurent").length;
    const totalDonat = DONATORI.reduce((s, d) => s + d.totalDonat, 0);
    return {
      unici: DONATORI.length,
      nrDonatii: DONATII.filter((d) => d.sursa === "donator").length,
      totalDonat,
      recurenti,
      recurentiPct: DONATORI.length ? Math.round((recurenti / DONATORI.length) * 100) : 0,
      medie: DONATORI.length ? Math.round(totalDonat / DONATORI.length) : 0,
    };
  }, [DONATORI]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { toti: DONATORI.length, top: Math.min(10, DONATORI.length) };
    for (const key of CHIP_KEYS) {
      if (key === "toti" || key === "top") continue;
      c[key] = DONATORI.filter((d) => chipPredicat(key, d, medianDonat, sunatMap, multumitMap)).length;
    }
    return c;
  }, [DONATORI, medianDonat, sunatMap, multumitMap]);

  const filtered = useMemo(() => {
    let list = DONATORI.filter((d) => {
      if (q.trim() && !d.nume.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
    if (chip === "top") {
      list = [...list].sort((a, b) => b.totalDonat - a.totalDonat).slice(0, 10);
    } else if (chip !== "toti") {
      list = list.filter((d) => chipPredicat(chip, d, medianDonat, sunatMap, multumitMap));
    }
    return list;
  }, [q, chip, DONATORI, medianDonat, sunatMap, multumitMap]);

  const columns: ColumnDef<Donator, unknown>[] = [
    {
      id: "lucrat",
      header: "",
      cell: ({ row }) => <HeartToggle id={row.original.id} size="sm" />,
    },
    {
      accessorKey: "nume",
      header: dict.columns.nume,
      cell: ({ row }) => (
        <span className="flex items-center gap-2.5">
          <Avatar name={row.original.nume} size="sm" />
          <span className="font-medium">{row.original.nume}</span>
        </span>
      ),
    },
    {
      accessorKey: "segment",
      header: dict.columns.segment,
      cell: ({ row }) => <Badge tone={SEGMENT_TONE[row.original.segment]}>{dict.segment[row.original.segment]}</Badge>,
    },
    { accessorKey: "scorImplicare", header: dict.columns.scor, cell: ({ row }) => <span className="ci-tabular">{row.original.scorImplicare}</span> },
    {
      accessorKey: "totalDonat",
      header: dict.columns.totalDonat,
      cell: ({ row }) => <span className="ci-tabular font-medium">{formatSuma(row.original.totalDonat, row.original.moneda)}</span>,
    },
    {
      accessorKey: "ultimaDonatieLa",
      header: dict.columns.ultimaDonatie,
      cell: ({ row }) => formatDataRelativa(row.original.ultimaDonatieLa),
    },
    { accessorKey: "responsabil", header: dict.columns.responsabil },
    { accessorKey: "localitate", header: dict.columns.localitate },
    {
      id: "sunat",
      header: dict.columns.apel,
      cell: ({ row }) => {
        const d = row.original;
        if (!d.telefon) return <span className="text-[var(--ci-text-faint)]">—</span>;
        const sunat = !!sunatMap[d.id];
        const multumit = !!multumitMap[d.id];
        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (multumit) { setMultumit(d.id, false); return; }
              if (sunat) { setMultumit(d.id, true); return; }
              setSunat(d.id, true);
            }}
            title={multumit ? dict.call.titleMultumit : sunat ? dict.call.titleSunat : dict.call.titleDeSunat}
            className="flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[12px] transition-colors hover:bg-[var(--ci-surface-2)]"
          >
            <Phone className={`h-3.5 w-3.5 ${multumit ? "text-[var(--ci-green)]" : sunat ? "text-[var(--ci-blue)]" : "text-[var(--ci-text-faint)]"}`} />
            {multumit ? dict.call.multumit : sunat ? dict.call.sunat : dict.call.deSunat}
          </button>
        );
      },
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">{dict.header.title}</h1>
          <p className="mt-0.5 text-[13px] text-[var(--ci-text-muted)]">{dict.header.subtitle(filtered.length, DONATORI.length)}</p>
        </div>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-3">
        <StatCard label={dict.stats.donatori} value={stats.unici.toLocaleString("ro-RO")} />
        <StatCard label={dict.stats.donatii} value={stats.nrDonatii.toLocaleString("ro-RO")} />
        <StatCard label={dict.stats.totalDonat} value={formatSuma(stats.totalDonat)} tone="primary" />
        <StatCard label={dict.stats.recurenti} value={stats.recurenti.toLocaleString("ro-RO")} suffix={`${stats.recurentiPct}%`} />
        <StatCard label={dict.stats.medie} value={formatSuma(stats.medie)} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="w-64">
          <Input icon={<Search className="h-4 w-4" />} placeholder={dict.search} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <button
          type="button"
          onClick={() => setFiltreDeschise((v) => !v)}
          className={`inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-[13px] font-medium transition-colors ${
            filtreDeschise || chip !== "toti"
              ? "border-[var(--ci-blue)] bg-[var(--ci-blue-soft)] text-[var(--ci-blue)]"
              : "border-[var(--ci-border)] text-[var(--ci-text)] hover:bg-[var(--ci-surface-2)]"
          }`}
        >
          <Settings2 className="h-3.5 w-3.5" />
          {dict.filters}
          {chip !== "toti" && <Badge tone="blue" icon={false}>{chipLabel(chip)}</Badge>}
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${filtreDeschise ? "rotate-180" : ""}`} />
        </button>
        {(q || chip !== "toti") && (
          <button
            onClick={() => { setQ(""); setChip("toti"); }}
            className="inline-flex h-9 items-center gap-1 rounded-lg px-2.5 text-[12px] font-medium text-[var(--ci-text-muted)] hover:text-[var(--ci-text)]"
          >
            <X className="h-3.5 w-3.5" /> {dict.resetFilters}
          </button>
        )}
      </div>

      {filtreDeschise && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--ci-border)] bg-[var(--ci-surface)] p-3">
          {CHIP_KEYS.map((key) => {
            const activ = chip === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setChip(key)}
                title={LOCAL_CHIPS.has(key) ? dict.localOnly : undefined}
                className={`rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors ${
                  activ
                    ? "border-[var(--ci-blue)] bg-[var(--ci-blue-soft)] text-[var(--ci-blue)]"
                    : "border-[var(--ci-border)] text-[var(--ci-text-muted)] hover:bg-[var(--ci-surface-2)]"
                }`}
              >
                {chipLabel(key)} <span className="ci-tabular">{counts[key] ?? 0}</span>
              </button>
            );
          })}
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState title={dict.empty.title} description={dict.empty.description} />
      ) : (
        <DataTable
          data={filtered}
          columns={columns}
          onRowClick={(d) => router.push(`/${orgSlug}/crm/donatori/${d.id}`)}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, suffix, tone }: { label: string; value: string; suffix?: string; tone?: "primary" }) {
  return (
    <Card className="min-w-0 overflow-hidden p-3">
      <p className="text-[10px] font-semibold text-[var(--ci-text-muted)] uppercase">{label}</p>
      <p className={`ci-tabular mt-1 flex items-baseline gap-1.5 text-base font-bold whitespace-nowrap ${tone === "primary" ? "text-[var(--ci-primary)]" : "text-[var(--ci-text)]"}`}>
        {value}
        {suffix && <span className="text-[12px] font-medium text-[var(--ci-text-muted)]">{suffix}</span>}
      </p>
    </Card>
  );
}
