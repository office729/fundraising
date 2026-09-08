import { asc, eq } from "drizzle-orm";

import { withBeneficiarSession } from "@/lib/auth/guard";
import { fundraisingCalendarItems } from "@/lib/db/schema";

const STATUS_LABEL: Record<string, string> = {
  de_facut: "De făcut",
  in_lucru: "În lucru",
  publicat: "Publicat",
  finalizat: "Finalizat",
};

const getCalendar = withBeneficiarSession(async (ctx) => {
  return ctx.db
    .select()
    .from(fundraisingCalendarItems)
    .where(eq(fundraisingCalendarItems.campaignPageId, ctx.campaignPageId))
    .orderBy(asc(fundraisingCalendarItems.ziua));
});

export default async function BeneficiarCalendarPage() {
  const items = await getCalendar();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-bold text-ink">Calendar campanie</h1>
        <p className="mt-1 text-[13px] text-muted-2">Zilele pregătite de echipă pentru promovarea campaniei tale.</p>
      </div>

      {items.length ? (
        <div className="flex flex-col gap-3">
          {items.map((it) => (
            <div key={it.id} className="rounded-xl border border-line bg-panel p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[13px] font-semibold text-ink">
                  {new Date(it.ziua).toLocaleDateString("ro-RO", { day: "numeric", month: "long" })} · {it.obiectiv}
                </span>
                <span className="rounded-full bg-panel-2 px-2.5 py-0.5 text-[11px] font-medium text-muted">
                  {STATUS_LABEL[it.status] ?? it.status}
                </span>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-[13.5px] text-body">{it.textPregatit}</p>
              {it.observatiiAgent && (
                <p className="mt-2 border-t border-line pt-2 text-[12.5px] text-muted-2">
                  Notă de la agent: {it.observatiiAgent}
                </p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-line bg-panel p-6 text-center">
          <p className="text-[13.5px] text-muted-2">Echipa nu a pregătit încă un calendar pentru campania ta.</p>
        </div>
      )}
    </div>
  );
}
