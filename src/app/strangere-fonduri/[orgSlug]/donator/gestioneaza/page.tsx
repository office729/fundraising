import Link from "next/link";
import { notFound } from "next/navigation";

import { abonamenteDupaEmail, verificaLink } from "@/lib/donator-portal";
import { descrieAbonament, esteAlDonatorului, type DescriereAbonament } from "@/lib/donator-portal-ops";
import { getLocale } from "@/lib/i18n/get-locale";
import { PORTAL_DONATOR_DICT } from "@/lib/i18n/dictionaries/portal-donator";
import { SF_PUBLIC_UI_DICT } from "@/lib/i18n/dictionaries/sf-public-ui";
import { raporteazaEroare } from "@/lib/monitoring";
import { stripeOrgDupaSlug } from "@/lib/org-stripe";

import { PortalClient, type ElementPortal } from "./portal-client";

export const dynamic = "force-dynamic";
export async function generateMetadata() {
  return { title: SF_PUBLIC_UI_DICT[await getLocale()].metaDonatieLunara, robots: { index: false, follow: false } };
}

// Pagina cu donațiile lunare ale unui donator, deschisă din linkul primit pe email (semnat, valabil o oră). Starea vine live din Stripe.
export default async function GestionarePage({ params, searchParams }: { params: Promise<{ orgSlug: string }>; searchParams: Promise<{ e?: string; x?: string; t?: string }> }) {
  const { orgSlug } = await params;
  const sp = await searchParams;
  // Cheia Stripe a organizației nu se poate citi (lipsește sau nu e configurată): pagina nu există pentru donator.
  const [stripeOrg, locale] = await Promise.all([stripeOrgDupaSlug(orgSlug).catch((e) => { raporteazaEroare("portal-donator-organizatie", e, { orgSlug }); return null; }), getLocale()]);
  if (!stripeOrg) notFound();
  const t = PORTAL_DONATOR_DICT[locale].gestioneaza;
  const link = { e: sp.e ?? "", x: sp.x ?? "", t: sp.t ?? "" };
  const email = verificaLink(stripeOrg.orgId, link);

  const elemente: ElementPortal[] = [];
  if (email) {
    const cunoscute = await abonamenteDupaEmail(stripeOrg.orgId, email);
    for (const a of cunoscute) {
      try {
        const sub = await stripeOrg.stripe.subscriptions.retrieve(a.subId);
        if (!esteAlDonatorului(sub, stripeOrg.orgId, email)) continue;
        const d: DescriereAbonament = descrieAbonament(sub);
        elemente.push({ subId: a.subId, campanie: a.campanie, descriere: d });
      } catch (e) {
        raporteazaEroare("portal-donator-listare", e, { orgSlug });
      }
    }
    // Cele active primele.
    elemente.sort((a, b) => Number(a.descriere.stare === "oprit") - Number(b.descriere.stare === "oprit"));
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-blue-soft/70 via-panel-2 to-panel-2">
      <main className="mx-auto max-w-2xl px-4 py-10 sm:py-14">
        <h1 className="font-display text-[26px] leading-tight font-bold text-ink">{t.titlu(stripeOrg.orgName)}</h1>
        {!email ? (
          <div className="mt-6 rounded-2xl border border-line bg-panel p-6">
            <p className="text-[15px] leading-relaxed text-muted">{t.expirat}</p>
            <Link href={`/strangere-fonduri/${orgSlug}/donator`} className="mt-4 inline-block rounded-lg bg-brand-green px-5 py-3 text-[15px] font-bold text-white transition hover:bg-brand-green-hover">
              {t.cereNou}
            </Link>
          </div>
        ) : elemente.length === 0 ? (
          <p className="mt-6 rounded-2xl border border-line bg-panel p-6 text-[15px] text-muted">{t.niciunul}</p>
        ) : (
          <>
            <p className="mt-3 text-[15px] leading-relaxed text-muted">{t.intro}</p>
            <PortalClient orgSlug={orgSlug} link={link} elemente={elemente} locale={locale} />
          </>
        )}
      </main>
    </div>
  );
}
