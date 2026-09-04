import { and, desc, eq, sql } from "drizzle-orm";
import { ExternalLink } from "lucide-react";
import Link from "next/link";

import { withOrgSession } from "@/lib/auth/guard";
import { fundraisingDonations, fundraisingPages } from "@/lib/db/schema";

import { Badge } from "../components/ui/badge";
import { Breadcrumb } from "../components/ui/breadcrumb";
import { Card, CardHeader } from "../components/ui/card";
import { EmptyState } from "../components/ui/states";
import { formatDataOra } from "../lib/format";
import { getLocale } from "@/lib/i18n/get-locale";
import { STRANGERE_FONDURI_DICT } from "@/lib/i18n/dictionaries/strangere-fonduri";
import { AddPageButton, CopyCreateLinkButton, CopyPageLinkButton, DeletePageButton, EditPageButton, ToggleStatusButton } from "./client";

const getPagini = withOrgSession(async (ctx) => {
  const [{ totalStrans }] = await ctx.db
    .select({ totalStrans: sql<number>`coalesce(sum(${fundraisingPages.sumaStransa}), 0)::int` })
    .from(fundraisingPages)
    .where(eq(fundraisingPages.orgId, ctx.orgId));

  const [{ totalDonatii }] = await ctx.db
    .select({ totalDonatii: sql<number>`count(*)::int` })
    .from(fundraisingDonations)
    .where(sql`${fundraisingDonations.orgId} = ${ctx.orgId} and ${fundraisingDonations.status} = 'reusita'`);

  const pagini = await ctx.db
    .select()
    .from(fundraisingPages)
    .where(eq(fundraisingPages.orgId, ctx.orgId))
    .orderBy(desc(fundraisingPages.createdAt))
    .limit(200);

  const topDonatori = await ctx.db
    .select({
      id: fundraisingDonations.id,
      numeDonator: fundraisingDonations.numeDonator,
      anonim: fundraisingDonations.anonim,
      suma: fundraisingDonations.suma,
      pageTitlu: fundraisingPages.titlu,
    })
    .from(fundraisingDonations)
    .innerJoin(fundraisingPages, eq(fundraisingPages.id, fundraisingDonations.pageId))
    .where(and(eq(fundraisingDonations.orgId, ctx.orgId), eq(fundraisingDonations.status, "reusita")))
    .orderBy(desc(fundraisingDonations.suma))
    .limit(10);

  return { totalStrans, totalDonatii, pagini, topDonatori };
});

export default async function StrangereFonduriPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const { totalStrans, totalDonatii, pagini, topDonatori } = await getPagini(orgSlug);
  const locale = await getLocale();
  const dict = STRANGERE_FONDURI_DICT[locale].page;

  return (
    <div className="mx-auto max-w-[1100px] space-y-5">
      <Breadcrumb items={[{ label: STRANGERE_FONDURI_DICT[locale].breadcrumb }]} />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">{dict.title}</h1>
          <p className="mt-0.5 text-[13px] text-[var(--ci-text-muted)]">{dict.subtitle}</p>
        </div>
        <div className="flex gap-2">
          <AddPageButton orgSlug={orgSlug} />
          <CopyCreateLinkButton orgSlug={orgSlug} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Card>
          <p className="text-[12px] text-[var(--ci-text-muted)]">{dict.totalStrans}</p>
          <p className="ci-tabular mt-1 text-xl font-bold text-[var(--ci-text)]">{totalStrans.toLocaleString("ro-RO")} lei</p>
        </Card>
        <Card>
          <p className="text-[12px] text-[var(--ci-text-muted)]">{dict.donatiiReusite}</p>
          <p className="ci-tabular mt-1 text-xl font-bold text-[var(--ci-primary)]">{totalDonatii}</p>
        </Card>
        <Card>
          <p className="text-[12px] text-[var(--ci-text-muted)]">{dict.paginiActive}</p>
          <p className="ci-tabular mt-1 text-xl font-bold text-[var(--ci-text)]">
            {pagini.filter((p) => p.status === "activa").length}
          </p>
        </Card>
      </div>

      {topDonatori.length > 0 && (
        <Card>
          <CardHeader title={dict.topDonatori.title} subtitle={dict.topDonatori.subtitle} />
          <div className="space-y-1.5">
            {topDonatori.map((d, i) => (
              <div key={d.id} className="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-[13px]">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="ci-tabular w-5 shrink-0 font-bold text-[var(--ci-primary)]">#{i + 1}</span>
                  <span className="truncate font-medium text-[var(--ci-text)]">
                    {d.anonim || !d.numeDonator ? dict.sustinatorAnonim : d.numeDonator}
                  </span>
                  <span className="truncate text-[12px] text-[var(--ci-text-faint)]">— {d.pageTitlu}</span>
                </div>
                <span className="ci-tabular shrink-0 font-semibold text-[var(--ci-text)]">{d.suma.toLocaleString("ro-RO")} lei</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <CardHeader title={dict.pagini.title} subtitle={dict.pagini.subtitle(pagini.length)} />
        {pagini.length ? (
          <div className="space-y-2">
            {pagini.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-lg border border-[var(--ci-border)] px-3.5 py-2.5">
                <Link href={`/${orgSlug}/crm/strangere-fonduri/${p.id}`} className="min-w-0 hover:opacity-80">
                  <p className="truncate text-[13px] font-medium text-[var(--ci-text)]">{p.titlu}</p>
                  <p className="truncate text-[12px] text-[var(--ci-text-muted)]">
                    {p.numeCreator} · {p.emailCreator} · {formatDataOra(p.createdAt.toISOString())}
                  </p>
                </Link>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge tone={p.status === "activa" ? "green" : "neutral"} icon={false}>
                    {p.status === "activa" ? dict.activa : dict.inchisa}
                  </Badge>
                  <span className="ci-tabular text-[13px] font-semibold text-[var(--ci-text)]">
                    {p.sumaStransa.toLocaleString("ro-RO")} lei{p.sumaTinta ? ` / ${p.sumaTinta.toLocaleString("ro-RO")} lei` : ""}
                  </span>
                  <a
                    href={`/strangere-fonduri/${orgSlug}/${p.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    title={dict.vezPaginaPublica}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--ci-text-faint)] hover:bg-[var(--ci-surface-2)] hover:text-[var(--ci-text)]"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                  <CopyPageLinkButton orgSlug={orgSlug} pageSlug={p.slug} />
                  <EditPageButton orgSlug={orgSlug} pagina={p} />
                  <ToggleStatusButton orgSlug={orgSlug} id={p.id} status={p.status} />
                  <DeletePageButton orgSlug={orgSlug} id={p.id} titlu={p.titlu} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title={dict.empty.title}
            description={dict.empty.description}
          />
        )}
      </Card>
    </div>
  );
}
