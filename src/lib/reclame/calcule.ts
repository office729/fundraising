// Indicatorii din „Performanța reclamelor”. Toate sumele sunt în bani (unități minore), ca să nu apară erori de rotunjire; formatarea e separată.
// Funcții pure, fără importuri. Definițiile sunt cele afișate în dashboard („Cum se calculează”).

export type Totaluri = {
  cheltuieliBani: number;
  donatii: number; // donații confirmate atribuite
  brutBani: number;
  rambursatBani: number;
  donatoriNoi: number;
  donatoriExistenti: number;
  donatoriNeclasificati: number; // fără e-mail sau fără istoric verificabil
};

export type Indicatori = {
  netBani: number;
  costPerDonatieBani: number | null;
  costPerDonatorNouBani: number | null;
  roasBrut: number | null;
  roasNet: number | null;
  ramasBani: number;
  mediaDonatieBani: number | null;
};

const imparte = (a: number, b: number): number | null => (b > 0 ? a / b : null);

export function calculeazaIndicatori(t: Totaluri): Indicatori {
  const netBani = t.brutBani - t.rambursatBani;
  return {
    netBani,
    costPerDonatieBani: t.donatii > 0 ? Math.round(t.cheltuieliBani / t.donatii) : null,
    costPerDonatorNouBani: t.donatoriNoi > 0 ? Math.round(t.cheltuieliBani / t.donatoriNoi) : null,
    roasBrut: imparte(t.brutBani, t.cheltuieliBani),
    roasNet: imparte(netBani, t.cheltuieliBani),
    ramasBani: netBani - t.cheltuieliBani,
    mediaDonatieBani: t.donatii > 0 ? Math.round(t.brutBani / t.donatii) : null,
  };
}

export const totaluriGoale = (): Totaluri => ({ cheltuieliBani: 0, donatii: 0, brutBani: 0, rambursatBani: 0, donatoriNoi: 0, donatoriExistenti: 0, donatoriNeclasificati: 0 });

export function adunaTotaluri(a: Totaluri, b: Totaluri): Totaluri {
  return {
    cheltuieliBani: a.cheltuieliBani + b.cheltuieliBani,
    donatii: a.donatii + b.donatii,
    brutBani: a.brutBani + b.brutBani,
    rambursatBani: a.rambursatBani + b.rambursatBani,
    donatoriNoi: a.donatoriNoi + b.donatoriNoi,
    donatoriExistenti: a.donatoriExistenti + b.donatoriExistenti,
    donatoriNeclasificati: a.donatoriNeclasificati + b.donatoriNeclasificati,
  };
}

// Variația față de perioada anterioară; null când nu există bază de comparație (lipsă sau zero).
export function variatie(curent: number | null, anterior: number | null): { procent: number; sens: "sus" | "jos" | "egal" } | null {
  if (curent === null || anterior === null || anterior === 0) return null;
  const procent = Math.round(((curent - anterior) / Math.abs(anterior)) * 1000) / 10;
  return { procent, sens: procent > 0 ? "sus" : procent < 0 ? "jos" : "egal" };
}

const MS_ZI = 86_400_000;
const dinIso = (iso: string) => Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)));
const laIso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const esteIso = (x: unknown): x is string => typeof x === "string" && /^\d{4}-\d{2}-\d{2}$/.test(x) && laIso(dinIso(x)) === x;

export const adaugaZile = (iso: string, n: number): string => laIso(dinIso(iso) + n * MS_ZI);
export const numarZile = (de: string, pana: string): number => Math.round((dinIso(pana) - dinIso(de)) / MS_ZI) + 1;

// Perioada anterioară de aceeași lungime, imediat înainte de cea curentă.
export function perioadaAnterioara(de: string, pana: string): { de: string; pana: string } {
  const n = numarZile(de, pana);
  return { de: adaugaZile(de, -n), pana: adaugaZile(de, -1) };
}

export type PresetPerioada = "azi" | "ieri" | "7z" | "30z" | "personalizat";
export const PRESETURI: { cheie: PresetPerioada; eticheta: string }[] = [
  { cheie: "azi", eticheta: "Azi" },
  { cheie: "ieri", eticheta: "Ieri" },
  { cheie: "7z", eticheta: "Ultimele 7 zile" },
  { cheie: "30z", eticheta: "Ultimele 30 de zile" },
  { cheie: "personalizat", eticheta: "Interval personalizat" },
];

// `azi` e ziua curentă în ora României (YYYY-MM-DD). Intervalul personalizat vine din parametri; dacă nu e valid, revine la ultimele 30 de zile.
export function rezolvaPerioada(preset: string | undefined, azi: string, deParam?: string, panaParam?: string): { preset: PresetPerioada; de: string; pana: string } {
  if (preset === "azi") return { preset: "azi", de: azi, pana: azi };
  if (preset === "ieri") return { preset: "ieri", de: adaugaZile(azi, -1), pana: adaugaZile(azi, -1) };
  if (preset === "7z") return { preset: "7z", de: adaugaZile(azi, -6), pana: azi };
  if (preset === "personalizat" && esteIso(deParam) && esteIso(panaParam) && deParam <= panaParam && numarZile(deParam, panaParam) <= 366) {
    return { preset: "personalizat", de: deParam, pana: panaParam };
  }
  return { preset: "30z", de: adaugaZile(azi, -29), pana: azi };
}

// Formatare ro-RO: 12.450,50 lei, 4,70×.
const nf = (zecimale: number) => new Intl.NumberFormat("ro-RO", { minimumFractionDigits: zecimale, maximumFractionDigits: zecimale });
export const formatLei = (bani: number | null, zecimale = 2): string => (bani === null ? "—" : `${nf(zecimale).format(bani / 100)} lei`);
export const formatRoas = (x: number | null): string => (x === null ? "—" : `${nf(2).format(x)}×`);
export const formatNumar = (n: number | null): string => (n === null ? "—" : nf(0).format(n));
export const formatProcent = (x: number | null): string => (x === null ? "—" : `${nf(1).format(x)}%`);

// O propoziție generată din date, fără interpretări: spune ce s-a întâmplat și unde datele sunt incomplete.
export function propozitieRezumat(t: Totaluri, ind: Indicatori, cuDateIncomplete: boolean): string {
  if (t.cheltuieliBani === 0 && t.donatii === 0) return "Nu există încă cheltuieli importate sau donații atribuite reclamelor în perioada aleasă.";
  if (t.cheltuieliBani === 0) return "Sunt donații atribuite reclamelor, dar nu există cheltuieli importate pentru perioadă, deci eficiența nu poate fi calculată.";
  const baza = ind.roasNet === null ? "" : `În perioada aleasă, la fiecare 1 leu cheltuit au fost atribuiți ${new Intl.NumberFormat("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(ind.roasNet)} lei din donații nete confirmate.`;
  const limita = cuDateIncomplete ? " Datele sunt incomplete (vezi „Calitatea datelor”), deci cifra e orientativă." : "";
  return `${baza}${limita}`.trim();
}

// Rata de finalizare a unui pas din parcurs; null când numitorul e zero.
export const rata = (parte: number, total: number): number | null => (total > 0 ? Math.round((parte / total) * 1000) / 10 : null);

// Recomandare doar cu eșantion suficient: sub prag nu se trage nicio concluzie.
export const PRAG_MINIM_DONATII = 10;
export const esteEsantionSuficient = (donatii: number, prag = PRAG_MINIM_DONATII): boolean => donatii >= prag;
