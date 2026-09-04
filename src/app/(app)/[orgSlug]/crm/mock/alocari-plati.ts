import { BENEFICIARI } from "./beneficiari";
import { CONTRACTE } from "./contracte";
import { daysAgo, int, mulberry32, pick } from "./rand";

export type AlocarePlata = {
  id: string;
  beneficiarId: string;
  beneficiarNume: string;
  contractId?: string;
  incasat: number;
  alocat: number;
  achitat: number;
  status: "incasat" | "alocat" | "achitat" | "in_asteptare";
  moneda: "RON" | "EUR" | "USD";
  la: string;
  documentJustificativ?: string;
};

const rng = mulberry32(1010);

export const ALOCARI_PLATI: AlocarePlata[] = BENEFICIARI.flatMap((b, bi) =>
  Array.from({ length: int(rng, 2, 4) }, (_, i) => {
    const incasat = int(rng, 2000, 20000);
    const alocat = Math.round(incasat * 0.85);
    const achitat = Math.round(alocat * (int(rng, 40, 100) / 100));
    return {
      id: `pl-${bi}-${i}`,
      beneficiarId: b.id,
      beneficiarNume: b.nume,
      contractId: pick(rng, [...CONTRACTE.map((c) => c.id), undefined]),
      incasat,
      alocat,
      achitat,
      status: achitat >= alocat ? "achitat" : achitat > 0 ? "alocat" : "in_asteptare",
      moneda: pick(rng, ["RON", "RON", "EUR"] as const),
      la: daysAgo(int(rng, 1, 150)),
      documentJustificativ: pick(rng, ["Factură-2451.pdf", "Chitanță-889.pdf", undefined]),
    };
  }),
);
