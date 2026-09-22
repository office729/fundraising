import Link from "next/link";
import Image from "next/image";
import type { CSSProperties } from "react";

import { requireOrgAccess } from "@/lib/auth/guard";
import { isAccessBlocked, isPlatformAdmin, trialDaysRemaining } from "@/lib/billing/trial";
import { LanguageSwitcher } from "@/components/language-switcher";
import { DASHBOARD_DICT } from "@/lib/i18n/dictionaries/dashboard";
import { getLocale } from "@/lib/i18n/get-locale";

import { LogoutForm } from "./logout-form";
import { OnboardingBrandingGate } from "./onboarding-branding-gate";
import { OnboardingCallPrompt } from "./onboarding-call-prompt";
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
    isAccessBlocked(
      {
        createdAt: access.orgCreatedAt,
        subscriptionStatus: access.orgSubscriptionStatus,
        package: access.orgPackage,
        currentPeriodEnd: access.orgCurrentPeriodEnd,
      },
      access.userEmail,
    )
  ) {
    return <Paywall orgSlug={orgSlug} orgName={access.orgName} />;
  }

  const zileProba =
    access.orgPackage === "trial" && !isPlatformAdmin(access.userEmail) ? trialDaysRemaining(access.orgCreatedAt) : null;
  const initiale =
    (access.orgName.match(/\p{L}+/gu) ?? [])
      .slice(0, 2)
      .map((cuvant) => cuvant[0]?.toUpperCase())
      .join("") || "ONG";
  const showOnboarding = !access.orgLogoUrl && (access.role === "owner" || access.role === "admin");

  return (
    <div
      className="min-h-screen bg-canvas"
      data-domeniu={access.orgDomeniuActivitate ?? undefined}
      style={accent ? ({ "--ci-brand-override": accent } as CSSProperties) : undefined}
    >
      <OnboardingBrandingGate
        show={showOnboarding}
        orgSlug={orgSlug}
        orgName={access.orgName}
        locale={locale}
        initialSlogan={access.orgSlogan}
        initialBrandColor={access.orgBrandColor}
        initialCif={access.orgCif}
        initialDomeniuActivitate={access.orgDomeniuActivitate}
      />
      <header className="border-b border-line bg-panel">
        {/* Fără max-w — bară pe toată lățimea, la fel ca <main> de mai jos
            (vezi comentariul de-acolo). flex-wrap: pe ecran îngust (telefon),
            grupul din dreapta (trial/Echipă/Setări/rol/limbă/Deconectare —
            6 elemente, prea multe pentru o linie sub ~640px) trece pe rândul
            următor în loc să se suprapună peste siglă+nume, ca înainte. */}
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
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
                  style={{ backgroundColor: accent || "var(--brand-solid)" }}
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
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 sm:gap-4">
            {zileProba != null && (
              // Culori FIXE (nu --brand-amber/-soft) — indicator de status, nu
              // element de branding: cele două variante domeniu erau aceeași
              // nuanță (accent pe fundal deschis din aceeași nuanță), ceea ce
              // ținea contrastul mereu sub pragul WCAG AA (~1.5–3.3:1 după
              // domeniu). amber-100/amber-900 (Tailwind, neschimbate de temă)
              // păstrează contrastul bun indiferent de domeniu sau mod dark.
              <span className="rounded-full bg-amber-100 px-3 py-1.5 text-xs font-medium text-amber-900 dark:bg-amber-950 dark:text-amber-200">
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
            {isPlatformAdmin(access.userEmail) && (
              <Link
                href="/platform-admin"
                className="text-[13px] font-medium text-muted transition hover:text-brand-blue"
                title="Doar contul platformei"
              >
                DB
              </Link>
            )}
            <span
              className="rounded-full border px-2.5 py-1 text-xs font-medium text-muted"
              style={accent ? { borderColor: accent } : undefined}
            >
              {dict.header.roles[access.role as keyof typeof dict.header.roles] ?? access.role}
            </span>
            <LanguageSwitcher locale={locale} />
            <LogoutForm className="text-[13px] font-medium text-muted transition hover:text-brand-blue">{dict.header.logout}</LogoutForm>
          </div>
        </div>
      </header>
      {/* Fără max-w aici — CRM și instrumentele standalone (comunicate,
          newsletter-pf/-pj, grupuri-facebook, program-lucru, prospectare,
          crm-pj, crm-voluntari) vor lățimea completă a ecranului, nu doar
          1024px (max-w-5xl îngusta tot ecranul pe monitoare late, sidebar
          CRM inclus). Setări/Echipă își păstrează coloana îngustă prin
          propriul div (max-w-xl/-2xl, cu mx-auto acolo) — vezi
          setari/page.tsx și echipa/page.tsx. */}
      <main className="px-4 py-6 sm:px-6 sm:py-8">
        <OnboardingCallPrompt show={showOnboarding} orgSlug={orgSlug} dict={dict.onboardingCall} />
        {children}
      </main>
    </div>
  );
}
