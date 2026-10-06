"use client";

import { ExternalLink, Heart, Phone, Trash2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "../../components/ui/button";
import { CallButton } from "../../components/call-button";
import { Dialog } from "../../components/ui/dialog";
import { Input, Label } from "../../components/ui/input";
import { EmptyState } from "../../components/ui/states";
import { useLocale } from "../../lib/locale-context";
import { COMPANII_DICT } from "@/lib/i18n/dictionaries/companii";
import { urlWebSigur } from "@/lib/validation";
import { adaugaContact, comutaContactCheie, stergeContact, type PersoanaDeAprobat } from "../actions";
import { DeAprobat, InformareGdpr, PasulUrmator, PlanB, type FirmaGhid } from "./contacte-ghid";
import { seteazaConsimtamantContact } from "./fisa-actions";
import { NegasitMarcaj } from "./pagini-sociale";

type Contact = {
  id: string; nume: string; rol: string | null; email: string | null; telefon: string | null; linkedin: string | null;
  dept?: string | null; cheie?: boolean; consentStatus?: string | null;
};

type Prefill = { nume: string; rol: string; dept: string };
const GOL: Prefill = { nume: "", rol: "", dept: "" };

export function ContactePanel({
  companyId,
  contacte,
  firma,
  deAprobat,
  negasit,
  orgNume,
  emailContact,
}: {
  companyId: string;
  contacte: Contact[];
  firma: FirmaGhid;
  deAprobat: PersoanaDeAprobat[];
  negasit: { la: string; deNume: string | null } | null;
  orgNume: string;
  emailContact: string | null;
}) {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const router = useRouter();
  const locale = useLocale();
  const dict = COMPANII_DICT[locale].detail.contacte;
  const [open, setOpen] = useState(false);
  const [prefill, setPrefill] = useState<Prefill>(GOL);
  const [pending, setPending] = useState(false);
  const [eroare, setEroare] = useState("");
  const [sterge, setSterge] = useState<string | null>(null);

  function deschide(p: Prefill = GOL) {
    setPrefill(p);
    setEroare("");
    setOpen(true);
  }

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

  async function comutaCheie(id: string, acum: boolean) {
    await comutaContactCheie(orgSlug, id, !acum);
    router.refresh();
  }

  async function onSterge(id: string) {
    if (!window.confirm(dict.confirmaStergere)) return;
    setSterge(id);
    await stergeContact(orgSlug, id);
    router.refresh();
  }

  async function onConsimtamant(id: string, status: "da" | "nu" | "necunoscut") {
    let dovada: string | null = null;
    if (status === "da") {
      dovada = window.prompt("Dovada acordului (cum și când l-a dat?), ex. a acceptat pe telefon, 12.10");
      if (!dovada || !dovada.trim()) return;
    }
    const r = await seteazaConsimtamantContact(orgSlug, id, status, dovada);
    if (r.error) window.alert(r.error);
    router.refresh();
  }
  const adaugaAdministrator = () => deschide({ nume: firma.administrator ?? "", rol: "Administrator", dept: "Conducere" });
  const actiune = "flex min-h-8 min-w-8 items-center justify-center rounded-[var(--ci-radius-btn)] text-[var(--ci-text-faint)] hover:bg-[var(--ci-surface-2)]";

  return (
    <div className="min-w-0 space-y-3">
      <PasulUrmator contacte={contacte} nrDeAprobat={deAprobat.length} firma={firma} onAdaugaAdministrator={adaugaAdministrator} />

      <DeAprobat companyId={companyId} persoane={deAprobat} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-[var(--ci-text-muted)]">
          {locale === "ro" ? "Apasă " : "Tap "}
          <Heart className="inline h-3.5 w-3.5 fill-current align-[-2px]" />
          {locale === "ro" ? " ca să marchezi un contact direct." : " to mark a direct contact."}
        </p>
        <Button variant="primary" onClick={() => deschide()}>
          + {dict.adaugaContact.replace(/^\+\s*/, "")}
        </Button>
      </div>

      {contacte.length === 0 ? (
        <EmptyState title={dict.niciunContact} />
      ) : (
        <div className="space-y-2">
          {[...contacte].sort((a, b) => Number(!!b.cheie) - Number(!!a.cheie)).map((c) => (
            <div key={c.id} className="rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] bg-[var(--ci-surface)] px-4 py-3">
              <div className="flex min-w-0 items-start gap-2">
                <button
                  type="button"
                  onClick={() => comutaCheie(c.id, !!c.cheie)}
                  title={locale === "ro" ? "Contact prioritar / direct" : "Priority / direct contact"}
                  aria-pressed={!!c.cheie}
                  className={`mt-0.5 flex min-h-8 min-w-8 shrink-0 items-center justify-center ${c.cheie ? "text-[var(--ci-red)]" : "text-[var(--ci-text-faint)] hover:text-[var(--ci-red)]"}`}
                >
                  <Heart className={`h-5 w-5 ${c.cheie ? "fill-current" : ""}`} />
                </button>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold break-words text-[var(--ci-text)]">
                    {c.nume}
                    {c.rol && <span className="font-normal text-[var(--ci-text-muted)]"> — {c.rol}</span>}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    {c.consentStatus === "da" && (
                      <span className="rounded-full bg-[var(--ci-green-soft)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--ci-green)]">{locale === "ro" ? "consimț." : "consent"}</span>
                    )}
                    {c.consentStatus === "nu" && <span className="rounded-full bg-[var(--ci-red-soft)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--ci-red)]">{locale === "ro" ? "a refuzat" : "declined"}</span>}
                    {c.dept && <span className="rounded-full bg-[var(--ci-blue-soft)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--ci-blue)]">{c.dept}</span>}
                  </div>
                  <p className="mt-1 text-[13px] break-all text-[var(--ci-text-muted)]">
                    {c.email || dict.faraEmail}
                    {c.telefon ? ` · ${c.telefon}` : ""}
                  </p>
                </div>
              </div>

              {/* Acțiunile stau sub nume, pe rând întreg — pe telefon nu mai împing numele în afara chenarului. */}
              <div className="mt-2 flex flex-wrap items-center gap-2 pl-10">
                {c.telefon && c.consentStatus !== "nu" && (
                  <a
                    href={`tel:${c.telefon.replace(/[^\d+]/g, "")}`}
                    className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-[var(--ci-radius-btn)] bg-[var(--ci-green)] px-4 text-[14px] font-semibold text-white sm:hidden"
                  >
                    <Phone className="h-4 w-4" /> Sună
                  </a>
                )}
                {c.telefon && c.consentStatus !== "nu" && (
                  <span className="hidden sm:inline-flex">
                    <CallButton telefon={c.telefon} nume={c.nume} companyId={companyId} />
                  </span>
                )}
                {c.linkedin && (
                  <a href={urlWebSigur(c.linkedin) ?? "#"} target="_blank" rel="noreferrer" className="flex min-h-8 items-center gap-1 text-[12px] font-medium text-[var(--ci-blue)] hover:underline">
                    <ExternalLink className="h-3.5 w-3.5" /> {dict.linkedin}
                  </a>
                )}
                <label className="flex min-h-8 items-center gap-1.5 text-[12px] text-[var(--ci-text-muted)]">
                  Acord
                  <select
                    value={c.consentStatus ?? "necunoscut"}
                    onChange={(e) => onConsimtamant(c.id, e.target.value as "da" | "nu" | "necunoscut")}
                    className="h-8 rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] bg-[var(--ci-surface)] px-1.5 text-[12px] text-[var(--ci-text)]"
                  >
                    <option value="necunoscut">necunoscut</option>
                    <option value="da">da</option>
                    <option value="nu">nu (a refuzat)</option>
                  </select>
                </label>                <button type="button" onClick={() => onSterge(c.id)} disabled={sterge === c.id} title={dict.stergeContactTitle} className={`${actiune} ml-auto hover:text-[var(--ci-red)] disabled:opacity-50`}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {contacte.length > 0 && (
        <div className="rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] bg-[var(--ci-surface)] p-4">
          <p className="text-[12px] font-bold tracking-wide text-[var(--ci-text-muted)] uppercase">Nu găsești persoana potrivită?</p>
          <PlanB firma={firma} onAdaugaAdministrator={adaugaAdministrator} />
        </div>
      )}

      <div className="rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] bg-[var(--ci-surface)] px-4 py-3">
        <NegasitMarcaj companyId={companyId} negasit={negasit} />
      </div>

      <InformareGdpr orgNume={orgNume} emailContact={emailContact} />

      <Dialog open={open} onClose={() => setOpen(false)} title={dict.dialogTitle} width="max-w-sm">
        <form key={`${prefill.nume}|${open}`} action={onSubmit} className="space-y-3">
          <input type="hidden" name="companyId" value={companyId} />
          <input type="hidden" name="dept" value={prefill.dept} />
          <div>
            <Label>{dict.nume}</Label>
            <Input name="nume" required autoFocus defaultValue={prefill.nume} />
          </div>
          <div>
            <Label>{dict.rol}</Label>
            <Input name="rol" placeholder={dict.rolPlaceholder} defaultValue={prefill.rol} />
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
