import { and, eq } from "drizzle-orm";

import { withBeneficiarSession } from "@/lib/auth/guard";
import { fundraisingGroupPostingHistory, fundraisingLocalGroups } from "@/lib/db/schema";

import { GrupuriList } from "./grupuri-list";

const getGrupuri = withBeneficiarSession(async (ctx) => {
  const grupuri = ctx.campaignJudet
    ? await ctx.db
        .select()
        .from(fundraisingLocalGroups)
        .where(and(eq(fundraisingLocalGroups.judet, ctx.campaignJudet), eq(fundraisingLocalGroups.status, "activ")))
    : [];

  const publicate = await ctx.db
    .select({ groupId: fundraisingGroupPostingHistory.groupId })
    .from(fundraisingGroupPostingHistory)
    .where(eq(fundraisingGroupPostingHistory.campaignPageId, ctx.campaignPageId));

  return { grupuri, publicateIds: publicate.map((p) => p.groupId) };
});

export default async function BeneficiarGrupuriPage() {
  const { grupuri, publicateIds } = await getGrupuri();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-bold text-ink">Grupuri recomandate</h1>
        <p className="mt-1 text-[13px] text-muted-2">Grupuri locale Facebook și WhatsApp unde poți distribui campania.</p>
      </div>

      {grupuri.length ? (
        <GrupuriList
          grupuri={grupuri.map((g) => ({ id: g.id, nume: g.nume, platforma: g.platforma, link: g.link, localitate: g.localitate }))}
          publicateIds={publicateIds}
        />
      ) : (
        <div className="rounded-xl border border-line bg-panel p-6 text-center">
          <p className="text-[13.5px] text-muted-2">Nu există încă grupuri recomandate pentru zona campaniei tale.</p>
        </div>
      )}
    </div>
  );
}
