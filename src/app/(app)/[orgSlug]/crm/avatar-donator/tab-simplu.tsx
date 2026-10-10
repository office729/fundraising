"use client";

import { ArrowLeft, ArrowRight, Check, Copy, Download, ImagePlus, Pencil, Plus, Printer, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { parseNum } from "@/lib/avatar-donator/motor";
import {
  citesteFisa,
  CONVERSII,
  FISA_PRINCIPALA,
  fiseDeRevizuit,
  GRADE,
  incredereValidari,
  MAX_FISE_SUPLIMENTARE,
  MAX_VALIDARI,
  scrieFisa,
  TIPURI_FISA,
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
type Baza = { id: string; sectiune: string; eticheta: string; titlu: string; ajutor: string; optional?: boolean; doarPrincipala?: boolean };
type Intrebare =
  | (Baza & { tip: "text" | "lung"; camp: string; exemplu: string; sugestii?: string[]; unul?: boolean; propune?: (d: Fisa) => string[] })
  | (Baza & { tip: "conversie" })
  | (Baza & { tip: "suma"; camp: "donatieUnica" | "lunar"; unitate: string });

const S1 = "Obiectiv și persoană";
const S2 = "Motivații și frâne";
const S3 = "Comportament de donare";
const S4 = "Cum ajungi la el";
const S5 = "Limite și măsurare";

// Etapele relației = segmentele din pagina „Segmente de donatori”; cele reale vin din baza de date.
const CICLU: { text: string; seg: SegmentReal }[] = [
  { text: "Nou (prima donație)", seg: "nou" },
  { text: "Recurent (lunar)", seg: "recurent" },
  { text: "Fidel (donează de mai multe ori)", seg: "fidel" },
  { text: "Major (donații mari)", seg: "major" },
  { text: "În risc (nu a mai donat de ceva timp)", seg: "in_risc" },
  { text: "Inactiv", seg: "inactiv" },
  { text: "Reactivat", seg: "reactivat" },
];

// Propunere de 3 sume (mică / tipică / ambițioasă) pornind de la donația tipică, rotunjite.
function treiSume(f: Fisa): string[] {
  const m = parseNum(f.donatieUnica);
  if (!m || m <= 0) return [];
  const pas = m >= 1000 ? 100 : m >= 100 ? 10 : 5;
  const rot = (x: number) => Math.max(pas, Math.round(x / pas) * pas);
  const v = [rot(m / 2), rot(m), rot(m * 2)];
  return v[0] === v[1] || v[1] === v[2] ? [] : [`${v.map((x) => x.toLocaleString("ro-RO")).join(" / ")} lei`];
}

const INTREBARI: Intrebare[] = [
  {
    id: "conversie",
    sectiune: S1,
    tip: "conversie",
    eticheta: "Obiectivul",
    titlu: "Ce vrei să facă, mai întâi?",
    ajutor: "Pornește de la scop: prima acțiune pe care o ceri unui om nou. Pe ea se bazează recomandările din Sinteză.",
  },
  {
    id: "nume",
    sectiune: S1,
    tip: "text",
    camp: "nume",
    eticheta: "Numele profilului",
    titlu: "Cum i-ai spune donatorului tău ideal?",
    ajutor: "Un nume scurt, doar pentru echipă. Te ajută să vorbești despre el ca despre o persoană reală.",
    exemplu: "ex. „Părintele implicat”, „Antreprenorul local”",
  },
  {
    id: "date",
    sectiune: S1,
    tip: "lung",
    camp: "date",
    eticheta: "Persoana",
    titlu: "Descrie-l ca pe o persoană reală",
    ajutor: "Descrie un grup de donatori, nu o persoană anume: vârsta tipică, orașul sau zona, contextul (de exemplu „părinți”). Nu deduce venitul, sănătatea sau convingerile cuiva; scrie doar ce știi din datele sau conversațiile tale.",
    exemplu: "ex. Femei de 35–44 de ani din orașe mari, părinți, care au donat prin Facebook",
    sugestii: ["18–24 ani", "25–34 ani", "35–44 ani", "45–54 ani", "55+ ani", "Oraș mare", "Oraș mic", "Rural", "Are copii", "Pensionar"],
  },
  {
    id: "marime",
    sectiune: S1,
    tip: "text",
    camp: "marime",
    eticheta: "Câți sunt",
    titlu: "Câți oameni ca el crezi că ai în jur?",
    ajutor: "O estimare aproximativă e suficientă: numărul din baza ta de date sau al urmăritorilor care seamănă cu el.",
    exemplu: "ex. aproximativ 800 de persoane",
    sugestii: ["Sub 100", "100–500", "500–2.000", "Peste 2.000", "Nu știu încă"],
    unul: true,
  },
  {
    id: "motivatie",
    sectiune: S2,
    tip: "lung",
    camp: "motivatie",
    eticheta: "Valori și scopuri",
    titlu: "Ce valori are și de ce ar dona pentru cauza ta?",
    ajutor: "Ce vrea să schimbe, ce îl atinge. Gândește-te la ultimul donator cu care ai vorbit.",
    exemplu: "ex. vrea să ajute un copil concret și să vadă rezultatul",
    sugestii: ["Empatie pentru un caz concret", "Vrea să schimbe ceva în comunitate", "Experiență personală cu boala", "Apartenență la o comunitate", "Recunoștință", "Răspunderea față de cei din jur"],
  },
  {
    id: "citat",
    sectiune: S2,
    tip: "text",
    camp: "citat",
    eticheta: "În cuvintele lui",
    titlu: "Ce ar spune el, cu vorbele lui, despre cauza ta?",
    ajutor: "O propoziție reală sau plauzibilă. Te ajută să scrii texte care sună ca el, nu ca organizația.",
    exemplu: "ex. „Vreau să știu sigur că banii ajung la copil.”",
    optional: true,
  },
  {
    id: "obiectii",
    sectiune: S2,
    tip: "lung",
    camp: "obiectii",
    eticheta: "Provocări și obiecții",
    titlu: "Ce îl face să ezite?",
    ajutor: "Îndoielile pe care le aud echipa sau voluntarii și dovada care le rezolvă.",
    exemplu: "ex. nu știe unde ajung banii; îl liniștesc raportul și o poză cu rezultatul",
    sugestii: ["Nu are încredere că banii ajung unde trebuie", "Crede că suma lui nu contează", "Nu vrea să se angajeze lunar", "Nu cunoaște organizația", "Plata online i se pare nesigură"],
  },
  {
    id: "ciclu",
    sectiune: S3,
    tip: "lung",
    camp: "ciclu",
    eticheta: "Etapa relației",
    titlu: "În ce etapă a relației cu organizația se află, de obicei?",
    ajutor: "Aceleași etape ca în pagina Segmente de donatori. Alege principala (sau două). Lângă fiecare vezi câți donatori ai de fapt în baza ta.",
    exemplu: "ex. Nou, apoi Fidel",
    sugestii: CICLU.map((c) => c.text),
  },
  {
    id: "comportament",
    sectiune: S3,
    tip: "lung",
    camp: "comportament",
    eticheta: "Comportament de donare",
    titlu: "Cum donează de obicei?",
    ajutor: "Trei lucruri: când a donat ultima oară (recență), cât de des (frecvență) și cât (valoare). Dacă ai date reale din platformă, folosește-le.",
    exemplu: "ex. 50–100 lei, de 1–2 ori pe an, ultima dată în urmă cu 4 luni, cu cardul, de pe telefon",
    sugestii: ["O singură dată", "Lunar", "De câteva ori pe an", "A donat în ultimele 3 luni", "Card online", "Transfer bancar", "SMS", "De pe telefon"],
  },
  {
    id: "suma",
    sectiune: S3,
    tip: "suma",
    camp: "donatieUnica",
    eticheta: "Donația tipică",
    titlu: "Cât este o donație obișnuită?",
    ajutor: "Suma din care calculăm cât îți poți permite să cheltuiești ca să aduci un donator nou. O poți schimba oricând în tabul Buget.",
    unitate: "lei",
  },
  {
    id: "sume",
    sectiune: S3,
    tip: "text",
    camp: "sume",
    eticheta: "Sume propuse",
    titlu: "Ce trei sume îi propui când ceri donația?",
    ajutor: "O sumă mică, una tipică și una ambițioasă. Cererea cu sume potrivite capacității lui aduce mai mult decât o sumă liberă.",
    exemplu: "ex. 20 / 50 / 100 lei",
    sugestii: ["10 / 25 / 50 lei", "20 / 50 / 100 lei", "50 / 100 / 250 lei"],
    propune: treiSume,
    unul: true,
    optional: true,
  },
  {
    id: "recurent",
    sectiune: S3,
    tip: "text",
    camp: "recurent",
    eticheta: "Donație lunară",
    titlu: "Ar dona lunar?",
    ajutor: "Cât de probabil ar fi să devină donator recurent. Donatorii lunari aduc mai mult pe termen lung.",
    exemplu: "ex. poate, dacă primește rapoarte lunare",
    sugestii: ["Da, ar dona lunar", "Poate, dacă vede rezultate", "Probabil nu, preferă donații unice"],
    unul: true,
    optional: true,
  },
  {
    id: "canale",
    sectiune: S4,
    tip: "lung",
    camp: "canale",
    eticheta: "Unde se informează",
    titlu: "Unde îl poți găsi?",
    ajutor: "Platformele și locurile unde petrece timp și de unde află lucruri noi.",
    exemplu: "ex. Facebook și grupuri de părinți",
    sugestii: ["Facebook", "Instagram", "TikTok", "LinkedIn", "Google / YouTube", "Email", "Evenimente locale", "Recomandări de la prieteni"],
  },
  {
    id: "contact",
    sectiune: S4,
    tip: "lung",
    camp: "contact",
    eticheta: "Preferință de contact",
    titlu: "Cum preferă să fie contactat?",
    ajutor: "Canalul pe care răspunde cel mai bine. Contactează doar persoanele care și-au dat acordul pentru acel canal.",
    exemplu: "ex. email, rar; SMS doar pentru campanii urgente",
    sugestii: ["Email", "Telefon", "SMS", "WhatsApp", "Poștă", "Mesaj pe rețele sociale"],
    optional: true,
  },
  {
    id: "mesaj",
    sectiune: S4,
    tip: "lung",
    camp: "mesaj",
    eticheta: "Mesaj și format",
    titlu: "Ce mesaj și ce format îl convinge?",
    ajutor: "Tonul, ce spui prima dată și în ce format (video scurt, poveste, cifre).",
    exemplu: "ex. o poveste scurtă, cu fața omului, și un buton clar „Donează 20 lei”",
    sugestii: ["Poveste personală", "Video scurt", "Cifre și rezultate", "Mesaj direct, cald", "Apel la acțiune clar"],
  },
  {
    id: "momente",
    sectiune: S4,
    tip: "lung",
    camp: "momente",
    eticheta: "Momente",
    titlu: "Când este cel mai dispus să doneze?",
    ajutor: "Momente din an sau din viața lui.",
    exemplu: "ex. înainte de Crăciun, după o poveste care îl atinge",
    sugestii: ["Crăciun", "Paște", "1 iunie", "Campania 3,5%", "Început de an școlar", "După un caz publicat", "Ziua organizației"],
  },
  {
    id: "excluderi",
    sectiune: S5,
    tip: "lung",
    camp: "excluderi",
    eticheta: "Excluderi",
    titlu: "Pe cine NU vrei să abordezi?",
    ajutor: "Persoane sau practici evitate, din motive de etică sau de eficiență.",
    exemplu: "ex. nu contactăm beneficiarii și familiile lor ca să doneze",
    sugestii: ["Beneficiarii și familiile lor", "Cei care s-au dezabonat", "Minorii", "Persoane în dificultate financiară"],
  },
  {
    id: "buget",
    sectiune: S5,
    tip: "suma",
    camp: "lunar",
    eticheta: "Buget lunar",
    titlu: "Cât poți cheltui lunar pe promovare?",
    ajutor: "Bugetul total, în lei. Dacă nu ai unul, lasă gol: îl completezi când ești pregătit. Bugetul se setează o singură dată, în fișa principală.",
    unitate: "lei / lună",
    doarPrincipala: true,
  },
  {
    id: "kpi",
    sectiune: S5,
    tip: "lung",
    camp: "kpi",
    eticheta: "KPI și limite",
    titlu: "Cum vei ști că funcționează?",
    ajutor: "Câteva cifre simple și o limită sub care oprești sau schimbi ceva.",
    exemplu: "ex. 30 donatori noi pe lună; dacă un donator costă peste 40 lei, oprim reclama",
    sugestii: ["Donatori noi pe lună", "Cost per donator", "Rata de conversie", "Donatori care revin", "Donații lunare recurente"],
  },
  {
    id: "baza",
    sectiune: S5,
    tip: "lung",
    camp: "baza",
    eticheta: "Sursa fișei",
    titlu: "Pe ce te bazezi când descrii acest donator?",
    ajutor: "Date reale cântăresc mai mult decât o intuiție. Revizuiește fișa o dată pe an și după fiecare campanie mare.",
    exemplu: "ex. 12 interviuri cu donatori + datele din platformă",
    sugestii: ["Date reale din platformă", "Interviuri cu donatori", "Sondaj", "Intuiția echipei"],
    optional: true,
  },
];

// Adaptări pentru fișele de firmă: aceleași întrebări, cu formulări potrivite sponsorilor corporate.
type Varianta = { eticheta?: string; titlu?: string; ajutor?: string; exemplu?: string; sugestii?: string[]; propune?: boolean };
const VARIANTE_FIRME: Record<string, Varianta> = {
  date: {
    titlu: "Descrie firma ca pe un client real",
    ajutor: "Domeniul, mărimea (angajați sau cifră de afaceri), orașul și persoana care decide (rolul ei).",
    exemplu: "ex. SRL de IT, 80 de angajați, București; decide directorul de marketing",
    sugestii: ["IT", "Retail", "Producție", "Servicii financiare", "Sub 50 de angajați", "50–250 de angajați", "Peste 250 de angajați", "București", "Alt oraș mare"],
  },
  motivatie: {
    titlu: "De ce ar sponsoriza cauza ta?",
    ajutor: "Responsabilitate socială (CSR), imagine, implicarea angajaților, beneficii fiscale.",
    exemplu: "ex. vrea să implice angajații într-o cauză locală și să raporteze impactul",
    sugestii: ["CSR / responsabilitate socială", "Imaginea firmei", "Implicarea angajaților", "Beneficii fiscale", "Cunoaște cauza personal"],
  },
  obiectii: {
    sugestii: ["Bugetul de sponsorizări e epuizat", "Nu are un proces pentru sponsorizări", "Vrea vizibilitate în schimb", "Nu cunoaște organizația", "Sprijină deja alt ONG"],
  },
  ciclu: { titlu: "În ce etapă a relației cu firma ești?", ajutor: "Etapa în care se află de obicei firmele de acest tip.", sugestii: ["Prospect (neabordat)", "Contactat", "În discuție", "Sponsor activ", "Fost sponsor"] },
  comportament: {
    titlu: "Cum sponsorizează de obicei?",
    ajutor: "Cât, cât de des, prin contract sau redirecționare de impozit, în ce perioadă a anului.",
    exemplu: "ex. contract anual de 5.000–10.000 lei, decis la începutul anului",
    sugestii: ["Contract de sponsorizare", "Redirecționare de impozit", "O dată pe an", "Proiecte pe termen lung", "Sub 5.000 lei", "5.000–20.000 lei", "Peste 20.000 lei"],
  },
  suma: { titlu: "Cât este o sponsorizare obișnuită?", ajutor: "Suma tipică a unei sponsorizări, în lei." },
  sume: { titlu: "Ce trei sume de sponsorizare propui?", exemplu: "ex. 2.500 / 10.000 / 25.000 lei", sugestii: ["1.000 / 5.000 / 10.000 lei", "2.500 / 10.000 / 25.000 lei"] },
  recurent: { titlu: "Ar sponsoriza în fiecare an?", exemplu: "ex. da, dacă primește un raport de impact", sugestii: ["Da, parteneriat anual", "Poate, dacă primește raport de impact", "Doar punctual"] },
  canale: { eticheta: "Unde îl găsești", ajutor: "Unde poți ajunge la persoana care decide.", sugestii: ["LinkedIn", "Email direct", "Întâlniri one-to-one", "Evenimente de networking", "Recomandări", "Telefon"] },
  contact: { sugestii: ["Email", "Telefon", "Întâlnire față în față", "LinkedIn"] },
  mesaj: { sugestii: ["Dosar de prezentare cu impact", "Raport de transparență", "Beneficii pentru firmă", "Povestea unui beneficiar", "Cifre clare"] },
  momente: { sugestii: ["Începutul anului fiscal (bugete)", "Închiderea anului fiscal", "Crăciun", "Evenimente de CSR"] },
  excluderi: { sugestii: ["Firme din domenii incompatibile cu misiunea", "Firme cu probleme reputaționale", "Firme care cer exclusivitate nejustificată"] },
  kpi: { sugestii: ["Firme contactate pe lună", "Rata de răspuns", "Valoarea medie a unei sponsorizări", "Parteneriate reînnoite"] },
};

function pentruTip(q: Intrebare, tip: TipFisa): Intrebare {
  if (tip !== "firme") return q;
  const v = VARIANTE_FIRME[q.id];
  if (!v) return q;
  const { propune: _p, ...rest } = v;
  void _p;
  return { ...q, ...rest } as Intrebare;
}

// Fără aceste răspunsuri, fișa nu poate ghida o campanie; restul îmbogățesc fișa.
const ESENTIALE = ["conversie", "nume", "date", "motivatie", "obiectii", "comportament", "canale", "mesaj"];

const SECTIUNI = [...new Set(INTREBARI.map((q) => q.sectiune))];

function valoare(f: Fisa, q: Intrebare): string {
  if (q.tip === "conversie") return CONVERSII.find((c) => c.key === f.conversie)?.label ?? "";
  if (q.tip === "suma") return q.camp === "lunar" ? f.lunar : f.donatieUnica;
  return f.rezumat[q.camp] ?? "";
}

function afiseaza(q: Intrebare, v: string): string {
  return q.tip === "suma" ? `${v} ${q.unitate}` : v;
}

function intrebariPentru(f: Fisa, principala: boolean): Intrebare[] {
  return INTREBARI.filter((q) => principala || !q.doarPrincipala).map((q) => pentruTip(q, f.tip));
}

function textRezumat(f: Fisa, intrebari: Intrebare[]): string {
  const nume = f.rezumat.nume?.trim();
  const iesire: string[] = [nume ? `Fișă de avatar donator: ${nume}` : "Fișă de avatar donator"];
  for (const sectiune of SECTIUNI) {
    const linii = intrebari
      .filter((q) => q.sectiune === sectiune)
      .map((q) => {
        const v = valoare(f, q).trim();
        return v ? `${q.eticheta}: ${afiseaza(q, v)}` : null;
      })
      .filter((l): l is string => l !== null);
    if (linii.length) iesire.push("", sectiune.toUpperCase(), ...linii);
  }
  return iesire.join("\n");
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Fișa pe o pagină A4, într-o fereastră separată (fără meniul aplicației), gata de tipărit sau de salvat ca PDF.
function imprima(f: Fisa, intrebari: Intrebare[], poza: string | null): boolean {
  const w = window.open("", "_blank", "width=900,height=1100");
  if (!w) return false;
  const nume = f.rezumat.nume?.trim() || "Donatorul ideal";
  const tip = TIPURI_FISA.find((t) => t.key === f.tip)?.label ?? "";
  const citat = f.rezumat.citat?.trim();
  const persoana = f.rezumat.date?.trim();
  const incredere = incredereValidari(f.validari);
  const gradLabel = GRADE.find((g) => g.key === incredere.grad)?.label ?? "";
  const sectiuni = SECTIUNI.map((s) => {
    const randuri = intrebari
      .filter((q) => q.sectiune === s && q.id !== "nume" && q.id !== "date" && q.id !== "citat")
      .map((q) => ({ q, v: valoare(f, q).trim() }))
      .filter((r) => r.v);
    if (!randuri.length) return "";
    return `<section><h2>${esc(s)}</h2>${randuri.map((r) => `<div class="r"><b>${esc(r.q.eticheta)}</b><span>${esc(afiseaza(r.q, r.v))}</span></div>`).join("")}</section>`;
  }).join("");
  w.document.write(`<!doctype html><html lang="ro"><head><meta charset="utf-8"><title>Fișă de avatar — ${esc(nume)}</title><style>
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
      <div class="poza">${poza ? `<img src="${poza}" alt="">` : "Fotografie<br>(opțional)"}</div>
      <div><div class="tip">${esc(tip)} · fișă de avatar</div><h1>${esc(nume)}</h1>${persoana ? `<p class="persoana">${esc(persoana)}</p>` : ""}${citat ? `<blockquote>${esc(citat)}</blockquote>` : ""}</div>
    </header>
    <main>${sectiuni}</main>
    <footer>Încredere: ${esc(gradLabel)}${incredere.n ? ` — verificată cu ${incredere.n} ${incredere.n === 1 ? "donator" : "donatori"}, ${incredere.pct}% recunoaștere` : ""} · Întocmită/actualizată: ${new Date().toLocaleDateString("ro-RO")}${f.revizuitLa ? ` · Revizuită: ${new Date(f.revizuitLa).toLocaleDateString("ro-RO")}` : ""}</footer>
  </body></html>`);
  w.document.close();
  setTimeout(() => {
    w.focus();
    w.print();
  }, 400);
  return true;
}

const lei = (n: number) => `${Math.round(n).toLocaleString("ro-RO")} lei`;

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
  const [fisaId, setFisaId] = useState(FISA_PRINCIPALA);
  const fisa = citesteFisa(data, fisaId);
  const principala = fisa.id === FISA_PRINCIPALA;
  const intrebari = useMemo(() => intrebariPentru(fisa, principala), [fisa, principala]);
  const total = intrebari.length;
  const REZUMAT = total; // indexul ecranului de rezumat
  const nrCompletate = intrebari.filter((q) => valoare(fisa, q).trim() !== "").length;

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
    const intr = intrebariPentru(f, id === FISA_PRINCIPALA);
    setFisaId(id);
    setPas(intr.some((q) => valoare(f, q).trim() !== "") ? intr.length : 0);
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
    if (principala || !window.confirm(`Ștergi fișa „${fisa.rezumat.nume?.trim() || fisa.nume}”? Nu se poate anula.`)) return;
    actualizeaza((d) => ({ ...d, fiseExtra: d.fiseExtra.filter((f) => f.id !== fisaId) }));
    setFisaId(FISA_PRINCIPALA);
    setPas(REZUMAT);
  }

  async function copiaza() {
    try {
      await navigator.clipboard.writeText(textRezumat(fisa, intrebari));
      setCopiat(true);
      setTimeout(() => setCopiat(false), 2000);
    } catch {
      /* clipboard indisponibil: utilizatorul poate descărca fișierul */
    }
  }
  function descarca() {
    const url = URL.createObjectURL(new Blob([textRezumat(fisa, intrebari)], { type: "text/plain;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "avatar-donator.txt";
    a.click();
    URL.revokeObjectURL(url);
  }
  function alegePoza(file: File) {
    if (!file.type.startsWith("image/") || file.size > 3 * 1024 * 1024) {
      setMesajPrint("Alege o imagine de cel mult 3 MB.");
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
    setMesajPrint(imprima(fisa, intrebari, poza) ? "" : "Browserul a blocat fereastra de tipărire. Permite ferestrele pop-up pentru această pagină.");
  }

  // ===== Selectorul de fișe =====
  const fise = toateFisele(data);
  const selector = (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Fișele de avatar">
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
            {f.id === FISA_PRINCIPALA ? `Principală${f.rezumat.nume?.trim() ? ` · ${f.rezumat.nume.trim()}` : ""}` : f.rezumat.nume?.trim() || f.nume}
          </button>
        ))}
        {data.fiseExtra.length < MAX_FISE_SUPLIMENTARE && (
          <button
            type="button"
            onClick={() => setFisaNoua((v) => !v)}
            aria-expanded={fisaNoua}
            className="inline-flex items-center gap-1 rounded-full border border-dashed border-[var(--ci-border-strong)] px-3 py-1 text-[12.5px] text-[var(--ci-text-muted)] hover:bg-[var(--ci-surface-2)] focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none"
          >
            <Plus className="size-3.5" aria-hidden /> Fișă nouă
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
    const lipsaEsentiale = intrebari.filter((q) => ESENTIALE.includes(q.id) && valoare(fisa, q).trim() === "");
    const opt = intrebari.filter((q) => q.optional && valoare(fisa, q).trim() === "").length;
    const incredere = incredereValidari(fisa.validari);
    const gradLabel = GRADE.find((g) => g.key === incredere.grad)?.label ?? "";
    const dePierdut = fiseDeRevizuit(data, acum).some((f) => f.id === fisa.id);
    const ultimaRevizie = fisa.revizuitLa ?? (principala ? data.actualizat : fisa.creat);
    const totalBaza = (segmente ?? []).reduce((s, x) => s + x.nr, 0);
    const ciclu = fisa.rezumat.ciclu ?? "";
    const segmenteAlese = fisa.tip === "firme" || !segmente ? [] : CICLU.filter((c) => c.seg !== "reactivat" && ciclu.toLowerCase().includes(c.text.toLowerCase())).map((c) => ({ c, s: segmente.find((x) => x.segment === c.seg) })).filter((x) => x.s);
    const donatieTipica = parseNum(fisa.donatieUnica);
    const raport = stat && donatieTipica && stat.medianaUnica > 0 ? donatieTipica / stat.medianaUnica : null;

    const setValidari = (fn: (v: Fisa["validari"]) => Fisa["validari"]) => seteazaFisa((f) => ({ ...f, validari: fn(f.validari) }));

    return (
      <div className="space-y-4">
        {selector}

        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="ci-display text-[17px] font-bold text-[var(--ci-text)]">{nume ? `${fisa.tip === "firme" ? "Sponsorul" : "Donatorul"} tău ideal: ${nume}` : principala ? "Donatorul tău ideal" : fisa.nume}</h2>
            <p className="mt-0.5 text-[12.5px] text-[var(--ci-text-muted)]">
              {nrCompletate} din {total} câmpuri completate
              {ultimaRevizie ? ` · ultima modificare ${new Date(ultimaRevizie).toLocaleDateString("ro-RO")}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={copiaza}>
              {copiat ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
              {copiat ? "Copiat" : "Copiază"}
            </Button>
            <Button size="sm" onClick={descarca}>
              <Download className="size-4" aria-hidden /> Descarcă .txt
            </Button>
            <Button size="sm" variant="primary" onClick={tipareste}>
              <Printer className="size-4" aria-hidden /> Tipărește fișa
            </Button>
            {!principala && (
              <Button size="sm" variant="ghost" onClick={stergeFisa}>
                <Trash2 className="size-4" aria-hidden /> Șterge fișa
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[12.5px] text-[var(--ci-text-muted)]">
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] px-2.5 py-1 text-[var(--ci-text)] hover:bg-[var(--ci-surface-2)] focus-within:ring-2 focus-within:ring-[var(--ci-primary)]">
            <ImagePlus className="size-4" aria-hidden /> {poza ? "Schimbă fotografia" : "Adaugă o fotografie pentru fișa tipărită"}
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
          <span>Fotografia se folosește doar la tipărire și nu se salvează în aplicație.</span>
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
              <strong>Fișa e suficient de solidă ca să ghideze o campanie.</strong>
              {opt > 0 ? ` Mai poți adăuga ${opt} ${opt === 1 ? "detaliu opțional" : "detalii opționale"}.` : ""}
            </>
          ) : (
            <>
              <strong>Lipsesc {lipsaEsentiale.length === 1 ? "un răspuns esențial" : `${lipsaEsentiale.length} răspunsuri esențiale`}:</strong> {lipsaEsentiale.map((q) => q.eticheta.toLowerCase()).join(", ")}.
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
                  const v = valoare(fisa, q).trim();
                  return (
                    <div key={q.id} className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                      <div className="min-w-0">
                        <dt className="text-[12px] font-semibold text-[var(--ci-text-muted)]">
                          {q.eticheta}
                          {q.optional && <span className="ml-1.5 font-normal text-[var(--ci-text-faint)]">opțional</span>}
                        </dt>
                        <dd className={`mt-0.5 text-[14px] break-words whitespace-pre-line ${v ? "text-[var(--ci-text)]" : "text-[var(--ci-text-faint)]"}`}>{v ? afiseaza(q, v) : "Necompletat"}</dd>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPas(i)}
                        aria-label={`Editează: ${q.eticheta}`}
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
            <h3 className="text-[14px] font-bold text-[var(--ci-text)]">Fișa față de baza ta reală</h3>
            {segmente && totalBaza === 0 ? (
              <p className="mt-1 text-[12.5px] text-[var(--ci-text-muted)]">Nu ai încă donatori în baza de date, deci nu putem verifica fișa. Revino după primele donații.</p>
            ) : (
              <div className="mt-1 space-y-2 text-[13px] text-[var(--ci-text)]">
                {segmenteAlese.length > 0 ? (
                  <ul className="divide-y divide-[var(--ci-border)]">
                    {segmenteAlese.map(({ c, s }) => (
                      <li key={c.seg} className="flex flex-wrap items-baseline justify-between gap-2 py-1.5 first:pt-0 last:pb-0">
                        <span className="font-medium">{c.text.split(" (")[0]}</span>
                        <span className="ci-tabular text-[var(--ci-text-muted)]">
                          {s!.nr} donatori ({totalBaza ? Math.round((s!.nr / totalBaza) * 100) : 0}% din bază) · {lei(s!.suma)}
                          {s!.nr > 0 ? ` · ${lei(s!.suma / s!.nr)} în medie` : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[12.5px] text-[var(--ci-text-muted)]">Alege etapa relației (în ghid) ca să vezi câți donatori reali se potrivesc.</p>
                )}
                {segmenteAlese.some(({ s }) => s!.nr === 0) && (
                  <p className="text-[12.5px] text-[var(--ci-amber)]">Cel puțin una dintre etapele alese nu are niciun donator în bază. Verifică dacă fișa descrie o realitate sau o țintă.</p>
                )}
                {raport !== null && stat && (raport > 1.5 || raport < 0.67) && (
                  <p className="text-[12.5px] text-[var(--ci-amber)]">
                    Donația tipică din fișă ({lei(donatieTipica!)}) diferă mult de mediana reală a donațiilor online ({lei(stat.medianaUnica)}). Folosește cifra reală sau explică diferența.
                  </p>
                )}
              </div>
            )}
          </Card>
        )}

        {/* Validare pe donatori reali */}
        <Card>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="text-[14px] font-bold text-[var(--ci-text)]">Verificare pe donatori reali</h3>
              <p className="mt-0.5 max-w-xl text-[12.5px] text-[var(--ci-text-muted)]">
                Arată fișa la 5–10 donatori sau potențiali donatori și întreabă dacă se recunosc. Notează doar prenumele sau inițialele, fără date de contact.
              </p>
            </div>
            <span
              className={`rounded-full px-2.5 py-1 text-[12px] font-semibold ${
                incredere.grad === "masurat" ? "bg-[var(--ci-green-soft)] text-[var(--ci-green)]" : incredere.grad === "estimat" ? "bg-[var(--ci-amber-soft)] text-[var(--ci-text)]" : "bg-[var(--ci-surface-2)] text-[var(--ci-text-muted)]"
              }`}
            >
              {incredere.grad === "masurat" ? "Validată" : gradLabel}
              {incredere.n > 0 ? ` · ${incredere.n} ${incredere.n === 1 ? "răspuns" : "răspunsuri"}, ${incredere.pct}%` : ""}
            </span>
          </div>

          {fisa.validari.length > 0 && (
            <ul className="mt-3 space-y-2">
              {fisa.validari.map((v, i) => (
                <li key={v.id} className="grid items-center gap-2 sm:grid-cols-[150px_auto_1fr_auto]">
                  <Input
                    aria-label={`Persoana ${i + 1}`}
                    placeholder="Prenume / inițiale"
                    value={v.persoana}
                    onChange={(e) => setValidari((l) => l.map((x) => (x.id === v.id ? { ...x, persoana: e.target.value } : x)))}
                  />
                  <div role="radiogroup" aria-label={`Se recunoaște? ${v.persoana || `persoana ${i + 1}`}`} className="flex gap-1">
                    {(
                      [
                        ["da", "Da"],
                        ["partial", "Parțial"],
                        ["nu", "Nu"],
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
                    aria-label={`Ce a spus ${v.persoana || `persoana ${i + 1}`}`}
                    placeholder="Ce a spus / ce nu se potrivește"
                    value={v.nota}
                    onChange={(e) => setValidari((l) => l.map((x) => (x.id === v.id ? { ...x, nota: e.target.value } : x)))}
                  />
                  <button
                    type="button"
                    aria-label={`Șterge răspunsul ${i + 1}`}
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
                <Plus className="size-4" aria-hidden /> Adaugă un donator
              </Button>
            )}
            {incredere.n >= 3 && (
              <Button
                size="sm"
                onClick={() => {
                  const linie = `Verificată cu ${incredere.n} donatori (${incredere.pct}% se recunosc)`;
                  const curent = (fisa.rezumat.baza ?? "").trim();
                  if (!curent.includes(linie)) seteazaRezumat("baza", curent ? `${curent}; ${linie}` : linie);
                }}
              >
                Trece rezultatul în „Sursa fișei”
              </Button>
            )}
          </div>
          {incredere.n >= 5 && incredere.pct < 50 && (
            <p className="mt-2 text-[12.5px] text-[var(--ci-amber)]">Sub jumătate dintre donatori se recunosc. Fișa descrie mai degrabă o țintă decât un donator real: ajusteaz-o după ce au spus.</p>
          )}
        </Card>

        {/* Revizuire anuală */}
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-[14px] font-bold text-[var(--ci-text)]">Revizuire anuală</h3>
              <p className={`mt-0.5 text-[12.5px] ${dePierdut ? "text-[var(--ci-amber)]" : "text-[var(--ci-text-muted)]"}`}>
                {dePierdut ? "Fișa n-a mai fost revizuită de peste 12 luni. " : ""}
                {fisa.revizuitLa ? `Ultima revizuire confirmată: ${new Date(fisa.revizuitLa).toLocaleDateString("ro-RO")}.` : "Nu ai confirmat încă o revizuire."} Recitește fișa o dată pe an și după fiecare campanie mare.
              </p>
            </div>
            <Button size="sm" onClick={() => seteazaFisa((f) => ({ ...f, revizuitLa: new Date().toISOString() }))}>
              <Check className="size-4" aria-hidden /> Marchează ca revizuită
            </Button>
          </div>
        </Card>

        <Card>
          <h3 className="text-[14px] font-bold text-[var(--ci-text)]">Ce urmează</h3>
          <p className="mt-0.5 text-[12.5px] text-[var(--ci-text-muted)]">
            Din fișa principală, aplicația poate calcula cum să-ți împarți bugetul pe platforme. Pentru scoruri pe segmente și chestionarul complet, folosește variantele detaliate.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="primary" size="sm" onClick={() => mergiLa("sinteza")}>
              Vezi recomandările <ArrowRight className="size-4" aria-hidden />
            </Button>
            <Button size="sm" onClick={() => mergiLa("buget")}>
              Completează bugetul și canalele
            </Button>
            <Button size="sm" onClick={() => mergiLa("profile")}>
              Scoruri pe segmente
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // ===================== ÎNTREBĂRI =====================
  const q = intrebari[pas];
  const v = valoare(fisa, q);
  const esteUltima = pas === total - 1;
  const inainte = () => setPas((p) => Math.min(REZUMAT, p + 1));
  const sugestii = q.tip === "text" || q.tip === "lung" ? [...(q.propune?.(fisa) ?? []), ...(q.sugestii ?? [])] : [];
  const reperReal = fisa.tip !== "firme" && stat && stat.medianaUnica > 0;
  const sufixSegment = (s: string): string => {
    if (q.id !== "ciclu" || fisa.tip === "firme" || !segmente) return "";
    const c = CICLU.find((x) => x.text === s);
    if (!c || c.seg === "reactivat") return "";
    return ` · ${segmente.find((x) => x.segment === c.seg)?.nr ?? 0} în baza ta`;
  };

  return (
    <div className="mx-auto max-w-[640px] space-y-4">
      {selector}
      <div>
        <div className="flex items-center justify-between gap-2 text-[12px] text-[var(--ci-text-muted)]">
          <span>
            <span className="font-semibold text-[var(--ci-primary)]">{q.sectiune}</span> · întrebarea {pas + 1} din {total}
          </span>
          <button type="button" onClick={() => setPas(REZUMAT)} className="shrink-0 font-medium text-[var(--ci-primary)] hover:underline focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none">
            Vezi rezumatul
          </button>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--ci-surface-2)]" role="progressbar" aria-valuemin={1} aria-valuemax={total} aria-valuenow={pas + 1} aria-label="Progres ghid">
          <div className="h-full rounded-full bg-[var(--ci-primary)] transition-[width]" style={{ width: `${((pas + 1) / total) * 100}%` }} />
        </div>
      </div>

      <Card>
        <h2 className="ci-display text-[18px] font-bold text-[var(--ci-text)]">
          {q.titlu}
          {q.optional && <span className="ml-2 align-middle text-[12px] font-normal text-[var(--ci-text-faint)]">opțional</span>}
        </h2>
        <p className="mt-1 text-[13px] text-[var(--ci-text-muted)]">{q.ajutor}</p>

        {reperReal && (q.id === "comportament" || q.id === "suma") && stat && (
          <p className="mt-3 rounded-[var(--ci-radius-btn)] bg-[var(--ci-surface-2)] px-3 py-2 text-[12.5px] text-[var(--ci-text)]">
            <strong>Reper real din platformă:</strong> donație online tipică (mediană) {lei(stat.medianaUnica)}, medie {lei(stat.medieUnica)}, {stat.donatii} donații unice
            {stat.abonamenteActive > 0 ? `, ${stat.abonamenteActive} abonamente lunare active` : ""}.
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
                <span className="text-[13px] text-[var(--ci-text-muted)]">{q.unitate}</span>
              </div>
              {q.camp === "donatieUnica" && reperReal && stat && (
                <button
                  type="button"
                  onClick={() => seteazaFisa((f) => ({ ...f, donatieUnica: String(stat.medianaUnica) }))}
                  className="rounded-full border border-[var(--ci-border)] px-2.5 py-1 text-[12.5px] text-[var(--ci-text)] hover:bg-[var(--ci-surface-2)] focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none"
                >
                  Folosește mediana reală: {lei(stat.medianaUnica)}
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
              <p className="text-[12px] text-[var(--ci-text-muted)]">{q.unul ? "Alege una:" : "Apasă ca să adaugi:"}</p>
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
          <ArrowLeft className="size-4" aria-hidden /> Înapoi
        </Button>
        <div className="flex gap-2">
          {v.trim() === "" && !esteUltima && (
            <Button variant="ghost" onClick={inainte}>
              Sari peste
            </Button>
          )}
          <Button variant="primary" onClick={inainte}>
            {esteUltima ? "Vezi rezumatul" : "Următoarea"} <ArrowRight className="size-4" aria-hidden />
          </Button>
        </div>
      </div>
    </div>
  );
}
