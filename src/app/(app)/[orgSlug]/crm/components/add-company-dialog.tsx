"use client";

import { Heart } from "lucide-react";
import { useState } from "react";

import { addCompanieManual, addContactCompanie } from "../lib/local-store";
import type { Companie } from "../mock";
import { POZITII_CONTACT } from "../mock";
import { Button } from "./ui/button";
import { Dialog } from "./ui/dialog";
import { Input, Label, Select } from "./ui/input";

const RESPONSABILI = ["Andreea Vasilescu", "Vlad Placintă", "Ioana Mureșan"];

export function AddCompanyDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (companie: Companie) => void;
}) {
  const [nume, setNume] = useState("");
  const [cui, setCui] = useState("");
  const [industrie, setIndustrie] = useState("");
  const [judet, setJudet] = useState("");
  const [localitate, setLocalitate] = useState("");
  const [responsabil, setResponsabil] = useState(RESPONSABILI[0]);

  const [pozitii, setPozitii] = useState<string[]>([]);
  const [functieContact, setFunctieContact] = useState("");
  const [numeContact, setNumeContact] = useState("");
  const [telefonContact, setTelefonContact] = useState("");
  const [emailContact, setEmailContact] = useState("");
  const [facebookContact, setFacebookContact] = useState("");
  const [linkedinContact, setLinkedinContact] = useState("");
  const [dataPropunerii, setDataPropunerii] = useState("");
  const [prioritar, setPrioritar] = useState(false);

  function reset() {
    setNume("");
    setCui("");
    setIndustrie("");
    setJudet("");
    setLocalitate("");
    setResponsabil(RESPONSABILI[0]);
    setPozitii([]);
    setFunctieContact("");
    setNumeContact("");
    setTelefonContact("");
    setEmailContact("");
    setFacebookContact("");
    setLinkedinContact("");
    setDataPropunerii("");
    setPrioritar(false);
  }

  function inchide() {
    reset();
    onClose();
  }

  function togglePozitie(p: string) {
    setPozitii((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]));
  }

  function salveaza() {
    if (!nume.trim()) return;
    const companie = addCompanieManual({
      nume: nume.trim(),
      cui: cui.trim(),
      industrie: industrie.trim(),
      judet: judet.trim(),
      localitate: localitate.trim(),
      responsabil,
    });
    if (numeContact.trim()) {
      addContactCompanie(companie.id, {
        nume: numeContact.trim(),
        pozitii,
        functie: functieContact.trim(),
        telefon: telefonContact.trim(),
        email: emailContact.trim(),
        facebook: facebookContact.trim(),
        linkedin: linkedinContact.trim(),
        website: "",
        dataPropunerii,
        prioritar,
      });
    }
    reset();
    onClose();
    onCreated(companie);
  }

  return (
    <Dialog open={open} onClose={inchide} title="Companie nouă" width="max-w-lg">
      <div className="space-y-3">
        <div>
          <Label>Nume companie</Label>
          <Input autoFocus value={nume} onChange={(e) => setNume(e.target.value)} placeholder="ex. Tehno Soluții SRL" />
        </div>
        <div>
          <Label>CUI</Label>
          <Input value={cui} onChange={(e) => setCui(e.target.value)} placeholder="RO12345678" />
        </div>
        <div>
          <Label>Industrie</Label>
          <Input value={industrie} onChange={(e) => setIndustrie(e.target.value)} placeholder="ex. IT & Software" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label>Județ</Label>
            <Input value={judet} onChange={(e) => setJudet(e.target.value)} placeholder="ex. Cluj" />
          </div>
          <div>
            <Label>Localitate</Label>
            <Input value={localitate} onChange={(e) => setLocalitate(e.target.value)} placeholder="ex. Cluj-Napoca" />
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

        <div className="border-t border-[var(--ci-border)] pt-3">
          <p className="mb-2.5 text-[13px] font-semibold text-[var(--ci-text)]">Persoană de contact (opțional)</p>

          <div className="space-y-3">
            <div>
              <Label>Poziția (bifează una sau mai multe)</Label>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                {POZITII_CONTACT.map((p) => (
                  <label key={p} className="flex items-center gap-1.5 rounded-lg border border-[var(--ci-border)] px-2 py-1.5 text-[11px] font-medium text-[var(--ci-text)]">
                    <input type="checkbox" checked={pozitii.includes(p)} onChange={() => togglePozitie(p)} className="h-3.5 w-3.5 rounded border-[var(--ci-border)]" />
                    {p}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <Label>Funcție (text liber, dacă nu e în listă)</Label>
              <Input value={functieContact} onChange={(e) => setFunctieContact(e.target.value)} placeholder="ex. Chief Sustainability Officer" />
            </div>
            <div>
              <Label>Nume și prenume</Label>
              <Input value={numeContact} onChange={(e) => setNumeContact(e.target.value)} placeholder="ex. Mihaela Ciotlaus" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Telefon</Label>
                <Input value={telefonContact} onChange={(e) => setTelefonContact(e.target.value)} placeholder="+40..." />
              </div>
              <div>
                <Label>Adresă email</Label>
                <Input type="email" value={emailContact} onChange={(e) => setEmailContact(e.target.value)} placeholder="nume@firma.ro" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Facebook (opțional)</Label>
                <Input value={facebookContact} onChange={(e) => setFacebookContact(e.target.value)} placeholder="link profil / pagină" />
              </div>
              <div>
                <Label>LinkedIn</Label>
                <Input value={linkedinContact} onChange={(e) => setLinkedinContact(e.target.value)} placeholder="link profil LinkedIn" />
              </div>
            </div>
            <div>
              <Label>Data propunerii</Label>
              <Input type="date" value={dataPropunerii} onChange={(e) => setDataPropunerii(e.target.value)} />
            </div>

            <label className="flex items-center gap-2 rounded-lg border border-[var(--ci-border)] px-3 py-2.5 text-[13px] font-medium text-[var(--ci-primary)]">
              <input type="checkbox" checked={prioritar} onChange={(e) => setPrioritar(e.target.checked)} className="h-4 w-4 rounded border-[var(--ci-border)]" />
              <Heart className="h-3.5 w-3.5" fill={prioritar ? "var(--ci-primary)" : "none"} />
              Contact prioritar / om direct de contact
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={inchide}>Anulează</Button>
          <Button variant="primary" onClick={salveaza} disabled={!nume.trim()}>Salvează</Button>
        </div>
      </div>
    </Dialog>
  );
}
