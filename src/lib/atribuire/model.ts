// Modelele de atribuire. Pentru fiecare conversie păstrăm TREI instantanee, calculate în clipa conversiei și apoi neschimbate:
//   - PRIMA sursă observată pentru acel vizitator (prima sesiune înregistrată);
//   - sursa SESIUNII în care a avut loc conversia (poate fi „Direct” la o revenire);
//   - ULTIMA sursă nedirectă eligibilă: cea mai recentă sesiune cu canal diferit de „Direct”, începută în fereastra de atribuire înainte de conversie.
// O revenire directă nu șterge ultima sursă nedirectă. Un raport folosește UN singur model odată (implicit ultima nedirectă); modelele nu se adună.
// Funcții pure, fără importuri externe.

import type { Clasificare } from "./clasificare";

export type ModelAtribuire = "ultima" | "prima" | "sesiune";
export const MODELE: { cheie: ModelAtribuire; eticheta: string; descriere: string }[] = [
  { cheie: "ultima", eticheta: "Ultima sursă nedirectă", descriere: "Conversia se atribuie ultimei surse care nu e „Direct”, observată în fereastra de atribuire înainte de conversie." },
  { cheie: "prima", eticheta: "Prima sursă observată", descriere: "Conversia se atribuie primei surse observate pentru vizitatorul respectiv." },
  { cheie: "sesiune", eticheta: "Sursa sesiunii conversiei", descriere: "Conversia se atribuie sursei sesiunii în care s-a făcut donația sau formularul." },
];
export const esteModel = (x: unknown): x is ModelAtribuire => x === "ultima" || x === "prima" || x === "sesiune";

export type SesiuneObservata = { sesiuneId: string; la: Date; clasificare: Clasificare };
export type AtingereAtribuita = Clasificare & { la: Date | null };
export type RezultatAtribuire = {
  prima: AtingereAtribuita | null;
  sesiune: AtingereAtribuita | null;
  ultima: AtingereAtribuita | null;
};

const ZI_MS = 86_400_000;
const eNedirecta = (c: Clasificare) => c.canal !== "direct";

export function alegeAtribuire(sesiuni: SesiuneObservata[], sesiuneConversie: string | null, conversieLa: Date, fereastraZile: number): RezultatAtribuire {
  const pana = conversieLa.getTime();
  // Sesiunile de după conversie (ceas greșit, retrimiteri) nu intră niciodată în atribuire.
  const eligibile = sesiuni.filter((s) => s.la.getTime() <= pana + 5 * 60_000).sort((a, b) => a.la.getTime() - b.la.getTime());
  const ca = (s: SesiuneObservata | undefined): AtingereAtribuita | null => (s ? { ...s.clasificare, la: s.la } : null);

  const prima = ca(eligibile[0]);
  const sesiune = ca((sesiuneConversie ? eligibile.find((s) => s.sesiuneId === sesiuneConversie) : undefined) ?? eligibile[eligibile.length - 1]);
  const incepe = pana - fereastraZile * ZI_MS;
  let ultima: SesiuneObservata | undefined;
  for (let i = eligibile.length - 1; i >= 0; i--) {
    const s = eligibile[i]!;
    if (s.la.getTime() < incepe) break;
    if (eNedirecta(s.clasificare)) {
      ultima = s;
      break;
    }
  }
  return { prima, sesiune, ultima: ca(ultima) };
}

// Atribuire fără istoric (fără acord sau prima vizită): singura atingere cunoscută e cea din adresa curentă.
export function atribuireDintrOAtingere(c: Clasificare, la: Date): RezultatAtribuire {
  const t: AtingereAtribuita = { ...c, la };
  return { prima: t, sesiune: t, ultima: c.canal !== "direct" ? t : null };
}

// Atingerea de raportat pentru modelul ales. Când modelul „ultima” nu găsește o sursă nedirectă, conversia rămâne „Direct” (sesiunea ei).
export function atingerePentruModel(r: RezultatAtribuire, model: ModelAtribuire): AtingereAtribuita | null {
  if (model === "prima") return r.prima;
  if (model === "sesiune") return r.sesiune;
  return r.ultima ?? r.sesiune;
}

// Rata = numărător / numitor (procent). Fără numitor nu există rată: se afișează „—”, nu 0%.
export function rata(numarator: number, numitor: number): number | null {
  return numitor > 0 ? (numarator / numitor) * 100 : null;
}
