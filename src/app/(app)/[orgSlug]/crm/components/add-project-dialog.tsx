"use client";

import { useState } from "react";

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
    <Dialog open={open} onClose={inchide} title="Proiect nou" width="max-w-sm">
      <div className="space-y-3">
        <div>
          <Label>Nume proiect</Label>
          <Input autoFocus value={nume} onChange={(e) => setNume(e.target.value)} placeholder="ex. Ajutor pentru Maria" />
        </div>
        <div>
          <Label>Descriere proiect</Label>
          <Textarea value={descriere} onChange={(e) => setDescriere(e.target.value)} rows={3} placeholder="Despre ce e vorba, cine e beneficiarul…" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label>Obiectiv proiect</Label>
            <Input type="number" min="0" step="1" value={obiectiv} onChange={(e) => setObiectiv(e.target.value)} placeholder="ex. 50000" />
          </div>
          <div>
            <Label>Sumă strânsă</Label>
            <Input type="number" min="0" step="1" value={sumaStransa} onChange={(e) => setSumaStransa(e.target.value)} placeholder="0" />
          </div>
        </div>
        <div>
          <Label>Localitate (opțional)</Label>
          <Input value={localitate} onChange={(e) => setLocalitate(e.target.value)} placeholder="Oraș" />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={inchide}>Anulează</Button>
          <Button variant="primary" onClick={salveaza} disabled={!nume.trim() || !obiectiv}>Salvează</Button>
        </div>
      </div>
    </Dialog>
  );
}
