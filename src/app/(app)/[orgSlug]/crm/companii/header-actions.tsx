"use client";

import { idScurt, segmentFirma } from "@/lib/id-scurt";
import { CalendarClock, Plus, Trophy, Upload } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";

import { Button } from "../components/ui/button";
import { Dialog } from "../components/ui/dialog";
import { EmptyState } from "../components/ui/states";
import { formatData } from "../lib/format";
import { useLocale } from "../lib/locale-context";
import { COMPANII_DICT } from "@/lib/i18n/dictionaries/companii";
import { AddCompanyFormDialog } from "./add-company-form-dialog";
import { getCalendarLucru, importaFirmeCsv } from "./actions";

export function AddCompanyButton() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const router = useRouter();
  const locale = useLocale();
  const dict = COMPANII_DICT[locale].header;
  const [open, setOpen] = useState(false);
  // Pe o listă filtrată după marcaj (ex. ?marcaj=d177), firma nouă primește marcajul respectiv și rămâi pe listă,
  // ca să o vezi apărând — nu ești dus pe fișa ei.
  const marcaje = useSearchParams().getAll("marcaj").filter((m) => m === "d177" || m === "decembrie" || m === "caz");

  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)}>
        <Plus className="h-3.5 w-3.5" /> {dict.adaugaFirma}
      </Button>
      <AddCompanyFormDialog
        open={open}
        onClose={() => setOpen(false)}
        marcaje={marcaje}
        onCreated={(id) => {
          setOpen(false);
          if (marcaje.length > 0) router.refresh();
          else router.push(`/${orgSlug}/crm/companii/${idScurt(id)}`);
        }}
      />
    </>
  );
}

export function CalendarLucruButton() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const locale = useLocale();
  const dict = COMPANII_DICT[locale].header;
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<{ id: string; nume: string; followupAt: Date | null; judet: string | null }[] | null>(null);

  async function deschide() {
    setOpen(true);
    if (rows) return;
    setLoading(true);
    setRows(await getCalendarLucru(orgSlug));
    setLoading(false);
  }

  return (
    <>
      <Button variant="secondary" onClick={deschide}>
        <CalendarClock className="h-3.5 w-3.5" /> {dict.calendarLucru}
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title={dict.calendarLucru} width="max-w-lg">
        <p className="mb-3 text-[13px] text-[var(--ci-text-muted)]">{dict.calendarDesc}</p>
        {loading ? (
          <p className="text-[13px] text-[var(--ci-text-muted)]">{dict.seIncarca}</p>
        ) : !rows || rows.length === 0 ? (
          <EmptyState title={dict.calendarEmpty.title} description={dict.calendarEmpty.description} />
        ) : (
          <div className="space-y-1.5">
            {rows.map((r) => (
              <Link prefetch={false}
                key={r.id}
                href={`/${orgSlug}/crm/companii/${segmentFirma(r.nume, r.id)}`}
                className="flex items-center justify-between rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] px-3 py-2 text-[13px] hover:bg-[var(--ci-surface-2)]"
              >
                <span className="min-w-0 truncate font-medium text-[var(--ci-text)]">
                  {r.nume} {r.judet && <span className="font-normal text-[var(--ci-text-muted)]">· {r.judet}</span>}
                </span>
                <span className="shrink-0 text-[var(--ci-text-muted)]">{r.followupAt ? formatData(r.followupAt.toISOString()) : "—"}</span>
              </Link>
            ))}
          </div>
        )}
      </Dialog>
    </>
  );
}

export function TopButton() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const locale = useLocale();
  const dict = COMPANII_DICT[locale].header;
  return (
    <Link prefetch={false}
      href={`/${orgSlug}/crm/companii?top=1`}
      className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] px-3.5 text-sm font-medium text-[var(--ci-text)] transition-colors hover:border-[var(--ci-border-strong)] hover:bg-[var(--ci-surface-2)]"
    >
      <Trophy className="h-3.5 w-3.5" /> {dict.top2000}
    </Link>
  );
}

export function ImportCsvButton() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const router = useRouter();
  const locale = useLocale();
  const dict = COMPANII_DICT[locale].header;
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [rezultat, setRezultat] = useState<{ error: string | null; importate?: number; ignorate?: number; duplicate?: number; pesteCota?: number } | null>(null);

  function alegeFisier() {
    inputRef.current?.click();
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setOpen(true);
    setRezultat(null);
    // Limita implicită a cererilor către server e ~1 MB — peste ea importul ar eșua fără mesaj.
    if (file.size > 1_000_000) {
      setPending(false);
      setRezultat({ error: dict.fisierPreaMare });
      return;
    }
    setPending(true);
    const reader = new FileReader();
    reader.onload = async () => {
      // UTF-8 dacă e valid; altfel Windows-1250 (Excel în Windows exportă CSV „ANSI", iar diacriticele ă â î ș ț se pierdeau).
      const buf = reader.result as ArrayBuffer;
      let text: string;
      try {
        text = new TextDecoder("utf-8", { fatal: true }).decode(buf);
      } catch {
        text = new TextDecoder("windows-1250").decode(buf);
      }
      try {
        const r = await importaFirmeCsv(orgSlug, text);
        setRezultat(r);
        if (!r.error) router.refresh();
      } catch {
        setRezultat({ error: dict.importEsuat });
      } finally {
        setPending(false);
      }
    };
    reader.readAsArrayBuffer(file);
  }

  return (
    <>
      <input ref={inputRef} type="file" accept=".csv,text/csv" onChange={onFile} className="hidden" />
      <Button variant="secondary" onClick={alegeFisier}>
        <Upload className="h-3.5 w-3.5" /> {dict.importaBaza}
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title={dict.importTitle} width="max-w-md">
        <p className="mb-3 text-[13px] text-[var(--ci-text-muted)]">{dict.importDesc}</p>
        {pending && <p className="text-[13px] text-[var(--ci-text-muted)]">{dict.seImporta}</p>}
        {rezultat?.error && <p className="text-[13px] text-[var(--ci-red)]">{rezultat.error}</p>}
        {rezultat && !rezultat.error && (
          <p className="text-[13px] text-[var(--ci-green)]">{dict.rezultat(rezultat.importate ?? 0, rezultat.ignorate ?? 0, rezultat.duplicate ?? 0, rezultat.pesteCota ?? 0)}</p>
        )}
        <div className="mt-4 flex justify-end">
          <Button variant="secondary" onClick={() => setOpen(false)}>
            {dict.inchide}
          </Button>
        </div>
      </Dialog>
    </>
  );
}
