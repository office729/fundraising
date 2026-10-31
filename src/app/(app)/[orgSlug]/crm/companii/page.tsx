import Link from "next/link";
import { Suspense } from "react";

import { requireOrgAccess } from "@/lib/auth/guard";
import { areModul } from "@/lib/billing/packages";
import { pachetPentruModule } from "@/lib/billing/trial";
import { Badge } from "../components/ui/badge";
import { NotaCrm } from "../components/nota-crm";
import { ImportExportPanel } from "../components/import-export-panel";
import { HartaJudeteCard } from "../components/harta-judete-card";
import { Card } from "../components/ui/card";
import { EmptyState } from "../components/ui/states";
import { formatDataRelativa } from "../lib/format";
import { segmentFirma } from "@/lib/id-scurt";
import { etichetaStadiuD177 } from "@/lib/stadii-d177";
import { getLocale } from "@/lib/i18n/get-locale";
import { COMPANII_DICT } from "@/lib/i18n/dictionaries/companii";
import { COMPANII_UI_DICT, intlLocale } from "@/lib/i18n/dictionaries/companii-ui";
import { D177Badge } from "./d177-badge";
import { AddCompanyButton, CalendarLucruButton, ImportCsvButton, TopButton } from "./header-actions";
import { FereastraFiscala } from "./fereastra-fiscala";
import { FilterBar } from "./filter-bar";
import { numarFiltreActive, parseFiltru } from "./lib/filters";
import { PaginaNav } from "./pagina-nav";
import { getPaginaCompanii } from "./queries";
import { titluAbsolut } from "@/lib/page-titles";

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
  // Prioritizarea pe benzi A/B/C e inclusă din pachetul IMPACT: fără el, parametrii din adresă sunt ignorați.
  const access = await requireOrgAccess(orgSlug);
  const areBenzi = areModul(pachetPentruModule(access.orgPackage, access.userEmail), "prioritizare-firme");
  if (!areBenzi) {
    filtru.banda = "";
    filtru.ordine = "";
    filtru.eligibil = false;
    filtru.sprint = false;
    filtru.cald = false;
    filtru.imbogatit = false;
  }
  const locale = await getLocale();
  const dict = COMPANII_DICT[locale].page;
  const ui = COMPANII_UI_DICT[locale].lista;
  const nf = intlLocale(locale);

  const { totalFirme, stats, lista, responsabili, dupaJudet, functiiNr, benziNr, caiCalde } = await getPaginaCompanii(orgSlug, filtru);

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <div>
        <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">{dict.title}</h1>
        <p className="mt-0.5 text-[13px] text-[var(--ci-text-muted)]">{dict.subtitle(totalFirme.toLocaleString(nf))}</p>
      </div>

      <NotaCrm id="companii" />

      {areBenzi && <FereastraFiscala orgSlug={orgSlug} locale={locale} />}

      <HartaJudeteCard
        dupaJudet={dupaJudet}
        titlu={ui.harta.titlu}
        subtitlu={ui.harta.subtitlu}
        unitate={ui.harta.unitate}
        ariaLabel={ui.harta.aria}
      />

      <div className="flex flex-wrap gap-2">
        <AddCompanyButton />
        <CalendarLucruButton />
        <TopButton />
        <ImportCsvButton />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label={dict.stats.companii} value={stats.companii.toLocaleString(nf)} />
        <StatCard label={dict.stats.sponsorizari} value={stats.sponsorizari.toLocaleString(nf)} />
        <StatCard label={dict.stats.totalSponsorizat} value={`${stats.totalSponsorizat.toLocaleString(nf)} RON`} tone="accent" />
        <StatCard label={dict.stats.recurenti} value={stats.recurenti.toLocaleString(nf)} suffix={`${stats.recurentiPct}%`} />
        <StatCard label={dict.stats.medieSponsorizare} value={`${stats.medieSponsorizare.toLocaleString(nf)} RON`} />
        <StatCard label={dict.stats.medieCompanie} value={`${stats.medieCompanie.toLocaleString(nf)} RON`} />
      </div>

      <FilterBar responsabili={responsabili} functiiNr={functiiNr} prioritizare={areBenzi} benziNr={benziNr} caiCalde={caiCalde} />

      <Card padded={false}>
        {lista.rows.length === 0 ? (
          <div className="p-5">
            <EmptyState title={dict.empty.title} description={dict.empty.description} />
            {filtru.q.trim() && numarFiltreActive(filtru) > 0 && (
              <div className="mt-3 flex flex-col items-center gap-2 text-center">
                <p className="text-[13px] text-[var(--ci-text-muted)]">{ui.cautareCombinata(filtru.q.trim())}</p>
                <Link
                  href={`/${orgSlug}/crm/companii?q=${encodeURIComponent(filtru.q.trim())}`}
                  className="rounded-[var(--ci-radius-btn)] bg-[var(--ci-primary)] px-4 py-2 text-[13px] font-semibold text-white hover:opacity-90"
                >
                  {ui.cautaInTotBaza(filtru.q.trim())}
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="divide-y divide-[var(--ci-border)]">
            {lista.rows.map((c) => (
              // Rândul e un <div>, iar linkul fișei acoperă tot rândul (after:inset-0): siglele „in”/„f” sunt
              // linkuri proprii și nu pot sta în interiorul unui alt <a>.
              <div key={c.id} className="relative flex flex-wrap items-center justify-between gap-2 px-4 py-3 transition-colors hover:bg-[var(--ci-surface-2)]">
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <Link
                      prefetch={false}
                      href={`/${orgSlug}/crm/companii/${segmentFirma(c.nume, c.id)}`}
                      className="truncate text-[13px] font-semibold text-[var(--ci-text)] after:absolute after:inset-0 after:content-['']"
                    >
                      {c.nume}
                    </Link>
                    {c.linkedin && /^https?:\/\//i.test(c.linkedin) && (
                      <a href={c.linkedin} target="_blank" rel="noopener noreferrer" title={ui.paginaLinkedin} aria-label={ui.paginaLinkedin} className="relative z-10 inline-flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded px-1 text-[10px] leading-none font-bold text-white" style={{ background: "#0a66c2" }}>
                        in
                      </a>
                    )}
                    {c.facebook && /^https?:\/\//i.test(c.facebook) && (
                      <a href={c.facebook} target="_blank" rel="noopener noreferrer" title={ui.paginaFacebook} aria-label={ui.paginaFacebook} className="relative z-10 inline-flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded px-1 text-[11px] leading-none font-bold text-white" style={{ background: "#1877f2" }}>
                        f
                      </a>
                    )}
                  </div>
                  <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[12px] text-[var(--ci-text-muted)]">
                    {(c.localitate || c.judet) && <span>{[c.localitate, c.judet].filter(Boolean).join(", ")}</span>}
                    {c.responsabilNume && <span>· {c.responsabilNume}</span>}
                    <span>· {dict.vizitat(c.lastViewedAt ? formatDataRelativa(c.lastViewedAt.toISOString()) : dict.niciodata)}</span>
                  </p>
                  {c.contacteFunctie.length > 0 && (
                    <p className="mt-0.5 text-[12px] text-[var(--ci-text-muted)]">
                      {c.contacteFunctie.map((p) => (p.functie ? `${p.nume} (${p.functie})` : p.nume)).join(" · ")}
                      {COMPANII_DICT[locale].filterBar.persoanePotrivite(c.contacteFunctieTotal - c.contacteFunctie.length)}
                    </p>
                  )}
                </div>
                <div className="pointer-events-none relative z-10 flex shrink-0 items-center gap-1.5">
                  {areBenzi && (
                    <Badge tone={c.banda === "A" ? "green" : c.banda === "B" ? "amber" : "neutral"} icon={false}>
                      {COMPANII_DICT[locale].filterBar.benzi[c.banda].split(" · ")[0]}
                    </Badge>
                  )}
                  {areBenzi && c.caldMotiv && (
                    <Badge tone="orange" icon={false}>
                      🔥 {ui.motivCald[c.caldMotiv] ?? c.caldMotiv}
                    </Badge>
                  )}
                  {c.temperatura === "cald" && <Badge tone="red" icon={false}>{dict.cald}</Badge>}
                  {c.temperatura === "rece" && <Badge tone="blue" icon={false}>{dict.rece}</Badge>}
                  {c.recurent && <Badge tone="purple" icon={false}>{dict.recurent}</Badge>}
                  {c.d177 && (
                    <span className="pointer-events-auto">
                      <D177Badge companyId={c.id} incasat={c.d177Incasat} />
                    </span>
                  )}
                  {c.d177 && c.d177Stadiu && c.d177Stadiu !== "nou" && <Badge tone="indigo" icon={false}>{etichetaStadiuD177(c.d177Stadiu)}</Badge>}
                  {c.mec20 && <Badge tone="pink" icon={false}>20%</Badge>}
                  {c.decembrie && <Badge tone="indigo" icon={false}>{COMPANII_DICT[locale].filterBar.decembrie}</Badge>}
                  <span className="ci-tabular ml-2 text-[13px] font-semibold text-[var(--ci-text)]">
                    {c.sumaSponsorizata.toLocaleString(nf)} RON
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="px-4 pb-4">
          <PaginaNav pagina={filtru.pagina} pageCount={lista.pageCount} total={lista.total} pageSize={lista.pageSize} />
        </div>
      </Card>

      <ImportExportPanel tip="companii" />
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

export async function generateMetadata() {
  return titluAbsolut("crmCompanii");
}
