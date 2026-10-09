"use client";

import { useState, useTransition } from "react";

import { METODE } from "@/lib/performanta-masurare";
import { METRICA_PE_ID } from "@/lib/performanta-metrici";
import { NOTA_EXEMPLU, SABLOANE_ROLURI, type KrSablon } from "@/lib/performanta-sabloane";
import type { OptiuniPerformanta } from "@/lib/performanta-tipuri";

import { Button } from "../components/ui/button";
import { Dialog } from "../components/ui/dialog";
import { Input, Label, Select } from "../components/ui/input";
import { aplicaSablonAction } from "./obiective-actions";

const tinta = (r: KrSablon) => {
  const u = r.unitate ? ` ${r.unitate}` : "";
  if (r.metoda === "binar") return "realizat";
  if (r.metoda === "interval") return `între ${r.tinta} și ${r.tintaMax}${u}`;
  return `${r.metoda === "descrescator" ? "cel mult" : "cel puțin"} ${r.tinta?.toLocaleString("ro-RO")}${u}`;
};

export function SablonDialog({ orgSlug, optiuni, perioada, onClose, onGata }: { orgSlug: string; optiuni: OptiuniPerformanta; perioada: { start: string; end: string }; onClose: () => void; onGata: (t: string) => void }) {
  const [sablonId, setSablonId] = useState(SABLOANE_ROLURI[0].id);
  const [angajatId, setAngajatId] = useState(optiuni.euAngajatId ?? "");
  const [start, setStart] = useState(perioada.start);
  const [end, setEnd] = useState(perioada.end);
  const [eroare, setEroare] = useState<string | null>(null);
  const [pending, tr] = useTransition();
  const sablon = SABLOANE_ROLURI.find((s) => s.id === sablonId)!;

  function aplica() {
    if (!angajatId) return setEroare("Alege persoana pentru care aplici șablonul.");
    setEroare(null);
    tr(async () => {
      const r = await aplicaSablonAction(orgSlug, { sablonId, angajatId, perioadaStart: start, perioadaEnd: end });
      if (!r.ok) return setEroare(r.eroare);
      onGata(r.create.length === 0 ? `Nimic nou: ${r.sarite.length} obiective existau deja pentru persoană în perioadă.` : `Au fost create ${r.create.length} obiective${r.sarite.length ? ` (${r.sarite.length} existau deja și au fost sărite)` : ""}. Ajustează țintele înainte să le folosești.`);
    });
  }

  return (
    <Dialog open onClose={onClose} title="Obiective dintr-un șablon de rol" width="max-w-3xl">
      <div className="space-y-4">
        <p className="rounded-[var(--ci-radius-btn)] bg-[var(--ci-amber-soft)] px-3 py-2 text-[13px] text-[var(--ci-amber)]">
          Șabloanele sunt puncte de plecare. <strong>Țintele sunt exemple</strong>, nu norme: ajustează-le după situația organizației. Metricile din CRM sunt ale organizației, nu ale unei persoane, iar șablonul spune asta la fiecare.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="sb-rol">Rol</Label>
            <Select id="sb-rol" value={sablonId} onChange={(e) => setSablonId(e.target.value)}>
              {SABLOANE_ROLURI.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.rol}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="sb-pers">Pentru persoana</Label>
            <Select id="sb-pers" value={angajatId} onChange={(e) => setAngajatId(e.target.value)}>
              <option value="">Alege…</option>
              {optiuni.angajati
                .filter((a) => a.activ)
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nume}
                  </option>
                ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="sb-s">Început</Label>
            <Input id="sb-s" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="sb-e">Sfârșit</Label>
            <Input id="sb-e" type="date" min={start} value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
        </div>

        <section aria-label="Previzualizare">
          <p className="mb-2 text-[13px] text-[var(--ci-text-muted)]">{sablon.rezumat}</p>
          <ul className="space-y-3">
            {sablon.obiective.map((o) => (
              <li key={o.titlu} className="rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] p-3">
                <p className="text-[14px] font-semibold text-[var(--ci-text)]">{o.titlu}</p>
                <p className="text-[12.5px] text-[var(--ci-text-muted)]">{o.descriere}</p>
                <ul className="mt-2 space-y-2">
                  {o.rezultate.map((r) => (
                    <li key={r.titlu} className="rounded-[var(--ci-radius-btn)] bg-[var(--ci-surface-2)] p-2.5 text-[12.5px]">
                      <p className="font-medium text-[var(--ci-text)]">
                        {r.titlu} <span className="font-normal text-[var(--ci-text-muted)]">· {METODE.find((m) => m.id === r.metoda)?.eticheta.toLowerCase()} · {tinta(r)}</span>
                        <span className="ml-2 rounded-full bg-[var(--ci-amber-soft)] px-1.5 py-px text-[11px] font-medium text-[var(--ci-amber)]">exemplu</span>
                      </p>
                      <p className="mt-0.5 text-[var(--ci-text-muted)]">
                        <strong className="font-medium text-[var(--ci-text)]">Sursă:</strong> {r.sursa === "crm" ? `CRM, ${METRICA_PE_ID.get(r.metrica ?? "")?.eticheta ?? r.metrica}` : "introdusă manual"} · <strong className="font-medium text-[var(--ci-text)]">Formula:</strong> {r.formula}
                      </p>
                      <p className="mt-0.5 text-[var(--ci-text-muted)]">
                        <strong className="font-medium text-[var(--ci-text)]">Atribuire:</strong> {r.atribuire}
                      </p>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </section>

        {eroare && (
          <p role="alert" className="rounded-[var(--ci-radius-btn)] bg-[var(--ci-red-soft)] px-3 py-2 text-[13px] text-[var(--ci-red)]">
            {eroare}
          </p>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[12px] text-[var(--ci-text-muted)]">{NOTA_EXEMPLU} Pentru fiecare obiectiv creat poți schimba orice.</p>
          <div className="flex gap-2">
            <Button onClick={onClose}>Renunță</Button>
            <Button variant="primary" loading={pending} onClick={aplica}>
              Creează obiectivele
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
