"use client";

import { ClipboardCopy, Download, FileDown, LayoutGrid, Palette, RotateCcw, Trash2, Upload } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import { incarcaLogo, paletaDinLogo } from "@/lib/logo-incarcare";
import { paletaDinHex, type PaletaLogo } from "@/lib/raport-impact-culori";

import { Button } from "../../components/ui/button";
import { Card, CardHeader } from "../../components/ui/card";
import { Input, Label, Select, Textarea } from "../../components/ui/input";

export type CampDef = { cheie: string; eticheta: string; tip?: "text" | "textarea" | "data"; ajutor?: string; placeholder?: string; rows?: number; jumatate?: boolean };
export type GrupDef = { titlu: string; subtitlu?: string; campuri: CampDef[] };
export type TipDef = { id: string; eticheta: string; patch: Record<string, string> };
export type ModelDef = { id: string; eticheta: string; hint: string };

type Date_ = Record<string, unknown> & { model: string; accent: string; accent2: string; accent3: string };

export type GeneratorProps<D extends Date_> = {
  orgSlug: string;
  cheieTool: string;
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
  avertizare?: (d: D) => string | null;
  ajutor: string;
};

// Generator de documente: formularul în stânga, designul în dreapta, în timp real (de la 1024 px lățime; pe ecran mic, filele Editez / Previzualizez).
export function GeneratorDocument<D extends Date_>(p: GeneratorProps<D>) {
  const [date, setDate] = useState<D>(p.date);
  const [vedere, setVedere] = useState<"editez" | "previz">("editez");
  const [info, setInfo] = useState<string | null>(null);
  const [eroare, setEroare] = useState<string | null>(null);
  const [paleta, setPaleta] = useState<PaletaLogo | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cadru = useRef<HTMLIFrameElement>(null);
  const cheieCiorna = `fa-doc-${p.cheieTool}-${p.orgSlug}`;

  // Ciorna se păstrează în browserul acesta, ca să nu se piardă la reîncărcare.
  useEffect(() => {
    try {
      const brut = window.localStorage.getItem(cheieCiorna);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (brut) setDate(p.curata(JSON.parse(brut)));
    } catch {
      /* fără ciornă */
    }
    return () => void (timer.current && clearTimeout(timer.current));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function actualizeaza(patch: Partial<D>) {
    setDate((prev) => {
      const urmator = { ...prev, ...patch };
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        try {
          window.localStorage.setItem(cheieCiorna, JSON.stringify(urmator));
        } catch {
          /* spațiu plin sau blocat */
        }
      }, 500);
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
    setEroare(null);
    try {
      const r = await incarcaLogo(fisier);
      if (preiaCulori && r.paleta) setPaleta(r.paleta);
      actualizeaza({ [cheie]: r.dataUrl, ...(preiaCulori && r.paleta ? culoriDin(r.paleta) : {}) } as Partial<D>);
    } catch (e) {
      setEroare(e instanceof Error ? e.message : "Logoul nu a putut fi încărcat.");
    }
  }
  async function culoriDinLogo(cheie: string) {
    setEroare(null);
    try {
      const pl = await paletaDinLogo(val(cheie));
      if (!pl) return setEroare("Nu am găsit culori în logo. Alege-le manual.");
      setPaleta(pl);
      actualizeaza(culoriDin(pl));
    } catch (e) {
      setEroare(e instanceof Error ? e.message : "Culorile nu au putut fi citite.");
    }
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
    setTimeout(() => setInfo(null), 5000);
  }
  function descarca() {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
    a.download = `${p.numeFisier(curat).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || p.cheieTool}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }
  function pdf() {
    const tipareste = () => {
      const w = cadru.current?.contentWindow;
      if (w) {
        w.focus();
        w.print();
      } else setEroare("Previzualizarea nu e încărcată încă. Încearcă din nou.");
    };
    if (vedere === "editez" && window.matchMedia("(max-width: 1023px)").matches) {
      setVedere("previz");
      setTimeout(tipareste, 250);
    } else tipareste();
  }
  function reseteaza() {
    if (!window.confirm("Ștergi tot ce ai completat și revii la textul de pornire?")) return;
    try {
      window.localStorage.removeItem(cheieCiorna);
    } catch {
      /* nimic de șters */
    }
    setDate(p.date);
    setPaleta(null);
  }


  return (
    <div className="mx-auto max-w-[1500px] space-y-4">
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
          <Button variant="primary" onClick={copiaza}>
            <ClipboardCopy className="size-4" aria-hidden /> Copiază codul HTML
          </Button>
          <Button onClick={descarca}>
            <Download className="size-4" aria-hidden /> Descarcă HTML
          </Button>
          <Button onClick={pdf}>
            <FileDown className="size-4" aria-hidden /> Export PDF
          </Button>
        </div>
      </div>
      <p className="max-w-4xl text-[12.5px] text-[var(--ci-text-muted)]">{p.ajutor}</p>
      {eroare && <p role="alert" className="text-[13px] text-[var(--ci-red)]">{eroare}</p>}

      <div role="tablist" aria-label="Vedere" className="grid grid-cols-2 gap-1 rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] bg-[var(--ci-surface)] p-1 lg:hidden">
        {([["editez", "✏️ Editez"], ["previz", "👁 Previzualizez"]] as const).map(([k, e]) => (
          <button key={k} type="button" role="tab" aria-selected={vedere === k} onClick={() => setVedere(k)} className={`rounded-[calc(var(--ci-radius-btn)-2px)] py-2 text-[13px] font-semibold focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none ${vedere === k ? "bg-[var(--ci-primary)] text-white" : "text-[var(--ci-text-muted)]"}`}>
            {e}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(340px,0.85fr)_minmax(0,1.15fr)]">
        <div className={`min-w-0 space-y-4 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto lg:pr-2 ${vedere === "previz" ? "hidden lg:block" : ""}`}>
          <Card>
            <CardHeader title="Șablon" subtitle={modelAles.hint} />
            <Label>Modelul</Label>
            <Select value={date.model} onChange={(e) => actualizeaza({ model: e.target.value } as Partial<D>)}>
              {p.modele.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.eticheta}
                </option>
              ))}
            </Select>
            {p.tipuri && (
              <div className="mt-3">
                <Label>{p.tipuri.eticheta}</Label>
                <Select
                  value={val(p.tipuri.cheie)}
                  onChange={(e) => {
                    const o = p.tipuri!.optiuni.find((x) => x.id === e.target.value);
                    if (o) actualizeaza({ [p.tipuri!.cheie]: o.id, ...o.patch } as Partial<D>);
                  }}
                >
                  {p.tipuri.optiuni.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.eticheta}
                    </option>
                  ))}
                </Select>
                <p className="mt-1 text-[12px] text-[var(--ci-text-muted)]">Alegerea completează textul de pornire; îl poți schimba liber.</p>
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title="Logo-uri și culori" subtitle="Apar în antet. Culorile se pot lua dintr-un logo." />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <CampLogo eticheta="Logo organizație" valoare={val(p.logoOng.cheie)} onFisier={(f) => alegeLogo(p.logoOng.cheie, f, true)} onSterge={() => actualizeaza({ [p.logoOng.cheie]: "" } as Partial<D>)} extra={p.logoOng.implicit && val(p.logoOng.cheie) !== p.logoOng.implicit ? <Button size="sm" variant="ghost" onClick={() => actualizeaza({ [p.logoOng.cheie]: p.logoOng.implicit } as Partial<D>)}>Logoul din Setări</Button> : null} />
              {p.logoDestinatar && <CampLogo eticheta={p.logoDestinatar.eticheta} valoare={val(p.logoDestinatar.cheie)} onFisier={(f) => alegeLogo(p.logoDestinatar!.cheie, f, false)} onSterge={() => actualizeaza({ [p.logoDestinatar!.cheie]: "" } as Partial<D>)} />}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-[var(--ci-border)] pt-3">
              <div className="flex items-center gap-1.5" aria-label="Culorile documentului">
                {([date.accent, date.accent2, date.accent3] as string[]).map((c, i) => (
                  <span key={i} className="size-7 rounded-full border border-[var(--ci-border)]" style={{ background: c }} title={c} />
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
                <div key={k} className="min-w-0">
                  <Label>{e}</Label>
                  <input type="color" value={date[k]} onChange={(ev) => actualizeaza({ [k]: ev.target.value } as Partial<D>)} aria-label={e} className="h-9 w-full cursor-pointer rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] bg-[var(--ci-surface)] p-1" />
                </div>
              ))}
            </div>
          </Card>

          {p.grupuri.map((g) => (
            <Card key={g.titlu}>
              <CardHeader title={g.titlu} subtitle={g.subtitlu} />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {g.campuri.map((c) => (
                  <div key={c.cheie} className={`min-w-0 ${c.jumatate ? "" : "sm:col-span-2"}`}>
                    <Label>{c.eticheta}</Label>
                    {c.tip === "textarea" ? (
                      <Textarea rows={c.rows ?? 4} value={val(c.cheie)} placeholder={c.placeholder} onChange={(e) => actualizeaza({ [c.cheie]: e.target.value } as Partial<D>)} />
                    ) : (
                      <Input type={c.tip === "data" ? "date" : "text"} value={val(c.cheie)} placeholder={c.placeholder} onChange={(e) => actualizeaza({ [c.cheie]: e.target.value } as Partial<D>)} />
                    )}
                    {c.ajutor && <p className="mt-1 text-[12px] text-[var(--ci-text-muted)]">{c.ajutor}</p>}
                  </div>
                ))}
              </div>
            </Card>
          ))}
          {avertisment && <p role="status" className="rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] bg-[var(--ci-surface-2)] px-3 py-2 text-[12.5px] text-[var(--ci-text)]">{avertisment}</p>}
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
              <p className="text-[12px] text-[var(--ci-text-muted)]">Exact ce se copiază și se exportă</p>
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
      <div className="flex items-center gap-3">
        <div className="flex h-16 w-28 shrink-0 items-center justify-center overflow-hidden rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)]" style={{ backgroundImage: "conic-gradient(#f1eded 25%, #fff 0 50%, #f1eded 0 75%, #fff 0)", backgroundSize: "12px 12px" }}>
          {valoare ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={valoare} alt={eticheta} className="max-h-14 max-w-[6.5rem] object-contain" />
          ) : (
            <span className="px-2 text-center text-[11px] text-[var(--ci-text-faint)]">Fără logo</span>
          )}
        </div>
        <div className="flex min-w-0 flex-wrap gap-1.5">
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
