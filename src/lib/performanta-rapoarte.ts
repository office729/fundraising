import type { OrgContext } from "@/lib/auth/guard";
import { incarcaActivitati, incarcaBlocaje } from "@/lib/performanta-activitati";
import { incarcaObiective, incarcaStructura } from "@/lib/performanta-date";
import { ETICHETE_STARE, aziRo, luniSaptamanii, type StareRitm } from "@/lib/performanta-masurare";
import { rezolvaPerioada } from "@/lib/performanta-perioada";
import type { ObiectivDto } from "@/lib/performanta-tipuri";

// Rapoartele modulului: obiective și rezultate-cheie, muncă finalizată pe săptămâni și blocaje. Toate pornesc din aceleași încărcări ca paginile,
// deci arată (și exportă) doar ce poate vedea utilizatorul. Evaluările (1:1, review, autoevaluare, feedback) NU intră în rapoarte și nu se exportă.

const adauga = (iso: string, zile: number) => new Date(Date.parse(`${iso}T12:00:00Z`) + zile * 86400000).toISOString().slice(0, 10);

export type RandRezultat = {
  obiectiv: string;
  nivel: string;
  responsabil: string;
  departament: string;
  progresObiectiv: number | null;
  stareObiectiv: string;
  rezultat: string;
  metoda: string;
  tinta: string;
  valoare: string;
  progres: number | null;
  stare: string;
  sursa: string;
  ultimaActualizare: string | null;
  incredere: string;
  formula: string;
  atribuire: string;
};

export type SaptamanaMunca = { luni: string; planificate: number; finalizate: number; laTermen: number };
export type PersoanaMunca = { nume: string; planificate: number; finalizate: number; laTermen: number; restante: number; blocajeDeschise: number };

export type DateRapoarte = {
  perioada: { cod: string; start: string; end: string; eticheta: string };
  azi: string;
  actualizatLa: string;
  obiective: ObiectivDto[];
  randuri: RandRezultat[];
  stari: { stare: StareRitm; eticheta: string; n: number }[];
  surse: { manual: number; crm: number; kpi: number };
  saptamani: SaptamanaMunca[];
  persoane: PersoanaMunca[];
  blocaje: { total: number; deschise: number; rezolvate: number; zileMedii: number | null };
};

const text = (n: number | null, unitate: string | null) => (n === null ? "—" : `${String(Math.round(n * 100) / 100).replace(".", ",")}${unitate ? ` ${unitate}` : ""}`);

export function randuriRezultate(obiective: ObiectivDto[]): RandRezultat[] {
  const out: RandRezultat[] = [];
  for (const o of obiective) {
    if (o.status === "anulat") continue;
    for (const r of o.rezultate.filter((x) => x.status === "activ")) {
      const t = r.metoda === "binar" ? "Realizat" : r.metoda === "interval" ? `${text(r.tinta, r.unitate)} – ${text(r.tintaMax, r.unitate)}` : `${r.metoda === "descrescator" ? "≤ " : "≥ "}${text(r.tinta, r.unitate)}`;
      out.push({
        obiectiv: o.titlu,
        nivel: o.nivel,
        responsabil: o.responsabilNume ?? "",
        departament: o.departmentNume ?? "",
        progresObiectiv: o.progres,
        stareObiectiv: ETICHETE_STARE[o.stare],
        rezultat: r.titlu,
        metoda: r.metoda,
        tinta: t,
        valoare: r.valoare === null ? "fără date" : r.metoda === "binar" ? (r.valoare >= 1 ? "Realizat" : "Nerealizat") : text(r.valoare, r.unitate),
        progres: r.progres,
        stare: ETICHETE_STARE[r.stare],
        sursa: r.sursaEticheta ?? "Introdus manual",
        ultimaActualizare: r.ultimaActualizare,
        incredere: r.incredere ?? "",
        formula: r.formula ?? "",
        atribuire: r.atribuire ?? "",
      });
    }
  }
  return out;
}

export async function incarcaRapoarte(ctx: OrgContext, cod: string | null, departmentId: string | null): Promise<DateRapoarte> {
  const azi = aziRo();
  const p = rezolvaPerioada(cod, azi);
  const [{ obiective }, activitati, blocajeToate, struct] = await Promise.all([
    incarcaObiective(ctx, { start: p.start, end: p.end, departmentId }),
    incarcaActivitati(ctx, { start: p.start, end: p.end, status: "toate" }),
    incarcaBlocaje(ctx, false),
    incarcaStructura(ctx),
  ]);
  const departamentAng = new Map(struct.angajati.map((a) => [a.id, a.departmentId]));
  const dinDep = (responsabilId: string | null) => !departmentId || (responsabilId !== null && departamentAng.get(responsabilId) === departmentId);
  const act = activitati.filter((a) => a.status !== "anulat" && dinDep(a.responsabilId));
  const laTermen = (a: (typeof act)[number]) => a.status === "finalizat" && !!a.finalizatLa && !!a.termen && a.finalizatLa.slice(0, 10) <= a.termen;

  // pe săptămâni (de luni), după termenul activității
  const saptamani: SaptamanaMunca[] = [];
  for (let l = luniSaptamanii(p.start); l <= p.end; l = adauga(l, 7)) {
    const sf = adauga(l, 6);
    const ale = act.filter((a) => a.termen && a.termen >= l && a.termen <= sf);
    saptamani.push({ luni: l, planificate: ale.length, finalizate: ale.filter((a) => a.status === "finalizat").length, laTermen: ale.filter(laTermen).length });
  }

  const pe = new Map<string, PersoanaMunca>();
  for (const a of act) {
    const nume = a.responsabilNume ?? "Nealocat";
    const x = pe.get(nume) ?? { nume, planificate: 0, finalizate: 0, laTermen: 0, restante: 0, blocajeDeschise: 0 };
    x.planificate++;
    if (a.status === "finalizat") x.finalizate++;
    if (laTermen(a)) x.laTermen++;
    if (a.intarziata) x.restante++;
    if (a.blocaj) x.blocajeDeschise++;
    pe.set(nume, x);
  }

  const inPerioada = blocajeToate.filter((b) => b.deschisLa.slice(0, 10) >= p.start && b.deschisLa.slice(0, 10) <= p.end);
  const rez = inPerioada.filter((b) => b.status === "rezolvat" && b.rezolvatLa);
  const zile = rez.map((b) => (Date.parse(b.rezolvatLa as string) - Date.parse(b.deschisLa)) / 86400000);

  const stari = new Map<StareRitm, number>();
  for (const o of obiective.filter((x) => x.status !== "anulat")) stari.set(o.stare, (stari.get(o.stare) ?? 0) + 1);
  const randuri = randuriRezultate(obiective);
  const surseNr = { manual: 0, crm: 0, kpi: 0 };
  for (const o of obiective.filter((x) => x.status !== "anulat")) for (const r of o.rezultate.filter((x) => x.status === "activ")) surseNr[r.sursa]++;

  return {
    perioada: { cod: p.cod, start: p.start, end: p.end, eticheta: p.eticheta },
    azi,
    actualizatLa: new Date().toISOString(),
    obiective,
    randuri,
    stari: [...stari].map(([stare, n]) => ({ stare, eticheta: ETICHETE_STARE[stare], n })),
    surse: surseNr,
    saptamani,
    persoane: [...pe.values()].sort((a, b) => a.nume.localeCompare(b.nume, "ro")),
    blocaje: { total: inPerioada.length, deschise: inPerioada.filter((b) => b.status === "deschis").length, rezolvate: rez.length, zileMedii: zile.length ? Math.round((zile.reduce((s, z) => s + z, 0) / zile.length) * 10) / 10 : null },
  };
}
