import Link from "next/link";
import { Suspense } from "react";

import { Badge } from "../components/ui/badge";
import { Card } from "../components/ui/card";
import { EmptyState } from "../components/ui/states";
import { formatDataRelativa } from "../lib/format";
import { getLocale } from "@/lib/i18n/get-locale";
import { COMPANII_DICT } from "@/lib/i18n/dictionaries/companii";
import { D177Badge } from "./d177-badge";
import { AddCompanyButton, CalendarLucruButton, ImportCsvButton, TopButton } from "./header-actions";
import { FilterBar } from "./filter-bar";
import { parseFiltru } from "./lib/filters";
import { PaginaNav } from "./pagina-nav";
import { getCompaniiLista, getResponsabiliOrg, getStatisticiCompanii, getTotalFirme } from "./queries";

export default function CompaniiPage({ params, searchParams }: { params: Promise<{ orgSlug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <Suspense fallback={null}>
      <CompaniiContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function CompaniiContent({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { orgSlug } = await params;
  const spRaw = await searchParams;
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(spRaw)) {
    if (v == null) continue;
    if (Array.isArray(v)) v.forEach((val) => sp.append(k, val));
    else sp.set(k, v);
  }
  const filtru = parseFiltru(sp);
  const locale = await getLocale();
  const dict = COMPANII_DICT[locale].page;

  const [totalFirme, stats, lista, responsabili] = await Promise.all([
    getTotalFirme(orgSlug),
    getStatisticiCompanii(orgSlug, filtru),
    getCompaniiLista(orgSlug, filtru),
    getResponsabiliOrg(orgSlug),
  ]);

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <div>
        <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">{dict.title}</h1>
        <p className="mt-0.5 text-[13px] text-[var(--ci-text-muted)]">{dict.subtitle(totalFirme.toLocaleString("ro-RO"))}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <AddCompanyButton />
        <CalendarLucruButton />
        <TopButton />
        <ImportCsvButton />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label={dict.stats.companii} value={stats.companii.toLocaleString("ro-RO")} />
        <StatCard label={dict.stats.sponsorizari} value={stats.sponsorizari.toLocaleString("ro-RO")} />
        <StatCard label={dict.stats.totalSponsorizat} value={`${stats.totalSponsorizat.toLocaleString("ro-RO")} RON`} tone="accent" />
        <StatCard label={dict.stats.recurenti} value={stats.recurenti.toLocaleString("ro-RO")} suffix={`${stats.recurentiPct}%`} />
        <StatCard label={dict.stats.medieSponsorizare} value={`${stats.medieSponsorizare.toLocaleString("ro-RO")} RON`} />
        <StatCard label={dict.stats.medieCompanie} value={`${stats.medieCompanie.toLocaleString("ro-RO")} RON`} />
      </div>

      <FilterBar responsabili={responsabili} />

      <Card padded={false}>
        {lista.rows.length === 0 ? (
          <div className="p-5">
            <EmptyState title={dict.empty.title} description={dict.empty.description} />
          </div>
        ) : (
          <div className="divide-y divide-[var(--ci-border)]">
            {lista.rows.map((c) => (
              <Link
                key={c.id}
                href={`/${orgSlug}/crm/companii/${c.id}`}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 transition-colors hover:bg-[var(--ci-surface-2)]"
              >
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-[var(--ci-text)]">{c.nume}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[12px] text-[var(--ci-text-muted)]">
                    {(c.localitate || c.judet) && <span>{[c.localitate, c.judet].filter(Boolean).join(", ")}</span>}
                    {c.responsabilNume && <span>· {c.responsabilNume}</span>}
                    <span>· {dict.vizitat(c.lastViewedAt ? formatDataRelativa(c.lastViewedAt.toISOString()) : dict.niciodata)}</span>
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {c.temperatura === "cald" && <Badge tone="red" icon={false}>{dict.cald}</Badge>}
                  {c.temperatura === "rece" && <Badge tone="blue" icon={false}>{dict.rece}</Badge>}
                  {c.recurent && <Badge tone="purple" icon={false}>{dict.recurent}</Badge>}
                  {c.d177 && <D177Badge companyId={c.id} incasat={c.d177Incasat} />}
                  {c.mec20 && <Badge tone="pink" icon={false}>20%</Badge>}
                  {c.decembrie && <Badge tone="indigo" icon={false}>{COMPANII_DICT[locale].filterBar.decembrie}</Badge>}
                  <span className="ci-tabular ml-2 text-[13px] font-semibold text-[var(--ci-text)]">
                    {c.sumaSponsorizata.toLocaleString("ro-RO")} RON
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
        <div className="px-4 pb-4">
          <PaginaNav pagina={filtru.pagina} pageCount={lista.pageCount} total={lista.total} pageSize={lista.pageSize} />
        </div>
      </Card>
    </div>
  );
}

function StatCard({ label, value, suffix, tone }: { label: string; value: string; suffix?: string; tone?: "accent" }) {
  return (
    <Card className="min-w-0 overflow-hidden p-3">
      <p className="text-[10px] font-semibold text-[var(--ci-text-muted)] uppercase">{label}</p>
      <p
        className={`ci-tabular mt-1 flex items-baseline gap-1.5 text-base font-bold whitespace-nowrap ${
          tone === "accent" ? "text-[var(--ci-primary)]" : "text-[var(--ci-text)]"
        }`}
      >
        {value}
        {suffix && <span className="text-[12px] font-medium text-[var(--ci-text-muted)]">{suffix}</span>}
      </p>
    </Card>
  );
}
