"use client";

import { ExternalLink, Trash2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "../../components/ui/button";
import { CallButton } from "../../components/call-button";
import { Dialog } from "../../components/ui/dialog";
import { Input, Label } from "../../components/ui/input";
import { EmptyState } from "../../components/ui/states";
import { useLocale } from "../../lib/locale-context";
import { COMPANII_DICT } from "@/lib/i18n/dictionaries/companii";
import { adaugaContact, stergeContact } from "../actions";

type Contact = { id: string; nume: string; rol: string | null; email: string | null; telefon: string | null; linkedin: string | null };

export function ContactePanel({ companyId, contacte }: { companyId: string; contacte: Contact[] }) {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const router = useRouter();
  const locale = useLocale();
  const dict = COMPANII_DICT[locale].detail.contacte;
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [eroare, setEroare] = useState("");
  const [sterge, setSterge] = useState<string | null>(null);

  async function onSubmit(formData: FormData) {
    setPending(true);
    setEroare("");
    const r = await adaugaContact(orgSlug, { error: null }, formData);
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
    await stergeContact(orgSlug, id);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button variant="primary" onClick={() => setOpen(true)}>
          {dict.adaugaContact}
        </Button>
      </div>

      {contacte.length === 0 ? (
        <EmptyState title={dict.niciunContact} />
      ) : (
        <div className="space-y-2">
          {contacte.map((c) => (
            <div key={c.id} className="rounded-xl border border-[var(--ci-border)] bg-[var(--ci-surface)] px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="truncate text-[14px] font-semibold text-[var(--ci-text)]">
                  {c.nume}
                  {c.rol && <span className="font-normal text-[var(--ci-text-muted)]"> — {c.rol}</span>}
                </p>
                <div className="flex shrink-0 items-center gap-2.5">
                  {c.telefon && <CallButton telefon={c.telefon} nume={c.nume} companyId={companyId} />}
                  {c.linkedin && (
                    <a href={c.linkedin} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[12px] font-medium text-[var(--ci-blue)] hover:underline">
                      <ExternalLink className="h-3.5 w-3.5" /> {dict.linkedin}
                    </a>
                  )}
                  <button type="button" onClick={() => onSterge(c.id)} disabled={sterge === c.id} title={dict.stergeContactTitle} className="text-[var(--ci-text-faint)] hover:text-[var(--ci-red)] disabled:opacity-50">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <p className="mt-1 text-[13px] text-[var(--ci-text-muted)]">
                {c.email || dict.faraEmail}
                {c.telefon ? ` · ${c.telefon}` : ""}
              </p>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} title={dict.dialogTitle} width="max-w-sm">
        <form action={onSubmit} className="space-y-3">
          <input type="hidden" name="companyId" value={companyId} />
          <div>
            <Label>{dict.nume}</Label>
            <Input name="nume" required autoFocus />
          </div>
          <div>
            <Label>{dict.rol}</Label>
            <Input name="rol" placeholder={dict.rolPlaceholder} />
          </div>
          <div>
            <Label>{dict.email}</Label>
            <Input type="email" name="email" />
          </div>
          <div>
            <Label>{dict.telefon}</Label>
            <Input type="tel" name="telefon" />
          </div>
          <div>
            <Label>{dict.linkedin}</Label>
            <Input name="linkedin" placeholder={dict.linkedinPlaceholder} />
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
