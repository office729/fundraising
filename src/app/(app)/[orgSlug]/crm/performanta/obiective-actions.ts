"use server";

import { withOrgSessionPerf as withOrgSession } from "@/lib/performanta-sesiune";
import { incarcaObiective, type FiltruObiective } from "@/lib/performanta-date";
import {
  actualizeazaRezultat,
  istoricRezultat,
  obiectiveAlegere,
  salveazaObiectiv,
  seteazaStatusObiectiv,
  type ActualizareInput,
} from "@/lib/performanta-obiective";
import { aplicaSablon } from "@/lib/performanta-sabloane-server";
import type { StatusObiectiv } from "@/lib/performanta-tipuri";
import type { ObiectivInput } from "@/lib/performanta-validare";

export type { ActualizareInput };

// Învelișuri cu sesiune peste lib/performanta-obiective.ts: acolo e logica (validare, drepturi, audit).
export const obtineObiective = withOrgSession(async (ctx, filtru: FiltruObiective) => incarcaObiective(ctx, filtru));
export const salveazaObiectivAction = withOrgSession(async (ctx, input: ObiectivInput) => salveazaObiectiv(ctx, input));
export const actualizeazaRezultatAction = withOrgSession(async (ctx, rezultatId: string, input: ActualizareInput) => actualizeazaRezultat(ctx, rezultatId, input));
export const seteazaStatusObiectivAction = withOrgSession(async (ctx, obiectivId: string, status: StatusObiectiv, motiv?: string) => seteazaStatusObiectiv(ctx, obiectivId, status, motiv));
export const istoricRezultatAction = withOrgSession(async (ctx, rezultatId: string) => istoricRezultat(ctx, rezultatId));
export const obiectiveAlegereAction = withOrgSession(async (ctx, start: string, end: string) => obiectiveAlegere(ctx, start, end));

export const aplicaSablonAction = withOrgSession(async (ctx, p: { sablonId: string; angajatId: string; perioadaStart: string; perioadaEnd: string }) => aplicaSablon(ctx, p));
