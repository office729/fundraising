"use server";

import { withOrgSession } from "@/lib/auth/guard";
import { incarcaStructura } from "@/lib/performanta-date";
import { incarcaPrezentare } from "@/lib/performanta-prezentare";
import { incarcaRapoarte } from "@/lib/performanta-rapoarte";

export const obtinePrezentare = withOrgSession(async (ctx, cod: string | null, departmentId: string | null) => incarcaPrezentare(ctx, cod, departmentId));

export const obtineOrganizare = withOrgSession(async (ctx) => (await incarcaStructura(ctx)).departamente);

export const obtineRapoarte = withOrgSession(async (ctx, cod: string | null, departmentId: string | null) => incarcaRapoarte(ctx, cod, departmentId));
