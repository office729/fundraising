import type { NivelIncarcare } from "@/lib/performanta-masurare";
import type { Prioritate, Recurenta, StatusActivitate, StatusBlocaj, TipAbsenta } from "@/lib/performanta-activitati-reguli";

// Tipuri comune (client + server) pentru activități, blocaje, echipă și capacitate. Datele ajung în browser ca JSON simplu.

export type BlocajDto = {
  id: string;
  activitateId: string | null;
  activitateTitlu: string | null;
  obiectivId: string | null;
  obiectivTitlu: string | null;
  motiv: string;
  rezolvatorId: string | null;
  rezolvatorNume: string | null;
  raportatDeNume: string | null;
  termenRevenire: string;
  necesitaDecizie: boolean;
  status: StatusBlocaj;
  rezolvare: string | null;
  deschisLa: string;
  rezolvatLa: string | null;
  intarziat: boolean;
  poateInchide: boolean;
};

export type ActivitateDto = {
  id: string;
  titlu: string;
  descriere: string | null;
  responsabilId: string | null;
  responsabilNume: string | null;
  obiectivId: string | null;
  obiectivTitlu: string | null;
  rezultatId: string | null;
  rezultatTitlu: string | null;
  prioritate: Prioritate;
  termen: string | null;
  efortOre: number | null;
  status: StatusActivitate;
  aprobareNecesara: boolean;
  aprobata: boolean;
  aprobataDeNume: string | null;
  rezultatAsteptat: string | null;
  criteriuFinalizare: string | null;
  dependeDe: { id: string; titlu: string; status: StatusActivitate } | null;
  recurenta: Recurenta;
  sursa: "manual" | "automatizare";
  finalizatLa: string | null;
  intarziata: boolean;
  blocaj: BlocajDto | null;
  poateEdita: boolean;
  poateAproba: boolean;
};

export type FiltruActivitati = {
  /** Intervalul termenelor (inclusiv). Fără el: toate. */
  start?: string | null;
  end?: string | null;
  /** Include activitățile deschise cu termen înaintea lui `start` (restanțe). */
  restante?: boolean;
  responsabilId?: string | null;
  obiectivId?: string | null;
  prioritate?: Prioritate | null;
  status?: StatusActivitate | "deschise" | "toate" | null;
  q?: string;
  /** Doar fără termen (planificare). */
  faraTermen?: boolean;
};

export type AbsentaDto = { id: string; angajatId: string; tip: TipAbsenta; dataStart: string; dataSfarsit: string; nota: string | null; poateSterge: boolean };

export type SaptamanaCapacitate = {
  luni: string;
  capacitateOre: number;
  incarcareOre: number;
  fara_estimare: number;
  nrActivitati: number;
  zileAbsente: number;
  nivel: NivelIncarcare;
};

export type MembruEchipa = {
  id: string;
  nume: string;
  email: string | null;
  rol: string | null;
  departmentId: string | null;
  departmentNume: string | null;
  managerId: string | null;
  managerNume: string | null;
  status: string;
  normaProcent: number;
  /** Datele de capacitate și muncă se arată doar cui le poate vedea (adminul, managerul, persoana însăși). */
  vedeDetalii: boolean;
  deschise: number;
  blocate: number;
  intarziate: number;
  obiectiveResponsabil: number;
  absente: AbsentaDto[];
  saptamani: SaptamanaCapacitate[];
};
