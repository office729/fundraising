"use client";

import { Check, Minus } from "lucide-react";
import { useState, useTransition } from "react";

import type { PermisiuniKpi } from "@/lib/kpi-permisiuni";

import { Breadcrumb } from "../components/ui/breadcrumb";
import { Button } from "../components/ui/button";
import { Card, CardHeader } from "../components/ui/card";
import { salveazaPermisiuniAction } from "./permisiuni-actions";

const SETARI: { k: keyof PermisiuniKpi; titlu: string; descriere: string }[] = [
  { k: "managerAtribuie", titlu: "Managerii pot atribui KPI și modifica targeturile echipei lor", descriere: "Se aplică managerului direct și adminului de departament, doar pentru oamenii lor. Fiecare modificare apare în Jurnalul de modificări." },
  { k: "managerValori", titlu: "Managerii pot introduce și corecta valori pentru echipa lor", descriere: "Util când valorile unui KPI se adună la nivel de echipă sau managerul le completează în locul colegilor." },
  { k: "angajatValoriProprii", titlu: "Fiecare angajat își poate introduce singur valorile KPI-urilor lui manuale", descriere: "Oprește-l dacă valorile se completează doar de manager sau de administrator." },
];

type Celula = boolean | "setare";

// Ce poate face fiecare nivel: owner/admin pot mereu tot; restul depinde de cele trei setări de mai sus. Tabelul se actualizează
// pe loc, ca să se vadă efectul înainte de salvare.
export function PermisiuniClient({ orgSlug, initial }: { orgSlug: string; initial: PermisiuniKpi }) {
  const [p, setP] = useState(initial);
  const [salvat, setSalvat] = useState(initial);
  const [pending, start] = useTransition();
  const [eroare, setEroare] = useState("");
  const modificat = JSON.stringify(p) !== JSON.stringify(salvat);

  const matrice: { actiune: string; angajat: Celula; manager: Celula; adminDep: Celula; admin: Celula }[] = [
    { actiune: "Vede propriile KPI", angajat: true, manager: true, adminDep: true, admin: true },
    { actiune: "Vede KPI-urile echipei (manager direct / tot departamentul)", angajat: false, manager: true, adminDep: true, admin: true },
    { actiune: "Atribuie KPI și modifică targeturi/ponderi", angajat: false, manager: p.managerAtribuie, adminDep: p.managerAtribuie, admin: true },
    { actiune: "Introduce / corectează valori manuale", angajat: p.angajatValoriProprii, manager: p.managerValori, adminDep: p.managerValori, admin: true },
    { actiune: "Notează 1:1 pentru echipă", angajat: false, manager: true, adminDep: true, admin: true },
    { actiune: "Creează și șterge KPI din bibliotecă, organizație și echipă, rapoarte pe organizație, jurnal, permisiuni", angajat: false, manager: false, adminDep: false, admin: true },
  ];

  function salveaza() {
    setEroare("");
    start(async () => {
      try {
        setSalvat(await salveazaPermisiuniAction(orgSlug, p));
      } catch (e) {
        setEroare(e instanceof Error ? e.message : "Eroare.");
      }
    });
  }

  const Semn = ({ v }: { v: Celula }) => (v ? <Check className="mx-auto h-4 w-4 text-[var(--ci-green)]" strokeWidth={3} aria-label="da" /> : <Minus className="mx-auto h-4 w-4 text-[var(--ci-text-faint)]" aria-label="nu" />);

  return (
    <div className="mx-auto max-w-[900px] space-y-5">
      <Breadcrumb items={[{ label: "Instrumente", href: `/${orgSlug}/crm/instrumente` }, { label: "KPI Library", href: `/${orgSlug}/crm/kpi` }, { label: "Permisiuni" }]} />
      <div>
        <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">Permisiuni KPI</h1>
        <p className="mt-0.5 max-w-2xl text-[13px] text-[var(--ci-text-muted)]">Hotărăști cât din munca cu KPI poate fi făcută de manageri și de angajați. Owner-ul și administratorii pot mereu tot. Regulile se aplică pe server, nu doar în interfață.</p>
      </div>

      <Card>
        <CardHeader title="Setări" subtitle="Implicit, doar administratorii atribuie KPI, iar angajatul își introduce singur valorile." />
        <div className="space-y-3">
          {SETARI.map((s) => (
            <label key={s.k} className="flex cursor-pointer items-start gap-3 rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] p-3 hover:bg-[var(--ci-surface-2)]">
              <input type="checkbox" checked={p[s.k]} onChange={(e) => setP({ ...p, [s.k]: e.target.checked })} className="mt-0.5 h-4 w-4 accent-[var(--ci-primary)]" />
              <span className="min-w-0">
                <span className="block text-[13px] font-semibold text-[var(--ci-text)]">{s.titlu}</span>
                <span className="mt-0.5 block text-[12px] text-[var(--ci-text-muted)]">{s.descriere}</span>
              </span>
            </label>
          ))}
        </div>
        {eroare && <p className="mt-3 text-[13px] text-[var(--ci-red)]">{eroare}</p>}
        <div className="mt-4 flex items-center gap-3">
          <Button variant="primary" onClick={salveaza} disabled={pending || !modificat}>
            {pending ? "Se salvează…" : "Salvează permisiunile"}
          </Button>
          {!modificat && <span className="text-[12px] text-[var(--ci-text-faint)]">Nicio modificare nesalvată</span>}
        </div>
      </Card>

      <Card padded={false}>
        <div className="px-4 pt-4">
          <CardHeader title="Cine poate ce" subtitle="Așa arată regulile cu setările de mai sus" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-[13px]">
            <thead>
              <tr className="border-y border-[var(--ci-border)] bg-[var(--ci-surface-2)] text-[11px] tracking-wide text-[var(--ci-text-muted)] uppercase">
                <th className="px-4 py-2 text-left font-semibold">Acțiune</th>
                <th className="px-2 py-2 text-center font-semibold">Angajat</th>
                <th className="px-2 py-2 text-center font-semibold">Manager direct</th>
                <th className="px-2 py-2 text-center font-semibold">Admin departament</th>
                <th className="px-2 py-2 text-center font-semibold">Owner / admin</th>
              </tr>
            </thead>
            <tbody>
              {matrice.map((r) => (
                <tr key={r.actiune} className="border-b border-[var(--ci-border)] last:border-0">
                  <td className="px-4 py-2.5 text-[var(--ci-text)]">{r.actiune}</td>
                  <td className="px-2 py-2.5"><Semn v={r.angajat} /></td>
                  <td className="px-2 py-2.5"><Semn v={r.manager} /></td>
                  <td className="px-2 py-2.5"><Semn v={r.adminDep} /></td>
                  <td className="px-2 py-2.5"><Semn v={r.admin} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}