"use client";

import { FileSpreadsheet, FileText } from "lucide-react";
import * as XLSX from "xlsx";

import { Button } from "../../components/ui/button";
import { useLocale } from "../../lib/locale-context";
import { FORMULAR230_DICT } from "@/lib/i18n/dictionaries/formular230";

type SubmisieExport = {
  nume: string;
  prenume: string;
  cnp: string;
  email: string;
  telefon: string | null;
  judet: string | null;
  localitate: string | null;
  beneficiarId: string | null;
  an: number | null;
  procesatAnaf: boolean;
  createdAt: Date;
};

function numeCont(beneficiari: { id: string; nume: string }[], beneficiarId: string | null): string {
  return beneficiari.find((b) => b.id === beneficiarId)?.nume ?? "—";
}

function descarcaWorkbook(rows: Record<string, string | number>[], sheetName: string, filename: string) {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, filename);
}

export function ExportButtons({
  submisii,
  beneficiari,
}: {
  submisii: SubmisieExport[];
  beneficiari: { id: string; nume: string }[];
}) {
  const locale = useLocale();
  const dict = FORMULAR230_DICT[locale].export;

  function exportaExcel() {
    const rows = submisii.map((s) => ({
      Nume: s.nume,
      Prenume: s.prenume,
      CNP: s.cnp,
      Email: s.email,
      Telefon: s.telefon ?? "",
      Județ: s.judet ?? "",
      Localitate: s.localitate ?? "",
      "Cont beneficiar": numeCont(beneficiari, s.beneficiarId),
      An: s.an ?? s.createdAt.getFullYear(),
      "Data trimiterii": s.createdAt.toLocaleDateString("ro-RO"),
      "Procesat ANAF": s.procesatAnaf ? "Da" : "Nu",
    }));
    descarcaWorkbook(rows, "Formulare 230", `formulare-230-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  function exportaBorderou() {
    const rows = submisii.map((s, i) => ({
      "Nr. crt.": i + 1,
      Nume: s.nume,
      Prenume: s.prenume,
      CNP: s.cnp,
      "Cont beneficiar": numeCont(beneficiari, s.beneficiarId),
      "Sumă/Procent": "3,5%",
      An: s.an ?? s.createdAt.getFullYear(),
    }));
    descarcaWorkbook(rows, "Borderou ANAF", `borderou-anaf-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="secondary" size="sm" onClick={exportaExcel} disabled={!submisii.length}>
        <FileSpreadsheet className="h-3.5 w-3.5" /> {dict.excel}
      </Button>
      <Button variant="secondary" size="sm" onClick={exportaBorderou} disabled={!submisii.length}>
        <FileText className="h-3.5 w-3.5" /> {dict.borderouAnaf}
      </Button>
    </div>
  );
}
