import { METODE, type FrecventaActualizare, type Metoda, type TipTinta } from "@/lib/performanta-masurare";
import type { NivelObiectiv, SursaRezultat, Vizibilitate } from "@/lib/performanta-tipuri";
import { METRICA_PE_ID } from "@/lib/performanta-metrici";

// Validarea datelor trimise din formularul de obiective (pură, deci testabilă). Serverul o rulează la fiecare salvare;
// interfața o rulează doar ca să afișeze erorile mai devreme.

export type RezultatInput = {
  id?: string;
  titlu: string;
  descriere?: string | null;
  metoda: Metoda;
  tipTinta: TipTinta;
  unitate?: string | null;
  nivelInitial?: number | null;
  tinta?: number | null;
  tintaMax?: number | null;
  pondere: number;
  sursa: SursaRezultat;
  kpiDefinitieId?: string | null;
  kpiAngajatId?: string | null;
  metrica?: string | null;
  agregare?: "suma" | "ultima" | "medie" | null;
  frecventaActualizare: FrecventaActualizare;
  termen?: string | null;
  responsabilId?: string | null;
  formula?: string | null;
  reguli?: string | null;
  atribuire?: string | null;
};

export type ObiectivInput = {
  id?: string;
  nivel: NivelObiectiv;
  titlu: string;
  descriere?: string | null;
  responsabilId: string | null;
  departmentId?: string | null;
  parentId?: string | null;
  perioadaStart: string;
  perioadaEnd: string;
  vizibilitate: Vizibilitate;
  colaboratori: string[];
  legaturi: { id: string; tip: "sprijina" | "depinde_de" | "legat" }[];
  rezultate: RezultatInput[];
};

export const MAX_REZULTATE = 10;
const DATA = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NIVELE = ["strategic", "echipa", "individual"];
const VIZIBILITATI = ["organizatie", "echipa", "privat"];
const FRECVENTE = ["zilnic", "saptamanal", "lunar", "trimestrial"];
const SURSE = ["manual", "kpi", "crm"];
const nr = (v: unknown) => typeof v === "number" && Number.isFinite(v);
const dataValida = (s: unknown) => typeof s === "string" && DATA.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`)) && new Date(`${s}T00:00:00Z`).toISOString().slice(0, 10) === s;

export function valideazaRezultat(r: RezultatInput, perioadaStart: string, perioadaEnd: string, eticheta = "Rezultatul-cheie"): string | null {
  if (typeof r.titlu !== "string" || r.titlu.trim().length < 3) return `${eticheta}: scrie un titlu (cel puțin 3 caractere).`;
  if (r.titlu.length > 200) return `${eticheta}: titlul e prea lung (maxim 200 de caractere).`;
  if (!METODE.some((m) => m.id === r.metoda)) return `${eticheta} „${r.titlu}”: alege metoda de măsurare.`;
  if (!["cumulativ", "periodic"].includes(r.tipTinta)) return `${eticheta} „${r.titlu}”: alege tipul țintei.`;
  if (!SURSE.includes(r.sursa)) return `${eticheta} „${r.titlu}”: sursă necunoscută.`;
  if (!FRECVENTE.includes(r.frecventaActualizare)) return `${eticheta} „${r.titlu}”: alege frecvența actualizării.`;
  if (!Number.isInteger(r.pondere) || r.pondere < 1 || r.pondere > 100) return `${eticheta} „${r.titlu}”: ponderea trebuie să fie între 1 și 100.`;
  if (r.metoda === "binar") {
    /* ținta e implicit 1 (realizat) */
  } else if (!nr(r.tinta)) return `${eticheta} „${r.titlu}”: completează ținta.`;
  if (r.metoda === "interval") {
    if (!nr(r.tintaMax)) return `${eticheta} „${r.titlu}”: completează ambele limite ale intervalului.`;
    if ((r.tintaMax as number) < (r.tinta as number)) return `${eticheta} „${r.titlu}”: limita de sus trebuie să fie cel puțin cât cea de jos.`;
  }
  if (r.nivelInitial !== null && r.nivelInitial !== undefined && !nr(r.nivelInitial)) return `${eticheta} „${r.titlu}”: nivelul inițial nu e un număr.`;
  if (r.metoda === "descrescator" && (r.nivelInitial === null || r.nivelInitial === undefined)) {
    /* permis: se evaluează doar atins / neatins, cu avertisment la afișare */
  }
  if (r.termen) {
    if (!dataValida(r.termen)) return `${eticheta} „${r.titlu}”: termen invalid.`;
    if (r.termen < perioadaStart || r.termen > perioadaEnd) return `${eticheta} „${r.titlu}”: termenul trebuie să fie în perioada obiectivului.`;
  }
  if (r.sursa === "kpi" && (!r.kpiDefinitieId || !UUID.test(r.kpiDefinitieId) || !r.kpiAngajatId || !UUID.test(r.kpiAngajatId))) return `${eticheta} „${r.titlu}”: alege KPI-ul și angajatul ale cărui valori se preiau.`;
  if (r.sursa === "crm" && (!r.metrica || !METRICA_PE_ID.has(r.metrica))) return `${eticheta} „${r.titlu}”: alege metrica din CRM.`;
  if (r.agregare && !["suma", "ultima", "medie"].includes(r.agregare)) return `${eticheta} „${r.titlu}”: agregare necunoscută.`;
  return null;
}

export function valideazaObiectiv(o: ObiectivInput): string | null {
  if (typeof o.titlu !== "string" || o.titlu.trim().length < 3) return "Scrie titlul obiectivului (cel puțin 3 caractere).";
  if (o.titlu.length > 200) return "Titlul e prea lung (maxim 200 de caractere).";
  if (!NIVELE.includes(o.nivel)) return "Alege nivelul obiectivului.";
  if (!VIZIBILITATI.includes(o.vizibilitate)) return "Alege vizibilitatea.";
  if (!dataValida(o.perioadaStart) || !dataValida(o.perioadaEnd)) return "Alege perioada obiectivului.";
  if (o.perioadaEnd < o.perioadaStart) return "Sfârșitul perioadei nu poate fi înaintea începutului.";
  if (!o.responsabilId || !UUID.test(o.responsabilId)) return "Alege responsabilul principal (un singur responsabil pe obiectiv).";
  if (o.colaboratori.some((c) => !UUID.test(c)) || new Set(o.colaboratori).size !== o.colaboratori.length) return "Lista de colaboratori e invalidă.";
  if (o.colaboratori.includes(o.responsabilId)) return "Responsabilul principal nu poate fi și colaborator.";
  if (o.legaturi.some((l) => !UUID.test(l.id) || !["sprijina", "depinde_de", "legat"].includes(l.tip)) || new Set(o.legaturi.map((l) => l.id)).size !== o.legaturi.length) return "Legăturile cu alte obiective sunt invalide.";
  if (o.id && (o.legaturi.some((l) => l.id === o.id) || o.parentId === o.id)) return "Un obiectiv nu poate fi legat de el însuși.";
  if (o.rezultate.length > MAX_REZULTATE) return `Un obiectiv are cel mult ${MAX_REZULTATE} rezultate-cheie.`;
  for (const [i, r] of o.rezultate.entries()) {
    const e = valideazaRezultat(r, o.perioadaStart, o.perioadaEnd, `Rezultatul-cheie ${i + 1}`);
    if (e) return e;
  }
  return null;
}

// Evită ciclurile în arborele de aliniere: noul părinte nu poate fi un descendent al obiectivului.
export function creeazaCiclu(obiectivId: string, parentNouId: string | null, parintePe: Map<string, string | null>): boolean {
  let curent = parentNouId;
  const vazute = new Set<string>();
  while (curent) {
    if (curent === obiectivId) return true;
    if (vazute.has(curent)) return true;
    vazute.add(curent);
    curent = parintePe.get(curent) ?? null;
  }
  return false;
}
