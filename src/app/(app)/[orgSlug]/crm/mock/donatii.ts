import { BENEFICIARI } from "./beneficiari";
import { COMPANII } from "./companii";
import { DONATORI } from "./donatori";
import { int, mulberry32, pick } from "./rand";

export type Donatie = {
  id: string;
  sursa: "donator" | "companie";
  sursaId: string;
  sursaNume: string;
  suma: number;
  moneda: "RON" | "EUR" | "USD";
  data: string;
  recurenta: boolean;
  campanie: string;
  beneficiarId?: string;
};

const rng = mulberry32(707);
const CAMPANII = ["Copii cu boli rare", "Educație pentru toți", "Urgențe medicale", "Ajutor bătrâni singuri"];

function randomDateInLast(months: number) {
  const now = new Date();
  const past = new Date(now);
  past.setMonth(past.getMonth() - months);
  const t = past.getTime() + rng() * (now.getTime() - past.getTime());
  return new Date(t).toISOString();
}

export const DONATII: Donatie[] = Array.from({ length: 128 }, (_, i) => {
  const fromCompany = i % 4 === 0;
  const sursa = fromCompany ? COMPANII[int(rng, 0, COMPANII.length - 1)] : DONATORI[int(rng, 0, DONATORI.length - 1)];
  const beneficiar = pick(rng, [...BENEFICIARI, undefined, undefined]);
  return {
    id: `dnt-${i + 1}`,
    sursa: (fromCompany ? "companie" : "donator") as "companie" | "donator",
    sursaId: sursa.id,
    sursaNume: sursa.nume,
    suma: fromCompany ? int(rng, 1000, 25000) : int(rng, 50, 3000),
    moneda: pick(rng, ["RON", "RON", "RON", "EUR", "USD"] as const),
    data: randomDateInLast(12),
    recurenta: !fromCompany && rng() > 0.65,
    campanie: pick(rng, CAMPANII),
    beneficiarId: beneficiar?.id,
  };
}).sort((a, b) => +new Date(b.data) - +new Date(a.data));

export function lunarEvolutie() {
  const months: { label: string; pf: number; pj: number; recurent: number; anTrecut: number }[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleDateString("ro-RO", { month: "short" });
    const inMonth = DONATII.filter((x) => {
      const xd = new Date(x.data);
      return xd.getFullYear() === d.getFullYear() && xd.getMonth() === d.getMonth();
    });
    const pf = inMonth.filter((x) => x.sursa === "donator" && !x.recurenta).reduce((s, x) => s + x.suma, 0);
    const recurent = inMonth.filter((x) => x.recurenta).reduce((s, x) => s + x.suma, 0);
    const pj = inMonth.filter((x) => x.sursa === "companie").reduce((s, x) => s + x.suma, 0);
    months.push({ label, pf, pj, recurent, anTrecut: Math.round((pf + pj + recurent) * (0.65 + rng() * 0.25)) });
  }
  return months;
}
