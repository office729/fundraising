"use client";

import { ArrowLeft, ArrowRight, Check, Copy, Download, Pencil } from "lucide-react";
import { useMemo, useState } from "react";

import { parseNum } from "@/lib/avatar-donator/motor";
import { CONVERSII, type AvatarData, type Conversie } from "@/lib/avatar-donator/tipuri";

import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input, Textarea } from "../components/ui/input";

import type { Actualizeaza } from "./avatar-donator-client";

// Fișa de avatar (varianta simplă): o întrebare pe ecran, în limbaj de zi cu zi, grupate pe secțiuni, cu un rezumat la final.
// Structura combină ce recomandă sursele consultate:
//  - Bloomerang: pornești de la obiectiv, apoi o persoană REALĂ (nume, vârstă, meserie) și 4 întrebări: valori/scopuri,
//    provocări, unde se informează, demografie;
//  - Blackbaud: comportament de donare, capacitate (sume propuse), atitudine, probabilitatea de donație lunară,
//    canalul preferat de contact;
//  - RFM (Blackbaud / Dotdigital): etapa relației (nou, loial, în risc, inactiv) și recență/frecvență/valoare.
// Răspunsurile merg în ACELEAȘI câmpuri ca în varianta detaliată (rezumat, conversie, buget): nu există două surse de adevăr.
type Baza = { id: string; sectiune: string; eticheta: string; titlu: string; ajutor: string; optional?: boolean };
type Intrebare =
  | (Baza & { tip: "text" | "lung"; camp: string; exemplu: string; sugestii?: string[]; unul?: boolean; propune?: (d: AvatarData) => string[] })
  | (Baza & { tip: "conversie" })
  | (Baza & { tip: "suma"; camp: "donatieUnica" | "lunar"; unitate: string });

const S1 = "Obiectiv și persoană";
const S2 = "Motivații și frâne";
const S3 = "Comportament de donare";
const S4 = "Cum ajungi la el";
const S5 = "Limite și măsurare";

// Propunere de 3 sume (mică / tipică / ambițioasă) pornind de la donația tipică, rotunjite la 5 sau 10.
function treiSume(d: AvatarData): string[] {
  const m = parseNum(d.buget.donatieUnica);
  if (!m || m <= 0) return [];
  const rot = (x: number) => Math.max(5, Math.round(x / (x >= 100 ? 10 : 5)) * (x >= 100 ? 10 : 5));
  const v = [rot(m / 2), rot(m), rot(m * 2)];
  return v[0] === v[1] || v[1] === v[2] ? [] : [`${v[0]} / ${v[1]} / ${v[2]} lei`];
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
    ajutor: "Alege un om concret: un prenume, vârsta, meseria, orașul, situația de familie, venitul aproximativ. Cu cât e mai precis, cu atât scrii mai ușor pentru el.",
    exemplu: "ex. Elena, 38 de ani, manager de proiect în Cluj, mamă a doi copii, venit mediu",
    sugestii: ["18–24 ani", "25–34 ani", "35–44 ani", "45–54 ani", "55+ ani", "Oraș mare", "Oraș mic", "Rural", "Are copii", "Pensionar", "Venit mediu", "Venit ridicat"],
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
    ajutor: "Aceleași etape ca în pagina Segmente de donatori. Alege principala (sau două).",
    exemplu: "ex. Nou, apoi Fidel",
    sugestii: ["Nou (prima donație)", "Recurent (lunar)", "Fidel (donează de mai multe ori)", "Major (donații mari)", "În risc (nu a mai donat de ceva timp)", "Inactiv", "Reactivat"],
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
    ajutor: "Bugetul total, în lei. Dacă nu ai unul, lasă gol: îl completezi când ești pregătit.",
    unitate: "lei / lună",
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

// Fără aceste răspunsuri, fișa nu poate ghida o campanie; restul îmbogățesc fișa.
const ESENTIALE = ["conversie", "nume", "date", "motivatie", "obiectii", "comportament", "canale", "mesaj"];

const TOTAL = INTREBARI.length;
const REZUMAT = TOTAL; // indexul ecranului de rezumat
const SECTIUNI = [...new Set(INTREBARI.map((q) => q.sectiune))];

function valoare(d: AvatarData, q: Intrebare): string {
  if (q.tip === "conversie") return CONVERSII.find((c) => c.key === d.conversie)?.label ?? "";
  if (q.tip === "suma") return q.camp === "lunar" ? d.buget.lunar : d.buget.donatieUnica;
  return d.rezumat[q.camp] ?? "";
}

function afiseaza(q: Intrebare, v: string): string {
  return q.tip === "suma" ? `${v} ${q.unitate}` : v;
}

function textRezumat(d: AvatarData): string {
  const nume = d.rezumat.nume?.trim();
  const iesire: string[] = [nume ? `Fișă de avatar donator: ${nume}` : "Fișă de avatar donator"];
  for (const sectiune of SECTIUNI) {
    const linii = INTREBARI.filter((q) => q.sectiune === sectiune)
      .map((q) => {
        const v = valoare(d, q).trim();
        return v ? `${q.eticheta}: ${afiseaza(q, v)}` : null;
      })
      .filter((l): l is string => l !== null);
    if (linii.length) iesire.push("", sectiune.toUpperCase(), ...linii);
  }
  return iesire.join("\n");
}

export function TabSimplu({ data, actualizeaza, mergiLa }: { data: AvatarData; actualizeaza: Actualizeaza; mergiLa: (t: "buget" | "sinteza" | "profile") => void }) {
  const nrCompletate = useMemo(() => INTREBARI.filter((q) => valoare(data, q).trim() !== "").length, [data]);
  // Cine a început deja ghidul revine direct la rezumat; cine nu, de la prima întrebare.
  const [pas, setPas] = useState(nrCompletate > 0 ? REZUMAT : 0);
  const [copiat, setCopiat] = useState(false);

  const seteazaRezumat = (camp: string, v: string) => actualizeaza((d) => ({ ...d, rezumat: { ...d.rezumat, [camp]: v } }));
  const alege = (q: Extract<Intrebare, { tip: "text" | "lung" }>, sugestie: string) => {
    const curent = (data.rezumat[q.camp] ?? "").trim();
    if (q.unul) return seteazaRezumat(q.camp, curent === sugestie ? "" : sugestie);
    if (curent.toLowerCase().includes(sugestie.toLowerCase())) return;
    seteazaRezumat(q.camp, curent ? `${curent}, ${sugestie}` : sugestie);
  };

  async function copiaza() {
    try {
      await navigator.clipboard.writeText(textRezumat(data));
      setCopiat(true);
      setTimeout(() => setCopiat(false), 2000);
    } catch {
      /* clipboard indisponibil: utilizatorul poate descărca fișierul */
    }
  }
  function descarca() {
    const url = URL.createObjectURL(new Blob([textRezumat(data)], { type: "text/plain;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "avatar-donator.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (pas >= REZUMAT) {
    const nume = data.rezumat.nume?.trim();
    const lipsaEsentiale = INTREBARI.filter((q) => ESENTIALE.includes(q.id) && valoare(data, q).trim() === "");
    const opt = INTREBARI.filter((q) => q.optional && valoare(data, q).trim() === "").length;
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="ci-display text-[17px] font-bold text-[var(--ci-text)]">{nume ? `Donatorul tău ideal: ${nume}` : "Donatorul tău ideal"}</h2>
            <p className="mt-0.5 text-[12.5px] text-[var(--ci-text-muted)]">
              {nrCompletate} din {TOTAL} câmpuri completate
              {data.actualizat ? ` · salvat ${new Date(data.actualizat).toLocaleDateString("ro-RO")}` : ""}
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
          </div>
        </div>

        <div
          role="status"
          className={`rounded-[var(--ci-radius-card)] px-3 py-2 text-[13px] ${lipsaEsentiale.length === 0 ? "bg-[var(--ci-green-soft)] text-[var(--ci-text)]" : "bg-[var(--ci-amber-soft)] text-[var(--ci-text)]"}`}
        >
          {lipsaEsentiale.length === 0 ? (
            <>
              <strong>Fișa e suficient de solidă ca să ghideze o campanie.</strong>
              {opt > 0 ? ` Mai poți adăuga ${opt} ${opt === 1 ? "detaliu opțional" : "detalii opționale"}.` : ""} Revizuiește-o o dată pe an și după fiecare campanie mare.
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
              {INTREBARI.map((q, i) => ({ q, i }))
                .filter(({ q }) => q.sectiune === sectiune)
                .map(({ q, i }) => {
                  const v = valoare(data, q).trim();
                  return (
                    <div key={q.id} className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                      <div className="min-w-0">
                        <dt className="text-[12px] font-semibold text-[var(--ci-text-muted)]">
                          {q.eticheta}
                          {q.optional && <span className="ml-1.5 font-normal text-[var(--ci-text-faint)]">opțional</span>}
                        </dt>
                        <dd className={`mt-0.5 text-[14px] break-words whitespace-pre-line ${v ? "text-[var(--ci-text)]" : "text-[var(--ci-text-faint)]"}`}>
                          {v ? afiseaza(q, v) : "Necompletat"}
                        </dd>
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

        <Card>
          <h3 className="text-[14px] font-bold text-[var(--ci-text)]">Ce urmează</h3>
          <p className="mt-0.5 text-[12.5px] text-[var(--ci-text-muted)]">
            Din răspunsurile de mai sus, aplicația poate calcula cum să-ți împarți bugetul pe platforme. Pentru scoruri pe segmente și chestionarul complet, folosește variantele detaliate. Verifică apoi fișa cu 5–10 donatori reali: dacă nu se recunosc în ea, ajusteaz-o.
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

  const q = INTREBARI[pas];
  const v = valoare(data, q);
  const esteUltima = pas === TOTAL - 1;
  const inainte = () => setPas((p) => Math.min(REZUMAT, p + 1));
  const sugestii = q.tip === "text" || q.tip === "lung" ? [...(q.propune?.(data) ?? []), ...(q.sugestii ?? [])] : [];

  return (
    <div className="mx-auto max-w-[640px] space-y-4">
      <div>
        <div className="flex items-center justify-between gap-2 text-[12px] text-[var(--ci-text-muted)]">
          <span>
            <span className="font-semibold text-[var(--ci-primary)]">{q.sectiune}</span> · întrebarea {pas + 1} din {TOTAL}
          </span>
          <button type="button" onClick={() => setPas(REZUMAT)} className="shrink-0 font-medium text-[var(--ci-primary)] hover:underline focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none">
            Vezi rezumatul
          </button>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--ci-surface-2)]" role="progressbar" aria-valuemin={1} aria-valuemax={TOTAL} aria-valuenow={pas + 1} aria-label="Progres ghid">
          <div className="h-full rounded-full bg-[var(--ci-primary)] transition-[width]" style={{ width: `${((pas + 1) / TOTAL) * 100}%` }} />
        </div>
      </div>

      <Card>
        <h2 className="ci-display text-[18px] font-bold text-[var(--ci-text)]">
          {q.titlu}
          {q.optional && <span className="ml-2 align-middle text-[12px] font-normal text-[var(--ci-text-faint)]">opțional</span>}
        </h2>
        <p className="mt-1 text-[13px] text-[var(--ci-text-muted)]">{q.ajutor}</p>

        <div className="mt-4">
          {q.tip === "text" && (
            <Input autoFocus aria-label={q.titlu} value={v} placeholder={q.exemplu} onChange={(e) => seteazaRezumat(q.camp, e.target.value)} onKeyDown={(e) => e.key === "Enter" && inainte()} />
          )}
          {q.tip === "lung" && <Textarea autoFocus aria-label={q.titlu} rows={4} value={v} placeholder={q.exemplu} onChange={(e) => seteazaRezumat(q.camp, e.target.value)} />}
          {q.tip === "suma" && (
            <div className="flex items-center gap-2">
              <Input
                autoFocus
                aria-label={q.titlu}
                inputMode="decimal"
                value={v}
                className="max-w-[180px]"
                onChange={(e) => actualizeaza((d) => ({ ...d, buget: { ...d.buget, [q.camp]: e.target.value } }))}
                onKeyDown={(e) => e.key === "Enter" && inainte()}
              />
              <span className="text-[13px] text-[var(--ci-text-muted)]">{q.unitate}</span>
            </div>
          )}
          {q.tip === "conversie" && (
            <div role="radiogroup" aria-label={q.titlu} className="grid gap-2 sm:grid-cols-2">
              {CONVERSII.map((c) => {
                const ales = data.conversie === c.key;
                return (
                  <button
                    key={c.key}
                    type="button"
                    role="radio"
                    aria-checked={ales}
                    onClick={() => actualizeaza((d) => ({ ...d, conversie: (d.conversie === c.key ? "" : c.key) as Conversie }))}
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
