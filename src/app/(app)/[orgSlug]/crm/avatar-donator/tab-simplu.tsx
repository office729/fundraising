"use client";

import { ArrowLeft, ArrowRight, Check, Copy, Download, Pencil } from "lucide-react";
import { useMemo, useState } from "react";

import { CONVERSII, type AvatarData, type Conversie } from "@/lib/avatar-donator/tipuri";

import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input, Textarea } from "../components/ui/input";

import type { Actualizeaza } from "./avatar-donator-client";

// Varianta simplă a avatarului: o întrebare pe ecran, în limbaj de zi cu zi, la final un rezumat.
// Răspunsurile merg în ACELEAȘI câmpuri ca în varianta detaliată (rezumat, conversie, buget), deci nu există două surse de adevăr.
type Intrebare =
  | { id: string; tip: "text" | "lung"; camp: string; titlu: string; ajutor: string; exemplu: string; sugestii?: string[]; eticheta: string }
  | { id: string; tip: "conversie"; titlu: string; ajutor: string; eticheta: string }
  | { id: string; tip: "suma"; camp: "donatieUnica" | "lunar"; titlu: string; ajutor: string; eticheta: string; unitate: string };

const INTREBARI: Intrebare[] = [
  {
    id: "nume",
    tip: "text",
    camp: "nume",
    eticheta: "Numele profilului",
    titlu: "Cum i-ai spune donatorului tău ideal?",
    ajutor: "Un nume scurt, doar pentru echipă. Te ajută să vorbești despre el ca despre o persoană reală.",
    exemplu: "ex. „Părintele implicat”, „Antreprenorul local”",
  },
  {
    id: "date",
    tip: "lung",
    camp: "date",
    eticheta: "Cine este",
    titlu: "Cine este, concret?",
    ajutor: "Vârstă, unde locuiește, ce face, cum arată o zi obișnuită pentru el.",
    exemplu: "ex. femeie 30–45 de ani, oraș mare, are copii mici, lucrează în corporație",
    sugestii: ["18–24 ani", "25–34 ani", "35–44 ani", "45–54 ani", "55+ ani", "Oraș mare", "Oraș mic", "Rural", "Are copii", "Pensionar"],
  },
  {
    id: "marime",
    tip: "text",
    camp: "marime",
    eticheta: "Câți sunt",
    titlu: "Câți oameni ca el crezi că ai în jur?",
    ajutor: "O estimare aproximativă e suficientă: numărul din baza ta de date sau al urmăritorilor care seamănă cu el.",
    exemplu: "ex. aproximativ 800 de persoane",
    sugestii: ["Sub 100", "100–500", "500–2.000", "Peste 2.000", "Nu știu încă"],
  },
  {
    id: "motivatie",
    tip: "lung",
    camp: "motivatie",
    eticheta: "De ce donează",
    titlu: "De ce ar dona pentru cauza ta?",
    ajutor: "Ce simte sau ce vrea să schimbe. Gândește-te la ultimul donator cu care ai vorbit.",
    exemplu: "ex. vrea să ajute un copil concret și să vadă rezultatul",
    sugestii: ["Empatie pentru un caz concret", "Vrea să schimbe ceva în comunitate", "Experiență personală cu boala", "Apartenență la o comunitate", "Recunoștință"],
  },
  {
    id: "comportament",
    tip: "lung",
    camp: "comportament",
    eticheta: "Cum donează",
    titlu: "Cum donează de obicei?",
    ajutor: "Cât, cât de des și cu ce metodă. Dacă ai date reale din platformă, folosește-le.",
    exemplu: "ex. 50–100 lei, de 1–2 ori pe an, cu cardul, de pe telefon",
    sugestii: ["O singură dată", "Lunar", "De câteva ori pe an", "Card online", "Transfer bancar", "SMS", "De pe telefon"],
  },
  {
    id: "suma",
    tip: "suma",
    camp: "donatieUnica",
    eticheta: "Donația tipică",
    titlu: "Cât este o donație obișnuită?",
    ajutor: "Suma din care calculăm cât îți poți permite să cheltuiești ca să aduci un donator nou. O poți schimba oricând în tabul Buget.",
    unitate: "lei",
  },
  {
    id: "conversie",
    tip: "conversie",
    eticheta: "Acțiunea dorită",
    titlu: "Ce vrei să facă, mai întâi?",
    ajutor: "Prima acțiune pe care o ceri unui om nou. Pe ea se bazează recomandările din Sinteză.",
  },
  {
    id: "obiectii",
    tip: "lung",
    camp: "obiectii",
    eticheta: "Ce îl oprește",
    titlu: "Ce îl face să ezite?",
    ajutor: "Îndoielile pe care le aud echipa sau voluntarii și dovada care le rezolvă.",
    exemplu: "ex. nu știe unde ajung banii; îl liniștesc raportul și o poză cu rezultatul",
    sugestii: ["Nu are încredere că banii ajung unde trebuie", "Crede că suma lui nu contează", "Nu vrea să se angajeze lunar", "Nu cunoaște organizația", "Plata online i se pare nesigură"],
  },
  {
    id: "mesaj",
    tip: "lung",
    camp: "mesaj",
    eticheta: "Ce îi spui",
    titlu: "Ce mesaj și ce format îl convinge?",
    ajutor: "Tonul, ce spui prima dată și în ce format (video scurt, poveste, cifre).",
    exemplu: "ex. o poveste scurtă, cu fața omului, și un buton clar „Donează 20 lei”",
    sugestii: ["Poveste personală", "Video scurt", "Cifre și rezultate", "Mesaj direct, cald", "Apel la acțiune clar"],
  },
  {
    id: "canale",
    tip: "lung",
    camp: "canale",
    eticheta: "Unde îl găsești",
    titlu: "Unde îl poți găsi?",
    ajutor: "Platformele și locurile unde petrece timp. Bifează sau scrie.",
    exemplu: "ex. Facebook și grupuri de părinți",
    sugestii: ["Facebook", "Instagram", "TikTok", "LinkedIn", "Google / YouTube", "Email", "Evenimente locale", "Recomandări de la prieteni"],
  },
  {
    id: "momente",
    tip: "lung",
    camp: "momente",
    eticheta: "Când",
    titlu: "Când este cel mai dispus să doneze?",
    ajutor: "Momente din an sau din viața lui.",
    exemplu: "ex. înainte de Crăciun, după o poveste care îl atinge",
    sugestii: ["Crăciun", "Paște", "1 iunie", "Campania 3,5%", "Început de an școlar", "După un caz publicat", "Ziua organizației"],
  },
  {
    id: "excluderi",
    tip: "lung",
    camp: "excluderi",
    eticheta: "Cui nu te adresezi",
    titlu: "Pe cine NU vrei să abordezi?",
    ajutor: "Persoane sau practici evitate, din motive de etică sau de eficiență.",
    exemplu: "ex. nu contactăm beneficiarii și familiile lor ca să doneze",
    sugestii: ["Beneficiarii și familiile lor", "Cei care s-au dezabonat", "Minorii", "Persoane în dificultate financiară"],
  },
  {
    id: "buget",
    tip: "suma",
    camp: "lunar",
    eticheta: "Buget lunar",
    titlu: "Cât poți cheltui lunar pe promovare?",
    ajutor: "Bugetul total, în lei. Dacă nu ai unul, lasă gol: îl completezi când ești pregătit.",
    unitate: "lei / lună",
  },
  {
    id: "kpi",
    tip: "lung",
    camp: "kpi",
    eticheta: "Cum măsori",
    titlu: "Cum vei ști că funcționează?",
    ajutor: "Câteva cifre simple și o limită sub care oprești sau schimbi ceva.",
    exemplu: "ex. 30 donatori noi pe lună; dacă un donator costă peste 40 lei, oprim reclama",
    sugestii: ["Donatori noi pe lună", "Cost per donator", "Rata de conversie", "Donatori care revin", "Donații lunare recurente"],
  },
];

const TOTAL = INTREBARI.length;
const REZUMAT = TOTAL; // indexul ecranului de rezumat

function valoare(d: AvatarData, q: Intrebare): string {
  if (q.tip === "conversie") return CONVERSII.find((c) => c.key === d.conversie)?.label ?? "";
  if (q.tip === "suma") return q.camp === "lunar" ? d.buget.lunar : d.buget.donatieUnica;
  return d.rezumat[q.camp] ?? "";
}

function textRezumat(d: AvatarData): string {
  const linii = INTREBARI.map((q) => {
    const v = valoare(d, q).trim();
    return v ? `${q.eticheta}: ${v}${q.tip === "suma" ? ` ${q.unitate}` : ""}` : null;
  }).filter((l): l is string => l !== null);
  const nume = d.rezumat.nume?.trim();
  return [nume ? `Avatar donator: ${nume}` : "Avatar donator", "", ...linii].join("\n");
}

export function TabSimplu({ data, actualizeaza, mergiLa }: { data: AvatarData; actualizeaza: Actualizeaza; mergiLa: (t: "buget" | "sinteza" | "profile") => void }) {
  const nrCompletate = useMemo(() => INTREBARI.filter((q) => valoare(data, q).trim() !== "").length, [data]);
  // Cine a început deja ghidul revine direct la rezumat; cine nu, de la prima întrebare.
  const [pas, setPas] = useState(nrCompletate > 0 ? REZUMAT : 0);
  const [copiat, setCopiat] = useState(false);

  const seteazaRezumat = (camp: string, v: string) => actualizeaza((d) => ({ ...d, rezumat: { ...d.rezumat, [camp]: v } }));
  const adauga = (camp: string, sugestie: string) => {
    const curent = (data.rezumat[camp] ?? "").trim();
    if (curent.toLowerCase().includes(sugestie.toLowerCase())) return;
    seteazaRezumat(camp, curent ? `${curent}, ${sugestie}` : sugestie);
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
    const lipsa = TOTAL - nrCompletate;
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="ci-display text-[17px] font-bold text-[var(--ci-text)]">{nume ? `Donatorul tău ideal: ${nume}` : "Donatorul tău ideal"}</h2>
            <p className="mt-0.5 text-[12.5px] text-[var(--ci-text-muted)]">
              {lipsa === 0 ? "Ai răspuns la toate întrebările." : `Mai ai ${lipsa} ${lipsa === 1 ? "întrebare" : "întrebări"} fără răspuns. Le poți completa oricând.`}
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

        <Card>
          <dl className="divide-y divide-[var(--ci-border)]">
            {INTREBARI.map((q, i) => {
              const v = valoare(data, q).trim();
              return (
                <div key={q.id} className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <dt className="text-[12px] font-semibold tracking-wide text-[var(--ci-text-muted)] uppercase">{q.eticheta}</dt>
                    <dd className={`mt-0.5 text-[14px] break-words whitespace-pre-line ${v ? "text-[var(--ci-text)]" : "text-[var(--ci-text-faint)]"}`}>
                      {v ? (q.tip === "suma" ? `${v} ${q.unitate}` : v) : "Necompletat"}
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

        <Card>
          <h3 className="text-[14px] font-bold text-[var(--ci-text)]">Ce urmează</h3>
          <p className="mt-0.5 text-[12.5px] text-[var(--ci-text-muted)]">
            Din răspunsurile de mai sus, aplicația poate calcula cum să-ți împarți bugetul pe platforme. Pentru scoruri pe segmente și chestionarul complet, folosește variantele detaliate.
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

  return (
    <div className="mx-auto max-w-[640px] space-y-4">
      <div>
        <div className="flex items-center justify-between text-[12px] text-[var(--ci-text-muted)]">
          <span>
            Întrebarea {pas + 1} din {TOTAL}
          </span>
          <button type="button" onClick={() => setPas(REZUMAT)} className="font-medium text-[var(--ci-primary)] hover:underline focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none">
            Vezi rezumatul
          </button>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--ci-surface-2)]" role="progressbar" aria-valuemin={1} aria-valuemax={TOTAL} aria-valuenow={pas + 1} aria-label="Progres ghid">
          <div className="h-full rounded-full bg-[var(--ci-primary)] transition-[width]" style={{ width: `${((pas + 1) / TOTAL) * 100}%` }} />
        </div>
      </div>

      <Card>
        <h2 className="ci-display text-[18px] font-bold text-[var(--ci-text)]">{q.titlu}</h2>
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

          {(q.tip === "text" || q.tip === "lung") && q.sugestii && (
            <div className="mt-3">
              <p className="text-[12px] text-[var(--ci-text-muted)]">Apasă ca să adaugi:</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {q.sugestii.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => adauga(q.camp, s)}
                    className="rounded-full border border-[var(--ci-border)] px-2.5 py-1 text-[12.5px] text-[var(--ci-text)] hover:bg-[var(--ci-surface-2)] focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none"
                  >
                    + {s}
                  </button>
                ))}
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
