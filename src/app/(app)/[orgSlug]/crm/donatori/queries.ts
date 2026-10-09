import { and, desc, eq } from "drizzle-orm";

import { withOrgSession } from "@/lib/auth/guard";
import { appUsers, donatorNotite, donatoriReali, fundraisingDonations } from "@/lib/db/schema";

// Fișa unui donator real (pagina reali/[id]). Lista, segmentele și analizele sunt în queries-pf.ts și queries-analiza.ts.
export const getDonatorRealDetaliu = withOrgSession(async (ctx, id: string) => {
  const rows = await ctx.db
    .select()
    .from(donatoriReali)
    .where(and(eq(donatoriReali.id, id), eq(donatoriReali.orgId, ctx.orgId)))
    .limit(1);
  if (!rows[0]) return null;
  const donator = rows[0];

  const [donatii, notite] = await Promise.all([
    ctx.db
      .select()
      .from(fundraisingDonations)
      .where(and(eq(fundraisingDonations.orgId, ctx.orgId), eq(fundraisingDonations.emailDonator, donator.email)))
      .orderBy(desc(fundraisingDonations.createdAt)),
    ctx.db
      .select({
        id: donatorNotite.id,
        text: donatorNotite.text,
        createdAt: donatorNotite.createdAt,
        editatLa: donatorNotite.editatLa,
        autorNume: appUsers.name,
      })
      .from(donatorNotite)
      .leftJoin(appUsers, eq(appUsers.id, donatorNotite.createdBy))
      .where(eq(donatorNotite.donatorId, id))
      .orderBy(desc(donatorNotite.createdAt)),
  ]);

  return { donator, donatii, notite, poateAdministra: ctx.role === "owner" || ctx.role === "admin" };
});
