import { desc, eq } from "drizzle-orm";

import { withBeneficiarSession } from "@/lib/auth/guard";
import { fundraisingNotifications } from "@/lib/db/schema";
import { BENEFICIAR_PORTAL_UI_DICT } from "@/lib/i18n/dictionaries/beneficiar-portal-ui";
import { getLocale } from "@/lib/i18n/get-locale";

import { NotificariList } from "./notificari-list";

const getNotificari = withBeneficiarSession(async (ctx) => {
  return ctx.db
    .select()
    .from(fundraisingNotifications)
    .where(eq(fundraisingNotifications.appUserId, ctx.userId))
    .orderBy(desc(fundraisingNotifications.createdAt))
    .limit(100);
});

export default async function NotificariPage() {
  const notificari = await getNotificari();
  const locale = await getLocale();
  const t = BENEFICIAR_PORTAL_UI_DICT[locale].notificari;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-bold text-ink">{t.titlu}</h1>
        <p className="mt-1 text-[13px] text-muted-2">{t.desc}</p>
      </div>

      {notificari.length ? (
        <NotificariList locale={locale} notificari={notificari.map((n) => ({ id: n.id, titlu: n.titlu, continut: n.continut, link: n.link, citit: n.citit, createdAt: n.createdAt.toISOString() }))} />
      ) : (
        <div className="rounded-xl border border-line bg-panel p-6 text-center">
          <p className="text-[13.5px] text-muted-2">{t.gol}</p>
        </div>
      )}
    </div>
  );
}
