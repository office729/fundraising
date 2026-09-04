"use client";

import { useState } from "react";

import { addDonatorManual } from "../lib/local-store";
import type { Donator } from "../mock";
import { Button } from "./ui/button";
import { Dialog } from "./ui/dialog";
import { Input, Label, Select } from "./ui/input";

const RESPONSABILI = ["Andreea Vasilescu", "Vlad Placintă", "Ioana Mureșan"];

export function AddDonorDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (donator: Donator) => void;
}) {
  const [nume, setNume] = useState("");
  const [email, setEmail] = useState("");
  const [telefon, setTelefon] = useState("");
  const [localitate, setLocalitate] = useState("");
  const [responsabil, setResponsabil] = useState(RESPONSABILI[0]);

  function reset() {
    setNume("");
    setEmail("");
    setTelefon("");
    setLocalitate("");
    setResponsabil(RESPONSABILI[0]);
  }

  function inchide() {
    reset();
    onClose();
  }

  function salveaza() {
    if (!nume.trim()) return;
    // Consimțământul GDPR nu se setează manual aici — vine din donație
    // (bifa donatorului la plată), nu e o alegere a echipei la adăugarea donatorului.
    const donator = addDonatorManual({
      nume: nume.trim(),
      email: email.trim(),
      telefon: telefon.trim(),
      localitate: localitate.trim(),
      responsabil,
      consimtamant: "necunoscut",
    });
    reset();
    onClose();
    onCreated(donator);
  }

  return (
    <Dialog open={open} onClose={inchide} title="Donator nou" width="max-w-sm">
      <div className="space-y-3">
        <div>
          <Label>Nume</Label>
          <Input autoFocus value={nume} onChange={(e) => setNume(e.target.value)} placeholder="Nume și prenume" />
        </div>
        <div>
          <Label>Email</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemplu.ro" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label>Telefon</Label>
            <Input value={telefon} onChange={(e) => setTelefon(e.target.value)} placeholder="07xx xxx xxx" />
          </div>
          <div>
            <Label>Localitate</Label>
            <Input value={localitate} onChange={(e) => setLocalitate(e.target.value)} placeholder="Oraș" />
          </div>
        </div>
        <div>
          <Label>Responsabil</Label>
          <Select value={responsabil} onChange={(e) => setResponsabil(e.target.value)}>
            {RESPONSABILI.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </Select>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={inchide}>Anulează</Button>
          <Button variant="primary" onClick={salveaza} disabled={!nume.trim()}>Salvează</Button>
        </div>
      </div>
    </Dialog>
  );
}
