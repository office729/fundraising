import { getAuthUser, getMyOrgSlug } from "@/lib/auth/dal";
import { isPlatformAdmin } from "@/lib/billing/trial";
import { getLocale } from "@/lib/i18n/get-locale";
import { MARKETING_DICT } from "@/lib/i18n/dictionaries/marketing";

import { BaraPrelansare } from "./bara-prelansare";
import { SiteFooter, SiteHeader, TopBar } from "./chrome";
import { PopupInscriere } from "./popup-inscriere";

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const dict = MARKETING_DICT[locale];
  // Utilizatorul logat, cu organizație, vede în antet un buton spre platformă în loc de „Autentificare / Începe gratuit”.
  const authUser = await getAuthUser().catch(() => null);
  const orgSlug = authUser ? await getMyOrgSlug().catch(() => null) : null;

  return (
    <div className="min-h-screen">
      <BaraPrelansare admin={isPlatformAdmin(authUser?.email)} />
      <TopBar dict={dict} locale={locale} />
      <SiteHeader dict={dict} panouHref={orgSlug ? `/${orgSlug}/crm` : null} />
      {children}
      <SiteFooter dict={dict} />
      {/* Pop-up de înscriere pentru ONG-uri: după lansare și 20 de secunde pe site; nu apare utilizatorilor autentificați. */}
      <PopupInscriere ascuns={Boolean(authUser)} />
    </div>
  );
}
