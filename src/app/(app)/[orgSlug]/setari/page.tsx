import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { requireOrgAccess } from "@/lib/auth/guard";
import { getLocale } from "@/lib/i18n/get-locale";
import { SETARI_ECHIPA_DICT } from "@/lib/i18n/dictionaries/setari-echipa";

import { AbonamentSection } from "./abonament-section";
import { BrandingForm } from "./branding-form";
import { DomainForm } from "./domain-form";
import { obtineDateReferral } from "./referral-actions";
import { ReferralSection } from "./referral-section";
import { obtineStatusStripeDonatii } from "./stripe-donatii-actions";
import { StripeDonatiiSection } from "./stripe-donatii-section";
import { titluPagina } from "@/lib/page-titles";

export default async function SetariPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const access = await requireOrgAccess(orgSlug);
  const locale = await getLocale();
  const dict = SETARI_ECHIPA_DICT[locale].orgSetari;

  if (access.role !== "owner" && access.role !== "admin") {
    redirect(`/${orgSlug}`);
  }

  const { cod, numarRecomandari } = await obtineDateReferral(orgSlug);
  const stripeStatus = await obtineStatusStripeDonatii(orgSlug);
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
          initialDomeniuActivitate={access.orgDomeniuActivitate}
        />
        <DomainForm orgSlug={orgSlug} locale={locale} initialCustomDomain={access.orgCustomDomain} />
      </div>

      {/* Mai lat decât restul (max-w-5xl, ca fostul paywall.tsx unde grila de
          pachete + planul à la carte au fost gândite inițial) — la max-w-xl
          (36rem) coloana de sliders + cardul de preț de 320px se înghesuiau
          una peste alta, ilizibil. */}
      <div className="mx-auto max-w-5xl">
        <AbonamentSection orgSlug={orgSlug} pachetCurent={access.orgPackage} statusCurent={access.orgSubscriptionStatus} locale={locale} />
      </div>

      <div className="mx-auto max-w-xl">
        <StripeDonatiiSection orgSlug={orgSlug} webhookUrl={`${webhookOrigin}/api/stripe/webhook/${orgSlug}`} status={stripeStatus} />
        <ReferralSection cod={cod} numarRecomandari={numarRecomandari} locale={locale} />
      </div>
    </>
  );
}

export async function generateMetadata() {
  return { title: await titluPagina("orgSetari") };
}
