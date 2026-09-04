"use client";

import { AlertCircle, FileSpreadsheet, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { addImportedCompanii, addImportedDonatori, MAX_IMPORT_ROWS } from "../lib/local-store";
import { parseImportFile } from "../lib/import-parse";
import {
  guessCompanieMapping,
  guessDonatorMapping,
  normalizeCompanieRow,
  normalizeDonatorRow,
  type ColumnMapping,
} from "../lib/normalize-import";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Dialog } from "./ui/dialog";
import { Label, Select } from "./ui/input";

type Tip = "donatori" | "companii";

const TIP_LABEL: Record<Tip, string> = {
  donatori: "Persoane fizice (donatori)",
  companii: "Persoane juridice (companii)",
};

// Etichetele coloanelor mapabile manual, în ordinea afișată — "nume" e
// singura obligatorie, restul sunt opționale (rămân goale/implicite dacă
// fișierul nu le are).
const FIELD_LABELS: Record<Tip, { key: string; label: string; required?: boolean }[]> = {
  donatori: [
    { key: "nume", label: "Nume", required: true },
    { key: "email", label: "Email" },
    { key: "telefon", label: "Telefon" },
    { key: "localitate", label: "Localitate" },
    { key: "totalDonat", label: "Total donat" },
    { key: "responsabil", label: "Responsabil" },
    { key: "consimtamant", label: "Consimțământ GDPR" },
  ],
  companii: [
    { key: "nume", label: "Nume companie", required: true },
    { key: "cui", label: "CUI" },
    { key: "industrie", label: "Industrie" },
    { key: "judet", label: "Județ" },
    { key: "localitate", label: "Localitate" },
    { key: "sumaSponsorizata", label: "Sumă sponsorizată" },
    { key: "responsabil", label: "Responsabil" },
  ],
};

// Tipul e FIX pentru toată durata dialogului, ales din meniul „Adaugă" —
// nu mai există un dropdown de schimbat pe parcurs, ca să nu se poată
// importa din greșeală un fișier de companii peste lista de persoane fizice
// (sau invers) doar pentru că cineva a uitat să comute selectorul.
export function ImportDialog({ open, onClose, tip }: { open: boolean; onClose: () => void; tip: Tip }) {
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [eroare, setEroare] = useState("");
  const [seParseaza, setSeParseaza] = useState(false);
  const [importat, setImportat] = useState<number | null>(null);
  const [previzualizareImportata, setPrevizualizareImportata] = useState<{ nume: string }[]>([]);
  const [rezultatEroare, setRezultatEroare] = useState("");
  const [trunchiat, setTrunchiat] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) reset();
  }, [open, tip]);

  function reset() {
    setFileName("");
    setRows([]);
    setMapping({});
    setEroare("");
    setImportat(null);
    setPrevizualizareImportata([]);
    setRezultatEroare("");
    setTrunchiat(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function onFile(file: File) {
    setEroare("");
    setImportat(null);
    setFileName(file.name);
    setSeParseaza(true);
    try {
      const parsed = await parseImportFile(file, tip === "donatori");
      if (parsed.length === 0) {
        setEroare("Nu am găsit rânduri de date în fișier — verifică formatul (CSV/Excel/JSON, cu antet pe primul rând).");
        setRows([]);
      } else if (Object.keys(parsed[0]).length <= 1 && parsed.some((r) => Object.values(r)[0]?.includes(","))) {
        setEroare("Fișierul pare să aibă o singură coloană cu totul înghesuit — verifică separatorul folosit (virgulă, punct și virgulă sau tab) și reîncarcă fișierul.");
        setRows([]);
      } else {
        setRows(parsed);
        setMapping(tip === "donatori" ? guessDonatorMapping(parsed[0]) : guessCompanieMapping(parsed[0]));
        if (parsed.length > MAX_IMPORT_ROWS) {
          setEroare(
            `Fișierul are ${parsed.length.toLocaleString("ro-RO")} rânduri — acest prototip ține datele în browser (localStorage) și suportă cel mult ${MAX_IMPORT_ROWS.toLocaleString("ro-RO")} rânduri importate. Vor fi păstrate doar primele ${MAX_IMPORT_ROWS.toLocaleString("ro-RO")}.`,
          );
        }
      }
    } catch {
      setEroare(
        tip === "donatori"
          ? "Fișierul nu a putut fi citit. Formate acceptate: CSV/TSV, Excel (.xlsx/.xls), OpenDocument (.ods), JSON, contacte (.vcf)."
          : "Fișierul nu a putut fi citit. Formate acceptate: CSV/TSV, Excel (.xlsx/.xls), OpenDocument (.ods), JSON.",
      );
      setRows([]);
    } finally {
      setSeParseaza(false);
    }
  }

  function confirma() {
    const importate = rows.length;
    let ok: boolean;
    let trunchiatRez: boolean;
    let exemple: { nume: string }[];
    if (tip === "donatori") {
      const normalizate = rows.map((r) => normalizeDonatorRow(r, mapping));
      const rezultat = addImportedDonatori(normalizate);
      ok = rezultat.ok;
      trunchiatRez = rezultat.trunchiat;
      exemple = normalizate.slice(0, 3).map((r) => ({ nume: r.nume }));
    } else {
      const normalizate = rows.map((r) => normalizeCompanieRow(r, mapping));
      const rezultat = addImportedCompanii(normalizate);
      ok = rezultat.ok;
      trunchiatRez = rezultat.trunchiat;
      exemple = normalizate.slice(0, 3).map((r) => ({ nume: r.nume }));
    }
    if (!ok) {
      setRezultatEroare(
        "Spațiul de stocare al browser-ului (localStorage) e plin — importul NU s-a salvat. Șterge mai întâi datele importate anterior (din Instrumente → Date importate) și încearcă din nou cu un fișier mai mic.",
      );
      return;
    }
    setTrunchiat(trunchiatRez);
    setPrevizualizareImportata(exemple);
    setImportat(importate);
    setRows([]);
  }

  function inchide() {
    reset();
    onClose();
  }

  const coloaneFisier = rows[0] ? Object.keys(rows[0]) : [];
  const coloanePreview = coloaneFisier.slice(0, 5);
  const campuri = FIELD_LABELS[tip];
  const numeMapat = !!mapping.nume;

  return (
    <Dialog open={open} onClose={inchide} title={`Importă ${TIP_LABEL[tip].toLowerCase()}`} width="max-w-lg">
      <div className="space-y-4">
        <Badge tone={tip === "donatori" ? "blue" : "green"}>{TIP_LABEL[tip]}</Badge>

        {importat === null && (
          <div>
            <p className="mb-1.5 text-[13px] font-medium text-[var(--ci-text)]">Fișier</p>
            <button
              onClick={() => inputRef.current?.click()}
              className="flex w-full flex-col items-center gap-2 rounded-lg border-2 border-dashed border-[var(--ci-border)] px-4 py-8 text-center transition-colors hover:border-[var(--ci-primary)] hover:bg-[var(--ci-primary-soft)]"
            >
              <Upload className="h-5 w-5 text-[var(--ci-text-faint)]" />
              <span className="text-[13px] font-medium text-[var(--ci-text)]">
                {fileName || "Alege un fișier — orice format"}
              </span>
              <span className="text-[12px] text-[var(--ci-text-faint)]">
                {tip === "donatori"
                  ? ".csv, .xlsx, .xls, .ods, .json, .tsv, .txt sau contacte .vcf — se convertesc automat"
                  : ".csv, .xlsx, .xls, .ods, .json, .tsv, .txt — se convertesc automat"}
              </span>
            </button>
            <input
              ref={inputRef}
              type="file"
              accept={tip === "donatori" ? ".csv,.xlsx,.xls,.ods,.json,.tsv,.txt,.vcf,.vcard" : ".csv,.xlsx,.xls,.ods,.json,.tsv,.txt"}
              className="hidden"
              onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
            />
          </div>
        )}

        {seParseaza && <p className="text-[13px] text-[var(--ci-text-muted)]">Se citește fișierul…</p>}

        {eroare && (
          <div className="flex items-start gap-2 rounded-lg bg-[var(--ci-red-soft)] px-3.5 py-2.5 text-[13px] text-[var(--ci-red)]">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {eroare}
          </div>
        )}

        {rows.length > 0 && (
          <div className="space-y-4">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-[var(--ci-green)]" />
                <p className="text-[13px] font-medium text-[var(--ci-text)]">
                  {rows.length} {rows.length === 1 ? "rând găsit" : "rânduri găsite"} · {coloaneFisier.length} coloane
                </p>
              </div>
              <div className="ci-scrollbar overflow-x-auto rounded-lg border border-[var(--ci-border)]">
                <table className="w-full border-collapse text-[12px]">
                  <thead>
                    <tr className="bg-[var(--ci-surface-2)] text-left text-[var(--ci-text-muted)]">
                      {coloanePreview.map((c) => (
                        <th key={c} className="px-2.5 py-1.5 font-semibold whitespace-nowrap">{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 3).map((r, i) => (
                      <tr key={i} className="border-t border-[var(--ci-border)]">
                        {coloanePreview.map((c) => (
                          <td key={c} className="px-2.5 py-1.5 whitespace-nowrap text-[var(--ci-text)]">{r[c] || "—"}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <p className="mb-2 text-[13px] font-semibold text-[var(--ci-text)]">Ce înseamnă fiecare coloană?</p>
              <p className="mb-2.5 text-[12px] text-[var(--ci-text-faint)]">
                Am ghicit automat potrivirile de mai jos din antetul fișierului — corectează-le dacă nu sunt bune.
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                {campuri.map((f) => {
                  const valoareExemplu = mapping[f.key] ? rows[0]?.[mapping[f.key] as string] : "";
                  return (
                    <div key={f.key}>
                      <Label>{f.label}{f.required && " *"}</Label>
                      <Select
                        value={mapping[f.key] ?? ""}
                        onChange={(e) => setMapping((m) => ({ ...m, [f.key]: e.target.value }))}
                      >
                        <option value="">— nicio coloană —</option>
                        {coloaneFisier.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </Select>
                      <p className="mt-1 truncate text-[11px] text-[var(--ci-text-faint)]">
                        {valoareExemplu ? `Exemplu: ${valoareExemplu}` : " "}
                      </p>
                    </div>
                  );
                })}
              </div>
              {!numeMapat && (
                <div className="mt-1 flex items-start gap-2 rounded-lg bg-[var(--ci-red-soft)] px-3.5 py-2.5 text-[13px] text-[var(--ci-red)]">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  Selectează coloana cu numele mai sus — fără ea nu poți importa (rândurile ar fi toate nume identice, ca data trecută).
                </div>
              )}
            </div>
          </div>
        )}

        {rezultatEroare && (
          <div className="flex items-start gap-2 rounded-lg bg-[var(--ci-red-soft)] px-3.5 py-2.5 text-[13px] text-[var(--ci-red)]">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {rezultatEroare}
          </div>
        )}

        {importat !== null && (
          <div className="space-y-2 rounded-lg bg-[var(--ci-green-soft)] px-3.5 py-2.5 text-[13px] text-[var(--ci-green)]">
            <p className="font-medium">
              {importat} {tip === "donatori" ? "donatori adăugați" : "companii adăugate"} — le vezi în listă.
            </p>
            {previzualizareImportata.length > 0 && (
              <p className="text-[12px] opacity-90">
                Exemplu chiar din acest import: {previzualizareImportata.map((r) => r.nume).join(" · ")}
              </p>
            )}
            {trunchiat && (
              <p className="text-[12px] text-[var(--ci-amber)]">
                Fișierul avea mai multe rânduri decât limita de {MAX_IMPORT_ROWS.toLocaleString("ro-RO")} pentru acest prototip
                (localStorage din browser) — s-au păstrat doar primele {MAX_IMPORT_ROWS.toLocaleString("ro-RO")}.
              </p>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 border-t border-[var(--ci-border)] pt-3">
          <Button variant="secondary" onClick={inchide}>{importat !== null ? "Închide" : "Anulează"}</Button>
          {rows.length > 0 && importat === null && (
            <Button variant="primary" onClick={confirma} disabled={!numeMapat}>Importă {rows.length} rânduri</Button>
          )}
        </div>
      </div>
    </Dialog>
  );
}
