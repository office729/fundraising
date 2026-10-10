"use client";

import { caleCampanie } from "@/lib/link-campanie";
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
import { useLocale } from "../lib/locale-context";
import { actualizeazaImaginePaginaAction, creeazaPaginaAdminAction } from "./actions";
import { citesteDraft, salveazaDraft, stergeDraft, type DraftCampanie } from "./campanie-draft";
import { axaDeDecupare, citestePoza, decupeaza, MAX_INTRARE_MB, pozitieCss, valideazaFisier, type PozaCitita } from "./campanie-poza";
import { PrevizualizareCampanie } from "./campanie-previzualizare";
import { TEXTE_CAMPANIE, type CodEroare } from "./campanie-texte";
import { adaugaZile, arataGol, aziRo, avertismente, CAMPANIE_GOALA, LIMITE, NR_PASI, parseazaSuma, parseazaTermen, valideazaPas, valideazaTot, type CampanieForm, type EroriCampanie } from "./campanie-validare";

// Asistentul de creare a unei campanii: 5 pași, previzualizare live a paginii publice, draft păstrat în browser și confirmare la publicare.
// Folosește aceleași acțiuni ca până acum (creeazaPaginaAdminAction + actualizeazaImaginePaginaAction); campania apare public imediat ce e publicată.
// Textele sunt în campanie-texte.ts (română și engleză, după limba platformei).

const SUGESTII_SUMA = [1000, 5000, 10000, 25000];
const SUGESTII_TERMEN = [30, 60, 90];

type Limba = "ro" | "en";
type Texte = (typeof TEXTE_CAMPANIE)["ro"];
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

const dataLocala = (iso: string, limba: Limba, scurt = false) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString(limba === "ro" ? "ro-RO" : "en-GB", scurt ? { day: "numeric", month: "long" } : { day: "numeric", month: "long", year: "numeric" });

export function CampanieWizard(props: CampanieWizardProps) {
  const { open, onClose, orgSlug, orgNume, orgLogoUrl, templateuriDisponibile, domeniuImplicit, contactImplicit } = props;
  const router = useRouter();
  const locale = useLocale();
  const t = TEXTE_CAMPANIE[locale];
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
    const timer = setTimeout(() => setStatusDraft(salveazaDraft(orgSlug, form, pas) ? "salvat" : "nesalvat"), 700);
    return () => clearTimeout(timer);
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
    if (pas < NR_PASI - 1) mergiLa(pas + 1);
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
    const cod = valideazaFisier(fisier);
    if (cod) {
      setPozaEroare(cod === "tip" ? t.poza.tipInvalid : t.poza.prea(MAX_INTRARE_MB));
      return;
    }
    try {
      const citita = await citestePoza(fisier);
      setPoza({ fisier, citita });
      setPozaPoz(50);
      setPozaEroare("");
    } catch {
      setPozaEroare(t.poza.nuCitit);
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
      fd.set("termen", form.termen.trim());
      fd.set("judet", form.judet);
      fd.set("localitate", form.localitate.trim());
      fd.set("numeCreator", form.numeCreator.trim());
      fd.set("emailCreator", form.emailCreator.trim());
      const r = await creeazaPaginaAdminAction(orgSlug, { error: null }, fd);
      if (r.error || !r.id || !r.slug) {
        setEroareServer(r.error ?? t.asistent.creareEsuata);
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
          pozaEroareLocal = e instanceof Error ? e.message : "—";
        }
      }
      stergeDraft(orgSlug);
      setRezultat({ id: r.id, slug: r.slug, pozaEroare: pozaEroareLocal });
      setConfirma(false);
      router.refresh();
    } catch {
      setEroareServer(t.asistent.reteaEsuata);
      setConfirma(false);
    } finally {
      setSeTrimite(false);
    }
  }

  async function copiazaLink(slug: string) {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${caleCampanie(orgSlug, slug)}`);
      setCopiat(true);
      setTimeout(() => setCopiat(false), 2000);
    } catch {
      /* clipboard indisponibil: linkul rămâne vizibil pe ecran */
    }
  }

  if (!open) return null;

  const ultim = pas === NR_PASI - 1;
  const linkPublic = `alexandrit.ro/${orgSlug}/…`;
  const a = t.asistent;

  return (
    <div ref={radacina} role="dialog" aria-modal="true" aria-label={a.eticheta} tabIndex={-1} className="fixed inset-0 z-50 flex flex-col bg-[var(--ci-bg)] text-[var(--ci-text)]">
      {/* Antet */}
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-[var(--ci-border)] bg-[var(--ci-surface)] px-3 sm:px-5">
        <button onClick={inchide} aria-label={a.inchide} className="flex h-9 w-9 items-center justify-center rounded-[var(--ci-radius-btn)] text-[var(--ci-text-muted)] transition-colors hover:bg-[var(--ci-surface-2)] hover:text-[var(--ci-text)]">
          <X className="h-5 w-5" />
        </button>
        <h2 className="ci-display text-[15px] font-semibold">{rezultat ? a.publicata : a.eticheta}</h2>
        {!rezultat && <Stepper t={t} pas={pas} maxPas={maxPas} onAlege={mergiLa} />}
        <div className="ml-auto flex items-center gap-2">
          {!rezultat && (
            <span className="hidden text-[12px] text-[var(--ci-text-muted)] sm:block" role="status" aria-live="polite">
              {statusDraft === "salvat" ? a.draftSalvat : statusDraft === "nesalvat" ? a.draftNesalvat : ""}
            </span>
          )}
          {!rezultat && (
            <Button variant="secondary" size="sm" className="lg:hidden" onClick={() => { if (!previewMobil && window.innerWidth < 640) setVedere("mobil"); setPreviewMobil((v) => !v); }}>
              {previewMobil ? <Pencil className="h-3.5 w-3.5" /> : <Monitor className="h-3.5 w-3.5" />}
              {previewMobil ? a.formular : a.previzualizare}
            </Button>
          )}
        </div>
      </header>
      {!rezultat && (
        <div className="h-1 shrink-0 bg-[var(--ci-border)] md:hidden" aria-hidden="true">
          <div className="h-full bg-[var(--ci-primary)] transition-all" style={{ width: `${((pas + 1) / NR_PASI) * 100}%` }} />
        </div>
      )}

      {rezultat ? (
        <Succes t={t} rezultat={rezultat} orgSlug={orgSlug} copiat={copiat} onCopiaza={() => copiazaLink(rezultat.slug)} onInchide={inchide} />
      ) : (
        <>
          <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_minmax(440px,540px)]">
            {/* Formular */}
            <div data-zona-form className={`min-h-0 overflow-y-auto ${previewMobil ? "hidden lg:block" : ""}`}>
              <div className="mx-auto w-full max-w-[600px] px-4 py-7 sm:px-6 sm:py-9">
                <p className="text-[12px] font-semibold tracking-wide text-[var(--ci-text-muted)] uppercase">{a.pasulDin(pas + 1, NR_PASI)}</p>

                {draftGasit && pas === 0 && (
                  <div className="mt-3 mb-5 flex flex-col gap-3 rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] bg-[var(--ci-primary-soft)] px-4 py-3 text-[13px] sm:flex-row sm:items-center">
                    <span className="min-w-0 flex-1">
                      {a.draftGasit(draftGasit.salvatLa ? dataLocala(draftGasit.salvatLa.slice(0, 10), locale, true) : "", draftGasit.form.titlu.trim().slice(0, 50))}
                    </span>
                    <span className="flex gap-2">
                      <Button size="sm" variant="primary" onClick={() => aplicaDraft(draftGasit)}>{a.continuaDraft}</Button>
                      <Button size="sm" variant="secondary" onClick={incepeDeLaZero}>{a.deLaZero}</Button>
                    </span>
                  </div>
                )}

                {pas === 0 && <PasDetalii t={t} limba={locale} form={form} set={set} erori={erori} templateuri={templateuriDisponibile} />}
                {pas === 1 && <PasPoveste t={t} form={form} set={set} erori={erori} titluRef={titluPas} />}
                {pas === 2 && (
                  <PasPoza t={t} poza={poza} poz={pozaPoz} setPoz={setPozaPoz} eroare={pozaEroare} onAlege={alegePoza} onSterge={() => { setPoza(null); setPozaEroare(""); }} titluRef={titluPas} />
                )}
                {pas === 3 && <PasDonatii t={t} titluRef={titluPas} orgSlug={orgSlug} />}
                {pas === 4 && <PasVerificare t={t} limba={locale} form={form} poza={poza} avertismente={avertismenteLista} onModifica={mergiLa} titluRef={titluPas} eroareServer={eroareServer} linkPublic={linkPublic} />}
              </div>
            </div>

            {/* Previzualizare */}
            <aside className={`min-h-0 overflow-y-auto border-[var(--ci-border)] bg-[var(--ci-surface-2)] lg:border-l ${previewMobil ? "block" : "hidden lg:block"}`} aria-label={a.previzualizare}>
              <div className="mx-auto w-full max-w-[540px] px-4 py-6 sm:px-6">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[13px] font-semibold">{a.asaVorVedea}</p>
                    <p className="text-[12px] text-[var(--ci-text-muted)]">{a.seActualizeaza}</p>
                  </div>
                  <div role="group" aria-label={a.dispozitiv} className="flex overflow-hidden rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] bg-[var(--ci-surface)]">
                    {([["desktop", a.calculator, Monitor], ["mobil", a.telefon, Smartphone]] as const).map(([v, eticheta, Icon]) => (
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
            <Button variant="ghost" onClick={() => mergiLa(pas - 1)} disabled={pas === 0 || seTrimite} aria-label={a.inapoi} className={`px-2.5 sm:px-3.5 ${pas === 0 ? "invisible" : ""}`}>
              <ArrowLeft className="h-4 w-4" /> <span className="hidden sm:inline">{a.inapoi}</span>
            </Button>
            <span className="ml-auto text-[12px] whitespace-nowrap text-[var(--ci-text-muted)] sm:hidden" aria-live="polite">{statusDraft === "salvat" ? a.draftScurt : ""}</span>
            <Button variant="secondary" onClick={salveazaManual} className="sm:ml-auto">
              <Save className="h-4 w-4" /> <span className="hidden sm:inline">{a.salveazaDraft}</span><span className="sm:hidden">{a.draft}</span>
            </Button>
            {ultim ? (
              <Button variant="primary" size="lg" onClick={incearcaPublicarea} disabled={seTrimite} className="h-10 px-4 text-sm sm:h-11 sm:px-5 sm:text-[15px]">
                {a.publica}
              </Button>
            ) : (
              <Button variant="primary" size="lg" onClick={continua} className="h-10 px-4 text-sm sm:h-11 sm:px-5 sm:text-[15px]">
                {a.continua} <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </footer>
        </>
      )}

      <Dialog open={confirma} onClose={() => !seTrimite && setConfirma(false)} title={a.confirmaTitlu} width="max-w-md">
        <div className="space-y-4">
          <p className="text-[14px] leading-relaxed text-[var(--ci-text-muted)]">{a.confirmaText(form.titlu.trim())}</p>
          <div className="flex justify-end gap-2 border-t border-[var(--ci-border)] pt-4">
            <Button variant="secondary" onClick={() => setConfirma(false)} disabled={seTrimite}>{a.maiVerific}</Button>
            <Button variant="primary" onClick={publica} loading={seTrimite}>{seTrimite ? a.sePublica : a.publicaAcum}</Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

// ===== Bara de pași =====
function Stepper({ t, pas, maxPas, onAlege }: { t: Texte; pas: number; maxPas: number; onAlege: (p: number) => void }) {
  return (
    <nav aria-label={t.asistent.pasiAria} className="mx-auto hidden md:block">
      <ol className="flex items-center gap-1">
        {t.pasi.map((eticheta, i) => {
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

type PasProps = { t: Texte; form: CampanieForm; set: <K extends keyof CampanieForm>(k: K, v: CampanieForm[K]) => void; erori: EroriCampanie };
type TitluRef = { titluRef?: React.Ref<HTMLHeadingElement> };
const eroareText = (t: Texte, cod: CodEroare | undefined) => (cod ? t.erori[cod] : undefined);

function TitluPas({ titluRef, titlu, subtitlu }: TitluRef & { titlu: string; subtitlu: string }) {
  return (
    <>
      <h3 ref={titluRef} tabIndex={-1} className="ci-display mt-1 text-[24px] leading-tight font-bold outline-none sm:text-[28px]">{titlu}</h3>
      <p className="mt-2 text-[14.5px] leading-relaxed text-[var(--ci-text-muted)]">{subtitlu}</p>
    </>
  );
}

// ===== Pasul 1: detalii =====
function PasDetalii({ t, limba, form, set, erori, templateuri }: PasProps & { limba: Limba; templateuri: CampaignPageTemplate[] }) {
  const d = t.detalii;
  const suma = parseazaSuma(form.sumaTinta).valoare;
  const azi = aziRo();
  const termenValid = parseazaTermen(form.termen, azi).valoare;
  return (
    <div>
      <TitluPas titlu={d.titlu} subtitlu={d.subtitlu} />
      <div className="mt-7 space-y-6">
        <Camp id="camp-titlu" eticheta={d.titluCampanie} obligatoriu eroare={eroareText(t, erori.titlu)} indiciu={d.titluIndiciu}>
          <Input id="camp-titlu" value={form.titlu} onChange={(e) => set("titlu", e.target.value)} maxLength={LIMITE.titluMax} placeholder={d.titluExemplu} aria-invalid={!!erori.titlu} aria-describedby={erori.titlu ? "camp-titlu-eroare" : "camp-titlu-indiciu"} className="h-11" />
          <p className="mt-1 text-right text-[11.5px] text-[var(--ci-text-faint)]">{form.titlu.length}/{LIMITE.titluMax}</p>
        </Camp>

        <div>
          <p className="mb-1.5 text-[13px] font-medium">{d.domeniu} <span className="text-[var(--ci-text-faint)]" aria-hidden="true">*</span></p>
          <div role="radiogroup" aria-label={d.domeniu} className="flex flex-wrap gap-2">
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
            <p role="alert" className="mt-1.5 text-[12.5px] text-[var(--ci-red)]">{eroareText(t, erori.template)}</p>
          ) : (
            <p className="mt-1.5 text-[12.5px] text-[var(--ci-text-muted)]">{d.domeniuIndiciu}</p>
          )}
        </div>

        <Camp id="camp-sumaTinta" eticheta={d.suma} eroare={eroareText(t, erori.sumaTinta)} indiciu={suma ? d.sumaIndiciuCuTinta(suma.toLocaleString(limba === "ro" ? "ro-RO" : "en-GB")) : d.sumaIndiciuFara}>
          <div className="relative">
            <Input id="camp-sumaTinta" inputMode="numeric" value={form.sumaTinta} onChange={(e) => set("sumaTinta", e.target.value.replace(/[^\d.\s]/g, ""))} placeholder="10.000" aria-invalid={!!erori.sumaTinta} aria-describedby={erori.sumaTinta ? "camp-sumaTinta-eroare" : "camp-sumaTinta-indiciu"} className="h-11 pr-12" />
            <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[13px] text-[var(--ci-text-muted)]">{d.lei}</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {SUGESTII_SUMA.map((s) => (
              <button key={s} onClick={() => set("sumaTinta", s.toLocaleString("ro-RO"))} className="rounded-full border border-[var(--ci-border)] px-3 py-1 text-[12.5px] text-[var(--ci-text-muted)] transition-colors hover:border-[var(--ci-border-strong)] hover:text-[var(--ci-text)]">
                {s.toLocaleString("ro-RO")} {d.lei}
              </button>
            ))}
          </div>
        </Camp>

        <Camp id="camp-termen" eticheta={d.termen} eroare={eroareText(t, erori.termen)} indiciu={termenValid ? dataLocala(termenValid, limba) : d.termenIndiciu}>
          <Input id="camp-termen" type="date" min={azi} value={form.termen} onChange={(e) => set("termen", e.target.value)} aria-invalid={!!erori.termen} aria-describedby={erori.termen ? "camp-termen-eroare" : "camp-termen-indiciu"} className="h-11" />
          <div className="mt-2 flex flex-wrap gap-2">
            {SUGESTII_TERMEN.map((n) => (
              <button key={n} onClick={() => set("termen", adaugaZile(azi, n))} className="rounded-full border border-[var(--ci-border)] px-3 py-1 text-[12.5px] text-[var(--ci-text-muted)] transition-colors hover:border-[var(--ci-border-strong)] hover:text-[var(--ci-text)]">
                {d.termenZile(n)}
              </button>
            ))}
            {form.termen && (
              <button onClick={() => set("termen", "")} className="rounded-full px-3 py-1 text-[12.5px] text-[var(--ci-primary)] underline">
                {d.termenCurat}
              </button>
            )}
          </div>
        </Camp>

        <div className="grid gap-4 sm:grid-cols-2">
          <Camp id="camp-judet" eticheta={d.judet} indiciu={d.judetIndiciu}>
            <Select id="camp-judet" value={form.judet} onChange={(e) => set("judet", e.target.value)} className="h-11">
              <option value="">{d.judetAlege}</option>
              {JUDETE.map((j) => (
                <option key={j} value={j}>{j}</option>
              ))}
            </Select>
          </Camp>
          <Camp id="camp-localitate" eticheta={d.localitate}>
            <Input id="camp-localitate" value={form.localitate} onChange={(e) => set("localitate", e.target.value)} placeholder={d.localitateExemplu} className="h-11" />
          </Camp>
        </div>

        <fieldset className="rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] bg-[var(--ci-surface)] p-4">
          <legend className="px-1 text-[13px] font-semibold">{d.contact}</legend>
          <p className="mb-3 text-[12.5px] text-[var(--ci-text-muted)]">{d.contactIndiciu}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Camp id="camp-numeCreator" eticheta={d.nume} obligatoriu eroare={eroareText(t, erori.numeCreator)}>
              <Input id="camp-numeCreator" value={form.numeCreator} onChange={(e) => set("numeCreator", e.target.value)} autoComplete="name" aria-invalid={!!erori.numeCreator} aria-describedby={erori.numeCreator ? "camp-numeCreator-eroare" : undefined} />
            </Camp>
            <Camp id="camp-emailCreator" eticheta={d.email} obligatoriu eroare={eroareText(t, erori.emailCreator)}>
              <Input id="camp-emailCreator" type="email" value={form.emailCreator} onChange={(e) => set("emailCreator", e.target.value)} autoComplete="email" aria-invalid={!!erori.emailCreator} aria-describedby={erori.emailCreator ? "camp-emailCreator-eroare" : undefined} />
            </Camp>
          </div>
        </fieldset>
      </div>
    </div>
  );
}

// ===== Pasul 2: povestea =====
function PasPoveste({ t, form, set, erori, titluRef }: PasProps & TitluRef) {
  const p = t.poveste;
  const lungime = form.poveste.trim().length;
  const adauga = (titlu: string) => set("poveste", `${form.poveste.trimEnd()}${form.poveste.trim() ? "\n\n" : ""}${titlu}\n`);
  return (
    <div>
      <TitluPas titluRef={titluRef} titlu={p.titlu} subtitlu={p.subtitlu} />
      <div className="mt-6 space-y-5">
        <Camp id="camp-poveste" eticheta={p.eticheta} obligatoriu eroare={eroareText(t, erori.poveste)}>
          <Textarea id="camp-poveste" value={form.poveste} onChange={(e) => set("poveste", e.target.value)} maxLength={LIMITE.povesteMax} rows={12} className="min-h-[280px] text-[15px] leading-relaxed" placeholder={p.exemplu} aria-invalid={!!erori.poveste} aria-describedby={erori.poveste ? "camp-poveste-eroare" : "camp-poveste-contor"} />
          <p id="camp-poveste-contor" className="mt-1.5 flex justify-between gap-3 text-[12px] text-[var(--ci-text-muted)]">
            <span>{p.contorIndiciu}</span>
            <span className={`ci-tabular shrink-0 ${lungime >= LIMITE.povesteRecomandat ? "text-[var(--ci-green)]" : ""}`}>{lungime.toLocaleString("ro-RO")} / {LIMITE.povesteMax.toLocaleString("ro-RO")}</span>
          </p>
        </Camp>

        <div className="rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] bg-[var(--ci-surface)] p-4">
          <p className="flex items-center gap-2 text-[13px] font-semibold"><Info className="h-4 w-4 text-[var(--ci-primary)]" /> {p.ceMerita}</p>
          <p className="mt-1 text-[12.5px] text-[var(--ci-text-muted)]">{p.ceMeritaIndiciu}</p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {p.indicii.map((i) => (
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
function PasPoza({ t, poza, poz, setPoz, eroare, onAlege, onSterge, titluRef }: { t: Texte; poza: Poza | null; poz: number; setPoz: (n: number) => void; eroare: string; onAlege: (f: File | undefined) => void; onSterge: () => void } & TitluRef) {
  const z = t.poza;
  const input = useRef<HTMLInputElement>(null);
  const [peste, setPeste] = useState(false);
  const axa = poza ? axaDeDecupare(poza.citita.latime, poza.citita.inaltime) : null;
  return (
    <div>
      <TitluPas titluRef={titluRef} titlu={z.titlu} subtitlu={z.subtitlu} />
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
            <span className="text-[14px] font-semibold">{z.trage}</span>
            <span className="text-[12.5px] text-[var(--ci-text-muted)]">{z.formate(MAX_INTRARE_MB)}</span>
          </label>
        ) : (
          <div className="space-y-4">
            <div className="relative aspect-[16/9] w-full overflow-hidden rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] bg-[var(--ci-surface-2)]">
              {/* eslint-disable-next-line @next/next/no-img-element -- previzualizare locală (blob:) */}
              <img src={poza.citita.url} alt={z.alt} className="h-full w-full object-cover" style={{ objectPosition: pozitieCss(poza.citita.latime, poza.citita.inaltime, poz) }} />
            </div>
            {axa && (
              <div>
                <Label htmlFor="camp-poz">{axa === "y" ? z.axaY : z.axaX}</Label>
                <input id="camp-poz" type="range" min={0} max={100} value={poz} onChange={(e) => setPoz(Number(e.target.value))} className="w-full accent-[var(--ci-primary)]" />
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => input.current?.click()}><ImagePlus className="h-4 w-4" /> {z.schimba}</Button>
              <Button variant="ghost" onClick={onSterge}><Trash2 className="h-4 w-4" /> {z.elimina}</Button>
            </div>
          </div>
        )}
        {eroare && <p role="alert" className="mt-2 text-[12.5px] text-[var(--ci-red)]">{eroare}</p>}

        <ul className="mt-6 space-y-1.5 text-[13px] text-[var(--ci-text-muted)]">
          <li>• {z.sfat1}</li>
          <li>• {z.sfat2}</li>
          <li>• {z.sfat3}</li>
        </ul>
      </div>
    </div>
  );
}

// ===== Pasul 4: donațiile =====
function PasDonatii({ t, titluRef, orgSlug }: { t: Texte } & TitluRef & { orgSlug: string }) {
  const dn = t.donatii;
  const [lunar, setLunar] = useState(false);
  const sume = lunar ? SUME_LUNARE : SUME_RAPIDE;
  return (
    <div>
      <TitluPas titluRef={titluRef} titlu={dn.titlu} subtitlu={dn.subtitlu} />
      <div className="mt-6 rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] bg-[var(--ci-surface)] p-5">
        <p className="text-[12px] font-semibold tracking-wide text-[var(--ci-text-muted)] uppercase">{dn.exemplu}</p>
        <div role="group" aria-label={dn.frecventa} className="mt-3 inline-flex overflow-hidden rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] text-[13px] font-medium">
          <button aria-pressed={!lunar} onClick={() => setLunar(false)} className={`px-4 py-2 transition-colors ${!lunar ? "bg-[var(--ci-primary)] text-white" : "hover:bg-[var(--ci-surface-2)]"}`}>{dn.odata}</button>
          <button aria-pressed={lunar} onClick={() => setLunar(true)} className={`px-4 py-2 transition-colors ${lunar ? "bg-[var(--ci-primary)] text-white" : "hover:bg-[var(--ci-surface-2)]"}`}>{dn.lunar}</button>
        </div>
        <div className="mt-3 grid grid-cols-4 gap-2">
          {sume.map((s, i) => (
            <span key={s} className={`rounded-[var(--ci-radius-btn)] border py-2.5 text-center text-[14px] font-bold ${i === 1 ? "border-[var(--ci-primary)] bg-[var(--ci-primary-soft)] text-[var(--ci-primary)]" : "border-[var(--ci-border)]"}`}>{s} lei</span>
          ))}
        </div>
        <p className="mt-3 text-[12.5px] text-[var(--ci-text-muted)]">{dn.altaSuma} {lunar ? dn.lunarNota : ""}</p>
      </div>

      <ul className="mt-6 space-y-3">
        {dn.puncte.map(([titlu, text]) => (
          <li key={titlu} className="flex gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[var(--ci-green)]" />
            <span><b className="block text-[14px] font-semibold">{titlu}</b><span className="text-[13px] text-[var(--ci-text-muted)]">{text}</span></span>
          </li>
        ))}
      </ul>

      <p className="mt-6 rounded-[var(--ci-radius-card)] bg-[var(--ci-surface-2)] px-4 py-3 text-[12.5px] text-[var(--ci-text-muted)]">
        {dn.nota}{" "}
        <Link href={`/${orgSlug}/crm/setari`} target="_blank" className="font-medium text-[var(--ci-primary)] underline">{dn.setari}</Link>.
      </p>
    </div>
  );
}

// ===== Pasul 5: verificare =====
function PasVerificare({ t, limba, form, poza, avertismente: lista, onModifica, titluRef, eroareServer, linkPublic }: { t: Texte; limba: Limba; form: CampanieForm; poza: Poza | null; avertismente: ReturnType<typeof avertismente>; onModifica: (p: number) => void; eroareServer: string; linkPublic: string } & TitluRef) {
  const v = t.verificare;
  const { erori } = valideazaTot(form);
  const lipsa = Object.values(erori).map((cod) => t.erori[cod]);
  const suma = parseazaSuma(form.sumaTinta).valoare;
  const termen = parseazaTermen(form.termen, aziRo(), true).valoare;
  const loc = [form.localitate.trim(), form.judet].filter(Boolean).join(", ");
  const numeLocale = limba === "ro" ? "ro-RO" : "en-GB";
  const rand = { modifica: v.modifica, onModifica };
  return (
    <div>
      <TitluPas titluRef={titluRef} titlu={v.titlu} subtitlu={v.subtitlu} />

      {eroareServer && (
        <div role="alert" className="mt-5 flex gap-3 rounded-[var(--ci-radius-card)] border border-[var(--ci-red)]/30 bg-[var(--ci-red-soft)] p-4 text-[13.5px]">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--ci-red)]" />
          <span><b>{v.nuPublicat}</b> {eroareServer} {v.pastrate}</span>
        </div>
      )}
      {lipsa.length > 0 && (
        <div role="alert" className="mt-5 flex gap-3 rounded-[var(--ci-radius-card)] border border-[var(--ci-red)]/30 bg-[var(--ci-red-soft)] p-4 text-[13.5px]">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--ci-red)]" />
          <span><b>{v.maiAre}</b> {lipsa.join(" ")}</span>
        </div>
      )}

      <div className="mt-5 divide-y divide-[var(--ci-border)] rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] bg-[var(--ci-surface)] px-4">
        <RandRezumat {...rand} eticheta={v.titluRand} valoare={form.titlu.trim() || v.lipseste} pas={0} gol={!form.titlu.trim()} />
        <RandRezumat {...rand} eticheta={v.domeniu} valoare={CAMPAIGN_TEMPLATES[form.template as CampaignPageTemplate]?.nume ?? v.nealeas} pas={0} />
        <RandRezumat {...rand} eticheta={v.sumaTinta} valoare={suma ? `${suma.toLocaleString(numeLocale)} lei` : v.faraTinta} pas={0} gol={!suma} />
        <RandRezumat {...rand} eticheta={v.termen} valoare={termen ? dataLocala(termen, limba) : v.faraTermen} pas={0} gol={!termen} />
        <RandRezumat {...rand} eticheta={v.locatie} valoare={loc || v.necompletata} pas={0} gol={!loc} />
        <RandRezumat {...rand} eticheta={v.poveste} valoare={form.poveste.trim() ? `${form.poveste.trim().slice(0, 140)}${form.poveste.trim().length > 140 ? "…" : ""}` : v.lipseste} pas={1} gol={!form.poveste.trim()} />
        <RandRezumat {...rand} eticheta={v.fotografie} valoare={poza ? poza.fisier.name : v.faraPoza} pas={2} gol={!poza} />
        <RandRezumat {...rand} eticheta={v.contact} valoare={`${form.numeCreator.trim()} · ${form.emailCreator.trim()}`} pas={0} />
      </div>

      {lista.length > 0 && (
        <div className="mt-5 rounded-[var(--ci-radius-card)] border border-[var(--ci-amber)]/30 bg-[var(--ci-amber-soft)] p-4">
          <p className="flex items-center gap-2 text-[13.5px] font-semibold"><Info className="h-4 w-4 text-[var(--ci-amber)]" /> {v.poateSi}</p>
          <ul className="mt-2 space-y-2">
            {lista.map((w) => (
              <li key={w.cheie} className="flex items-start justify-between gap-3 text-[13px]">
                <span>{t.avertismente[w.cheie]}</span>
                <button onClick={() => onModifica(w.pas)} className="shrink-0 font-medium text-[var(--ci-primary)] underline">{v.rezolv}</button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-5 text-[12.5px] text-[var(--ci-text-muted)]">{v.adresa(linkPublic)}</p>
    </div>
  );
}

function RandRezumat({ eticheta, valoare, pas, gol, modifica, onModifica }: { eticheta: string; valoare: string; pas: number; gol?: boolean; modifica: string; onModifica: (p: number) => void }) {
  return (
    <div className="flex items-start gap-3 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-medium text-[var(--ci-text-muted)]">{eticheta}</p>
        <p className={`mt-0.5 text-[14px] break-words ${gol ? "text-[var(--ci-text-faint)] italic" : "font-medium"}`}>{valoare}</p>
      </div>
      <button onClick={() => onModifica(pas)} className="flex shrink-0 items-center gap-1 rounded-[var(--ci-radius-btn)] px-2 py-1 text-[12.5px] font-medium text-[var(--ci-primary)] hover:bg-[var(--ci-primary-soft)]">
        <Pencil className="h-3 w-3" /> {modifica}
      </button>
    </div>
  );
}

// ===== După publicare =====
function Succes({ t, rezultat, orgSlug, copiat, onCopiaza, onInchide }: { t: Texte; rezultat: Rezultat; orgSlug: string; copiat: boolean; onCopiaza: () => void; onInchide: () => void }) {
  const s = t.succes;
  const cale = caleCampanie(orgSlug, rezultat.slug);
  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-4 py-12">
      <div className="mx-auto max-w-[560px] text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--ci-green-soft)] text-[var(--ci-green)]"><CheckCircle2 className="h-9 w-9" /></span>
        <h3 className="ci-display mt-5 text-[28px] leading-tight font-bold">{s.titlu}</h3>
        <p className="mt-2 text-[15px] text-[var(--ci-text-muted)]">{s.text}</p>

        {rezultat.pozaEroare && (
          <p role="alert" className="mt-5 rounded-[var(--ci-radius-card)] border border-[var(--ci-amber)]/30 bg-[var(--ci-amber-soft)] p-3 text-left text-[13px]">{s.pozaEroare(rezultat.pozaEroare)}</p>
        )}

        <div className="mt-6 flex items-center gap-2 rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] bg-[var(--ci-surface)] p-2 pl-4 text-left">
          <span className="min-w-0 flex-1 truncate text-[13.5px] text-[var(--ci-text-muted)]">alexandrit.ro{cale}</span>
          <Button variant="secondary" size="sm" onClick={onCopiaza}>{copiat ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}{copiat ? s.copiat : s.copiaza}</Button>
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <a href={cale} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center gap-2 rounded-[var(--ci-radius-btn)] bg-[var(--ci-primary)] px-5 text-[15px] font-medium text-white hover:bg-[var(--ci-primary-hover)]"><ExternalLink className="h-4 w-4" /> {s.vezi}</a>
          <Link href={`/${orgSlug}/crm/strangere-fonduri/${rezultat.id}`} className="inline-flex h-11 items-center gap-2 rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] bg-[var(--ci-surface)] px-5 text-[15px] font-medium hover:bg-[var(--ci-surface-2)]">{s.deschide}</Link>
        </div>
        <button onClick={onInchide} className="mt-5 text-[13px] font-medium text-[var(--ci-text-muted)] underline hover:text-[var(--ci-text)]">{s.inchide}</button>
      </div>
    </div>
  );
}
