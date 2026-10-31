import { urlsSemnate } from "@/lib/fisiere-private";
import { asc, eq, inArray } from "drizzle-orm";

import { withBeneficiarSession } from "@/lib/auth/guard";
import { fundraisingTaskAttachments, fundraisingTasks } from "@/lib/db/schema";
import { BENEFICIAR_PORTAL_UI_DICT } from "@/lib/i18n/dictionaries/beneficiar-portal-ui";
import { getLocale } from "@/lib/i18n/get-locale";

import { SarciniList } from "./sarcini-list";

const getSarcini = withBeneficiarSession(async (ctx) => {
  const taskuri = await ctx.db
    .select()
    .from(fundraisingTasks)
    .where(eq(fundraisingTasks.campaignPageId, ctx.campaignPageId))
    .orderBy(asc(fundraisingTasks.dataLimita));

  const taskIds = taskuri.map((t) => t.id);
  const attachments = taskIds.length
    ? await ctx.db.select().from(fundraisingTaskAttachments).where(inArray(fundraisingTaskAttachments.taskId, taskIds))
    : [];

  return { taskuri, attachments };
});

export default async function SarcinileMelePage() {
  const { taskuri, attachments: atasamenteBrute } = await getSarcini();
  const attachments = await urlsSemnate(atasamenteBrute);
  const locale = await getLocale();
  const t = BENEFICIAR_PORTAL_UI_DICT[locale].sarcini;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-bold text-ink">{t.titlu}</h1>
        <p className="mt-1 text-[13px] text-muted-2">{t.desc}</p>
      </div>

      {taskuri.length ? (
        <SarciniList
          locale={locale}
          taskuri={taskuri.map((t) => ({
            id: t.id,
            tip: t.tip,
            titlu: t.titlu,
            descriere: t.descriere,
            dataLimita: t.dataLimita,
            status: t.status,
            companie: t.companie,
            suma: t.suma,
            textMultumire: t.textMultumire,
            canalRecomandat: t.canalRecomandat,
            attachments: attachments.filter((a) => a.taskId === t.id).map((a) => ({ id: a.id, fisierUrl: a.fisierUrl, denumire: a.denumire })),
          }))}
        />
      ) : (
        <div className="rounded-xl border border-line bg-panel p-6 text-center">
          <p className="text-[13.5px] text-muted-2">{t.gol}</p>
        </div>
      )}
    </div>
  );
}
