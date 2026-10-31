import { and, eq } from "drizzle-orm";

import { withBeneficiarSession } from "@/lib/auth/guard";
import { fundraisingMediaContacts, fundraisingPressReleases } from "@/lib/db/schema";
import { BENEFICIAR_PORTAL_UI_DICT } from "@/lib/i18n/dictionaries/beneficiar-portal-ui";
import { getLocale } from "@/lib/i18n/get-locale";

const getPresa = withBeneficiarSession(async (ctx) => {
  const comunicatRows = await ctx.db
    .select()
    .from(fundraisingPressReleases)
    .where(and(eq(fundraisingPressReleases.campaignPageId, ctx.campaignPageId), eq(fundraisingPressReleases.status, "aprobat")))
    .limit(1);

  const contacte = ctx.campaignJudet
    ? await ctx.db
        .select()
        .from(fundraisingMediaContacts)
        .where(and(eq(fundraisingMediaContacts.orgId, ctx.orgId), eq(fundraisingMediaContacts.judet, ctx.campaignJudet)))
    : [];

  return { comunicat: comunicatRows[0] ?? null, contacte };
});

export default async function BeneficiarPresaLocalaPage() {
  const { comunicat, contacte } = await getPresa();
  const t = BENEFICIAR_PORTAL_UI_DICT[await getLocale()].presa;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-bold text-ink">{t.titlu}</h1>
        <p className="mt-1 text-[13px] text-muted-2">{t.desc}</p>
      </div>

      <div className="rounded-xl border border-line bg-panel p-4">
        <h2 className="font-display text-sm font-bold text-ink">{t.comunicat}</h2>
        {comunicat ? (
          <p className="mt-2 whitespace-pre-wrap text-[13px] text-body">{comunicat.continut}</p>
        ) : (
          <p className="mt-2 text-[13px] text-muted-2">{t.faraComunicat}</p>
        )}
      </div>

      <div>
        <h2 className="font-display text-sm font-bold text-ink">{t.contacte}</h2>
        {contacte.length ? (
          <div className="mt-2 flex flex-col gap-2">
            {contacte.map((c) => (
              <div key={c.id} className="rounded-xl border border-line bg-panel p-4">
                <p className="text-[13px] font-medium text-ink">{c.numeRedactie}</p>
                <p className="mt-0.5 text-[12px] text-muted-2">
                  {c.email || t.faraEmail}
                  {c.telefon ? ` · ${c.telefon}` : ""}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-[13px] text-muted-2">{t.faraContacte}</p>
        )}
      </div>
    </div>
  );
}
