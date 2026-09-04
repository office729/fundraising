"use client";

import { useState } from "react";

import { Dialog } from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Input, Label, Select } from "../../components/ui/input";
import { addDonatie, addProiectDonator, getProiecteDonator, useLocalStoreValue } from "../../lib/local-store";
import { useLocale } from "../../lib/locale-context";
import { DONATOR_PROFIL_DICT } from "@/lib/i18n/dictionaries/donator-profil";

const EMPTY: never[] = [];

export function AddDonationDialog({
  donatorId,
  proiectePreferate,
  open,
  onClose,
}: {
  donatorId: string;
  proiectePreferate: string[];
  open: boolean;
  onClose: () => void;
}) {
  const locale = useLocale();
  const dict = DONATOR_PROFIL_DICT[locale].dialog;
  const [suma, setSuma] = useState("");
  const [moneda, setMoneda] = useState("RON");
  const [campanie, setCampanie] = useState("");
  const [recurenta, setRecurenta] = useState(false);
  const [esteProiect, setEsteProiect] = useState(false);
  const [proiect, setProiect] = useState("");
  const [formular230, setFormular230] = useState(false);
  const proiecteAdaugate = useLocalStoreValue(() => getProiecteDonator(donatorId), EMPTY);
  const proiecte = [...new Set([...proiectePreferate, ...proiecteAdaugate])];

  function salveaza() {
    const val = Number(suma.replace(",", "."));
    if (!val || val <= 0) return;
    addDonatie(donatorId, {
      suma: val,
      moneda,
      campanie: campanie.trim() || dict.donatieGenerala,
      recurenta,
      proiect: esteProiect ? proiect : "",
      formular230,
    });
    if (esteProiect && proiect.trim()) addProiectDonator(donatorId, proiect.trim());
    setSuma("");
    setCampanie("");
    setRecurenta(false);
    setEsteProiect(false);
    setProiect("");
    setFormular230(false);
    onClose();
  }

  return (
    <Dialog open={open} onClose={onClose} title={dict.title} width="max-w-sm">
      <div className="space-y-3">
        <p className="rounded-lg border border-dashed border-[var(--ci-border)] bg-[var(--ci-surface-2)] px-3 py-2 text-[12px] text-[var(--ci-text-muted)]">
          {dict.avertisment}
        </p>
        <div>
          <Label>{dict.suma}</Label>
          <div className="flex gap-2">
            <Input
              type="number"
              min="0"
              step="0.01"
              autoFocus
              value={suma}
              onChange={(e) => setSuma(e.target.value)}
              placeholder="0"
            />
            <Select value={moneda} onChange={(e) => setMoneda(e.target.value)} className="w-24">
              <option value="RON">RON</option>
              <option value="EUR">EUR</option>
              <option value="USD">USD</option>
            </Select>
          </div>
        </div>
        <div>
          <Label>{dict.campanieOptional}</Label>
          <Input value={campanie} onChange={(e) => setCampanie(e.target.value)} placeholder={dict.campaniePlaceholder} />
        </div>

        <div className="space-y-2 rounded-lg border border-[var(--ci-border)] p-3">
          <Checkbox label={dict.donatieRecurenta} checked={recurenta} onChange={setRecurenta} />
          <Checkbox label={dict.legataDeProiect} checked={esteProiect} onChange={setEsteProiect} />
          {esteProiect && (
            <div className="pl-6">
              <Input
                list="proiecte-existente"
                value={proiect}
                onChange={(e) => setProiect(e.target.value)}
                placeholder={dict.numeleProiectului}
              />
              <datalist id="proiecte-existente">
                {proiecte.map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
            </div>
          )}
          <Checkbox label={dict.formular230} checked={formular230} onChange={setFormular230} />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>{dict.anuleaza}</Button>
          <Button variant="primary" onClick={salveaza} disabled={!suma}>{dict.salveaza}</Button>
        </div>
      </div>
    </Dialog>
  );
}

function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-[13px] text-[var(--ci-text)]">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 rounded border-[var(--ci-border)]" />
      {label}
    </label>
  );
}
