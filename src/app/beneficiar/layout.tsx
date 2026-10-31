import { and, eq } from "drizzle-orm";
import Link from "next/link";

import { logoutAction } from "@/app/(app)/[orgSlug]/actions";
import { TermeniGate } from "@/components/termeni-gate";
import { requireBeneficiarAccess, withBeneficiarSession } from "@/lib/auth/guard";
import { fundraisingNotifications } from "@/lib/db/schema";
import { BENEFICIAR_PORTAL_UI_DICT } from "@/lib/i18n/dictionaries/beneficiar-portal-ui";
import { DASHBOARD_DICT } from "@/lib/i18n/dictionaries/dashboard";
import { getLocale } from "@/lib/i18n/get-locale";
import { TERMENI_VERSIUNE } from "@/lib/legal-version";

import { acceptaTermeniBeneficiarAction } from "./actions";

const NAV = [
  { href: "/beneficiar", cheie: "acasa" },
  { href: "/beneficiar/calendar", cheie: "calendar" },
  { href: "/beneficiar/continut-social", cheie: "continutSocial" },
  { href: "/beneficiar/presa-locala", cheie: "presaLocala" },
  { href: "/beneficiar/grupuri", cheie: "grupuri" },
  { href: "/beneficiar/sarcinile-mele", cheie: "sarcinile" },
  { href: "/beneficiar/situatie-financiara", cheie: "situatie" },
  { href: "/beneficiar/facturi", cheie: "facturi" },
  { href: "/beneficiar/agentul-meu", cheie: "agent" },
  { href: "/beneficiar/notificari", cheie: "notificari" },
  { href: "/beneficiar/profil", cheie: "profil" },
] as const;

const getUnreadCount = withBeneficiarSession(async (ctx) => {
  const rows = await ctx.db
    .select({ id: fundraisingNotifications.id })
    .from(fundraisingNotifications)
    .where(and(eq(fundraisingNotifications.appUserId, ctx.userId), eq(fundraisingNotifications.citit, false)));
  return rows.length;
});

export default async function BeneficiarLayout({ children }: { children: React.ReactNode }) {
  const [access, necitite, locale] = await Promise.all([requireBeneficiarAccess(), getUnreadCount(), getLocale()]);
  const t = BENEFICIAR_PORTAL_UI_DICT[locale];

  // Poartă de reacceptare a Termenilor/Politicii.
  if (access.userTermsVersion !== TERMENI_VERSIUNE) {
    return <TermeniGate actiune={acceptaTermeniBeneficiarAction} dict={DASHBOARD_DICT[locale].termeniGate} />;
  }

  return (
    <div className="min-h-screen bg-panel-2">
      <header className="border-b border-line bg-panel">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <div>
            <p className="font-display text-sm font-bold text-ink">{access.campaignTitlu}</p>
            <p className="text-[12px] text-muted-2">{access.orgName}</p>
          </div>
          <form action={logoutAction}>
            <button type="submit" className="text-[13px] font-medium text-muted hover:text-brand-blue">
              {t.nav.deconectare}
            </button>
          </form>
        </div>
        <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-6 pb-2">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="shrink-0 rounded-md px-3 py-1.5 text-[13px] font-medium text-body transition hover:bg-panel-2 hover:text-ink"
            >
              {t.nav[item.cheie]}
              {item.href === "/beneficiar/notificari" && necitite > 0 && (
                <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-green px-1 text-[10px] font-bold text-white">
                  {necitite}
                </span>
              )}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
