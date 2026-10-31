"use client";

import { AlertTriangle, ChevronDown, ClipboardCopy, Copy, Download, Eye, FileDown, LayoutGrid, Palette, PencilLine, Plus, Printer, RotateCcw, Trash2, Upload } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState, useTransition, type ReactNode } from "react";

import { IMPACT_UI_DICT } from "@/lib/i18n/dictionaries/instrumente-ui-2";
import { descarcaBlob, htmlInPdf } from "@/lib/html-in-pdf";
import { incarcaLogo, paletaDinLogo } from "@/lib/logo-incarcare";
import { MOTIVE } from "@/lib/motiv";
import { raporteazaEroare } from "@/lib/monitoring";
import { aplicaPlaceholdere, CULORI_IMPLICITE, curataDateImpact, MECANISME_IMPACT, MECANISME_PROIECT, MODELE_IMPACT, PROIECT_GOL, STARI_PROIECT, totalImpact, type DateImpact, type ProiectImpact } from "@/lib/raport-impact";
import type { PaletaLogo } from "@/lib/raport-impact-culori";
import { randeazaRaportImpact } from "@/lib/raport-impact-modele";

import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import { Input, Label, Select, Textarea } from "../../../components/ui/input";
import { formatSuma } from "../../../lib/format";
import { useLocale } from "../../../lib/locale-context";
import { Camp } from "../../_comun/camp";
import { inregistreazaDocumentAction } from "../../_comun/documente-actions";
import { MeniuExport } from "../../_comun/meniu-export";
import { traduElemente } from "../../_comun/tradu";
import { incarcaImpactAction, salveazaImpactAction, type CompanieImpactRand, type IncarcareImpact } from "../impact-actions";

type Stare = "idle" | "asteapta" | "salveaza" | "salvat" | "eroare";

const fara = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
// Un proiect care pare să vorbească despre un copil sau un pacient (vârstă, „copil”, diagnostic, operație) are nevoie fie de un titlu public
// fără nume, fie de bifa că acordul pentru publicare a fost verificat. Nu e o garanție: e o plasă pentru cazul cel mai riscant.
const SENSIBIL = /\b\d{1,2} ?(ani|an|luni)\b|\bcopil|\bfetit|\bbaiat|\bpacient|\bdiagnostic|\boperati|\bboala/;
const areNevoieDeAcord = (p: ProiectImpact) => !p.nealocat && !p.titluPublic.trim() && !p.acordVerificat && SENSIBIL.test(fara(`${p.nume} ${p.observatii} ${p.locatie}`));

// Secțiune care se poate plia: formularul are multe câmpuri, iar acum se vede doar ce lucrezi.
function Sectiune({ titlu, subtitlu, deschis = false, children }: { titlu: string; subtitlu?: ReactNode; deschis?: boolean; children: ReactNode }) {
  const [o, setO] = useState(deschis);
  const id = useId();
  return (
    <Card padded={false}>
      <button type="button" onClick={() => setO((x) => !x)} aria-expanded={o} aria-controls={id} className="flex min-h-12 w-full items-start justify-between gap-3 rounded-[var(--ci-radius-card)] p-5 text-left focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none">
        <span>
          <span className="ci-display block text-[15px] font-semibold text-[var(--ci-text)]">{titlu}</span>
          {subtitlu && <span className="mt-0.5 block text-[13px] text-[var(--ci-text-muted)]">{subtitlu}</span>}
        </span>
        <ChevronDown className={`mt-1 size-4 shrink-0 text-[var(--ci-text-muted)] transition-transform ${o ? "rotate-180" : ""}`} aria-hidden />
      </button>
      {o && (
        <div id={id} className="px-5 pb-5">
          {children}
        </div>
      )}
    </Card>
  );
}

export function ImpactClient({ orgSlug, companii, firmaInitiala, initial, azi }: { orgSlug: string; companii: CompanieImpactRand[]; firmaInitiala: string | null; initial: IncarcareImpact; azi: string }) {
  const locale = useLocale();
  const t = IMPACT_UI_DICT[locale];
  const etichetaStare: Record<Stare, string> = { idle: "", ...t.stare };
  const modeleTrad = useMemo(() => traduElemente(MODELE_IMPACT, "impact", locale), [locale]);
  const mecanismeImpact = useMemo(() => traduElemente(MECANISME_IMPACT, "mecanismeImpact", locale), [locale]);
  const mecanismeProiect = useMemo(() => traduElemente(MECANISME_PROIECT, "mecanismeProiect", locale), [locale]);
  const stariProiect = useMemo(() => traduElemente(STARI_PROIECT, "stariProiect", locale), [locale]);
  const motive = useMemo(() => traduElemente(MOTIVE, "motive", locale), [locale]);
  const [companyId, setCompanyId] = useState<string | null>(firmaInitiala);
  const [date, setDate] = useState<DateImpact>(initial.date);
  const [salvat, setSalvat] = useState(initial.salvat);
  const [stare, setStare] = useState<Stare>("idle");
  const [mesaj, setMesaj] = useState<string | null>(null);
  const [ocupat, start] = useTransition();
  const [paleta, setPaleta] = useState<PaletaLogo | null>(null);
  const [eroareLogo, setEroareLogo] = useState<string | null>(null);
  const [vedere, setVedere] = useState<"editez" | "previz">("editez");
  const [info, setInfo] = useState<string | null>(null);
  const [seFacePdf, setSeFacePdf] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cadru = useRef<HTMLIFrameElement>(null);
  const ultimaInregistrare = useRef("");

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  // Salvarea automată pornește la o scurtă pauză după ultima modificare, doar pentru o firmă din listă.
  function programeazaSalvare(urmator: DateImpact, id: string | null) {
    if (timer.current) clearTimeout(timer.current);
    if (!id) return;
    setStare("asteapta");
    timer.current = setTimeout(async () => {
      setStare("salveaza");
      const r = await salveazaImpactAction(orgSlug, id, urmator).catch(() => ({ ok: false as const, eroare: t.eroareScurta }));
      setStare(r.ok ? "salvat" : "eroare");
      if (!r.ok) setMesaj(r.eroare);
    }, 1200);
  }
  function actualizeaza(patch: Partial<DateImpact>) {
    const urmator = { ...date, ...patch };
    setDate(urmator);
    setMesaj(null);
    programeazaSalvare(urmator, companyId);
  }
  const actualizeazaProiect = (i: number, patch: Partial<ProiectImpact>) => actualizeaza({ proiecte: date.proiecte.map((p, j) => (j === i ? { ...p, ...patch } : p)) });

  const culoriDin = (p: PaletaLogo): Partial<DateImpact> => ({ accent: p.accent, accent2: p.accent2, accent3: p.accent3 });
  // Logoul firmei: se citește local, se micșorează, iar culorile raportului se iau din el (se pot ajusta apoi).
  async function alegeLogoFirma(fisier?: File) {
    if (!fisier) return;
    setEroareLogo(null);
    try {
      const r = await incarcaLogo(fisier);
      if (r.paleta) setPaleta(r.paleta);
      actualizeaza({ logoFirma: r.dataUrl, ...(r.paleta ? culoriDin(r.paleta) : {}) });
    } catch (e) {
      setEroareLogo(e instanceof Error ? e.message : t.logoNeincarcat);
    }
  }
  async function alegeLogoOng(fisier?: File) {
    if (!fisier) return;
    setEroareLogo(null);
    try {
      actualizeaza({ logoOng: (await incarcaLogo(fisier)).dataUrl });
    } catch (e) {
      setEroareLogo(e instanceof Error ? e.message : t.logoNeincarcat);
    }
  }
  async function preiaCulori() {
    setEroareLogo(null);
    try {
      const p = await paletaDinLogo(date.logoFirma);
      if (!p) return setEroareLogo(t.nuCulori);
      setPaleta(p);
      actualizeaza(culoriDin(p));
    } catch (e) {
      setEroareLogo(e instanceof Error ? e.message : t.culoriNecitite);
    }
  }

  // Modificările în așteptare se salvează înainte să se schimbe firma: altfel s-ar pierde fără nicio avertizare.
  function schimbaFirma(id: string) {
    if (timer.current) clearTimeout(timer.current);
    const deSalvat = stare === "asteapta" && companyId ? { id: companyId, date } : null;
    start(async () => {
      if (deSalvat) {
        const r = await salveazaImpactAction(orgSlug, deSalvat.id, deSalvat.date).catch(() => ({ ok: false as const, eroare: t.eroareScurta }));
        if (!r.ok) {
          setMesaj(t.nuSalvat(r.eroare));
          setStare("eroare");
          return;
        }
      }
      const r = await incarcaImpactAction(orgSlug, id || null);
      setCompanyId(id || null);
      setDate(r.date);
      setSalvat(r.salvat);
      setPaleta(null);
      setEroareLogo(null);
      setStare("idle");
      setMesaj(null);
    });
  }
  // Proiectele din sponsorizări se adaugă la cele existente: cele cu același nume își păstrează textele tale (rezultat, stare, dovadă), doar suma și data se actualizează.
  function dinSponsorizari() {
    if (!companyId) return;
    start(async () => {
      const r = await incarcaImpactAction(orgSlug, companyId, true);
      const cheie = (n: string) => n.trim().toLowerCase();
      const folosite = new Set<number>();
      const reunite = date.proiecte.map((existent) => {
        const j = r.date.proiecte.findIndex((n, k) => !folosite.has(k) && cheie(n.nume) === cheie(existent.nume) && cheie(n.nume) !== "");
        if (j < 0) return existent;
        folosite.add(j);
        const nou = r.date.proiecte[j];
        return { ...existent, suma: nou.suma ?? existent.suma, data: nou.data || existent.data, link: existent.link || nou.link };
      });
      const noi = r.date.proiecte.filter((_, k) => !folosite.has(k));
      actualizeaza({ firma: date.firma || r.date.firma, proiecte: [...reunite, ...noi] });
      setInfo(noi.length ? t.proiecteAdaugate(noi.length) : t.fara);
      setTimeout(() => setInfo(null), 6000);
    });
  }

  const curat = useMemo(() => curataDateImpact(date), [date]);
  const html = useMemo(() => randeazaRaportImpact(curat, { organizatie: initial.organizatie, azi, identificare: initial.identificare }), [curat, initial.organizatie, initial.identificare, azi]);
  const total = totalImpact(curat);
  const nrNumite = curat.proiecte.filter((p) => p.nume && !p.nealocat).length;
  const modelAles = modeleTrad.find((m) => m.id === date.model)!;
  const nrPlaceholdere = aplicaPlaceholdere(date.narativ, curat).length;
  const anUrmator = String(Number(azi.slice(0, 4)) + 1);

  const numeFirma = () => (curat.firma || "firma").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "firma";

  // Fiecare export se înregistrează în istoricul organizației (cu datele, fără logo-uri), ca raportul trimis să poată fi redeschis.
  function inregistreaza() {
    const faraLogo = { ...curat, logoFirma: "", logoOng: "" };
    const semn = `${html.length}:${JSON.stringify(faraLogo).length}:${curat.model}:${curat.firma}`;
    if (semn === ultimaInregistrare.current) return;
    ultimaInregistrare.current = semn;
    inregistreazaDocumentAction(orgSlug, "rapoarte", { titlu: `Raport de impact — ${curat.firma || "fără firmă"}`, firmaId: companyId, numar: "", date: faraLogo })
      .then((r) => {
        if (!r.ok) ultimaInregistrare.current = "";
        setInfo((x) => `${x ? `${x} ` : ""}${r.ok ? t.istoricOk : t.istoricMare}`);
      })
      .catch((e) => {
        ultimaInregistrare.current = "";
        raporteazaEroare("documente-istoric", e, { tip: "rapoarte" });
      });
  }

  function exportaHtml() {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
    a.download = `raport-impact-${numeFirma()}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    setInfo(t.fisierDescarcat);
    inregistreaza();
    setTimeout(() => setInfo(null), 6000);
  }
  // Codul complet al raportului, gata de lipit în editorul HTML al unei platforme.
  async function copiaza() {
    setMesaj(null);
    try {
      await navigator.clipboard.writeText(html);
    } catch {
      const el = document.createElement("textarea");
      el.value = html;
      el.setAttribute("readonly", "");
      el.style.cssText = "position:fixed;opacity:0;top:0;left:0";
      document.body.appendChild(el);
      el.select();
      const ok = document.execCommand("copy");
      el.remove();
      if (!ok) return setMesaj(t.nuCopiat);
    }
    setInfo(t.htmlCopiat);
    inregistreaza();
    setTimeout(() => setInfo(null), 6000);
  }
  // „Export PDF” descarcă direct un fișier PDF (pagini A4 în înaltă rezoluție). Dacă browserul nu poate, se deschide tipărirea.
  async function exportaPdf() {
    setMesaj(null);
    setSeFacePdf(true);
    try {
      const { blob, imaginiOmise } = await htmlInPdf(html);
      descarcaBlob(blob, `raport-impact-${numeFirma()}.pdf`);
      setInfo(imaginiOmise ? t.pdfLogouri(imaginiOmise) : t.pdfDescarcat);
      inregistreaza();
    } catch (e) {
      raporteazaEroare("pdf-direct", e, { tip: "raport", ua: navigator.userAgent.slice(0, 160), lungime: html.length });
      setInfo(t.pdfFallback);
      tipareste();
    } finally {
      setSeFacePdf(false);
      setTimeout(() => setInfo(null), 8000);
    }
  }
  // Tipărirea păstrează textul selectabil și linkurile active; din ea se poate salva și PDF.
  function tipareste() {
    const ruleaza = () => {
      const w = cadru.current?.contentWindow;
      if (w) {
        w.focus();
        w.print();
        inregistreaza();
      } else setMesaj(t.previzNeincarcata);
    };
    // Pe telefon, previzualizarea poate fi ascunsă: o afișăm înainte de tipărire.
    if (vedere === "editez" && window.matchMedia("(max-width: 1023px)").matches) {
      setVedere("previz");
      setTimeout(ruleaza, 250);
    } else ruleaza();
  }

  const lipsaFirma = !curat.firma;
  const deVerificat = date.proiecte.filter(areNevoieDeAcord);
  // Butoanele rămân active: când ceva lipsește, mesajul spune ce (un buton dezactivat nu explică nimic, mai ales pe telefon).
  const cuVerificari = (actiune: () => void) => {
    if (lipsaFirma) return setMesaj(t.lipsaFirma);
    if (deVerificat.length) {
      return setMesaj(t.acordNecesar(deVerificat.length, deVerificat.map((p) => p.nume || t.faraNume)));
    }
    actiune();
  };
  const sumaProiecte = date.proiecte.reduce((s, x) => s + (x.suma ?? 0), 0);
  const totalDiferit = date.totalManual != null && date.totalManual !== sumaProiecte;
  const faraInvitatie = !date.ceUrmeaza.trim() && !date.ctaText.trim();
  const fSuma = (v: number) => formatSuma(v, undefined, locale);

  // Textul de reînnoire intră în raportul trimis companiei, deci rămâne în română.
  function adaugaTextReinnoire() {
    actualizeaza({
      ceUrmeaza: date.ceUrmeaza.trim() || `Pentru ${anUrmator} vă propunem să continuăm împreună. Vă invităm la o discuție despre cum sprijinul dumneavoastră poate ajunge la și mai mulți oameni; vă contactăm în următoarele săptămâni.`,
      ctaText: date.ctaText.trim() || `Să continuăm în ${anUrmator}`,
    });
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 pb-20 lg:pb-0">
      <div className="fixed inset-x-0 bottom-0 z-30 flex gap-2 border-t border-[var(--ci-border)] bg-[var(--ci-surface)] p-2 lg:hidden">
        <Button className="min-h-11 flex-1" onClick={() => setVedere((v) => (v === "editez" ? "previz" : "editez"))}>
          {vedere === "editez" ? t.previzualizeaza : t.inapoiEditare}
        </Button>
        <Button variant="primary" className="min-h-11 flex-1" onClick={() => cuVerificari(exportaPdf)} disabled={seFacePdf}>
          {seFacePdf ? t.sePregateste : t.exportPdf}
        </Button>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] bg-[var(--ci-surface)] px-3 py-2.5">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <Link href={`/${orgSlug}/crm/instrumente/raport-companii`} prefetch={false} className="inline-flex h-9 items-center gap-1.5 rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] px-3 text-[13px] font-medium text-[var(--ci-text)] hover:bg-[var(--ci-surface-2)] focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none">
            <LayoutGrid className="size-4" aria-hidden /> {t.galerie}
          </Link>
          <h1 className="ci-display text-[15px] font-bold text-[var(--ci-text)]">{t.titlu}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Starea intermediară (modificări nesalvate) e doar vizuală; cititoarele de ecran aud doar „Salvat”, erorile și rezultatele exportului. */}
          <span className="text-[12px] text-[var(--ci-text-muted)]" aria-hidden>
            {info ?? etichetaStare[stare]}
          </span>
          <span className="sr-only" role="status" aria-live="polite">
            {info ?? (stare === "salvat" || stare === "eroare" ? etichetaStare[stare] : "")}
          </span>
          <Button variant="primary" onClick={() => cuVerificari(copiaza)} className="min-h-11 sm:min-h-9" title={t.copiazaHtmlTitlu}>
            <ClipboardCopy className="size-4" aria-hidden /> {t.copiazaHtml}
          </Button>
          <Button onClick={() => cuVerificari(exportaPdf)} disabled={seFacePdf} className="min-h-11 sm:min-h-9" title={t.pdfTitlu}>
            <FileDown className="size-4" aria-hidden /> {seFacePdf ? t.sePregatestePdf : t.exportPdf}
          </Button>
          <MeniuExport
            elemente={[
              { eticheta: t.descarcaHtml, descriere: t.descarcaHtmlDesc, icon: <Download className="size-4" aria-hidden />, onClick: () => cuVerificari(exportaHtml) },
              { eticheta: t.tipareste, descriere: t.tiparesteDesc, icon: <Printer className="size-4" aria-hidden />, onClick: () => cuVerificari(tipareste) },
            ]}
          />
        </div>
      </div>
      <p className="-mt-2 max-w-4xl text-[12.5px] text-[var(--ci-text-muted)]">{t.ajutor}</p>
      <div role="tablist" aria-label={t.vedere} className="grid grid-cols-2 gap-1 rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] bg-[var(--ci-surface)] p-1 lg:hidden">
        {([["editez", t.editez, PencilLine], ["previz", t.previz, Eye]] as const).map(([k, e, Icon]) => (
          <button key={k} type="button" role="tab" aria-selected={vedere === k} onClick={() => setVedere(k)} className={`min-h-11 rounded-[calc(var(--ci-radius-btn)-2px)] py-2 text-[13px] font-semibold focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none ${vedere === k ? "bg-[var(--ci-primary)] text-white" : "text-[var(--ci-text-muted)]"}`}>
            <span className="inline-flex items-center justify-center gap-1.5">
              <Icon className="size-4" aria-hidden /> {e}
            </span>
          </button>
        ))}
      </div>
      {mesaj && <p role="alert" className="text-[13px] text-[var(--ci-red)]">{mesaj}</p>}

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(340px,0.85fr)_minmax(0,1.15fr)]">
        <div className={`min-w-0 space-y-4 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto lg:pr-2 ${vedere === "previz" ? "hidden lg:block" : ""}`}>
          <Sectiune titlu={t.sablon} subtitlu={modelAles.hint} deschis>
            <Camp eticheta={t.tipRaport}>
              <Select value={date.model} onChange={(e) => actualizeaza({ model: e.target.value as DateImpact["model"] })}>
                {modeleTrad.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.eticheta}
                  </option>
                ))}
              </Select>
            </Camp>
          </Sectiune>

          <Sectiune titlu={t.firma} subtitlu={companyId ? (salvat ? t.firmaSalvata : t.firmaPropunere) : t.firmaFaraLista} deschis>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Camp eticheta={t.firmaCrm}>
                <Select value={companyId ?? ""} onChange={(e) => schimbaFirma(e.target.value)} disabled={ocupat}>
                  <option value="">{t.altaFirma}</option>
                  {companii.map((c) => (
                    <option key={c.companyId} value={c.companyId}>
                      {c.nume} · {fSuma(c.total)}
                    </option>
                  ))}
                </Select>
              </Camp>
              <Camp eticheta={t.numeRaport}>
                <Input value={date.firma} onChange={(e) => actualizeaza({ firma: e.target.value })} maxLength={200} placeholder={t.numeEx} />
              </Camp>
              <Camp eticheta={t.mecanism} ajutor={date.mecanism === "nespecificat" ? t.mecanismGeneral : t.mecanismAvertisment}>
                <Select value={date.mecanism} onChange={(e) => actualizeaza({ mecanism: e.target.value as DateImpact["mecanism"] })}>
                  {mecanismeImpact.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.eticheta}
                    </option>
                  ))}
                </Select>
              </Camp>
              <Camp eticheta={t.totalAnterior} ajutor={t.totalAnteriorAjutor}>
                <Input inputMode="numeric" value={date.totalAnterior ?? ""} onChange={(e) => actualizeaza({ totalAnterior: e.target.value === "" ? null : Number(e.target.value.replace(/\D/g, "")) })} />
              </Camp>
              <Camp eticheta={t.totalGol} ajutor={totalDiferit ? t.totalDiferit(fSuma(date.totalManual ?? 0), fSuma(sumaProiecte)) : undefined}>
                <Input inputMode="numeric" value={date.totalManual ?? ""} onChange={(e) => actualizeaza({ totalManual: e.target.value === "" ? null : Number(e.target.value.replace(/\D/g, "")) })} placeholder={String(sumaProiecte)} />
              </Camp>
            </div>
          </Sectiune>

          <Sectiune titlu={t.proiecteSustinute} subtitlu={t.proiecteSub(nrNumite, fSuma(total))} deschis>
            <div className="space-y-3">
              {date.proiecte.length === 0 && <p className="text-[13px] text-[var(--ci-text-muted)]">{t.niciunProiect(!!companyId)}</p>}
              {date.proiecte.map((p, i) => {
                const atentie = areNevoieDeAcord(p);
                return (
                  <details key={i} open={!p.nume || date.proiecte.length <= 2 || atentie} className="group rounded-[var(--ci-radius-card)] border border-[var(--ci-border)]">
                    <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 rounded-[var(--ci-radius-card)] px-3 py-2 text-left focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none [&::-webkit-details-marker]:hidden">
                      <span className="min-w-0 truncate text-[13px] font-semibold text-[var(--ci-text)]">
                        {p.nume || t.proiectNou}
                        <span className="ml-2 font-normal text-[var(--ci-text-muted)]">
                          {p.suma !== null ? fSuma(p.suma) : ""}
                          {p.stare ? ` · ${stariProiect.find((x) => x.id === p.stare)?.eticheta}` : ""}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        {atentie && (
                          <span className="inline-flex items-center gap-1 text-[12px] font-medium text-[var(--ci-red)]">
                            <AlertTriangle className="size-3.5" aria-hidden /> {t.acordNecesarEticheta}
                          </span>
                        )}
                        <ChevronDown className="size-4 text-[var(--ci-text-muted)] transition-transform group-open:rotate-180" aria-hidden />
                      </span>
                    </summary>
                    <div className="space-y-2.5 px-3 pb-3">
                      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-6">
                        <Camp className="sm:col-span-4" eticheta={t.proiect}>
                          <Input value={p.nume} onChange={(e) => actualizeazaProiect(i, { nume: e.target.value })} maxLength={200} />
                        </Camp>
                        <Camp className="sm:col-span-2" eticheta={t.sumaLei}>
                          <Input type="number" min={0} inputMode="numeric" value={p.suma ?? ""} onChange={(e) => actualizeazaProiect(i, { suma: e.target.value === "" ? null : Number(e.target.value) })} />
                        </Camp>
                        <Camp className="sm:col-span-3" eticheta={t.dataIncasarii} ajutor={t.dataAjutor}>
                          <Input type="date" value={p.data} onChange={(e) => actualizeazaProiect(i, { data: e.target.value })} />
                        </Camp>
                        <Camp className="sm:col-span-3" eticheta={t.stareCamp}>
                          <Select value={p.stare} onChange={(e) => actualizeazaProiect(i, { stare: e.target.value as ProiectImpact["stare"] })}>
                            {stariProiect.map((st) => (
                              <option key={st.id} value={st.id}>
                                {st.eticheta}
                              </option>
                            ))}
                          </Select>
                        </Camp>
                        <Camp className="sm:col-span-6" eticheta={t.rezultat} ajutor={t.rezultatAjutor}>
                          <Textarea rows={2} value={p.observatii} onChange={(e) => actualizeazaProiect(i, { observatii: e.target.value })} maxLength={600} />
                        </Camp>
                      </div>
                      <details open={atentie} className="rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)]">
                        <summary className="flex min-h-10 cursor-pointer items-center gap-1.5 px-3 text-[12.5px] font-semibold text-[var(--ci-text-muted)] focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none">{t.detalii}</summary>
                        <div className="grid grid-cols-1 gap-2.5 p-3 sm:grid-cols-6">
                          <Camp className="sm:col-span-6" eticheta={t.linkProiect} ajutor={t.linkAjutor}>
                            <Input type="url" value={p.link} onChange={(e) => actualizeazaProiect(i, { link: e.target.value })} placeholder="https://…" />
                          </Camp>
                          <Camp className={date.mecanism === "d177" ? "sm:col-span-4" : "sm:col-span-6"} eticheta={t.partener}>
                            <Input value={p.locatie} onChange={(e) => actualizeazaProiect(i, { locatie: e.target.value })} maxLength={200} />
                          </Camp>
                          {date.mecanism === "d177" && (
                            <Camp className="sm:col-span-2" eticheta={t.anFiscal}>
                              <Input type="number" min={2000} max={2100} value={p.anDirectionare ?? ""} onChange={(e) => actualizeazaProiect(i, { anDirectionare: e.target.value === "" ? null : Number(e.target.value) })} />
                            </Camp>
                          )}
                          <Camp className="sm:col-span-3" eticheta={t.mecanismProiect} ajutor={t.mecanismProiectAjutor}>
                            <Select value={p.mecanism} onChange={(e) => actualizeazaProiect(i, { mecanism: e.target.value as ProiectImpact["mecanism"] })}>
                              {mecanismeProiect.map((m) => (
                                <option key={m.id} value={m.id}>
                                  {m.eticheta}
                                </option>
                              ))}
                            </Select>
                          </Camp>
                          <Camp className="sm:col-span-3" eticheta={t.contract} ajutor={t.contractAjutor}>
                            <Input value={p.referintaContract} onChange={(e) => actualizeazaProiect(i, { referintaContract: e.target.value })} maxLength={120} placeholder={t.contractEx} />
                          </Camp>
                          <Camp className="sm:col-span-3" eticheta={t.beneficiari} ajutor={t.beneficiariAjutor}>
                            <Input type="number" min={0} inputMode="numeric" value={p.nrBeneficiari ?? ""} onChange={(e) => actualizeazaProiect(i, { nrBeneficiari: e.target.value === "" ? null : Number(e.target.value) })} />
                          </Camp>
                          <Camp className="sm:col-span-3" eticheta={t.dovada} ajutor={t.dovadaAjutor}>
                            <Input type="url" value={p.linkDovada} onChange={(e) => actualizeazaProiect(i, { linkDovada: e.target.value })} placeholder="https://…" />
                          </Camp>
                          <Camp className="sm:col-span-6" eticheta={t.titluPublic} ajutor={t.titluPublicAjutor}>
                            <Input value={p.titluPublic} onChange={(e) => actualizeazaProiect(i, { titluPublic: e.target.value })} maxLength={200} />
                          </Camp>
                          <label className="flex items-start gap-2 text-[12.5px] text-[var(--ci-text)] sm:col-span-6">
                            <input type="checkbox" checked={p.acordVerificat} onChange={(e) => actualizeazaProiect(i, { acordVerificat: e.target.checked })} className="mt-0.5 size-4" />
                            <span>{t.acordBifa}</span>
                          </label>
                          <label className="flex items-start gap-2 text-[12.5px] text-[var(--ci-text)] sm:col-span-6">
                            <input type="checkbox" checked={p.nealocat} onChange={(e) => actualizeazaProiect(i, { nealocat: e.target.checked })} className="mt-0.5 size-4" />
                            <span>{t.nealocatBifa}</span>
                          </label>
                        </div>
                      </details>
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => actualizeaza({ proiecte: [...date.proiecte.slice(0, i + 1), { ...p }, ...date.proiecte.slice(i + 1)] })}>
                          <Copy className="size-3.5" aria-hidden /> {t.duplica}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => actualizeaza({ proiecte: date.proiecte.filter((_, j) => j !== i) })}>
                          <Trash2 className="size-3.5" aria-hidden /> {t.sterge}
                        </Button>
                      </div>
                    </div>
                  </details>
                );
              })}
              {date.proiecte.length >= 100 && <p role="alert" className="text-[12.5px] text-[var(--ci-red)]">{t.limita}</p>}
              <div className="flex flex-wrap gap-2">
                <Button disabled={date.proiecte.length >= 100} onClick={() => actualizeaza({ proiecte: [...date.proiecte, { ...PROIECT_GOL }] })}>
                  <Plus className="size-4" aria-hidden /> {t.adaugaProiect}
                </Button>
                {companyId && (
                  <Button variant="ghost" onClick={dinSponsorizari} disabled={ocupat}>
                    <RotateCcw className="size-4" aria-hidden /> {t.reiaSponsorizari}
                  </Button>
                )}
              </div>
            </div>
          </Sectiune>

          <Sectiune titlu={t.logouri} subtitlu={t.logouriSub}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <CampLogo eticheta={t.logoFirma} valoare={date.logoFirma} alt={date.firma} onFisier={alegeLogoFirma} onSterge={() => actualizeaza({ logoFirma: "" })} />
              <CampLogo
                eticheta={t.logoOrganizatie}
                valoare={date.logoOng}
                alt={t.logoOrgAlt}
                onFisier={alegeLogoOng}
                onSterge={() => actualizeaza({ logoOng: "" })}
                extra={initial.logoOngImplicit && date.logoOng !== initial.logoOngImplicit ? <Button size="sm" variant="ghost" onClick={() => actualizeaza({ logoOng: initial.logoOngImplicit })}>{t.logoSetari}</Button> : null}
              />
            </div>
            {eroareLogo && <p role="alert" className="mt-2 text-[13px] text-[var(--ci-red)]">{eroareLogo}</p>}
            <div className="mt-4 border-t border-[var(--ci-border)] pt-3">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <Button size="sm" onClick={preiaCulori} disabled={!date.logoFirma}>
                  <Palette className="size-3.5" aria-hidden /> {t.preiaCulori}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => actualizeaza({ ...CULORI_IMPLICITE })}>
                  <RotateCcw className="size-3.5" aria-hidden /> {t.culoriImplicite}
                </Button>
              </div>
              <p className="mt-2 text-[12.5px] text-[var(--ci-text-muted)]">{paleta ? (paleta.sursa === "logo" ? t.culoriDinLogo : t.logoAlbNegru) : t.culoriManual}</p>
              <div className="mt-3">
                <Camp eticheta={t.motivGrafic} ajutor={t.motivAjutor}>
                  <Select value={date.motivGrafic} onChange={(e) => actualizeaza({ motivGrafic: e.target.value as DateImpact["motivGrafic"] })}>
                    {motive.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.eticheta}
                      </option>
                    ))}
                  </Select>
                </Camp>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {([["accent", t.culoarePrincipala], ["accent2", t.culoareInchisa], ["accent3", t.fundalDeschis]] as const).map(([k, eticheta]) => (
                  <Camp key={k} eticheta={eticheta}>
                    <input type="color" value={date[k]} onChange={(e) => actualizeaza({ [k]: e.target.value })} className="h-9 w-full cursor-pointer rounded-lg border border-[var(--ci-border)] bg-[var(--ci-surface)] p-1 focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none" />
                  </Camp>
                ))}
              </div>
            </div>
          </Sectiune>

          <Sectiune titlu={t.text} subtitlu={t.textSub}>
            <Camp eticheta={t.textulRaportului} ajutor={t.textAjutor(nrPlaceholdere)}>
              <Textarea rows={8} value={date.narativ} onChange={(e) => actualizeaza({ narativ: e.target.value })} maxLength={5000} />
            </Camp>
          </Sectiune>

          <Sectiune titlu={t.incheiere} subtitlu={t.incheiereSub} deschis={faraInvitatie}>
            {faraInvitatie && (
              <div className="mb-3 flex flex-wrap items-center gap-2 rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] bg-[var(--ci-surface-2)] px-3 py-2 text-[12.5px] text-[var(--ci-text)]">
                <span className="min-w-0 flex-1">{t.faraInvitatie(anUrmator)}</span>
                <Button size="sm" onClick={adaugaTextReinnoire}>
                  <Plus className="size-3.5" aria-hidden /> {t.adaugaReinnoire}
                </Button>
              </div>
            )}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Camp className="sm:col-span-2" eticheta={t.ceUrmeaza}>
                <Textarea rows={3} value={date.ceUrmeaza} onChange={(e) => actualizeaza({ ceUrmeaza: e.target.value })} maxLength={800} placeholder={t.ceUrmeazaEx} />
              </Camp>
              <Camp className="sm:col-span-2" eticheta={t.variante} ajutor={t.varianteAjutor}>
                <Textarea rows={3} value={date.optiuniViitor} onChange={(e) => actualizeaza({ optiuniViitor: e.target.value })} maxLength={800} />
              </Camp>
              <Camp eticheta={t.textButon}>
                <Input value={date.ctaText} onChange={(e) => actualizeaza({ ctaText: e.target.value })} maxLength={80} placeholder={t.textButonEx(anUrmator)} />
              </Camp>
              <Camp eticheta={t.linkButon}>
                <Input type="url" value={date.ctaLink} onChange={(e) => actualizeaza({ ctaLink: e.target.value })} placeholder="https://…" />
              </Camp>
              <Camp eticheta={t.contactPersoana}>
                <Input value={date.contactNume} onChange={(e) => actualizeaza({ contactNume: e.target.value })} maxLength={100} />
              </Camp>
              <Camp eticheta={t.telefon}>
                <Input type="tel" value={date.contactTelefon} onChange={(e) => actualizeaza({ contactTelefon: e.target.value })} maxLength={40} />
              </Camp>
              <Camp className="sm:col-span-2" eticheta={t.email}>
                <Input type="email" value={date.contactEmail} onChange={(e) => actualizeaza({ contactEmail: e.target.value })} maxLength={120} />
              </Camp>
              <Camp className="sm:col-span-2" eticheta={t.citat} ajutor={t.citatAjutor}>
                <Textarea rows={2} value={date.citat} onChange={(e) => actualizeaza({ citat: e.target.value })} maxLength={300} />
              </Camp>
              <Camp className="sm:col-span-2" eticheta={t.citatAutor}>
                <Input value={date.citatAutor} onChange={(e) => actualizeaza({ citatAutor: e.target.value })} maxLength={100} />
              </Camp>
              <Camp className="sm:col-span-2" eticheta={t.transparenta}>
                <Input type="url" value={date.transparentaLink} onChange={(e) => actualizeaza({ transparentaLink: e.target.value })} placeholder="https://…" />
              </Camp>
            </div>
          </Sectiune>

          <Sectiune titlu={t.semnatura}>
            <Camp eticheta={t.semneaza} ajutor={t.semneazaAjutor}>
              <Input value={date.autor} onChange={(e) => actualizeaza({ autor: e.target.value })} maxLength={100} placeholder={t.semneazaEx} />
            </Camp>
            <label className="mt-3 flex items-center gap-2 text-[13px] text-[var(--ci-text)]">
              <input type="checkbox" checked={date.gruparePeAn} onChange={(e) => actualizeaza({ gruparePeAn: e.target.checked })} className="size-4" />
              {t.gruparePeAn}
            </label>
          </Sectiune>
        </div>

        <div className={`min-w-0 lg:sticky lg:top-4 ${vedere === "editez" ? "hidden lg:block" : ""}`}>
          <Card className="!p-0 overflow-hidden">
            <div className="flex items-center justify-between border-b border-[var(--ci-border)] px-4 py-2.5">
              <p className="text-[13px] font-semibold text-[var(--ci-text)]">{t.design} · {modelAles.eticheta}</p>
              <p className="text-[12px] text-[var(--ci-text-muted)]">{t.exactCopiaza}</p>
            </div>
            <iframe
              ref={cadru}
              title={t.previzTitlu}
              srcDoc={html}
              sandbox="allow-same-origin allow-modals allow-popups allow-popups-to-escape-sandbox"
              className="block h-[70vh] w-full bg-white lg:h-[calc(100vh-9rem)]"
            />
          </Card>
        </div>
      </div>
    </div>
  );
}

function CampLogo({ eticheta, valoare, alt, onFisier, onSterge, extra }: { eticheta: string; valoare: string; alt: string; onFisier: (f?: File) => void; onSterge: () => void; extra?: React.ReactNode }) {
  const id = useId();
  const t = IMPACT_UI_DICT[useLocale()];
  return (
    <div className="min-w-0">
      <Label htmlFor={id}>{eticheta}</Label>
      <div className="flex flex-col items-start gap-2.5">
        <div
          className="flex h-16 w-full max-w-[11rem] items-center justify-center overflow-hidden rounded-lg border border-[var(--ci-border)]"
          style={{ backgroundImage: "conic-gradient(#f1eded 25%, #fff 0 50%, #f1eded 0 75%, #fff 0)", backgroundSize: "12px 12px" }}
        >
          {valoare ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={valoare} alt={alt} className="max-h-14 max-w-[10rem] object-contain" />
          ) : (
            <span className="px-2 text-center text-[11px] text-[var(--ci-text-faint)]">{t.faraLogo}</span>
          )}
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <label htmlFor={id} className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] bg-[var(--ci-surface)] px-3 text-[13px] font-medium text-[var(--ci-text)] hover:bg-[var(--ci-surface-2)] focus-within:ring-2 focus-within:ring-[var(--ci-primary)]">
            <Upload className="size-3.5" aria-hidden /> {valoare ? t.schimba : t.incarca}
          </label>
          <input
            id={id}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
            className="sr-only"
            onChange={(e) => {
              onFisier(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          {valoare && (
            <Button size="sm" variant="ghost" onClick={onSterge}>
              <Trash2 className="size-3.5" aria-hidden /> {t.sterge}
            </Button>
          )}
          {extra}
        </div>
      </div>
    </div>
  );
}
