"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "../components/ui/button";
import { Dialog } from "../components/ui/dialog";
import { Input, Label } from "../components/ui/input";
import { useLocale } from "../lib/locale-context";
import { motivNedistribuibil } from "@/lib/campanii/distribuibil";
import { CAMPAIGN_TEMPLATES, type CampaignPageTemplate } from "@/lib/campaign-templates";
import { CAMPANII_ACORDURI_DICT } from "@/lib/i18n/dictionaries/campanii-acorduri";
import { STRANGERE_FONDURI_DICT } from "@/lib/i18n/dictionaries/strangere-fonduri";
import { STRANGERE_FONDURI_UI_DICT } from "@/lib/i18n/dictionaries/strangere-fonduri-ui";
import { actualizeazaImaginePaginaAction, editeazaPaginaAdminAction } from "./actions";

export type PaginaEditabila = {
  id: string;
  titlu: string;
  poveste: string;
  sumaTinta: number | null;
  termen: string | null;
  numeCreator: string;
  emailCreator: string;
  imagineUrl: string | null;
  judet: string | null;
  localitate: string | null;
  template: CampaignPageTemplate;
  // Acordurile și protecția datelor (GDPR): decid dacă campania poate pleca la AI sau către public.
  consimtamantGdpr: boolean;
  minor: boolean;
  acordDistribuireMinor: boolean;
  anonimizat: boolean;
  acordRetras: boolean;
  acordDiagnostic: boolean;
};

const CHEI_BIFE = ["minor", "acordDistribuireMinor", "anonimizat", "acordRetras", "acordDiagnostic"] as const;

const bifeDin = (p: PaginaEditabila) => ({ minor: p.minor, acordDistribuireMinor: p.acordDistribuireMinor, anonimizat: p.anonimizat, acordRetras: p.acordRetras, acordDiagnostic: p.acordDiagnostic });

export function EditPageDialog({
  open,
  onClose,
  orgSlug,
  pagina,
  templateuriDisponibile,
}: {
  open: boolean;
  onClose: () => void;
  orgSlug: string;
  pagina: PaginaEditabila;
  templateuriDisponibile: CampaignPageTemplate[];
}) {
  const router = useRouter();
  const locale = useLocale();
  const dict = STRANGERE_FONDURI_DICT[locale].editPageDialog;
  const teme = STRANGERE_FONDURI_UI_DICT[locale].teme;
  const [pending, setPending] = useState(false);
  const [eroare, setEroare] = useState("");
  const ac = CAMPANII_ACORDURI_DICT[locale];
  const [bife, setBife] = useState(() => bifeDin(pagina));
  const motivAcord = motivNedistribuibil({ ...bife, consimtamantGdpr: pagina.consimtamantGdpr });

  // La închidere fără salvare, bifele revin la ce e salvat.
  function inchide() {
    setBife(bifeDin(pagina));
    setEroare("");
    onClose();
  }

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
    <Dialog open={open} onClose={inchide} title={dict.title} width="max-w-md">
      <div className="space-y-3">
        <form action={onSubmit} className="space-y-3">
          <div>
            <Label>{dict.pozaCoperta}</Label>
            {pagina.imagineUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- domeniu Supabase Storage dinamic
              <img
                src={pagina.imagineUrl}
                alt=""
                className="mb-2 aspect-video w-full rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] object-cover"
              />
            )}
            <input
              type="file"
              name="imagine"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="w-full text-[12px] text-[var(--ci-text-muted)] file:mr-2 file:rounded-[var(--ci-radius-btn)] file:border-0 file:bg-[var(--ci-surface-2)] file:px-2.5 file:py-1.5 file:text-[12px] file:font-medium file:text-[var(--ci-text)]"
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
              className="w-full rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] bg-[var(--ci-surface)] px-3 py-2 text-[13px] text-[var(--ci-text)]"
            />
          </div>
          <div>
            <Label>{dict.sumaTinta}</Label>
            <Input type="number" name="sumaTinta" min={1} step={1} defaultValue={pagina.sumaTinta ?? ""} />
          </div>
          <div>
            <Label>{dict.termen}</Label>
            <Input type="date" name="termen" defaultValue={pagina.termen ?? ""} />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label>{dict.judet}</Label>
              <Input name="judet" placeholder={dict.judetPlaceholder} defaultValue={pagina.judet ?? ""} />
            </div>
            <div>
              <Label>{dict.localitate}</Label>
              <Input name="localitate" defaultValue={pagina.localitate ?? ""} />
            </div>
          </div>
          <p className="text-[11.5px] text-[var(--ci-text-faint)]">{dict.localitateNota}</p>

          {templateuriDisponibile.length > 1 && (
            <div>
              <Label>{dict.design}</Label>
              <div className="mt-1.5 grid grid-cols-4 gap-2">
                {templateuriDisponibile.map((id) => {
                  const tpl = CAMPAIGN_TEMPLATES[id];
                  return (
                    <label key={id} className="cursor-pointer" data-domeniu={id}>
                      <input
                        type="radio"
                        name="template"
                        value={id}
                        defaultChecked={pagina.template === id}
                        className="peer sr-only"
                      />
                      <div className="h-10 w-full rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] bg-gradient-to-br from-brand-blue to-brand-green peer-checked:border-brand-green peer-checked:ring-2 peer-checked:ring-brand-green" />
                      <span className="mt-1 block text-center text-[11px] font-medium text-[var(--ci-text-muted)]">
                        {teme[id] ?? tpl.nume}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          <fieldset className="space-y-2 rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] p-3">
            <legend className="px-1 text-[12.5px] font-semibold text-[var(--ci-text)]">{ac.titlu}</legend>
            <p className="text-[11.5px] text-[var(--ci-text-faint)]">{ac.intro}</p>
            <input type="hidden" name="acorduriTrimise" value="1" />
            {CHEI_BIFE.filter((k) => k !== "acordDistribuireMinor" || bife.minor).map((k) => (
              <label key={k} className="flex items-start gap-2 text-[13px] text-[var(--ci-text)]">
                <input
                  type="checkbox"
                  name={k}
                  value="1"
                  checked={bife[k]}
                  onChange={(e) => setBife((b) => ({ ...b, [k]: e.target.checked }))}
                  className="mt-0.5 h-4 w-4 shrink-0"
                />
                <span>
                  {ac[k]}
                  {k === "acordDiagnostic" && <span className="block text-[11.5px] text-[var(--ci-text-faint)]">{ac.acordDiagnosticNota}</span>}
                </span>
              </label>
            ))}
            {motivAcord && (
              <p className="rounded-[var(--ci-radius-btn)] bg-[var(--ci-amber-soft)] px-2.5 py-1.5 text-[12px] text-[var(--ci-amber)]">
                {ac.avertisment} {ac.motive[motivAcord]}
              </p>
            )}
          </fieldset>

          {eroare && <p className="text-[13px] text-[var(--ci-red)]">{eroare}</p>}

          <div className="flex justify-end gap-2 border-t border-[var(--ci-border)] pt-3">
            <Button type="button" variant="secondary" onClick={inchide}>
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
