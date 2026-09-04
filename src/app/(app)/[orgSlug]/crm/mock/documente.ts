import { COMPANII } from "./companii";
import { daysAgo, int, mulberry32, pick } from "./rand";

export type Document = {
  id: string;
  nume: string;
  tip: "contract" | "factura" | "raport" | "altul";
  legatDe: { tip: "companie"; id: string; nume: string };
  incarcatLa: string;
};

const rng = mulberry32(808);

export const DOCUMENTE: Document[] = Array.from({ length: 16 }, (_, i) => {
  const co = COMPANII[i % COMPANII.length];
  const tip = pick(rng, ["contract", "factura", "raport", "altul"] as const);
  const NUME: Record<Document["tip"], string> = {
    contract: "Contract sponsorizare 20%.pdf",
    factura: "Factură donație.pdf",
    raport: "Raport de impact.pdf",
    altul: "Document justificativ.pdf",
  };
  return {
    id: `doc-${i + 1}`,
    nume: NUME[tip],
    tip,
    legatDe: { tip: "companie", id: co.id, nume: co.nume },
    incarcatLa: daysAgo(int(rng, 1, 200)),
  };
});
