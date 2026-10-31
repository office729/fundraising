import { and, eq } from "drizzle-orm";

import { withBeneficiarSession } from "@/lib/auth/guard";
import { fundraisingGroupPostingHistory, fundraisingLocalGroups } from "@/lib/db/schema";
import { BENEFICIAR_PORTAL_UI_DICT } from "@/lib/i18n/dictionaries/beneficiar-portal-ui";
import { getLocale } from "@/lib/i18n/get-locale";

import { GrupuriList } from "./grupuri-list";

const getGrupuri = withBeneficiarSession(async (ctx) => {
  const grupuri = ctx.campaignJudet
    ? await ctx.db
        .select()
        .from(fundraisingLocalGroups)
        .where(
          and(
            eq(fundraisingLocalGroups.orgId, ctx.orgId),
            eq(fundraisingLocalGroups.judet, ctx.campaignJudet),
            eq(fundraisingLocalGroups.status, "activ"),
          ),
        )
    : [];

  const publicate = await ctx.db
    .select({ groupId: fundraisingGroupPostingHistory.groupId })
    .from(fundraisingGroupPostingHistory)
    .where(eq(fundraisingGroupPostingHistory.campaignPageId, ctx.campaignPageId));

  return { grupuri, publicateIds: publicate.map((p) => p.groupId) };
});

export default async function BeneficiarGrupuriPage() {
  const { grupuri, publicateIds } = await getGrupuri();
  const locale = await getLocale();
  const t = BENEFICIAR_PORTAL_UI_DICT[locale].grupuri;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-bold text-ink">{t.titlu}</h1>
        <p className="mt-1 text-[13px] text-muted-2">{t.desc}</p>
      </div>

      {grupuri.length ? (
        <GrupuriList
          locale={locale}
          grupuri={grupuri.map((g) => ({ id: g.id, nume: g.nume, platforma: g.platforma, link: g.link, localitate: g.localitate }))}
          publicateIds={publicateIds}
        />
      ) : (
        <div className="rounded-xl border border-line bg-panel p-6 text-center">
          <p className="text-[13.5px] text-muted-2">{t.gol}</p>
        </div>
      )}
    </div>
  );
}
