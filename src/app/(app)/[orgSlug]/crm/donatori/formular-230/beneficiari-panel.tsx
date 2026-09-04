"use client";

import { Check, Copy, Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";

import { Button } from "../../components/ui/button";
import { Dialog } from "../../components/ui/dialog";
import { Input, Label } from "../../components/ui/input";
import { formatDataRelativa } from "../../lib/format";
import { useLocale } from "../../lib/locale-context";
import { FORMULAR230_DICT } from "@/lib/i18n/dictionaries/formular230";
import {
  adaugaBeneficiarAction,
  editeazaBeneficiarAction,
  stergeBeneficiarAction,
  type BeneficiarState,
} from "./beneficiari-actions";

export type BeneficiarRand = {
  id: string;
  nume: string;
  slug: string;
  shortCode: string | null;
  iban: string | null;
  cif: string | null;
  emailBeneficiar: string | null;
  createdAt: Date;
  nrFormulare: number;
};

const SLUG_PRINCIPAL = "principal";

export function BeneficiariPanel({ orgSlug, beneficiari }: { orgSlug: string; beneficiari: BeneficiarRand[] }) {
  const locale = useLocale();
  const dict = FORMULAR230_DICT[locale].beneficiari;
  const [adaugaOpen, setAdaugaOpen] = useState(false);
  const [editeazaId, setEditeazaId] = useState<string | null>(null);
  const editeaza = beneficiari.find((b) => b.id === editeazaId) ?? null;

  return (
    <div className="rounded-xl border border-[var(--ci-border)] bg-[var(--ci-surface)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[13px] font-semibold text-[var(--ci-text)]">{dict.titlu}</p>
          <p className="mt-0.5 text-[12px] text-[var(--ci-text-muted)]">{dict.subtitlu}</p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setAdaugaOpen(true)}>
          <Plus className="h-3.5 w-3.5" /> {dict.adaugaCont}
        </Button>
      </div>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-left text-[13px]">
          <thead>
            <tr className="border-b border-[var(--ci-border)] text-[11px] font-semibold text-[var(--ci-text-muted)] uppercase">
              <th className="py-2 pr-3">{dict.numeCont}</th>
              <th className="py-2 pr-3">{dict.iban}</th>
              <th className="py-2 pr-3">{dict.urlFormular}</th>
              <th className="py-2 pr-3">{dict.emailBeneficiar}</th>
              <th className="py-2 pr-3 text-right">{dict.nrFormulare}</th>
              <th className="sticky right-0 bg-[var(--ci-surface)] py-2 pr-0 pl-3 text-right">{dict.actiuni}</th>
            </tr>
          </thead>
          <tbody>
            {beneficiari.map((b) => (
              <tr key={b.id} className="border-b border-[var(--ci-border)] last:border-0">
                <td className="py-2.5 pr-3 font-medium text-[var(--ci-text)]">
                  {b.nume}
                  {b.slug === SLUG_PRINCIPAL && (
                    <span className="ml-1.5 rounded-full bg-[var(--ci-surface-2)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--ci-text-muted)]">
                      {dict.principal}
                    </span>
                  )}
                </td>
                <td className="py-2.5 pr-3 text-[var(--ci-text-muted)]">{b.iban || "—"}</td>
                <td className="py-2.5 pr-3">
                  <CopyLinkCell orgSlug={orgSlug} slug={b.slug} shortCode={b.shortCode} />
                </td>
                <td className="py-2.5 pr-3 text-[var(--ci-text-muted)]">{b.emailBeneficiar || "—"}</td>
                <td className="ci-tabular py-2.5 pr-3 text-right text-[var(--ci-text)]">{b.nrFormulare}</td>
                <td className="sticky right-0 bg-[var(--ci-surface)] py-2.5 pr-0 pl-3">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => setEditeazaId(b.id)}
                      title={dict.editeazaContul}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--ci-text-faint)] hover:bg-[var(--ci-surface-2)] hover:text-[var(--ci-text)]"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    {b.slug !== SLUG_PRINCIPAL && <StergeButton orgSlug={orgSlug} id={b.id} nume={b.nume} />}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <BeneficiarDialog
        key="adauga"
        orgSlug={orgSlug}
        open={adaugaOpen}
        onClose={() => setAdaugaOpen(false)}
        action={adaugaBeneficiarAction}
        title={dict.dialog.titluAdauga}
      />
      {editeaza && (
        <BeneficiarDialog
          key={editeaza.id}
          orgSlug={orgSlug}
          open
          onClose={() => setEditeazaId(null)}
          action={editeazaBeneficiarAction}
          title={dict.dialog.titluEditeaza(editeaza.nume)}
          initial={editeaza}
        />
      )}
      <p className="mt-2 text-[11px] text-[var(--ci-text-faint)]">
        {dict.creat} {beneficiari.length ? formatDataRelativa(beneficiari[0].createdAt.toISOString()) : ""}
      </p>
    </div>
  );
}

function CopyLinkCell({ orgSlug, slug, shortCode }: { orgSlug: string; slug: string; shortCode: string | null }) {
  const locale = useLocale();
  const dict = FORMULAR230_DICT[locale].beneficiari;
  const [copiat, setCopiat] = useState(false);
  async function copiaza() {
    const link = shortCode
      ? `${window.location.origin}/s/${shortCode}`
      : `${window.location.origin}/f230/${orgSlug}/${slug}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopiat(true);
      setTimeout(() => setCopiat(false), 2000);
    } catch {
      // clipboard indisponibil — ignorăm silențios
    }
  }
  return (
    <button
      onClick={copiaza}
      className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 font-mono text-[12px] text-[var(--ci-blue)] hover:bg-[var(--ci-blue-soft)]"
      title={dict.copiazaLink}
    >
      {shortCode ? `/s/${shortCode}` : `/${slug}`}
      {copiat ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
    </button>
  );
}

function StergeButton({ orgSlug, id, nume }: { orgSlug: string; id: string; nume: string }) {
  const router = useRouter();
  const locale = useLocale();
  const dict = FORMULAR230_DICT[locale].beneficiari;
  const [seSterge, setSeSterge] = useState(false);

  async function sterge() {
    if (!window.confirm(dict.confirmaStergere(nume))) return;
    setSeSterge(true);
    try {
      const rezultat = await stergeBeneficiarAction(orgSlug, id);
      if (rezultat.error) {
        window.alert(rezultat.error);
        return;
      }
      router.refresh();
    } finally {
      setSeSterge(false);
    }
  }

  return (
    <button
      onClick={sterge}
      disabled={seSterge}
      title={dict.stergeContul}
      className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--ci-text-faint)] hover:bg-[var(--ci-red-soft)] hover:text-[var(--ci-red)] disabled:opacity-50"
    >
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  );
}

function BeneficiarDialog({
  orgSlug,
  open,
  onClose,
  action,
  title,
  initial,
}: {
  orgSlug: string;
  open: boolean;
  onClose: () => void;
  action: (orgSlug: string, prevState: BeneficiarState, formData: FormData) => Promise<BeneficiarState>;
  title: string;
  initial?: BeneficiarRand;
}) {
  const router = useRouter();
  const locale = useLocale();
  const dict = FORMULAR230_DICT[locale].beneficiari.dialog;
  const boundAction = action.bind(null, orgSlug);
  const [state, formAction, pending] = useActionState<BeneficiarState, FormData>(boundAction, { error: null, ok: false });

  useEffect(() => {
    if (!state.ok) return;
    router.refresh();
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.ok]);

  return (
    <Dialog open={open} onClose={onClose} title={title} width="max-w-sm">
      <form action={formAction} className="space-y-3">
        {initial && <input type="hidden" name="id" value={initial.id} />}
        <div>
          <Label>{dict.numeLabel}</Label>
          <Input name="nume" defaultValue={initial?.nume} placeholder={dict.numePlaceholder} required autoFocus />
        </div>
        <div>
          <Label>{dict.ibanLabel}</Label>
          <Input name="iban" defaultValue={initial?.iban ?? ""} placeholder="RO.. .... .... .... ...." />
        </div>
        <div>
          <Label>{dict.cifLabel}</Label>
          <Input name="cif" defaultValue={initial?.cif ?? ""} />
        </div>
        <div>
          <Label>{dict.emailLabel}</Label>
          <Input type="email" name="emailBeneficiar" defaultValue={initial?.emailBeneficiar ?? ""} />
        </div>
        <p className="text-[12px] text-[var(--ci-text-muted)]">{dict.nota}</p>

        {state.error && <p className="text-[13px] text-[var(--ci-red)]">{state.error}</p>}

        <div className="flex justify-end gap-2 border-t border-[var(--ci-border)] pt-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            {dict.anuleaza}
          </Button>
          <Button type="submit" variant="primary" disabled={pending}>
            {pending ? dict.seSalveaza : dict.salveaza}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
