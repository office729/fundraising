"use client";

import { AlertTriangle, ArrowDownRight, ArrowRight, ArrowUpRight, CalendarClock, ChevronDown, Lightbulb, Minus, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import type { PrezentareDto } from "@/lib/performanta-prezentare";
import { ETICHETE_STARE, ritmAsteptat, type StareRitm } from "@/lib/performanta-masurare";

import { Card, CardHeader } from "../components/ui/card";
import { Select } from "../components/ui/input";
import { EmptyState } from "../components/ui/states";
import { useCalePerf } from "./perf-cale";
import { SelectorPerioada } from "./perf-nav";
import { BaraProgres, StareBadge, culoareStare, dataCompleta, dataOra, dataScurta, procent } from "./ui-comune";

const ORDINE: StareRitm[] = ["in_grafic", "finalizat", "in_risc", "intarziat", "fara_date", "neinceput"];

const PRIORITATE: Record<string, string> = { critica: "Critică", mare: "Mare", medie: "Medie", scazuta: "Scăzută" };

function Delta({ curent, anterior, eticheta }: { curent: number | null; anterior: number | null; eticheta: string }) {
  if (curent === null) return <p className="mt-1 text-[12px] text-[var(--ci-text-muted)]">Încă fără date în perioadă.</p>;
  if (anterior === null) return <p className="mt-1 text-[12px] text-[var(--ci-text-muted)]">Fără date în {eticheta}, deci nu avem cu ce compara.</p>;
  const puncte = Math.round((curent - anterior) * 100);
  const Icon = puncte > 0 ? ArrowUpRight : puncte < 0 ? ArrowDownRight : Minus;
  return (
    <p className="mt-1 flex items-center gap-1 text-[12px] text-[var(--ci-text-muted)]">
      <Icon className="size-3.5" aria-hidden />
      <span>
        <strong className="text-[var(--ci-text)]">
          {puncte > 0 ? "+" : ""}
          {puncte} puncte
        </strong>{" "}
        față de {eticheta} ({procent(anterior)})
      </span>
    </p>
  );
}

export function PrezentareClient({ orgSlug, d }: { orgSlug: string; d: PrezentareDto }) {
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
    const r = dupaDep.get(cheie) ?? { nume: o.departmentNume ?? "Fără departament", progrese: [], total: 0 };
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
          aria-label="Echipă / departament"
          className="!w-auto min-w-44"
          value={sp.get("dep") ?? ""}
          onChange={(e) => {
            const n = new URLSearchParams(sp.toString());
            if (e.target.value) n.set("dep", e.target.value);
            else n.delete("dep");
            router.replace(`${pathname}?${n.toString()}`, { scroll: false });
          }}
        >
          <option value="">Toată organizația</option>
          {d.optiuni.departamente.map((x) => (
            <option key={x.id} value={x.id}>
              {x.nume}
            </option>
          ))}
        </Select>
      </div>

      {toateGoale ? (
        <EmptyState
          title="Niciun obiectiv în această perioadă"
          description="Începe cu un obiectiv pentru organizație sau pentru o echipă; apoi leagă-i rezultate-cheie măsurabile."
          action={
            <div className="flex flex-col items-center gap-3">
            {!baza.endsWith("/demo") && (
              <Link href={`/${orgSlug}/crm/performanta/demo`} className="text-[13px] font-medium text-[var(--ci-purple)] underline underline-offset-2 hover:opacity-80">
                Vezi cum arată cu date: exemplu demonstrativ (fictiv, nimic din datele tale)
              </Link>
            )}
            <Link href={`${baza}/obiective${coada()}`} className="inline-flex h-9 items-center gap-2 rounded-[var(--ci-radius-btn)] bg-[var(--ci-primary)] px-3.5 text-sm font-medium text-white hover:bg-[var(--ci-primary-hover)]">
              Mergi la obiective <ArrowRight className="size-4" aria-hidden />
            </Link>
            </div>
          }
        />
      ) : (
        <>
          <section aria-label="Cifre de ansamblu" className="grid grid-cols-2 gap-2.5 lg:grid-cols-5">
            <Card className="col-span-2 !p-4 lg:col-span-2">
              <p className="text-[12px] text-[var(--ci-text-muted)]">Progres mediu al obiectivelor</p>
              <p className="ci-display ci-tabular mt-0.5 text-3xl font-bold text-[var(--ci-text)]">{procent(d.curenta.progresMediu)}</p>
              <Delta curent={d.curenta.progresMediu} anterior={d.anterioara.progresMediu} eticheta={d.anterioara.eticheta} />
              <p className="mt-1.5 text-[11.5px] text-[var(--ci-text-muted)]">
                Media celor {d.curenta.cuDate} obiective care au date (din {d.curenta.nrObiective}); fiecare plafonat la 100%, cele fără date nu se socotesc ca zero.
              </p>
              <p className="mt-1 text-[11.5px] text-[var(--ci-text-muted)]">
                Au trecut {Math.round(ritmAsteptat(d.perioada.start, d.perioada.end, d.azi) * 100)}% din perioadă. Cifra perioadei anterioare e cea de la final, deci diferența se citește ținând cont de cât din perioada curentă a trecut.
              </p>
            </Card>
            <Card className="!p-4">
              <p className="ci-display ci-tabular text-2xl font-bold text-[var(--ci-text)]">{numara(["in_risc", "intarziat"])}</p>
              <p className="mt-0.5 text-[12.5px] text-[var(--ci-text-muted)]">obiective în risc sau întârziate</p>
              <Link href={`${baza}/obiective${coada({ sortare: "risc" })}`} className="mt-1.5 inline-block text-[12.5px] font-medium text-[var(--ci-blue)] hover:underline">
                Vezi lista
              </Link>
            </Card>
            <Card className="!p-4">
              <p className="ci-display ci-tabular text-2xl font-bold text-[var(--ci-text)]">{d.blocaje.length}</p>
              <p className="mt-0.5 text-[12.5px] text-[var(--ci-text-muted)]">blocaje care așteaptă o decizie</p>
            </Card>
            <Card className="!p-4">
              <p className="ci-display ci-tabular text-2xl font-bold text-[var(--ci-text)]">{dateVechi}</p>
              <p className="mt-0.5 text-[12.5px] text-[var(--ci-text-muted)]">obiective cu date neactualizate la timp</p>
            </Card>
          </section>

          <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
            <Card>
              <CardHeader title="Obiectivele strategice" subtitle={`${d.perioada.eticheta} · progres față de ritmul așteptat azi`} />
              {strategice.length === 0 ? (
                <p className="text-[13px] text-[var(--ci-text-muted)]">Nu există obiective strategice în această perioadă. Obiectivele strategice descriu direcția organizației și le stabilește conducerea.</p>
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
                        {o.responsabilNume ?? "Nealocat"} · {o.rkCuDate} din {o.rkTotal} rezultate-cheie cu date · {dataScurta(o.perioadaStart)} – {dataScurta(o.perioadaEnd)}
                      </p>
                      <div className="mt-1.5">
                        <BaraProgres progres={o.progres} stare={o.stare} perioada={{ start: o.perioadaStart, end: o.perioadaEnd }} azi={d.azi} eticheta={`Progres ${o.titlu}`} latime="w-full" />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <div className="space-y-5">
              <Card>
                <CardHeader title="Cum stau obiectivele" subtitle={`${totalStari} obiective · ${d.perioada.eticheta}`} />
                {totalStari === 0 ? (
                  <p className="text-[13px] text-[var(--ci-text-muted)]">Nimic de afișat.</p>
                ) : (
                  <>
                    <div role="img" aria-label={ORDINE.filter((s) => dupaStare.get(s)).map((s) => `${ETICHETE_STARE[s]}: ${dupaStare.get(s)}`).join(", ")} className="flex h-3 overflow-hidden rounded-full bg-[var(--ci-surface-2)]">
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
                <p className="mt-3 text-[11.5px] text-[var(--ci-text-muted)]">Sursa: obiectivele perioadei, calculate la {dataOra(d.actualizatLa)}. Anulatele nu intră.</p>
              </Card>

              <Card>
                <CardHeader title="Progres pe departamente" subtitle="Media obiectivelor cu date, plafonate la 100%" />
                <ul className="space-y-3">
                  {[...dupaDep.values()]
                    .sort((a, b) => a.nume.localeCompare(b.nume, "ro"))
                    .map((x) => {
                      const medie = x.progrese.length ? x.progrese.reduce((s, v) => s + v, 0) / x.progrese.length : null;
                      return (
                        <li key={x.nume}>
                          <div className="flex items-baseline justify-between gap-2 text-[13px]">
                            <span className="font-medium text-[var(--ci-text)]">{x.nume}</span>
                            <span className="text-[12px] text-[var(--ci-text-muted)]">
                              {x.progrese.length} din {x.total} cu date
                            </span>
                          </div>
                          <div className="mt-1">
                            <BaraProgres progres={medie} stare={medie === null ? "fara_date" : "in_grafic"} azi={d.azi} eticheta={`Progres mediu ${x.nume}`} latime="w-full" />
                          </div>
                        </li>
                      );
                    })}
                </ul>
                <p className="mt-3 text-[11.5px] text-[var(--ci-text-muted)]">Culoarea nu judecă: compară doar departamentele între ele ca mărime, fără clasament. Starea fiecărui obiectiv e în listă.</p>
              </Card>
            </div>
          </div>

          <Card>
            <CardHeader title="Acțiuni recomandate" subtitle="Sugestii bazate pe reguli explicite. Fiecare arată regula și datele din spate; decizia e a ta." />
            {d.recomandari.length === 0 ? (
              <p className="flex items-center gap-2 text-[13px] text-[var(--ci-text-muted)]">
                <Lightbulb className="size-4" aria-hidden /> Nu avem nimic de semnalat acum: obiectivele sunt în ritm și datele sunt la zi.
              </p>
            ) : (
              <ul className="divide-y divide-[var(--ci-border)]">
                {d.recomandari.map((r) => (
                  <li key={r.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle className={`mt-0.5 size-4 shrink-0 ${r.prioritate === 1 ? "text-[var(--ci-red)]" : r.prioritate === 2 ? "text-[var(--ci-amber)]" : "text-[var(--ci-text-muted)]"}`} aria-hidden />
                      <div className="min-w-0 flex-1">
                        <p className="text-[13.5px] font-semibold text-[var(--ci-text)]">
                          <span className="mr-2 rounded-full bg-[var(--ci-surface-2)] px-1.5 py-px align-middle text-[11px] font-medium text-[var(--ci-text-muted)]">{r.prioritate === 1 ? "Urgent" : r.prioritate === 2 ? "Important" : "De urmărit"}</span>
                          {r.titlu}
                        </p>
                        <p className="mt-0.5 text-[13px] text-[var(--ci-text-muted)]">{r.text}</p>
                        <details className="group mt-1">
                          <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-[12px] font-medium text-[var(--ci-blue)] focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none">
                            <ChevronDown className="size-3.5 transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden /> De ce primești sugestia
                          </summary>
                          <dl className="mt-1.5 space-y-1 text-[12px] text-[var(--ci-text-muted)]">
                            <div>
                              <dt className="inline font-medium text-[var(--ci-text)]">Regula: </dt>
                              <dd className="inline">{r.regula}</dd>
                            </div>
                            <div>
                              <dt className="inline font-medium text-[var(--ci-text)]">Datele: </dt>
                              <dd className="inline">{r.baza}</dd>
                            </div>
                          </dl>
                        </details>
                      </div>
                      {r.obiectivId && (
                        <Link href={`${baza}/obiective${coada({ ob: r.obiectivId })}`} className="shrink-0 text-[12.5px] font-medium text-[var(--ci-blue)] hover:underline">
                          Deschide
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
              <CardHeader title="Blocaje care cer o decizie" subtitle="Deschise, marcate „necesită decizie”" />
              {d.blocaje.length === 0 ? (
                <p className="text-[13px] text-[var(--ci-text-muted)]">Niciun blocaj nu așteaptă o decizie.</p>
              ) : (
                <ul className="space-y-3">
                  {d.blocaje.map((b) => (
                    <li key={b.id} className="text-[13px]">
                      <p className="flex items-start gap-1.5 font-medium text-[var(--ci-text)]">
                        <ShieldAlert className={`mt-0.5 size-4 shrink-0 ${b.intarziat ? "text-[var(--ci-red)]" : "text-[var(--ci-amber)]"}`} aria-hidden />
                        <span>{b.contextTitlu ?? "Blocaj"}</span>
                      </p>
                      <p className="mt-0.5 pl-5 text-[var(--ci-text-muted)]">{b.motiv}</p>
                      <p className="mt-0.5 pl-5 text-[12px] text-[var(--ci-text-muted)]">
                        Revenire până la {dataCompleta(b.termenRevenire)}
                        {b.intarziat && <span className="font-medium text-[var(--ci-red)]"> · termen depășit</span>}
                        {b.rezolvator && ` · de rezolvat de ${b.rezolvator}`}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card>
              <CardHeader title="Termene în următoarele 14 zile" subtitle="Activități deschise" />
              {d.termene.length === 0 ? (
                <p className="text-[13px] text-[var(--ci-text-muted)]">Nicio activitate cu termen în următoarele două săptămâni.</p>
              ) : (
                <ul className="space-y-2.5">
                  {d.termene.slice(0, 8).map((t) => (
                    <li key={t.id} className="flex items-start gap-2 text-[13px]">
                      <CalendarClock className="mt-0.5 size-4 shrink-0 text-[var(--ci-text-muted)]" aria-hidden />
                      <div className="min-w-0">
                        <p className="truncate font-medium text-[var(--ci-text)]">{t.titlu}</p>
                        <p className="text-[12px] text-[var(--ci-text-muted)]">
                          {dataScurta(t.termen)} · {t.responsabilNume ?? "Nealocat"} · prioritate {PRIORITATE[t.prioritate]?.toLowerCase() ?? t.prioritate}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card>
              <CardHeader title="Munca deschisă" subtitle="Activități neterminate pe persoană (în ordine alfabetică)" />
              {d.munca.length === 0 ? (
                <p className="text-[13px] text-[var(--ci-text-muted)]">Nicio activitate deschisă.</p>
              ) : (
                <ul className="space-y-2">
                  {d.munca.map((m) => (
                    <li key={m.angajatId} className="flex items-baseline justify-between gap-3 text-[13px]">
                      <span className="truncate text-[var(--ci-text)]">{m.nume}</span>
                      <span className="ci-tabular shrink-0 text-[12px] text-[var(--ci-text-muted)]">
                        {m.deschise} deschise{m.blocate > 0 && ` · ${m.blocate} blocate`}
                        {m.intarziate > 0 && ` · ${m.intarziate} peste termen`}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-3 text-[11.5px] text-[var(--ci-text-muted)]">Arată volumul de muncă, nu performanța. Numărul de activități nu spune cât de bine merge cineva.</p>
            </Card>
          </div>
          <p className="text-[11.5px] text-[var(--ci-text-muted)]">
            Date calculate la {dataOra(d.actualizatLa)} · {activ.length} obiective în {d.perioada.eticheta}.
          </p>
        </>
      )}
    </div>
  );
}
