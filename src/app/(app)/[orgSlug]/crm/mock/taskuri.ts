import { COMPANII } from "./companii";
import { DONATORI } from "./donatori";
import { daysAgo, int, mulberry32, pick } from "./rand";

export type Task = {
  id: string;
  titlu: string;
  legatDe: { tip: "donator" | "companie"; id: string; nume: string };
  responsabil: string;
  termenLa: string;
  prioritate: "mare" | "medie" | "mica";
  status: "de_facut" | "in_progres" | "finalizat" | "intarziat";
};

const rng = mulberry32(505);
const RESPONSABILI = ["Andreea Vasilescu", "Vlad Placintă", "Ioana Mureșan"];
const TITLURI = [
  "Sună pentru follow-up",
  "Trimite raport de impact",
  "Programează întâlnire",
  "Trimite mulțumire personalizată",
  "Verifică documentele lipsă",
  "Reînnoiește contractul",
  "Trimite propunere de sponsorizare",
];

export const TASKURI: Task[] = Array.from({ length: 22 }, (_, i) => {
  const fromCompany = i % 2 === 0;
  const sursa = fromCompany ? COMPANII[int(rng, 0, COMPANII.length - 1)] : DONATORI[int(rng, 0, DONATORI.length - 1)];
  const offsetZile = int(rng, -6, 14);
  const status: Task["status"] = offsetZile < 0 ? pick(rng, ["intarziat", "finalizat"]) : pick(rng, ["de_facut", "in_progres"]);
  return {
    id: `task-${i + 1}`,
    titlu: pick(rng, TITLURI),
    legatDe: { tip: fromCompany ? "companie" : "donator", id: sursa.id, nume: sursa.nume },
    responsabil: pick(rng, RESPONSABILI),
    termenLa: daysAgo(-offsetZile),
    prioritate: pick(rng, ["mare", "medie", "mica"] as const),
    status,
  };
});
