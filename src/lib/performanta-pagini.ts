import type { OrgContext } from "@/lib/auth/guard";
import { incarcaActivitati, incarcaEchipa, incarcaSpatiulMeu } from "@/lib/performanta-activitati";
import type { ActivitateDto, FiltruActivitati, SaptamanaCapacitate } from "@/lib/performanta-activitati-tipuri";
import { incarcaObiective } from "@/lib/performanta-date";
import { aziRo, luniSaptamanii } from "@/lib/performanta-masurare";
import type { OptiuniPerformanta } from "@/lib/performanta-tipuri";

// Date pentru paginile cu activități: ce trebuie în formularele de activitate (obiective, dependențe) și planul unei săptămâni.

export type ObiectivSimplu = { id: string; titlu: string; rezultate: { id: string; titlu: string }[] };

const adauga = (iso: string, zile: number) => new Date(Date.parse(`${iso}T12:00:00Z`) + zile * 86400000).toISOString().slice(0, 10);

export async function contextActivitati(ctx: OrgContext, start: string, end: string): Promise<{ optiuni: OptiuniPerformanta; obiective: ObiectivSimplu[]; dependente: { id: string; titlu: string }[] }> {
  const [ob, deschise] = await Promise.all([incarcaObiective(ctx, { start, end, status: "activ" }), incarcaActivitati(ctx, { status: "deschise" })]);
  return {
    optiuni: ob.optiuni,
    obiective: ob.obiective.map((o) => ({ id: o.id, titlu: o.titlu, rezultate: o.rezultate.filter((r) => r.status === "activ").map((r) => ({ id: r.id, titlu: r.titlu })) })),
    dependente: deschise.slice(0, 300).map((a) => ({ id: a.id, titlu: a.titlu })),
  };
}

export type DateSaptamana = {
  luni: string;
  duminica: string;
  azi: string;
  activitati: ActivitateDto[];
  neplanificate: ActivitateDto[];
  capacitate: (SaptamanaCapacitate & { nume: string }) | null;
  context: Awaited<ReturnType<typeof contextActivitati>>;
};

export async function incarcaSaptamana(ctx: OrgContext, luniCerut: string | null, f: Omit<FiltruActivitati, "start" | "end" | "restante" | "faraTermen">): Promise<DateSaptamana> {
  const azi = aziRo();
  const luni = luniSaptamanii(luniCerut && /^\d{4}-\d{2}-\d{2}$/.test(luniCerut) ? luniCerut : azi);
  const duminica = adauga(luni, 6);
  const [activitati, neplanificate, context] = await Promise.all([
    incarcaActivitati(ctx, { ...f, start: luni, end: duminica, restante: luni <= azi }),
    incarcaActivitati(ctx, { ...f, status: f.status === "toate" ? "toate" : "deschise", faraTermen: true }),
    contextActivitati(ctx, luni, duminica),
  ]);
  let capacitate: DateSaptamana["capacitate"] = null;
  if (f.responsabilId) {
    const echipa = await incarcaEchipa(ctx, luni);
    const m = echipa.membri.find((x) => x.id === f.responsabilId);
    if (m?.vedeDetalii && m.saptamani[0]) capacitate = { ...m.saptamani[0], nume: m.nume };
  }
  return { luni, duminica, azi, activitati, neplanificate, capacitate, context };
}

export async function incarcaPaginaMeu(ctx: OrgContext, start: string, end: string) {
  const azi = aziRo();
  const luni = luniSaptamanii(azi);
  const [meu, context] = await Promise.all([incarcaSpatiulMeu(ctx, start, end), contextActivitati(ctx, luni, adauga(luni, 6))]);
  return { meu, context };
}
