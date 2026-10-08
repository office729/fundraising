import { headers } from "next/headers";
import Link from "next/link";

import { requireOrgAccess } from "@/lib/auth/guard";
import { getLocale } from "@/lib/i18n/get-locale";
import { SETARI_ECHIPA_DICT } from "@/lib/i18n/dictionaries/setari-echipa";

import { AbonamentSection } from "./abonament-section";
import { listeazaFacturiAction } from "../billing-actions";
import { BrandingForm } from "./branding-form";
import { DomainForm } from "./domain-form";
import { obtineStatusReinnoireAutomata } from "./netopia-card-actions";
import { obtineDateReferral } from "./referral-actions";
import { ReferralSection } from "./referral-section";
import { DPA_ACTIV, DPA_VERSIUNE } from "@/lib/legal-version";

import { DpaSection } from "./dpa-section";
import { obtineStatusStripeDonatii } from "./stripe-donatii-actions";
import { StripeDonatiiSection } from "./stripe-donatii-section";

// Corpul paginii de setări ale organizației (logo, adresă, abonament, plăți donații etc.) — afișat în CRM → Setări
// (crm/setari/page.tsx), doar pentru owner/admin. Vechiul /setari redirecționează acolo.
export async function SetariContinut({ orgSlug }: { orgSlug: string }) {
  const access = await requireOrgAccess(orgSlug);
  const locale = await getLocale();
  const dict = SETARI_ECHIPA_DICT[locale].orgSetari;

  // Patru citiri independente (fiecare cu propria tranzacție): rulează împreună, nu una după alta.
  const [{ cod, numarRecomandari }, facturi, stripeStatus, reinnoireAutomata] = await Promise.all([
    obtineDateReferral(orgSlug),
    listeazaFacturiAction(orgSlug),
    obtineStatusStripeDonatii(orgSlug),
    obtineStatusReinnoireAutomata(orgSlug),
  ]);
  const hdrs = await headers();
  const webhookOrigin = `${hdrs.get("x-forwarded-proto") ?? "https"}://${hdrs.get("x-forwarded-host") ?? hdrs.get("host")}`;

  return (
    <>
      {/* mx-auto: <main> din layout.tsx nu mai centrează el însuși (CRM și
          instrumentele standalone vor lățime completă) — Setări rămâne o
          coloană îngustă, centrată de propriul div, ca înainte. */}
      <div>
        <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">{dict.title}</h1>
        <p className="mt-0.5 text-[13px] text-[var(--ci-text-muted)]">{dict.subtitle}</p>
        <nav aria-label={locale === "ro" ? "Secțiunile paginii" : "Page sections"} className="mt-3 flex flex-wrap gap-2 text-[13px]">
          {[
            ["identitate", locale === "ro" ? "Logo și culori" : "Logo and colors"],
            ["adresa", locale === "ro" ? "Adresa în platformă" : "Platform address"],
            ["abonament", locale === "ro" ? "Abonament și facturi" : "Subscription and invoices"],
            ["plati-donatii", locale === "ro" ? "Plăți donații" : "Donation payments"],
            ["recomanda", locale === "ro" ? "Recomandă" : "Refer"],
            ...(DPA_ACTIV ? [["dpa", locale === "ro" ? "Acord date (DPA)" : "Data agreement (DPA)"]] : []),
            ["roluri-integrari", locale === "ro" ? "Roluri și integrări" : "Roles and integrations"],
          ].map(([id, label]) => (
            <a key={id} href={`#${id}`} className="rounded-full border border-[var(--ci-border)] bg-[var(--ci-surface)] px-3 py-1.5 font-medium text-[var(--ci-text)] transition hover:bg-[var(--ci-surface-2)]">
              {label}
            </a>
          ))}
        </nav>
      </div>

      {/* Panou cu fundalul și culorile temei (nu ale CRM): secțiunile vechi folosesc culorile temei platformei și ar fi ilizibile pe fundalul deschis al CRM în tema întunecată. */}
      <div className="rounded-2xl border border-line bg-canvas p-5 text-body sm:p-8">
      <div id="identitate" className="scroll-mt-4" />
      <div className="mx-auto max-w-xl">
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
          webhookUrl={`${webhookOrigin}/api/stripe/webhook/${access.orgId}`}
          status={stripeStatus}
          locale={locale}
        />
        <ReferralSection cod={cod} numarRecomandari={numarRecomandari} locale={locale} />
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
      </div>
      </div>
    </>
  );
}
