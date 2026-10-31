import { eq } from "drizzle-orm";

import { withBeneficiarSession } from "@/lib/auth/guard";
import { fundraisingGeneratedContent } from "@/lib/db/schema";
import { BENEFICIAR_PORTAL_UI_DICT } from "@/lib/i18n/dictionaries/beneficiar-portal-ui";
import { getLocale } from "@/lib/i18n/get-locale";

// RLS (fundraising_generated_content_beneficiar_select) filtrează deja doar
// materialele cu status 'aprobat'/'publicat' — nu mai e nevoie de un WHERE
// suplimentar aici, draft-urile nu ajung niciodată în acest SELECT.
const getContinut = withBeneficiarSession(async (ctx) => {
  return ctx.db.select().from(fundraisingGeneratedContent).where(eq(fundraisingGeneratedContent.campaignPageId, ctx.campaignPageId));
});

export default async function BeneficiarContinutSocialPage() {
  const items = await getContinut();
  const t = BENEFICIAR_PORTAL_UI_DICT[await getLocale()].social;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-bold text-ink">{t.titlu}</h1>
        <p className="mt-1 text-[13px] text-muted-2">{t.desc}</p>
      </div>

      {items.length ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {items.map((it) => (
            <div key={it.id} className="rounded-xl border border-line bg-panel p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[13px] font-semibold text-ink">{t.canale[it.canal] ?? it.canal}</span>
                {it.status === "publicat" && (
                  <span className="rounded-full bg-brand-green-soft px-2.5 py-0.5 text-[11px] font-medium text-brand-green">{t.publicat}</span>
                )}
              </div>
              {it.titlu && <p className="mt-1.5 text-[13px] font-medium text-ink">{it.titlu}</p>}
              <p className="mt-1.5 whitespace-pre-wrap text-[13px] text-body">{it.textComplet}</p>
              {it.indemn && <p className="mt-2 text-[12px] italic text-muted-2">{it.indemn}</p>}
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-line bg-panel p-6 text-center">
          <p className="text-[13.5px] text-muted-2">{t.gol}</p>
        </div>
      )}
    </div>
  );
}
