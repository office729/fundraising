"use server";

import { withOrgSession } from "@/lib/auth/guard";
import { incarcaDiscutii, salveazaIntrare, stergeIntrare, type IntrareInput } from "@/lib/performanta-evaluari";

// Învelișuri cu sesiune peste lib/performanta-evaluari.ts (drepturile se verifică acolo, pe server).
export const obtineDiscutii = withOrgSession(async (ctx, angajatId: string | null) => incarcaDiscutii(ctx, angajatId));
export const salveazaIntrareAction = withOrgSession(async (ctx, input: IntrareInput) => salveazaIntrare(ctx, input));
export const stergeIntrareAction = withOrgSession(async (ctx, id: string) => stergeIntrare(ctx, id));
