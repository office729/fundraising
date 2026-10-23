"use server";

import { desc, eq } from "drizzle-orm";

import { withOrgSession } from "@/lib/auth/guard";
import { orgTimp } from "@/lib/db/schema";
import { EroareUtilizator } from "@/lib/erori";
import type { Categorie } from "@/lib/timp-custom";

export type IntrareTimpClient = { id: string; data: string; categorie: Categorie; descriere: string; minute: number; cuAi: boolean };

// Timpul alocat organizației (vezi lib/timp-custom.ts), pentru pagina „Timp alocat” a clientului. Doar owner și admin. Citirea trece prin RLS: rândurile se întorc doar dacă pagina
// e activată pentru organizație (config.arataTimp) și doar intrările terminate. NU se selectează niciodată tarifele, timerele pornite sau cine a introdus intrarea.
// Fără tabel (încă nelivrat) sau fără drept, lista e goală.
export const citesteTimpOrg = withOrgSession(async (ctx): Promise<IntrareTimpClient[]> => {
  if (ctx.role !== "owner" && ctx.role !== "admin") throw new EroareUtilizator("Doar proprietarul și administratorii văd timpul alocat.");
  try {
    const rows = await ctx.db.transaction((sp) =>
      sp
        .select({ id: orgTimp.id, data: orgTimp.data, categorie: orgTimp.categorie, descriere: orgTimp.descriere, minute: orgTimp.minute, cuAi: orgTimp.cuAi })
        .from(orgTimp)
        .where(eq(orgTimp.orgId, ctx.orgId))
        .orderBy(desc(orgTimp.data), desc(orgTimp.creatLa)),
    );
    return rows.filter((r): r is typeof r & { minute: number } => r.minute !== null).map((r) => ({ ...r, categorie: r.categorie as Categorie }));
  } catch {
    return [];
  }
});
