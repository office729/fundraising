"use client";

import { FileSpreadsheet, FileText } from "lucide-react";
import { useMemo, useState } from "react";

import type { RezumatAngajat, StatusKpi } from "@/lib/kpi-engine";

import { Breadcrumb } from "../components/ui/breadcrumb";
import { Button } from "../components/ui/button";
import { Card, CardHeader } from "../components/ui/card";
import { EmptyState } from "../components/ui/states";

type Departament = { departamentId: string | null; departamentNume: string; scorMediu: number | null; restante: number; membri: number };

const STATUS_ETICHETA: Record<StatusKpi, string> = {
  neinceput: "Neînceput",
  in_grafic: "În grafic",
  necesita_atentie: "De urmărit",
  restant: "Sub țintă",
  finalizat: "Atins",
};

const esc = (s: string | number | null | undefined) =>
  String(s ?? "—").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);

const nrfmt = (n: number | null) => (n == null ? "—" : n.toLocaleString("ro-RO"));

function numeComplet(r: RezumatAngajat) {
  return `${r.nume} ${r.prenume ?? ""}`.trim();
}

// Raport KPI: tabel de rezumat + detaliu pe KPI, cu export Excel și PDF. Ordonat alfabetic, fără clasament — raportul
// descrie progresul, nu compară oamenii între ei.
export function RapoarteClient({ orgSlug, titlu, rezumate, arataDepartamente }: { orgSlug: string; titlu: string; rezumate: RezumatAngajat[]; arataDepartamente: Departament[] }) {
  const [seExporta, setSeExporta] = useState(false);
  const randuri = useMemo(() => [...rezumate].sort((a, b) => numeComplet(a).localeCompare(numeComplet(b), "ro")), [rezumate]);
  const data = new Date().toLocaleDateString("ro-RO", { day: "numeric", month: "long", year: "numeric" });

  const detaliiKpi = useMemo(
    () =>
      randuri.flatMap((r) =>
        r.kpiuri.map((k) => ({
          angajat: numeComplet(r),
          kpi: k.nume,
          valoare: k.valoare,
          tinta: k.targetNormal,
          unitate: k.unitate,
          progres: k.progres,
          status: STATUS_ETICHETA[k.status],
          sezon: k.profilSezonierNume,
        })),
      ),
    [randuri],
  );

  async function descarcaExcel() {
    setSeExporta(true);
    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.utils.book_new();
      const rezumat = [
        ["Angajat", "Rol", "Scor mediu (%)", "KPI atribuite", "Sub țintă", "Atinse"],
        ...randuri.map((r) => [numeComplet(r), r.roleNume ?? "", r.scorMediu ?? "", r.kpiuri.length, r.restante, r.finalizate]),
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rezumat), "Rezumat");
      const detaliu = [
        ["Angajat", "KPI", "Valoare", "Țintă", "Unitate", "Progres (%)", "Status", "Perioadă sezonieră"],
        ...detaliiKpi.map((d) => [d.angajat, d.kpi, d.valoare ?? "", d.tinta ?? "", d.unitate ?? "", d.progres ?? "", d.status, d.sezon ?? ""]),
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(detaliu), "Detaliu KPI");
      XLSX.writeFile(wb, `raport-kpi-${new Date().toISOString().slice(0, 10)}.xlsx`);
    } finally {
      setSeExporta(false);
    }
  }

  // PDF: deschide raportul curat, într-o fereastră separată, și pornește dialogul de tipărire („Salvează ca PDF”).
  function salveazaPdf() {
    const w = window.open("", "_blank");
    if (!w) {
      window.alert("Permite ferestrele pop-up ca să se deschidă raportul.");
      return;
    }
    const linii = randuri
      .map((r) => `<tr><td>${esc(numeComplet(r))}</td><td>${esc(r.roleNume)}</td><td class="n">${r.scorMediu != null ? r.scorMediu + "%" : "—"}</td><td class="n">${r.kpiuri.length}</td><td class="n">${r.restante}</td><td class="n">${r.finalizate}</td></tr>`)
      .join("");
    const detaliu = detaliiKpi
      .map((d) => `<tr><td>${esc(d.angajat)}</td><td>${esc(d.kpi)}</td><td class="n">${esc(nrfmt(d.valoare))}${d.unitate ? " " + esc(d.unitate) : ""}</td><td class="n">${esc(nrfmt(d.tinta))}</td><td class="n">${d.progres != null ? d.progres + "%" : "—"}</td><td>${esc(d.status)}${d.sezon ? " · " + esc(d.sezon) : ""}</td></tr>`)
      .join("");
    w.document.write(`<!doctype html><html lang="ro"><head><meta charset="utf-8"><title>${esc(titlu)}</title><style>
      body{font:13px/1.5 Inter,Segoe UI,Arial,sans-serif;color:#0f172a;margin:32px}
      h1{font-size:20px;margin:0 0 2px} .sub{color:#64748b;margin:0 0 20px} h2{font-size:14px;margin:26px 0 8px;text-transform:uppercase;letter-spacing:.05em;color:#334155}
      table{border-collapse:collapse;width:100%} th{background:#f1f5f9;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#475569}
      th,td{padding:7px 10px;border-bottom:1px solid #e2e8f0;vertical-align:top} td.n,th.n{text-align:right;font-variant-numeric:tabular-nums}
      @media print{body{margin:14mm} tr{page-break-inside:avoid}}
    </style></head><body>
      <h1>${esc(titlu)}</h1><p class="sub">Generat la ${esc(data)} · ordonat alfabetic, fără clasament</p>
      <h2>Rezumat</h2>
      <table><thead><tr><th>Angajat</th><th>Rol</th><th class="n">Scor mediu</th><th class="n">KPI</th><th class="n">Sub țintă</th><th class="n">Atinse</th></tr></thead><tbody>${linii}</tbody></table>
      <h2>Detaliu pe KPI</h2>
      <table><thead><tr><th>Angajat</th><th>KPI</th><th class="n">Valoare</th><th class="n">Țintă</th><th class="n">Progres</th><th>Status</th></tr></thead><tbody>${detaliu}</tbody></table>
    </body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
  }

  const total = randuri.length;
  const cuScor = randuri.filter((r) => r.scorMediu !== null);
  const scorGeneral = cuScor.length ? Math.round(cuScor.reduce((s, r) => s + (r.scorMediu as number), 0) / cuScor.length) : null;

  return (
    <div className="mx-auto max-w-[1100px] space-y-5">
      <Breadcrumb items={[{ label: "Instrumente", href: `/${orgSlug}/crm/instrumente` }, { label: "KPI Library", href: `/${orgSlug}/crm/kpi` }, { label: "Rapoarte" }]} />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">{titlu}</h1>
          <p className="mt-0.5 text-[13px] text-[var(--ci-text-muted)]">Rezumat și detaliu pe KPI, la {data}. Ordonat alfabetic — raportul arată progresul, nu face clasament.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={descarcaExcel} disabled={seExporta || total === 0}>
            <FileSpreadsheet className="h-3.5 w-3.5" /> Descarcă Excel
          </Button>
          <Button variant="primary" onClick={salveazaPdf} disabled={total === 0}>
            <FileText className="h-3.5 w-3.5" /> Salvează PDF
          </Button>
        </div>
      </div>

      {total === 0 ? (
        <EmptyState title="Niciun angajat în raport" description="Setează „Manager direct” în Organizație & Echipă ca să-ți vezi echipa aici." />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card>
              <p className="text-[12px] text-[var(--ci-text-muted)]">Angajați</p>
              <p className="ci-tabular mt-1 text-xl font-bold text-[var(--ci-text)]">{total}</p>
            </Card>
            <Card>
              <p className="text-[12px] text-[var(--ci-text-muted)]">Scor mediu</p>
              <p className="ci-tabular mt-1 text-xl font-bold text-[var(--ci-text)]">{scorGeneral != null ? `${scorGeneral}%` : "—"}</p>
            </Card>
            <Card>
              <p className="text-[12px] text-[var(--ci-text-muted)]">KPI sub țintă</p>
              <p className="ci-tabular mt-1 text-xl font-bold text-[var(--ci-text)]">{randuri.reduce((s, r) => s + r.restante, 0)}</p>
            </Card>
            <Card>
              <p className="text-[12px] text-[var(--ci-text-muted)]">KPI atinse</p>
              <p className="ci-tabular mt-1 text-xl font-bold text-[var(--ci-green)]">{randuri.reduce((s, r) => s + r.finalizate, 0)}</p>
            </Card>
          </div>

          {arataDepartamente.length > 0 && (
            <Card>
              <CardHeader title="Pe departamente" subtitle="Scor mediu și KPI sub țintă" />
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-b border-[var(--ci-border)] text-left text-[11px] tracking-wide text-[var(--ci-text-muted)] uppercase">
                      <th className="py-2 pr-3 font-semibold">Departament</th>
                      <th className="px-3 py-2 text-right font-semibold">Membri</th>
                      <th className="px-3 py-2 text-right font-semibold">Scor mediu</th>
                      <th className="py-2 pl-3 text-right font-semibold">Sub țintă</th>
                    </tr>
                  </thead>
                  <tbody>
                    {arataDepartamente.map((d) => (
                      <tr key={d.departamentId ?? "fara"} className="border-b border-[var(--ci-border)] last:border-0">
                        <td className="py-2 pr-3 font-medium text-[var(--ci-text)]">{d.departamentNume}</td>
                        <td className="ci-tabular px-3 py-2 text-right">{d.membri}</td>
                        <td className="ci-tabular px-3 py-2 text-right">{d.scorMediu != null ? `${d.scorMediu}%` : "—"}</td>
                        <td className="ci-tabular py-2 pl-3 text-right">{d.restante}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          <Card>
            <CardHeader title="Rezumat pe angajat" subtitle={`${total} ${total === 1 ? "angajat" : "angajați"}`} />
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-[var(--ci-border)] text-left text-[11px] tracking-wide text-[var(--ci-text-muted)] uppercase">
                    <th className="py-2 pr-3 font-semibold">Angajat</th>
                    <th className="px-3 py-2 font-semibold">Rol</th>
                    <th className="px-3 py-2 text-right font-semibold">Scor mediu</th>
                    <th className="px-3 py-2 text-right font-semibold">KPI</th>
                    <th className="px-3 py-2 text-right font-semibold">Sub țintă</th>
                    <th className="py-2 pl-3 text-right font-semibold">Atinse</th>
                  </tr>
                </thead>
                <tbody>
                  {randuri.map((r) => (
                    <tr key={r.angajatId} className="border-b border-[var(--ci-border)] last:border-0">
                      <td className="py-2 pr-3 font-medium text-[var(--ci-text)]">{numeComplet(r)}</td>
                      <td className="px-3 py-2 text-[var(--ci-text-muted)]">{r.roleNume ?? "—"}</td>
                      <td className="ci-tabular px-3 py-2 text-right">{r.scorMediu != null ? `${r.scorMediu}%` : "—"}</td>
                      <td className="ci-tabular px-3 py-2 text-right">{r.kpiuri.length}</td>
                      <td className="ci-tabular px-3 py-2 text-right">{r.restante}</td>
                      <td className="ci-tabular py-2 pl-3 text-right">{r.finalizate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
