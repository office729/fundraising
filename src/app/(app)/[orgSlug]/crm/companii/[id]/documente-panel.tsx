"use client";

import { Download, FileText, Trash2, Upload } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { Button } from "../../components/ui/button";
import { Input, Label } from "../../components/ui/input";
import { EmptyState } from "../../components/ui/states";
import { formatDataOra } from "../../lib/format";
import { incarcaDocumentFirma, stergeDocumentFirma } from "./documente-actions";

export type DocumentAfisat = { id: string; nume: string; tip: string; marime: number; la: string; deNume: string | null; url: string | null };

const dimensiune = (b: number) => (b >= 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

export function DocumentePanel({ companyId, documente }: { companyId: string; documente: DocumentAfisat[] }) {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, setPending] = useState(false);
  const [eroare, setEroare] = useState("");
  const [sterge, setSterge] = useState<string | null>(null);

  async function onSubmit(formData: FormData) {
    setPending(true);
    setEroare("");
    const r = await incarcaDocumentFirma(orgSlug, companyId, formData);
    setPending(false);
    if (r.error) {
      setEroare(r.error);
      return;
    }
    formRef.current?.reset();
    router.refresh();
  }

  async function onSterge(id: string) {
    if (!window.confirm("Ștergi acest document?")) return;
    setSterge(id);
    await stergeDocumentFirma(orgSlug, companyId, id);
    setSterge(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <form ref={formRef} action={onSubmit} className="rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] bg-[var(--ci-surface)] p-4">
        <p className="text-[13px] font-semibold text-[var(--ci-text)]">Încarcă un document</p>
        <p className="mt-0.5 text-[12px] text-[var(--ci-text-muted)]">Contracte, rapoarte, corespondență — PDF, imagine, Word, Excel sau text, maxim 10 MB.</p>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
          <div>
            <Label>Fișier</Label>
            <input
              type="file"
              name="fisier"
              required
              accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx,.txt"
              className="block w-full text-[12px] text-[var(--ci-text-muted)] file:mr-2 file:rounded-[var(--ci-radius-btn)] file:border-0 file:bg-[var(--ci-surface-2)] file:px-2.5 file:py-1.5 file:text-[12px] file:font-medium file:text-[var(--ci-text)]"
            />
          </div>
          <div>
            <Label>Denumire (opțional)</Label>
            <Input name="nume" placeholder="ex. Contract sponsorizare 2026" />
          </div>
          <Button type="submit" variant="primary" disabled={pending}>
            <Upload className="h-3.5 w-3.5" /> {pending ? "Se încarcă…" : "Încarcă"}
          </Button>
        </div>
        {eroare && <p className="mt-2 text-[13px] text-[var(--ci-red)]">{eroare}</p>}
      </form>

      {documente.length === 0 ? (
        <EmptyState title="Niciun document încă" description="Documentele încărcate apar aici." />
      ) : (
        <div className="space-y-2">
          {documente.map((d) => (
            <div key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] px-3.5 py-2.5">
              <div className="flex min-w-0 items-center gap-2.5">
                <FileText className="h-4 w-4 shrink-0 text-[var(--ci-text-muted)]" />
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-[var(--ci-text)]">{d.nume}</p>
                  <p className="text-[12px] text-[var(--ci-text-muted)]">
                    {d.tip.toUpperCase()} · {dimensiune(d.marime)} · {formatDataOra(d.la)}
                    {d.deNume ? ` · ${d.deNume}` : ""}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                {d.url ? (
                  <a href={d.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-8 items-center gap-1 text-[12px] font-medium text-[var(--ci-blue)] hover:underline">
                    <Download className="h-3.5 w-3.5" /> Deschide
                  </a>
                ) : (
                  <span className="text-[12px] text-[var(--ci-text-faint)]">indisponibil</span>
                )}
                <button type="button" onClick={() => onSterge(d.id)} disabled={sterge === d.id} title="Șterge" className="text-[var(--ci-text-faint)] hover:text-[var(--ci-red)] disabled:opacity-50">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
