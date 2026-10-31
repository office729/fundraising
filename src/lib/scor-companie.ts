// Scorul „SOI” al unei firme: cât de potrivită este de abordat pentru sponsorizare.
// Suma componentelor (max 100): capacitate D177 + 20% (35), mărime și profitabilitate (20),
// relație / oportunitate (15), contact / decident (15), momentul potrivit (15).
// Formulele urmăresc logica din CRM PJ, adaptată la datele reale din baza de date.

import type { Locale } from "./i18n/config";

export type ScorInput = {
  sumaDisponibila: number | null;
  ca: number | null;
  profit: number | null;
  nrAngajati: number | null;
  recurent: boolean;
  temperatura: string | null;
  sumaSponsorizata: number | null;
  stage: string;
  contacte: { dept: string | null; cheie: boolean }[];
  luna?: number; // 1-12; implicit luna curentă
  sumaEstimata?: boolean; // suma disponibilă vine din estimarea din bilanț (nu e introdusă de mână)
  cald?: boolean; // are o cale caldă: o persoană de contact deja donator, voluntar sau contact la un sponsor
};

export type ScorCheie = "capacitate" | "marime" | "relatie" | "contact" | "moment";
export type ScorLinie = { cheie: ScorCheie; puncte: number; max: number; detaliu: string };
export type Prioritate = "ridicata" | "medie" | "scazuta";

const PIPELINE_INAINTE_DE_ABORDARE = new Set(["nou", "pe_viitor"]);

// Perioade fiscale favorabile: octombrie–decembrie (bugete și sponsorizări de sfârșit de an)
// și aprilie–iunie (D177 depusă până pe 25 iunie).
function perioadaFiscala(luna: number) {
  return luna >= 10 || (luna >= 4 && luna <= 6);
}

// `detaliu` e text pentru utilizator: `locale` (implicit română) alege limba lui.
export function calculeazaScor(i: ScorInput, locale: Locale = "ro"): { total: number; linii: ScorLinie[]; prioritate: Prioritate } {
  const en = locale === "en";
  const fmt = (n: number) => n.toLocaleString(en ? "en-GB" : "ro-RO");
  // 1. Capacitate D177 + 20% (max 35): liniar până la 500.000 lei disponibili.
  const disp = i.sumaDisponibila ?? 0;
  const capacitate: ScorLinie = {
    cheie: "capacitate",
    puncte: Math.min(35, Math.round(disp / 14286)),
    max: 35,
    detaliu: en
      ? i.sumaDisponibila != null && disp > 0 ? `~${fmt(disp)} lei available${i.sumaEstimata ? " (estimated from the balance sheet)" : ""}` : i.sumaDisponibila != null ? `~${fmt(disp)} lei available` : "no data"
      : i.sumaDisponibila != null && disp > 0 ? `~${fmt(disp)} lei disponibili${i.sumaEstimata ? " (estimat din bilanț)" : ""}` : i.sumaDisponibila != null ? `~${fmt(disp)} lei disponibili` : "fără date",
  };

  // 2. Mărime și profitabilitate (max 20)
  const partiMarime: string[] = [];
  let marime = 0;
  if (i.profit != null && i.profit > 0) {
    marime += 10;
    partiMarime.push(en ? "positive profit" : "profit pozitiv");
  } else if (i.profit != null) {
    partiMarime.push(en ? "negative profit" : "profit negativ");
  }
  const ca = i.ca ?? 0;
  if (ca >= 10_000_000) {
    marime += 10;
    partiMarime.push(en ? "very high turnover" : "CA foarte mare");
  } else if (ca >= 1_000_000) {
    marime += 7;
    partiMarime.push(en ? "high turnover" : "CA mare");
  } else if (ca >= 100_000) {
    marime += 4;
    partiMarime.push(en ? "medium turnover" : "CA medie");
  }
  if (i.nrAngajati) partiMarime.push(en ? `${fmt(i.nrAngajati)} employees` : `${fmt(i.nrAngajati)} angajați`);
  const linieMarime: ScorLinie = { cheie: "marime", puncte: Math.min(20, marime), max: 20, detaliu: partiMarime.join(", ") || (en ? "no data" : "fără date") };

  // 3. Relație / oportunitate (max 15)
  let relatie = 0;
  let detRelatie = en ? "no relationship" : "fără relație";
  if (i.recurent) {
    relatie = 15;
    detRelatie = en ? "recurring sponsor (warm relationship)" : "sponsor recurent (relație caldă)";
  } else if (i.temperatura === "cald") {
    relatie = 12;
    detRelatie = en ? "warm relationship" : "relație caldă";
  } else if (i.cald) {
    relatie = 12;
    detRelatie = en ? "warm path (a contact person is already in the organization)" : "cale caldă (o persoană de contact e deja în organizație)";
  } else if ((i.sumaSponsorizata ?? 0) > 0) {
    relatie = 8;
    detRelatie = en ? "has sponsored before" : "a mai sponsorizat";
  } else if (i.temperatura === "rece") {
    relatie = 2;
    detRelatie = en ? "cold relationship" : "relație rece";
  }
  const linieRelatie: ScorLinie = { cheie: "relatie", puncte: relatie, max: 15, detaliu: detRelatie };

  // 4. Are contact / decident (max 15)
  const n = i.contacte.length;
  const decident = i.contacte.some((c) => c.cheie || c.dept === "Conducere" || c.dept === "Financiar");
  const linieContact: ScorLinie = {
    cheie: "contact",
    puncte: n === 0 ? 0 : decident ? 15 : 9,
    max: 15,
    detaliu: en ? (n === 0 ? "no contact saved" : `${n} ${n === 1 ? "contact" : "contacts"} saved`) : n === 0 ? "niciun contact salvat" : `${n} contact${n === 1 ? "" : "e"} salvat${n === 1 ? "" : "e"}`,
  };

  // 5. Momentul potrivit (max 15): pipeline activ (5) + perioadă fiscală favorabilă (10)
  const luna = i.luna ?? new Date().getMonth() + 1;
  const partiMoment: string[] = [];
  let moment = 0;
  if (!PIPELINE_INAINTE_DE_ABORDARE.has(i.stage)) {
    moment += 5;
    partiMoment.push(en ? "in the active pipeline" : "în pipeline activ");
  }
  if (perioadaFiscala(luna)) {
    moment += 10;
    partiMoment.push(en ? "favourable tax period" : "perioadă fiscală favorabilă");
  }
  const linieMoment: ScorLinie = { cheie: "moment", puncte: moment, max: 15, detaliu: partiMoment.join(", ") || (en ? "outside the tax period" : "în afara perioadei fiscale") };

  const linii = [capacitate, linieMarime, linieRelatie, linieContact, linieMoment];
  const total = Math.min(100, linii.reduce((s, l) => s + l.puncte, 0));
  return { total, linii, prioritate: total >= 80 ? "ridicata" : total >= 55 ? "medie" : "scazuta" };
}
