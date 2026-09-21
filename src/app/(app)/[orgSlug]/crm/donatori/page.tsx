import Link from "next/link";
import { Suspense } from "react";

import { Badge } from "../components/ui/badge";
import { ImportExportPanel } from "../components/import-export-panel";
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

// Exemple fictive, afișate doar cât timp organizația nu are niciun donator real (nu se salvează nicăieri).
const DONATORI_EXEMPLU = [
  { nume: "Ioana Popescu", email: "ioana.popescu@exemplu.ro", telefon: "0722 100 200", sursa: "Pagina de campanie", wa: true, nr: 3, total: 450, zile: 2 },
  { nume: "Andrei Ionescu", email: "andrei.ionescu@exemplu.ro", telefon: "0733 200 300", sursa: "Pagina de campanie", wa: false, nr: 1, total: 100, zile: 5 },
  { nume: "Maria Dumitru", email: "maria.dumitru@exemplu.ro", telefon: "", sursa: "Formular 230", wa: false, nr: 2, total: 260, zile: 9 },
  { nume: "Bogdan Stoica", email: "bogdan.stoica@exemplu.ro", telefon: "0744 300 400", sursa: "Pagina de campanie", wa: true, nr: 6, total: 1200, zile: 14 },
  { nume: "Elena Georgescu", email: "elena.georgescu@exemplu.ro", telefon: "0755 400 500", sursa: "Pagina de campanie", wa: true, nr: 1, total: 50, zile: 21 },
  { nume: "Vlad Marinescu", email: "vlad.marinescu@exemplu.ro", telefon: "0766 500 600", sursa: "Donație recurentă", wa: false, nr: 12, total: 720, zile: 30 },
];

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
        {lista.rows.length === 0 && stats.donatori === 0 ? (
          <div>
            <div className="border-b border-[var(--ci-border)] bg-[var(--ci-surface-2)] px-4 py-2.5 text-[12.5px] text-[var(--ci-text-muted)]">
              {dict.exempluNota}
            </div>
            <div className="divide-y divide-[var(--ci-border)]">
              {DONATORI_EXEMPLU.map((d) => (
                <div key={d.email} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-[var(--ci-text)]">
                      {d.nume} <Badge tone="neutral" icon={false}>{dict.exempluBadge}</Badge>
                    </p>
                    <p className="mt-0.5 truncate text-[12px] text-[var(--ci-text-muted)]">
                      {d.email} · {d.telefon || dict.faraTelefon} · {d.sursa}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {d.wa && (
                      <Badge tone="green" icon={false}>
                        {dict.whatsappBadge}
                      </Badge>
                    )}
                    <Badge tone="blue" icon={false}>
                      {d.nr}
                    </Badge>
                    <span className="ci-tabular ml-2 text-[13px] font-semibold text-[var(--ci-text)]">{d.total.toLocaleString("ro-RO")} lei</span>
                    <span className="text-[12px] text-[var(--ci-text-faint)]">
                      {d.zile === 1 ? "ieri" : `acum ${d.zile} zile`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : lista.rows.length === 0 ? (
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

      <ImportExportPanel tip="donatori" />

      <DemoDatasetSection />
    </div>
  );
}
