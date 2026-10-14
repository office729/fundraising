import "server-only";

import { eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { fundraisingDonations, fundraisingPages } from "@/lib/db/schema";

// Stripe întoarce donatorul pe pagina campaniei imediat după plată — confirmarea REALĂ (marcarea donației ca "reusita" și
// actualizarea sumei strânse) o face webhook-ul asincron (/api/stripe/webhook), care poate ajunge la câteva secunde după
// întoarcere. Suma, numele donatorului și pagina sunt scrise la CREAREA donației (înainte de Stripe), dar mulțumirea se arată doar când
// statusul e „reusita” (confirmat de webhook): până atunci popup-ul spune că plata se confirmă și așteaptă (vezi popup-multumire.tsx).
export async function getDetaliuDonatie(sessionId: string) {
  const rows = await db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.public_lookup', 'true', true)`);
    return tx
      .select({
        numeDonator: fundraisingDonations.numeDonator,
        suma: fundraisingDonations.suma,
        recurenta: fundraisingDonations.recurenta,
        status: fundraisingDonations.status,
        pageTitlu: fundraisingPages.titlu,
      })
      .from(fundraisingDonations)
      .innerJoin(fundraisingPages, eq(fundraisingPages.id, fundraisingDonations.pageId))
      .where(eq(fundraisingDonations.stripeSessionId, sessionId))
      .limit(1);
  });
  return rows[0] ?? null;
}
