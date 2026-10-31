import { Bell, Phone, ThumbsUp } from "lucide-react";
import Link from "next/link";

import { requireOrgAccess } from "@/lib/auth/guard";
import { DONATORI_UI_DICT } from "@/lib/i18n/dictionaries/donatori-ui";
import { getLocale } from "@/lib/i18n/get-locale";
import { titluAbsolut } from "@/lib/page-titles";

import { Card, CardHeader } from "../../components/ui/card";
import { EmptyState } from "../../components/ui/states";
import { formatariPf } from "../pf-format";
import { PfNav } from "../pf-nav";
import { listeazaRapoartePf } from "../pf-actions";
import { getAcasaPf } from "../queries-analiza";

export const dynamic = "force-dynamic";

export default async function AcasaPfPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  await requireOrgAccess(orgSlug);
  const locale = await getLocale();
  const t = DONATORI_UI_DICT[locale].acasa;
  const { nr: nrRo, lei: leiRo, procent: procentRo, data: dataRo, dataOra: dataOraRo } = formatariPf(locale);
  const [a, rapoarte] = await Promise.all([getAcasaPf(orgSlug), listeazaRapoartePf(orgSlug)]);
  const baza = `/${orgSlug}/crm/donatori`;
  const maxProiect = Math.max(1, ...a.topProiecte.map((p) => p.total));
  const maxCohorta = Math.max(1, ...a.cohorte.map((c) => c.donatori));

  const todo = [
    { n: a.todo.desunat, eticheta: t.todoDeSunat, href: `${baza}?seg=desunat`, icon: <Phone className="size-4" aria-hidden /> },
    { n: a.todo.demultumit, eticheta: t.todoDeMultumit, href: `${baza}?seg=demultumit`, icon: <ThumbsUp className="size-4" aria-hidden /> },
    { n: a.todo.primadeconvertit, eticheta: t.todoPrimaDonatie, href: `${baza}?seg=primadeconvertit`, icon: null },
    { n: a.todo.risc, eticheta: t.todoRisc, href: `${baza}/analize`, icon: null },
    { n: a.todo.dormanti, eticheta: t.todoDormanti, href: `${baza}?seg=dormanti`, icon: null },
  ];

  return (
    <div className="mx-auto max-w-[1300px] space-y-5">
      <div>
        <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">{t.titlu}</h1>
        <p className="mt-0.5 text-[13px] text-[var(--ci-text-muted)]">{t.subtitlu}</p>
      </div>
      <PfNav orgSlug={orgSlug} />

      {a.kpi.donatori === 0 ? (
        <EmptyState title={t.emptyTitlu} description={t.emptyDescriere} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {[
              { e: t.kpiDonatori, v: nrRo(a.kpi.donatori) },
              { e: t.kpiDonatii, v: nrRo(a.kpi.donatii) },
              { e: t.kpiSuma, v: leiRo(a.kpi.suma) },
              { e: t.kpiLunari, v: nrRo(a.kpi.lunari) },
              { e: t.kpiRecurenti, v: nrRo(a.kpi.recurenti) },
              { e: t.kpiActivi, v: `${nrRo(a.kpi.activi12)} · ${procentRo(a.kpi.donatori ? a.kpi.activi12 / a.kpi.donatori : null)}` },
            ].map((x) => (
              <Card key={x.e}>
                <p className="text-[12px] text-[var(--ci-text-muted)]">{x.e}</p>
                <p className="ci-tabular mt-1 text-[17px] font-bold text-[var(--ci-text)]">{x.v}</p>
              </Card>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
            <Card>
              <CardHeader title={t.deFacut} subtitle={t.deFacutSub} />
              <ul className="divide-y divide-[var(--ci-border)]">
                {todo.map((t) => (
                  <li key={t.eticheta}>
                    <Link href={t.href} prefetch={false} className="flex items-center gap-3 py-2.5 hover:text-[var(--ci-primary)]">
                      <span className="ci-tabular w-14 shrink-0 text-right text-[16px] font-bold text-[var(--ci-text)]">{nrRo(t.n)}</span>
                      <span className="flex items-center gap-1.5 text-[13px] text-[var(--ci-text)]">
                        {t.icon}
                        {t.eticheta}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="mt-3 border-t border-[var(--ci-border)] pt-3">
                <p className="flex items-center gap-1.5 text-[12px] font-semibold tracking-wide text-[var(--ci-text-faint)] uppercase">
                  <Bell className="size-3.5" aria-hidden /> {t.reapeluri}
                </p>
                {a.reapeluri.length === 0 ? (
                  <p className="mt-1.5 text-[13px] text-[var(--ci-text-muted)]">{t.niciunReapel}</p>
                ) : (
                  <ul className="mt-1.5 space-y-1">
                    {a.reapeluri.map((r) => (
                      <li key={r.id} className="flex items-center justify-between gap-3 text-[13px]">
                        <Link href={`${baza}/reali/${r.id}`} prefetch={false} className="min-w-0 truncate font-medium text-[var(--ci-text)] hover:text-[var(--ci-primary)]">
                          {r.nume}
                        </Link>
                        <span className={`ci-tabular shrink-0 text-[12.5px] ${r.reapelLa <= new Date().toISOString().slice(0, 10) ? "font-semibold text-[var(--ci-amber)]" : "text-[var(--ci-text-muted)]"}`}>{dataRo(r.reapelLa)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Card>

            <Card>
              <CardHeader title={t.topProiecte} subtitle={t.dupaSuma} action={<Link href={`${baza}/proiecte`} prefetch={false} className="text-[12.5px] font-medium text-[var(--ci-primary)] hover:underline">{t.raportComplet}</Link>} />
              <ul className="space-y-3">
                {a.topProiecte.map((p) => (
                  <li key={p.proiect}>
                    <div className="flex items-baseline justify-between gap-3 text-[13px]">
                      <Link href={`${baza}?proiect=${encodeURIComponent(p.proiect)}`} prefetch={false} className="min-w-0 truncate font-medium text-[var(--ci-text)] hover:text-[var(--ci-primary)]">
                        {p.proiect}
                      </Link>
                      <span className="ci-tabular shrink-0 font-semibold text-[var(--ci-text)]">{leiRo(p.total)}</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--ci-surface-2)]" aria-hidden>
                      <div className="h-full rounded-full bg-[var(--ci-primary)]" style={{ width: `${Math.max(3, (p.total / maxProiect) * 100)}%` }} />
                    </div>
                    <p className="mt-0.5 text-[11.5px] text-[var(--ci-text-muted)]">
                      {nrRo(p.donatori)} {t.donatori} · {nrRo(p.donatii)} {t.donatii}
                    </p>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader title={t.cohortePeAn} subtitle={t.cohorteSub} />
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-[var(--ci-border)] text-left text-[12px] text-[var(--ci-text-muted)]">
                    <th className="py-1.5 font-semibold">{t.colAn}</th>
                    <th className="py-1.5 text-right font-semibold">{t.colDonatori}</th>
                    <th className="py-1.5 text-right font-semibold">{t.colTotal}</th>
                    <th className="py-1.5 pl-4 font-semibold">{t.colActivi}</th>
                  </tr>
                </thead>
                <tbody>
                  {a.cohorte.map((c) => (
                    <tr key={c.an} className="border-b border-[var(--ci-border)] last:border-0">
                      <td className="py-2 font-medium text-[var(--ci-text)]">
                        <Link href={`${baza}?an=${c.an}`} prefetch={false} className="hover:text-[var(--ci-primary)]">
                          {c.an}
                        </Link>
                      </td>
                      <td className="ci-tabular py-2 text-right">{nrRo(c.donatori)}</td>
                      <td className="ci-tabular py-2 text-right">{leiRo(c.suma)}</td>
                      <td className="py-2 pl-4">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-[var(--ci-surface-2)]" aria-hidden>
                            <div className="h-full rounded-full bg-[var(--ci-green)]" style={{ width: `${(c.activi / maxCohorta) * 100}%` }} />
                          </div>
                          <span className="ci-tabular text-[12px] text-[var(--ci-text-muted)]">
                            {nrRo(c.activi)} · {procentRo(c.donatori ? c.activi / c.donatori : null)}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>

            <div className="space-y-4">
              <Card>
                <CardHeader title={t.activitateRecenta} />
                {a.feed.length === 0 ? (
                  <p className="text-[13px] text-[var(--ci-text-muted)]">{t.inca}</p>
                ) : (
                  <ul className="space-y-2">
                    {a.feed.map((f, i) => (
                      <li key={i} className="text-[13px] text-[var(--ci-text)]">
                        <span className="font-medium">{f.autor ?? t.cinevaEchipa}</span> {t.actiuni[f.actiune] ?? f.actiune}
                        {f.donator && f.donatorId && (
                          <>
                            {" · "}
                            <Link href={`${baza}/reali/${f.donatorId}`} prefetch={false} className="text-[var(--ci-primary)] hover:underline">
                              {f.donator}
                            </Link>
                          </>
                        )}
                        <span className="ml-2 text-[11.5px] text-[var(--ci-text-muted)]">{dataOraRo(f.la)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
              <Card>
                <CardHeader title={t.rapoarteSalvate} action={<Link href={`${baza}/rapoarte`} prefetch={false} className="text-[12.5px] font-medium text-[var(--ci-primary)] hover:underline">{t.toate}</Link>} />
                {rapoarte.length === 0 ? (
                  <p className="text-[13px] text-[var(--ci-text-muted)]">{t.rapoarteGol}</p>
                ) : (
                  <ul className="space-y-1">
                    {rapoarte.slice(0, 6).map((r) => (
                      <li key={r.id}>
                        <Link href={`${baza}${r.qs ? `?${r.qs}` : ""}`} prefetch={false} className="text-[13px] font-medium text-[var(--ci-primary)] hover:underline">
                          {r.nume}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export async function generateMetadata() {
  return titluAbsolut("crmDonatoriAcasa");
}
