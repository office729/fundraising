import { getAuthUser, getMyOrgSlug } from "@/lib/auth/dal";
import { getLocale } from "@/lib/i18n/get-locale";
import { MARKETING_DICT } from "@/lib/i18n/dictionaries/marketing";

import { SiteFooter, SiteHeader, TopBar } from "./chrome";

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const dict = MARKETING_DICT[locale];
  // Utilizatorul logat, cu organizație, vede în antet un buton spre platformă în loc de „Autentificare / Începe gratuit”.
  const orgSlug = (await getAuthUser().catch(() => null)) ? await getMyOrgSlug().catch(() => null) : null;

  return (
    <div className="min-h-screen">
      <TopBar dict={dict} locale={locale} />
      <SiteHeader dict={dict} panouHref={orgSlug ? `/${orgSlug}/crm` : null} />
      {children}
      <SiteFooter dict={dict} />
    </div>
  );
}
