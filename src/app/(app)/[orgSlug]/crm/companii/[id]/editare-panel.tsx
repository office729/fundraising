"use client";

import { Trash2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "../../components/ui/button";
import { Input, Label, Textarea } from "../../components/ui/input";
import { useLocale } from "../../lib/locale-context";
import { COMPANII_DICT } from "@/lib/i18n/dictionaries/companii";
import { editeazaFirma, stergeFirma } from "../actions";

type Firma = {
  nume: string; cui: string | null; judet: string | null; localitate: string | null; adresa: string | null;
  caen: string | null; industrie: string | null; site: string | null; linkedin: string | null; facebook: string | null;
  administrator: string | null; ca: number | null; profit: number | null; nrAngajati: number | null; nota: string | null;
};

export function EditarePanel({ companyId, firma }: { companyId: string; firma: Firma }) {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const router = useRouter();
  const locale = useLocale();
  const dict = COMPANII_DICT[locale].detail.editare;
  const [pending, setPending] = useState(false);
  const [eroare, setEroare] = useState("");
  const [salvat, setSalvat] = useState(false);
  const [sterge, setSterge] = useState(false);

  async function onSubmit(formData: FormData) {
    setPending(true);
    setEroare("");
    setSalvat(false);
    const r = await editeazaFirma(orgSlug, companyId, formData);
    setPending(false);
    if (r.error) {
      setEroare(r.error);
      return;
    }
    setSalvat(true);
    router.refresh();
    setTimeout(() => setSalvat(false), 1500);
  }

  async function onSterge() {
    if (!window.confirm(dict.confirmaStergere(firma.nume))) return;
    setSterge(true);
    await stergeFirma(orgSlug, companyId);
    router.push(`/${orgSlug}/crm/companii`);
  }

  return (
    <form action={onSubmit} className="max-w-2xl space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label>{dict.numeFirma}</Label>
          <Input name="nume" defaultValue={firma.nume} required />
        </div>
        <div>
          <Label>{dict.cui}</Label>
          <Input name="cui" defaultValue={firma.cui ?? ""} />
        </div>
        <div>
          <Label>{dict.judet}</Label>
          <Input name="judet" defaultValue={firma.judet ?? ""} />
        </div>
        <div>
          <Label>{dict.localitate}</Label>
          <Input name="localitate" defaultValue={firma.localitate ?? ""} />
        </div>
        <div className="sm:col-span-2">
          <Label>{dict.adresa}</Label>
          <Input name="adresa" defaultValue={firma.adresa ?? ""} />
        </div>
        <div>
          <Label>{dict.caen}</Label>
          <Input name="caen" defaultValue={firma.caen ?? ""} />
        </div>
        <div>
          <Label>{dict.industrie}</Label>
          <Input name="industrie" defaultValue={firma.industrie ?? ""} />
        </div>
        <div>
          <Label>{dict.website}</Label>
          <Input name="site" defaultValue={firma.site ?? ""} />
        </div>
        <div>
          <Label>{dict.linkedin}</Label>
          <Input name="linkedin" defaultValue={firma.linkedin ?? ""} />
        </div>
        <div>
          <Label>{dict.facebook}</Label>
          <Input name="facebook" defaultValue={firma.facebook ?? ""} />
        </div>
        <div>
          <Label>{dict.administrator}</Label>
          <Input name="administrator" defaultValue={firma.administrator ?? ""} />
        </div>
        <div>
          <Label>{dict.ca}</Label>
          <Input type="number" name="ca" defaultValue={firma.ca ?? ""} />
        </div>
        <div>
          <Label>{dict.profit}</Label>
          <Input type="number" name="profit" defaultValue={firma.profit ?? ""} />
        </div>
        <div>
          <Label>{dict.nrAngajati}</Label>
          <Input type="number" name="nrAngajati" defaultValue={firma.nrAngajati ?? ""} />
        </div>
      </div>
      <div>
        <Label>{dict.notaInterna}</Label>
        <Textarea name="nota" defaultValue={firma.nota ?? ""} rows={3} />
      </div>

      {eroare && <p className="text-[13px] text-[var(--ci-red)]">{eroare}</p>}

      <div className="flex items-center justify-between border-t border-[var(--ci-border)] pt-4">
        <button
          type="button"
          onClick={onSterge}
          disabled={sterge}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium text-[var(--ci-red)] hover:bg-[var(--ci-red-soft)] disabled:opacity-50"
        >
          <Trash2 className="h-3.5 w-3.5" /> {dict.stergeFirma}
        </button>
        <div className="flex items-center gap-2">
          {salvat && <span className="text-[12px] text-[var(--ci-green)]">{dict.salvat}</span>}
          <Button type="submit" variant="primary" disabled={pending}>
            {pending ? dict.seSalveaza : dict.salveazaModificarile}
          </Button>
        </div>
      </div>
    </form>
  );
}
