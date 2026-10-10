"use client";

import { AlertTriangle, ChevronDown, ClipboardCopy, Copy, Download, Eye, FileDown, LayoutGrid, Palette, PencilLine, Plus, Printer, RotateCcw, Trash2, Upload } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState, useTransition, type ReactNode } from "react";

import { descarcaBlob, htmlInPdf } from "@/lib/html-in-pdf";
import { incarcaLogo, paletaDinLogo } from "@/lib/logo-incarcare";
import { MOTIVE } from "@/lib/motiv";
import { raporteazaEroare } from "@/lib/monitoring";
import { aplicaPlaceholdere, CULORI_IMPLICITE, curataDateImpact, MECANISME_IMPACT, MODELE_IMPACT, PROIECT_GOL, STARI_PROIECT, totalImpact, type DateImpact, type ProiectImpact } from "@/lib/raport-impact";
import type { PaletaLogo } from "@/lib/raport-impact-culori";
import { randeazaRaportImpact } from "@/lib/raport-impact-modele";

import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import { Input, Label, Select, Textarea } from "../../../components/ui/input";
import { formatSuma } from "../../../lib/format";
import { Camp } from "../../_comun/camp";
import { inregistreazaDocumentAction } from "../../_comun/documente-actions";
import { MeniuExport } from "../../_comun/meniu-export";
import { incarcaImpactAction, salveazaImpactAction, type CompanieImpactRand, type IncarcareImpact } from "../impact-actions";

type Stare = "idle" | "asteapta" | "salveaza" | "salvat" | "eroare";

const etichetaStare: Record<Stare, string> = { idle: "", asteapta: "Modificări nesalvate…", salveaza: "Se salvează…", salvat: "Salvat pe fișa firmei", eroare: "Nu s-a putut salva" };

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
      const r = await salveazaImpactAction(orgSlug, id, urmator).catch(() => ({ ok: false as const, eroare: "Eroare" }));
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
      setEroareLogo(e instanceof Error ? e.message : "Logoul nu a putut fi încărcat.");
    }
  }
  async function alegeLogoOng(fisier?: File) {
    if (!fisier) return;
    setEroareLogo(null);
    try {
      actualizeaza({ logoOng: (await incarcaLogo(fisier)).dataUrl });
    } catch (e) {
      setEroareLogo(e instanceof Error ? e.message : "Logoul nu a putut fi încărcat.");
    }
  }
  async function preiaCulori() {
    setEroareLogo(null);
    try {
      const p = await paletaDinLogo(date.logoFirma);
      if (!p) return setEroareLogo("Nu am găsit culori în logo. Alege-le manual mai jos.");
      setPaleta(p);
      actualizeaza(culoriDin(p));
    } catch (e) {
      setEroareLogo(e instanceof Error ? e.message : "Culorile nu au putut fi citite.");
    }
  }

  // Modificările în așteptare se salvează înainte să se schimbe firma: altfel s-ar pierde fără nicio avertizare.
  function schimbaFirma(id: string) {
    if (timer.current) clearTimeout(timer.current);
    const deSalvat = stare === "asteapta" && companyId ? { id: companyId, date } : null;
    start(async () => {
      if (deSalvat) {
        const r = await salveazaImpactAction(orgSlug, deSalvat.id, deSalvat.date).catch(() => ({ ok: false as const, eroare: "Eroare" }));
        if (!r.ok) {
          setMesaj(`Modificările la firma anterioară nu s-au putut salva (${r.eroare}). Nu am schimbat firma.`);
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
      setInfo(noi.length ? `Am adăugat ${noi.length} ${noi.length === 1 ? "proiect" : "proiecte"} din sponsorizări. Ce ai scris rămâne neschimbat.` : "Nu sunt proiecte noi în sponsorizări. Sumele și datele au fost actualizate.");
      setTimeout(() => setInfo(null), 6000);
    });
  }

  const curat = useMemo(() => curataDateImpact(date), [date]);
  const html = useMemo(() => randeazaRaportImpact(curat, { organizatie: initial.organizatie, azi, identificare: initial.identificare }), [curat, initial.organizatie, initial.identificare, azi]);
  const total = totalImpact(curat);
  const nrNumite = curat.proiecte.filter((p) => p.nume && !p.nealocat).length;
  const modelAles = MODELE_IMPACT.find((m) => m.id === date.model)!;
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
        setInfo((x) => `${x ? `${x} ` : ""}${r.ok ? "Salvat în istoric." : "Nu s-a putut salva în istoric (raport prea mare)."}`);
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
    setInfo("Fișierul a fost descărcat.");
    inregistreaza();
    setTimeout(() => setInfo(null), 6000);
  }
  // Codul complet al raportului, gata de lipit în editorul HTML al unei platforme.
  async function copiaza() {
    setMesaj(null);
    try {
      await navigator.clipboard.writeText(html);
    } catch {
      const t = document.createElement("textarea");
      t.value = html;
      t.setAttribute("readonly", "");
      t.style.cssText = "position:fixed;opacity:0;top:0;left:0";
      document.body.appendChild(t);
      t.select();
      const ok = document.execCommand("copy");
      t.remove();
      if (!ok) return setMesaj("Nu am putut copia codul. Folosește „Descarcă HTML” și deschide fișierul într-un editor.");
    }
    setInfo("Codul HTML a fost copiat. Lipește-l în editorul de cod al platformei.");
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
      setInfo(imaginiOmise ? `PDF descărcat, dar ${imaginiOmise === 1 ? "un logo nu a putut fi inclus" : `${imaginiOmise} logo-uri nu au putut fi incluse`} (adresa lui nu e permisă sau nu a răspuns). Încarcă logoul din calculator, ca fișier.` : "PDF-ul a fost descărcat.");
      inregistreaza();
    } catch (e) {
      raporteazaEroare("pdf-direct", e, { tip: "raport", ua: navigator.userAgent.slice(0, 160), lungime: html.length });
      setInfo("Nu am putut crea PDF-ul direct în acest browser. Se deschide tipărirea: alege „Salvează ca PDF”.");
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
      } else setMesaj("Previzualizarea nu e încărcată încă. Încearcă din nou.");
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
    if (lipsaFirma) return setMesaj("Completează numele firmei în secțiunea „Firma” înainte de export.");
    if (deVerificat.length) {
      return setMesaj(
        `${deVerificat.length === 1 ? "Un proiect pare" : `${deVerificat.length} proiecte par`} să vorbească despre un copil sau un pacient (${deVerificat.map((p) => `„${p.nume || "fără nume"}”`).join(", ")}). Completează „Titlu public” fără nume sau bifează că ai acordul pentru publicare, apoi exportă.`,
      );
    }
    actiune();
  };
  const sumaProiecte = date.proiecte.reduce((t, x) => t + (x.suma ?? 0), 0);
  const totalDiferit = date.totalManual != null && date.totalManual !== sumaProiecte;
  const faraInvitatie = !date.ceUrmeaza.trim() && !date.ctaText.trim();

  function adaugaTextReinnoire() {
    actualizeaza({
      ceUrmeaza: date.ceUrmeaza.trim() || `Pentru ${anUrmator} vă propunem să continuăm împreună. Vă invităm la o discuție despre cum sprijinul dumneavoastră poate ajunge la și mai mulți oameni; vă contactăm în următoarele săptămâni.`,
      ctaText: date.ctaText.trim() || `Să continuăm în ${anUrmator}`,
    });
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] bg-[var(--ci-surface)] px-3 py-2.5">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <Link href={`/${orgSlug}/crm/instrumente/raport-companii`} prefetch={false} className="inline-flex h-9 items-center gap-1.5 rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] px-3 text-[13px] font-medium text-[var(--ci-text)] hover:bg-[var(--ci-surface-2)] focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none">
            <LayoutGrid className="size-4" aria-hidden /> Galerie de șabloane
          </Link>
          <h1 className="ci-display text-[15px] font-bold text-[var(--ci-text)]">Raport de impact pentru companii</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Starea intermediară (modificări nesalvate) e doar vizuală; cititoarele de ecran aud doar „Salvat”, erorile și rezultatele exportului. */}
          <span className="text-[12px] text-[var(--ci-text-muted)]" aria-hidden>
            {info ?? etichetaStare[stare]}
          </span>
          <span className="sr-only" role="status" aria-live="polite">
            {info ?? (stare === "salvat" || stare === "eroare" ? etichetaStare[stare] : "")}
          </span>
          <Button variant="primary" onClick={() => cuVerificari(copiaza)} className="min-h-11 sm:min-h-9" title="Copiază tot codul HTML al raportului">
            <ClipboardCopy className="size-4" aria-hidden /> Copiază codul HTML
          </Button>
          <Button onClick={() => cuVerificari(exportaPdf)} disabled={seFacePdf} className="min-h-11 sm:min-h-9" title="Descarcă un fișier PDF (pagini A4 în înaltă rezoluție)">
            <FileDown className="size-4" aria-hidden /> {seFacePdf ? "Se pregătește PDF-ul…" : "Export PDF"}
          </Button>
          <MeniuExport
            elemente={[
              { eticheta: "Descarcă HTML", descriere: "Un fișier pe care îl deschizi în browser.", icon: <Download className="size-4" aria-hidden />, onClick: () => cuVerificari(exportaHtml) },
              { eticheta: "Tipărește sau PDF cu text selectabil", descriere: "Deschide tipărirea; în ea alegi „Salvează ca PDF”. Textul și linkurile rămân active.", icon: <Printer className="size-4" aria-hidden />, onClick: () => cuVerificari(tipareste) },
            ]}
          />
        </div>
      </div>
      <p className="-mt-2 max-w-4xl text-[12.5px] text-[var(--ci-text-muted)]">
        Alegi șablonul, completezi datele și vezi raportul în dreapta. Pentru platformă, copiezi codul HTML și îl lipești în editorul de cod. Unele platforme de email taie o parte din stiluri; pentru trimitere prin email, PDF-ul e varianta sigură. Citește raportul înainte să-l trimiți: textele sunt orientative.
      </p>
      <div role="tablist" aria-label="Vedere" className="grid grid-cols-2 gap-1 rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] bg-[var(--ci-surface)] p-1 lg:hidden">
        {([["editez", "Editez", PencilLine], ["previz", "Previzualizez", Eye]] as const).map(([k, e, Icon]) => (
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
          <Sectiune titlu="Șablon" subtitlu={modelAles.hint} deschis>
            <Camp eticheta="Tipul de raport">
              <Select value={date.model} onChange={(e) => actualizeaza({ model: e.target.value as DateImpact["model"] })}>
                {MODELE_IMPACT.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.eticheta}
                  </option>
                ))}
              </Select>
            </Camp>
          </Sectiune>

          <Sectiune titlu="Firma" subtitlu={companyId ? (salvat ? "Se păstrează ce ai salvat data trecută" : "Propunere din sponsorizările înregistrate") : "Fără firmă din listă, nu se salvează nimic"} deschis>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Camp eticheta="Firmă din CRM">
                <Select value={companyId ?? ""} onChange={(e) => schimbaFirma(e.target.value)} disabled={ocupat}>
                  <option value="">Altă firmă (completez manual)</option>
                  {companii.map((c) => (
                    <option key={c.companyId} value={c.companyId}>
                      {c.nume} · {formatSuma(c.total)}
                    </option>
                  ))}
                </Select>
              </Camp>
              <Camp eticheta="Numele din raport">
                <Input value={date.firma} onChange={(e) => actualizeaza({ firma: e.target.value })} maxLength={200} placeholder="ex. Firma SRL" />
              </Camp>
              <Camp eticheta="Mecanism" ajutor={date.mecanism === "nespecificat" ? "Textul rămâne general: „sprijinul acordat”." : "Formularea din raport e orientativă. Verific-o cu contabilul sau cu un jurist înainte să trimiți raportul."}>
                <Select value={date.mecanism} onChange={(e) => actualizeaza({ mecanism: e.target.value as DateImpact["mecanism"] })}>
                  {MECANISME_IMPACT.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.eticheta}
                    </option>
                  ))}
                </Select>
              </Camp>
              <Camp eticheta="Total (lasă gol ca să se adune)" ajutor={totalDiferit ? `Atenție: totalul scris (${formatSuma(date.totalManual ?? 0)}) diferă de suma proiectelor (${formatSuma(sumaProiecte)}). Raportul îl afișează pe cel scris și notează diferența.` : undefined}>
                <Input inputMode="numeric" value={date.totalManual ?? ""} onChange={(e) => actualizeaza({ totalManual: e.target.value === "" ? null : Number(e.target.value.replace(/\D/g, "")) })} placeholder={String(sumaProiecte)} />
              </Camp>
            </div>
          </Sectiune>

          <Sectiune titlu="Proiecte susținute" subtitlu={`${nrNumite} ${nrNumite === 1 ? "proiect" : "proiecte"} · ${formatSuma(total)}`} deschis>
            <div className="space-y-3">
              {date.proiecte.length === 0 && <p className="text-[13px] text-[var(--ci-text-muted)]">Niciun proiect încă. Adaugă unul sau {companyId ? "reia-le din sponsorizări." : "alege o firmă din CRM."}</p>}
              {date.proiecte.map((p, i) => {
                const atentie = areNevoieDeAcord(p);
                return (
                  <details key={i} open={!p.nume || date.proiecte.length <= 2 || atentie} className="group rounded-[var(--ci-radius-card)] border border-[var(--ci-border)]">
                    <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 rounded-[var(--ci-radius-card)] px-3 py-2 text-left focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none [&::-webkit-details-marker]:hidden">
                      <span className="min-w-0 truncate text-[13px] font-semibold text-[var(--ci-text)]">
                        {p.nume || "Proiect nou"}
                        <span className="ml-2 font-normal text-[var(--ci-text-muted)]">
                          {p.suma !== null ? formatSuma(p.suma) : ""}
                          {p.stare ? ` · ${STARI_PROIECT.find((x) => x.id === p.stare)?.eticheta}` : ""}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        {atentie && (
                          <span className="inline-flex items-center gap-1 text-[12px] font-medium text-[var(--ci-red)]">
                            <AlertTriangle className="size-3.5" aria-hidden /> Acord necesar
                          </span>
                        )}
                        <ChevronDown className="size-4 text-[var(--ci-text-muted)] transition-transform group-open:rotate-180" aria-hidden />
                      </span>
                    </summary>
                    <div className="space-y-2.5 px-3 pb-3">
                      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-6">
                        <Camp className="sm:col-span-4" eticheta="Proiect">
                          <Input value={p.nume} onChange={(e) => actualizeazaProiect(i, { nume: e.target.value })} maxLength={200} />
                        </Camp>
                        <Camp className="sm:col-span-2" eticheta="Sumă (lei)">
                          <Input type="number" min={0} inputMode="numeric" value={p.suma ?? ""} onChange={(e) => actualizeazaProiect(i, { suma: e.target.value === "" ? null : Number(e.target.value) })} />
                        </Camp>
                        <Camp className="sm:col-span-3" eticheta="Data încasării sau alocării" ajutor="După ea se grupează pe ani.">
                          <Input type="date" value={p.data} onChange={(e) => actualizeazaProiect(i, { data: e.target.value })} />
                        </Camp>
                        <Camp className="sm:col-span-3" eticheta="Stare">
                          <Select value={p.stare} onChange={(e) => actualizeazaProiect(i, { stare: e.target.value as ProiectImpact["stare"] })}>
                            {STARI_PROIECT.map((st) => (
                              <option key={st.id} value={st.id}>
                                {st.eticheta}
                              </option>
                            ))}
                          </Select>
                        </Camp>
                        <Camp className="sm:col-span-6" eticheta="Rezultat obținut" ajutor="Ce s-a realizat concret cu această sumă. Apare în raport.">
                          <Textarea rows={2} value={p.observatii} onChange={(e) => actualizeazaProiect(i, { observatii: e.target.value })} maxLength={600} />
                        </Camp>
                      </div>
                      <details open={atentie} className="rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)]">
                        <summary className="flex min-h-10 cursor-pointer items-center gap-1.5 px-3 text-[12.5px] font-semibold text-[var(--ci-text-muted)] focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none">Detalii, dovezi și acord</summary>
                        <div className="grid grid-cols-1 gap-2.5 p-3 sm:grid-cols-6">
                          <Camp className="sm:col-span-6" eticheta="Link către pagina proiectului" ajutor="Doar adrese https.">
                            <Input type="url" value={p.link} onChange={(e) => actualizeazaProiect(i, { link: e.target.value })} placeholder="https://…" />
                          </Camp>
                          <Camp className={date.mecanism === "d177" ? "sm:col-span-4" : "sm:col-span-6"} eticheta="Partener sau loc (opțional)">
                            <Input value={p.locatie} onChange={(e) => actualizeazaProiect(i, { locatie: e.target.value })} maxLength={200} />
                          </Camp>
                          {date.mecanism === "d177" && (
                            <Camp className="sm:col-span-2" eticheta="Anul fiscal al direcționării">
                              <Input type="number" min={2000} max={2100} value={p.anDirectionare ?? ""} onChange={(e) => actualizeazaProiect(i, { anDirectionare: e.target.value === "" ? null : Number(e.target.value) })} />
                            </Camp>
                          )}
                          <Camp className="sm:col-span-3" eticheta="Beneficiari (număr, opțional)" ajutor="Doar beneficiari unici, fără dublări între proiecte.">
                            <Input type="number" min={0} inputMode="numeric" value={p.nrBeneficiari ?? ""} onChange={(e) => actualizeazaProiect(i, { nrBeneficiari: e.target.value === "" ? null : Number(e.target.value) })} />
                          </Camp>
                          <Camp className="sm:col-span-3" eticheta="Dovadă (link https, opțional)" ajutor="Ordin de plată, factură sau raport anonimizat. Fără documente cu date personale.">
                            <Input type="url" value={p.linkDovada} onChange={(e) => actualizeazaProiect(i, { linkDovada: e.target.value })} placeholder="https://…" />
                          </Camp>
                          <Camp className="sm:col-span-6" eticheta="Titlu public (opțional)" ajutor="Dacă îl completezi, apare în raport în locul numelui de mai sus. Folosește-l când numele intern conține date personale, de exemplu numele unui copil.">
                            <Input value={p.titluPublic} onChange={(e) => actualizeazaProiect(i, { titluPublic: e.target.value })} maxLength={200} />
                          </Camp>
                          <label className="flex items-start gap-2 text-[12.5px] text-[var(--ci-text)] sm:col-span-6">
                            <input type="checkbox" checked={p.acordVerificat} onChange={(e) => actualizeazaProiect(i, { acordVerificat: e.target.checked })} className="mt-0.5 size-4" />
                            <span>Am verificat că proiectul poate fi publicat (acord pentru poveste și imagini, fără date medicale sau personale ne-anonimizate). Pentru minori acordul îl dau părinții și poate fi retras.</span>
                          </label>
                          <label className="flex items-start gap-2 text-[12.5px] text-[var(--ci-text)] sm:col-span-6">
                            <input type="checkbox" checked={p.nealocat} onChange={(e) => actualizeazaProiect(i, { nealocat: e.target.checked })} className="mt-0.5 size-4" />
                            <span>Sumă primită, dar încă neafectată unui proiect (nu se numără ca proiect).</span>
                          </label>
                        </div>
                      </details>
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => actualizeaza({ proiecte: [...date.proiecte.slice(0, i + 1), { ...p }, ...date.proiecte.slice(i + 1)] })}>
                          <Copy className="size-3.5" aria-hidden /> Duplică
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => actualizeaza({ proiecte: date.proiecte.filter((_, j) => j !== i) })}>
                          <Trash2 className="size-3.5" aria-hidden /> Șterge
                        </Button>
                      </div>
                    </div>
                  </details>
                );
              })}
              {date.proiecte.length >= 100 && <p role="alert" className="text-[12.5px] text-[var(--ci-red)]">Ai atins limita de 100 de proiecte. Proiectele în plus nu se mai păstrează.</p>}
              <div className="flex flex-wrap gap-2">
                <Button disabled={date.proiecte.length >= 100} onClick={() => actualizeaza({ proiecte: [...date.proiecte, { ...PROIECT_GOL }] })}>
                  <Plus className="size-4" aria-hidden /> Adaugă proiect
                </Button>
                {companyId && (
                  <Button variant="ghost" onClick={dinSponsorizari} disabled={ocupat}>
                    <RotateCcw className="size-4" aria-hidden /> Reia din sponsorizări
                  </Button>
                )}
              </div>
            </div>
          </Sectiune>

          <Sectiune titlu="Logo-uri și culori" subtitlu="Apar împreună în antet. Culorile raportului se iau din logoul firmei.">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <CampLogo eticheta="Logo firmă" valoare={date.logoFirma} alt={date.firma} onFisier={alegeLogoFirma} onSterge={() => actualizeaza({ logoFirma: "" })} />
              <CampLogo
                eticheta="Logo organizație"
                valoare={date.logoOng}
                alt="Logo organizație"
                onFisier={alegeLogoOng}
                onSterge={() => actualizeaza({ logoOng: "" })}
                extra={initial.logoOngImplicit && date.logoOng !== initial.logoOngImplicit ? <Button size="sm" variant="ghost" onClick={() => actualizeaza({ logoOng: initial.logoOngImplicit })}>Folosește logoul din Setări</Button> : null}
              />
            </div>
            {eroareLogo && <p role="alert" className="mt-2 text-[13px] text-[var(--ci-red)]">{eroareLogo}</p>}
            <div className="mt-4 border-t border-[var(--ci-border)] pt-3">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <Button size="sm" onClick={preiaCulori} disabled={!date.logoFirma}>
                  <Palette className="size-3.5" aria-hidden /> Preia culorile din logo
                </Button>
                <Button size="sm" variant="ghost" onClick={() => actualizeaza({ ...CULORI_IMPLICITE })}>
                  <RotateCcw className="size-3.5" aria-hidden /> Culorile implicite
                </Button>
              </div>
              <p className="mt-2 text-[12.5px] text-[var(--ci-text-muted)]">{paleta ? (paleta.sursa === "logo" ? "Culori preluate din logoul firmei." : "Logoul e alb-negru: am ales nuanțe neutre.") : "Culorile se pot lua din logo sau se aleg manual, mai jos."}</p>
              <div className="mt-3">
                <Camp eticheta="Motiv grafic" ajutor="Apare discret în copertă, în decor și în sigilii.">
                  <Select value={date.motivGrafic} onChange={(e) => actualizeaza({ motivGrafic: e.target.value as DateImpact["motivGrafic"] })}>
                    {MOTIVE.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.eticheta}
                      </option>
                    ))}
                  </Select>
                </Camp>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {([["accent", "Culoare principală"], ["accent2", "Culoare închisă"], ["accent3", "Fundal deschis"]] as const).map(([k, eticheta]) => (
                  <Camp key={k} eticheta={eticheta}>
                    <input type="color" value={date[k]} onChange={(e) => actualizeaza({ [k]: e.target.value })} className="h-9 w-full cursor-pointer rounded-lg border border-[var(--ci-border)] bg-[var(--ci-surface)] p-1 focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none" />
                  </Camp>
                ))}
              </div>
            </div>
          </Sectiune>

          <Sectiune titlu="Text" subtitlu="Se completează automat: {FIRMA}, {NR_PROIECTE}, {MECANISM}, {TOTAL}, {PERIOADA}, {PERIOADA_TXT}, {PROIECTE_TXT}, {CONTACT}">
            <Camp eticheta="Textul raportului" ajutor={`Paragrafele se despart printr-un rând liber. Acum: ${nrPlaceholdere} ${nrPlaceholdere === 1 ? "paragraf" : "paragrafe"}. Scrie doar ce e adevărat pentru această firmă.`}>
              <Textarea rows={8} value={date.narativ} onChange={(e) => actualizeaza({ narativ: e.target.value })} maxLength={5000} />
            </Camp>
          </Sectiune>

          <Sectiune titlu="Încheiere" subtitlu="Ce urmează, variante pentru anul viitor, un buton și datele de contact. Ce lași gol nu apare în raport." deschis={faraInvitatie}>
            {faraInvitatie && (
              <div className="mb-3 flex flex-wrap items-center gap-2 rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] bg-[var(--ci-surface-2)] px-3 py-2 text-[12.5px] text-[var(--ci-text)]">
                <span className="min-w-0 flex-1">Raportul nu invită la nimic: fără „Ce urmează” sau buton, rămâne doar o recipisă. O invitație pentru {anUrmator} ajută la reînnoire.</span>
                <Button size="sm" onClick={adaugaTextReinnoire}>
                  <Plus className="size-3.5" aria-hidden /> Adaugă text de reînnoire
                </Button>
              </div>
            )}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Camp className="sm:col-span-2" eticheta="Ce urmează">
                <Textarea rows={3} value={date.ceUrmeaza} onChange={(e) => actualizeaza({ ceUrmeaza: e.target.value })} maxLength={800} placeholder="ex. Anul viitor continuăm proiectul în încă două spitale." />
              </Camp>
              <Camp className="sm:col-span-2" eticheta="Variante pentru anul viitor" ajutor="Câte una pe rând: suma și ce se obține cu ea. Ex.: „12.000 lei — 40 de copii examinați la timp”.">
                <Textarea rows={3} value={date.optiuniViitor} onChange={(e) => actualizeaza({ optiuniViitor: e.target.value })} maxLength={800} />
              </Camp>
              <Camp eticheta="Text buton (invitație)">
                <Input value={date.ctaText} onChange={(e) => actualizeaza({ ctaText: e.target.value })} maxLength={80} placeholder={`ex. Să continuăm în ${anUrmator}`} />
              </Camp>
              <Camp eticheta="Link buton (https)">
                <Input type="url" value={date.ctaLink} onChange={(e) => actualizeaza({ ctaLink: e.target.value })} placeholder="https://…" />
              </Camp>
              <Camp eticheta="Persoană de contact">
                <Input value={date.contactNume} onChange={(e) => actualizeaza({ contactNume: e.target.value })} maxLength={100} />
              </Camp>
              <Camp eticheta="Telefon">
                <Input type="tel" value={date.contactTelefon} onChange={(e) => actualizeaza({ contactTelefon: e.target.value })} maxLength={40} />
              </Camp>
              <Camp className="sm:col-span-2" eticheta="Email">
                <Input type="email" value={date.contactEmail} onChange={(e) => actualizeaza({ contactEmail: e.target.value })} maxLength={120} />
              </Camp>
              <Camp className="sm:col-span-2" eticheta="Citat sau mesaj scurt" ajutor="Folosește un citat doar cu acordul persoanei.">
                <Textarea rows={2} value={date.citat} onChange={(e) => actualizeaza({ citat: e.target.value })} maxLength={300} />
              </Camp>
              <Camp className="sm:col-span-2" eticheta="Cine a spus citatul (opțional)">
                <Input value={date.citatAutor} onChange={(e) => actualizeaza({ citatAutor: e.target.value })} maxLength={100} />
              </Camp>
              <Camp className="sm:col-span-2" eticheta="Link către pagina de transparență (https)">
                <Input type="url" value={date.transparentaLink} onChange={(e) => actualizeaza({ transparentaLink: e.target.value })} placeholder="https://…" />
              </Camp>
            </div>
          </Sectiune>

          <Sectiune titlu="Semnătură și opțiuni">
            <Camp eticheta="Semnează" ajutor="Persoana care răspunde de cifrele din raport.">
              <Input value={date.autor} onChange={(e) => actualizeaza({ autor: e.target.value })} maxLength={100} placeholder="Prenume și nume" />
            </Camp>
            <label className="mt-3 flex items-center gap-2 text-[13px] text-[var(--ci-text)]">
              <input type="checkbox" checked={date.gruparePeAn} onChange={(e) => actualizeaza({ gruparePeAn: e.target.checked })} className="size-4" />
              Grupează proiectele pe ani (unde modelul permite)
            </label>
          </Sectiune>
        </div>

        <div className={`min-w-0 lg:sticky lg:top-4 ${vedere === "editez" ? "hidden lg:block" : ""}`}>
          <Card className="!p-0 overflow-hidden">
            <div className="flex items-center justify-between border-b border-[var(--ci-border)] px-4 py-2.5">
              <p className="text-[13px] font-semibold text-[var(--ci-text)]">Design · {modelAles.eticheta}</p>
              <p className="text-[12px] text-[var(--ci-text-muted)]">Exact ce se copiază și se exportă</p>
            </div>
            <iframe
              ref={cadru}
              title="Previzualizarea raportului de impact"
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
            <span className="px-2 text-center text-[11px] text-[var(--ci-text-faint)]">Fără logo</span>
          )}
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <label htmlFor={id} className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] bg-[var(--ci-surface)] px-3 text-[13px] font-medium text-[var(--ci-text)] hover:bg-[var(--ci-surface-2)] focus-within:ring-2 focus-within:ring-[var(--ci-primary)]">
            <Upload className="size-3.5" aria-hidden /> {valoare ? "Schimbă" : "Încarcă"}
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
              <Trash2 className="size-3.5" aria-hidden /> Șterge
            </Button>
          )}
          {extra}
        </div>
      </div>
    </div>
  );
}
