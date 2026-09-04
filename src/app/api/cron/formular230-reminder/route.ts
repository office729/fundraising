import { and, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { donatoriReali, formular230Beneficiari, formular230CampaniiEmail, organizations } from "@/lib/db/schema";
import { emailConfigurat, trimiteEmailuriInLot } from "@/lib/email";
import { htmlEmailF230, subiectEmailF230 } from "@/lib/formular230-email-template";
import { SLUG_PRINCIPAL } from "@/lib/formular230-constants";

// Rulat zilnic de Vercel Cron (vezi vercel.json) — trimite O SINGURĂ dată pe
// an, per organizație, reamintirea de Formular 230 către donatorii reali,
// în fereastra de ZILE_INAINTE_TERMEN zile înainte de termenul ANAF (25 mai).
// Autentificat prin CRON_SECRET (header pus automat de Vercel Cron când
// variabila e setată în proiect) — fără el, orice cerere publică ar putea
// declanșa trimiteri, deci ruta refuză să ruleze.
//
// NU trece prin withOrgAdmin (nu există o sesiune de user aici) — folosește
// contextul de încredere app.public_lookup, la fel ca webhook-urile Stripe/
// Twilio, pentru fiecare organizație în parte.

const ZILE_INAINTE_TERMEN = 10;
const TERMEN_LUNA = 5; // mai
const TERMEN_ZI = 25;

function inFereastraTermen(acum: Date): boolean {
  const an = acum.getUTCFullYear();
  const termen = new Date(Date.UTC(an, TERMEN_LUNA - 1, TERMEN_ZI));
  const start = new Date(termen);
  start.setUTCDate(start.getUTCDate() - ZILE_INAINTE_TERMEN);
  return acum >= start && acum <= termen;
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "cron_neconfigurat" }, { status: 501 });
  }
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const acum = new Date();
  if (!inFereastraTermen(acum)) {
    return NextResponse.json({ ok: true, trimise: 0, motiv: "in_afara_ferestrei" });
  }
  if (!emailConfigurat()) {
    return NextResponse.json({ ok: true, trimise: 0, motiv: "email_neconfigurat" });
  }

  const an = acum.getUTCFullYear();
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://fundraising-academy-one.vercel.app";

  const rezultate: { orgSlug: string; trimise: number }[] = [];

  await db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.public_lookup', 'true', true)`);

    const orgs = await tx.select({ id: organizations.id, slug: organizations.slug, name: organizations.name }).from(organizations);

    for (const org of orgs) {
      const [campanieExistenta] = await tx
        .select({ id: formular230CampaniiEmail.id })
        .from(formular230CampaniiEmail)
        .where(and(eq(formular230CampaniiEmail.orgId, org.id), eq(formular230CampaniiEmail.an, an)))
        .limit(1);
      if (campanieExistenta) continue;

      const [beneficiar] = await tx
        .select({ shortCode: formular230Beneficiari.shortCode })
        .from(formular230Beneficiari)
        .where(and(eq(formular230Beneficiari.orgId, org.id), eq(formular230Beneficiari.slug, SLUG_PRINCIPAL)))
        .limit(1);
      if (!beneficiar?.shortCode) continue;

      const donatori = await tx
        .select({ email: donatoriReali.email, nume: donatoriReali.nume })
        .from(donatoriReali)
        .where(eq(donatoriReali.orgId, org.id));
      if (!donatori.length) continue;

      const link = `${baseUrl}/s/${beneficiar.shortCode}`;
      const { trimise } = await trimiteEmailuriInLot({
        destinatari: donatori,
        subiect: () => subiectEmailF230(org.name),
        html: (d) => htmlEmailF230(org.name, d.nume, link),
      });

      await tx.insert(formular230CampaniiEmail).values({ orgId: org.id, an, nrDestinatari: trimise, trimisDe: null });
      rezultate.push({ orgSlug: org.slug, trimise });
    }
  });

  return NextResponse.json({ ok: true, organizatii: rezultate.length, rezultate });
}
