"use client";

import { ArrowLeft, ArrowRight, Check, Copy, Download, ImagePlus, Pencil, Plus, Printer, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { AVATAR_GHID_DICT } from "@/lib/i18n/dictionaries/avatar-donator-ui-2";
import type { Locale } from "@/lib/i18n/config";
import { conversiiLoc, gradeLoc, tipuriFisaLoc } from "@/lib/avatar-donator/localizare";
import { parseNum } from "@/lib/avatar-donator/motor";
import {
  citesteFisa,
  FISA_PRINCIPALA,
  fiseDeRevizuit,
  incredereValidari,
  MAX_FISE_SUPLIMENTARE,
  MAX_VALIDARI,
  scrieFisa,
  toateFisele,
  type AvatarData,
  type Conversie,
  type Fisa,
  type Recunoastere,
  type StatisticiPlatforma,
  type TipFisa,
} from "@/lib/avatar-donator/tipuri";
import type { SegmentReal, SegmentStat } from "@/lib/segmente-donatori";

import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input, Textarea } from "../components/ui/input";
import { useLocale } from "../lib/locale-context";

import type { Actualizeaza } from "./avatar-donator-client";

// Fișa de avatar (varianta simplă): o întrebare pe ecran, în limbaj de zi cu zi, grupate pe secțiuni, cu un rezumat la final.
// Structura combină ce recomandă sursele consultate:
//  - Bloomerang: pornești de la obiectiv, apoi o persoană REALĂ (nume, vârstă, meserie) și 4 întrebări: valori/scopuri,
//    provocări, unde se informează, demografie; refaci exercițiul anual;
//  - Blackbaud: comportament de donare, capacitate (sume propuse), atitudine, probabilitatea de donație lunară,
//    canalul preferat de contact;
//  - RFM (Blackbaud / Dotdigital): etapa relației (nou, loial, în risc, inactiv) și recență/frecvență/valoare.
// Fișa principală scrie în ACELEAȘI câmpuri ca varianta detaliată (rezumat, conversie, buget): nu există două surse de adevăr.
// Fișele suplimentare (donator lunar, firme…) sunt independente și nu intră în calculul de buget.
// Textele întrebărilor (în română și engleză) stau în dicționar (avatar-donator-ui-2.ts); aici e doar structura lor.
type Baza = { id: string; s: number; optional?: boolean; doarPrincipala?: boolean };
type TextePutine = { eticheta: string; titlu: string; ajutor: string; exemplu: string; sugestii: string[] };
type IntrebareStruct =
  | (Baza & { tip: "text" | "lung"; camp: string; unul?: boolean; propune?: (d: Fisa, locale: Locale) => string[] })
  | (Baza & { tip: "conversie" })
  | (Baza & { tip: "suma"; camp: "donatieUnica" | "lunar"; unitate: "lei" | "leiLuna" });
type Intrebare = IntrebareStruct & { sectiune: string } & TextePutine;

// Etapele relației = segmentele din pagina „Segmente de donatori”; cele reale vin din baza de date. Ordinea corespunde listei `ciclu` din dicționar.
const CICLU_SEG: SegmentReal[] = ["nou", "recurent", "fidel", "major", "in_risc", "inactiv", "reactivat"];

// Propunere de 3 sume (mică / tipică / ambițioasă) pornind de la donația tipică, rotunjite.
function treiSume(f: Fisa, locale: Locale): string[] {
  const m = parseNum(f.donatieUnica);
  if (!m || m <= 0) return [];
  const pas = m >= 1000 ? 100 : m >= 100 ? 10 : 5;
  const rot = (x: number) => Math.max(pas, Math.round(x / pas) * pas);
  const v = [rot(m / 2), rot(m), rot(m * 2)];
  const fl = locale === "ro" ? "ro-RO" : "en-GB";
  return v[0] === v[1] || v[1] === v[2] ? [] : [`${v.map((x) => x.toLocaleString(fl)).join(" / ")} lei`];
}

const STRUCTURA: IntrebareStruct[] = [
  { id: "conversie", s: 0, tip: "conversie" },
  { id: "nume", s: 0, tip: "text", camp: "nume" },
  { id: "date", s: 0, tip: "lung", camp: "date" },
  { id: "marime", s: 0, tip: "text", camp: "marime", unul: true },
  { id: "motivatie", s: 1, tip: "lung", camp: "motivatie" },
  { id: "citat", s: 1, tip: "text", camp: "citat", optional: true },
  { id: "obiectii", s: 1, tip: "lung", camp: "obiectii" },
  { id: "ciclu", s: 2, tip: "lung", camp: "ciclu" },
  { id: "comportament", s: 2, tip: "lung", camp: "comportament" },
  { id: "suma", s: 2, tip: "suma", camp: "donatieUnica", unitate: "lei" },
  { id: "sume", s: 2, tip: "text", camp: "sume", propune: treiSume, unul: true, optional: true },
  { id: "recurent", s: 2, tip: "text", camp: "recurent", unul: true, optional: true },
  { id: "canale", s: 3, tip: "lung", camp: "canale" },
  { id: "contact", s: 3, tip: "lung", camp: "contact", optional: true },
  { id: "mesaj", s: 3, tip: "lung", camp: "mesaj" },
  { id: "momente", s: 3, tip: "lung", camp: "momente" },
  { id: "excluderi", s: 4, tip: "lung", camp: "excluderi" },
  { id: "buget", s: 4, tip: "suma", camp: "lunar", unitate: "leiLuna", doarPrincipala: true },
  { id: "kpi", s: 4, tip: "lung", camp: "kpi" },
  { id: "baza", s: 4, tip: "lung", camp: "baza", optional: true },
];

// Întrebările cu textele în limba curentă (sugestiile etapei relației vin din lista `ciclu`).
function construiesteIntrebari(locale: Locale): Intrebare[] {
  const g = AVATAR_GHID_DICT[locale];
  return STRUCTURA.map((q) => {
    const t = g.q[q.id];
    return {
      ...q,
      sectiune: g.sectiuni[q.s],
      eticheta: t.eticheta,
      titlu: t.titlu,
      ajutor: t.ajutor,
      exemplu: t.exemplu ?? "",
      sugestii: q.id === "ciclu" ? [...g.ciclu] : (t.sugestii ?? []),
    } as Intrebare;
  });
}

function pentruTip(q: Intrebare, tip: TipFisa, locale: Locale): Intrebare {
  if (tip !== "firme") return q;
  const v = AVATAR_GHID_DICT[locale].firme[q.id];
  if (!v) return q;
  return { ...q, ...v } as Intrebare;
}

// Fără aceste răspunsuri, fișa nu poate ghida o campanie; restul îmbogățesc fișa.
const ESENTIALE = ["conversie", "nume", "date", "motivatie", "obiectii", "comportament", "canale", "mesaj"];

function valoare(f: Fisa, q: Intrebare, locale: Locale): string {
  if (q.tip === "conversie") return conversiiLoc(locale).find((c) => c.key === f.conversie)?.label ?? "";
  if (q.tip === "suma") return q.camp === "lunar" ? f.lunar : f.donatieUnica;
  return f.rezumat[q.camp] ?? "";
}

function afiseaza(q: Intrebare, v: string, locale: Locale): string {
  return q.tip === "suma" ? `${v} ${AVATAR_GHID_DICT[locale].unitati[q.unitate]}` : v;
}

function intrebariPentru(f: Fisa, principala: boolean, toate: Intrebare[], locale: Locale): Intrebare[] {
  return toate.filter((q) => principala || !q.doarPrincipala).map((q) => pentruTip(q, f.tip, locale));
}

function textRezumat(f: Fisa, intrebari: Intrebare[], sectiuni: string[], locale: Locale): string {
  const u = AVATAR_GHID_DICT[locale].ui;
  const nume = f.rezumat.nume?.trim();
  const iesire: string[] = [u.textTitlu(nume || undefined)];
  for (const sectiune of sectiuni) {
    const linii = intrebari
      .filter((q) => q.sectiune === sectiune)
      .map((q) => {
        const v = valoare(f, q, locale).trim();
        return v ? `${q.eticheta}: ${afiseaza(q, v, locale)}` : null;
      })
      .filter((l): l is string => l !== null);
    if (linii.length) iesire.push("", sectiune.toUpperCase(), ...linii);
  }
  return iesire.join("\n");
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Fișa pe o pagină A4, într-o fereastră separată (fără meniul aplicației), gata de tipărit sau de salvat ca PDF.
function imprima(f: Fisa, intrebari: Intrebare[], sectiuni: string[], poza: string | null, locale: Locale): boolean {
  const u = AVATAR_GHID_DICT[locale].ui;
  const fl = locale === "ro" ? "ro-RO" : "en-GB";
  const w = window.open("", "_blank", "width=900,height=1100");
  if (!w) return false;
  const nume = f.rezumat.nume?.trim() || u.numeImplicitFisa;
  const tip = tipuriFisaLoc(locale).find((t) => t.key === f.tip)?.label ?? "";
  const citat = f.rezumat.citat?.trim();
  const persoana = f.rezumat.date?.trim();
  const incredere = incredereValidari(f.validari);
  const gradLabel = gradeLoc(locale).find((g) => g.key === incredere.grad)?.label ?? "";
  const sectiuniHtml = sectiuni
    .map((s) => {
      const randuri = intrebari
        .filter((q) => q.sectiune === s && q.id !== "nume" && q.id !== "date" && q.id !== "citat")
        .map((q) => ({ q, v: valoare(f, q, locale).trim() }))
        .filter((r) => r.v);
      if (!randuri.length) return "";
      return `<section><h2>${esc(s)}</h2>${randuri.map((r) => `<div class="r"><b>${esc(r.q.eticheta)}</b><span>${esc(afiseaza(r.q, r.v, locale))}</span></div>`).join("")}</section>`;
    })
    .join("");
  w.document.write(`<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><title>${esc(u.titluFisaTiparita(nume))}</title><style>
    @page { size: A4; margin: 14mm; }
    * { box-sizing: border-box; }
    body { font: 13px/1.45 system-ui, -apple-system, "Segoe UI", sans-serif; color: #1c2430; margin: 0; }
    header { display: flex; gap: 18px; align-items: flex-start; border-bottom: 2px solid #1c2430; padding-bottom: 14px; }
    .poza { width: 120px; height: 120px; flex: none; border-radius: 8px; border: 1.5px dashed #9aa5b4; display: flex; align-items: center; justify-content: center; text-align: center; color: #7b8696; font-size: 11px; overflow: hidden; }
    .poza img { width: 100%; height: 100%; object-fit: cover; }
    .tip { font-size: 11px; letter-spacing: .08em; text-transform: uppercase; color: #5b6676; }
    h1 { margin: 2px 0 6px; font-size: 26px; line-height: 1.15; }
    .persoana { margin: 0 0 8px; color: #2f3a49; }
    blockquote { margin: 0; padding-left: 12px; border-left: 3px solid #1c2430; font-size: 15px; font-style: italic; }
    main { columns: 2; column-gap: 24px; margin-top: 14px; }
    section { break-inside: avoid; margin-bottom: 12px; }
    h2 { font-size: 11px; letter-spacing: .08em; text-transform: uppercase; color: #5b6676; margin: 0 0 4px; border-bottom: 1px solid #d5dbe3; padding-bottom: 2px; }
    .r { margin: 0 0 6px; } .r b { display: block; font-size: 11.5px; } .r span { white-space: pre-line; }
    footer { margin-top: 10px; padding-top: 8px; border-top: 1px solid #d5dbe3; font-size: 11px; color: #5b6676; }
  </style></head><body>
    <header>
      <div class="poza">${poza ? `<img src="${poza}" alt="">` : u.fotografie}</div>
      <div><div class="tip">${esc(u.tipFisaTiparita(tip))}</div><h1>${esc(nume)}</h1>${persoana ? `<p class="persoana">${esc(persoana)}</p>` : ""}${citat ? `<blockquote>${esc(citat)}</blockquote>` : ""}</div>
    </header>
    <main>${sectiuniHtml}</main>
    <footer>${esc(u.subsol(gradLabel, incredere.n, incredere.pct, new Date().toLocaleDateString(fl), f.revizuitLa ? new Date(f.revizuitLa).toLocaleDateString(fl) : null))}</footer>
  </body></html>`);
  w.document.close();
  setTimeout(() => {
    w.focus();
    w.print();
  }, 400);
  return true;
}

export function TabSimplu({
  data,
  actualizeaza,
  mergiLa,
  segmente,
  stat,
}: {
  data: AvatarData;
  actualizeaza: Actualizeaza;
  mergiLa: (t: "buget" | "sinteza" | "profile") => void;
  segmente: SegmentStat[] | null;
  stat: StatisticiPlatforma | null;
}) {
  const locale = useLocale();
  const g = AVATAR_GHID_DICT[locale];
  const u = g.ui;
  const fl = locale === "ro" ? "ro-RO" : "en-GB";
  const lei = (n: number) => `${Math.round(n).toLocaleString(fl)} lei`;
  const SECTIUNI = g.sectiuni;
  const TIPURI_FISA = tipuriFisaLoc(locale);
  const GRADE = gradeLoc(locale);
  const CONVERSII = conversiiLoc(locale);
  const toateIntrebarile = useMemo(() => construiesteIntrebari(locale), [locale]);
  // Etapa relației se recunoaște în ambele limbi (textul ales se păstrează în fișă așa cum a fost scris).
  const cicluTexte = (i: number) => [AVATAR_GHID_DICT.ro.ciclu[i], AVATAR_GHID_DICT.en.ciclu[i]];

  const [fisaId, setFisaId] = useState(FISA_PRINCIPALA);
  const fisa = citesteFisa(data, fisaId);
  const principala = fisa.id === FISA_PRINCIPALA;
  const intrebari = useMemo(() => intrebariPentru(fisa, principala, toateIntrebarile, locale), [fisa, principala, toateIntrebarile, locale]);
  const total = intrebari.length;
  const REZUMAT = total; // indexul ecranului de rezumat
  const nrCompletate = intrebari.filter((q) => valoare(fisa, q, locale).trim() !== "").length;

  // Cine a început deja ghidul revine direct la rezumat; cine nu, de la prima întrebare.
  const [pas, setPas] = useState(nrCompletate > 0 ? REZUMAT : 0);
  const [copiat, setCopiat] = useState(false);
  const [fisaNoua, setFisaNoua] = useState(false);
  const [poza, setPoza] = useState<string | null>(null);
  const [mesajPrint, setMesajPrint] = useState("");
  // Momentul deschiderii: fixat o dată, pentru verificarea „revizuită de peste 12 luni”.
  const [acum] = useState(() => Date.now());

  const seteazaFisa = (fn: (f: Fisa) => Fisa) => actualizeaza((d) => scrieFisa(d, fn(citesteFisa(d, fisaId))));
  const seteazaRezumat = (camp: string, v: string) => seteazaFisa((f) => ({ ...f, rezumat: { ...f.rezumat, [camp]: v } }));
  const alege = (q: Extract<Intrebare, { tip: "text" | "lung" }>, sugestie: string) => {
    const curent = (fisa.rezumat[q.camp] ?? "").trim();
    if (q.unul) return seteazaRezumat(q.camp, curent === sugestie ? "" : sugestie);
    if (curent.toLowerCase().includes(sugestie.toLowerCase())) return;
    seteazaRezumat(q.camp, curent ? `${curent}, ${sugestie}` : sugestie);
  };

  function deschideFisa(id: string) {
    const f = citesteFisa(data, id);
    const intr = intrebariPentru(f, id === FISA_PRINCIPALA, toateIntrebarile, locale);
    setFisaId(id);
    setPas(intr.some((q) => valoare(f, q, locale).trim() !== "") ? intr.length : 0);
    setFisaNoua(false);
  }
  function creeazaFisa(tip: TipFisa) {
    if (data.fiseExtra.length >= MAX_FISE_SUPLIMENTARE) return;
    const def = TIPURI_FISA.find((t) => t.key === tip)!;
    const id = crypto.randomUUID();
    const noua: Fisa = {
      id,
      nume: def.label,
      tip,
      rezumat: {},
      conversie: def.conversie as Conversie,
      donatieUnica: "",
      lunar: "",
      validari: [],
      revizuitLa: null,
      creat: new Date().toISOString(),
    };
    actualizeaza((d) => ({ ...d, fiseExtra: [...d.fiseExtra, noua] }));
    setFisaId(id);
    setPas(0);
    setFisaNoua(false);
  }
  function stergeFisa() {
    if (principala || !window.confirm(u.confirmaSterge(fisa.rezumat.nume?.trim() || fisa.nume))) return;
    actualizeaza((d) => ({ ...d, fiseExtra: d.fiseExtra.filter((f) => f.id !== fisaId) }));
    setFisaId(FISA_PRINCIPALA);
    setPas(REZUMAT);
  }

  async function copiaza() {
    try {
      await navigator.clipboard.writeText(textRezumat(fisa, intrebari, SECTIUNI, locale));
      setCopiat(true);
      setTimeout(() => setCopiat(false), 2000);
    } catch {
      /* clipboard indisponibil: utilizatorul poate descărca fișierul */
    }
  }
  function descarca() {
    const url = URL.createObjectURL(new Blob([textRezumat(fisa, intrebari, SECTIUNI, locale)], { type: "text/plain;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "avatar-donator.txt";
    a.click();
    URL.revokeObjectURL(url);
  }
  function alegePoza(file: File) {
    if (!file.type.startsWith("image/") || file.size > 3 * 1024 * 1024) {
      setMesajPrint(u.imagineMare);
      return;
    }
    const r = new FileReader();
    r.onload = () => {
      setPoza(typeof r.result === "string" ? r.result : null);
      setMesajPrint("");
    };
    r.readAsDataURL(file);
  }
  function tipareste() {
    setMesajPrint(imprima(fisa, intrebari, SECTIUNI, poza, locale) ? "" : u.popupBlocat);
  }

  // ===== Selectorul de fișe =====
  const fise = toateFisele(data);
  const selector = (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={u.selectorAria}>
        {fise.map((f) => (
          <button
            key={f.id}
            type="button"
            aria-pressed={f.id === fisaId}
            onClick={() => deschideFisa(f.id)}
            className={`rounded-full border px-3 py-1 text-[12.5px] font-medium focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none ${
              f.id === fisaId ? "border-[var(--ci-primary)] bg-[var(--ci-primary-soft)] text-[var(--ci-primary)]" : "border-[var(--ci-border)] text-[var(--ci-text)] hover:bg-[var(--ci-surface-2)]"
            }`}
          >
            {f.id === FISA_PRINCIPALA ? `${u.principala}${f.rezumat.nume?.trim() ? ` · ${f.rezumat.nume.trim()}` : ""}` : f.rezumat.nume?.trim() || f.nume}
          </button>
        ))}
        {data.fiseExtra.length < MAX_FISE_SUPLIMENTARE && (
          <button
            type="button"
            onClick={() => setFisaNoua((v) => !v)}
            aria-expanded={fisaNoua}
            className="inline-flex items-center gap-1 rounded-full border border-dashed border-[var(--ci-border-strong)] px-3 py-1 text-[12.5px] text-[var(--ci-text-muted)] hover:bg-[var(--ci-surface-2)] focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none"
          >
            <Plus className="size-3.5" aria-hidden /> {u.fisaNoua}
          </button>
        )}
      </div>
      {fisaNoua && (
        <div className="grid gap-2 sm:grid-cols-2">
          {TIPURI_FISA.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => creeazaFisa(t.key)}
              className="rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] px-3 py-2 text-left hover:bg-[var(--ci-surface-2)] focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none"
            >
              <span className="block text-[13.5px] font-semibold text-[var(--ci-text)]">{t.label}</span>
              <span className="block text-[12px] text-[var(--ci-text-muted)]">{t.descriere}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  // ===================== REZUMAT =====================
  if (pas >= REZUMAT) {
    const nume = fisa.rezumat.nume?.trim();
    const lipsaEsentiale = intrebari.filter((q) => ESENTIALE.includes(q.id) && valoare(fisa, q, locale).trim() === "");
    const opt = intrebari.filter((q) => q.optional && valoare(fisa, q, locale).trim() === "").length;
    const incredere = incredereValidari(fisa.validari);
    const gradLabel = GRADE.find((x) => x.key === incredere.grad)?.label ?? "";
    const dePierdut = fiseDeRevizuit(data, acum).some((f) => f.id === fisa.id);
    const ultimaRevizie = fisa.revizuitLa ?? (principala ? data.actualizat : fisa.creat);
    const totalBaza = (segmente ?? []).reduce((s, x) => s + x.nr, 0);
    const ciclu = fisa.rezumat.ciclu ?? "";
    const segmenteAlese =
      fisa.tip === "firme" || !segmente
        ? []
        : CICLU_SEG.map((seg, i) => ({ seg, i }))
            .filter(({ seg, i }) => seg !== "reactivat" && cicluTexte(i).some((tx) => ciclu.toLowerCase().includes(tx.toLowerCase())))
            .map(({ seg, i }) => ({ text: g.ciclu[i], seg, s: segmente.find((x) => x.segment === seg) }))
            .filter((x) => x.s);
    const donatieTipica = parseNum(fisa.donatieUnica);
    const raport = stat && donatieTipica && stat.medianaUnica > 0 ? donatieTipica / stat.medianaUnica : null;

    const setValidari = (fn: (v: Fisa["validari"]) => Fisa["validari"]) => seteazaFisa((f) => ({ ...f, validari: fn(f.validari) }));

    return (
      <div className="space-y-4">
        {selector}

        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="ci-display text-[17px] font-bold text-[var(--ci-text)]">{u.titluSumar(fisa.tip === "firme", nume, principala, fisa.nume)}</h2>
            <p className="mt-0.5 text-[12.5px] text-[var(--ci-text-muted)]">
              {u.campuriCompletate(nrCompletate, total)}
              {ultimaRevizie ? u.ultimaModificare(new Date(ultimaRevizie).toLocaleDateString(fl)) : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={copiaza}>
              {copiat ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
              {copiat ? u.copiat : u.copiaza}
            </Button>
            <Button size="sm" onClick={descarca}>
              <Download className="size-4" aria-hidden /> {u.descarca}
            </Button>
            <Button size="sm" variant="primary" onClick={tipareste}>
              <Printer className="size-4" aria-hidden /> {u.tipareste}
            </Button>
            {!principala && (
              <Button size="sm" variant="ghost" onClick={stergeFisa}>
                <Trash2 className="size-4" aria-hidden /> {u.stergeFisa}
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[12.5px] text-[var(--ci-text-muted)]">
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] px-2.5 py-1 text-[var(--ci-text)] hover:bg-[var(--ci-surface-2)] focus-within:ring-2 focus-within:ring-[var(--ci-primary)]">
            <ImagePlus className="size-4" aria-hidden /> {poza ? u.schimbaFoto : u.adaugaFoto}
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) alegePoza(file);
                e.target.value = "";
              }}
            />
          </label>
          <span>{u.fotoNota}</span>
        </div>
        {mesajPrint && (
          <p role="alert" className="text-[12.5px] text-[var(--ci-red)]">
            {mesajPrint}
          </p>
        )}

        <div
          role="status"
          className={`rounded-[var(--ci-radius-card)] px-3 py-2 text-[13px] ${lipsaEsentiale.length === 0 ? "bg-[var(--ci-green-soft)] text-[var(--ci-text)]" : "bg-[var(--ci-amber-soft)] text-[var(--ci-text)]"}`}
        >
          {lipsaEsentiale.length === 0 ? (
            <>
              <strong>{u.solida}</strong>
              {opt > 0 ? u.maiPoti(opt) : ""}
            </>
          ) : (
            <>
              <strong>{u.lipsesc(lipsaEsentiale.length)}</strong> {lipsaEsentiale.map((q) => q.eticheta.toLowerCase()).join(", ")}.
            </>
          )}
        </div>

        {SECTIUNI.map((sectiune) => (
          <Card key={sectiune}>
            <h3 className="text-[12px] font-semibold tracking-wide text-[var(--ci-primary)] uppercase">{sectiune}</h3>
            <dl className="mt-2 divide-y divide-[var(--ci-border)]">
              {intrebari
                .map((q, i) => ({ q, i }))
                .filter(({ q }) => q.sectiune === sectiune)
                .map(({ q, i }) => {
                  const v = valoare(fisa, q, locale).trim();
                  return (
                    <div key={q.id} className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                      <div className="min-w-0">
                        <dt className="text-[12px] font-semibold text-[var(--ci-text-muted)]">
                          {q.eticheta}
                          {q.optional && <span className="ml-1.5 font-normal text-[var(--ci-text-faint)]">{u.optional}</span>}
                        </dt>
                        <dd className={`mt-0.5 text-[14px] break-words whitespace-pre-line ${v ? "text-[var(--ci-text)]" : "text-[var(--ci-text-faint)]"}`}>{v ? afiseaza(q, v, locale) : u.necompletat}</dd>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPas(i)}
                        aria-label={u.editeaza(q.eticheta)}
                        className="shrink-0 rounded-md p-1.5 text-[var(--ci-text-muted)] hover:bg-[var(--ci-surface-2)] hover:text-[var(--ci-text)] focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none"
                      >
                        <Pencil className="size-4" aria-hidden />
                      </button>
                    </div>
                  );
                })}
            </dl>
          </Card>
        ))}

        {/* Verificare cu baza reală de donatori */}
        {fisa.tip !== "firme" && (segmente || stat) && (
          <Card>
            <h3 className="text-[14px] font-bold text-[var(--ci-text)]">{u.bazaReala}</h3>
            {segmente && totalBaza === 0 ? (
              <p className="mt-1 text-[12.5px] text-[var(--ci-text-muted)]">{u.faraDonatori}</p>
            ) : (
              <div className="mt-1 space-y-2 text-[13px] text-[var(--ci-text)]">
                {segmenteAlese.length > 0 ? (
                  <ul className="divide-y divide-[var(--ci-border)]">
                    {segmenteAlese.map(({ text, seg, s }) => (
                      <li key={seg} className="flex flex-wrap items-baseline justify-between gap-2 py-1.5 first:pt-0 last:pb-0">
                        <span className="font-medium">{text.split(" (")[0]}</span>
                        <span className="ci-tabular text-[var(--ci-text-muted)]">{u.segmentRand(s!.nr, totalBaza ? Math.round((s!.nr / totalBaza) * 100) : 0, lei(s!.suma), s!.nr > 0 ? lei(s!.suma / s!.nr) : null)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[12.5px] text-[var(--ci-text-muted)]">{u.alegeEtapa}</p>
                )}
                {segmenteAlese.some(({ s }) => s!.nr === 0) && <p className="text-[12.5px] text-[var(--ci-amber)]">{u.etapaGoala}</p>}
                {raport !== null && stat && (raport > 1.5 || raport < 0.67) && <p className="text-[12.5px] text-[var(--ci-amber)]">{u.donatieDiferita(lei(donatieTipica!), lei(stat.medianaUnica))}</p>}
              </div>
            )}
          </Card>
        )}

        {/* Validare pe donatori reali */}
        <Card>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="text-[14px] font-bold text-[var(--ci-text)]">{u.validare.titlu}</h3>
              <p className="mt-0.5 max-w-xl text-[12.5px] text-[var(--ci-text-muted)]">{u.validare.sub}</p>
            </div>
            <span
              className={`rounded-full px-2.5 py-1 text-[12px] font-semibold ${
                incredere.grad === "masurat" ? "bg-[var(--ci-green-soft)] text-[var(--ci-green)]" : incredere.grad === "estimat" ? "bg-[var(--ci-amber-soft)] text-[var(--ci-text)]" : "bg-[var(--ci-surface-2)] text-[var(--ci-text-muted)]"
              }`}
            >
              {incredere.grad === "masurat" ? u.validare.validata : gradLabel}
              {incredere.n > 0 ? u.validare.raspunsuri(incredere.n, incredere.pct) : ""}
            </span>
          </div>

          {fisa.validari.length > 0 && (
            <ul className="mt-3 space-y-2">
              {fisa.validari.map((v, i) => (
                <li key={v.id} className="grid items-center gap-2 sm:grid-cols-[150px_auto_1fr_auto]">
                  <Input
                    aria-label={u.validare.persoanaAria(i + 1)}
                    placeholder={u.validare.prenume}
                    value={v.persoana}
                    onChange={(e) => setValidari((l) => l.map((x) => (x.id === v.id ? { ...x, persoana: e.target.value } : x)))}
                  />
                  <div role="radiogroup" aria-label={u.validare.seRecunoaste(v.persoana || u.validare.persoanaN(i + 1))} className="flex gap-1">
                    {(
                      [
                        ["da", u.validare.da],
                        ["partial", u.validare.partial],
                        ["nu", u.validare.nu],
                      ] as [Recunoastere, string][]
                    ).map(([val, eticheta]) => (
                      <button
                        key={val}
                        type="button"
                        role="radio"
                        aria-checked={v.recunoaste === val}
                        onClick={() => setValidari((l) => l.map((x) => (x.id === v.id ? { ...x, recunoaste: x.recunoaste === val ? "" : val } : x)))}
                        className={`rounded-full border px-2.5 py-1 text-[12.5px] focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none ${
                          v.recunoaste === val ? "border-[var(--ci-primary)] bg-[var(--ci-primary-soft)] text-[var(--ci-primary)]" : "border-[var(--ci-border)] text-[var(--ci-text)] hover:bg-[var(--ci-surface-2)]"
                        }`}
                      >
                        {eticheta}
                      </button>
                    ))}
                  </div>
                  <Input
                    aria-label={u.validare.ceAspus(v.persoana || u.validare.persoanaN(i + 1))}
                    placeholder={u.validare.notaPlaceholder}
                    value={v.nota}
                    onChange={(e) => setValidari((l) => l.map((x) => (x.id === v.id ? { ...x, nota: e.target.value } : x)))}
                  />
                  <button
                    type="button"
                    aria-label={u.validare.stergeRaspuns(i + 1)}
                    onClick={() => setValidari((l) => l.filter((x) => x.id !== v.id))}
                    className="justify-self-end rounded-md p-1.5 text-[var(--ci-text-muted)] hover:bg-[var(--ci-surface-2)] hover:text-[var(--ci-red)] focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none"
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {fisa.validari.length < MAX_VALIDARI && (
              <Button size="sm" onClick={() => setValidari((l) => [...l, { id: crypto.randomUUID(), persoana: "", recunoaste: "", nota: "" }])}>
                <Plus className="size-4" aria-hidden /> {u.validare.adauga}
              </Button>
            )}
            {incredere.n >= 3 && (
              <Button
                size="sm"
                onClick={() => {
                  const linie = u.validare.linieBaza(incredere.n, incredere.pct);
                  const curent = (fisa.rezumat.baza ?? "").trim();
                  if (!curent.includes(linie)) seteazaRezumat("baza", curent ? `${curent}; ${linie}` : linie);
                }}
              >
                {u.validare.treciInBaza}
              </Button>
            )}
          </div>
          {incredere.n >= 5 && incredere.pct < 50 && <p className="mt-2 text-[12.5px] text-[var(--ci-amber)]">{u.validare.subJumatate}</p>}
        </Card>

        {/* Revizuire anuală */}
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-[14px] font-bold text-[var(--ci-text)]">{u.revizuire.titlu}</h3>
              <p className={`mt-0.5 text-[12.5px] ${dePierdut ? "text-[var(--ci-amber)]" : "text-[var(--ci-text-muted)]"}`}>
                {dePierdut ? u.revizuire.depasita : ""}
                {fisa.revizuitLa ? u.revizuire.ultima(new Date(fisa.revizuitLa).toLocaleDateString(fl)) : u.revizuire.nu}
                {u.revizuire.recitesteAdv}
              </p>
            </div>
            <Button size="sm" onClick={() => seteazaFisa((f) => ({ ...f, revizuitLa: new Date().toISOString() }))}>
              <Check className="size-4" aria-hidden /> {u.revizuire.marcheaza}
            </Button>
          </div>
        </Card>

        <Card>
          <h3 className="text-[14px] font-bold text-[var(--ci-text)]">{u.urmeaza.titlu}</h3>
          <p className="mt-0.5 text-[12.5px] text-[var(--ci-text-muted)]">{u.urmeaza.text}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="primary" size="sm" onClick={() => mergiLa("sinteza")}>
              {u.urmeaza.recomandari} <ArrowRight className="size-4" aria-hidden />
            </Button>
            <Button size="sm" onClick={() => mergiLa("buget")}>
              {u.urmeaza.buget}
            </Button>
            <Button size="sm" onClick={() => mergiLa("profile")}>
              {u.urmeaza.scoruri}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // ===================== ÎNTREBĂRI =====================
  const q = intrebari[pas];
  const v = valoare(fisa, q, locale);
  const esteUltima = pas === total - 1;
  const inainte = () => setPas((p) => Math.min(REZUMAT, p + 1));
  const sugestii = q.tip === "text" || q.tip === "lung" ? [...(q.propune?.(fisa, locale) ?? []), ...(q.sugestii ?? [])] : [];
  const reperReal = fisa.tip !== "firme" && stat && stat.medianaUnica > 0;
  const sufixSegment = (s: string): string => {
    if (q.id !== "ciclu" || fisa.tip === "firme" || !segmente) return "";
    const idx = g.ciclu.indexOf(s);
    const seg = idx >= 0 ? CICLU_SEG[idx] : undefined;
    if (!seg || seg === "reactivat") return "";
    return u.pas.inBazaTa(segmente.find((x) => x.segment === seg)?.nr ?? 0);
  };

  return (
    <div className="mx-auto max-w-[640px] space-y-4">
      {selector}
      <div>
        <div className="flex items-center justify-between gap-2 text-[12px] text-[var(--ci-text-muted)]">
          <span>
            <span className="font-semibold text-[var(--ci-primary)]">{q.sectiune}</span> · {u.pas.intrebarea(pas + 1, total)}
          </span>
          <button type="button" onClick={() => setPas(REZUMAT)} className="shrink-0 font-medium text-[var(--ci-primary)] hover:underline focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none">
            {u.pas.vezRezumat}
          </button>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--ci-surface-2)]" role="progressbar" aria-valuemin={1} aria-valuemax={total} aria-valuenow={pas + 1} aria-label={u.pas.progresAria}>
          <div className="h-full rounded-full bg-[var(--ci-primary)] transition-[width]" style={{ width: `${((pas + 1) / total) * 100}%` }} />
        </div>
      </div>

      <Card>
        <h2 className="ci-display text-[18px] font-bold text-[var(--ci-text)]">
          {q.titlu}
          {q.optional && <span className="ml-2 align-middle text-[12px] font-normal text-[var(--ci-text-faint)]">{u.optional}</span>}
        </h2>
        <p className="mt-1 text-[13px] text-[var(--ci-text-muted)]">{q.ajutor}</p>

        {reperReal && (q.id === "comportament" || q.id === "suma") && stat && (
          <p className="mt-3 rounded-[var(--ci-radius-btn)] bg-[var(--ci-surface-2)] px-3 py-2 text-[12.5px] text-[var(--ci-text)]">
            <strong>{u.pas.reper}</strong>
            {u.pas.reperText(lei(stat.medianaUnica), lei(stat.medieUnica), stat.donatii, stat.abonamenteActive)}
          </p>
        )}

        <div className="mt-4">
          {q.tip === "text" && (
            <Input autoFocus aria-label={q.titlu} value={v} placeholder={q.exemplu} onChange={(e) => seteazaRezumat(q.camp, e.target.value)} onKeyDown={(e) => e.key === "Enter" && inainte()} />
          )}
          {q.tip === "lung" && <Textarea autoFocus aria-label={q.titlu} rows={4} value={v} placeholder={q.exemplu} onChange={(e) => seteazaRezumat(q.camp, e.target.value)} />}
          {q.tip === "suma" && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Input
                  autoFocus
                  aria-label={q.titlu}
                  inputMode="decimal"
                  value={v}
                  className="max-w-[180px]"
                  onChange={(e) => seteazaFisa((f) => ({ ...f, [q.camp]: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && inainte()}
                />
                <span className="text-[13px] text-[var(--ci-text-muted)]">{g.unitati[q.unitate]}</span>
              </div>
              {q.camp === "donatieUnica" && reperReal && stat && (
                <button
                  type="button"
                  onClick={() => seteazaFisa((f) => ({ ...f, donatieUnica: String(stat.medianaUnica) }))}
                  className="rounded-full border border-[var(--ci-border)] px-2.5 py-1 text-[12.5px] text-[var(--ci-text)] hover:bg-[var(--ci-surface-2)] focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none"
                >
                  {u.pas.folosesteMediana(lei(stat.medianaUnica))}
                </button>
              )}
            </div>
          )}
          {q.tip === "conversie" && (
            <div role="radiogroup" aria-label={q.titlu} className="grid gap-2 sm:grid-cols-2">
              {CONVERSII.map((c) => {
                const ales = fisa.conversie === c.key;
                return (
                  <button
                    key={c.key}
                    type="button"
                    role="radio"
                    aria-checked={ales}
                    onClick={() => seteazaFisa((f) => ({ ...f, conversie: (f.conversie === c.key ? "" : c.key) as Conversie }))}
                    className={`rounded-[var(--ci-radius-btn)] border px-3 py-2 text-left text-[13.5px] font-medium focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none ${
                      ales ? "border-[var(--ci-primary)] bg-[var(--ci-primary-soft)] text-[var(--ci-primary)]" : "border-[var(--ci-border)] text-[var(--ci-text)] hover:bg-[var(--ci-surface-2)]"
                    }`}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
          )}

          {(q.tip === "text" || q.tip === "lung") && sugestii.length > 0 && (
            <div className="mt-3">
              <p className="text-[12px] text-[var(--ci-text-muted)]">{q.unul ? u.pas.alegeUna : u.pas.apasa}</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {sugestii.map((s) => {
                  const ales = q.unul ? v.trim() === s : v.toLowerCase().includes(s.toLowerCase());
                  return (
                    <button
                      key={s}
                      type="button"
                      aria-pressed={ales}
                      onClick={() => alege(q, s)}
                      className={`rounded-full border px-2.5 py-1 text-[12.5px] focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none ${
                        ales ? "border-[var(--ci-primary)] bg-[var(--ci-primary-soft)] text-[var(--ci-primary)]" : "border-[var(--ci-border)] text-[var(--ci-text)] hover:bg-[var(--ci-surface-2)]"
                      }`}
                    >
                      {ales ? "✓ " : "+ "}
                      {s}
                      {sufixSegment(s)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </Card>

      <div className="flex items-center justify-between gap-2">
        <Button onClick={() => setPas((p) => Math.max(0, p - 1))} disabled={pas === 0}>
          <ArrowLeft className="size-4" aria-hidden /> {u.pas.inapoi}
        </Button>
        <div className="flex gap-2">
          {v.trim() === "" && !esteUltima && (
            <Button variant="ghost" onClick={inainte}>
              {u.pas.sari}
            </Button>
          )}
          <Button variant="primary" onClick={inainte}>
            {esteUltima ? u.pas.vezRezumatBtn : u.pas.urmatoarea} <ArrowRight className="size-4" aria-hidden />
          </Button>
        </div>
      </div>
    </div>
  );
}
