import { and, eq, isNull, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { cronAutorizat } from "@/lib/cron-auth";
import { db } from "@/lib/db";
import { donatoriReali, formular230Beneficiari, formular230CampaniiEmail, organizations } from "@/lib/db/schema";
import { emailConfigurat, trimiteEmailuriInLot } from "@/lib/email";
import { raporteazaAvertisment, raporteazaEroare } from "@/lib/monitoring";
import { linkDezabonare } from "@/lib/dezabonare";
import { anteteDezabonare, htmlEmailF230, subiectEmailF230 } from "@/lib/formular230-email-template";
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
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: "cron_neconfigurat" }, { status: 501 });
  }
  if (!cronAutorizat(req)) {
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

  const orgs = await db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.public_lookup', 'true', true)`);
    return tx.select({ id: organizations.id, slug: organizations.slug, name: organizations.name }).from(organizations);
  });

  const rezultate: { orgSlug: string; trimise: number }[] = [];

  // O tranzacție SEPARATĂ per organizație — nu toate într-una singură. Dacă
  // una aruncă o eroare neașteptată (SMTP tranzitoriu, eroare DB), rollback-ul
  // atinge DOAR acea organizație, nu și înregistrarea "campanie trimisă" a
  // celor procesate deja în aceeași rulare — altfel emailurile lor, deja
  // trimise ireversibil, ar fi retrimise donatorilor la rularea următoare
  // (rândul din formular230_campanii_email ar dispărea odată cu rollback-ul).
  for (const org of orgs) {
    try {
      const trimise = await db.transaction(async (tx) => {
        await tx.execute(sql`select set_config('app.public_lookup', 'true', true)`);

        const [campanieExistenta] = await tx
          .select({ id: formular230CampaniiEmail.id })
          .from(formular230CampaniiEmail)
          .where(and(eq(formular230CampaniiEmail.orgId, org.id), eq(formular230CampaniiEmail.an, an)))
          .limit(1);
        if (campanieExistenta) return null;

        const [beneficiar] = await tx
          .select({ shortCode: formular230Beneficiari.shortCode })
          .from(formular230Beneficiari)
          .where(and(eq(formular230Beneficiari.orgId, org.id), eq(formular230Beneficiari.slug, SLUG_PRINCIPAL)))
          .limit(1);
        if (!beneficiar?.shortCode) return null;

        const donatori = await tx
          .select({ email: donatoriReali.email, nume: donatoriReali.nume })
          .from(donatoriReali)
          // Doar cei care NU s-au dezabonat — fiecare email are link de dezabonare.
          .where(and(eq(donatoriReali.orgId, org.id), isNull(donatoriReali.dezabonatEmailLa)));
        if (!donatori.length) return null;

        const link = `${baseUrl}/s/${beneficiar.shortCode}`;
        const { trimise, esuate } = await trimiteEmailuriInLot({
          destinatari: donatori,
          subiect: () => subiectEmailF230(org.name),
          html: (d) => htmlEmailF230(org.name, d.nume, link, linkDezabonare(baseUrl, org.id, d.email)),
          headers: (d) => anteteDezabonare(linkDezabonare(baseUrl, org.id, d.email)),
        });

        if (esuate > 0) {
          raporteazaAvertisment("cron-formular230", "unele emailuri de reamintire au eșuat", { orgSlug: org.slug, trimise, esuate });
        }
        await tx.insert(formular230CampaniiEmail).values({ orgId: org.id, an, nrDestinatari: trimise, trimisDe: null });
        return trimise;
      });

      if (trimise !== null) rezultate.push({ orgSlug: org.slug, trimise });
    } catch (e) {
      raporteazaEroare("cron-formular230", e, { orgSlug: org.slug });
    }
  }

  return NextResponse.json({ ok: true, organizatii: rezultate.length, rezultate });
}
