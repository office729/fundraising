"use client";

import { Check, Copy, FileDown, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "../../components/ui/button";
import { completeazaFormular230Pdf, downloadPdfBytes, type DateBeneficiarPdf, type DateFormular230Pdf } from "@/lib/formular230-pdf";
import { useLocale } from "../../lib/locale-context";
import { FORMULAR230_DICT } from "@/lib/i18n/dictionaries/formular230";
import { seteazaProcesatAnaf, stergeFormular230 } from "./actions";

export function CopyLinkButton({ orgSlug, shortCode }: { orgSlug: string; shortCode: string | null }) {
  const locale = useLocale();
  const dict = FORMULAR230_DICT[locale].client;
  const [copiat, setCopiat] = useState(false);

  async function copiaza() {
    // Link scurt (/s/<cod>) dacă există — altfel adresa lungă, ca fallback
    // pentru conturile create înainte de codurile scurte.
    const link = shortCode ? `${window.location.origin}/s/${shortCode}` : `${window.location.origin}/f230/${orgSlug}/principal`;
    try {
      await navigator.clipboard.writeText(link);
      setCopiat(true);
      setTimeout(() => setCopiat(false), 2000);
    } catch {
      // clipboard indisponibil — ignorăm silențios
    }
  }

  return (
    <Button variant="primary" onClick={copiaza}>
      {copiat ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copiat ? dict.linkCopiat : dict.copiazaLinkPublic}
    </Button>
  );
}

export function PdfButton({ submisie, beneficiar }: { submisie: DateFormular230Pdf; beneficiar?: DateBeneficiarPdf }) {
  const locale = useLocale();
  const dict = FORMULAR230_DICT[locale].client;
  const [seGenereaza, setSeGenereaza] = useState(false);

  async function genereaza() {
    setSeGenereaza(true);
    try {
      const bytes = await completeazaFormular230Pdf(submisie, beneficiar);
      downloadPdfBytes(bytes, `Formular 230 - ${submisie.nume} ${submisie.prenume}.pdf`);
    } finally {
      setSeGenereaza(false);
    }
  }

  return (
    <button
      onClick={genereaza}
      disabled={seGenereaza}
      title={dict.descarcaPdf}
      className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--ci-text-faint)] hover:bg-[var(--ci-surface-2)] hover:text-[var(--ci-text)] disabled:opacity-50"
    >
      <FileDown className="h-3.5 w-3.5" />
    </button>
  );
}

export function ProcesatAnafCheckbox({
  orgSlug,
  id,
  initial,
}: {
  orgSlug: string;
  id: string;
  initial: boolean;
}) {
  const router = useRouter();
  const locale = useLocale();
  const dict = FORMULAR230_DICT[locale].client;
  const [procesat, setProcesat] = useState(initial);
  const [seSalveaza, setSeSalveaza] = useState(false);

  async function comuta() {
    const urmatoare = !procesat;
    setProcesat(urmatoare);
    setSeSalveaza(true);
    try {
      await seteazaProcesatAnaf(orgSlug, id, urmatoare);
      router.refresh();
    } finally {
      setSeSalveaza(false);
    }
  }

  return (
    <input
      type="checkbox"
      checked={procesat}
      onChange={comuta}
      disabled={seSalveaza}
      title={dict.procesatAnaf}
      className="h-4 w-4 shrink-0 rounded border-[var(--ci-border)] accent-[var(--ci-primary)] disabled:opacity-50"
    />
  );
}

export function DeleteButton({ orgSlug, id, nume }: { orgSlug: string; id: string; nume: string }) {
  const router = useRouter();
  const locale = useLocale();
  const dict = FORMULAR230_DICT[locale].client;
  const [seSterge, setSeSterge] = useState(false);

  async function sterge() {
    if (!window.confirm(dict.confirmaStergere(nume))) return;
    setSeSterge(true);
    try {
      await stergeFormular230(orgSlug, id);
      router.refresh();
    } finally {
      setSeSterge(false);
    }
  }

  return (
    <button
      onClick={sterge}
      disabled={seSterge}
      title={dict.stergeRaspuns}
      className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--ci-text-faint)] hover:bg-[var(--ci-red-soft)] hover:text-[var(--ci-red)] disabled:opacity-50"
    >
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  );
}
