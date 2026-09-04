import { redirect } from "next/navigation";

import { requireOrgAccess } from "@/lib/auth/guard";
import { getLocale } from "@/lib/i18n/get-locale";
import { SETARI_ECHIPA_DICT } from "@/lib/i18n/dictionaries/setari-echipa";

import { BrandingForm } from "./branding-form";
import { DomainForm } from "./domain-form";

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

  return (
    <div className="max-w-xl">
      <h1 className="font-display text-2xl font-bold text-ink">{dict.title}</h1>
      <p className="mt-1 text-muted">{dict.subtitle}</p>
      <BrandingForm
        orgSlug={orgSlug}
        locale={locale}
        initialLogoUrl={access.orgLogoUrl}
        initialSlogan={access.orgSlogan}
        initialBrandColor={access.orgBrandColor}
      />
      <DomainForm orgSlug={orgSlug} locale={locale} initialCustomDomain={access.orgCustomDomain} />
    </div>
  );
}
