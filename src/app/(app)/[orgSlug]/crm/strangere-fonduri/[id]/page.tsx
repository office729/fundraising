import { and, desc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";

import { withOrgSession } from "@/lib/auth/guard";
import { fundraisingDonations, fundraisingPages, fundraisingUpdates } from "@/lib/db/schema";

import { Badge } from "../../components/ui/badge";
import { Breadcrumb } from "../../components/ui/breadcrumb";
import { Card, CardHeader } from "../../components/ui/card";
import { EmptyState } from "../../components/ui/states";
import { formatDataOra } from "../../lib/format";
import { getLocale } from "@/lib/i18n/get-locale";
import { STRANGERE_FONDURI_DICT } from "@/lib/i18n/dictionaries/strangere-fonduri";
import { AddUpdateButton, CopyPageLinkButton, DeleteUpdateButton, ImageUploadCard, ToggleStatusButton } from "../client";

const STATUS_TONE = { in_asteptare: "amber", reusita: "green", esuata: "red", rambursata: "orange" } as const;

const getPaginaSiDonatii = withOrgSession(async (ctx, id: string) => {
  const pagina = await ctx.db
    .select()
    .from(fundraisingPages)
    .where(and(eq(fundraisingPages.id, id), eq(fundraisingPages.orgId, ctx.orgId)))
    .limit(1);
  if (!pagina[0]) return null;

  const donatii = await ctx.db
    .select()
    .from(fundraisingDonations)
    .where(eq(fundraisingDonations.pageId, id))
    .orderBy(desc(fundraisingDonations.createdAt))
    .limit(300);

  const actualizari = await ctx.db
    .select()
    .from(fundraisingUpdates)
    .where(eq(fundraisingUpdates.pageId, id))
    .orderBy(desc(fundraisingUpdates.createdAt));

  return { pagina: pagina[0], donatii, actualizari };
});

export default async function PaginaDetaliuPage({ params }: { params: Promise<{ orgSlug: string; id: string }> }) {
  const { orgSlug, id } = await params;
  const data = await getPaginaSiDonatii(orgSlug, id);
  if (!data) notFound();

  const { pagina, donatii, actualizari } = data;
  const locale = await getLocale();
  const dict = STRANGERE_FONDURI_DICT[locale];
  const dictDetail = dict.detail;

  return (
    <div className="mx-auto max-w-[1100px] space-y-5">
      <Breadcrumb
        items={[{ label: dict.breadcrumb, href: `/${orgSlug}/crm/strangere-fonduri` }, { label: pagina.titlu }]}
      />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">{pagina.titlu}</h1>
            <Badge tone={pagina.status === "activa" ? "green" : "neutral"} icon={false}>
              {pagina.status === "activa" ? dict.page.activa : dict.page.inchisa}
            </Badge>
          </div>
          <p className="mt-0.5 text-[13px] text-[var(--ci-text-muted)]">
            {dictDetail.organizatDe(pagina.numeCreator, pagina.emailCreator)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CopyPageLinkButton orgSlug={orgSlug} pageSlug={pagina.slug} />
          <ToggleStatusButton orgSlug={orgSlug} id={pagina.id} status={pagina.status} />
        </div>
      </div>

      <ImageUploadCard orgSlug={orgSlug} pageId={pagina.id} imagineUrl={pagina.imagineUrl} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Card>
          <p className="text-[12px] text-[var(--ci-text-muted)]">{dictDetail.strans}</p>
          <p className="ci-tabular mt-1 text-xl font-bold text-[var(--ci-text)]">{pagina.sumaStransa.toLocaleString("ro-RO")} lei</p>
        </Card>
        {pagina.sumaTinta && (
          <Card>
            <p className="text-[12px] text-[var(--ci-text-muted)]">{dictDetail.tinta}</p>
            <p className="ci-tabular mt-1 text-xl font-bold text-[var(--ci-text)]">{pagina.sumaTinta.toLocaleString("ro-RO")} lei</p>
          </Card>
        )}
        <Card>
          <p className="text-[12px] text-[var(--ci-text-muted)]">{dictDetail.donatiiReusite}</p>
          <p className="ci-tabular mt-1 text-xl font-bold text-[var(--ci-primary)]">
            {donatii.filter((d) => d.status === "reusita").length}
          </p>
        </Card>
      </div>

      <Card>
        <CardHeader title={dictDetail.donatori.title} subtitle={dictDetail.donatori.subtitle(donatii.length)} />
        {donatii.length ? (
          <div className="space-y-2">
            {donatii.map((d) => (
              <div key={d.id} className="flex items-center justify-between rounded-lg border border-[var(--ci-border)] px-3.5 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-[var(--ci-text)]">
                    {d.anonim || !d.numeDonator ? dict.page.sustinatorAnonim : d.numeDonator}
                  </p>
                  <p className="truncate text-[12px] text-[var(--ci-text-muted)]">
                    {d.emailDonator || dictDetail.faraEmail} · {formatDataOra(d.createdAt.toISOString())}
                    {d.mesaj ? ` · „${d.mesaj}"` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {d.recurenta && !d.abonamentActiv && (
                    <Badge tone="neutral" icon={false}>
                      {dictDetail.abonamentOprit}
                    </Badge>
                  )}
                  <Badge tone={STATUS_TONE[d.status]} icon={false}>
                    {dictDetail.statusLabel[d.status]}
                  </Badge>
                  <span className="ci-tabular text-[13px] font-semibold text-[var(--ci-text)]">{d.suma.toLocaleString("ro-RO")} lei</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title={dictDetail.niciodonatie.title} description={dictDetail.niciodonatie.description} />
        )}
      </Card>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardHeader title={dictDetail.actualizari.title} subtitle={dictDetail.actualizari.subtitle} />
          <AddUpdateButton orgSlug={orgSlug} pageId={pagina.id} />
        </div>
        {actualizari.length ? (
          <div className="space-y-2">
            {actualizari.map((a) => (
              <div key={a.id} className="flex items-start justify-between gap-3 rounded-lg border border-[var(--ci-border)] px-3.5 py-2.5">
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-[var(--ci-text)]">{a.titlu}</p>
                  <p className="mt-0.5 whitespace-pre-wrap text-[12px] text-[var(--ci-text-muted)]">{a.continut}</p>
                  <p className="mt-1 text-[11px] text-[var(--ci-text-faint)]">{formatDataOra(a.createdAt.toISOString())}</p>
                </div>
                <DeleteUpdateButton orgSlug={orgSlug} id={a.id} />
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title={dictDetail.nicioActualizare.title} description={dictDetail.nicioActualizare.description} />
        )}
      </Card>
    </div>
  );
}
