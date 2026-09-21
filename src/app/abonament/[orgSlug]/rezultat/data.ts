import "server-only";

import { eq } from "drizzle-orm";

import { withOrgSession } from "@/lib/auth/guard";
import { platformPayments } from "@/lib/db/schema";

// Starea unei plăți de abonament, doar pentru membrii organizației (RLS pe
// org_id prin ctx.db) — pagina de rezultat nu decide nimic, doar arată ce a
// hotărât deja IPN-ul verificat al Netopia.
export const citestePlata = withOrgSession(async (ctx, orderId: string) => {
  const rows = await ctx.db
    .select({
      orderId: platformPayments.orderId,
      status: platformPayments.status,
      sumaLei: platformPayments.sumaLei,
      pachet: platformPayments.package,
    })
    .from(platformPayments)
    .where(eq(platformPayments.orderId, orderId))
    .limit(1);
  return rows[0] ?? null;
});
