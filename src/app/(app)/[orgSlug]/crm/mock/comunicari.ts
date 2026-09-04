import { COMPANII } from "./companii";
import { DONATORI } from "./donatori";
import { daysAgo, int, mulberry32, pick } from "./rand";

export type Comunicare = {
  id: string;
  tip: "email" | "telefon" | "intalnire" | "sms";
  legatDe: { tip: "donator" | "companie"; id: string; nume: string };
  autor: string;
  rezumat: string;
  la: string;
};

const rng = mulberry32(606);
const REZUMATE = [
  "Discuție despre oportunitatea de sponsorizare pentru trimestrul curent.",
  "Trimis raportul de impact pentru ultima campanie susținută.",
  "Confirmare de participare la evenimentul de strângere de fonduri.",
  "Mulțumire pentru donația recentă și actualizare despre beneficiar.",
  "Follow-up după propunerea de parteneriat trimisă săptămâna trecută.",
];

export const COMUNICARI: Comunicare[] = Array.from({ length: 40 }, (_, i) => {
  const fromCompany = i % 3 === 0;
  const sursa = fromCompany ? COMPANII[int(rng, 0, COMPANII.length - 1)] : DONATORI[int(rng, 0, DONATORI.length - 1)];
  return {
    id: `com-${i + 1}`,
    tip: pick(rng, ["email", "telefon", "intalnire", "sms"] as const),
    legatDe: { tip: fromCompany ? "companie" : "donator", id: sursa.id, nume: sursa.nume },
    autor: pick(rng, ["Andreea Vasilescu", "Vlad Placintă", "Ioana Mureșan"]),
    rezumat: pick(rng, REZUMATE),
    la: daysAgo(int(rng, 1, 90)),
  };
});
