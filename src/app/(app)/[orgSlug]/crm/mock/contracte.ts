import { COMPANII } from "./companii";
import { daysAgo, int, mulberry32, pick } from "./rand";

export type Contract = {
  id: string;
  companyId: string;
  companyNume: string;
  tip: "d177" | "mec20";
  status: "draft" | "trimis" | "semnat" | "expirat" | "anulat";
  suma: number;
  generatLa: string;
  expiraLa: string;
};

const rng = mulberry32(909);

export const CONTRACTE: Contract[] = COMPANII.filter((c) => c.status === "won" || c.stage.startsWith("contract")).map(
  (co, i) => ({
    id: `ctr-${i + 1}`,
    companyId: co.id,
    companyNume: co.nume,
    tip: pick(rng, ["d177", "mec20"] as const),
    status: co.stage === "contract_semnat" || co.status === "won" ? "semnat" : co.stage === "contract_anulat" ? "anulat" : "trimis",
    suma: co.sumaSponsorizata || int(rng, 5000, 30000),
    generatLa: daysAgo(int(rng, 10, 120)),
    expiraLa: daysAgo(-int(rng, 5, 60)),
  }),
);
