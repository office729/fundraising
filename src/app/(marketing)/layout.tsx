import { getLocale } from "@/lib/i18n/get-locale";
import { MARKETING_DICT } from "@/lib/i18n/dictionaries/marketing";

import { CtaBand, SiteFooter, SiteHeader, TopBar } from "./chrome";

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const dict = MARKETING_DICT[locale];

  return (
    <div className="min-h-screen">
      <TopBar dict={dict} locale={locale} />
      <SiteHeader dict={dict} />
      {children}
      <CtaBand dict={dict} />
      <SiteFooter dict={dict} />
    </div>
  );
}
