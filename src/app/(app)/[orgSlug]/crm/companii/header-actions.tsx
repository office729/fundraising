"use client";

import { CalendarClock, Plus, Trophy, Upload } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
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

  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)}>
        <Plus className="h-3.5 w-3.5" /> {dict.adaugaFirma}
      </Button>
      <AddCompanyFormDialog
        open={open}
        onClose={() => setOpen(false)}
        onCreated={(id) => {
          setOpen(false);
          router.push(`/${orgSlug}/crm/companii/${id}`);
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
              <Link
                key={r.id}
                href={`/${orgSlug}/crm/companii/${r.id}`}
                className="flex items-center justify-between rounded-lg border border-[var(--ci-border)] px-3 py-2 text-[13px] hover:bg-[var(--ci-surface-2)]"
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
    <Link
      href={`/${orgSlug}/crm/companii?top=1`}
      className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-[var(--ci-border)] px-3.5 text-sm font-medium text-[var(--ci-text)] transition-colors hover:border-[var(--ci-border-strong)] hover:bg-[var(--ci-surface-2)]"
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
  const [rezultat, setRezultat] = useState<{ error: string | null; importate?: number; ignorate?: number } | null>(null);

  function alegeFisier() {
    inputRef.current?.click();
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setOpen(true);
    setPending(true);
    setRezultat(null);
    const reader = new FileReader();
    reader.onload = async () => {
      const text = String(reader.result ?? "");
      const r = await importaFirmeCsv(orgSlug, text);
      setRezultat(r);
      setPending(false);
      if (!r.error) router.refresh();
    };
    reader.readAsText(file, "utf-8");
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
          <p className="text-[13px] text-[var(--ci-green)]">{dict.rezultat(rezultat.importate ?? 0, rezultat.ignorate ?? 0)}</p>
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
