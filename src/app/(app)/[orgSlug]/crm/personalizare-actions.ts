"use server";

import { eq } from "drizzle-orm";

import { withOrgSession } from "@/lib/auth/guard";
import { orgPersonalizare } from "@/lib/db/schema";
import { valideazaPersonalizare, type PersonalizareOrg } from "@/lib/personalizare-org";

// Configurarea de aspect a organizației (meniu, familie de dashboard, blocuri), scrisă doar de echipa platformei (vezi app/platform-admin). Orice membru o
// citește, ca să i se aplice. Dacă tabelul lipsește sau valoarea e invalidă, întoarce null și rămâne aspectul standard: o personalizare stricată nu poate
// strica dashboardul. Citirea rulează într-un savepoint, ca o eroare de bază de date să nu anuleze tranzacția acțiunii.
export const citestePersonalizareOrg = withOrgSession(
  async (ctx): Promise<PersonalizareOrg | null> => {
    try {
      return await ctx.db.transaction(async (sp) => {
        const [r] = await sp.select({ config: orgPersonalizare.config }).from(orgPersonalizare).where(eq(orgPersonalizare.orgId, ctx.orgId)).limit(1);
        if (!r) return null;
        const v = valideazaPersonalizare(r.config);
        return v.ok ? v.valoare : null;
      });
    } catch {
      return null;
    }
  },
  { permiteAccesBlocat: true },
);
