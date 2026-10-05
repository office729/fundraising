import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { requireOrgAccess } from "@/lib/auth/guard";
import { getLocale } from "@/lib/i18n/get-locale";
import { SETARI_ECHIPA_DICT } from "@/lib/i18n/dictionaries/setari-echipa";

import { AbonamentSection } from "./abonament-section";
import { listeazaFacturiAction } from "../billing-actions";
import { BrandingForm } from "./branding-form";
import { obtineStatusCanvaAction } from "./canva-actions";
import { CanvaSection } from "./canva-section";
import { DomainForm } from "./domain-form";
import { obtineStatusReinnoireAutomata } from "./netopia-card-actions";
import { obtineDateReferral } from "./referral-actions";
import { ReferralSection } from "./referral-section";
import { DPA_ACTIV, DPA_VERSIUNE } from "@/lib/legal-version";

import { DpaSection } from "./dpa-section";
import { OrganizatieSection } from "./organizatie-section";
import { obtineStatusStripeDonatii } from "./stripe-donatii-actions";
import { StripeDonatiiSection } from "./stripe-donatii-section";
import { titluPagina } from "@/lib/page-titles";

export default async function SetariPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ canva?: string }>;
}) {
  const { orgSlug } = await params;
  const { canva } = await searchParams;
  const access = await requireOrgAccess(orgSlug);
  const locale = await getLocale();
  const dict = SETARI_ECHIPA_DICT[locale].orgSetari;

  if (access.role !== "owner" && access.role !== "admin") {
    redirect(`/${orgSlug}`);
  }

  // Cinci citiri independente (fiecare cu propria tranzacție): rulează împreună, nu una după alta.
  const [{ cod, numarRecomandari }, facturi, stripeStatus, canvaStatus, reinnoireAutomata] = await Promise.all([
    obtineDateReferral(orgSlug),
    listeazaFacturiAction(orgSlug),
    obtineStatusStripeDonatii(orgSlug),
    obtineStatusCanvaAction(orgSlug),
    obtineStatusReinnoireAutomata(orgSlug),
  ]);
  const hdrs = await headers();
  const webhookOrigin = `${hdrs.get("x-forwarded-proto") ?? "https"}://${hdrs.get("x-forwarded-host") ?? hdrs.get("host")}`;

  return (
    <>
      {/* mx-auto: <main> din layout.tsx nu mai centrează el însuși (CRM și
          instrumentele standalone vor lățime completă) — Setări rămâne o
          coloană îngustă, centrată de propriul div, ca înainte. */}
      <div className="mx-auto max-w-xl">
        <h1 className="font-display text-2xl font-bold text-ink">{dict.title}</h1>
        <p className="mt-1 text-muted">{dict.subtitle}</p>
        <BrandingForm
          orgSlug={orgSlug}
          locale={locale}
          initialLogoUrl={access.orgLogoUrl}
          initialSlogan={access.orgSlogan}
          initialBrandColor={access.orgBrandColor}
          initialCif={access.orgCif}
          initialAdresaSediu={access.orgAdresaSediu}
          initialJudet={access.orgJudet}
          initialIban={access.orgIban}
          initialDomeniuActivitate={access.orgDomeniuActivitate}
        />
        <DomainForm orgSlug={orgSlug} locale={locale} initialCustomDomain={access.orgCustomDomain} />
      </div>

      {/* Mai lat decât restul (max-w-5xl, ca fostul paywall.tsx unde grila de
          pachete + planul à la carte au fost gândite inițial) — la max-w-xl
          (36rem) coloana de sliders + cardul de preț de 320px se înghesuiau
          una peste alta, ilizibil. */}
      <div className="mx-auto max-w-5xl">
        <AbonamentSection
          orgSlug={orgSlug}
          pachetCurent={access.orgPackage}
          statusCurent={access.orgSubscriptionStatus}
          reinnoireAutomata={reinnoireAutomata}
          facturi={facturi}
          locale={locale}
        />
      </div>

      <div className="mx-auto max-w-xl">
        <StripeDonatiiSection
          orgSlug={orgSlug}
          webhookUrl={`${webhookOrigin}/api/stripe/webhook/${orgSlug}`}
          status={stripeStatus}
          locale={locale}
        />
        <ReferralSection cod={cod} numarRecomandari={numarRecomandari} locale={locale} />
        <CanvaSection orgSlug={orgSlug} locale={locale} status={canvaStatus} feedback={canva} />
        {DPA_ACTIV && (
          <DpaSection
            orgSlug={orgSlug}
            locale={locale}
            acceptatLa={access.orgDpaAcceptedAt ? access.orgDpaAcceptedAt.toISOString() : null}
            versiuneCurenta={access.orgDpaVersion === DPA_VERSIUNE}
          />
        )}
        <section className="mt-8 rounded-xl border border-line bg-panel p-5">
          <h2 className="font-medium text-ink">Cereri GDPR ale persoanelor</h2>
          <p className="mt-1 text-xs text-muted">
            Export sau ștergere de date pentru persoane de contact, voluntari și alte persoane care nu sunt donatori.
          </p>
          <Link prefetch={false}
            href={`/${orgSlug}/setari/gdpr`}
            className="mt-3 inline-block rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink transition hover:bg-panel-2"
          >
            Deschide
          </Link>
        </section>
        {access.role === "owner" && <OrganizatieSection orgSlug={orgSlug} locale={locale} />}
      </div>
    </>
  );
}

export async function generateMetadata() {
  return { title: await titluPagina("orgSetari") };
}
