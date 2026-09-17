"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "../components/ui/button";
import { Dialog } from "../components/ui/dialog";
import { Input, Label } from "../components/ui/input";
import { useLocale } from "../lib/locale-context";
import { STRANGERE_FONDURI_DICT } from "@/lib/i18n/dictionaries/strangere-fonduri";
import { editeazaActualizareAction } from "./actions";

export type ActualizareEditabila = {
  id: string;
  titlu: string;
  continut: string;
  data: string; // "YYYY-MM-DD", gata pentru <input type="date">
};

export function EditUpdateDialog({
  open,
  onClose,
  orgSlug,
  actualizare,
}: {
  open: boolean;
  onClose: () => void;
  orgSlug: string;
  actualizare: ActualizareEditabila;
}) {
  const router = useRouter();
  const locale = useLocale();
  const dict = STRANGERE_FONDURI_DICT[locale].editUpdateDialog;
  const [pending, setPending] = useState(false);
  const [eroare, setEroare] = useState("");

  async function onSubmit(formData: FormData) {
    setPending(true);
    setEroare("");
    const rezultat = await editeazaActualizareAction(orgSlug, actualizare.id, { error: null }, formData);
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
        <form action={onSubmit} className="space-y-3">
          <div>
            <Label>{dict.data}</Label>
            <input
              type="date"
              name="data"
              required
              defaultValue={actualizare.data}
              className="w-full rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] bg-[var(--ci-surface)] px-3 py-2 text-[13px] text-[var(--ci-text)]"
            />
          </div>
          <div>
            <Label>{dict.titlu}</Label>
            <Input name="titlu" required defaultValue={actualizare.titlu} />
          </div>
          <div>
            <Label>{dict.continut}</Label>
            <textarea
              name="continut"
              required
              rows={5}
              defaultValue={actualizare.continut}
              className="w-full rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] bg-[var(--ci-surface)] px-3 py-2 text-[13px] text-[var(--ci-text)]"
            />
          </div>

          {eroare && <p className="text-[13px] text-[var(--ci-red)]">{eroare}</p>}

          <div className="flex justify-end gap-2 border-t border-[var(--ci-border)] pt-3">
            <Button type="button" variant="secondary" onClick={onClose}>
              {dict.anuleaza}
            </Button>
            <Button type="submit" variant="primary" disabled={pending}>
              {pending ? dict.seSalveaza : dict.salveazaModificarile}
            </Button>
          </div>
        </form>
      </div>
    </Dialog>
  );
}
