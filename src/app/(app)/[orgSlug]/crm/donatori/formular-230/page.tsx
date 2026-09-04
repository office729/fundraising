import { and, desc, eq, gte, lt, sql } from "drizzle-orm";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { withOrgSession } from "@/lib/auth/guard";
import { formular230Beneficiari, formular230Submissions } from "@/lib/db/schema";
import { emailConfigurat } from "@/lib/email";
import { SLUG_PRINCIPAL } from "@/lib/formular230-constants";
import { codJudetDinTextLiber, gasesteJudet } from "@/lib/judete";
import { getLocale } from "@/lib/i18n/get-locale";
import { FORMULAR230_DICT } from "@/lib/i18n/dictionaries/formular230";
import { intervalVarsta, varstaDinCnp, type IntervalVarsta } from "@/lib/varsta-cnp";

import { Badge } from "../../components/ui/badge";
import { Breadcrumb } from "../../components/ui/breadcrumb";
import { Card, CardHeader } from "../../components/ui/card";
import { EmptyState } from "../../components/ui/states";
import { formatDataOra } from "../../lib/format";
import { BeneficiariPanel } from "./beneficiari-panel";
import { CampanieEmailCard } from "./campanie-email-card";
import { getUltimaCampanieEmail } from "./campanie-email-actions";
import { CopyLinkButton, DeleteButton, PdfButton, ProcesatAnafCheckbox } from "./client";
import { ExportButtons } from "./export-buttons";
import { FilterBar } from "./filter-bar";
import { RomaniaMapCard } from "./romania-map-card";
import { StatsChartCard } from "./stats-chart-card";

// Limita de rânduri citite pentru statistici/filtre/hartă — practic
// suficientă pentru orice ONG de dimensiunea platformei azi; dacă un cont
// depășește pragul, cele mai vechi rânduri nu mai intră în statistici
// (afișăm asta explicit mai jos, nu ascundem tăierea).
const LIMITA_RANDURI = 1000;
const PE_PAGINA = 10;

const getDate = withOrgSession(async (ctx, filtru: { an: string; judet: string; varsta: string; localitate: string; beneficiar: string }) => {
  const startLuna = new Date();
  startLuna.setDate(1);
  startLuna.setHours(0, 0, 0, 0);

  const [{ total }] = await ctx.db
    .select({ total: sql<number>`count(*)::int` })
    .from(formular230Submissions)
    .where(eq(formular230Submissions.orgId, ctx.orgId));

  const [{ lunaAceasta }] = await ctx.db
    .select({ lunaAceasta: sql<number>`count(*)::int` })
    .from(formular230Submissions)
    .where(and(eq(formular230Submissions.orgId, ctx.orgId), gte(formular230Submissions.createdAt, startLuna)));

  const beneficiari = await ctx.db
    .select({
      id: formular230Beneficiari.id,
      nume: formular230Beneficiari.nume,
      slug: formular230Beneficiari.slug,
      shortCode: formular230Beneficiari.shortCode,
      iban: formular230Beneficiari.iban,
      cif: formular230Beneficiari.cif,
      emailBeneficiar: formular230Beneficiari.emailBeneficiar,
      createdAt: formular230Beneficiari.createdAt,
      nrFormulare: sql<number>`count(${formular230Submissions.id})::int`,
    })
    .from(formular230Beneficiari)
    .leftJoin(formular230Submissions, eq(formular230Submissions.beneficiarId, formular230Beneficiari.id))
    .where(eq(formular230Beneficiari.orgId, ctx.orgId))
    .groupBy(formular230Beneficiari.id)
    .orderBy(formular230Beneficiari.createdAt);

  const ani = await ctx.db
    .select({ an: sql<number>`extract(year from ${formular230Submissions.createdAt})::int` })
    .from(formular230Submissions)
    .where(eq(formular230Submissions.orgId, ctx.orgId))
    .groupBy(sql`1`)
    .orderBy(sql`1 desc`);

  const conditii = [eq(formular230Submissions.orgId, ctx.orgId)];
  if (filtru.beneficiar !== "toate") {
    const beneficiarSelectat = beneficiari.find((b) => b.slug === filtru.beneficiar);
    if (beneficiarSelectat) conditii.push(eq(formular230Submissions.beneficiarId, beneficiarSelectat.id));
  }
  if (filtru.an !== "toate") {
    const an = Number(filtru.an);
    conditii.push(gte(formular230Submissions.createdAt, new Date(Date.UTC(an, 0, 1))));
    conditii.push(lt(formular230Submissions.createdAt, new Date(Date.UTC(an + 1, 0, 1))));
  }

  const toate = await ctx.db
    .select()
    .from(formular230Submissions)
    .where(and(...conditii))
    .orderBy(desc(formular230Submissions.createdAt))
    .limit(LIMITA_RANDURI);

  // Județ/vârstă/localitate — filtrate în cod, nu SQL: județul răspunsurilor
  // vechi e text liber (înainte de dropdown-ul standardizat), iar vârsta vine
  // din CNP, nu dintr-o coloană — vezi lib/judete.ts / lib/varsta-cnp.ts.
  const submisii = toate.filter((s) => {
    if (filtru.judet !== "toate" && gasesteJudet(s.judet) !== filtru.judet) return false;
    if (filtru.varsta !== "toate" && intervalVarsta(varstaDinCnp(s.cnp)) !== filtru.varsta) return false;
    if (filtru.localitate && !(s.localitate ?? "").toLowerCase().includes(filtru.localitate.toLowerCase())) return false;
    return true;
  });

  // CNP duplicat — aceeași persoană a trimis de mai multe ori pentru ACELAȘI
  // cont/an (nu blocăm trimiterea, doar semnalăm în listă ca echipa să curețe).
  const aparitiiCnp = new Map<string, number>();
  for (const s of toate) {
    const cheie = `${s.cnp}|${s.beneficiarId ?? ""}|${s.an ?? ""}`;
    aparitiiCnp.set(cheie, (aparitiiCnp.get(cheie) ?? 0) + 1);
  }
  const cnpDuplicat = new Set(
    submisii.filter((s) => (aparitiiCnp.get(`${s.cnp}|${s.beneficiarId ?? ""}|${s.an ?? ""}`) ?? 0) > 1).map((s) => s.id),
  );

  const dupaJudet: Record<string, number> = {};
  for (const s of submisii) {
    const cod = codJudetDinTextLiber(s.judet);
    if (cod) dupaJudet[cod] = (dupaJudet[cod] ?? 0) + 1;
  }

  return {
    total,
    lunaAceasta,
    beneficiari,
    ani: ani.map((a) => a.an),
    submisii,
    dupaJudet,
    cnpDuplicat,
    tainuit: toate.length >= LIMITA_RANDURI,
  };
});

export default async function Formular230StatsPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { orgSlug } = await params;
  const sp = await searchParams;
  const filtru = {
    an: sp.an ?? "toate",
    judet: sp.judet ?? "toate",
    varsta: (sp.varsta as IntervalVarsta | undefined) ?? "toate",
    localitate: sp.localitate ?? "",
    beneficiar: sp.beneficiar ?? "toate",
  };
  const { total, lunaAceasta, beneficiari, ani, submisii, dupaJudet, cnpDuplicat, tainuit } = await getDate(orgSlug, filtru);
  const ultimaCampanie = await getUltimaCampanieEmail(orgSlug);
  const locale = await getLocale();
  const dict = FORMULAR230_DICT[locale];

  const totalPagini = Math.max(1, Math.ceil(submisii.length / PE_PAGINA));
  const paginaCuruenta = Math.min(Math.max(1, Number(sp.pagina ?? "1") || 1), totalPagini);
  const submisiiPagina = submisii.slice((paginaCuruenta - 1) * PE_PAGINA, paginaCuruenta * PE_PAGINA);

  function hrefPagina(p: number) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) {
      if (v && k !== "pagina") params.set(k, v);
    }
    if (p > 1) params.set("pagina", String(p));
    const qs = params.toString();
    return `/${orgSlug}/crm/donatori/formular-230${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="mx-auto max-w-[1100px] space-y-5">
      <Breadcrumb items={[{ label: dict.breadcrumb.persoaneFizice, href: `/${orgSlug}/crm/donatori` }, { label: dict.breadcrumb.formular230 }]} />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">{dict.title}</h1>
          <p className="mt-0.5 text-[13px] text-[var(--ci-text-muted)]">{dict.subtitle}</p>
        </div>
        <CopyLinkButton orgSlug={orgSlug} shortCode={beneficiari.find((b) => b.slug === SLUG_PRINCIPAL)?.shortCode ?? null} />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Card><p className="text-[12px] text-[var(--ci-text-muted)]">{dict.stats.total}</p><p className="ci-tabular mt-1 text-xl font-bold text-[var(--ci-text)]">{total}</p></Card>
        <Card><p className="text-[12px] text-[var(--ci-text-muted)]">{dict.stats.lunaAceasta}</p><p className="ci-tabular mt-1 text-xl font-bold text-[var(--ci-primary)]">{lunaAceasta}</p></Card>
        <Card><p className="text-[12px] text-[var(--ci-text-muted)]">{dict.stats.distributie2Ani}</p><p className="ci-tabular mt-1 text-xl font-bold text-[var(--ci-text)]">{submisii.filter((s) => s.distributie2Ani).length}</p></Card>
      </div>

      <BeneficiariPanel orgSlug={orgSlug} beneficiari={beneficiari} />

      <CampanieEmailCard orgSlug={orgSlug} emailConfigurat={emailConfigurat()} ultimaCampanie={ultimaCampanie} />

      <StatsChartCard beneficiari={beneficiari} />

      <RomaniaMapCard dupaJudet={dupaJudet} />

      <Card>
        <CardHeader
          title={dict.raspunsuri.title}
          subtitle={`${submisii.length}${tainuit ? "+" : ""} ${filtru.an === "toate" && filtru.judet === "toate" && filtru.varsta === "toate" && !filtru.localitate && filtru.beneficiar === "toate" ? dict.raspunsuri.recente : dict.raspunsuri.filtrate}`}
          action={<ExportButtons submisii={submisii} beneficiari={beneficiari} />}
        />
        <div className="mb-3">
          <FilterBar ani={ani} beneficiari={beneficiari} />
        </div>
        {tainuit && (
          <p className="mb-2 text-[12px] text-[var(--ci-amber)]">{dict.raspunsuri.tainuit(LIMITA_RANDURI)}</p>
        )}
        {submisiiPagina.length ? (
          <div className="space-y-2">
            {submisiiPagina.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-lg border border-[var(--ci-border)] px-3.5 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-[var(--ci-text)]">{s.nume} {s.prenume}</p>
                  <p className="truncate text-[12px] text-[var(--ci-text-muted)]">{s.email} · {s.telefon || dict.raspunsuri.faraTelefon} · {s.judet || dict.raspunsuri.judetNecunoscut}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge tone="neutral" icon={false}>
                    {beneficiari.find((b) => b.id === s.beneficiarId)?.nume ?? dict.raspunsuri.contNecunoscut}
                  </Badge>
                  {cnpDuplicat.has(s.id) && (
                    <span title={dict.raspunsuri.cnpDuplicatTitle}>
                      <Badge tone="amber" icon={false} className="cursor-help">
                        {dict.raspunsuri.cnpDuplicat}
                      </Badge>
                    </span>
                  )}
                  {s.distributie2Ani && <Badge tone="blue" icon={false}>{dict.raspunsuri.doiAni}</Badge>}
                  <span className="text-[12px] text-[var(--ci-text-faint)]">{formatDataOra(s.createdAt.toISOString())}</span>
                  <span title={dict.raspunsuri.procesatAnaf} className="flex items-center">
                    <ProcesatAnafCheckbox orgSlug={orgSlug} id={s.id} initial={s.procesatAnaf} />
                  </span>
                  {(() => {
                    const beneficiarSubmisie = beneficiari.find((b) => b.id === s.beneficiarId);
                    return (
                      <PdfButton
                        submisie={{
                          nume: s.nume,
                          prenume: s.prenume,
                          initialaTatalui: s.initialaTatalui ?? "",
                          cnp: s.cnp,
                          email: s.email,
                          telefon: s.telefon ?? "",
                          strada: s.strada ?? "",
                          numar: s.numar ?? "",
                          judet: s.judet ?? "",
                          localitate: s.localitate ?? "",
                          codPostal: s.codPostal ?? "",
                          bloc: s.bloc ?? "",
                          scara: s.scara ?? "",
                          etaj: s.etaj ?? "",
                          apartament: s.apartament ?? "",
                          semnatura: s.semnatura,
                          an: s.an ?? s.createdAt.getFullYear(),
                        }}
                        beneficiar={
                          beneficiarSubmisie
                            ? { nume: beneficiarSubmisie.nume, cif: beneficiarSubmisie.cif ?? "", iban: beneficiarSubmisie.iban ?? "" }
                            : undefined
                        }
                      />
                    );
                  })()}
                  <DeleteButton orgSlug={orgSlug} id={s.id} nume={`${s.nume} ${s.prenume}`} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title={dict.raspunsuri.empty.title}
            description={submisii.length === 0 && total > 0 ? dict.raspunsuri.empty.noneFiltered : dict.raspunsuri.empty.noneYet}
          />
        )}
        {totalPagini > 1 && (
          <div className="mt-3 flex items-center justify-between border-t border-[var(--ci-border)] pt-3">
            <Link
              href={hrefPagina(paginaCuruenta - 1)}
              aria-disabled={paginaCuruenta <= 1}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[12.5px] font-medium ${paginaCuruenta <= 1 ? "pointer-events-none text-[var(--ci-text-faint)]" : "text-[var(--ci-text)] hover:bg-[var(--ci-surface-2)]"}`}
            >
              <ChevronLeft className="h-3.5 w-3.5" /> {dict.raspunsuri.anterior}
            </Link>
            <span className="ci-tabular text-[12.5px] text-[var(--ci-text-muted)]">{dict.raspunsuri.pagina(paginaCuruenta, totalPagini)}</span>
            <Link
              href={hrefPagina(paginaCuruenta + 1)}
              aria-disabled={paginaCuruenta >= totalPagini}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[12.5px] font-medium ${paginaCuruenta >= totalPagini ? "pointer-events-none text-[var(--ci-text-faint)]" : "text-[var(--ci-text)] hover:bg-[var(--ci-surface-2)]"}`}
            >
              {dict.raspunsuri.urmator} <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}
      </Card>
    </div>
  );
}
