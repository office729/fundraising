import Link from "next/link";
import Image from "next/image";
import type { CSSProperties } from "react";

import { requireOrgAccess } from "@/lib/auth/guard";
import { isAccessBlocked, trialDaysRemaining } from "@/lib/billing/trial";
import { LanguageSwitcher } from "@/components/language-switcher";
import { DASHBOARD_DICT } from "@/lib/i18n/dictionaries/dashboard";
import { getLocale } from "@/lib/i18n/get-locale";

import { logoutAction } from "./actions";
import { OnboardingBrandingGate } from "./onboarding-branding-gate";
import { Paywall } from "./paywall";

export default async function OrgLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  // Gate de acces — aruncă 404 (nu 403) dacă userul nu e membru, ca să nu
  // scurgem existența unor organizații străine. Vezi lib/auth/guard.ts.
  const access = await requireOrgAccess(orgSlug);
  const accent = access.orgBrandColor || undefined;
  const locale = await getLocale();
  const dict = DASHBOARD_DICT[locale];

  if (
    isAccessBlocked({
      createdAt: access.orgCreatedAt,
      subscriptionStatus: access.orgSubscriptionStatus,
      package: access.orgPackage,
    })
  ) {
    return (
      <Paywall
        orgSlug={orgSlug}
        orgName={access.orgName}
        status={access.orgSubscriptionStatus}
        pachetAles={access.orgPackage}
      />
    );
  }

  const zileProba = access.orgPackage === "trial" ? trialDaysRemaining(access.orgCreatedAt) : null;
  const initiale =
    (access.orgName.match(/\p{L}+/gu) ?? [])
      .slice(0, 2)
      .map((cuvant) => cuvant[0]?.toUpperCase())
      .join("") || "ONG";
  const showOnboarding = !access.orgLogoUrl && (access.role === "owner" || access.role === "admin");

  return (
    <div
      className="min-h-screen bg-canvas"
      style={accent ? ({ "--ci-brand-override": accent } as CSSProperties) : undefined}
    >
      <OnboardingBrandingGate
        show={showOnboarding}
        orgSlug={orgSlug}
        orgName={access.orgName}
        locale={locale}
        initialSlogan={access.orgSlogan}
        initialBrandColor={access.orgBrandColor}
      />
      <header className="border-b border-line bg-panel">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex min-w-0 items-center gap-4">
            <Link href={`/${orgSlug}/crm`} className="flex min-w-0 items-center gap-3">
              {access.orgLogoUrl ? (
                <Image
                  src={access.orgLogoUrl}
                  alt=""
                  width={36}
                  height={36}
                  unoptimized
                  className="h-9 w-9 shrink-0 rounded-lg border border-line bg-white object-contain"
                />
              ) : (
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg font-display text-sm font-bold text-white"
                  style={{ backgroundColor: accent || "var(--brand-blue)" }}
                >
                  {initiale}
                </span>
              )}
              <p
                className="truncate font-display text-base leading-none font-semibold text-brand-blue"
                style={accent ? { color: accent } : undefined}
              >
                {access.orgName}
              </p>
            </Link>
          </div>
          <div className="flex shrink-0 items-center gap-4">
            {zileProba != null && (
              <span className="rounded-full bg-brand-amber-soft px-3 py-1.5 text-xs font-medium text-brand-amber">
                {dict.header.trial} · {zileProba} {zileProba === 1 ? dict.header.dayLeft : dict.header.daysLeft}
              </span>
            )}
            {(access.role === "owner" || access.role === "admin") && (
              <Link
                href={`/${orgSlug}/echipa`}
                className="text-[13px] font-medium text-muted transition hover:text-brand-blue"
              >
                {dict.header.team}
              </Link>
            )}
            <Link
              href={`/${orgSlug}/setari`}
              className="text-[13px] font-medium text-muted transition hover:text-brand-blue"
            >
              {dict.header.settings}
            </Link>
            <span
              className="rounded-full border px-2.5 py-1 text-xs font-medium text-muted"
              style={accent ? { borderColor: accent } : undefined}
            >
              {dict.header.roles[access.role as keyof typeof dict.header.roles] ?? access.role}
            </span>
            <LanguageSwitcher locale={locale} />
            <form action={logoutAction}>
              <button
                type="submit"
                className="text-[13px] font-medium text-muted transition hover:text-brand-blue"
              >
                {dict.header.logout}
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
