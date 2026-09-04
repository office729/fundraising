"use client";

import { FileText, Trash2, Upload } from "lucide-react";
import { useState } from "react";

import { Button } from "../components/ui/button";
import { EmptyState } from "../components/ui/states";
import { formatData } from "../lib/format";
import { getDocumenteLocale, stergeDocumentLocal, useLocalStoreValue } from "../lib/local-store";
import { useLocale } from "../lib/locale-context";
import { DOCUMENTE_DICT } from "@/lib/i18n/dictionaries/documente";
import { DOCUMENTE } from "../mock";
import { UploadDocumentDialog } from "./upload-document-dialog";

const EMPTY: never[] = [];

export default function DocumentePage() {
  const [uploadOpen, setUploadOpen] = useState(false);
  const documenteLocale = useLocalStoreValue(getDocumenteLocale, EMPTY);
  const total = DOCUMENTE.length + documenteLocale.length;
  const locale = useLocale();
  const dict = DOCUMENTE_DICT[locale];

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">{dict.title}</h1>
          <p className="mt-0.5 text-[13px] text-[var(--ci-text-muted)]">{dict.subtitle(total)}</p>
        </div>
        <Button variant="primary" onClick={() => setUploadOpen(true)}>
          <Upload className="h-3.5 w-3.5" /> {dict.incarcaDocument}
        </Button>
      </div>

      {total === 0 ? (
        <EmptyState title={dict.niciunDocument} />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {documenteLocale.map((d) => (
            <div key={d.id} className="flex items-start gap-3 rounded-xl border border-[var(--ci-border)] bg-[var(--ci-surface)] p-3.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--ci-primary-soft)] text-[var(--ci-primary)]">
                <FileText className="h-4 w-4" />
              </span>
              <a href={d.fisierData} download={d.nume} className="min-w-0 flex-1 hover:opacity-80">
                <p className="truncate text-[13px] font-medium text-[var(--ci-text)]">{d.nume}</p>
                <p className="mt-0.5 text-[12px] text-[var(--ci-text-muted)]">{d.legatDe.nume} · {formatData(d.incarcatLa)}</p>
              </a>
              <button
                onClick={() => stergeDocumentLocal(d.id)}
                aria-label={dict.stergeDocumentul}
                className="shrink-0 rounded-lg p-1.5 text-[var(--ci-text-faint)] hover:bg-[var(--ci-red-soft)] hover:text-[var(--ci-red)]"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          {DOCUMENTE.map((d) => (
            <div key={d.id} className="flex items-start gap-3 rounded-xl border border-[var(--ci-border)] bg-[var(--ci-surface)] p-3.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--ci-surface-2)] text-[var(--ci-text-muted)]">
                <FileText className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium text-[var(--ci-text)]">{d.nume}</p>
                <p className="mt-0.5 text-[12px] text-[var(--ci-text-muted)]">{d.legatDe.nume} · {formatData(d.incarcatLa)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <UploadDocumentDialog open={uploadOpen} onClose={() => setUploadOpen(false)} />
    </div>
  );
}
