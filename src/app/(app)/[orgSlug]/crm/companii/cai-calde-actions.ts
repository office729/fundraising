"use server";

import { revalidatePath } from "next/cache";

import { withOrgSession } from "@/lib/auth/guard";
import { calculeazaSet, salveazaSet } from "./cai-calde-global";

// Recalculează căile calde ale întregii baze de firme (pachetul IMPACT). Orice membru al organizației poate cere recalcularea: citește doar datele organizației și scrie un singur rezumat.
export const recalculeazaCaiCaldeAction = withOrgSession(
  async (ctx): Promise<{ n: number }> => {
    const set = await calculeazaSet(ctx);
    await salveazaSet(ctx, set);
    revalidatePath(`/${ctx.orgSlug}/crm/companii`);
    return { n: set.n };
  },
  { modul: "cai-calde" },
);
