"use client";

import { FileSpreadsheet, FileText } from "lucide-react";

import { Button } from "../../components/ui/button";
import { useLocale } from "../../lib/locale-context";
import { FORMULAR230_DICT } from "@/lib/i18n/dictionaries/formular230";
import { obtineCnpPentruExport } from "./actions";

type SubmisieExport = {
  id: string;
  nume: string;
  prenume: string;
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

async function descarcaWorkbook(rows: Record<string, string | number>[], sheetName: string, filename: string) {
  // xlsx e mare (~1 MB): se încarcă doar când se apasă efectiv exportul.
  const XLSX = await import("xlsx");
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, filename);
}

export function ExportButtons({
  orgSlug,
  submisii,
  beneficiari,
}: {
  orgSlug: string;
  submisii: SubmisieExport[];
  beneficiari: { id: string; nume: string }[];
}) {
  const locale = useLocale();
  const dict = FORMULAR230_DICT[locale].export;

  // CNP-ul nu vine în lista din pagină — se aduce la click, doar pentru
  // rândurile exportate, printr-o acțiune rezervată owner/admin.
  async function cnpuri(): Promise<Record<string, string>> {
    return obtineCnpPentruExport(orgSlug, submisii.map((s) => s.id));
  }

  async function exportaExcel() {
    const cnp = await cnpuri();
    const rows = submisii.map((s) => ({
      Nume: s.nume,
      Prenume: s.prenume,
      CNP: cnp[s.id] ?? "",
      Email: s.email,
      Telefon: s.telefon ?? "",
      Județ: s.judet ?? "",
      Localitate: s.localitate ?? "",
      "Cont beneficiar": numeCont(beneficiari, s.beneficiarId),
      An: s.an ?? s.createdAt.getFullYear(),
      "Data trimiterii": s.createdAt.toLocaleDateString("ro-RO"),
      "Procesat ANAF": s.procesatAnaf ? "Da" : "Nu",
    }));
    await descarcaWorkbook(rows, "Formulare 230", `formulare-230-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="secondary" size="sm" onClick={exportaExcel} disabled={!submisii.length}>
        <FileSpreadsheet className="h-3.5 w-3.5" /> {dict.excel}
      </Button>
      <Button variant="secondary" size="sm" onClick={() => document.getElementById("borderouri-anaf")?.scrollIntoView({ behavior: "smooth", block: "start" })} disabled={!submisii.length} title="Borderourile ANAF (max. 50 de formulare) cu PDF inteligent, Excel și XML sunt în cardul de mai jos">
        <FileText className="h-3.5 w-3.5" /> {dict.borderouAnaf}
      </Button>
    </div>
  );
}
