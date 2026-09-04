import { daysAgo, int, mulberry32, pick } from "./rand";

export type SegmentDonator =
  | "nou"
  | "fidel"
  | "major"
  | "recurent"
  | "in_risc"
  | "inactiv"
  | "reactivat";

export type Donator = {
  id: string;
  nume: string;
  email: string;
  telefon: string;
  localitate: string;
  tip: "unic" | "recurent";
  status: "activ" | "inactiv" | "nou";
  segment: SegmentDonator;
  scorImplicare: number;
  rfm: { r: number; f: number; m: number };
  totalDonat: number;
  moneda: "RON" | "EUR" | "USD";
  ultimaDonatieLa: string;
  responsabil: string;
  campaniiPreferate: string[];
  consimtamant: "da" | "nu" | "necunoscut";
};

const NUME = [
  "Maria Popescu", "Andrei Ionescu", "Elena Dumitrescu", "Ion Constantinescu", "Ana Georgescu",
  "Mihai Stan", "Cristina Radu", "Alexandru Marin", "Ioana Vasile", "Gabriel Munteanu",
];
const LOCALITATI = ["București", "Cluj-Napoca", "Iași", "Timișoara", "Constanța", "Brașov", "Craiova", "Sibiu"];
const RESPONSABILI = ["Andreea Vasilescu", "Vlad Placintă", "Ioana Mureșan"];
const CAMPANII = ["Copii cu boli rare", "Educație pentru toți", "Urgențe medicale", "Ajutor bătrâni singuri"];
const SEGMENT: SegmentDonator[] = ["nou", "fidel", "major", "recurent", "in_risc", "inactiv", "reactivat"];

const rng = mulberry32(42);

export const DONATORI: Donator[] = NUME.map((nume, i) => {
  const segment = SEGMENT[i % SEGMENT.length];
  const totalDonat =
    segment === "major" ? int(rng, 8000, 45000) : segment === "fidel" ? int(rng, 2000, 8000) : int(rng, 100, 2500);
  const scorImplicare =
    segment === "inactiv" ? int(rng, 5, 25) : segment === "in_risc" ? int(rng, 25, 45) : int(rng, 50, 98);
  return {
    id: `don-${i + 1}`,
    nume,
    email: nume.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, ".") + "@exemplu.ro",
    telefon: `07${int(rng, 10, 99)} ${int(rng, 100, 999)} ${int(rng, 100, 999)}`,
    localitate: pick(rng, LOCALITATI),
    tip: segment === "recurent" || segment === "fidel" ? "recurent" : "unic",
    status: segment === "inactiv" ? "inactiv" : segment === "nou" ? "nou" : "activ",
    segment,
    scorImplicare,
    rfm: {
      r: segment === "inactiv" ? int(rng, 1, 2) : int(rng, 3, 5),
      f: segment === "fidel" || segment === "recurent" ? int(rng, 4, 5) : int(rng, 1, 3),
      m: segment === "major" ? 5 : int(rng, 2, 4),
    },
    totalDonat,
    moneda: pick(rng, ["RON", "RON", "RON", "EUR", "USD"] as const),
    ultimaDonatieLa: daysAgo(segment === "inactiv" ? int(rng, 200, 400) : int(rng, 1, 60)),
    responsabil: pick(rng, RESPONSABILI),
    campaniiPreferate: [pick(rng, CAMPANII), pick(rng, CAMPANII)].filter((v, i2, a) => a.indexOf(v) === i2),
    consimtamant: pick(rng, ["da", "da", "da", "necunoscut", "nu"] as const),
  };
});

export function donatorById(id: string) {
  return DONATORI.find((d) => d.id === id);
}
