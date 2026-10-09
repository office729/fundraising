import type { Actualitate, FrecventaActualizare, Incredere, Metoda, StareRitm, TipTinta } from "@/lib/performanta-masurare";

// Tipuri comune (client + server) pentru Echipă & Performanță. Datele ajung în browser ca JSON simplu (date = text ISO).

export type NivelObiectiv = "strategic" | "echipa" | "individual";
export type StatusObiectiv = "activ" | "finalizat" | "anulat";
export type Vizibilitate = "organizatie" | "echipa" | "privat";
export type SursaRezultat = "manual" | "kpi" | "crm";

export const ETICHETE_NIVEL: Record<NivelObiectiv, string> = { strategic: "Strategic", echipa: "De echipă", individual: "Individual" };
export const ETICHETE_VIZIBILITATE: Record<Vizibilitate, string> = { organizatie: "Toată organizația", echipa: "Echipa departamentului", privat: "Doar cei implicați" };
export const ETICHETE_FRECVENTA: Record<FrecventaActualizare, string> = { zilnic: "Zilnic", saptamanal: "Săptămânal", lunar: "Lunar", trimestrial: "Trimestrial" };

export type AngajatMic = { id: string; nume: string; departmentId: string | null; managerId: string | null; activ: boolean };
export type DepartamentMic = { id: string; nume: string };

export type RezultatDto = {
  id: string;
  obiectivId: string;
  titlu: string;
  descriere: string | null;
  metoda: Metoda;
  tipTinta: TipTinta;
  unitate: string | null;
  nivelInitial: number | null;
  tinta: number | null;
  tintaMax: number | null;
  valoare: number | null;
  pondere: number;
  sursa: SursaRezultat;
  sursaEticheta: string | null; // „KPI: …” sau metrica CRM
  kpiDefinitieId: string | null;
  kpiAngajatId: string | null;
  sursaConfig: Record<string, unknown> | null;
  frecventaActualizare: FrecventaActualizare;
  ultimaActualizare: string | null;
  incredere: Incredere | null;
  termen: string | null;
  responsabilId: string | null;
  responsabilNume: string | null;
  formula: string | null;
  reguli: string | null;
  atribuire: string | null;
  status: "activ" | "anulat";
  progres: number | null;
  avertisment: string | null;
  peste: boolean;
  stare: StareRitm;
  actualitate: Actualitate;
  ordine: number;
  poateActualiza: boolean;
};

export type ObiectivDto = {
  id: string;
  parentId: string | null;
  nivel: NivelObiectiv;
  titlu: string;
  descriere: string | null;
  responsabilId: string | null;
  responsabilNume: string | null;
  departmentId: string | null;
  departmentNume: string | null;
  perioadaStart: string;
  perioadaEnd: string;
  status: StatusObiectiv;
  motivAnulare: string | null;
  vizibilitate: Vizibilitate;
  colaboratori: AngajatMic[];
  rezultate: RezultatDto[];
  progres: number | null;
  rkCuDate: number;
  rkTotal: number;
  stare: StareRitm;
  actualitate: Actualitate;
  nrActivitati: number;
  nrActivitatiFinalizate: number;
  blocajeDeschise: number;
  legaturi: { id: string; titlu: string; tip: string }[];
  poateEdita: boolean;
  creatDe: string | null;
  ultimaActualizare: string | null;
};

export type OptiuniPerformanta = {
  angajati: AngajatMic[];
  departamente: DepartamentMic[];
  kpiuri: { id: string; nume: string; unitate: string | null; directie: string; frecventa: string }[];
  euAngajatId: string | null;
  admin: boolean;
};

export type IstoricRezultat = {
  id: string;
  tip: "valoare" | "tinta" | "responsabil" | "incredere" | "nota";
  valoare: number | null;
  valoareAnterioara: number | null;
  tinta: number | null;
  comentariu: string | null;
  dovadaUrl: string | null;
  incredere: Incredere | null;
  detalii: Record<string, unknown> | null;
  autor: string | null;
  la: string;
};
