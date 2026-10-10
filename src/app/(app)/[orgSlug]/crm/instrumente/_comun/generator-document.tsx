"use client";

import { ClipboardCopy, Download, Eye, FileDown, LayoutGrid, Palette, Pencil, RotateCcw, Trash2, Upload } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import { descarcaBlob, htmlInPdf } from "@/lib/html-in-pdf";
import { raporteazaEroare } from "@/lib/monitoring";
import { incarcaLogo, paletaDinLogo } from "@/lib/logo-incarcare";
import { paletaDinHex, type PaletaLogo } from "@/lib/raport-impact-culori";

import { Button } from "../../components/ui/button";
import { Card, CardHeader } from "../../components/ui/card";
import { Dialog } from "../../components/ui/dialog";
import { Input, Label, Select, Textarea } from "../../components/ui/input";
import { Camp } from "./camp";
import { MeniuExport } from "./meniu-export";
import { inregistreazaDocumentAction, urmatorulNumarAction, type TipDoc } from "./documente-actions";

export type CampDef = { cheie: string; eticheta: string; tip?: "text" | "textarea" | "data" | "select"; optiuni?: readonly { id: string; eticheta: string }[]; ajutor?: string; placeholder?: string; rows?: number; jumatate?: boolean };
export type GrupDef = { titlu: string; subtitlu?: string; campuri: CampDef[] };
export type TipDef = { id: string; eticheta: string; patch: Record<string, string> };
export type ModelDef = { id: string; eticheta: string; hint: string };
export type Banner = { text: string; href?: string; eticheta?: string };

type Date_ = Record<string, unknown> & { model: string; accent: string; accent2: string; accent3: string };

export type GeneratorProps<D extends Date_> = {
  orgSlug: string;
  cheieTool: TipDoc;
  titlu: string;
  galerieHref: string;
  modele: readonly ModelDef[];
  date: D;
  curata: (brut: unknown) => D;
  randeaza: (d: D) => string;
  grupuri: GrupDef[];
  tipuri?: { cheie: string; eticheta: string; optiuni: TipDef[] };
  logoOng: { cheie: string; implicit: string };
  logoDestinatar?: { cheie: string; eticheta: string };
  culoareOrganizatie: string | null;
  numeFisier: (d: D) => string;
  titluIstoric: (d: D) => string;
  numerotare?: { cheie: string };
  campuriPersonale: string[]; // nu se păstrează în ciorna din browser (nume, adrese)
  modelDinUrl?: string; // modelul ales din galerie are prioritate față de ciornă
  datePregatite?: boolean; // datele vin dintr-un document redeschis sau din fișa unei firme: ciorna nu se aplică
  firmaId?: string | null;
  bannere?: Banner[];
  avertizare?: (d: D) => string | null;
  ajutor: string;
};

// Amprentă scurtă a unui text (hash FNV-1a pe tot conținutul): două documente diferite nu mai pot părea la fel.
function semnatura(t: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < t.length; i++) h = Math.imul(h ^ t.charCodeAt(i), 0x01000193);
  return `${t.length}:${(h >>> 0).toString(36)}`;
}

const ZILE_CIORNA = 14;
const MS_ZI = 86_400_000;

// Generator de documente: formularul în stânga, designul în dreapta, în timp real (de la 1024 px lățime; pe ecran mic, filele Editez / Previzualizez).
export function GeneratorDocument<D extends Date_>(p: GeneratorProps<D>) {
  const [date, setDate] = useState<D>(p.date);
  const [vedere, setVedere] = useState<"editez" | "previz">("editez");
  const [info, setInfo] = useState<string | null>(null);
  const [eroare, setEroare] = useState<string | null>(null);
  const [eroareLogo, setEroareLogo] = useState<string | null>(null);
  const [paleta, setPaleta] = useState<PaletaLogo | null>(null);
  const [ciorna, setCiorna] = useState<string | null>(null); // data ciornei restaurate
  const [seFacePdf, setSeFacePdf] = useState(false);
  const [seteazaNumar, setSeteazaNumar] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cadru = useRef<HTMLIFrameElement>(null);
  const ultimaInregistrare = useRef<string>("");
  // Confirmări în dialog propriu (nu fereastra standard a browserului) și avertizarea la ieșire cât timp există modificări neexportate.
  const [conf, setConf] = useState<{ titlu: string; text: string; actiune: () => void } | null>(null);
  const [modificat, setModificat] = useState(false);
  useEffect(() => {
    if (!modificat) return;
    const avertizeaza = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", avertizeaza);
    return () => window.removeEventListener("beforeunload", avertizeaza);
  }, [modificat]);
  const cheieCiorna = `fa-doc-${p.cheieTool}-${p.orgSlug}`;

  // Ciorna se păstrează în browserul acesta, fără numele persoanelor, și expiră după 14 zile. La deconectare se șterge.
  useEffect(() => {
    if (!p.datePregatite) {
      try {
        const brut = window.localStorage.getItem(cheieCiorna);
        if (brut) {
          const c = JSON.parse(brut) as { la?: number; date?: unknown };
          if (typeof c.la === "number" && Date.now() - c.la < ZILE_CIORNA * MS_ZI && c.date) {
            const restaurat = p.curata({ ...p.date, ...(c.date as object) });
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setDate(p.modelDinUrl ? ({ ...restaurat, model: p.modelDinUrl } as D) : restaurat);
            setCiorna(new Date(c.la).toLocaleDateString("ro-RO"));
          } else window.localStorage.removeItem(cheieCiorna);
        }
      } catch {
        /* fără ciornă */
      }
    }
    return () => void (timer.current && clearTimeout(timer.current));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function salveazaCiorna(urmator: D) {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      try {
        const fara: Record<string, unknown> = { ...urmator };
        for (const k of p.campuriPersonale) delete fara[k];
        window.localStorage.setItem(cheieCiorna, JSON.stringify({ la: Date.now(), date: fara }));
      } catch {
        /* spațiu plin sau blocat */
      }
    }, 500);
  }
  function actualizeaza(patch: Partial<D>) {
    setModificat(true);
    setDate((prev) => {
      const urmator = { ...prev, ...patch };
      salveazaCiorna(urmator);
      return urmator;
    });
    setEroare(null);
  }

  const { curata, randeaza } = p;
  const curat = useMemo(() => curata(date), [date, curata]);
  const html = useMemo(() => randeaza(curat), [curat, randeaza]);
  const modelAles = p.modele.find((m) => m.id === date.model) ?? p.modele[0];
  const avertisment = p.avertizare?.(curat) ?? null;
  const val = (k: string) => (typeof date[k] === "string" ? (date[k] as string) : "");

  const culoriDin = (pl: PaletaLogo): Partial<D> => ({ accent: pl.accent, accent2: pl.accent2, accent3: pl.accent3 }) as Partial<D>;
  async function alegeLogo(cheie: string, fisier?: File, preiaCulori = false) {
    if (!fisier) return;
    setEroareLogo(null);
    try {
      const r = await incarcaLogo(fisier);
      if (preiaCulori && r.paleta) setPaleta(r.paleta);
      actualizeaza({ [cheie]: r.dataUrl, ...(preiaCulori && r.paleta ? culoriDin(r.paleta) : {}) } as Partial<D>);
    } catch (e) {
      setEroareLogo(e instanceof Error ? e.message : "Logoul nu a putut fi încărcat.");
    }
  }
  async function culoriDinLogo(cheie: string) {
    setEroareLogo(null);
    try {
      const pl = await paletaDinLogo(val(cheie));
      if (!pl) return setEroareLogo("Nu am găsit culori în logo. Alege-le manual.");
      setPaleta(pl);
      actualizeaza(culoriDin(pl));
    } catch (e) {
      setEroareLogo(e instanceof Error ? e.message : "Culorile nu au putut fi citite.");
    }
  }

  // Fiecare export se înregistrează în istoricul organizației (cu datele, ca să poată fi redeschis).
  function inregistreaza() {
    const semn = semnatura(html);
    if (semn === ultimaInregistrare.current) return;
    ultimaInregistrare.current = semn;
    // Logo-urile (date de imagine mari) nu se trimit: se iau din Setări la redeschidere.
    const faraLogo = { ...curat, logoOng: "", logoDestinatar: "", logoFirma: "" };
    inregistreazaDocumentAction(p.orgSlug, p.cheieTool, { titlu: p.titluIstoric(curat), firmaId: p.firmaId ?? null, numar: p.numerotare ? val(p.numerotare.cheie) : "", date: faraLogo })
      .then((r) => {
        if (r.ok) {
          setModificat(false);
          setInfo((x) => (x ? `${x} Salvat în istoric.` : "Salvat în istoric."));
        }
        else {
          ultimaInregistrare.current = "";
          setInfo((x) => (x ? `${x} Nu s-a putut salva în istoric.` : "Nu s-a putut salva în istoric."));
        }
      })
      .catch((e) => {
        ultimaInregistrare.current = "";
        raporteazaEroare("documente-istoric", e, { tip: p.cheieTool });
        setInfo((x) => (x ? `${x} Nu s-a putut salva în istoric.` : "Nu s-a putut salva în istoric."));
      });
  }

  async function copiaza() {
    setEroare(null);
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
      if (!ok) return setEroare("Nu am putut copia codul. Folosește „Descarcă HTML”.");
    }
    setInfo("Codul HTML a fost copiat.");
    inregistreaza();
    setTimeout(() => setInfo(null), 6000);
  }
  const numeSigur = () => p.numeFisier(curat).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || p.cheieTool;
  function descarca() {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
    a.download = `${numeSigur()}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    setInfo("Fișierul a fost descărcat.");
    inregistreaza();
    setTimeout(() => setInfo(null), 6000);
  }
  // „Salvează ca PDF” descarcă direct un fișier PDF (pagină-imagine de înaltă rezoluție). Dacă browserul nu poate, se deschide tipărirea.
  async function pdf() {
    setEroare(null);
    setSeFacePdf(true);
    try {
      const { blob, imaginiOmise } = await htmlInPdf(html);
      descarcaBlob(blob, `${numeSigur()}.pdf`);
      inregistreaza();
      setInfo(imaginiOmise ? `PDF descărcat, dar ${imaginiOmise === 1 ? "un logo nu a putut fi inclus" : `${imaginiOmise} logo-uri nu au putut fi incluse`} (adresa lui nu e permisă sau nu a răspuns). Încarcă logoul din calculator, ca fișier.` : "PDF-ul a fost descărcat.");
      setTimeout(() => setInfo(null), 8000);
    } catch (e) {
      raporteazaEroare("pdf-direct", e, { tip: p.cheieTool, ua: navigator.userAgent.slice(0, 160), lungime: html.length });
      setInfo("Nu am putut crea PDF-ul direct în acest browser. Se deschide tipărirea: alege „Salvează ca PDF”.");
      setTimeout(() => setInfo(null), 8000);
      tipareste();
    } finally {
      setSeFacePdf(false);
    }
  }
  function tipareste() {
    const ruleaza = () => {
      const w = cadru.current?.contentWindow;
      if (w) {
        w.focus();
        w.print();
        inregistreaza();
      } else setEroare("Previzualizarea nu e încărcată încă. Încearcă din nou.");
    };
    if (vedere === "editez" && window.matchMedia("(max-width: 1023px)").matches) {
      setVedere("previz");
      setTimeout(ruleaza, 250);
    } else ruleaza();
  }
  function reseteaza() {
    setConf({
      titlu: "Începi de la capăt?",
      text: "Se șterge tot ce ai completat și revii la textul de pornire. Documentele deja exportate rămân în istoric.",
      actiune: () => {
        try {
          window.localStorage.removeItem(cheieCiorna);
        } catch {
          /* nimic de șters */
        }
        setDate(p.date);
        setPaleta(null);
        setCiorna(null);
        setModificat(false);
      },
    });
  }

  async function numarAutomat() {
    if (!p.numerotare) return;
    setSeteazaNumar(true);
    try {
      actualizeaza({ [p.numerotare.cheie]: await urmatorulNumarAction(p.orgSlug, p.cheieTool) } as Partial<D>);
    } catch {
      setEroare("Nu am putut atribui un număr. Încearcă din nou.");
    } finally {
      setSeteazaNumar(false);
    }
  }

  // Schimbarea tipului înlocuiește textul: dacă ai scris deja ceva diferit de textul de pornire al tipului curent, întrebăm întâi.
  function schimbaTip(idNou: string) {
    const nou = p.tipuri?.optiuni.find((x) => x.id === idNou);
    const curentTip = p.tipuri?.optiuni.find((x) => x.id === val(p.tipuri!.cheie));
    if (!nou || !p.tipuri) return;
    const editat = curentTip ? Object.entries(curentTip.patch).some(([k, v]) => val(k) !== v) : Object.keys(nou.patch).some((k) => val(k).trim() !== "");
    const aplica = () => actualizeaza({ [p.tipuri!.cheie]: nou.id, ...nou.patch } as Partial<D>);
    if (editat) setConf({ titlu: "Înlocuiești textul?", text: "Ai modificat textul. Noul tip are alt text de pornire: dacă continui, textul tău se înlocuiește.", actiune: aplica });
    else aplica();
  }

  return (
    <div className="mx-auto max-w-[1500px] space-y-4 pb-20 lg:pb-0">
      <Dialog open={!!conf} onClose={() => setConf(null)} title={conf?.titlu ?? ""}>
        <p className="text-[13.5px] text-[var(--ci-text-muted)]">{conf?.text}</p>
        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={() => setConf(null)}>Anulează</Button>
          <Button
            variant="primary"
            onClick={() => {
              const a = conf?.actiune;
              setConf(null);
              a?.();
            }}
          >
            Continuă
          </Button>
        </div>
      </Dialog>
      <div className="fixed inset-x-0 bottom-0 z-30 flex gap-2 border-t border-[var(--ci-border)] bg-[var(--ci-surface)] p-2 lg:hidden">
        <Button className="min-h-11 flex-1" onClick={() => setVedere((v) => (v === "editez" ? "previz" : "editez"))}>
          {vedere === "editez" ? "Previzualizează" : "Înapoi la editare"}
        </Button>
        <Button variant="primary" className="min-h-11 flex-1" onClick={pdf} disabled={seFacePdf}>
          {seFacePdf ? "Se pregătește…" : "Salvează ca PDF"}
        </Button>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] bg-[var(--ci-surface)] px-3 py-2.5">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <Link href={p.galerieHref} prefetch={false} className="inline-flex h-9 items-center gap-1.5 rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] px-3 text-[13px] font-medium text-[var(--ci-text)] hover:bg-[var(--ci-surface-2)] focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none">
            <LayoutGrid className="size-4" aria-hidden /> Galerie de șabloane
          </Link>
          <h1 className="ci-display text-[15px] font-bold text-[var(--ci-text)]">{p.titlu}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[12px] text-[var(--ci-text-muted)]" role="status" aria-live="polite">
            {info}
          </span>
          <Button variant="primary" onClick={pdf} disabled={seFacePdf} title="Descarcă un fișier PDF (pagină în înaltă rezoluție)">
            <FileDown className="size-4" aria-hidden /> {seFacePdf ? "Se pregătește PDF-ul…" : "Salvează ca PDF"}
          </Button>
          <MeniuExport
            elemente={[
              { eticheta: "Copiază codul HTML", descriere: "Pentru a-l lipi într-o platformă sau pe un site.", icon: <ClipboardCopy className="size-4" aria-hidden />, onClick: copiaza },
              { eticheta: "Descarcă HTML", descriere: "Un fișier pe care îl deschizi în browser.", icon: <Download className="size-4" aria-hidden />, onClick: descarca },
              { eticheta: "Tipărește sau PDF cu text selectabil", descriere: "Deschide tipărirea; în ea alegi „Salvează ca PDF”. Textul și linkurile rămân active.", icon: <FileDown className="size-4" aria-hidden />, onClick: tipareste },
            ]}
          />
        </div>
      </div>
      <p className="max-w-4xl text-[12.5px] text-[var(--ci-text-muted)]">{p.ajutor}</p>
      {eroare && <p role="alert" className="text-[13px] text-[var(--ci-red)]">{eroare}</p>}
      {p.bannere?.map((b) => (
        <p key={b.text} role="note" className="rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] bg-[var(--ci-surface-2)] px-3 py-2 text-[12.5px] text-[var(--ci-text)]">
          {b.text}{" "}
          {b.href && (
            <Link href={b.href} prefetch={false} className="font-semibold text-[var(--ci-primary)] underline">
              {b.eticheta ?? "Deschide"}
            </Link>
          )}
        </p>
      ))}
      {ciorna && (
        <p role="status" className="flex flex-wrap items-center gap-2 rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] bg-[var(--ci-surface-2)] px-3 py-2 text-[12.5px] text-[var(--ci-text)]">
          Ai reluat ciorna din {ciorna}. Numele persoanelor nu se păstrează în ciornă; ea rămâne doar în acest browser, cel mult {ZILE_CIORNA} de zile.
          <button type="button" onClick={reseteaza} className="font-semibold text-[var(--ci-primary)] underline focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none">
            Începe de la zero
          </button>
        </p>
      )}

      <div role="tablist" aria-label="Vedere" className="grid grid-cols-2 gap-1 rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] bg-[var(--ci-surface)] p-1 lg:hidden">
        {([["editez", "Editez", Pencil], ["previz", "Previzualizez", Eye]] as const).map(([k, e, Ico]) => (
          <button key={k} type="button" role="tab" aria-selected={vedere === k} onClick={() => setVedere(k)} className={`inline-flex items-center justify-center gap-2 rounded-[calc(var(--ci-radius-btn)-2px)] py-2 text-[13px] font-semibold focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none ${vedere === k ? "bg-[var(--ci-primary)] text-white" : "text-[var(--ci-text-muted)]"}`}>
            <Ico className="size-4" aria-hidden /> {e}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(340px,0.85fr)_minmax(0,1.15fr)]">
        <div className={`min-w-0 space-y-4 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto lg:pr-2 ${vedere === "previz" ? "hidden lg:block" : ""}`}>
          <Card>
            <CardHeader title="Șablon" subtitle={modelAles.hint} />
            <Camp eticheta="Modelul">
              <Select value={date.model} onChange={(e) => actualizeaza({ model: e.target.value } as Partial<D>)}>
                {p.modele.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.eticheta}
                  </option>
                ))}
              </Select>
            </Camp>
            {p.tipuri && (
              <Camp className="mt-3" eticheta={p.tipuri.eticheta} ajutor="Alegerea completează textul de pornire; îl poți schimba liber.">
                <Select value={val(p.tipuri.cheie)} onChange={(e) => schimbaTip(e.target.value)}>
                  {p.tipuri.optiuni.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.eticheta}
                    </option>
                  ))}
                </Select>
              </Camp>
            )}
          </Card>

          <Card>
            <CardHeader title="Logo-uri și culori" subtitle="Apar în antet. Culorile se pot lua dintr-un logo." />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <CampLogo eticheta="Logo organizație" valoare={val(p.logoOng.cheie)} onFisier={(f) => alegeLogo(p.logoOng.cheie, f, true)} onSterge={() => actualizeaza({ [p.logoOng.cheie]: "" } as Partial<D>)} extra={p.logoOng.implicit && val(p.logoOng.cheie) !== p.logoOng.implicit ? <Button size="sm" variant="ghost" onClick={() => actualizeaza({ [p.logoOng.cheie]: p.logoOng.implicit } as Partial<D>)}>Logoul din Setări</Button> : null} />
              {p.logoDestinatar && <CampLogo eticheta={p.logoDestinatar.eticheta} valoare={val(p.logoDestinatar.cheie)} onFisier={(f) => alegeLogo(p.logoDestinatar!.cheie, f, false)} onSterge={() => actualizeaza({ [p.logoDestinatar!.cheie]: "" } as Partial<D>)} />}
            </div>
            {eroareLogo && (
              <p role="alert" className="mt-2 text-[13px] text-[var(--ci-red)]">
                {eroareLogo}
              </p>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-[var(--ci-border)] pt-3">
              <div className="flex items-center gap-1.5" aria-hidden>
                {([date.accent, date.accent2, date.accent3] as string[]).map((c, i) => (
                  <span key={i} className="size-7 rounded-full border border-[var(--ci-border)]" style={{ background: c }} />
                ))}
              </div>
              <p className="min-w-0 flex-1 text-[12.5px] text-[var(--ci-text-muted)]">{paleta ? (paleta.sursa === "logo" ? "Culori preluate din logo." : "Logo alb-negru: nuanțe neutre.") : "Alege culorile mai jos sau preia-le dintr-un logo."}</p>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button size="sm" onClick={() => culoriDinLogo(p.logoOng.cheie)} disabled={!val(p.logoOng.cheie)}>
                <Palette className="size-3.5" aria-hidden /> Din logoul organizației
              </Button>
              {p.logoDestinatar && (
                <Button size="sm" onClick={() => culoriDinLogo(p.logoDestinatar!.cheie)} disabled={!val(p.logoDestinatar.cheie)}>
                  <Palette className="size-3.5" aria-hidden /> Din logoul destinatarului
                </Button>
              )}
              {p.culoareOrganizatie && (
                <Button size="sm" variant="ghost" onClick={() => { const pl = paletaDinHex(p.culoareOrganizatie!); if (pl) { setPaleta(null); actualizeaza(culoriDin(pl)); } }}>
                  <RotateCcw className="size-3.5" aria-hidden /> Culoarea organizației
                </Button>
              )}
            </div>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {([["accent", "Principală"], ["accent2", "Închisă"], ["accent3", "Fundal deschis"]] as const).map(([k, e]) => (
                <Camp key={k} eticheta={e}>
                  <input type="color" value={date[k]} onChange={(ev) => actualizeaza({ [k]: ev.target.value } as Partial<D>)} className="h-9 w-full cursor-pointer rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] bg-[var(--ci-surface)] p-1 focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none" />
                </Camp>
              ))}
            </div>
          </Card>

          {p.grupuri.map((g) => (
            <Card key={g.titlu}>
              <CardHeader title={g.titlu} subtitle={g.subtitlu} />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {g.campuri.map((c) => (
                  <Camp
                    key={c.cheie}
                    eticheta={c.eticheta}
                    ajutor={c.ajutor}
                    className={c.jumatate ? "" : "sm:col-span-2"}
                    actiune={
                      p.numerotare?.cheie === c.cheie ? (
                        <button type="button" onClick={numarAutomat} disabled={seteazaNumar} className="mb-1 text-[12px] font-semibold text-[var(--ci-primary)] underline focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none disabled:opacity-50">
                          {seteazaNumar ? "Se atribuie…" : "Număr automat"}
                        </button>
                      ) : undefined
                    }
                  >
                    {c.tip === "select" ? (
                      <Select value={val(c.cheie)} onChange={(e) => actualizeaza({ [c.cheie]: e.target.value } as Partial<D>)}>
                        {c.optiuni?.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.eticheta}
                          </option>
                        ))}
                      </Select>
                    ) : c.tip === "textarea" ? (
                      <Textarea rows={c.rows ?? 4} value={val(c.cheie)} placeholder={c.placeholder} onChange={(e) => actualizeaza({ [c.cheie]: e.target.value } as Partial<D>)} />
                    ) : (
                      <Input type={c.tip === "data" ? "date" : "text"} value={val(c.cheie)} placeholder={c.placeholder} onChange={(e) => actualizeaza({ [c.cheie]: e.target.value } as Partial<D>)} />
                    )}
                  </Camp>
                ))}
              </div>
            </Card>
          ))}
          {avertisment && <p role="status" className="rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] bg-[var(--ci-surface-2)] px-3 py-2 text-[12.5px] text-[var(--ci-text)]">{avertisment}</p>}
          <p className="text-[12px] text-[var(--ci-text-muted)]">Ciorna se păstrează doar în acest browser (fără numele persoanelor), cel mult {ZILE_CIORNA} de zile. Documentele exportate se înregistrează în istoricul organizației.</p>
          <div className="pb-2">
            <Button size="sm" variant="ghost" onClick={reseteaza}>
              <RotateCcw className="size-3.5" aria-hidden /> Începe de la capăt
            </Button>
          </div>
        </div>

        <div className={`min-w-0 lg:sticky lg:top-4 ${vedere === "editez" ? "hidden lg:block" : ""}`}>
          <Card className="!p-0 overflow-hidden">
            <div className="flex items-center justify-between border-b border-[var(--ci-border)] px-4 py-2.5">
              <p className="text-[13px] font-semibold text-[var(--ci-text)]">Design · {modelAles.eticheta}</p>
              <p className="text-[12px] text-[var(--ci-text-muted)]">Exact ce se exportă</p>
            </div>
            <iframe ref={cadru} title="Previzualizare" srcDoc={html} sandbox="allow-same-origin allow-modals allow-popups allow-popups-to-escape-sandbox" className="block h-[70vh] w-full bg-[#ebe8e8] lg:h-[calc(100vh-9rem)]" />
          </Card>
        </div>
      </div>
    </div>
  );
}

// Un logo: previzualizare pe fundal în pătrățele (se vede transparența), încărcare și ștergere.
function CampLogo({ eticheta, valoare, onFisier, onSterge, extra }: { eticheta: string; valoare: string; onFisier: (f?: File) => void; onSterge: () => void; extra?: React.ReactNode }) {
  const id = useId();
  return (
    <div className="min-w-0">
      <Label htmlFor={id}>{eticheta}</Label>
      <div className="flex flex-col items-start gap-2.5">
        <div className="flex h-16 w-full max-w-[11rem] items-center justify-center overflow-hidden rounded-lg border border-[var(--ci-border)]" style={{ backgroundImage: "conic-gradient(#f1eded 25%, #fff 0 50%, #f1eded 0 75%, #fff 0)", backgroundSize: "12px 12px" }}>
          {valoare ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={valoare} alt={eticheta} className="max-h-14 max-w-[10rem] object-contain" />
          ) : (
            <span className="px-2 text-center text-[11px] text-[var(--ci-text-faint)]">Fără logo</span>
          )}
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <label htmlFor={id} className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] bg-[var(--ci-surface)] px-3 text-[13px] font-medium text-[var(--ci-text)] hover:bg-[var(--ci-surface-2)] focus-within:ring-2 focus-within:ring-[var(--ci-primary)]">
            <Upload className="size-3.5" aria-hidden /> {valoare ? "Schimbă" : "Încarcă"}
          </label>
          <input id={id} type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" className="sr-only" onChange={(e) => { onFisier(e.target.files?.[0]); e.target.value = ""; }} />
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
