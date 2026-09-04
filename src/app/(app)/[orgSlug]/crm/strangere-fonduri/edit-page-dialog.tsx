"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "../components/ui/button";
import { Dialog } from "../components/ui/dialog";
import { Input, Label } from "../components/ui/input";
import { useLocale } from "../lib/locale-context";
import { STRANGERE_FONDURI_DICT } from "@/lib/i18n/dictionaries/strangere-fonduri";
import { actualizeazaImaginePaginaAction, editeazaPaginaAdminAction } from "./actions";

export type PaginaEditabila = {
  id: string;
  titlu: string;
  poveste: string;
  sumaTinta: number | null;
  numeCreator: string;
  emailCreator: string;
  imagineUrl: string | null;
};

export function EditPageDialog({
  open,
  onClose,
  orgSlug,
  pagina,
}: {
  open: boolean;
  onClose: () => void;
  orgSlug: string;
  pagina: PaginaEditabila;
}) {
  const router = useRouter();
  const locale = useLocale();
  const dict = STRANGERE_FONDURI_DICT[locale].editPageDialog;
  const [pending, setPending] = useState(false);
  const [eroare, setEroare] = useState("");

  async function onSubmit(formData: FormData) {
    setPending(true);
    setEroare("");

    const imagine = formData.get("imagine");
    if (imagine instanceof File && imagine.size > 0) {
      const rezultatImagine = await actualizeazaImaginePaginaAction(orgSlug, pagina.id, { error: null, ok: false }, formData);
      if (rezultatImagine.error) {
        setPending(false);
        setEroare(rezultatImagine.error);
        return;
      }
    }

    const rezultat = await editeazaPaginaAdminAction(orgSlug, pagina.id, { error: null }, formData);
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
            <Label>{dict.pozaCoperta}</Label>
            {pagina.imagineUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- domeniu Supabase Storage dinamic
              <img
                src={pagina.imagineUrl}
                alt=""
                className="mb-2 aspect-video w-full rounded-lg border border-[var(--ci-border)] object-cover"
              />
            )}
            <input
              type="file"
              name="imagine"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="w-full text-[12px] text-[var(--ci-text-muted)] file:mr-2 file:rounded-lg file:border-0 file:bg-[var(--ci-surface-2)] file:px-2.5 file:py-1.5 file:text-[12px] file:font-medium file:text-[var(--ci-text)]"
            />
            <p className="mt-1 text-[11.5px] text-[var(--ci-text-faint)]">{dict.pozaCopertaNota}</p>
          </div>
          <div>
            <Label>{dict.numeResponsabil}</Label>
            <Input name="numeCreator" required defaultValue={pagina.numeCreator} />
          </div>
          <div>
            <Label>{dict.emailContact}</Label>
            <Input type="email" name="emailCreator" required defaultValue={pagina.emailCreator} />
          </div>
          <div>
            <Label>{dict.titluCampanie}</Label>
            <Input name="titlu" required defaultValue={pagina.titlu} />
          </div>
          <div>
            <Label>{dict.poveste}</Label>
            <textarea
              name="poveste"
              required
              rows={5}
              defaultValue={pagina.poveste}
              className="w-full rounded-lg border border-[var(--ci-border)] bg-[var(--ci-surface)] px-3 py-2 text-[13px] text-[var(--ci-text)]"
            />
          </div>
          <div>
            <Label>{dict.sumaTinta}</Label>
            <Input type="number" name="sumaTinta" min={1} step={1} defaultValue={pagina.sumaTinta ?? ""} />
          </div>

          {eroare && <p className="text-[13px] text-[var(--ci-red)]">{eroare}</p>}

          <div className="flex justify-end gap-2 border-t border-[var(--ci-border)] pt-3">
            <Button type="button" variant="secondary" onClick={onClose}>
              {dict.anuleaza}
            </Button>
            <Button type="submit" variant="primary" disabled={pending}>
              {pending ? dict.seSalveaza : dict.salveaza}
            </Button>
          </div>
        </form>
      </div>
    </Dialog>
  );
}
