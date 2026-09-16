import { redirect } from "next/navigation";

import { requireOrgAccess } from "@/lib/auth/guard";
import { getLocale } from "@/lib/i18n/get-locale";
import { SETARI_ECHIPA_DICT } from "@/lib/i18n/dictionaries/setari-echipa";

import { AbonamentSection } from "./abonament-section";
import { BrandingForm } from "./branding-form";
import { DomainForm } from "./domain-form";
import { obtineDateReferral } from "./referral-actions";
import { ReferralSection } from "./referral-section";

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

  return (
    // mx-auto: <main> din layout.tsx nu mai centrează el însuși (CRM și
    // instrumentele standalone vor lățime completă) — Setări rămâne o
    // coloană îngustă, centrată de propriul div, ca înainte.
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
      <AbonamentSection orgSlug={orgSlug} pachetCurent={access.orgPackage} statusCurent={access.orgSubscriptionStatus} locale={locale} />
      <ReferralSection cod={cod} numarRecomandari={numarRecomandari} locale={locale} />
    </div>
  );
}
