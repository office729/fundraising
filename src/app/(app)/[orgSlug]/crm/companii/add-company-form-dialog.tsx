"use client";

import { useParams } from "next/navigation";
import { useState } from "react";

import { Button } from "../components/ui/button";
import { Dialog } from "../components/ui/dialog";
import { Input, Label } from "../components/ui/input";
import { useLocale } from "../lib/locale-context";
import { COMPANII_DICT } from "@/lib/i18n/dictionaries/companii";
import { adaugaContact, adaugaFirma } from "./actions";

// Adaugă o firmă REALĂ (companies) + opțional o persoană de contact reală
// (contacts) — spre deosebire de components/add-company-dialog.tsx, care e
// vechiul dialog al prototipului „Calm Impact" (scrie doar în localStorage,
// mock). Folosit atât din meniul global „Ce vrei să adaugi?" cât și din
// butonul „Adaugă firmă" de pe /crm/companii.
export function AddCompanyFormDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const locale = useLocale();
  const dict = COMPANII_DICT[locale].addDialog;
  const [pending, setPending] = useState(false);
  const [eroare, setEroare] = useState("");

  async function onSubmit(formData: FormData) {
    setPending(true);
    setEroare("");
    const firma = await adaugaFirma(orgSlug, { error: null }, formData);
    if (firma.error || !firma.id) {
      setPending(false);
      setEroare(firma.error ?? dict.eroareGenerica);
      return;
    }

    const numeContact = String(formData.get("numeContact") ?? "").trim();
    if (numeContact) {
      const contactData = new FormData();
      contactData.set("companyId", firma.id);
      contactData.set("nume", numeContact);
      contactData.set("email", String(formData.get("emailContact") ?? ""));
      contactData.set("telefon", String(formData.get("telefonContact") ?? ""));
      const contact = await adaugaContact(orgSlug, { error: null }, contactData);
      if (contact.error) {
        // Firma s-a creat cu succes — nu blocăm fluxul pentru o eroare pe
        // contactul opțional, doar o afișăm.
        setEroare(dict.eroareContact(contact.error));
        setPending(false);
        onCreated(firma.id);
        return;
      }
    }

    setPending(false);
    onCreated(firma.id);
  }

  return (
    <Dialog open={open} onClose={onClose} title={dict.title} width="max-w-md">
      <form action={onSubmit} className="space-y-3">
        <div>
          <Label>{dict.numeFirma}</Label>
          <Input name="nume" required autoFocus placeholder={dict.numeFirmaPlaceholder} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label>{dict.judet}</Label>
            <Input name="judet" placeholder={dict.judetPlaceholder} />
          </div>
          <div>
            <Label>{dict.cui}</Label>
            <Input name="cui" placeholder={dict.cuiPlaceholder} />
          </div>
        </div>

        <div className="border-t border-[var(--ci-border)] pt-3">
          <p className="mb-2.5 text-[13px] font-semibold text-[var(--ci-text)]">{dict.persoanaContact}</p>
          <div className="space-y-3">
            <div>
              <Label>{dict.numePrenume}</Label>
              <Input name="numeContact" placeholder={dict.numeContactPlaceholder} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>{dict.nrContact}</Label>
                <Input name="telefonContact" placeholder="+40…" />
              </div>
              <div>
                <Label>{dict.dateContact}</Label>
                <Input type="email" name="emailContact" placeholder="nume@firma.ro" />
              </div>
            </div>
          </div>
        </div>

        {eroare && <p className="text-[13px] text-[var(--ci-red)]">{eroare}</p>}

        <div className="flex justify-end gap-2 border-t border-[var(--ci-border)] pt-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            {dict.anuleaza}
          </Button>
          <Button type="submit" variant="primary" disabled={pending}>
            {pending ? dict.seAdauga : dict.adaugaFirma}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
