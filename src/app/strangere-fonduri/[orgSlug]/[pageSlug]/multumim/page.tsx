import { eq, sql } from "drizzle-orm";
import Link from "next/link";

import { db } from "@/lib/db";
import { fundraisingDonations, fundraisingPages } from "@/lib/db/schema";
import { DONATION_DICT } from "@/lib/i18n/dictionaries/donation";
import { getLocale } from "@/lib/i18n/get-locale";

// Stripe redirecționează aici imediat după plată — confirmarea REALĂ (marcarea
// donației ca "reusita" și actualizarea sumei strânse) o face webhook-ul
// asincron (/api/stripe/webhook), care poate ajunge la câteva secunde după
// acest redirect. De-asta mesajul de mai jos NU depinde de status — suma,
// numele donatorului și pagina sunt scrise la CREAREA donației (înainte de
// Stripe), nu de webhook, deci sunt sigur disponibile aici indiferent dacă
// webhook-ul a apucat deja să ruleze.
async function getDetaliuDonatie(sessionId: string) {
  const rows = await db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.public_lookup', 'true', true)`);
    return tx
      .select({
        numeDonator: fundraisingDonations.numeDonator,
        suma: fundraisingDonations.suma,
        recurenta: fundraisingDonations.recurenta,
        pageTitlu: fundraisingPages.titlu,
      })
      .from(fundraisingDonations)
      .innerJoin(fundraisingPages, eq(fundraisingPages.id, fundraisingDonations.pageId))
      .where(eq(fundraisingDonations.stripeSessionId, sessionId))
      .limit(1);
  });
  return rows[0] ?? null;
}

export default async function MultumimPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string; pageSlug: string }>;
  searchParams: Promise<{ session_id?: string; payment_intent?: string }>;
}) {
  const { orgSlug, pageSlug } = await params;
  // "session_id" vine de la fluxul Checkout Session (redirect clasic);
  // "payment_intent" de la fluxul express (Apple Pay/Google Pay/PayPal —
  // navigare client-side sau redirect Stripe cu return_url, vezi
  // express-checkout.tsx) — aceeași coloană (stripeSessionId) reține
  // identificatorul Stripe indiferent care e fluxul, deci căutarea rămâne una singură.
  const { session_id, payment_intent } = await searchParams;
  const sessionId = session_id ?? payment_intent;
  const [detaliu, locale] = await Promise.all([
    sessionId ? getDetaliuDonatie(sessionId) : Promise.resolve(null),
    getLocale(),
  ]);
  const t = DONATION_DICT[locale];

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-green-soft text-2xl">🎉</span>
      <h1 className="font-display mt-5 text-2xl font-bold text-ink">{t.thankYou.titlu}</h1>
      {detaliu ? (
        <p className="mt-2 text-[14.5px] leading-relaxed text-body">
          {detaliu.numeDonator ? t.thankYou.multumimNume(detaliu.numeDonator) : t.thankYou.multumim} {t.thankYou.pentruDonatia}{" "}
          <strong className="text-ink">
            {detaliu.suma.toLocaleString(t.numeLocale)} lei{detaliu.recurenta ? t.thankYou.lunaSufix : ""}
          </strong>{" "}
          {t.thankYou.pentru} <strong className="text-ink">{detaliu.pageTitlu}</strong>
          {t.thankYou.finalCuEmail}
        </p>
      ) : (
        <p className="mt-2 text-[14.5px] leading-relaxed text-muted">{t.thankYou.faraDetaliu}</p>
      )}
      <Link
        href={`/strangere-fonduri/${orgSlug}/${pageSlug}`}
        className="mt-6 rounded-md bg-brand-green px-6 py-3 font-bold text-white transition hover:bg-brand-green-hover"
      >
        {t.thankYou.inapoiLaPagina}
      </Link>
    </main>
  );
}
