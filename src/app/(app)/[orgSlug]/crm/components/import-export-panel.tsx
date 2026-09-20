"use client";

import { Download, Trash2, Upload } from "lucide-react";
import { useState } from "react";

import { INSTRUMENTE_DICT } from "@/lib/i18n/dictionaries/instrumente";

import { downloadCsv, toCsv } from "../lib/export-csv";
import { useLocale } from "../lib/locale-context";
import {
  clearImportedCompanii,
  clearImportedDonatori,
  clearLastImportCompanii,
  clearLastImportDonatori,
  getImportBatchesCompanii,
  getImportBatchesDonatori,
  getImportedCompanii,
  getImportedDonatori,
  useLocalStoreValue,
} from "../lib/local-store";
import { useCompanii, useDonatori } from "../lib/use-data";
import { ImportDialog } from "./import-dialog";
import { Button } from "./ui/button";
import { Card, CardHeader } from "./ui/card";
import { Dialog } from "./ui/dialog";

const EMPTY: unknown[] = [];
const EMPTY_NUM: number[] = [];

type Tip = "donatori" | "companii";
type Confirm = "ultimul" | "tot" | null;

// Import / export / ștergere pentru un singur tip (persoane fizice sau juridice),
// afișat direct în CRM-ul respectiv. Ștergerea cere mereu confirmare Da / Nu.
export function ImportExportPanel({ tip }: { tip: Tip }) {
  const locale = useLocale();
  const dict = INSTRUMENTE_DICT[locale].index;
  const pf = tip === "donatori";
  const donatori = useDonatori();
  const companii = useCompanii();
  const importate = useLocalStoreValue(pf ? getImportedDonatori<unknown> : getImportedCompanii<unknown>, EMPTY);
  const loturi = useLocalStoreValue(pf ? getImportBatchesDonatori : getImportBatchesCompanii, EMPTY_NUM);
  const [importOpen, setImportOpen] = useState(false);
  const [confirm, setConfirm] = useState<Confirm>(null);

  const ultimulLot = loturi.length ? loturi[loturi.length - 1] : importate.length;

  function exporta() {
    const csv = pf
      ? toCsv(donatori, [
          { key: "nume", header: dict.csv.nume },
          { key: "email", header: dict.csv.email },
          { key: "telefon", header: dict.csv.telefon },
          { key: "localitate", header: dict.csv.localitate },
          { key: "segment", header: dict.csv.segment },
          { key: "totalDonat", header: dict.csv.totalDonat },
          { key: "moneda", header: dict.csv.moneda },
          { key: "ultimaDonatieLa", header: dict.csv.ultimaDonatie },
          { key: "responsabil", header: dict.csv.responsabil },
        ])
      : toCsv(companii, [
          { key: "nume", header: dict.csv.companie },
          { key: "cui", header: dict.csv.cui },
          { key: "industrie", header: dict.csv.industrie },
          { key: "judet", header: dict.csv.judet },
          { key: "status", header: dict.csv.status },
          { key: "sumaSponsorizata", header: dict.csv.sponsorizat },
          { key: "responsabil", header: dict.csv.responsabil },
        ]);
    downloadCsv(`${pf ? "persoane-fizice" : "companii"}-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  }

  function executa() {
    if (confirm === "ultimul") (pf ? clearLastImportDonatori : clearLastImportCompanii)();
    if (confirm === "tot") (pf ? clearImportedDonatori : clearImportedCompanii)();
    setConfirm(null);
  }

  const nume = pf ? "persoane fizice" : "companii";
  const mesaj =
    confirm === "ultimul"
      ? `Ești sigur că vrei să ștergi ultimul fișier importat (${ultimulLot} ${nume})? Datele din setul demonstrativ nu sunt afectate.`
      : `Ești sigur că vrei să ștergi toată baza de date importată (${importate.length} ${nume})? Datele din setul demonstrativ nu sunt afectate.`;

  return (
    <Card>
      <CardHeader title={`Import / export — ${pf ? "persoane fizice" : "persoane juridice"}`} subtitle={dict.import.subtitle} />
      <div className="grid gap-3 sm:grid-cols-2">
        <PanelButton icon={Upload} label={pf ? dict.import.importaPF : dict.import.importaPJ} sub={pf ? dict.import.donatori : dict.import.companii} onClick={() => setImportOpen(true)} />
        <PanelButton
          icon={Download}
          label={pf ? dict.export.exportaPF : dict.export.exportaPJ}
          sub={dict.export.randuri(pf ? donatori.length : companii.length)}
          onClick={exporta}
        />
      </div>
      <div className="mt-4 grid gap-3 border-t border-[var(--ci-border)] pt-4 sm:grid-cols-2">
        <Button variant="secondary" onClick={() => setConfirm("ultimul")} disabled={!importate.length}>
          <Trash2 className="h-3.5 w-3.5" /> Șterge ultimul fișier importat{importate.length ? ` (${ultimulLot})` : ""}
        </Button>
        <Button variant="danger" onClick={() => setConfirm("tot")} disabled={!importate.length}>
          <Trash2 className="h-3.5 w-3.5" /> Șterge toată baza importată ({importate.length})
        </Button>
      </div>

      {importOpen && <ImportDialog open onClose={() => setImportOpen(false)} tip={tip} />}

      <Dialog open={confirm !== null} onClose={() => setConfirm(null)} title="Confirmă ștergerea" width="max-w-md">
        <p className="text-[13px] text-[var(--ci-text)]">{mesaj}</p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirm(null)}>
            Nu
          </Button>
          <Button variant="danger" onClick={executa}>
            Da, șterge
          </Button>
        </div>
      </Dialog>
    </Card>
  );
}

function PanelButton({ icon: Icon, label, sub, onClick }: { icon: typeof Upload; label: string; sub: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] px-3.5 py-3 text-left transition-colors hover:border-[var(--ci-primary)] hover:bg-[var(--ci-primary-soft)]"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--ci-radius-btn)] bg-[var(--ci-surface-2)] text-[var(--ci-text-muted)]">
        <Icon className="h-4 w-4" />
      </span>
      <span>
        <span className="block text-[13px] font-medium text-[var(--ci-text)]">{label}</span>
        <span className="block text-[12px] text-[var(--ci-text-muted)]">{sub}</span>
      </span>
    </button>
  );
}
