"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { inregistreazaAudit } from "@/lib/audit";
import { withOrgAdmin } from "@/lib/auth/guard";
import { organizations } from "@/lib/db/schema";
import { mesajSigur, EroareUtilizator } from "@/lib/erori";
import { DPA_VERSIUNE } from "@/lib/legal-version";
import { getTr } from "@/lib/i18n/tr-server";

// Acceptarea Acordului de prelucrare a datelor (DPA) în numele organizației — doar owner/admin; se înregistrează
// versiunea, momentul și utilizatorul. Permisă și cu accesul blocat (nu depinde de abonament).
const accepta = withOrgAdmin(
  async (ctx): Promise<void> => {
    const actualizat = await ctx.db
      .update(organizations)
      .set({ dpaVersion: DPA_VERSIUNE, dpaAcceptedAt: new Date(), dpaAcceptedBy: ctx.userId })
      .where(eq(organizations.id, ctx.orgId))
      .returning({ id: organizations.id });
    if (!actualizat.length) throw new EroareUtilizator((await getTr())("Nu am putut înregistra acceptarea.", "We could not record the acceptance."));
    await inregistreazaAudit(ctx.db, {
      orgId: ctx.orgId,
      actorAppUserId: ctx.userId,
      actiune: "dpa_acceptat",
      entitate: "organizatie",
      entitateId: ctx.orgId,
      detalii: { versiune: DPA_VERSIUNE },
    });
  },
  { permiteAccesBlocat: true },
);

export async function acceptaDpaAction(orgSlug: string): Promise<{ error: string | null }> {
  try {
    await accepta(orgSlug);
    revalidatePath(`/${orgSlug}`, "layout");
    return { error: null };
  } catch (e) {
    return { error: mesajSigur(e, (await getTr())("Nu am putut înregistra acceptarea.", "We could not record the acceptance."), "dpa-acceptare") };
  }
}
