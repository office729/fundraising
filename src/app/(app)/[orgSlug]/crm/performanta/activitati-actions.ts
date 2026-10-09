"use server";

import { withOrgSession } from "@/lib/auth/guard";
import {
  adaugaAbsenta,
  amanaBlocaj,
  aprobaActivitate,
  incarcaActivitati,
  incarcaBlocaje,
  incarcaEchipa,
  incarcaSpatiulMeu,
  inchideBlocaj,
  raporteazaBlocaj,
  salveazaActivitate,
  schimbaStatusActivitate,
  stergeAbsenta,
  stergeActivitate,
} from "@/lib/performanta-activitati";
import type { AbsentaInput, ActivitateInput, BlocajInput, StatusActivitate } from "@/lib/performanta-activitati-reguli";
import { contextActivitati, incarcaPaginaMeu, incarcaSaptamana } from "@/lib/performanta-pagini";
import type { FiltruActivitati } from "@/lib/performanta-activitati-tipuri";

// Învelișuri cu sesiune peste lib/performanta-activitati.ts: acolo sunt logica, drepturile și auditul.
export const obtineActivitati = withOrgSession(async (ctx, filtru: FiltruActivitati) => incarcaActivitati(ctx, filtru));
export const salveazaActivitateAction = withOrgSession(async (ctx, input: ActivitateInput) => salveazaActivitate(ctx, input));
export const schimbaStatusActivitateAction = withOrgSession(async (ctx, id: string, status: StatusActivitate) => schimbaStatusActivitate(ctx, id, status));
export const aprobaActivitateAction = withOrgSession(async (ctx, id: string) => aprobaActivitate(ctx, id));
export const stergeActivitateAction = withOrgSession(async (ctx, id: string) => stergeActivitate(ctx, id));
export const raporteazaBlocajAction = withOrgSession(async (ctx, input: BlocajInput) => raporteazaBlocaj(ctx, input));
export const inchideBlocajAction = withOrgSession(async (ctx, id: string, status: "rezolvat" | "anulat", rezolvare: string) => inchideBlocaj(ctx, id, status, rezolvare));
export const amanaBlocajAction = withOrgSession(async (ctx, id: string, termenNou: string) => amanaBlocaj(ctx, id, termenNou));
export const obtineBlocaje = withOrgSession(async (ctx, doarDeschise: boolean) => incarcaBlocaje(ctx, doarDeschise));
export const obtineEchipa = withOrgSession(async (ctx, luni: string) => incarcaEchipa(ctx, luni));
export const obtineSpatiulMeu = withOrgSession(async (ctx, start: string, end: string) => incarcaSpatiulMeu(ctx, start, end));
export const adaugaAbsentaAction = withOrgSession(async (ctx, input: AbsentaInput) => adaugaAbsenta(ctx, input));
export const stergeAbsentaAction = withOrgSession(async (ctx, id: string) => stergeAbsenta(ctx, id));
export const obtineSaptamana = withOrgSession(async (ctx, luni: string | null, filtru: Omit<FiltruActivitati, "start" | "end" | "restante" | "faraTermen">) => incarcaSaptamana(ctx, luni, filtru));
export const obtineContextActivitati = withOrgSession(async (ctx, start: string, end: string) => contextActivitati(ctx, start, end));
export const obtinePaginaMeu = withOrgSession(async (ctx, start: string, end: string) => incarcaPaginaMeu(ctx, start, end));
