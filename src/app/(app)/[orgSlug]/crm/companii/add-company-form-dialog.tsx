"use client";

import { useParams } from "next/navigation";
import { useState } from "react";

import { Button } from "../components/ui/button";
import { Dialog } from "../components/ui/dialog";
import { Input, Textarea } from "../components/ui/input";
import { useLocale } from "../lib/locale-context";
import { COMPANII_DICT } from "@/lib/i18n/dictionaries/companii";
import { adaugaContact, adaugaFirma } from "./actions";

// Rând de tabel: eticheta în stânga, câmpul în dreapta (pe telefon, unul sub altul).
function Rand({ eticheta, children }: { eticheta: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 items-center gap-1 border-b border-[var(--ci-border)] py-2 last:border-0 sm:grid-cols-[170px_minmax(0,1fr)] sm:gap-3">
      <span className="text-[13px] text-[var(--ci-text-muted)]">{eticheta}</span>
      {children}
    </div>
  );
}

function Sectiune({ titlu, children }: { titlu: string; children: React.ReactNode }) {
  return (
    <section>
      <p className="mb-1 text-[11px] font-bold tracking-wide text-[var(--ci-text-muted)] uppercase">{titlu}</p>
      <div className="rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] px-3">{children}</div>
    </section>
  );
}

// Adaugă o firmă REALĂ (companies) cu TOATE datele din tabul „Prezentare” + opțional o persoană de contact reală
// (contacts). Suma contractului se înregistrează și ca sponsorizare. Folosit atât din meniul global „Ce vrei să
// adaugi?” cât și din butonul „Adaugă firmă” de pe /crm/companii.
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
      contactData.set("rol", String(formData.get("rolContact") ?? ""));
      contactData.set("email", String(formData.get("emailContact") ?? ""));
      contactData.set("telefon", String(formData.get("telefonContact") ?? ""));
      const contact = await adaugaContact(orgSlug, { error: null }, contactData);
      if (contact.error) {
        // Firma s-a creat cu succes — nu blocăm fluxul pentru o eroare pe contactul opțional, doar o afișăm.
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
    <Dialog open={open} onClose={onClose} title={dict.title} width="max-w-2xl">
      <form action={onSubmit} className="space-y-4">
        <Sectiune titlu="Date firmă">
          <Rand eticheta={dict.numeFirma}>
            <Input name="nume" required autoFocus placeholder={dict.numeFirmaPlaceholder} />
          </Rand>
          <Rand eticheta={dict.cui}>
            <Input name="cui" placeholder={dict.cuiPlaceholder} />
          </Rand>
          <Rand eticheta="Nr. Reg. Com.">
            <Input name="nrRegCom" placeholder="ex. J40/1234/2015" />
          </Rand>
          <Rand eticheta={dict.judet}>
            <Input name="judet" placeholder={dict.judetPlaceholder} />
          </Rand>
          <Rand eticheta="Localitate">
            <Input name="localitate" />
          </Rand>
          <Rand eticheta="Adresă">
            <Input name="adresa" />
          </Rand>
          <Rand eticheta="CAEN">
            <Input name="caen" placeholder="ex. 6201" />
          </Rand>
          <Rand eticheta="Industrie">
            <Input name="industrie" />
          </Rand>
          <Rand eticheta="An înființare">
            <Input name="anInfiintare" type="number" min="1800" max="2100" inputMode="numeric" />
          </Rand>
          <Rand eticheta="Website">
            <Input name="site" placeholder="https://…" />
          </Rand>
          <Rand eticheta="LinkedIn (pagina firmei)">
            <Input name="linkedin" placeholder="linkedin.com/company/…" />
          </Rand>
          <Rand eticheta="Facebook (pagina firmei)">
            <Input name="facebook" placeholder="facebook.com/numele-paginii" />
          </Rand>
          <Rand eticheta="Administrator">
            <Input name="administrator" />
          </Rand>
        </Sectiune>

        <Sectiune titlu="Financiar">
          <Rand eticheta="Cifra de afaceri (RON)">
            <Input name="ca" type="number" inputMode="numeric" />
          </Rand>
          <Rand eticheta="Profit (RON)">
            <Input name="profit" type="number" inputMode="numeric" />
          </Rand>
          <Rand eticheta="Număr angajați">
            <Input name="nrAngajati" type="number" min="0" inputMode="numeric" />
          </Rand>
        </Sectiune>

        <Sectiune titlu="Contract și sponsorizare">
          <Rand eticheta={dict.sumaContract}>
            <div>
              <Input name="sumaContract" type="number" min="0" step="1" inputMode="numeric" placeholder={dict.sumaContractPlaceholder} />
              <p className="mt-1 text-[11px] text-[var(--ci-text-faint)]">Se înregistrează și ca sponsorizare; o poți defalca apoi pe campanii, în tabul Sponsorizări.</p>
            </div>
          </Rand>
          <Rand eticheta={dict.nrContractLabel}>
            <Input name="numarContract" placeholder={dict.nrContractPlaceholder} />
          </Rand>
          <Rand eticheta="Data semnării">
            <Input name="dataSemnare" type="date" />
          </Rand>
          <Rand eticheta="Notă">
            <Textarea name="nota" rows={2} />
          </Rand>
        </Sectiune>

        <Sectiune titlu={dict.persoanaContact}>
          <Rand eticheta={dict.numePrenume}>
            <Input name="numeContact" placeholder={dict.numeContactPlaceholder} />
          </Rand>
          <Rand eticheta="Funcție">
            <Input name="rolContact" placeholder="ex. Director general" />
          </Rand>
          <Rand eticheta={dict.nrContact}>
            <Input name="telefonContact" type="tel" placeholder="+40…" />
          </Rand>
          <Rand eticheta={dict.dateContact}>
            <Input type="email" name="emailContact" placeholder="nume@firma.ro" />
          </Rand>
        </Sectiune>

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
