"use client";

import { Check, Pencil, Trash2, X as XIcon } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "../../components/ui/button";
import { Textarea } from "../../components/ui/input";
import { EmptyState } from "../../components/ui/states";
import { formatDataOra } from "../../lib/format";
import { useLocale } from "../../lib/locale-context";
import { COMPANII_DICT } from "@/lib/i18n/dictionaries/companii";
import { adaugaNotita, editeazaNotita, stergeNotita } from "../actions";

type Notita = { id: string; text: string; createdAt: Date; editatLa: Date | null; autorNume: string | null };

export function NotitePanel({ companyId, notite }: { companyId: string; notite: Notita[] }) {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const router = useRouter();
  const locale = useLocale();
  const dict = COMPANII_DICT[locale].detail.notite;
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);

  async function adauga() {
    if (!text.trim()) return;
    setPending(true);
    const r = await adaugaNotita(orgSlug, companyId, text);
    setPending(false);
    if (!r.error) {
      setText("");
      router.refresh();
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={dict.placeholder} rows={2} className="flex-1" />
        <Button variant="primary" onClick={adauga} disabled={!text.trim() || pending}>
          {pending ? dict.seSalveaza : dict.adauga}
        </Button>
      </div>
      {notite.length === 0 ? (
        <EmptyState title={dict.niciunaInca} />
      ) : (
        <div className="space-y-2.5">
          {notite.map((n) => (
            <NotaCard key={n.id} orgSlug={orgSlug} nota={n} />
          ))}
        </div>
      )}
    </div>
  );
}

function NotaCard({ orgSlug, nota }: { orgSlug: string; nota: Notita }) {
  const router = useRouter();
  const locale = useLocale();
  const dict = COMPANII_DICT[locale].detail.notite;
  const [editare, setEditare] = useState(false);
  const [text, setText] = useState(nota.text);
  const [pending, setPending] = useState(false);
  const [sterge, setSterge] = useState(false);

  async function salveaza() {
    if (!text.trim()) return;
    setPending(true);
    const r = await editeazaNotita(orgSlug, nota.id, text);
    setPending(false);
    if (!r.error) {
      setEditare(false);
      router.refresh();
    }
  }

  async function sterge2() {
    if (!window.confirm(dict.confirmaStergere)) return;
    setSterge(true);
    await stergeNotita(orgSlug, nota.id);
    router.refresh();
  }

  return (
    <div className="rounded-xl border border-[var(--ci-border)] bg-[var(--ci-surface)] p-3.5 shadow-[var(--ci-shadow-sm)]">
      {editare ? (
        <div className="space-y-2">
          <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} autoFocus />
          <div className="flex justify-end gap-1.5">
            <button
              onClick={() => {
                setText(nota.text);
                setEditare(false);
              }}
              aria-label={dict.anuleazaEditarea}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--ci-text-muted)] hover:bg-[var(--ci-surface-2)]"
            >
              <XIcon className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={salveaza}
              disabled={pending}
              aria-label={dict.salveazaNotita}
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--ci-green-soft)] text-[var(--ci-green)] hover:opacity-80 disabled:opacity-50"
            >
              <Check className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[13px] whitespace-pre-wrap text-[var(--ci-text)]">{nota.text}</p>
            <p className="mt-1 text-[12px] text-[var(--ci-text-faint)]">
              {nota.autorNume || dict.cinevaDinEchipa} · {formatDataOra(nota.createdAt.toISOString())}
              {nota.editatLa && dict.editata}
            </p>
          </div>
          <div className="flex shrink-0 gap-0.5">
            <button onClick={() => setEditare(true)} aria-label={dict.editeazaNotita} className="rounded-lg p-1.5 text-[var(--ci-text-faint)] hover:bg-[var(--ci-surface-2)] hover:text-[var(--ci-text)]">
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button onClick={sterge2} disabled={sterge} aria-label={dict.stergeNotita} className="rounded-lg p-1.5 text-[var(--ci-text-faint)] hover:bg-[var(--ci-red-soft)] hover:text-[var(--ci-red)] disabled:opacity-50">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
