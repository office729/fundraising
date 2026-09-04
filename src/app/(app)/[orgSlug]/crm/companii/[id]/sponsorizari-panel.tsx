"use client";

import { PlusCircle, Trash2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "../../components/ui/button";
import { Dialog } from "../../components/ui/dialog";
import { Input, Label, Textarea } from "../../components/ui/input";
import { EmptyState } from "../../components/ui/states";
import { formatData } from "../../lib/format";
import { useLocale } from "../../lib/locale-context";
import { COMPANII_DICT } from "@/lib/i18n/dictionaries/companii";
import { adaugaSponsorizare, stergeSponsorizare } from "../actions";

type Sponsorizare = { id: string; suma: number; data: string; proiect: string | null; nota: string | null };

export function SponsorizariPanel({ companyId, sponsorizari }: { companyId: string; sponsorizari: Sponsorizare[] }) {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const router = useRouter();
  const locale = useLocale();
  const dict = COMPANII_DICT[locale].detail.sponsorizari;
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [eroare, setEroare] = useState("");
  const [sterge, setSterge] = useState<string | null>(null);

  async function onSubmit(formData: FormData) {
    setPending(true);
    setEroare("");
    const r = await adaugaSponsorizare(orgSlug, { error: null }, formData);
    setPending(false);
    if (r.error) {
      setEroare(r.error);
      return;
    }
    setOpen(false);
    router.refresh();
  }

  async function onSterge(id: string) {
    if (!window.confirm(dict.confirmaStergere)) return;
    setSterge(id);
    await stergeSponsorizare(orgSlug, id, companyId);
    setSterge(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="primary" onClick={() => setOpen(true)}>
          <PlusCircle className="h-3.5 w-3.5" /> {dict.sponsorizareNoua}
        </Button>
      </div>

      {sponsorizari.length === 0 ? (
        <EmptyState title={dict.niciunaInca.title} description={dict.niciunaInca.description} />
      ) : (
        <div className="space-y-2">
          {sponsorizari.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--ci-border)] px-3.5 py-2.5">
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-[var(--ci-text)]">
                  {formatData(s.data)} {s.proiect && <span className="font-normal text-[var(--ci-text-muted)]">· {s.proiect}</span>}
                </p>
                {s.nota && <p className="mt-0.5 text-[12px] text-[var(--ci-text-muted)]">{s.nota}</p>}
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="ci-tabular text-[14px] font-semibold text-[var(--ci-text)]">{s.suma.toLocaleString("ro-RO")} RON</span>
                <button
                  type="button"
                  onClick={() => onSterge(s.id)}
                  disabled={sterge === s.id}
                  title={dict.stergeTitle}
                  className="text-[var(--ci-text-faint)] hover:text-[var(--ci-red)] disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} title={dict.sponsorizareNoua} width="max-w-sm">
        <form action={onSubmit} className="space-y-3">
          <input type="hidden" name="companyId" value={companyId} />
          <div>
            <Label>{dict.suma}</Label>
            <Input type="number" name="suma" min={1} step={1} required autoFocus />
          </div>
          <div>
            <Label>{dict.data}</Label>
            <Input type="date" name="data" required defaultValue={new Date().toISOString().slice(0, 10)} />
          </div>
          <div>
            <Label>{dict.proiect}</Label>
            <Input name="proiect" placeholder={dict.proiectPlaceholder} />
          </div>
          <div>
            <Label>{dict.nota}</Label>
            <Textarea name="nota" rows={2} />
          </div>
          {eroare && <p className="text-[13px] text-[var(--ci-red)]">{eroare}</p>}
          <div className="flex justify-end gap-2 border-t border-[var(--ci-border)] pt-3">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              {dict.anuleaza}
            </Button>
            <Button type="submit" variant="primary" disabled={pending}>
              {pending ? dict.seSalveaza : dict.adauga}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
