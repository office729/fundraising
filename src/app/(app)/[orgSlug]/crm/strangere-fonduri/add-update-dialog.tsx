"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "../components/ui/button";
import { Dialog } from "../components/ui/dialog";
import { Input, Label } from "../components/ui/input";
import { useLocale } from "../lib/locale-context";
import { STRANGERE_FONDURI_DICT } from "@/lib/i18n/dictionaries/strangere-fonduri";
import { adaugaActualizareAction } from "./actions";

export function AddUpdateDialog({
  open,
  onClose,
  orgSlug,
  pageId,
}: {
  open: boolean;
  onClose: () => void;
  orgSlug: string;
  pageId: string;
}) {
  const router = useRouter();
  const locale = useLocale();
  const dict = STRANGERE_FONDURI_DICT[locale].addUpdateDialog;
  const [pending, setPending] = useState(false);
  const [eroare, setEroare] = useState("");

  async function onSubmit(formData: FormData) {
    setPending(true);
    setEroare("");
    const rezultat = await adaugaActualizareAction(orgSlug, { error: null }, formData);
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
          <input type="hidden" name="pageId" value={pageId} />
          <div>
            <Label>{dict.titlu}</Label>
            <Input name="titlu" required placeholder={dict.titluPlaceholder} />
          </div>
          <div>
            <Label>{dict.continut}</Label>
            <textarea
              name="continut"
              required
              rows={5}
              className="w-full rounded-lg border border-[var(--ci-border)] bg-[var(--ci-surface)] px-3 py-2 text-[13px] text-[var(--ci-text)]"
            />
          </div>

          {eroare && <p className="text-[13px] text-[var(--ci-red)]">{eroare}</p>}

          <div className="flex justify-end gap-2 border-t border-[var(--ci-border)] pt-3">
            <Button type="button" variant="secondary" onClick={onClose}>
              {dict.anuleaza}
            </Button>
            <Button type="submit" variant="primary" disabled={pending}>
              {pending ? dict.sePublica : dict.publicaActualizarea}
            </Button>
          </div>
        </form>
      </div>
    </Dialog>
  );
}
