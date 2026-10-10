"use client";

import { AlertTriangle, ArrowLeft, ArrowRight, Check, CheckCircle2, Copy, ExternalLink, ImagePlus, Info, Monitor, Pencil, Save, Smartphone, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { CAMPAIGN_TEMPLATES, type CampaignPageTemplate } from "@/lib/campaign-templates";
import { JUDETE } from "@/lib/judete";
import { SUME_LUNARE, SUME_RAPIDE } from "@/lib/sume-donatie";
import { useFocusTrap } from "@/lib/use-focus-trap";

import { Button } from "../components/ui/button";
import { Dialog } from "../components/ui/dialog";
import { Input, Label, Select, Textarea } from "../components/ui/input";
import { actualizeazaImaginePaginaAction, creeazaPaginaAdminAction } from "./actions";
import { citesteDraft, salveazaDraft, stergeDraft, type DraftCampanie } from "./campanie-draft";
import { citestePoza, decupeaza, axaDeDecupare, pozitieCss, valideazaFisier, MAX_INTRARE_MB, type PozaCitita } from "./campanie-poza";
import { PrevizualizareCampanie } from "./campanie-previzualizare";
import { arataGol, avertismente, CAMPANIE_GOALA, LIMITE, PASI, parseazaSuma, valideazaPas, valideazaTot, type CampanieForm, type EroriCampanie } from "./campanie-validare";

// Asistentul de creare a unei campanii: 5 pași, previzualizare live a paginii publice, draft păstrat în browser și confirmare la publicare.
// Folosește aceleași acțiuni ca până acum (creeazaPaginaAdminAction + actualizeazaImaginePaginaAction); campania apare public imediat ce e publicată.

const SUGESTII_SUMA = [1000, 5000, 10000, 25000];
const INDICII_POVESTE = [
  { titlu: "Cine are nevoie de ajutor?", text: "Cine sunt oamenii (sau animalele, locul) pe care îi ajuți și ce îi face speciali." },
  { titlu: "Care este problema?", text: "Ce s-a întâmplat sau ce lipsește, spus simplu și fără exagerări." },
  { titlu: "Ce se face cu banii?", text: "Pe ce se cheltuie suma, cât de concret poți." },
  { titlu: "Cum poate ajuta cineva?", text: "Donația, dar și distribuirea campaniei sau alte feluri de a se implica." },
];

type Poza = { fisier: File; citita: PozaCitita };
type Rezultat = { id: string; slug: string; pozaEroare: string | null };

export type CampanieWizardProps = {
  open: boolean;
  onClose: () => void;
  orgSlug: string;
  orgNume: string;
  orgLogoUrl: string | null;
  templateuriDisponibile: CampaignPageTemplate[];
  domeniuImplicit: string | null;
  contactImplicit: { nume: string; email: string };
};

export function CampanieWizard(props: CampanieWizardProps) {
  const { open, onClose, orgSlug, orgNume, orgLogoUrl, templateuriDisponibile, domeniuImplicit, contactImplicit } = props;
  const router = useRouter();
  const radacina = useRef<HTMLDivElement>(null);
  const titluPas = useRef<HTMLHeadingElement>(null);

  const [form, setForm] = useState<CampanieForm>(() => ({
    ...CAMPANIE_GOALA,
    template: domeniuImplicit && templateuriDisponibile.includes(domeniuImplicit as CampaignPageTemplate) ? domeniuImplicit : (templateuriDisponibile[0] ?? "altele"),
    numeCreator: contactImplicit.nume,
    emailCreator: contactImplicit.email,
  }));
  const [pas, setPas] = useState(0);
  const [maxPas, setMaxPas] = useState(0);
  const [arataErori, setArataErori] = useState(false);
  const [poza, setPoza] = useState<Poza | null>(null);
  const [pozaPoz, setPozaPoz] = useState(50);
  const [pozaEroare, setPozaEroare] = useState("");
  const [vedere, setVedere] = useState<"desktop" | "mobil">("desktop");
  const [previewMobil, setPreviewMobil] = useState(false);
  const [draftGasit, setDraftGasit] = useState<DraftCampanie | null>(null);
  const [modificat, setModificat] = useState(false);
  const [statusDraft, setStatusDraft] = useState<"" | "salvat" | "nesalvat">("");
  const [confirma, setConfirma] = useState(false);
  const [seTrimite, setSeTrimite] = useState(false);
  const [eroareServer, setEroareServer] = useState("");
  const [rezultat, setRezultat] = useState<Rezultat | null>(null);
  const [copiat, setCopiat] = useState(false);

  const inchide = useCallback(() => {
    onClose();
  }, [onClose]);
  useFocusTrap(open && !confirma, radacina, () => inchide());

  // Un draft salvat anterior (dacă există) se propune după încărcare — nu se aplică singur.
  useEffect(() => {
    if (!open) return;
    const d = citesteDraft(orgSlug);
    // Citirea din localStorage nu se poate face la randare (serverul nu o are), deci draftul se propune după montare.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (d && !arataGol(d.form)) setDraftGasit(d);
  }, [open, orgSlug]);

  // Salvare automată a draftului, la o scurtă pauză după ultima modificare.
  useEffect(() => {
    if (!modificat || rezultat) return;
    const t = setTimeout(() => setStatusDraft(salveazaDraft(orgSlug, form, pas) ? "salvat" : "nesalvat"), 700);
    return () => clearTimeout(t);
  }, [form, pas, modificat, orgSlug, rezultat]);

  // Eliberează adresa locală a pozei când se schimbă sau când asistentul se închide.
  const pozaUrl = poza?.citita.url ?? null;
  useEffect(() => () => { if (pozaUrl) URL.revokeObjectURL(pozaUrl); }, [pozaUrl]);

  // La schimbarea pasului, focusul și derularea merg la titlul pasului nou.
  useEffect(() => {
    titluPas.current?.focus({ preventScroll: true });
    radacina.current?.querySelector("[data-zona-form]")?.scrollTo({ top: 0 });
  }, [pas]);

  const set = <K extends keyof CampanieForm>(k: K, v: CampanieForm[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setModificat(true);
    setStatusDraft("");
  };

  const erori: EroriCampanie = arataErori ? valideazaPas(pas, form) : {};
  const avertismenteLista = useMemo(() => avertismente(form, !!poza), [form, poza]);
  const pozaPozitie = poza ? pozitieCss(poza.citita.latime, poza.citita.inaltime, pozaPoz) : "50% 50%";

  function mergiLa(p: number) {
    setPas(p);
    setMaxPas((m) => Math.max(m, p));
    setArataErori(false);
  }
  function continua() {
    const e = valideazaPas(pas, form);
    if (Object.keys(e).length) {
      setArataErori(true);
      const prima = Object.keys(e)[0];
      requestAnimationFrame(() => document.getElementById(`camp-${prima}`)?.focus());
      return;
    }
    if (pas < PASI.length - 1) mergiLa(pas + 1);
  }
  function salveazaManual() {
    setStatusDraft(salveazaDraft(orgSlug, form, pas) ? "salvat" : "nesalvat");
  }
  function aplicaDraft(d: DraftCampanie) {
    setForm(d.form);
    setPas(d.pas);
    setMaxPas(d.pas);
    setDraftGasit(null);
    setModificat(true);
  }
  function incepeDeLaZero() {
    stergeDraft(orgSlug);
    setDraftGasit(null);
  }

  async function alegePoza(fisier: File | undefined) {
    if (!fisier) return;
    const eroare = valideazaFisier(fisier);
    if (eroare) {
      setPozaEroare(eroare);
      return;
    }
    try {
      const citita = await citestePoza(fisier);
      setPoza({ fisier, citita });
      setPozaPoz(50);
      setPozaEroare("");
    } catch (e) {
      setPozaEroare(e instanceof Error ? e.message : "Nu am putut citi poza.");
    }
  }

  function incearcaPublicarea() {
    const { primulPas } = valideazaTot(form);
    if (primulPas !== null) {
      setPas(primulPas);
      setArataErori(true);
      return;
    }
    setEroareServer("");
    setConfirma(true);
  }

  async function publica() {
    setSeTrimite(true);
    setEroareServer("");
    try {
      const fd = new FormData();
      fd.set("titlu", form.titlu.trim());
      fd.set("poveste", form.poveste.trim());
      fd.set("template", form.template);
      fd.set("sumaTinta", String(parseazaSuma(form.sumaTinta).valoare ?? ""));
      fd.set("judet", form.judet);
      fd.set("localitate", form.localitate.trim());
      fd.set("numeCreator", form.numeCreator.trim());
      fd.set("emailCreator", form.emailCreator.trim());
      const r = await creeazaPaginaAdminAction(orgSlug, { error: null }, fd);
      if (r.error || !r.id || !r.slug) {
        setEroareServer(r.error ?? "Campania nu a putut fi creată. Încearcă din nou.");
        setConfirma(false);
        return;
      }
      // Pagina există deja; dacă poza eșuează, campania rămâne publicată și i se poate adăuga poza din „Editează”.
      let pozaEroareLocal: string | null = null;
      if (poza) {
        try {
          const taiata = await decupeaza(poza.fisier, poza.citita, pozaPoz);
          const fdPoza = new FormData();
          fdPoza.set("imagine", taiata);
          const ri = await actualizeazaImaginePaginaAction(orgSlug, r.id, { error: null, ok: false }, fdPoza);
          if (ri.error) pozaEroareLocal = ri.error;
        } catch (e) {
          pozaEroareLocal = e instanceof Error ? e.message : "Poza nu s-a putut încărca.";
        }
      }
      stergeDraft(orgSlug);
      setRezultat({ id: r.id, slug: r.slug, pozaEroare: pozaEroareLocal });
      setConfirma(false);
      router.refresh();
    } catch {
      setEroareServer("Nu am putut ajunge la server. Verifică conexiunea și încearcă din nou. Datele tale sunt păstrate.");
      setConfirma(false);
    } finally {
      setSeTrimite(false);
    }
  }

  async function copiazaLink(slug: string) {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/strangere-fonduri/${orgSlug}/${slug}`);
      setCopiat(true);
      setTimeout(() => setCopiat(false), 2000);
    } catch {
      /* clipboard indisponibil: linkul rămâne vizibil pe ecran */
    }
  }

  if (!open) return null;

  const ultim = pas === PASI.length - 1;
  const linkPublic = `alexandrit.ro/strangere-fonduri/${orgSlug}/…`;

  return (
    <div ref={radacina} role="dialog" aria-modal="true" aria-label="Campanie nouă" tabIndex={-1} className="fixed inset-0 z-50 flex flex-col bg-[var(--ci-bg)] text-[var(--ci-text)]">
      {/* Antet */}
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-[var(--ci-border)] bg-[var(--ci-surface)] px-3 sm:px-5">
        <button onClick={inchide} aria-label="Închide asistentul" className="flex h-9 w-9 items-center justify-center rounded-[var(--ci-radius-btn)] text-[var(--ci-text-muted)] transition-colors hover:bg-[var(--ci-surface-2)] hover:text-[var(--ci-text)]">
          <X className="h-5 w-5" />
        </button>
        <h2 className="ci-display text-[15px] font-semibold">{rezultat ? "Campanie publicată" : "Campanie nouă"}</h2>
        {!rezultat && <Stepper pas={pas} maxPas={maxPas} onAlege={mergiLa} />}
        <div className="ml-auto flex items-center gap-2">
          {!rezultat && (
            <span className="hidden text-[12px] text-[var(--ci-text-muted)] sm:block" role="status" aria-live="polite">
              {statusDraft === "salvat" ? "✓ Draft salvat în acest browser" : statusDraft === "nesalvat" ? "Draftul nu s-a putut salva" : ""}
            </span>
          )}
          {!rezultat && (
            <Button variant="secondary" size="sm" className="lg:hidden" onClick={() => { if (!previewMobil && window.innerWidth < 640) setVedere("mobil"); setPreviewMobil((v) => !v); }}>
              {previewMobil ? <Pencil className="h-3.5 w-3.5" /> : <Monitor className="h-3.5 w-3.5" />}
              {previewMobil ? "Formular" : "Previzualizare"}
            </Button>
          )}
        </div>
      </header>
      {!rezultat && (
        <div className="h-1 shrink-0 bg-[var(--ci-border)] md:hidden" aria-hidden="true">
          <div className="h-full bg-[var(--ci-primary)] transition-all" style={{ width: `${((pas + 1) / PASI.length) * 100}%` }} />
        </div>
      )}

      {rezultat ? (
        <Succes rezultat={rezultat} orgSlug={orgSlug} copiat={copiat} onCopiaza={() => copiazaLink(rezultat.slug)} onInchide={inchide} />
      ) : (
        <>
          <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_minmax(440px,540px)]">
            {/* Formular */}
            <div data-zona-form className={`min-h-0 overflow-y-auto ${previewMobil ? "hidden lg:block" : ""}`}>
              <div className="mx-auto w-full max-w-[600px] px-4 py-7 sm:px-6 sm:py-9">
                <p className="text-[12px] font-semibold tracking-wide text-[var(--ci-text-muted)] uppercase">
                  Pasul {pas + 1} din {PASI.length}
                </p>

                {draftGasit && pas === 0 && (
                  <div className="mt-3 mb-5 flex flex-col gap-3 rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] bg-[var(--ci-primary-soft)] px-4 py-3 text-[13px] sm:flex-row sm:items-center">
                    <span className="min-w-0 flex-1">
                      Ai un draft salvat{draftGasit.salvatLa ? ` pe ${new Date(draftGasit.salvatLa).toLocaleDateString("ro-RO", { day: "numeric", month: "long" })}` : ""}
                      {draftGasit.form.titlu.trim() ? `: „${draftGasit.form.titlu.trim().slice(0, 50)}”` : ""}.
                    </span>
                    <span className="flex gap-2">
                      <Button size="sm" variant="primary" onClick={() => aplicaDraft(draftGasit)}>Continuă draftul</Button>
                      <Button size="sm" variant="secondary" onClick={incepeDeLaZero}>Începe de la zero</Button>
                    </span>
                  </div>
                )}

                {pas === 0 && <PasDetalii form={form} set={set} erori={erori} templateuri={templateuriDisponibile} />}
                {pas === 1 && <PasPoveste form={form} set={set} erori={erori} titluRef={titluPas} />}
                {pas === 2 && (
                  <PasPoza poza={poza} poz={pozaPoz} setPoz={setPozaPoz} eroare={pozaEroare} onAlege={alegePoza} onSterge={() => { setPoza(null); setPozaEroare(""); }} titluRef={titluPas} />
                )}
                {pas === 3 && <PasDonatii titluRef={titluPas} orgSlug={orgSlug} />}
                {pas === 4 && <PasVerificare form={form} poza={poza} avertismente={avertismenteLista} onModifica={mergiLa} titluRef={titluPas} eroareServer={eroareServer} linkPublic={linkPublic} />}
              </div>
            </div>

            {/* Previzualizare */}
            <aside className={`min-h-0 overflow-y-auto border-[var(--ci-border)] bg-[var(--ci-surface-2)] lg:border-l ${previewMobil ? "block" : "hidden lg:block"}`} aria-label="Previzualizare campanie">
              <div className="mx-auto w-full max-w-[540px] px-4 py-6 sm:px-6">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[13px] font-semibold">Așa o vor vedea donatorii</p>
                    <p className="text-[12px] text-[var(--ci-text-muted)]">Se actualizează pe măsură ce completezi.</p>
                  </div>
                  <div role="group" aria-label="Tip dispozitiv" className="flex overflow-hidden rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] bg-[var(--ci-surface)]">
                    {([["desktop", "Calculator", Monitor], ["mobil", "Telefon", Smartphone]] as const).map(([v, eticheta, Icon]) => (
                      <button
                        key={v}
                        aria-pressed={vedere === v}
                        onClick={() => setVedere(v)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium transition-colors ${vedere === v ? "bg-[var(--ci-primary)] text-white" : "text-[var(--ci-text-muted)] hover:bg-[var(--ci-surface-2)]"}`}
                      >
                        <Icon className="h-3.5 w-3.5" /> {eticheta}
                      </button>
                    ))}
                  </div>
                </div>
                <PrevizualizareCampanie vedere={vedere} form={form} orgNume={orgNume} orgLogoUrl={orgLogoUrl} pozaUrl={pozaUrl} pozaPozitie={pozaPozitie} />
              </div>
            </aside>
          </div>

          {/* Acțiuni — mereu vizibile */}
          <footer className="flex shrink-0 items-center gap-2 border-t border-[var(--ci-border)] bg-[var(--ci-surface)] px-3 py-3 sm:px-6">
            <Button variant="ghost" onClick={() => mergiLa(pas - 1)} disabled={pas === 0 || seTrimite} aria-label="Înapoi" className={`px-2.5 sm:px-3.5 ${pas === 0 ? "invisible" : ""}`}>
              <ArrowLeft className="h-4 w-4" /> <span className="hidden sm:inline">Înapoi</span>
            </Button>
            <span className="ml-auto text-[12px] whitespace-nowrap text-[var(--ci-text-muted)] sm:hidden" aria-live="polite">{statusDraft === "salvat" ? "✓ Salvat" : ""}</span>
            <Button variant="secondary" onClick={salveazaManual} className="sm:ml-auto">
              <Save className="h-4 w-4" /> <span className="hidden sm:inline">Salvează ca draft</span><span className="sm:hidden">Draft</span>
            </Button>
            {ultim ? (
              <Button variant="primary" size="lg" onClick={incearcaPublicarea} disabled={seTrimite} className="h-10 px-4 text-sm sm:h-11 sm:px-5 sm:text-[15px]">
                Publică campania
              </Button>
            ) : (
              <Button variant="primary" size="lg" onClick={continua} className="h-10 px-4 text-sm sm:h-11 sm:px-5 sm:text-[15px]">
                Continuă <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </footer>
        </>
      )}

      <Dialog open={confirma} onClose={() => !seTrimite && setConfirma(false)} title="Publici campania?" width="max-w-md">
        <div className="space-y-4">
          <p className="text-[14px] leading-relaxed text-[var(--ci-text-muted)]">
            Pagina <b className="text-[var(--ci-text)]">„{form.titlu.trim()}”</b> devine publică imediat și poate primi donații. Titlul, povestea și poza se pot modifica oricând după publicare; adresa paginii rămâne aceeași.
          </p>
          <div className="flex justify-end gap-2 border-t border-[var(--ci-border)] pt-4">
            <Button variant="secondary" onClick={() => setConfirma(false)} disabled={seTrimite}>Mai verific</Button>
            <Button variant="primary" onClick={publica} loading={seTrimite}>{seTrimite ? "Se publică…" : "Publică acum"}</Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

// ===== Bara de pași =====
function Stepper({ pas, maxPas, onAlege }: { pas: number; maxPas: number; onAlege: (p: number) => void }) {
  return (
    <nav aria-label="Pașii campaniei" className="mx-auto hidden md:block">
      <ol className="flex items-center gap-1">
        {PASI.map((eticheta, i) => {
          const facut = i < pas;
          const curent = i === pas;
          const accesibil = i <= maxPas;
          return (
            <li key={eticheta} className="flex items-center gap-1">
              {i > 0 && <span className={`h-px w-4 lg:w-7 ${i <= pas ? "bg-[var(--ci-primary)]" : "bg-[var(--ci-border-strong)]"}`} aria-hidden="true" />}
              <button
                onClick={() => accesibil && onAlege(i)}
                disabled={!accesibil}
                aria-current={curent ? "step" : undefined}
                className={`flex items-center gap-2 rounded-full py-1 pr-3 pl-1 text-[13px] font-medium transition-colors disabled:cursor-default ${curent ? "bg-[var(--ci-primary-soft)] text-[var(--ci-primary)]" : accesibil ? "text-[var(--ci-text)] hover:bg-[var(--ci-surface-2)]" : "text-[var(--ci-text-faint)]"}`}
              >
                <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-bold ${facut ? "bg-[var(--ci-primary)] text-white" : curent ? "border-2 border-[var(--ci-primary)] text-[var(--ci-primary)]" : "border border-[var(--ci-border-strong)]"}`}>
                  {facut ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </span>
                <span className="hidden lg:inline">{eticheta}</span>
                <span className="lg:hidden">{curent ? eticheta : ""}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// ===== Câmp cu etichetă, indiciu și eroare lângă câmp =====
function Camp({ id, eticheta, obligatoriu, indiciu, eroare, children }: { id: string; eticheta: string; obligatoriu?: boolean; indiciu?: string; eroare?: string; children: React.ReactNode }) {
  return (
    <div>
      <Label htmlFor={id}>
        {eticheta}
        {obligatoriu && <span className="ml-0.5 text-[var(--ci-text-faint)]" aria-hidden="true"> *</span>}
      </Label>
      {children}
      {eroare ? (
        <p id={`${id}-eroare`} role="alert" className="mt-1.5 text-[12.5px] text-[var(--ci-red)]">{eroare}</p>
      ) : indiciu ? (
        <p id={`${id}-indiciu`} className="mt-1.5 text-[12.5px] text-[var(--ci-text-muted)]">{indiciu}</p>
      ) : null}
    </div>
  );
}

type PasProps = { form: CampanieForm; set: <K extends keyof CampanieForm>(k: K, v: CampanieForm[K]) => void; erori: EroriCampanie };
type TitluRef = { titluRef?: React.Ref<HTMLHeadingElement> };

function TitluPas({ titluRef, titlu, subtitlu }: TitluRef & { titlu: string; subtitlu: string }) {
  return (
    <>
      <h3 ref={titluRef} tabIndex={-1} className="ci-display mt-1 text-[24px] leading-tight font-bold outline-none sm:text-[28px]">{titlu}</h3>
      <p className="mt-2 text-[14.5px] leading-relaxed text-[var(--ci-text-muted)]">{subtitlu}</p>
    </>
  );
}

// ===== Pasul 1: detalii =====
function PasDetalii({ form, set, erori, templateuri }: PasProps & { templateuri: CampaignPageTemplate[] }) {
  const suma = parseazaSuma(form.sumaTinta).valoare;
  return (
    <div>
      <TitluPas titlu="Despre ce este campania?" subtitlu="Începe cu esențialul. Toate se pot schimba mai târziu, în afară de adresa paginii." />
      <div className="mt-7 space-y-6">
        <Camp id="camp-titlu" eticheta="Titlul campaniei" obligatoriu eroare={erori.titlu} indiciu="Scurt și concret: ce vrei să schimbi, nu doar numele proiectului.">
          <Input id="camp-titlu" value={form.titlu} onChange={(e) => set("titlu", e.target.value)} maxLength={LIMITE.titluMax} placeholder="ex. Un acoperiș nou pentru centrul de zi" aria-invalid={!!erori.titlu} aria-describedby={erori.titlu ? "camp-titlu-eroare" : "camp-titlu-indiciu"} className="h-11" />
          <p className="mt-1 text-right text-[11.5px] text-[var(--ci-text-faint)]">{form.titlu.length}/{LIMITE.titluMax}</p>
        </Camp>

        <div>
          <p className="mb-1.5 text-[13px] font-medium">Domeniul campaniei <span className="text-[var(--ci-text-faint)]" aria-hidden="true">*</span></p>
          <div role="radiogroup" aria-label="Domeniul campaniei" className="flex flex-wrap gap-2">
            {templateuri.map((id) => {
              const activ = form.template === id;
              return (
                <button
                  key={id}
                  id={activ || (!form.template && id === templateuri[0]) ? "camp-template" : undefined}
                  role="radio"
                  aria-checked={activ}
                  onClick={() => set("template", id)}
                  className={`rounded-full border px-4 py-2 text-[13px] font-medium transition-colors ${activ ? "border-[var(--ci-primary)] bg-[var(--ci-primary-soft)] text-[var(--ci-primary)]" : "border-[var(--ci-border)] hover:border-[var(--ci-border-strong)]"}`}
                >
                  {activ && <Check className="mr-1 inline h-3.5 w-3.5" />}
                  {CAMPAIGN_TEMPLATES[id].nume}
                </button>
              );
            })}
          </div>
          {erori.template ? (
            <p role="alert" className="mt-1.5 text-[12.5px] text-[var(--ci-red)]">{erori.template}</p>
          ) : (
            <p className="mt-1.5 text-[12.5px] text-[var(--ci-text-muted)]">Hotărăște culorile și aspectul paginii publice.</p>
          )}
        </div>

        <Camp id="camp-sumaTinta" eticheta="Suma de care ai nevoie" eroare={erori.sumaTinta} indiciu={suma ? `Pagina va arăta o bară de progres până la ${suma.toLocaleString("ro-RO")} lei.` : "Opțional. Fără țintă, pagina arată doar suma strânsă."}>
          <div className="relative">
            <Input id="camp-sumaTinta" inputMode="numeric" value={form.sumaTinta} onChange={(e) => set("sumaTinta", e.target.value.replace(/[^\d.\s]/g, ""))} placeholder="10.000" aria-invalid={!!erori.sumaTinta} aria-describedby={erori.sumaTinta ? "camp-sumaTinta-eroare" : "camp-sumaTinta-indiciu"} className="h-11 pr-12" />
            <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[13px] text-[var(--ci-text-muted)]">lei</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {SUGESTII_SUMA.map((s) => (
              <button key={s} onClick={() => set("sumaTinta", s.toLocaleString("ro-RO"))} className="rounded-full border border-[var(--ci-border)] px-3 py-1 text-[12.5px] text-[var(--ci-text-muted)] transition-colors hover:border-[var(--ci-border-strong)] hover:text-[var(--ci-text)]">
                {s.toLocaleString("ro-RO")} lei
              </button>
            ))}
          </div>
        </Camp>

        <div className="grid gap-4 sm:grid-cols-2">
          <Camp id="camp-judet" eticheta="Județ" indiciu="Opțional. Ajută la recomandarea presei și a grupurilor locale.">
            <Select id="camp-judet" value={form.judet} onChange={(e) => set("judet", e.target.value)} className="h-11">
              <option value="">Alege județul</option>
              {JUDETE.map((j) => (
                <option key={j} value={j}>{j}</option>
              ))}
            </Select>
          </Camp>
          <Camp id="camp-localitate" eticheta="Localitate">
            <Input id="camp-localitate" value={form.localitate} onChange={(e) => set("localitate", e.target.value)} placeholder="ex. Turda" className="h-11" />
          </Camp>
        </div>

        <fieldset className="rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] bg-[var(--ci-surface)] p-4">
          <legend className="px-1 text-[13px] font-semibold">Persoana de contact</legend>
          <p className="mb-3 text-[12.5px] text-[var(--ci-text-muted)]">Cine coordonează campania. Completat cu datele contului tău; îl poți schimba.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Camp id="camp-numeCreator" eticheta="Nume" obligatoriu eroare={erori.numeCreator}>
              <Input id="camp-numeCreator" value={form.numeCreator} onChange={(e) => set("numeCreator", e.target.value)} autoComplete="name" aria-invalid={!!erori.numeCreator} aria-describedby={erori.numeCreator ? "camp-numeCreator-eroare" : undefined} />
            </Camp>
            <Camp id="camp-emailCreator" eticheta="Email" obligatoriu eroare={erori.emailCreator}>
              <Input id="camp-emailCreator" type="email" value={form.emailCreator} onChange={(e) => set("emailCreator", e.target.value)} autoComplete="email" aria-invalid={!!erori.emailCreator} aria-describedby={erori.emailCreator ? "camp-emailCreator-eroare" : undefined} />
            </Camp>
          </div>
        </fieldset>
      </div>
    </div>
  );
}

// ===== Pasul 2: povestea =====
function PasPoveste({ form, set, erori, titluRef }: PasProps & TitluRef) {
  const lungime = form.poveste.trim().length;
  const adauga = (titlu: string) => set("poveste", `${form.poveste.trimEnd()}${form.poveste.trim() ? "\n\n" : ""}${titlu}\n`);
  return (
    <div>
      <TitluPas titluRef={titluRef} titlu="Spune povestea campaniei" subtitlu="Oamenii donează pentru oameni. O poveste sinceră și concretă convinge mai mult decât una lungă." />
      <div className="mt-6 space-y-5">
        <Camp id="camp-poveste" eticheta="Povestea campaniei" obligatoriu eroare={erori.poveste}>
          <Textarea id="camp-poveste" value={form.poveste} onChange={(e) => set("poveste", e.target.value)} maxLength={LIMITE.povesteMax} rows={12} className="min-h-[280px] text-[15px] leading-relaxed" placeholder="Începe cu o frază care spune cine ești și pe cine ajuți…" aria-invalid={!!erori.poveste} aria-describedby={erori.poveste ? "camp-poveste-eroare" : "camp-poveste-contor"} />
          <p id="camp-poveste-contor" className="mt-1.5 flex justify-between gap-3 text-[12px] text-[var(--ci-text-muted)]">
            <span>Lasă un rând liber între paragrafe. Textul se afișează exact cum îl scrii.</span>
            <span className={`ci-tabular shrink-0 ${lungime >= LIMITE.povesteRecomandat ? "text-[var(--ci-green)]" : ""}`}>{lungime.toLocaleString("ro-RO")} / {LIMITE.povesteMax.toLocaleString("ro-RO")}</span>
          </p>
        </Camp>

        <div className="rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] bg-[var(--ci-surface)] p-4">
          <p className="flex items-center gap-2 text-[13px] font-semibold"><Info className="h-4 w-4 text-[var(--ci-primary)]" /> Ce merită spus</p>
          <p className="mt-1 text-[12.5px] text-[var(--ci-text-muted)]">Apasă pe o întrebare ca s-o adaugi în text, apoi răspunde-i.</p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {INDICII_POVESTE.map((i) => (
              <li key={i.titlu}>
                <button onClick={() => adauga(i.titlu)} className="h-full w-full rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] p-3 text-left transition-colors hover:border-[var(--ci-primary)] hover:bg-[var(--ci-primary-soft)]">
                  <span className="block text-[13px] font-semibold">{i.titlu}</span>
                  <span className="mt-0.5 block text-[12px] text-[var(--ci-text-muted)]">{i.text}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

// ===== Pasul 3: poza =====
function PasPoza({ poza, poz, setPoz, eroare, onAlege, onSterge, titluRef }: { poza: Poza | null; poz: number; setPoz: (n: number) => void; eroare: string; onAlege: (f: File | undefined) => void; onSterge: () => void } & TitluRef) {
  const input = useRef<HTMLInputElement>(null);
  const [peste, setPeste] = useState(false);
  const axa = poza ? axaDeDecupare(poza.citita.latime, poza.citita.inaltime) : null;
  return (
    <div>
      <TitluPas titluRef={titluRef} titlu="Adaugă o fotografie" subtitlu="Poza principală apare în capul paginii și când linkul e distribuit pe rețele. Alege una reală, luminoasă și orizontală." />
      <div className="mt-6">
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" id="camp-poza" onChange={(e) => { onAlege(e.target.files?.[0]); e.target.value = ""; }} />
        {!poza ? (
          <label
            htmlFor="camp-poza"
            onDragOver={(e) => { e.preventDefault(); setPeste(true); }}
            onDragLeave={() => setPeste(false)}
            onDrop={(e) => { e.preventDefault(); setPeste(false); onAlege(e.dataTransfer.files?.[0]); }}
            className={`flex aspect-[16/9] w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-[var(--ci-radius-card)] border-2 border-dashed px-4 text-center transition-colors focus-within:ring-2 focus-within:ring-[var(--ci-primary)] ${peste ? "border-[var(--ci-primary)] bg-[var(--ci-primary-soft)]" : "border-[var(--ci-border-strong)] bg-[var(--ci-surface)] hover:border-[var(--ci-primary)]"}`}
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--ci-primary-soft)] text-[var(--ci-primary)]"><ImagePlus className="h-6 w-6" /></span>
            <span className="text-[14px] font-semibold">Trage poza aici sau apasă ca s-o alegi</span>
            <span className="text-[12.5px] text-[var(--ci-text-muted)]">JPG, PNG sau WebP, până la {MAX_INTRARE_MB} MB. O decupăm automat la 16:9.</span>
          </label>
        ) : (
          <div className="space-y-4">
            <div className="relative aspect-[16/9] w-full overflow-hidden rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] bg-[var(--ci-surface-2)]">
              {/* eslint-disable-next-line @next/next/no-img-element -- previzualizare locală (blob:) */}
              <img src={poza.citita.url} alt="Poza aleasă pentru campanie" className="h-full w-full object-cover" style={{ objectPosition: pozitieCss(poza.citita.latime, poza.citita.inaltime, poz) }} />
            </div>
            {axa && (
              <div>
                <Label htmlFor="camp-poz">{axa === "y" ? "Ce parte a pozei se vede (sus ↔ jos)" : "Ce parte a pozei se vede (stânga ↔ dreapta)"}</Label>
                <input id="camp-poz" type="range" min={0} max={100} value={poz} onChange={(e) => setPoz(Number(e.target.value))} className="w-full accent-[var(--ci-primary)]" />
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => input.current?.click()}><ImagePlus className="h-4 w-4" /> Schimbă poza</Button>
              <Button variant="ghost" onClick={onSterge}><Trash2 className="h-4 w-4" /> Elimină</Button>
            </div>
          </div>
        )}
        {eroare && <p role="alert" className="mt-2 text-[12.5px] text-[var(--ci-red)]">{eroare}</p>}

        <ul className="mt-6 space-y-1.5 text-[13px] text-[var(--ci-text-muted)]">
          <li>• Folosește o poză făcută de voi sau pentru care ai acordul persoanelor din ea. La minori, cere acordul părinților.</li>
          <li>• Evită textul pe poză și imaginile întunecate sau neclare.</li>
          <li>• Pasul e opțional: poza se poate adăuga și după publicare, din „Editează”.</li>
        </ul>
      </div>
    </div>
  );
}

// ===== Pasul 4: donațiile =====
function PasDonatii({ titluRef, orgSlug }: TitluRef & { orgSlug: string }) {
  const [lunar, setLunar] = useState(false);
  const sume = lunar ? SUME_LUNARE : SUME_RAPIDE;
  return (
    <div>
      <TitluPas titluRef={titluRef} titlu="Cum vor dona oamenii" subtitlu="Formularul de donație e pregătit și identic pentru toate campaniile. Iată ce vor vedea donatorii." />
      <div className="mt-6 rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] bg-[var(--ci-surface)] p-5">
        <p className="text-[12px] font-semibold tracking-wide text-[var(--ci-text-muted)] uppercase">Exemplu de formular</p>
        <div role="group" aria-label="Frecvența donației" className="mt-3 inline-flex overflow-hidden rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] text-[13px] font-medium">
          <button aria-pressed={!lunar} onClick={() => setLunar(false)} className={`px-4 py-2 transition-colors ${!lunar ? "bg-[var(--ci-primary)] text-white" : "hover:bg-[var(--ci-surface-2)]"}`}>O singură dată</button>
          <button aria-pressed={lunar} onClick={() => setLunar(true)} className={`px-4 py-2 transition-colors ${lunar ? "bg-[var(--ci-primary)] text-white" : "hover:bg-[var(--ci-surface-2)]"}`}>Lunar</button>
        </div>
        <div className="mt-3 grid grid-cols-4 gap-2">
          {sume.map((s, i) => (
            <span key={s} className={`rounded-[var(--ci-radius-btn)] border py-2.5 text-center text-[14px] font-bold ${i === 1 ? "border-[var(--ci-primary)] bg-[var(--ci-primary-soft)] text-[var(--ci-primary)]" : "border-[var(--ci-border)]"}`}>{s} lei</span>
          ))}
        </div>
        <p className="mt-3 text-[12.5px] text-[var(--ci-text-muted)]">Donatorul poate scrie și altă sumă. {lunar ? "Donațiile lunare pornesc de la sume mici, ca să rămână ani la rând." : ""}</p>
      </div>

      <ul className="mt-6 space-y-3">
        {[
          ["Donație unică sau lunară", "Donatorul alege singur dacă donează o dată sau în fiecare lună."],
          ["Plată cu cardul, procesată securizat", "Plata se face pe pagina de plată securizată; donatorul primește automat un email de mulțumire."],
          ["Suma strânsă se actualizează singură", "Bara de progres și lista donațiilor recente se completează pe măsură ce vin donațiile."],
        ].map(([t, d]) => (
          <li key={t} className="flex gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[var(--ci-green)]" />
            <span><b className="block text-[14px] font-semibold">{t}</b><span className="text-[13px] text-[var(--ci-text-muted)]">{d}</span></span>
          </li>
        ))}
      </ul>

      <p className="mt-6 rounded-[var(--ci-radius-card)] bg-[var(--ci-surface-2)] px-4 py-3 text-[12.5px] text-[var(--ci-text-muted)]">
        Sumele sugerate sunt aceleași pentru toate campaniile și nu se pot personaliza încă. Metodele de plată și datele organizației se gestionează din{" "}
        <Link href={`/${orgSlug}/crm/setari`} target="_blank" className="font-medium text-[var(--ci-primary)] underline">Setări</Link>.
      </p>
    </div>
  );
}

// ===== Pasul 5: verificare =====
function PasVerificare({ form, poza, avertismente: lista, onModifica, titluRef, eroareServer, linkPublic }: { form: CampanieForm; poza: Poza | null; avertismente: ReturnType<typeof avertismente>; onModifica: (p: number) => void; eroareServer: string; linkPublic: string } & TitluRef) {
  const { erori } = valideazaTot(form);
  const lipsa = Object.values(erori);
  const suma = parseazaSuma(form.sumaTinta).valoare;
  const loc = [form.localitate.trim(), form.judet].filter(Boolean).join(", ");
  return (
    <div>
      <TitluPas titluRef={titluRef} titlu="Verifică și publică" subtitlu="Aruncă o privire peste rezumat. După publicare, campania poate primi donații imediat." />

      {eroareServer && (
        <div role="alert" className="mt-5 flex gap-3 rounded-[var(--ci-radius-card)] border border-[var(--ci-red)]/30 bg-[var(--ci-red-soft)] p-4 text-[13.5px]">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--ci-red)]" />
          <span><b>Nu am putut publica campania.</b> {eroareServer} Datele tale sunt păstrate; poți încerca din nou.</span>
        </div>
      )}
      {lipsa.length > 0 && (
        <div role="alert" className="mt-5 flex gap-3 rounded-[var(--ci-radius-card)] border border-[var(--ci-red)]/30 bg-[var(--ci-red-soft)] p-4 text-[13.5px]">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--ci-red)]" />
          <span><b>Mai ai de completat:</b> {lipsa.join(" ")}</span>
        </div>
      )}

      <div className="mt-5 divide-y divide-[var(--ci-border)] rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] bg-[var(--ci-surface)] px-4">
        <RandRezumat onModifica={onModifica} eticheta="Titlu" valoare={form.titlu.trim() || "Lipsește"} pas={0} gol={!form.titlu.trim()} />
        <RandRezumat onModifica={onModifica} eticheta="Domeniu" valoare={CAMPAIGN_TEMPLATES[form.template as CampaignPageTemplate]?.nume ?? "Nealeas"} pas={0} />
        <RandRezumat onModifica={onModifica} eticheta="Sumă țintă" valoare={suma ? `${suma.toLocaleString("ro-RO")} lei` : "Fără țintă"} pas={0} gol={!suma} />
        <RandRezumat onModifica={onModifica} eticheta="Locație" valoare={loc || "Necompletată"} pas={0} gol={!loc} />
        <RandRezumat onModifica={onModifica} eticheta="Poveste" valoare={form.poveste.trim() ? `${form.poveste.trim().slice(0, 140)}${form.poveste.trim().length > 140 ? "…" : ""}` : "Lipsește"} pas={1} gol={!form.poveste.trim()} />
        <RandRezumat onModifica={onModifica} eticheta="Fotografie" valoare={poza ? poza.fisier.name : "Fără poză"} pas={2} gol={!poza} />
        <RandRezumat onModifica={onModifica} eticheta="Persoană de contact" valoare={`${form.numeCreator.trim()} · ${form.emailCreator.trim()}`} pas={0} />
      </div>

      {lista.length > 0 && (
        <div className="mt-5 rounded-[var(--ci-radius-card)] border border-[var(--ci-amber)]/30 bg-[var(--ci-amber-soft)] p-4">
          <p className="flex items-center gap-2 text-[13.5px] font-semibold"><Info className="h-4 w-4 text-[var(--ci-amber)]" /> Poți publica și așa, dar merită verificat</p>
          <ul className="mt-2 space-y-2">
            {lista.map((a) => (
              <li key={a.cheie} className="flex items-start justify-between gap-3 text-[13px]">
                <span>{a.text}</span>
                <button onClick={() => onModifica(a.pas)} className="shrink-0 font-medium text-[var(--ci-primary)] underline">Rezolv</button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-5 text-[12.5px] text-[var(--ci-text-muted)]">Pagina va fi publică la {linkPublic}. Adresa exactă se generează din titlu și nu se schimbă după publicare.</p>
    </div>
  );
}

// ===== După publicare =====
function Succes({ rezultat, orgSlug, copiat, onCopiaza, onInchide }: { rezultat: Rezultat; orgSlug: string; copiat: boolean; onCopiaza: () => void; onInchide: () => void }) {
  const cale = `/strangere-fonduri/${orgSlug}/${rezultat.slug}`;
  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-4 py-12">
      <div className="mx-auto max-w-[560px] text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--ci-green-soft)] text-[var(--ci-green)]"><CheckCircle2 className="h-9 w-9" /></span>
        <h3 className="ci-display mt-5 text-[28px] leading-tight font-bold">Campania ta este publică</h3>
        <p className="mt-2 text-[15px] text-[var(--ci-text-muted)]">Oricine are linkul poate dona acum. Trimite-l primelor persoane apropiate: primele donații dau încredere celorlalți.</p>

        {rezultat.pozaEroare && (
          <p role="alert" className="mt-5 rounded-[var(--ci-radius-card)] border border-[var(--ci-amber)]/30 bg-[var(--ci-amber-soft)] p-3 text-left text-[13px]">
            Campania e publicată, dar poza nu s-a încărcat: {rezultat.pozaEroare} O poți adăuga din „Editează”, în lista de campanii.
          </p>
        )}

        <div className="mt-6 flex items-center gap-2 rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] bg-[var(--ci-surface)] p-2 pl-4 text-left">
          <span className="min-w-0 flex-1 truncate text-[13.5px] text-[var(--ci-text-muted)]">alexandrit.ro{cale}</span>
          <Button variant="secondary" size="sm" onClick={onCopiaza}>{copiat ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}{copiat ? "Copiat" : "Copiază"}</Button>
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <a href={cale} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center gap-2 rounded-[var(--ci-radius-btn)] bg-[var(--ci-primary)] px-5 text-[15px] font-medium text-white hover:bg-[var(--ci-primary-hover)]"><ExternalLink className="h-4 w-4" /> Vezi pagina publică</a>
          <Link href={`/${orgSlug}/crm/strangere-fonduri/${rezultat.id}`} className="inline-flex h-11 items-center gap-2 rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] bg-[var(--ci-surface)] px-5 text-[15px] font-medium hover:bg-[var(--ci-surface-2)]">Deschide campania în CRM</Link>
        </div>
        <button onClick={onInchide} className="mt-5 text-[13px] font-medium text-[var(--ci-text-muted)] underline hover:text-[var(--ci-text)]">Închide</button>
      </div>
    </div>
  );
}

function RandRezumat({ eticheta, valoare, pas, gol, onModifica }: { eticheta: string; valoare: string; pas: number; gol?: boolean; onModifica: (p: number) => void }) {
  return (
    <div className="flex items-start gap-3 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-medium text-[var(--ci-text-muted)]">{eticheta}</p>
        <p className={`mt-0.5 text-[14px] break-words ${gol ? "text-[var(--ci-text-faint)] italic" : "font-medium"}`}>{valoare}</p>
      </div>
      <button onClick={() => onModifica(pas)} className="flex shrink-0 items-center gap-1 rounded-[var(--ci-radius-btn)] px-2 py-1 text-[12.5px] font-medium text-[var(--ci-primary)] hover:bg-[var(--ci-primary-soft)]">
        <Pencil className="h-3 w-3" /> Modifică
      </button>
    </div>
  );
}
