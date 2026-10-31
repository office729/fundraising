"use client";

import { AlertCircle, FileSpreadsheet, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { COMPONENTE_UI_DICT } from "@/lib/i18n/dictionaries/componente-ui";

import { useLocale } from "../lib/locale-context";
import { addImportedCompanii, addImportedDonatori, MAX_IMPORT_ROWS } from "../lib/local-store";
import { parseImportFile } from "../lib/import-parse";
import {
  guessCompanieMapping,
  guessDonatorMapping,
  normalizeCompanieRow,
  normalizeDonatorRow,
  type ColumnMapping,
} from "../lib/normalize-import";
import { DemoBanner } from "./demo-banner";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Dialog } from "./ui/dialog";
import { Label, Select } from "./ui/input";

type Tip = "donatori" | "companii";

// Câte rânduri randăm în previzualizare (restul se importă la fel, doar nu se afișează toate).
const PREVIEW_MAX_ROWS = 200;

// Cheile coloanelor mapabile manual, în ordinea afișată — "nume" e singura obligatorie, restul sunt opționale (rămân goale/implicite
// dacă fișierul nu le are). Etichetele vin din dicționar (COMPONENTE_UI_DICT.import.campuri).
const FIELD_KEYS: Record<Tip, { key: string; required?: boolean }[]> = {
  donatori: [{ key: "nume", required: true }, { key: "email" }, { key: "telefon" }, { key: "localitate" }, { key: "totalDonat" }, { key: "responsabil" }, { key: "consimtamant" }],
  companii: [{ key: "nume", required: true }, { key: "cui" }, { key: "industrie" }, { key: "judet" }, { key: "localitate" }, { key: "sumaSponsorizata" }, { key: "responsabil" }],
};

// Tipul e FIX pentru toată durata dialogului, ales din meniul „Adaugă" —
// nu mai există un dropdown de schimbat pe parcurs, ca să nu se poată
// importa din greșeală un fișier de companii peste lista de persoane fizice
// (sau invers) doar pentru că cineva a uitat să comute selectorul.
export function ImportDialog({ open, onClose, tip }: { open: boolean; onClose: () => void; tip: Tip }) {
  const locale = useLocale();
  const t = COMPONENTE_UI_DICT[locale];
  const d = t.import;
  const nrLocale = locale === "ro" ? "ro-RO" : "en-GB";
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
        setEroare(d.faraRanduri);
        setRows([]);
      } else if (Object.keys(parsed[0]).length <= 1 && parsed.some((r) => Object.values(r)[0]?.includes(","))) {
        setEroare(d.oSinguraColoana);
        setRows([]);
      } else {
        setRows(parsed);
        setMapping(tip === "donatori" ? guessDonatorMapping(parsed[0]) : guessCompanieMapping(parsed[0]));
        if (parsed.length > MAX_IMPORT_ROWS) {
          setEroare(d.depasireLimita(parsed.length.toLocaleString(nrLocale), MAX_IMPORT_ROWS.toLocaleString(nrLocale)));
        }
      }
    } catch {
      setEroare(tip === "donatori" ? d.necitibilPf : d.necitibilPj);
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
      setRezultatEroare(d.stocarePlina);
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
  // Previzualizarea arată TOATE coloanele și rândurile (cu derulare); doar la fișiere foarte mari afișăm primele PREVIEW_MAX_ROWS.
  const coloanePreview = coloaneFisier;
  const preview = rows.slice(0, PREVIEW_MAX_ROWS);
  const campuri = FIELD_KEYS[tip];
  const numeMapat = !!mapping.nume;

  return (
    <Dialog open={open} onClose={inchide} title={d.titlu(d.tipuri[tip].toLowerCase())} width="max-w-lg">
      <div className="space-y-4">
        <Badge tone={tip === "donatori" ? "blue" : "green"}>{d.tipuri[tip]}</Badge>
        <DemoBanner>{d.demo}</DemoBanner>

        {importat === null && (
          <div>
            <p className="mb-1.5 text-[13px] font-medium text-[var(--ci-text)]">{d.fisier}</p>
            <button
              onClick={() => inputRef.current?.click()}
              className="flex w-full flex-col items-center gap-2 rounded-[var(--ci-radius-btn)] border-2 border-dashed border-[var(--ci-border)] px-4 py-8 text-center transition-colors hover:border-[var(--ci-primary)] hover:bg-[var(--ci-primary-soft)]"
            >
              <Upload className="h-5 w-5 text-[var(--ci-text-faint)]" />
              <span className="text-[13px] font-medium text-[var(--ci-text)]">
                {fileName || d.alegeFisier}
              </span>
              <span className="text-[12px] text-[var(--ci-text-faint)]">
                {tip === "donatori" ? d.formatePf : d.formatePj}
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

        {seParseaza && <p className="text-[13px] text-[var(--ci-text-muted)]">{d.seCiteste}</p>}

        {eroare && (
          <div className="flex items-start gap-2 rounded-[var(--ci-radius-card)] bg-[var(--ci-red-soft)] px-3.5 py-2.5 text-[13px] text-[var(--ci-red)]">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {eroare}
          </div>
        )}

        {rows.length > 0 && (
          <div className="space-y-4">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-[var(--ci-green)]" />
                <p className="text-[13px] font-medium text-[var(--ci-text)]">
                  {d.randuriGasite(rows.length, coloaneFisier.length)}
                </p>
              </div>
              <div className="ci-scrollbar max-h-72 overflow-auto rounded-[var(--ci-radius-card)] border border-[var(--ci-border)]">
                <table className="w-full border-collapse text-[12px]">
                  <thead className="sticky top-0 z-10">
                    <tr className="text-left text-[var(--ci-text-muted)]">
                      {coloanePreview.map((c) => (
                        <th key={c} className="bg-[var(--ci-surface-2)] px-2.5 py-1.5 font-semibold whitespace-nowrap">{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((r, i) => (
                      <tr key={i} className="border-t border-[var(--ci-border)]">
                        {coloanePreview.map((c) => (
                          <td key={c} className="px-2.5 py-1.5 whitespace-nowrap text-[var(--ci-text)]">{r[c] || "—"}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {rows.length > PREVIEW_MAX_ROWS && (
                <p className="mt-1.5 text-[12px] text-[var(--ci-text-faint)]">{d.primele(PREVIEW_MAX_ROWS, rows.length)}</p>
              )}
            </div>

            <div>
              <p className="mb-2 text-[13px] font-semibold text-[var(--ci-text)]">{d.ceInseamna}</p>
              <p className="mb-2.5 text-[12px] text-[var(--ci-text-faint)]">{d.ghicit}</p>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {campuri.map((f) => {
                  const valoareExemplu = mapping[f.key] ? rows[0]?.[mapping[f.key] as string] : "";
                  return (
                    <div key={f.key}>
                      <Label>{d.campuri[tip][f.key]}{f.required && " *"}</Label>
                      <Select
                        value={mapping[f.key] ?? ""}
                        onChange={(e) => setMapping((m) => ({ ...m, [f.key]: e.target.value }))}
                      >
                        <option value="">{d.nicioColoana}</option>
                        {coloaneFisier.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </Select>
                      <p className="mt-1 truncate text-[11px] text-[var(--ci-text-faint)]">
                        {valoareExemplu ? d.exemplu(valoareExemplu) : " "}
                      </p>
                    </div>
                  );
                })}
              </div>
              {!numeMapat && (
                <div className="mt-1 flex items-start gap-2 rounded-[var(--ci-radius-card)] bg-[var(--ci-red-soft)] px-3.5 py-2.5 text-[13px] text-[var(--ci-red)]">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  {d.lipsesteNume}
                </div>
              )}
            </div>
          </div>
        )}

        {rezultatEroare && (
          <div className="flex items-start gap-2 rounded-[var(--ci-radius-card)] bg-[var(--ci-red-soft)] px-3.5 py-2.5 text-[13px] text-[var(--ci-red)]">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {rezultatEroare}
          </div>
        )}

        {importat !== null && (
          <div className="space-y-2 rounded-[var(--ci-radius-card)] bg-[var(--ci-green-soft)] px-3.5 py-2.5 text-[13px] text-[var(--ci-green)]">
            <p className="font-medium">
              {d.adaugati(importat, tip)}
            </p>
            {previzualizareImportata.length > 0 && (
              <p className="text-[12px] opacity-90">
                {d.exempluImport(previzualizareImportata.map((r) => r.nume).join(" · "))}
              </p>
            )}
            {trunchiat && (
              <p className="text-[12px] text-[var(--ci-amber)]">
                {d.trunchiat(MAX_IMPORT_ROWS.toLocaleString(nrLocale))}
              </p>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 border-t border-[var(--ci-border)] pt-3">
          <Button variant="secondary" onClick={inchide}>{importat !== null ? t.comun.inchide : t.comun.anuleaza}</Button>
          {rows.length > 0 && importat === null && (
            <Button variant="primary" onClick={confirma} disabled={!numeMapat}>{d.importa(rows.length)}</Button>
          )}
        </div>
      </div>
    </Dialog>
  );
}
