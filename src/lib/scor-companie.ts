// Scorul „SOI” al unei firme: cât de potrivită este de abordat pentru sponsorizare.
// Suma componentelor (max 100): capacitate D177 + 20% (35), mărime și profitabilitate (20),
// relație / oportunitate (15), contact / decident (15), momentul potrivit (15).
// Formulele urmăresc logica din CRM PJ, adaptată la datele reale din baza de date.

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
};

export type ScorCheie = "capacitate" | "marime" | "relatie" | "contact" | "moment";
export type ScorLinie = { cheie: ScorCheie; puncte: number; max: number; detaliu: string };
export type Prioritate = "ridicata" | "medie" | "scazuta";

const fmt = (n: number) => n.toLocaleString("ro-RO");
const PIPELINE_INAINTE_DE_ABORDARE = new Set(["nou", "pe_viitor"]);

// Perioade fiscale favorabile: octombrie–decembrie (bugete și sponsorizări de sfârșit de an)
// și aprilie–iunie (D177 depusă până pe 25 iunie).
function perioadaFiscala(luna: number) {
  return luna >= 10 || (luna >= 4 && luna <= 6);
}

export function calculeazaScor(i: ScorInput): { total: number; linii: ScorLinie[]; prioritate: Prioritate } {
  // 1. Capacitate D177 + 20% (max 35): liniar până la 500.000 lei disponibili.
  const disp = i.sumaDisponibila ?? 0;
  const capacitate: ScorLinie = {
    cheie: "capacitate",
    puncte: Math.min(35, Math.round(disp / 14286)),
    max: 35,
    detaliu: i.sumaDisponibila != null ? `~${fmt(disp)} lei disponibili` : "fără date",
  };

  // 2. Mărime și profitabilitate (max 20)
  const partiMarime: string[] = [];
  let marime = 0;
  if (i.profit != null && i.profit > 0) {
    marime += 10;
    partiMarime.push("profit pozitiv");
  } else if (i.profit != null) {
    partiMarime.push("profit negativ");
  }
  const ca = i.ca ?? 0;
  if (ca >= 10_000_000) {
    marime += 10;
    partiMarime.push("CA foarte mare");
  } else if (ca >= 1_000_000) {
    marime += 7;
    partiMarime.push("CA mare");
  } else if (ca >= 100_000) {
    marime += 4;
    partiMarime.push("CA medie");
  }
  if (i.nrAngajati) partiMarime.push(`${fmt(i.nrAngajati)} angajați`);
  const linieMarime: ScorLinie = { cheie: "marime", puncte: Math.min(20, marime), max: 20, detaliu: partiMarime.join(", ") || "fără date" };

  // 3. Relație / oportunitate (max 15)
  let relatie = 0;
  let detRelatie = "fără relație";
  if (i.recurent) {
    relatie = 15;
    detRelatie = "sponsor recurent (relație caldă)";
  } else if (i.temperatura === "cald") {
    relatie = 12;
    detRelatie = "relație caldă";
  } else if ((i.sumaSponsorizata ?? 0) > 0) {
    relatie = 8;
    detRelatie = "a mai sponsorizat";
  } else if (i.temperatura === "rece") {
    relatie = 2;
    detRelatie = "relație rece";
  }
  const linieRelatie: ScorLinie = { cheie: "relatie", puncte: relatie, max: 15, detaliu: detRelatie };

  // 4. Are contact / decident (max 15)
  const n = i.contacte.length;
  const decident = i.contacte.some((c) => c.cheie || c.dept === "Conducere" || c.dept === "Financiar");
  const linieContact: ScorLinie = {
    cheie: "contact",
    puncte: n === 0 ? 0 : decident ? 15 : 9,
    max: 15,
    detaliu: n === 0 ? "niciun contact salvat" : `${n} contact${n === 1 ? "" : "e"} salvat${n === 1 ? "" : "e"}`,
  };

  // 5. Momentul potrivit (max 15): pipeline activ (5) + perioadă fiscală favorabilă (10)
  const luna = i.luna ?? new Date().getMonth() + 1;
  const partiMoment: string[] = [];
  let moment = 0;
  if (!PIPELINE_INAINTE_DE_ABORDARE.has(i.stage)) {
    moment += 5;
    partiMoment.push("în pipeline activ");
  }
  if (perioadaFiscala(luna)) {
    moment += 10;
    partiMoment.push("perioadă fiscală favorabilă");
  }
  const linieMoment: ScorLinie = { cheie: "moment", puncte: moment, max: 15, detaliu: partiMoment.join(", ") || "în afara perioadei fiscale" };

  const linii = [capacitate, linieMarime, linieRelatie, linieContact, linieMoment];
  const total = Math.min(100, linii.reduce((s, l) => s + l.puncte, 0));
  return { total, linii, prioritate: total >= 80 ? "ridicata" : total >= 55 ? "medie" : "scazuta" };
}
