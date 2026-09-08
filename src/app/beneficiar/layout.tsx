import { and, eq } from "drizzle-orm";
import Link from "next/link";

import { logoutAction } from "@/app/(app)/[orgSlug]/actions";
import { requireBeneficiarAccess, withBeneficiarSession } from "@/lib/auth/guard";
import { fundraisingNotifications } from "@/lib/db/schema";

const NAV = [
  { href: "/beneficiar", label: "Acasă" },
  { href: "/beneficiar/calendar", label: "Calendar" },
  { href: "/beneficiar/continut-social", label: "Conținut social media" },
  { href: "/beneficiar/presa-locala", label: "Presă locală" },
  { href: "/beneficiar/grupuri", label: "Grupuri recomandate" },
  { href: "/beneficiar/sarcinile-mele", label: "Sarcinile mele" },
  { href: "/beneficiar/situatie-financiara", label: "Situație financiară" },
  { href: "/beneficiar/facturi", label: "Facturi și plăți" },
  { href: "/beneficiar/agentul-meu", label: "Agentul meu" },
  { href: "/beneficiar/notificari", label: "Notificări" },
  { href: "/beneficiar/profil", label: "Profil și securitate" },
];

const getUnreadCount = withBeneficiarSession(async (ctx) => {
  const rows = await ctx.db
    .select({ id: fundraisingNotifications.id })
    .from(fundraisingNotifications)
    .where(and(eq(fundraisingNotifications.appUserId, ctx.userId), eq(fundraisingNotifications.citit, false)));
  return rows.length;
});

export default async function BeneficiarLayout({ children }: { children: React.ReactNode }) {
  const [access, necitite] = await Promise.all([requireBeneficiarAccess(), getUnreadCount()]);

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
              Deconectare
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
              {item.label}
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
