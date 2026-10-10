"use client";

import { ClipboardCopy, Copy, Download, Eye, FileDown, LayoutGrid, Palette, PencilLine, Plus, RotateCcw, Trash2, Upload } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState, useTransition } from "react";

import { descarcaBlob, htmlInPdf } from "@/lib/html-in-pdf";
import { aplicaPlaceholdere, CULORI_IMPLICITE, curataDateImpact, MECANISME_IMPACT, MODELE_IMPACT, PROIECT_GOL, STARI_PROIECT, totalImpact, type DateImpact, type ProiectImpact } from "@/lib/raport-impact";
import type { PaletaLogo } from "@/lib/raport-impact-culori";
import { randeazaRaportImpact } from "@/lib/raport-impact-modele";

import { Button } from "../../../components/ui/button";
import { Card, CardHeader } from "../../../components/ui/card";
import { Input, Label, Select, Textarea } from "../../../components/ui/input";
import { formatSuma } from "../../../lib/format";
import { incarcaImpactAction, salveazaImpactAction, type CompanieImpactRand, type IncarcareImpact } from "../impact-actions";
import { incarcaLogo, paletaDinLogo } from "@/lib/logo-incarcare";

import { Camp } from "../../_comun/camp";

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
  const [seFacePdf, setSeFacePdf] = useState(false);
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
  const html = useMemo(() => randeazaRaportImpact(curat, { organizatie: initial.organizatie, azi }), [curat, initial.organizatie, azi]);
  const total = totalImpact(curat);
  const nrNumite = curat.proiecte.filter((p) => p.nume).length;
  const modelAles = MODELE_IMPACT.find((m) => m.id === date.model)!;
  const nrPlaceholdere = aplicaPlaceholdere(date.narativ, curat).length;

  const numeFirma = () => (curat.firma || "firma").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "firma";
  function exportaHtml() {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
    a.download = `raport-impact-${numeFirma()}.html`;
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
  // „Export PDF” descarcă direct un fișier PDF (pagini A4 în înaltă rezoluție). Dacă browserul nu poate, se deschide tipărirea.
  async function exportaPdf() {
    setMesaj(null);
    setSeFacePdf(true);
    try {
      const { blob, imaginiOmise } = await htmlInPdf(html);
      descarcaBlob(blob, `raport-impact-${numeFirma()}.pdf`);
      setInfo(imaginiOmise ? `PDF descărcat, dar ${imaginiOmise === 1 ? "un logo nu a putut fi inclus" : `${imaginiOmise} logo-uri nu au putut fi incluse`} (adresa lui nu permite folosirea). Încarcă logoul din calculator.` : "PDF-ul a fost descărcat.");
    } catch {
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
      } else setMesaj("Previzualizarea nu e încărcată încă. Încearcă din nou.");
    };
    // Pe telefon, previzualizarea poate fi ascunsă: o afișăm înainte de tipărire.
    if (vedere === "editez" && window.matchMedia("(max-width: 1023px)").matches) {
      setVedere("previz");
      setTimeout(ruleaza, 250);
    } else ruleaza();
  }

  const lipsaFirma = !curat.firma;
  // Butoanele rămân active: fără numele firmei, mesajul spune ce lipsește (un buton dezactivat nu explică nimic, mai ales pe telefon).
  const cuFirma = (actiune: () => void) => {
    if (lipsaFirma) return setMesaj("Completează numele firmei în secțiunea „Firma” înainte de export.");
    actiune();
  };
  const sumaProiecte = date.proiecte.reduce((t, x) => t + (x.suma ?? 0), 0);
  const totalDiferit = date.totalManual != null && date.totalManual !== sumaProiecte;

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
          <Button variant="primary" onClick={() => cuFirma(copiaza)} title="Copiază tot codul HTML al raportului">
            <ClipboardCopy className="size-4" aria-hidden /> Copiază codul HTML
          </Button>
          <Button onClick={() => cuFirma(exportaHtml)}>
            <Download className="size-4" aria-hidden /> Descarcă HTML
          </Button>
          <Button onClick={() => cuFirma(exportaPdf)} disabled={seFacePdf} title="Descarcă un fișier PDF (pagini A4 în înaltă rezoluție)">
            <FileDown className="size-4" aria-hidden /> {seFacePdf ? "Se pregătește PDF-ul…" : "Export PDF"}
          </Button>
          <Button variant="ghost" onClick={() => cuFirma(tipareste)} title="Deschide tipărirea; din ea poți salva PDF cu text selectabil și linkuri active">
            Tipărește
          </Button>
        </div>
      </div>
      <p className="-mt-2 max-w-4xl text-[12.5px] text-[var(--ci-text-muted)]">
        Alegi șablonul, completezi datele și vezi raportul în dreapta. Pentru platformă, copiezi codul HTML și îl lipești în editorul de cod. Unele platforme de email taie o parte din stiluri; pentru trimitere prin email, PDF-ul e varianta sigură.
      </p>
      <div role="tablist" aria-label="Vedere" className="grid grid-cols-2 gap-1 rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] bg-[var(--ci-surface)] p-1 lg:hidden">
        {([["editez", "Editez", PencilLine], ["previz", "Previzualizez", Eye]] as const).map(([k, e, Icon]) => (
          <button key={k} type="button" role="tab" aria-selected={vedere === k} onClick={() => setVedere(k)} className={`rounded-[calc(var(--ci-radius-btn)-2px)] py-2 text-[13px] font-semibold focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none ${vedere === k ? "bg-[var(--ci-primary)] text-white" : "text-[var(--ci-text-muted)]"}`}>
            <span className="inline-flex items-center justify-center gap-1.5">
              <Icon className="size-4" aria-hidden /> {e}
            </span>
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
              <Camp eticheta="Total (lasă gol ca să se adune)" ajutor={totalDiferit ? `Atenție: totalul scris (${formatSuma(date.totalManual ?? 0)}) diferă de suma proiectelor (${formatSuma(sumaProiecte)}). Raportul îl va afișa pe cel scris.` : undefined}>
                <Input inputMode="numeric" value={date.totalManual ?? ""} onChange={(e) => actualizeaza({ totalManual: e.target.value === "" ? null : Number(e.target.value.replace(/\D/g, "")) })} placeholder={String(sumaProiecte)} />
              </Camp>
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
            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-[var(--ci-border)] pt-3">
              <div className="flex items-center gap-1.5" aria-label="Culorile raportului">
                {([date.accent, date.accent2, date.accent3] as const).map((culoare, i) => (
                  <span key={i} className="size-7 rounded-full border border-[var(--ci-border)]" style={{ background: culoare }} title={culoare} />
                ))}
              </div>
              <p className="order-last basis-full text-[12.5px] text-[var(--ci-text-muted)]">{paleta ? (paleta.sursa === "logo" ? "Culori preluate din logoul firmei." : "Logoul e alb-negru: am ales nuanțe neutre.") : "Culorile se aleg mai jos sau se preiau din logo."}</p>
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
                    <Camp className="sm:col-span-4" eticheta="Proiect">
                      <Input value={p.nume} onChange={(e) => actualizeazaProiect(i, { nume: e.target.value })} maxLength={200} />
                    </Camp>
                    <Camp className="sm:col-span-2" eticheta="Sumă (lei)">
                      <Input type="number" min={0} inputMode="numeric" value={p.suma ?? ""} onChange={(e) => actualizeazaProiect(i, { suma: e.target.value === "" ? null : Number(e.target.value) })} />
                    </Camp>
                    <Camp className="sm:col-span-2" eticheta="Data alocării">
                      <Input type="date" value={p.data} onChange={(e) => actualizeazaProiect(i, { data: e.target.value })} />
                    </Camp>
                    <Camp className="sm:col-span-4" eticheta="Link către pagina proiectului" ajutor="Doar adrese https.">
                      <Input type="url" value={p.link} onChange={(e) => actualizeazaProiect(i, { link: e.target.value })} placeholder="https://…" />
                    </Camp>
                    <Camp className={date.mecanism === "d177" ? "sm:col-span-4" : "sm:col-span-6"} eticheta="Partener sau loc (opțional)">
                      <Input value={p.locatie} onChange={(e) => actualizeazaProiect(i, { locatie: e.target.value })} maxLength={200} />
                    </Camp>
                    {date.mecanism === "d177" && (
                      <Camp className="sm:col-span-2" eticheta="Anul direcționării">
                        <Input type="number" min={2000} max={2100} value={p.anDirectionare ?? ""} onChange={(e) => actualizeazaProiect(i, { anDirectionare: e.target.value === "" ? null : Number(e.target.value) })} />
                      </Camp>
                    )}
                    <Camp className="sm:col-span-3" eticheta="Stare">
                      <Select value={p.stare} onChange={(e) => actualizeazaProiect(i, { stare: e.target.value as ProiectImpact["stare"] })}>
                        {STARI_PROIECT.map((st) => (
                          <option key={st.id} value={st.id}>
                            {st.eticheta}
                          </option>
                        ))}
                      </Select>
                    </Camp>
                    <Camp className="sm:col-span-3" eticheta="Beneficiari (număr, opțional)">
                      <Input type="number" min={0} inputMode="numeric" value={p.nrBeneficiari ?? ""} onChange={(e) => actualizeazaProiect(i, { nrBeneficiari: e.target.value === "" ? null : Number(e.target.value) })} />
                    </Camp>
                    <Camp className="sm:col-span-6" eticheta="Rezultat obținut" ajutor="Ce s-a realizat concret cu această sumă. Apare în raport.">
                      <Textarea rows={2} value={p.observatii} onChange={(e) => actualizeazaProiect(i, { observatii: e.target.value })} maxLength={600} />
                    </Camp>
                    <Camp className="sm:col-span-6" eticheta="Dovadă (link https, opțional)" ajutor="Ordin de plată, factură sau raport anonimizat. Nu pune aici documente cu date personale.">
                      <Input type="url" value={p.linkDovada} onChange={(e) => actualizeazaProiect(i, { linkDovada: e.target.value })} placeholder="https://…" />
                    </Camp>
                    <Camp className="sm:col-span-6" eticheta="Titlu public (opțional)" ajutor="Dacă îl completezi, apare în raport în locul numelui de mai sus. Folosește-l când numele intern conține date personale, de exemplu numele unui copil.">
                      <Input value={p.titluPublic} onChange={(e) => actualizeazaProiect(i, { titluPublic: e.target.value })} maxLength={200} />
                    </Camp>
                    <label className="flex items-start gap-2 text-[12.5px] text-[var(--ci-text)] sm:col-span-6">
                      <input type="checkbox" checked={p.acordVerificat} onChange={(e) => actualizeazaProiect(i, { acordVerificat: e.target.checked })} className="mt-0.5 size-4" />
                      <span>Am verificat că proiectul poate fi publicat (acord pentru poveste și imagini, fără date medicale sau personale ne-anonimizate).</span>
                    </label>
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
          </Card>

          <Card>
            <CardHeader title="Text" subtitle="Se completează automat: {FIRMA}, {NR_PROIECTE}, {MECANISM}, {TOTAL}, {PERIOADA}, {PERIOADA_TXT}, {PROIECTE_TXT}, {CONTACT}" />
            <Textarea rows={8} value={date.narativ} onChange={(e) => actualizeaza({ narativ: e.target.value })} maxLength={5000} aria-label="Textul raportului" />
            <p className="mt-1 text-[12px] text-[var(--ci-text-muted)]">Paragrafele se despart printr-un rând liber. Acum: {nrPlaceholdere} {nrPlaceholdere === 1 ? "paragraf" : "paragrafe"}.</p>
          </Card>

          <Card>
            <CardHeader title="Încheiere" subtitle="Ce urmează, un mesaj către companie și datele de contact. Tot ce lași gol nu apare în raport." />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Camp className="sm:col-span-2" eticheta="Ce urmează">
                <Textarea rows={3} value={date.ceUrmeaza} onChange={(e) => actualizeaza({ ceUrmeaza: e.target.value })} maxLength={800} placeholder="ex. Anul viitor continuăm proiectul în încă două spitale." />
              </Camp>
              <Camp eticheta="Text buton (invitație)">
                <Input value={date.ctaText} onChange={(e) => actualizeaza({ ctaText: e.target.value })} maxLength={80} placeholder="ex. Susține un nou proiect" />
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
              <Camp eticheta="Semnează">
                <Input value={date.autor} onChange={(e) => actualizeaza({ autor: e.target.value })} maxLength={100} placeholder="Prenume" />
              </Camp>
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
