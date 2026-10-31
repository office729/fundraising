"use client";

import { useState } from "react";

import { COMPONENTE_UI_DICT } from "@/lib/i18n/dictionaries/componente-ui";

import { useLocale } from "../lib/locale-context";
import { addBeneficiarManual } from "../lib/local-store";
import type { Beneficiar } from "../mock";
import { Button } from "./ui/button";
import { Dialog } from "./ui/dialog";
import { Input, Label, Textarea } from "./ui/input";

export function AddProjectDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (beneficiar: Beneficiar) => void;
}) {
  const t = COMPONENTE_UI_DICT[useLocale()];
  const a = t.addProject;
  const [nume, setNume] = useState("");
  const [obiectiv, setObiectiv] = useState("");
  const [descriere, setDescriere] = useState("");
  const [sumaStransa, setSumaStransa] = useState("");
  const [localitate, setLocalitate] = useState("");

  function reset() {
    setNume("");
    setObiectiv("");
    setDescriere("");
    setSumaStransa("");
    setLocalitate("");
  }

  function inchide() {
    reset();
    onClose();
  }

  function salveaza() {
    const obiectivVal = Number(obiectiv.replace(",", "."));
    if (!nume.trim() || !obiectivVal || obiectivVal <= 0) return;
    const beneficiar = addBeneficiarManual({
      nume: nume.trim(),
      obiectiv: obiectivVal,
      descriere: descriere.trim(),
      sumaStransa: Number(sumaStransa.replace(",", ".")) || 0,
      localitate: localitate.trim(),
    });
    reset();
    onClose();
    onCreated(beneficiar);
  }

  return (
    <Dialog open={open} onClose={inchide} title={a.titlu} width="max-w-sm">
      <div className="space-y-3">
        <div>
          <Label>{a.nume}</Label>
          <Input autoFocus value={nume} onChange={(e) => setNume(e.target.value)} placeholder={a.numePh} />
        </div>
        <div>
          <Label>{a.descriere}</Label>
          <Textarea value={descriere} onChange={(e) => setDescriere(e.target.value)} rows={3} placeholder={a.descrierePh} />
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div>
            <Label>{a.obiectiv}</Label>
            <Input type="number" min="0" step="1" value={obiectiv} onChange={(e) => setObiectiv(e.target.value)} placeholder={a.obiectivPh} />
          </div>
          <div>
            <Label>{a.sumaStransa}</Label>
            <Input type="number" min="0" step="1" value={sumaStransa} onChange={(e) => setSumaStransa(e.target.value)} placeholder="0" />
          </div>
        </div>
        <div>
          <Label>{a.localitate}</Label>
          <Input value={localitate} onChange={(e) => setLocalitate(e.target.value)} placeholder={a.localitatePh} />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={inchide}>{t.comun.anuleaza}</Button>
          <Button variant="primary" onClick={salveaza} disabled={!nume.trim() || !obiectiv}>{t.comun.salveaza}</Button>
        </div>
      </div>
    </Dialog>
  );
}
