"use client";

import { useParams } from "next/navigation";
import { useState } from "react";

import { Button } from "../components/ui/button";
import { Dialog } from "../components/ui/dialog";
import { Input, Textarea } from "../components/ui/input";
import { useLocale } from "../lib/locale-context";
import { COMPANII_DICT } from "@/lib/i18n/dictionaries/companii";
import { adaugaContact, adaugaFirma, cautaDateAnaf, type DateAnaf } from "./actions";

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
  marcaje = [],
}: {
  marcaje?: string[];
  open: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const locale = useLocale();
  const dict = COMPANII_DICT[locale].addDialog;
  const [pending, setPending] = useState(false);
  const [eroare, setEroare] = useState("");
  const [valori, setValori] = useState({ nume: "", cui: "", nrRegCom: "", judet: "", localitate: "", adresa: "", caen: "" });
  const [anaf, setAnaf] = useState<DateAnaf | null>(null);
  const [anafPending, setAnafPending] = useState(false);
  const [anafMesaj, setAnafMesaj] = useState("");
  const [cuiCautat, setCuiCautat] = useState("");
  const seteaza = (k: keyof typeof valori, v: string) => setValori((p) => ({ ...p, [k]: v }));

  // „Adu date din ANAF”: pe baza CUI-ului completează datele de identificare și ultimul bilanț (cifră de afaceri, profit, angajați).
  // Pornește singur când ieși din câmpul CUI; câmpurile deja completate de tine nu se suprascriu.
  async function aduAnaf(cui: string) {
    const cifre = cui.replace(/\D/g, "");
    if (cifre.length < 2 || cifre === cuiCautat) return;
    setCuiCautat(cifre);
    setAnafPending(true);
    setAnafMesaj("");
    const r = await cautaDateAnaf(orgSlug, cui);
    setAnafPending(false);
    if (r.error || !r.date) {
      setAnaf(null);
      setCuiCautat("");
      setAnafMesaj(r.error ?? "Nu am găsit date în ANAF.");
      return;
    }
    const d = r.date;
    setAnaf(d);
    setValori((p) => ({
      ...p,
      nume: p.nume.trim() ? p.nume : (d.denumire ?? ""),
      nrRegCom: p.nrRegCom.trim() ? p.nrRegCom : (d.nrRegCom ?? ""),
      judet: p.judet.trim() ? p.judet : (d.judet ?? ""),
      localitate: p.localitate.trim() ? p.localitate : (d.localitate ?? ""),
      adresa: p.adresa.trim() ? p.adresa : (d.adresa ?? ""),
      caen: p.caen.trim() ? p.caen : (d.caen ?? ""),
    }));
    setAnafMesaj(d.activ ? "Date preluate din ANAF." : "Atenție: firma apare ca inactivă fiscal în ANAF.");
  }

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
        {marcaje.map((m) => (
          <input key={m} type="hidden" name="marcaj" value={m} />
        ))}
        {marcaje.includes("d177") && <p className="rounded-md bg-[var(--ci-primary-soft)] px-3 py-2 text-[13px] text-[var(--ci-primary)]">Firma se adaugă direct în lista D177.</p>}
        <Sectiune titlu="Date firmă">
          <Rand eticheta={dict.numeFirma}>
            <Input name="nume" required autoFocus placeholder={dict.numeFirmaPlaceholder} value={valori.nume} onChange={(e) => seteaza("nume", e.target.value)} />
          </Rand>
          <Rand eticheta={dict.cui}>
            <div>
              <div className="flex gap-2">
                <Input
                  name="cui"
                  placeholder={dict.cuiPlaceholder}
                  value={valori.cui}
                  onChange={(e) => seteaza("cui", e.target.value)}
                  onBlur={(e) => void aduAnaf(e.target.value)}
                  className="min-w-0 flex-1"
                />
                <Button type="button" variant="secondary" disabled={anafPending || valori.cui.replace(/\D/g, "").length < 2} onClick={() => { setCuiCautat(""); void aduAnaf(valori.cui); }}>
                  {anafPending ? "Se caută…" : "Adu date din ANAF"}
                </Button>
              </div>
              {anafMesaj && <p className={`mt-1 text-[12px] ${anaf && anaf.activ ? "text-[var(--ci-green)]" : "text-[var(--ci-amber)]"}`}>{anafMesaj}</p>}
            </div>
          </Rand>
          <Rand eticheta="Nr. Reg. Com.">
            <Input name="nrRegCom" placeholder="ex. J40/1234/2015" value={valori.nrRegCom} onChange={(e) => seteaza("nrRegCom", e.target.value)} />
          </Rand>
          <Rand eticheta={dict.judet}>
            <Input name="judet" placeholder={dict.judetPlaceholder} value={valori.judet} onChange={(e) => seteaza("judet", e.target.value)} />
          </Rand>
          <Rand eticheta="Localitate">
            <Input name="localitate" value={valori.localitate} onChange={(e) => seteaza("localitate", e.target.value)} />
          </Rand>
          <Rand eticheta="Adresă">
            <Input name="adresa" value={valori.adresa} onChange={(e) => seteaza("adresa", e.target.value)} />
          </Rand>
          <Rand eticheta="CAEN">
            <Input name="caen" placeholder="ex. 6201" value={valori.caen} onChange={(e) => seteaza("caen", e.target.value)} />
          </Rand>
          <Rand eticheta="Industrie">
            <Input name="industrie" />
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

        {anaf && (
          <>
            <input type="hidden" name="anafActiv" value={anaf.activ ? "1" : "0"} />
            {anaf.anInfiintare != null && <input type="hidden" name="anInfiintare" value={anaf.anInfiintare} />}
            {anaf.ca != null && <input type="hidden" name="ca" value={anaf.ca} />}
            {anaf.profit != null && <input type="hidden" name="profit" value={anaf.profit} />}
            {anaf.nrAngajati != null && <input type="hidden" name="nrAngajati" value={anaf.nrAngajati} />}
            {anaf.anBilant != null && <input type="hidden" name="anBilant" value={anaf.anBilant} />}
            <Sectiune titlu={`Date financiare din ANAF${anaf.anBilant ? ` (bilanț ${anaf.anBilant})` : ""}`}>
              <Rand eticheta="Cifra de afaceri">
                <span className="text-[13px] font-medium text-[var(--ci-text)]">{anaf.ca != null ? `${anaf.ca.toLocaleString("ro-RO")} RON` : "—"}</span>
              </Rand>
              <Rand eticheta="Profit / pierdere">
                <span className="text-[13px] font-medium text-[var(--ci-text)]">{anaf.profit != null ? `${anaf.profit.toLocaleString("ro-RO")} RON` : "—"}</span>
              </Rand>
              <Rand eticheta="Număr angajați">
                <span className="text-[13px] font-medium text-[var(--ci-text)]">{anaf.nrAngajati != null ? anaf.nrAngajati.toLocaleString("ro-RO") : "—"}</span>
              </Rand>
            </Sectiune>
          </>
        )}
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
