"use client";

import { ArrowDown, ArrowUp, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import type { RandProiect } from "@/lib/donatori-pf-analiza";
import { DONATORI_UI_DICT } from "@/lib/i18n/dictionaries/donatori-ui";

import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { EmptyState } from "../../components/ui/states";
import { useLocale } from "../../lib/locale-context";
import { formatariPf } from "../pf-format";

type Cheie = keyof RandProiect;
const COLOANE: { key: Cheie; clasa?: string }[] = [
  { key: "proiect" },
  { key: "donatori", clasa: "text-right" },
  { key: "donatii", clasa: "text-right" },
  { key: "total", clasa: "text-right" },
  { key: "recurenti", clasa: "text-right" },
  { key: "atrasi", clasa: "text-right" },
  { key: "atrasiCareAuMaiDonat", clasa: "text-right" },
  { key: "sumaInAlteProiecte", clasa: "text-right" },
  { key: "maxDonatie", clasa: "text-right" },
];

export function ProiecteClient({ orgSlug, randuri }: { orgSlug: string; randuri: RandProiect[] }) {
  const locale = useLocale();
  const t = DONATORI_UI_DICT[locale].proiecte;
  const { lei: leiRo, nr: nrRo, procent: procentRo } = formatariPf(locale);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<Cheie>("total");
  const [dir, setDir] = useState<"asc" | "desc">("desc");

  const vizibile = useMemo(() => {
    const t = q.trim().toLowerCase();
    const l = randuri.filter((r) => !t || r.proiect.toLowerCase().includes(t));
    l.sort((a, b) => {
      const x = a[sort];
      const y = b[sort];
      const c = typeof x === "string" ? x.localeCompare(String(y), locale) : Number(x) - Number(y);
      return dir === "asc" ? c : -c;
    });
    return l;
  }, [randuri, q, sort, dir, locale]);

  const tot = useMemo(() => vizibile.reduce((s, r) => ({ donatii: s.donatii + r.donatii, total: s.total + r.total }), { donatii: 0, total: 0 }), [vizibile]);
  if (randuri.length === 0) return <EmptyState title={t.emptyTitlu} description={t.emptyDescriere} />;

  return (
    <Card padded={false}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--ci-border)] px-4 py-3">
        <div className="max-w-sm min-w-[220px] flex-1">
          <Input icon={<Search className="size-4" />} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.cauta} aria-label={t.cautaAria} />
        </div>
        <p className="ci-tabular text-[13px] text-[var(--ci-text-muted)]">
          {nrRo(vizibile.length)} {t.proiecte} · {nrRo(tot.donatii)} {t.donatii} · {leiRo(tot.total)}
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1000px] border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-[var(--ci-border)] text-[12px] text-[var(--ci-text-muted)]">
              {COLOANE.map((c) => {
                const activ = sort === c.key;
                return (
                  <th key={c.key} scope="col" title={t.coloane[c.key]?.hint} aria-sort={activ ? (dir === "asc" ? "ascending" : "descending") : "none"} className={`px-3 py-2 font-semibold ${c.clasa ?? "text-left"}`}>
                    <button
                      type="button"
                      onClick={() => {
                        if (activ) setDir((d) => (d === "asc" ? "desc" : "asc"));
                        else {
                          setSort(c.key);
                          setDir(c.key === "proiect" ? "asc" : "desc");
                        }
                      }}
                      className={`inline-flex items-center gap-1 hover:text-[var(--ci-text)] focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none ${activ ? "text-[var(--ci-text)]" : ""}`}
                    >
                      {t.coloane[c.key]?.label}
                      {activ && (dir === "asc" ? <ArrowUp className="size-3" aria-hidden /> : <ArrowDown className="size-3" aria-hidden />)}
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {vizibile.map((r) => (
              <tr key={r.proiect} className="border-b border-[var(--ci-border)] last:border-0 hover:bg-[var(--ci-surface-2)]">
                <td className="max-w-[260px] px-3 py-2.5">
                  <Link href={`/${orgSlug}/crm/donatori?proiect=${encodeURIComponent(r.proiect)}`} prefetch={false} className="block truncate font-medium text-[var(--ci-text)] hover:text-[var(--ci-primary)]" title={r.proiect}>
                    {r.proiect}
                  </Link>
                </td>
                <td className="ci-tabular px-3 py-2.5 text-right">{nrRo(r.donatori)}</td>
                <td className="ci-tabular px-3 py-2.5 text-right">{nrRo(r.donatii)}</td>
                <td className="ci-tabular px-3 py-2.5 text-right font-semibold whitespace-nowrap">{leiRo(r.total)}</td>
                <td className="ci-tabular px-3 py-2.5 text-right">{nrRo(r.recurenti)}</td>
                <td className="ci-tabular px-3 py-2.5 text-right">{nrRo(r.atrasi)}</td>
                <td className="ci-tabular px-3 py-2.5 text-right whitespace-nowrap">
                  {nrRo(r.atrasiCareAuMaiDonat)}
                  {r.atrasi > 0 && <span className="ml-1 text-[11.5px] text-[var(--ci-text-muted)]">({procentRo(r.atrasiCareAuMaiDonat / r.atrasi)})</span>}
                </td>
                <td className="ci-tabular px-3 py-2.5 text-right whitespace-nowrap">{leiRo(r.sumaInAlteProiecte)}</td>
                <td className="ci-tabular px-3 py-2.5 text-right whitespace-nowrap">{leiRo(r.maxDonatie)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
