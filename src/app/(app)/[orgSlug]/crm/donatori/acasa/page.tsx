import { Bell, Phone, ThumbsUp } from "lucide-react";
import Link from "next/link";

import { requireOrgAccess } from "@/lib/auth/guard";
import { titluAbsolut } from "@/lib/page-titles";

import { Card, CardHeader } from "../../components/ui/card";
import { EmptyState } from "../../components/ui/states";
import { dataOraRo, dataRo, leiRo, nrRo, procentRo } from "../pf-format";
import { PfNav } from "../pf-nav";
import { listeazaRapoartePf } from "../pf-actions";
import { getAcasaPf } from "../queries-analiza";

export const dynamic = "force-dynamic";

const ACTIUNI: Record<string, string> = {
  donator_sunat: "a marcat ca sunat",
  donator_sunat_anulat: "a anulat „sunat”",
  donator_multumit: "a marcat ca mulțumit",
  donator_multumit_anulat: "a anulat mulțumirea",
  donator_a_raspuns: "a notat că a răspuns",
  donator_a_raspuns_anulat: "a anulat „a răspuns”",
  donator_nu_contactat: "a marcat „nu contactat”",
  donator_contactare_permisa: "a permis din nou contactarea",
  donator_reapel_programat: "a programat un reapel",
  donator_reapel_scos: "a scos reapelul",
  donator_winback_reactivare: "a trecut în reactivare",
  donator_winback_reactivat: "a marcat reactivat",
  donator_winback_pierdut: "a marcat pierdut",
  donator_winback_scos: "a scos din win-back",
  donatori_import: "a importat donații",
  donatori_import_sters: "a șters un import",
};

export default async function AcasaPfPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  await requireOrgAccess(orgSlug);
  const [a, rapoarte] = await Promise.all([getAcasaPf(orgSlug), listeazaRapoartePf(orgSlug)]);
  const baza = `/${orgSlug}/crm/donatori`;
  const maxProiect = Math.max(1, ...a.topProiecte.map((p) => p.total));
  const maxCohorta = Math.max(1, ...a.cohorte.map((c) => c.donatori));

  const todo = [
    { n: a.todo.desunat, eticheta: "de sunat", href: `${baza}?seg=desunat`, icon: <Phone className="size-4" aria-hidden /> },
    { n: a.todo.demultumit, eticheta: "de mulțumit (au donat în ultimele 30 de zile)", href: `${baza}?seg=demultumit`, icon: <ThumbsUp className="size-4" aria-hidden /> },
    { n: a.todo.primadeconvertit, eticheta: "prime donații de convertit în recurente", href: `${baza}?seg=primadeconvertit`, icon: null },
    { n: a.todo.risc, eticheta: "la risc de abandon", href: `${baza}/analize`, icon: null },
    { n: a.todo.dormanti, eticheta: "dormanți, de reactivat", href: `${baza}?seg=dormanti`, icon: null },
  ];

  return (
    <div className="mx-auto max-w-[1300px] space-y-5">
      <div>
        <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">Acasă: persoane fizice</h1>
        <p className="mt-0.5 text-[13px] text-[var(--ci-text-muted)]">Cifrele de ansamblu, ce ai de făcut azi și ce s-a întâmplat recent.</p>
      </div>
      <PfNav orgSlug={orgSlug} />

      {a.kpi.donatori === 0 ? (
        <EmptyState title="Niciun donator încă" description="Donatorii apar din paginile de donații, din „Donator nou” sau dintr-un import de donații." />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {[
              { e: "Donatori", v: nrRo(a.kpi.donatori) },
              { e: "Donații", v: nrRo(a.kpi.donatii) },
              { e: "Suma totală", v: leiRo(a.kpi.suma) },
              { e: "Donatori lunari", v: nrRo(a.kpi.lunari) },
              { e: "Recurenți (2+ donații)", v: nrRo(a.kpi.recurenti) },
              { e: "Activi în ultimele 12 luni", v: `${nrRo(a.kpi.activi12)} · ${procentRo(a.kpi.donatori ? a.kpi.activi12 / a.kpi.donatori : null)}` },
            ].map((x) => (
              <Card key={x.e}>
                <p className="text-[12px] text-[var(--ci-text-muted)]">{x.e}</p>
                <p className="ci-tabular mt-1 text-[17px] font-bold text-[var(--ci-text)]">{x.v}</p>
              </Card>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
            <Card>
              <CardHeader title="De făcut" subtitle="Ce are nevoie de atenție acum." />
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
                  <Bell className="size-3.5" aria-hidden /> Reapeluri
                </p>
                {a.reapeluri.length === 0 ? (
                  <p className="mt-1.5 text-[13px] text-[var(--ci-text-muted)]">Niciun reapel programat în următoarele 7 zile.</p>
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
              <CardHeader title="Top proiecte" subtitle="După suma donată." action={<Link href={`${baza}/proiecte`} prefetch={false} className="text-[12.5px] font-medium text-[var(--ci-primary)] hover:underline">Raport complet</Link>} />
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
                      {nrRo(p.donatori)} donatori · {nrRo(p.donatii)} donații
                    </p>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader title="Cohorte pe an" subtitle="Donatorii grupați după anul primei donații: câți mai sunt activi (au donat în ultimele 12 luni)." />
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-[var(--ci-border)] text-left text-[12px] text-[var(--ci-text-muted)]">
                    <th className="py-1.5 font-semibold">An</th>
                    <th className="py-1.5 text-right font-semibold">Donatori</th>
                    <th className="py-1.5 text-right font-semibold">Total</th>
                    <th className="py-1.5 pl-4 font-semibold">Activi acum</th>
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
                <CardHeader title="Activitate recentă" />
                {a.feed.length === 0 ? (
                  <p className="text-[13px] text-[var(--ci-text-muted)]">Încă nimic. Apelurile, mulțumirile și importurile apar aici.</p>
                ) : (
                  <ul className="space-y-2">
                    {a.feed.map((f, i) => (
                      <li key={i} className="text-[13px] text-[var(--ci-text)]">
                        <span className="font-medium">{f.autor ?? "Cineva din echipă"}</span> {ACTIUNI[f.actiune] ?? f.actiune}
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
                <CardHeader title="Rapoarte salvate" action={<Link href={`${baza}/rapoarte`} prefetch={false} className="text-[12.5px] font-medium text-[var(--ci-primary)] hover:underline">Toate</Link>} />
                {rapoarte.length === 0 ? (
                  <p className="text-[13px] text-[var(--ci-text-muted)]">Salvează din listă o combinație de segmente și filtre, cu un nume, ca să o redeschizi dintr-un click.</p>
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
