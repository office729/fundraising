"use client";

import { AlertCircle, Upload } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "../components/ui/button";
import { Dialog } from "../components/ui/dialog";
import { Input, Label, Select } from "../components/ui/input";
import { addDocumentLocal, type DocumentLocal } from "../lib/local-store";
import { useCompanii, useDonatori } from "../lib/use-data";
import { useLocale } from "../lib/locale-context";
import { DOCUMENTE_DICT } from "@/lib/i18n/dictionaries/documente";

const MAX_BYTES = 3 * 1024 * 1024; // 3 MB — localStorage nu ține fișiere mari

export function UploadDocumentDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const COMPANII = useCompanii();
  const DONATORI = useDonatori();
  const locale = useLocale();
  const dict = DOCUMENTE_DICT[locale].dialog;
  const TIP_LABEL = dict.tipLabel;
  const [nume, setNume] = useState("");
  const [tip, setTip] = useState<DocumentLocal["tip"]>("altul");
  const [legatDeTip, setLegatDeTip] = useState<"companie" | "donator">("companie");
  const [legatDeId, setLegatDeId] = useState("");
  const [fisier, setFisier] = useState<File | null>(null);
  const [eroare, setEroare] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const optiuni = legatDeTip === "companie" ? COMPANII : DONATORI;

  function reset() {
    setNume("");
    setTip("altul");
    setLegatDeTip("companie");
    setLegatDeId("");
    setFisier(null);
    setEroare("");
    if (inputRef.current) inputRef.current.value = "";
  }

  function inchide() {
    reset();
    onClose();
  }

  function onFile(f: File) {
    setEroare("");
    if (f.size > MAX_BYTES) {
      setEroare(dict.eroareMarime);
      setFisier(null);
      return;
    }
    setFisier(f);
    if (!nume.trim()) setNume(f.name.replace(/\.[^.]+$/, ""));
  }

  function salveaza() {
    const entitate = optiuni.find((o) => o.id === legatDeId);
    if (!fisier || !nume.trim() || !entitate) return;
    const reader = new FileReader();
    reader.onload = () => {
      addDocumentLocal({
        nume: nume.trim(),
        tip,
        legatDe: { tip: legatDeTip, id: entitate.id, nume: entitate.nume },
        fisierTip: fisier.type,
        fisierData: String(reader.result),
      });
      inchide();
    };
    reader.onerror = () => setEroare(dict.eroareCitire);
    reader.readAsDataURL(fisier);
  }

  const entitateValida = optiuni.some((o) => o.id === legatDeId);

  return (
    <Dialog open={open} onClose={inchide} title={dict.title} width="max-w-sm">
      <div className="space-y-3">
        <div>
          <Label>{dict.numeDocument}</Label>
          <Input value={nume} onChange={(e) => setNume(e.target.value)} placeholder={dict.numeDocumentPlaceholder} />
        </div>
        <div>
          <Label>{dict.tip}</Label>
          <Select value={tip} onChange={(e) => setTip(e.target.value as DocumentLocal["tip"])}>
            {(Object.keys(TIP_LABEL) as DocumentLocal["tip"][]).map((t) => (
              <option key={t} value={t}>{TIP_LABEL[t]}</option>
            ))}
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label>{dict.legatDe}</Label>
            <Select
              value={legatDeTip}
              onChange={(e) => {
                setLegatDeTip(e.target.value as "companie" | "donator");
                setLegatDeId("");
              }}
            >
              <option value="companie">{dict.companie}</option>
              <option value="donator">{dict.persoanaFizica}</option>
            </Select>
          </div>
          <div>
            <Label>{legatDeTip === "companie" ? dict.companie : dict.persoanaFizica}</Label>
            <Select value={legatDeId} onChange={(e) => setLegatDeId(e.target.value)}>
              <option value="">{legatDeTip === "companie" ? dict.alegeCompania : dict.aleteDonatorul}</option>
              {optiuni.map((o) => (
                <option key={o.id} value={o.id}>{o.nume}</option>
              ))}
            </Select>
          </div>
        </div>

        <div>
          <Label>{dict.fisier}</Label>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex w-full flex-col items-center gap-2 rounded-lg border-2 border-dashed border-[var(--ci-border)] px-4 py-6 text-center transition-colors hover:border-[var(--ci-primary)] hover:bg-[var(--ci-primary-soft)]"
          >
            <Upload className="h-5 w-5 text-[var(--ci-text-faint)]" />
            <span className="text-[13px] font-medium text-[var(--ci-text)]">{fisier ? fisier.name : dict.alegeFisier}</span>
          </button>
          <input ref={inputRef} type="file" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
        </div>

        {eroare && (
          <div className="flex items-start gap-2 rounded-lg bg-[var(--ci-red-soft)] px-3.5 py-2.5 text-[13px] text-[var(--ci-red)]">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {eroare}
          </div>
        )}

        <div className="flex justify-end gap-2 border-t border-[var(--ci-border)] pt-3">
          <Button variant="secondary" onClick={inchide}>{dict.anuleaza}</Button>
          <Button variant="primary" onClick={salveaza} disabled={!fisier || !nume.trim() || !entitateValida}>
            {dict.incarca}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
