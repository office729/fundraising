"use client";

import { useMemo, useState } from "react";

import { Badge } from "../components/ui/badge";
import { Breadcrumb } from "../components/ui/breadcrumb";
import { Card } from "../components/ui/card";
import { Select } from "../components/ui/input";
import { EmptyState } from "../components/ui/states";
import type { IntrareJurnal } from "./jurnal-actions";

const ENTITATE: Record<string, string> = {
  angajat: "Angajat",
  departament: "Departament",
  rol: "Rol",
  kpi_definitie: "KPI",
  kpi_atribuire: "Atribuire",
  kpi_valoare: "Valoare",
  profil_sezonier: "Profil sezonier",
  funnel: "Funnel",
};
const ACTIUNE: Record<string, string> = { creeaza: "creat", actualizeaza: "modificat", sterge: "șters", duplica: "duplicat" };

export function JurnalClient({ orgSlug, intrari }: { orgSlug: string; intrari: IntrareJurnal[] }) {
  const [entitate, setEntitate] = useState("toate");
  const entitati = useMemo(() => [...new Set(intrari.map((i) => i.entitate))].sort(), [intrari]);
  const filtrate = useMemo(() => (entitate === "toate" ? intrari : intrari.filter((i) => i.entitate === entitate)), [intrari, entitate]);

  return (
    <div className="mx-auto max-w-[1000px] space-y-5">
      <Breadcrumb items={[{ label: "Instrumente", href: `/${orgSlug}/crm/instrumente` }, { label: "KPI Library", href: `/${orgSlug}/crm/kpi` }, { label: "Jurnal modificări" }]} />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">Jurnal modificări KPI</h1>
          <p className="mt-0.5 text-[13px] text-[var(--ci-text-muted)]">Cine a schimbat ce și când — ultimele {intrari.length} intrări. Vizibil doar pentru administratori.</p>
        </div>
        <Select value={entitate} onChange={(e) => setEntitate(e.target.value)} className="w-52">
          <option value="toate">Toate tipurile</option>
          {entitati.map((e) => (
            <option key={e} value={e}>
              {ENTITATE[e] ?? e}
            </option>
          ))}
        </Select>
      </div>

      <Card padded={false}>
        {filtrate.length === 0 ? (
          <div className="p-5">
            <EmptyState title="Nicio modificare înregistrată" description="Aici apar schimbările de KPI-uri, atribuiri, valori și profiluri." />
          </div>
        ) : (
          <div className="divide-y divide-[var(--ci-border)]">
            {filtrate.map((i) => (
              <div key={i.id} className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 px-4 py-2.5">
                <div className="min-w-0">
                  <p className="text-[13px] text-[var(--ci-text)]">
                    <span className="font-semibold">{i.actor ?? "Sistem"}</span> a {ACTIUNE[i.actiune] ?? i.actiune} <Badge tone="neutral" icon={false}>{ENTITATE[i.entitate] ?? i.entitate}</Badge>
                  </p>
                  {i.detalii && <p className="mt-0.5 text-[12px] break-words text-[var(--ci-text-muted)]">{i.detalii}</p>}
                </div>
                <p className="ci-tabular shrink-0 text-[12px] text-[var(--ci-text-muted)]">
                  {new Date(i.la).toLocaleString("ro-RO", { timeZone: "Europe/Bucharest", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}