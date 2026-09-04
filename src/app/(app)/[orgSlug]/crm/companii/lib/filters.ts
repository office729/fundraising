// Tipuri + logică pură pentru sistemul de filtre al modulului CRM Companii —
// fără DB, fără "use client"/"use server", ca să fie folosită identic din
// Server Components (queries.ts) și din bara de filtre (client).

export { JUDETE } from "@/lib/judete";

export type PerioadaTip = "toate" | "q1" | "q2" | "q3" | "q4" | "an" | "luna" | "saptamana" | "interval";
export const PERIOADA_LABEL: Record<PerioadaTip, string> = {
  toate: "Toate", q1: "Q1", q2: "Q2", q3: "Q3", q4: "Q4",
  an: "Anul", luna: "Luna", saptamana: "Săptămâna", interval: "Interval",
};

export type FiltruCompanii = {
  perioadaTip: PerioadaTip;
  an: number;
  luna: string; // "YYYY-MM", folosit doar când perioadaTip === "luna"
  saptamana: string; // "YYYY-Www", folosit doar când perioadaTip === "saptamana"
  dataStart: string; // "YYYY-MM-DD", folosit doar când perioadaTip === "interval"
  dataSfarsit: string;
  responsabil: string; // "toti" sau id (uuid) de app_user
  judet: string; // "toate" sau un județ din JUDETE
  contact: "toate" | "cu" | "fara";
  marcaje: string[]; // subset din ["d177", "decembrie", "caz"]
  vezi: "toata" | "lucrate";
  q: string;
  pagina: number;
  // "Top 2000" — sortare după sumă sponsorizată desc, paginare limitată la
  // primele 2000 de rezultate (80 de pagini a 25).
  top: boolean;
};

export const TOP_LIMIT = 2000;

const MARCAJE_VALIDE = new Set(["d177", "decembrie", "caz"]);
const PERIOADA_VALIDA = new Set<PerioadaTip>(["toate", "q1", "q2", "q3", "q4", "an", "luna", "saptamana", "interval"]);

// Citește filtrele din URLSearchParams (searchParams din Server Component
// sau useSearchParams din client) — o singură sursă de adevăr pentru forma
// implicită, ca lista și statisticile să interpreteze identic un query gol.
export function parseFiltru(sp: URLSearchParams): FiltruCompanii {
  const perioadaTip = sp.get("perioada");
  const anAcum = new Date().getFullYear();
  const marcajeRaw = sp.getAll("marcaj");
  return {
    perioadaTip: perioadaTip && PERIOADA_VALIDA.has(perioadaTip as PerioadaTip) ? (perioadaTip as PerioadaTip) : "toate",
    an: Number(sp.get("an")) || anAcum,
    luna: sp.get("luna") ?? "",
    saptamana: sp.get("saptamana") ?? "",
    dataStart: sp.get("dataStart") ?? "",
    dataSfarsit: sp.get("dataSfarsit") ?? "",
    responsabil: sp.get("responsabil") ?? "toti",
    judet: sp.get("judet") ?? "toate",
    contact: sp.get("contact") === "cu" || sp.get("contact") === "fara" ? (sp.get("contact") as "cu" | "fara") : "toate",
    marcaje: marcajeRaw.filter((m) => MARCAJE_VALIDE.has(m)),
    vezi: sp.get("vezi") === "lucrate" ? "lucrate" : "toata",
    q: sp.get("q") ?? "",
    pagina: Math.max(1, Number(sp.get("pagina")) || 1),
    top: sp.get("top") === "1",
  };
}

// Luni Isaptamana ISO-8601 pentru (an, săptămână) — folosită doar pentru
// perioadaTip === "saptamana" (input type="week", format "YYYY-Www").
function luniSaptamanaISO(an: number, saptamana: number): Date {
  const jan4 = new Date(Date.UTC(an, 0, 4));
  const jan4Zi = jan4.getUTCDay() || 7; // luni=1 .. duminică=7
  const luniSapt1 = new Date(jan4);
  luniSapt1.setUTCDate(jan4.getUTCDate() - (jan4Zi - 1));
  const luni = new Date(luniSapt1);
  luni.setUTCDate(luniSapt1.getUTCDate() + (saptamana - 1) * 7);
  return luni;
}

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// Interval [start, end) în format "YYYY-MM-DD" pentru filtrul de perioadă —
// null = fără filtru de dată ("Toate"). `end` e EXCLUSIV (prima zi de după
// interval), ca să se poată folosi direct cu `< end` fără off-by-one.
export function calculeazaInterval(f: FiltruCompanii): { start: string | null; end: string | null } {
  const an = f.an;
  switch (f.perioadaTip) {
    case "toate":
      return { start: null, end: null };
    case "q1":
      return { start: `${an}-01-01`, end: `${an}-04-01` };
    case "q2":
      return { start: `${an}-04-01`, end: `${an}-07-01` };
    case "q3":
      return { start: `${an}-07-01`, end: `${an}-10-01` };
    case "q4":
      return { start: `${an}-10-01`, end: `${an + 1}-01-01` };
    case "an":
      return { start: `${an}-01-01`, end: `${an + 1}-01-01` };
    case "luna": {
      const m = /^(\d{4})-(\d{2})$/.exec(f.luna);
      if (!m) return { start: null, end: null };
      const [, yStr, mStr] = m;
      const y = Number(yStr);
      const mo = Number(mStr);
      const start = new Date(Date.UTC(y, mo - 1, 1));
      const end = new Date(Date.UTC(y, mo, 1));
      return { start: iso(start), end: iso(end) };
    }
    case "saptamana": {
      const m = /^(\d{4})-W(\d{2})$/.exec(f.saptamana);
      if (!m) return { start: null, end: null };
      const luni = luniSaptamanaISO(Number(m[1]), Number(m[2]));
      const dupa = new Date(luni);
      dupa.setUTCDate(luni.getUTCDate() + 7);
      return { start: iso(luni), end: iso(dupa) };
    }
    case "interval": {
      if (!f.dataStart || !f.dataSfarsit) return { start: null, end: null };
      const sfarsitExclusiv = new Date(`${f.dataSfarsit}T00:00:00Z`);
      sfarsitExclusiv.setUTCDate(sfarsitExclusiv.getUTCDate() + 1);
      return { start: f.dataStart, end: iso(sfarsitExclusiv) };
    }
  }
}
