import { and, desc, eq, sql } from "drizzle-orm";
import { notFound } from "next/navigation";

import { withOrgSession } from "@/lib/auth/guard";
import type { CustomPlanConfigSaved } from "@/lib/billing/custom-plan";
import { getTemplatesDisponibile } from "@/lib/campaign-templates";
import { EroareUtilizator } from "@/lib/erori";
import { fundraisingDonations, fundraisingPages, fundraisingUpdates, organizations } from "@/lib/db/schema";

import { Badge } from "../../components/ui/badge";
import { Breadcrumb } from "../../components/ui/breadcrumb";
import { Card, CardHeader } from "../../components/ui/card";
import { EmptyState } from "../../components/ui/states";
import { getLocale } from "@/lib/i18n/get-locale";
import { STRANGERE_FONDURI_DICT } from "@/lib/i18n/dictionaries/strangere-fonduri";
import { AddOfflineDonationButton, AddUpdateButton, CopyPageLinkButton, DeleteUpdateButton, EditPageButton, EditUpdateButton, ImageUploadCard, ToggleStatusButton } from "../client";

// Pagina campaniei din CRM: doar poza de copertă, povestea și actualizările. (Panourile de beneficiar, agent, mesaje,
// calendar, conținut, presă, grupuri, facturi, taskuri și top companii au fost scoase — nu mai sunt citite deloc.)
const getDetaliuCampanie = withOrgSession(async (ctx, id: string) => {
  if (ctx.role !== "owner" && ctx.role !== "admin") {
    throw new EroareUtilizator("Necesită rol de admin sau owner în organizație.");
  }
  const [pagina, [{ donatiiReusite }], actualizari, [org]] = await Promise.all([
    ctx.db
      .select()
      .from(fundraisingPages)
      .where(and(eq(fundraisingPages.id, id), eq(fundraisingPages.orgId, ctx.orgId)))
      .limit(1),
    ctx.db
      .select({ donatiiReusite: sql<number>`count(*)::int` })
      .from(fundraisingDonations)
      .where(and(eq(fundraisingDonations.pageId, id), eq(fundraisingDonations.status, "reusita"))),
    ctx.db.select().from(fundraisingUpdates).where(eq(fundraisingUpdates.pageId, id)).orderBy(desc(fundraisingUpdates.data)),
    ctx.db.select({ customPlanConfig: organizations.customPlanConfig }).from(organizations).where(eq(organizations.id, ctx.orgId)).limit(1),
  ]);
  const customPlanConfig = org?.customPlanConfig as CustomPlanConfigSaved | null;
  const templateuriDisponibile = getTemplatesDisponibile(ctx.orgDomeniuActivitate, Boolean(customPlanConfig?.accesDesignToate));
  return { pagina: pagina[0] ?? null, donatiiReusite, actualizari, templateuriDisponibile };
});

export default async function PaginaDetaliuPage({ params }: { params: Promise<{ orgSlug: string; id: string }> }) {
  const { orgSlug, id } = await params;
  const { pagina, donatiiReusite, actualizari, templateuriDisponibile } = await getDetaliuCampanie(orgSlug, id);
  if (!pagina) notFound();

  const locale = await getLocale();
  const dict = STRANGERE_FONDURI_DICT[locale];
  const dictDetail = dict.detail;

  return (
    <div className="mx-auto max-w-[1100px] space-y-5">
      <Breadcrumb items={[{ label: dict.breadcrumb, href: `/${orgSlug}/crm/strangere-fonduri` }, { label: pagina.titlu }]} />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">{pagina.titlu}</h1>
            <Badge tone={pagina.status === "activa" ? "green" : "neutral"} icon={false}>
              {pagina.status === "activa" ? dict.page.activa : dict.page.inchisa}
            </Badge>
          </div>
          <p className="mt-0.5 text-[13px] text-[var(--ci-text-muted)]">{dictDetail.organizatDe(pagina.numeCreator, pagina.emailCreator)}</p>
        </div>
        <div className="flex items-center gap-2">
          <AddOfflineDonationButton orgSlug={orgSlug} pageId={pagina.id} />
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
          <p className="ci-tabular mt-1 text-xl font-bold text-[var(--ci-primary)]">{donatiiReusite}</p>
        </Card>
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardHeader title="Povestea campaniei" subtitle="Textul afișat pe pagina publică." />
          <EditPageButton orgSlug={orgSlug} pagina={pagina} templateuriDisponibile={templateuriDisponibile} />
        </div>
        <p className="text-[13px] leading-relaxed whitespace-pre-wrap text-[var(--ci-text)]">{pagina.poveste}</p>
      </Card>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardHeader title={dictDetail.actualizari.title} subtitle={dictDetail.actualizari.subtitle} />
          <AddUpdateButton orgSlug={orgSlug} pageId={pagina.id} />
        </div>
        {actualizari.length ? (
          <div className="space-y-2">
            {actualizari.map((a) => (
              <div key={a.id} className="flex items-start justify-between gap-3 rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] px-3.5 py-2.5">
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-[var(--ci-text)]">{a.titlu}</p>
                  <p className="mt-0.5 whitespace-pre-wrap text-[12px] text-[var(--ci-text-muted)]">{a.continut}</p>
                  <p className="mt-1 text-[11px] text-[var(--ci-text-faint)]">
                    {a.data.toLocaleDateString("ro-RO", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <EditUpdateButton orgSlug={orgSlug} actualizare={{ id: a.id, titlu: a.titlu, continut: a.continut, data: a.data.toISOString().slice(0, 10) }} />
                  <DeleteUpdateButton orgSlug={orgSlug} id={a.id} />
                </div>
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
