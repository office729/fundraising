import Link from "next/link";
import { Suspense } from "react";

import { Badge } from "../components/ui/badge";
import { Card } from "../components/ui/card";
import { DONATORI } from "../mock";
import { getLocale } from "@/lib/i18n/get-locale";
import { DONATORI_REALI_DICT } from "@/lib/i18n/dictionaries/donatori-reali";

import { DemoDatasetSection } from "./demo-dataset-section";
import { ListaPfClient } from "./lista-pf";
import { PfNav } from "./pf-nav";
import { getListaPf } from "./queries-pf";
import { titluAbsolut } from "@/lib/page-titles";

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
  const locale = await getLocale();
  const dict = DONATORI_REALI_DICT[locale];
  const lista = await getListaPf(orgSlug, sp.toString());

  return (
    <div className="mx-auto max-w-[1500px] space-y-5">
      <div>
        <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">{dict.title}</h1>
        <p className="mt-0.5 text-[13px] text-[var(--ci-text-muted)]">{dict.subtitle}</p>
      </div>

      <PfNav orgSlug={orgSlug} />

      {!lista.areDonatori && (
        <Card padded={false}>
          <div className="border-b border-[var(--ci-border)] bg-[var(--ci-surface-2)] px-4 py-2.5 text-[12.5px] text-[var(--ci-text-muted)]">{dict.exempluNota}</div>
          <div className="divide-y divide-[var(--ci-border)]">
            {DONATORI.slice(0, 5).map((d) => (
              <Link
                prefetch={false}
                key={d.id}
                href={`/${orgSlug}/crm/donatori/${d.id}`}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 transition-colors hover:bg-[var(--ci-surface-2)]"
              >
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-[var(--ci-text)]">
                    {d.nume} <Badge tone="neutral" icon={false}>{dict.exempluBadge}</Badge>
                  </p>
                  <p className="mt-0.5 truncate text-[12px] text-[var(--ci-text-muted)]">
                    {d.email} · {d.telefon} · {d.localitate}
                  </p>
                </div>
                <span className="ci-tabular text-[13px] font-semibold text-[var(--ci-text)]">
                  {d.totalDonat.toLocaleString("ro-RO")} {d.moneda}
                </span>
              </Link>
            ))}
          </div>
        </Card>
      )}

      <ListaPfClient orgSlug={orgSlug} lista={lista} />

      {!lista.areDonatori && <DemoDatasetSection />}
    </div>
  );
}

export async function generateMetadata() {
  return titluAbsolut("crmDonatori");
}
