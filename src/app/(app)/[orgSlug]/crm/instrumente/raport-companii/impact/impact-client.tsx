"use client";

import { ClipboardCopy, Copy, Download, FileDown, LayoutGrid, Palette, Plus, RotateCcw, Trash2, Upload } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState, useTransition } from "react";

import { aplicaPlaceholdere, CULORI_IMPLICITE, curataDateImpact, MECANISME_IMPACT, MODELE_IMPACT, PROIECT_GOL, totalImpact, type DateImpact, type ProiectImpact } from "@/lib/raport-impact";
import type { PaletaLogo } from "@/lib/raport-impact-culori";
import { randeazaRaportImpact } from "@/lib/raport-impact-modele";

import { Button } from "../../../components/ui/button";
import { Card, CardHeader } from "../../../components/ui/card";
import { Input, Label, Select, Textarea } from "../../../components/ui/input";
import { formatSuma } from "../../../lib/format";
import { incarcaImpactAction, salveazaImpactAction, type CompanieImpactRand, type IncarcareImpact } from "../impact-actions";
import { incarcaLogo, paletaDinLogo } from "@/lib/logo-incarcare";

type Stare = "idle" | "asteapta" | "salveaza" | "salvat" | "eroare";

const etichetaStare: Record<Stare, string> = { idle: "", asteapta: "Modificări nesalvate…", salveaza: "Se salvează…", salvat: "Salvat pe fișa firmei", eroare: "Nu s-a putut salva" };

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
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cadru = useRef<HTMLIFrameElement>(null);

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

  function schimbaFirma(id: string) {
    if (timer.current) clearTimeout(timer.current);
    start(async () => {
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
  function dinSponsorizari() {
    if (!companyId || !window.confirm("Proiectele și firma se înlocuiesc cu cele din sponsorizările înregistrate. Narativul, modelul și culorile rămân. Continui?")) return;
    start(async () => {
      const r = await incarcaImpactAction(orgSlug, companyId, true);
      actualizeaza({ firma: r.date.firma, proiecte: r.date.proiecte });
    });
  }

  const curat = useMemo(() => curataDateImpact(date), [date]);
  const html = useMemo(() => randeazaRaportImpact(curat, { organizatie: initial.organizatie, azi }), [curat, initial.organizatie, azi]);
  const total = totalImpact(curat);
  const nrNumite = curat.proiecte.filter((p) => p.nume).length;
  const modelAles = MODELE_IMPACT.find((m) => m.id === date.model)!;
  const nrPlaceholdere = aplicaPlaceholdere(date.narativ, curat).length;

  function exportaHtml() {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
    a.download = `raport-impact-${(curat.firma || "firma").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "firma"}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
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
    setTimeout(() => setInfo(null), 6000);
  }
  // PDF-ul se obține din tipărirea documentului („Salvează ca PDF”): rămâne vectorial, cu textul selectabil și grafica nepixelată.
  function exportaPdf() {
    const tipareste = () => {
      const w = cadru.current?.contentWindow;
      if (w) {
        w.focus();
        w.print();
      } else setMesaj("Previzualizarea nu e încărcată încă. Încearcă din nou.");
    };
    // Pe telefon, previzualizarea poate fi ascunsă: o afișăm înainte de tipărire.
    if (vedere === "editez" && window.matchMedia("(max-width: 1023px)").matches) {
      setVedere("previz");
      setTimeout(tipareste, 250);
    } else tipareste();
  }

  const lipsaFirma = !curat.firma;

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
          <span className="text-[12px] text-[var(--ci-text-muted)]" role="status" aria-live="polite">
            {info ?? etichetaStare[stare]}
          </span>
          <Button variant="primary" onClick={copiaza} disabled={lipsaFirma} title={lipsaFirma ? "Completează numele firmei" : "Copiază tot codul HTML al raportului"}>
            <ClipboardCopy className="size-4" aria-hidden /> Copiază codul HTML
          </Button>
          <Button onClick={exportaHtml} disabled={lipsaFirma} title={lipsaFirma ? "Completează numele firmei" : undefined}>
            <Download className="size-4" aria-hidden /> Descarcă HTML
          </Button>
          <Button onClick={exportaPdf} disabled={lipsaFirma} title={lipsaFirma ? "Completează numele firmei" : "Se deschide tipărirea: alege „Salvează ca PDF”"}>
            <FileDown className="size-4" aria-hidden /> Export PDF
          </Button>
        </div>
      </div>
      <p className="-mt-2 max-w-4xl text-[12.5px] text-[var(--ci-text-muted)]">
        Alegi șablonul, completezi datele și vezi raportul în dreapta. Pentru platformă, copiezi codul HTML și îl lipești în editorul de cod. Unele platforme de email taie o parte din stiluri; pentru trimitere prin email, PDF-ul e varianta sigură.
      </p>
      <div role="tablist" aria-label="Vedere" className="grid grid-cols-2 gap-1 rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] bg-[var(--ci-surface)] p-1 lg:hidden">
        {([["editez", "✏️ Editez"], ["previz", "👁 Previzualizez"]] as const).map(([k, e]) => (
          <button key={k} type="button" role="tab" aria-selected={vedere === k} onClick={() => setVedere(k)} className={`rounded-[calc(var(--ci-radius-btn)-2px)] py-2 text-[13px] font-semibold focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none ${vedere === k ? "bg-[var(--ci-primary)] text-white" : "text-[var(--ci-text-muted)]"}`}>
            {e}
          </button>
        ))}
      </div>
      {mesaj && <p role="alert" className="text-[13px] text-[var(--ci-red)]">{mesaj}</p>}

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(340px,0.85fr)_minmax(0,1.15fr)]">
        <div className={`min-w-0 space-y-4 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto lg:pr-2 ${vedere === "previz" ? "hidden lg:block" : ""}`}>
          <Card>
            <CardHeader title="Șablon" subtitle={modelAles.hint} />
            <Label>Tipul de raport</Label>
            <Select value={date.model} onChange={(e) => actualizeaza({ model: e.target.value as DateImpact["model"] })}>
              {MODELE_IMPACT.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.eticheta}
                </option>
              ))}
            </Select>
          </Card>

          <Card>
            <CardHeader title="Firma" subtitle={companyId ? (salvat ? "Se păstrează ce ai salvat data trecută" : "Propunere din sponsorizările înregistrate") : "Fără firmă din listă, nu se salvează nimic"} />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="min-w-0">
                <Label>Firmă din CRM</Label>
                <Select value={companyId ?? ""} onChange={(e) => schimbaFirma(e.target.value)} disabled={ocupat}>
                  <option value="">Altă firmă (completez manual)</option>
                  {companii.map((c) => (
                    <option key={c.companyId} value={c.companyId}>
                      {c.nume} · {formatSuma(c.total)}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="min-w-0">
                <Label>Numele din raport</Label>
                <Input value={date.firma} onChange={(e) => actualizeaza({ firma: e.target.value })} maxLength={200} placeholder="ex. Firma SRL" />
              </div>
              <div className="min-w-0">
                <Label>Mecanism</Label>
                <Select value={date.mecanism} onChange={(e) => actualizeaza({ mecanism: e.target.value as DateImpact["mecanism"] })}>
                  {MECANISME_IMPACT.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.eticheta}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="min-w-0">
                <Label>Total (lasă gol ca să se adune)</Label>
                <Input inputMode="numeric" value={date.totalManual ?? ""} onChange={(e) => actualizeaza({ totalManual: e.target.value === "" ? null : Number(e.target.value.replace(/\D/g, "")) })} placeholder={String(date.proiecte.reduce((s, p) => s + (p.suma ?? 0), 0))} />
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Logo-uri și culori" subtitle="Apar împreună în antet. Culorile raportului se iau din logoul firmei." />
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
            <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-[var(--ci-border)] pt-3">
              <div className="flex items-center gap-1.5" aria-label="Culorile raportului">
                {([date.accent, date.accent2, date.accent3] as const).map((culoare, i) => (
                  <span key={i} className="size-7 rounded-full border border-[var(--ci-border)]" style={{ background: culoare }} title={culoare} />
                ))}
              </div>
              <p className="min-w-0 flex-1 text-[12.5px] text-[var(--ci-text-muted)]">{paleta ? (paleta.sursa === "logo" ? "Culori preluate din logoul firmei." : "Logoul e alb-negru: am ales nuanțe neutre.") : "Culorile se aleg mai jos sau se preiau din logo."}</p>
              <Button size="sm" onClick={preiaCulori} disabled={!date.logoFirma}>
                <Palette className="size-3.5" aria-hidden /> Preia culorile din logo
              </Button>
            </div>
          </Card>

          <Card>
            <CardHeader title="Proiecte susținute" subtitle={`${nrNumite} ${nrNumite === 1 ? "proiect" : "proiecte"} · ${formatSuma(total)}`} />
            <div className="space-y-3">
              {date.proiecte.length === 0 && <p className="text-[13px] text-[var(--ci-text-muted)]">Niciun proiect încă. Adaugă unul sau {companyId ? "reia-le din sponsorizări." : "alege o firmă din CRM."}</p>}
              {date.proiecte.map((p, i) => (
                <fieldset key={i} className="min-w-0 rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] p-3">
                  <legend className="px-1 text-[12px] font-semibold text-[var(--ci-text-muted)]">{p.nume || "Proiect nou"}</legend>
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-6">
                    <div className="min-w-0 sm:col-span-4">
                      <Label>Proiect</Label>
                      <Input value={p.nume} onChange={(e) => actualizeazaProiect(i, { nume: e.target.value })} maxLength={200} />
                    </div>
                    <div className="min-w-0 sm:col-span-2">
                      <Label>Sumă (lei)</Label>
                      <Input type="number" min={0} inputMode="numeric" value={p.suma ?? ""} onChange={(e) => actualizeazaProiect(i, { suma: e.target.value === "" ? null : Number(e.target.value) })} />
                    </div>
                    <div className="min-w-0 sm:col-span-2">
                      <Label>Data alocării</Label>
                      <Input type="date" value={p.data} onChange={(e) => actualizeazaProiect(i, { data: e.target.value })} />
                    </div>
                    <div className="min-w-0 sm:col-span-4">
                      <Label>Link către pagina proiectului</Label>
                      <Input type="url" value={p.link} onChange={(e) => actualizeazaProiect(i, { link: e.target.value })} placeholder="https://…" />
                    </div>
                    <div className={`min-w-0 ${date.mecanism === "d177" ? "sm:col-span-4" : "sm:col-span-6"}`}>
                      <Label>Partener sau loc (opțional)</Label>
                      <Input value={p.locatie} onChange={(e) => actualizeazaProiect(i, { locatie: e.target.value })} maxLength={200} />
                    </div>
                    {date.mecanism === "d177" && (
                      <div className="min-w-0 sm:col-span-2">
                        <Label>Anul direcționării</Label>
                        <Input type="number" min={2000} max={2100} value={p.anDirectionare ?? ""} onChange={(e) => actualizeazaProiect(i, { anDirectionare: e.target.value === "" ? null : Number(e.target.value) })} />
                      </div>
                    )}
                    <div className="min-w-0 sm:col-span-6">
                      <Label>Observații</Label>
                      <Textarea rows={2} value={p.observatii} onChange={(e) => actualizeazaProiect(i, { observatii: e.target.value })} maxLength={600} />
                    </div>
                  </div>
                  <div className="mt-2 flex justify-end gap-1">
                    <Button size="sm" variant="ghost" onClick={() => actualizeaza({ proiecte: [...date.proiecte.slice(0, i + 1), { ...p }, ...date.proiecte.slice(i + 1)] })}>
                      <Copy className="size-3.5" aria-hidden /> Duplică
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => actualizeaza({ proiecte: date.proiecte.filter((_, j) => j !== i) })}>
                      <Trash2 className="size-3.5" aria-hidden /> Șterge
                    </Button>
                  </div>
                </fieldset>
              ))}
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => actualizeaza({ proiecte: [...date.proiecte, { ...PROIECT_GOL }] })}>
                  <Plus className="size-4" aria-hidden /> Adaugă proiect
                </Button>
                {companyId && (
                  <Button variant="ghost" onClick={dinSponsorizari} disabled={ocupat}>
                    <RotateCcw className="size-4" aria-hidden /> Reia din sponsorizări
                  </Button>
                )}
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Text" subtitle="Se completează automat: {FIRMA}, {NR_PROIECTE}, {MECANISM}, {TOTAL}, {PERIOADA}" />
            <Textarea rows={8} value={date.narativ} onChange={(e) => actualizeaza({ narativ: e.target.value })} maxLength={5000} aria-label="Textul raportului" />
            <p className="mt-1 text-[12px] text-[var(--ci-text-muted)]">Paragrafele se despart printr-un rând liber. Acum: {nrPlaceholdere} {nrPlaceholdere === 1 ? "paragraf" : "paragrafe"}.</p>
          </Card>

          <Card>
            <CardHeader title="Culori și semnătură" subtitle="Culorile se pot lua din logoul firmei, mai sus." />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {([["accent", "Culoare principală"], ["accent2", "Culoare închisă"], ["accent3", "Fundal deschis"]] as const).map(([k, eticheta]) => (
                <div key={k} className="min-w-0">
                  <Label>{eticheta}</Label>
                  <input type="color" value={date[k]} onChange={(e) => actualizeaza({ [k]: e.target.value })} aria-label={eticheta} className="h-9 w-full cursor-pointer rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] bg-[var(--ci-surface)] p-1" />
                </div>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-1 gap-3">
              <div className="min-w-0">
                <Label>Semnează</Label>
                <Input value={date.autor} onChange={(e) => actualizeaza({ autor: e.target.value })} maxLength={100} placeholder="Prenume" />
              </div>
            </div>
            <label className="mt-3 flex items-center gap-2 text-[13px] text-[var(--ci-text)]">
              <input type="checkbox" checked={date.gruparePeAn} onChange={(e) => actualizeaza({ gruparePeAn: e.target.checked })} className="size-4" />
              Grupează proiectele pe ani (unde modelul permite)
            </label>
            <div className="mt-2">
              <Button size="sm" variant="ghost" onClick={() => actualizeaza({ ...CULORI_IMPLICITE })}>
                <RotateCcw className="size-3.5" aria-hidden /> Culorile implicite
              </Button>
            </div>
          </Card>
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
      <div className="flex items-center gap-3">
        <div
          className="flex h-16 w-28 shrink-0 items-center justify-center overflow-hidden rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)]"
          style={{ backgroundImage: "conic-gradient(#f1eded 25%, #fff 0 50%, #f1eded 0 75%, #fff 0)", backgroundSize: "12px 12px" }}
        >
          {valoare ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={valoare} alt={alt} className="max-h-14 max-w-[6.5rem] object-contain" />
          ) : (
            <span className="px-2 text-center text-[11px] text-[var(--ci-text-faint)]">Fără logo</span>
          )}
        </div>
        <div className="flex min-w-0 flex-wrap gap-1.5">
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
