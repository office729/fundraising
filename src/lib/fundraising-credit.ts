import "server-only";

import { randomUUID } from "node:crypto";

import { and, eq, sql } from "drizzle-orm";

import type { db as Db } from "@/lib/db";
import { donatoriReali, fundraisingPages, organizations } from "@/lib/db/schema";

// Acceptă fie o tranzacție (Tx, ca la webhook-ul Stripe), fie instanța
// expusă în OrgContext.db din withOrgSession (tipizată `typeof db`, deși e
// tot o tranzacție la runtime — vezi comentariul din lib/auth/guard.ts).
// Cele două tipuri nu sunt reciproc atribuibile în TS (Tx are membri în plus
// față de DB), deci funcția acceptă tipul mai „lat", satisfăcut de ambele.
type DbOrTx = typeof Db;

// Logică COMUNĂ de creditare — folosită atât de webhook-ul Stripe
// (donații online confirmate) cât și de acțiunea de donație offline din CRM
// (transfer bancar/cash înregistrat manual, sau o donație de test înainte ca
// Stripe să fie pus pe chei live). Un singur loc de adevăr — orice schimbare
// aici se reflectă identic pe ambele căi, exact cerința ca „fluxul să fie
// același" indiferent cum a ajuns banul.
export async function crediteazaPaginaSiDonator(
  tx: DbOrTx,
  params: {
    pageId: string;
    orgId: string;
    suma: number;
    numeDonator: string | null;
    emailDonator: string | null;
    telefonDonator: string | null;
    consimtamantWhatsapp: boolean;
  },
): Promise<{ pageTitlu: string; orgName: string } | null> {
  const rezultat = await tx
    .select({ pageTitlu: fundraisingPages.titlu, orgName: organizations.name })
    .from(fundraisingPages)
    .innerJoin(organizations, eq(organizations.id, fundraisingPages.orgId))
    .where(eq(fundraisingPages.id, params.pageId))
    .limit(1);

  await tx
    .update(fundraisingPages)
    .set({ sumaStransa: sql`${fundraisingPages.sumaStransa} + ${params.suma}` })
    .where(eq(fundraisingPages.id, params.pageId));

  if (params.emailDonator) {
    const sursa = `Pagină strângere fonduri: ${rezultat[0]?.pageTitlu ?? "necunoscută"}`;
    await tx
      .insert(donatoriReali)
      .values({
        id: randomUUID(),
        orgId: params.orgId,
        nume: params.numeDonator ?? "Donator",
        email: params.emailDonator,
        telefon: params.telefonDonator,
        sursa,
        metodaPlata: "Card (Stripe)",
        totalDonat: params.suma,
        numarDonatii: 1,
        consimtamantWhatsapp: params.consimtamantWhatsapp,
      })
      .onConflictDoUpdate({
        target: [donatoriReali.orgId, donatoriReali.email],
        set: {
          nume: params.numeDonator ?? sql`${donatoriReali.nume}`,
          telefon: params.telefonDonator ?? sql`${donatoriReali.telefon}`,
          sursa,
          totalDonat: sql`${donatoriReali.totalDonat} + ${params.suma}`,
          numarDonatii: sql`${donatoriReali.numarDonatii} + 1`,
          ultimaDonatieLa: sql`now()`,
          // Upgrade (false→true) niciodată downgrade — o donație ulterioară
          // fără bifă nu trebuie să anuleze un acord deja dat anterior.
          consimtamantWhatsapp: sql`${donatoriReali.consimtamantWhatsapp} or ${params.consimtamantWhatsapp}`,
        },
      });
  }

  return rezultat[0] ?? null;
}

// Simetricul lui crediteazaPaginaSiDonator — apelat la rambursare/contestație
// (doar pe donații venite prin Stripe; o donație offline ștearsă manual ar
// trebui decreditată direct de acțiunea care o șterge, dacă/când se adaugă).
// greatest(0, ...) evită sume negative dacă vreodată cache-ul era deja
// desincronizat.
export async function decrediteazaPaginaSiDonator(
  tx: DbOrTx,
  params: { pageId: string; orgId: string; suma: number; emailDonator: string | null },
) {
  await tx
    .update(fundraisingPages)
    .set({ sumaStransa: sql`greatest(0, ${fundraisingPages.sumaStransa} - ${params.suma})` })
    .where(eq(fundraisingPages.id, params.pageId));

  if (!params.emailDonator) return;

  await tx
    .update(donatoriReali)
    .set({
      totalDonat: sql`greatest(0, ${donatoriReali.totalDonat} - ${params.suma})`,
      numarDonatii: sql`greatest(0, ${donatoriReali.numarDonatii} - 1)`,
    })
    .where(and(eq(donatoriReali.orgId, params.orgId), eq(donatoriReali.email, params.emailDonator)));
}
