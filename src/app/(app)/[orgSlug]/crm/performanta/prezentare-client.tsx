"use client";

import { AlertTriangle, ArrowDownRight, ArrowRight, ArrowUpRight, CalendarClock, ChevronDown, Lightbulb, Minus, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import type { Locale } from "@/lib/i18n/config";
import { PERFORMANTA_UI_DICT, type PerformantaUiDict } from "@/lib/i18n/dictionaries/performanta-ui";
import type { PrezentareDto } from "@/lib/performanta-prezentare";
import { ritmAsteptat, type StareRitm } from "@/lib/performanta-masurare";

import { Card, CardHeader } from "../components/ui/card";
import { Select } from "../components/ui/input";
import { EmptyState } from "../components/ui/states";
import { useLocale } from "../lib/locale-context";
import { useCalePerf } from "./perf-cale";
import { SelectorPerioada } from "./perf-nav";
import { BaraProgres, StareBadge, culoareStare, dataCompleta, dataOra, dataScurta, etichetaPerioada, procent } from "./ui-comune";

const ORDINE: StareRitm[] = ["in_grafic", "finalizat", "in_risc", "intarziat", "fara_date", "neinceput"];

function Delta({ curent, anterior, eticheta, locale, dict }: { curent: number | null; anterior: number | null; eticheta: string; locale: Locale; dict: PerformantaUiDict["prezentare"] }) {
  if (curent === null) return <p className="mt-1 text-[12px] text-[var(--ci-text-muted)]">{dict.faraDateInca}</p>;
  if (anterior === null) return <p className="mt-1 text-[12px] text-[var(--ci-text-muted)]">{dict.faraComparatie(eticheta)}</p>;
  const puncte = Math.round((curent - anterior) * 100);
  const Icon = puncte > 0 ? ArrowUpRight : puncte < 0 ? ArrowDownRight : Minus;
  return (
    <p className="mt-1 flex items-center gap-1 text-[12px] text-[var(--ci-text-muted)]">
      <Icon className="size-3.5" aria-hidden />
      <span>
        <strong className="text-[var(--ci-text)]">{dict.puncte(puncte)}</strong> {dict.fataDe(eticheta, procent(anterior, 0, locale))}
      </span>
    </p>
  );
}

export function PrezentareClient({ orgSlug, d }: { orgSlug: string; d: PrezentareDto }) {
  const locale = useLocale();
  const dictAll = PERFORMANTA_UI_DICT[locale];
  const dict = dictAll.prezentare;
  const comune = dictAll.comune;
  const etPerioada = etichetaPerioada(d.perioada, locale);
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const { baza } = useCalePerf(orgSlug);
  const coada = (extra: Record<string, string> = {}) => {
    const n = new URLSearchParams();
    n.set("perioada", d.perioada.cod);
    if (sp.get("dep")) n.set("dep", sp.get("dep")!);
    for (const [k, v] of Object.entries(extra)) n.set(k, v);
    return `?${n.toString()}`;
  };
  const activ = d.obiective.filter((o) => o.status === "activ" || o.status === "finalizat");
  const numara = (s: StareRitm[]) => d.obiective.filter((o) => o.status === "activ" && s.includes(o.stare)).length;
  const dateVechi = d.obiective.filter((o) => o.status === "activ" && (o.actualitate === "intarziata" || o.actualitate === "veche")).length;
  const strategice = d.obiective.filter((o) => o.nivel === "strategic" && o.status !== "anulat");

  const dupaStare = new Map<StareRitm, number>();
  for (const o of d.obiective.filter((x) => x.status !== "anulat")) dupaStare.set(o.stare, (dupaStare.get(o.stare) ?? 0) + 1);
  const totalStari = [...dupaStare.values()].reduce((s, n) => s + n, 0);

  const dupaDep = new Map<string, { nume: string; progrese: number[]; total: number }>();
  for (const o of d.obiective.filter((x) => x.status !== "anulat")) {
    const cheie = o.departmentId ?? "_";
    const r = dupaDep.get(cheie) ?? { nume: o.departmentNume ?? dict.faraDep, progrese: [], total: 0 };
    r.total += 1;
    if (o.progres !== null) r.progrese.push(Math.min(1, o.progres));
    dupaDep.set(cheie, r);
  }

  const toateGoale = d.obiective.length === 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SelectorPerioada />
        <Select
          aria-label={dict.echipaDep}
          className="!w-auto min-w-44"
          value={sp.get("dep") ?? ""}
          onChange={(e) => {
            const n = new URLSearchParams(sp.toString());
            if (e.target.value) n.set("dep", e.target.value);
            else n.delete("dep");
            router.replace(`${pathname}?${n.toString()}`, { scroll: false });
          }}
        >
          <option value="">{dict.toataOrg}</option>
          {d.optiuni.departamente.map((x) => (
            <option key={x.id} value={x.id}>
              {x.nume}
            </option>
          ))}
        </Select>
      </div>

      {toateGoale ? (
        <EmptyState
          title={dict.goalTitlu}
          description={dict.goalDescriere}
          action={
            <div className="flex flex-col items-center gap-3">
            {!baza.endsWith("/demo") && (
              <Link href={`/${orgSlug}/crm/performanta/demo`} className="text-[13px] font-medium text-[var(--ci-purple)] underline underline-offset-2 hover:opacity-80">
                {dict.vezidemo}
              </Link>
            )}
            <Link href={`${baza}/obiective${coada()}`} className="inline-flex h-9 items-center gap-2 rounded-[var(--ci-radius-btn)] bg-[var(--ci-primary)] px-3.5 text-sm font-medium text-white hover:bg-[var(--ci-primary-hover)]">
              {dict.mergiObiective} <ArrowRight className="size-4" aria-hidden />
            </Link>
            </div>
          }
        />
      ) : (
        <>
          <section aria-label={dict.cifreAnsamblu} className="grid grid-cols-2 gap-2.5 lg:grid-cols-5">
            <Card className="col-span-2 !p-4 lg:col-span-2">
              <p className="text-[12px] text-[var(--ci-text-muted)]">{dict.progresMediu}</p>
              <p className="ci-display ci-tabular mt-0.5 text-3xl font-bold text-[var(--ci-text)]">{procent(d.curenta.progresMediu, 0, locale)}</p>
              <Delta curent={d.curenta.progresMediu} anterior={d.anterioara.progresMediu} eticheta={etichetaPerioada(d.anterioara, locale)} locale={locale} dict={dict} />
              <p className="mt-1.5 text-[11.5px] text-[var(--ci-text-muted)]">
                {dict.mediaCelor(d.curenta.cuDate, d.curenta.nrObiective)}
              </p>
              <p className="mt-1 text-[11.5px] text-[var(--ci-text-muted)]">
                {dict.auTrecut(Math.round(ritmAsteptat(d.perioada.start, d.perioada.end, d.azi) * 100))}
              </p>
            </Card>
            <Card className="!p-4">
              <p className="ci-display ci-tabular text-2xl font-bold text-[var(--ci-text)]">{numara(["in_risc", "intarziat"])}</p>
              <p className="mt-0.5 text-[12.5px] text-[var(--ci-text-muted)]">{dict.inRiscSauIntarziate}</p>
              <Link href={`${baza}/obiective${coada({ sortare: "risc" })}`} className="mt-1.5 inline-block text-[12.5px] font-medium text-[var(--ci-blue)] hover:underline">
                {dict.veziLista}
              </Link>
            </Card>
            <Card className="!p-4">
              <p className="ci-display ci-tabular text-2xl font-bold text-[var(--ci-text)]">{d.blocaje.length}</p>
              <p className="mt-0.5 text-[12.5px] text-[var(--ci-text-muted)]">{dict.blocajeDecizie}</p>
            </Card>
            <Card className="!p-4">
              <p className="ci-display ci-tabular text-2xl font-bold text-[var(--ci-text)]">{dateVechi}</p>
              <p className="mt-0.5 text-[12.5px] text-[var(--ci-text-muted)]">{dict.dateNeactualizate}</p>
            </Card>
          </section>

          <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
            <Card>
              <CardHeader title={dict.strategice} subtitle={dict.strategiceSub(etPerioada)} />
              {strategice.length === 0 ? (
                <p className="text-[13px] text-[var(--ci-text-muted)]">{dict.faraStrategice}</p>
              ) : (
                <ul className="space-y-4">
                  {strategice.map((o) => (
                    <li key={o.id}>
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <Link href={`${baza}/obiective${coada({ ob: o.id })}`} className="text-[14px] font-semibold text-[var(--ci-text)] hover:underline">
                          {o.titlu}
                        </Link>
                        <StareBadge stare={o.stare} />
                      </div>
                      <p className="mt-0.5 text-[12px] text-[var(--ci-text-muted)]">
                        {o.responsabilNume ?? comune.nealocat} · {dict.rkCuDate(o.rkCuDate, o.rkTotal)} · {dataScurta(o.perioadaStart, locale)} – {dataScurta(o.perioadaEnd, locale)}
                      </p>
                      <div className="mt-1.5">
                        <BaraProgres progres={o.progres} stare={o.stare} perioada={{ start: o.perioadaStart, end: o.perioadaEnd }} azi={d.azi} eticheta={dict.progresAria(o.titlu)} latime="w-full" />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <div className="space-y-5">
              <Card>
                <CardHeader title={dict.cumStau} subtitle={dict.cumStauSub(totalStari, etPerioada)} />
                {totalStari === 0 ? (
                  <p className="text-[13px] text-[var(--ci-text-muted)]">{dict.nimicDeAfisat}</p>
                ) : (
                  <>
                    <div role="img" aria-label={ORDINE.filter((s) => dupaStare.get(s)).map((s) => `${comune.stare[s]}: ${dupaStare.get(s)}`).join(", ")} className="flex h-3 overflow-hidden rounded-full bg-[var(--ci-surface-2)]">
                      {ORDINE.filter((s) => dupaStare.get(s)).map((s) => (
                        <span key={s} style={{ width: `${((dupaStare.get(s) ?? 0) / totalStari) * 100}%`, background: culoareStare(s) }} />
                      ))}
                    </div>
                    <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5">
                      {ORDINE.filter((s) => dupaStare.get(s)).map((s) => (
                        <li key={s} className="flex items-center justify-between gap-2 text-[12.5px]">
                          <StareBadge stare={s} />
                          <span className="ci-tabular font-semibold text-[var(--ci-text)]">{dupaStare.get(s)}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                <p className="mt-3 text-[11.5px] text-[var(--ci-text-muted)]">{dict.sursa(dataOra(d.actualizatLa, locale))}</p>
              </Card>

              <Card>
                <CardHeader title={dict.progresDep} subtitle={dict.progresDepSub} />
                <ul className="space-y-3">
                  {[...dupaDep.values()]
                    .sort((a, b) => a.nume.localeCompare(b.nume, locale))
                    .map((x) => {
                      const medie = x.progrese.length ? x.progrese.reduce((s, v) => s + v, 0) / x.progrese.length : null;
                      return (
                        <li key={x.nume}>
                          <div className="flex items-baseline justify-between gap-2 text-[13px]">
                            <span className="font-medium text-[var(--ci-text)]">{x.nume}</span>
                            <span className="text-[12px] text-[var(--ci-text-muted)]">
                              {dict.cuDate(x.progrese.length, x.total)}
                            </span>
                          </div>
                          <div className="mt-1">
                            <BaraProgres progres={medie} stare={medie === null ? "fara_date" : "in_grafic"} azi={d.azi} eticheta={dict.progresMediuDep(x.nume)} latime="w-full" />
                          </div>
                        </li>
                      );
                    })}
                </ul>
                <p className="mt-3 text-[11.5px] text-[var(--ci-text-muted)]">{dict.culoareaNuJudeca}</p>
              </Card>
            </div>
          </div>

          <Card>
            <CardHeader title={dict.actiuni} subtitle={dict.actiuniSub} />
            {d.recomandari.length === 0 ? (
              <p className="flex items-center gap-2 text-[13px] text-[var(--ci-text-muted)]">
                <Lightbulb className="size-4" aria-hidden /> {dict.faraRecomandari}
              </p>
            ) : (
              <ul className="divide-y divide-[var(--ci-border)]">
                {d.recomandari.map((r) => (
                  <li key={r.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle className={`mt-0.5 size-4 shrink-0 ${r.prioritate === 1 ? "text-[var(--ci-red)]" : r.prioritate === 2 ? "text-[var(--ci-amber)]" : "text-[var(--ci-text-muted)]"}`} aria-hidden />
                      <div className="min-w-0 flex-1">
                        <p className="text-[13.5px] font-semibold text-[var(--ci-text)]">
                          <span className="mr-2 rounded-full bg-[var(--ci-surface-2)] px-1.5 py-px align-middle text-[11px] font-medium text-[var(--ci-text-muted)]">{r.prioritate === 1 ? dict.urgent : r.prioritate === 2 ? dict.important : dict.deUrmarit}</span>
                          {r.titlu}
                        </p>
                        <p className="mt-0.5 text-[13px] text-[var(--ci-text-muted)]">{r.text}</p>
                        <details className="group mt-1">
                          <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-[12px] font-medium text-[var(--ci-blue)] focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none">
                            <ChevronDown className="size-3.5 transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden /> {dict.deCe}
                          </summary>
                          <dl className="mt-1.5 space-y-1 text-[12px] text-[var(--ci-text-muted)]">
                            <div>
                              <dt className="inline font-medium text-[var(--ci-text)]">{dict.regula}</dt>
                              <dd className="inline">{r.regula}</dd>
                            </div>
                            <div>
                              <dt className="inline font-medium text-[var(--ci-text)]">{dict.datele}</dt>
                              <dd className="inline">{r.baza}</dd>
                            </div>
                          </dl>
                        </details>
                      </div>
                      {r.obiectivId && (
                        <Link href={`${baza}/obiective${coada({ ob: r.obiectivId })}`} className="shrink-0 text-[12.5px] font-medium text-[var(--ci-blue)] hover:underline">
                          {dict.deschide}
                        </Link>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <Card>
              <CardHeader title={dict.blocajeCer} subtitle={dict.blocajeCerSub} />
              {d.blocaje.length === 0 ? (
                <p className="text-[13px] text-[var(--ci-text-muted)]">{dict.niciunBlocaj}</p>
              ) : (
                <ul className="space-y-3">
                  {d.blocaje.map((b) => (
                    <li key={b.id} className="text-[13px]">
                      <p className="flex items-start gap-1.5 font-medium text-[var(--ci-text)]">
                        <ShieldAlert className={`mt-0.5 size-4 shrink-0 ${b.intarziat ? "text-[var(--ci-red)]" : "text-[var(--ci-amber)]"}`} aria-hidden />
                        <span>{b.contextTitlu ?? dict.blocaj}</span>
                      </p>
                      <p className="mt-0.5 pl-5 text-[var(--ci-text-muted)]">{b.motiv}</p>
                      <p className="mt-0.5 pl-5 text-[12px] text-[var(--ci-text-muted)]">
                        {dict.revenire(dataCompleta(b.termenRevenire, locale))}
                        {b.intarziat && <span className="font-medium text-[var(--ci-red)]">{dict.termenDepasit}</span>}
                        {b.rezolvator && dict.deRezolvat(b.rezolvator)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card>
              <CardHeader title={dict.termene} subtitle={dict.termeneSub} />
              {d.termene.length === 0 ? (
                <p className="text-[13px] text-[var(--ci-text-muted)]">{dict.faraTermene}</p>
              ) : (
                <ul className="space-y-2.5">
                  {d.termene.slice(0, 8).map((t) => (
                    <li key={t.id} className="flex items-start gap-2 text-[13px]">
                      <CalendarClock className="mt-0.5 size-4 shrink-0 text-[var(--ci-text-muted)]" aria-hidden />
                      <div className="min-w-0">
                        <p className="truncate font-medium text-[var(--ci-text)]">{t.titlu}</p>
                        <p className="text-[12px] text-[var(--ci-text-muted)]">
                          {dataScurta(t.termen, locale)} · {t.responsabilNume ?? comune.nealocat} · {dict.prioritateText((comune.prioritate[t.prioritate] ?? t.prioritate).toLowerCase())}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card>
              <CardHeader title={dict.munca} subtitle={dict.muncaSub} />
              {d.munca.length === 0 ? (
                <p className="text-[13px] text-[var(--ci-text-muted)]">{dict.faraMunca}</p>
              ) : (
                <ul className="space-y-2">
                  {d.munca.map((m) => (
                    <li key={m.angajatId} className="flex items-baseline justify-between gap-3 text-[13px]">
                      <span className="truncate text-[var(--ci-text)]">{m.nume}</span>
                      <span className="ci-tabular shrink-0 text-[12px] text-[var(--ci-text-muted)]">
                        {dict.deschise(m.deschise)}
                        {m.blocate > 0 && dict.blocate(m.blocate)}
                        {m.intarziate > 0 && dict.intarziate(m.intarziate)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-3 text-[11.5px] text-[var(--ci-text-muted)]">{dict.muncaNota}</p>
            </Card>
          </div>
          <p className="text-[11.5px] text-[var(--ci-text-muted)]">
            {dict.calculate(dataOra(d.actualizatLa, locale), activ.length, etPerioada)}
          </p>
        </>
      )}
    </div>
  );
}
