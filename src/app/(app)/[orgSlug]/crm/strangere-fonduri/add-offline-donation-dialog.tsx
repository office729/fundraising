"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "../components/ui/button";
import { Dialog } from "../components/ui/dialog";
import { Input, Label } from "../components/ui/input";
import { useLocale } from "../lib/locale-context";
import { STRANGERE_FONDURI_DICT } from "@/lib/i18n/dictionaries/strangere-fonduri";
import { adaugaDonatieOfflineAction } from "./actions";

export function AddOfflineDonationDialog({
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
  const dict = STRANGERE_FONDURI_DICT[locale].addOfflineDonationDialog;
  const [pending, setPending] = useState(false);
  const [eroare, setEroare] = useState("");

  async function onSubmit(formData: FormData) {
    setPending(true);
    setEroare("");
    const rezultat = await adaugaDonatieOfflineAction(orgSlug, pageId, { error: null, ok: false }, formData);
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
            <Label>{dict.numeDonator}</Label>
            <Input name="numeDonator" required placeholder={dict.numeDonatorPlaceholder} />
          </div>
          <div>
            <Label>{dict.emailOptional}</Label>
            <Input type="email" name="emailDonator" />
            <p className="mt-1 text-[11.5px] text-[var(--ci-text-faint)]">{dict.emailNota}</p>
          </div>
          <div>
            <Label>{dict.telefonOptional}</Label>
            <Input type="tel" name="telefonDonator" />
          </div>
          <div>
            <Label>{dict.suma}</Label>
            <Input type="number" name="suma" min={1} step={1} required />
          </div>
          <div>
            <Label>{dict.mesajOptional}</Label>
            <Input name="mesaj" />
          </div>
          <label className="flex items-center gap-2 text-[13px] text-[var(--ci-text)]">
            <input type="checkbox" name="consimtamantWhatsapp" className="h-4 w-4 rounded border-[var(--ci-border)]" />
            {dict.consimtamantWhatsapp}
          </label>

          {eroare && <p className="text-[13px] text-[var(--ci-red)]">{eroare}</p>}

          <div className="flex justify-end gap-2 border-t border-[var(--ci-border)] pt-3">
            <Button type="button" variant="secondary" onClick={onClose}>
              {dict.anuleaza}
            </Button>
            <Button type="submit" variant="primary" disabled={pending}>
              {pending ? dict.seAdauga : dict.adaugaDonatia}
            </Button>
          </div>
        </form>
      </div>
    </Dialog>
  );
}
