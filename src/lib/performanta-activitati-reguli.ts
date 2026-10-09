// Echipă & Performanță — regulile activităților, blocajelor și absențelor, fără acces la baza de date (importabile și din browser, și în teste).
// O activitate NU e un rezultat-cheie: spune ce facem, nu cât am obținut. Legătura cu obiectivul e doar pentru context.

export type StatusActivitate = "de_facut" | "in_lucru" | "in_asteptare" | "blocat" | "finalizat" | "anulat";
export type Prioritate = "critica" | "mare" | "medie" | "scazuta";
export type Recurenta = "nu" | "saptamanal" | "lunar";
export type StatusBlocaj = "deschis" | "rezolvat" | "anulat";
export type TipAbsenta = "concediu" | "medical" | "altele";

export const ETICHETE_STATUS_ACT: Record<StatusActivitate, string> = {
  de_facut: "De făcut",
  in_lucru: "În lucru",
  in_asteptare: "În așteptare",
  blocat: "Blocată",
  finalizat: "Finalizată",
  anulat: "Anulată",
};
export const STATUSURI_DESCHISE: StatusActivitate[] = ["de_facut", "in_lucru", "in_asteptare", "blocat"];
export const ETICHETE_PRIORITATE: Record<Prioritate, string> = { critica: "Critică", mare: "Mare", medie: "Medie", scazuta: "Scăzută" };
export const ORDINE_PRIORITATE: Record<Prioritate, number> = { critica: 0, mare: 1, medie: 2, scazuta: 3 };
export const ETICHETE_RECURENTA: Record<Recurenta, string> = { nu: "Nu se repetă", saptamanal: "Săptămânal", lunar: "Lunar" };
export const ETICHETE_ABSENTA: Record<TipAbsenta, string> = { concediu: "Concediu", medical: "Concediu medical", altele: "Altă absență" };

export type ActivitateInput = {
  id?: string;
  titlu: string;
  descriere?: string | null;
  responsabilId: string | null;
  obiectivId?: string | null;
  rezultatId?: string | null;
  prioritate: Prioritate;
  termen?: string | null;
  efortOre?: number | null;
  aprobareNecesara: boolean;
  rezultatAsteptat?: string | null;
  criteriuFinalizare?: string | null;
  dependeDe?: string | null;
  recurenta: Recurenta;
};

export type BlocajInput = {
  activitateId?: string | null;
  obiectivId?: string | null;
  motiv: string;
  responsabilRezolvareId: string | null;
  termenRevenire: string;
  necesitaDecizie: boolean;
};

export type AbsentaInput = { angajatId: string; tip: TipAbsenta; dataStart: string; dataSfarsit: string; nota?: string | null };

const DATA = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const dataValida = (s: unknown): s is string => typeof s === "string" && DATA.test(s) && new Date(`${s}T00:00:00Z`).toISOString().slice(0, 10) === s;
export const uuidValid = (s: unknown): s is string => typeof s === "string" && UUID.test(s);

export function valideazaActivitate(a: ActivitateInput): string | null {
  if (typeof a.titlu !== "string" || a.titlu.trim().length < 3) return "Scrie titlul activității (cel puțin 3 caractere).";
  if (a.titlu.length > 200) return "Titlul e prea lung (maxim 200 de caractere).";
  if (!uuidValid(a.responsabilId)) return "Alege cine se ocupă de activitate.";
  if (!["critica", "mare", "medie", "scazuta"].includes(a.prioritate)) return "Alege prioritatea.";
  if (!["nu", "saptamanal", "lunar"].includes(a.recurenta)) return "Recurență necunoscută.";
  if (a.termen && !dataValida(a.termen)) return "Termen invalid.";
  if (a.recurenta !== "nu" && !a.termen) return "O activitate recurentă are nevoie de un termen, ca să știm când se repetă.";
  if (a.efortOre !== null && a.efortOre !== undefined && (typeof a.efortOre !== "number" || !Number.isFinite(a.efortOre) || a.efortOre < 0 || a.efortOre > 200)) return "Efortul estimat trebuie să fie între 0 și 200 de ore.";
  if (a.obiectivId && !uuidValid(a.obiectivId)) return "Obiectiv invalid.";
  if (a.rezultatId && !a.obiectivId) return "Rezultatul-cheie se alege dintr-un obiectiv: alege întâi obiectivul.";
  if (a.rezultatId && !uuidValid(a.rezultatId)) return "Rezultat-cheie invalid.";
  if (a.dependeDe) {
    if (!uuidValid(a.dependeDe)) return "Dependență invalidă.";
    if (a.id && a.dependeDe === a.id) return "O activitate nu poate depinde de ea însăși.";
  }
  if ((a.rezultatAsteptat ?? "").length > 1000 || (a.criteriuFinalizare ?? "").length > 1000 || (a.descriere ?? "").length > 4000) return "Un text e prea lung.";
  return null;
}

export type DateTranzitie = {
  de: StatusActivitate;
  la: StatusActivitate;
  aprobareNecesara: boolean;
  aprobata: boolean;
  dependenta: { titlu: string; status: string } | null;
  blocajDeschis: boolean;
};

// Schimbarea stării unei activități: ce e permis și de ce nu. „Blocată” se obține doar raportând un blocaj (cu motiv, responsabil și termen),
// iar din „blocată” se iese doar rezolvând blocajul, ca să nu rămână blocaje deschise pe activități aparent libere.
export function valideazaTranzitie(t: DateTranzitie): string | null {
  if (t.de === t.la) return null;
  if (t.la === "blocat") return "O activitate devine blocată raportând un blocaj: spune motivul, cine îl rezolvă și când revii.";
  if (t.de === "blocat" && t.la !== "anulat") return "Activitatea e blocată. Rezolvă sau anulează blocajul și starea se schimbă singură.";
  if ((t.la === "in_lucru" || t.la === "finalizat") && t.dependenta && t.dependenta.status !== "finalizat") {
    return `Depinde de „${t.dependenta.titlu}”, care nu e finalizată încă.`;
  }
  if (t.la === "finalizat") {
    if (t.aprobareNecesara && !t.aprobata) return "Activitatea cere aprobare: după ce e aprobată o poți finaliza.";
    if (t.blocajDeschis) return "Are un blocaj deschis. Rezolvă-l întâi.";
  }
  return null;
}

const adauga = (iso: string, zile: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + zile);
  return d.toISOString().slice(0, 10);
};

// Data următoarei ocurențe. Lunar: aceeași zi a lunii următoare, sau ultima zi a lunii dacă aceea nu există (31 ian → 28/29 feb).
export function urmatoareaOcurenta(termen: string, recurenta: "saptamanal" | "lunar"): string {
  if (recurenta === "saptamanal") return adauga(termen, 7);
  const an = Number(termen.slice(0, 4));
  const luna = Number(termen.slice(5, 7)) - 1;
  const zi = Number(termen.slice(8, 10));
  const ultima = new Date(Date.UTC(an, luna + 2, 0)).getUTCDate();
  return new Date(Date.UTC(an, luna + 1, Math.min(zi, ultima))).toISOString().slice(0, 10);
}

export const esteIntarziata = (a: { termen: string | null; status: string }, azi: string) => Boolean(a.termen && a.termen < azi && STATUSURI_DESCHISE.includes(a.status as StatusActivitate));

export function valideazaBlocaj(b: BlocajInput, azi: string): string | null {
  if (typeof b.motiv !== "string" || b.motiv.trim().length < 5) return "Descrie blocajul (cel puțin 5 caractere).";
  if (b.motiv.length > 1000) return "Motivul e prea lung (maxim 1000 de caractere).";
  if (!uuidValid(b.responsabilRezolvareId)) return "Alege cine poate rezolva blocajul.";
  if (!dataValida(b.termenRevenire)) return "Alege data la care revii asupra blocajului.";
  if (b.termenRevenire < azi) return "Data de revenire nu poate fi în trecut.";
  if (!b.activitateId && !b.obiectivId) return "Blocajul trebuie legat de o activitate sau de un obiectiv.";
  if (b.activitateId && !uuidValid(b.activitateId)) return "Activitate invalidă.";
  if (b.obiectivId && !uuidValid(b.obiectivId)) return "Obiectiv invalid.";
  return null;
}

export function valideazaAbsenta(a: AbsentaInput): string | null {
  if (!uuidValid(a.angajatId)) return "Alege angajatul.";
  if (!["concediu", "medical", "altele"].includes(a.tip)) return "Alege tipul absenței.";
  if (!dataValida(a.dataStart) || !dataValida(a.dataSfarsit)) return "Alege perioada absenței.";
  if (a.dataSfarsit < a.dataStart) return "Sfârșitul absenței nu poate fi înaintea începutului.";
  if (Math.round((Date.parse(a.dataSfarsit) - Date.parse(a.dataStart)) / 86400000) > 366) return "O absență nu poate depăși un an.";
  if ((a.nota ?? "").length > 300) return "Nota e prea lungă (maxim 300 de caractere).";
  return null;
}

// Dependențele nu pot forma cicluri: noua dependență nu poate fi un descendent al activității.
export function dependentaCiclica(activitateId: string, dependeDeNou: string | null, dependePe: Map<string, string | null>): boolean {
  let c = dependeDeNou;
  const vazute = new Set<string>();
  while (c) {
    if (c === activitateId || vazute.has(c)) return true;
    vazute.add(c);
    c = dependePe.get(c) ?? null;
  }
  return false;
}
