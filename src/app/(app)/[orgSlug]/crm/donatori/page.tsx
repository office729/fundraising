import Link from "next/link";
import { Suspense } from "react";

import { Badge } from "../components/ui/badge";
import { Card } from "../components/ui/card";
import { EmptyState } from "../components/ui/states";
import { formatDataRelativa } from "../lib/format";
import { getLocale } from "@/lib/i18n/get-locale";
import { DONATORI_REALI_DICT } from "@/lib/i18n/dictionaries/donatori-reali";

import { DemoDatasetSection } from "./demo-dataset-section";
import { FilterBarReali } from "./filter-bar-reali";
import { parseFiltruDonatoriReali } from "./lib/filters";
import { PaginaNavReali } from "./pagina-nav-reali";
import { getDonatoriRealiLista, getStatisticiDonatoriReali } from "./queries";

export default function DonatoriPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={null}>
      <DonatoriContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function DonatoriContent({
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
  const filtru = parseFiltruDonatoriReali(sp);
  const locale = await getLocale();
  const dict = DONATORI_REALI_DICT[locale];

  const [lista, stats] = await Promise.all([
    getDonatoriRealiLista(orgSlug, filtru),
    getStatisticiDonatoriReali(orgSlug),
  ]);

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <p className="text-[12px] text-[var(--ci-text-muted)]">{dict.stats.donatori}</p>
          <p className="ci-tabular mt-1 text-xl font-bold text-[var(--ci-text)]">{stats.donatori.toLocaleString("ro-RO")}</p>
        </Card>
        <Card>
          <p className="text-[12px] text-[var(--ci-text-muted)]">{dict.stats.totalDonat}</p>
          <p className="ci-tabular mt-1 text-xl font-bold text-[var(--ci-primary)]">{stats.totalDonat.toLocaleString("ro-RO")} lei</p>
        </Card>
        <Card>
          <p className="text-[12px] text-[var(--ci-text-muted)]">{dict.stats.numarDonatii}</p>
          <p className="ci-tabular mt-1 text-xl font-bold text-[var(--ci-text)]">{stats.numarDonatii.toLocaleString("ro-RO")}</p>
        </Card>
        <Card>
          <p className="text-[12px] text-[var(--ci-text-muted)]">{dict.stats.optInWhatsapp}</p>
          <p className="ci-tabular mt-1 text-xl font-bold text-[var(--ci-text)]">{stats.optInWhatsapp.toLocaleString("ro-RO")}</p>
        </Card>
      </div>

      <FilterBarReali />

      <Card padded={false}>
        {lista.rows.length === 0 ? (
          <div className="p-5">
            <EmptyState title={dict.empty.title} description={dict.empty.description} />
          </div>
        ) : (
          <div className="divide-y divide-[var(--ci-border)]">
            {lista.rows.map((d) => (
              <Link
                key={d.id}
                href={`/${orgSlug}/crm/donatori/reali/${d.id}`}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 transition-colors hover:bg-[var(--ci-surface-2)]"
              >
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-[var(--ci-text)]">{d.nume}</p>
                  <p className="mt-0.5 truncate text-[12px] text-[var(--ci-text-muted)]">
                    {d.email} · {d.telefon || dict.faraTelefon} · {d.sursa}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {d.consimtamantWhatsapp && (
                    <Badge tone="green" icon={false}>
                      {dict.whatsappBadge}
                    </Badge>
                  )}
                  <Badge tone="blue" icon={false}>
                    {d.numarDonatii}
                  </Badge>
                  <span className="ci-tabular ml-2 text-[13px] font-semibold text-[var(--ci-text)]">
                    {d.totalDonat.toLocaleString("ro-RO")} lei
                  </span>
                  <span className="text-[12px] text-[var(--ci-text-faint)]">{formatDataRelativa(d.ultimaDonatieLa.toISOString())}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
        <div className="px-4 pb-4">
          <PaginaNavReali pagina={filtru.pagina} pageCount={lista.pageCount} total={lista.total} />
        </div>
      </Card>

      <DemoDatasetSection />
    </div>
  );
}
