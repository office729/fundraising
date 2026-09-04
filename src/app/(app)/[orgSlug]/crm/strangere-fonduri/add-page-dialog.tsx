"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "../components/ui/button";
import { Dialog } from "../components/ui/dialog";
import { Input, Label } from "../components/ui/input";
import { useLocale } from "../lib/locale-context";
import { STRANGERE_FONDURI_DICT } from "@/lib/i18n/dictionaries/strangere-fonduri";
import { creeazaPaginaAdminAction } from "./actions";

export function AddPageDialog({ open, onClose, orgSlug }: { open: boolean; onClose: () => void; orgSlug: string }) {
  const router = useRouter();
  const locale = useLocale();
  const dict = STRANGERE_FONDURI_DICT[locale].addPageDialog;
  const [pending, setPending] = useState(false);
  const [eroare, setEroare] = useState("");

  async function onSubmit(formData: FormData) {
    setPending(true);
    setEroare("");
    const rezultat = await creeazaPaginaAdminAction(orgSlug, { error: null }, formData);
    setPending(false);
    if (rezultat.error) {
      setEroare(rezultat.error);
      return;
    }
    router.refresh();
    onClose();
  }

  return (
    <Dialog open={open} onClose={onClose} title={dict.title} width="max-w-md">
      <div className="space-y-3">
        <p className="text-[13px] text-[var(--ci-text-muted)]">{dict.intro}</p>
        <form action={onSubmit} className="space-y-3">
          <div>
            <Label>{dict.numeResponsabil}</Label>
            <Input name="numeCreator" required placeholder={dict.numeResponsabilPlaceholder} />
          </div>
          <div>
            <Label>{dict.emailContact}</Label>
            <Input type="email" name="emailCreator" required />
          </div>
          <div>
            <Label>{dict.titluCampanie}</Label>
            <Input name="titlu" required placeholder={dict.titluCampaniePlaceholder} />
          </div>
          <div>
            <Label>{dict.poveste}</Label>
            <textarea
              name="poveste"
              required
              rows={4}
              className="w-full rounded-lg border border-[var(--ci-border)] bg-[var(--ci-surface)] px-3 py-2 text-[13px] text-[var(--ci-text)]"
            />
          </div>
          <div>
            <Label>{dict.sumaTinta}</Label>
            <Input type="number" name="sumaTinta" min={1} step={1} placeholder={dict.sumaTintaPlaceholder} />
          </div>

          {eroare && <p className="text-[13px] text-[var(--ci-red)]">{eroare}</p>}

          <div className="flex justify-end gap-2 border-t border-[var(--ci-border)] pt-3">
            <Button type="button" variant="secondary" onClick={onClose}>
              {dict.anuleaza}
            </Button>
            <Button type="submit" variant="primary" disabled={pending}>
              {pending ? dict.seCreaza : dict.creazaPagina}
            </Button>
          </div>
        </form>
      </div>
    </Dialog>
  );
}
