"use client";

import { Download, Printer } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import type { Locale } from "@/lib/i18n/config";
import { PERFORMANTA_UI_DICT } from "@/lib/i18n/dictionaries/performanta-ui";
import { PERFORMANTA_UI5_DICT } from "@/lib/i18n/dictionaries/performanta-ui-5";
import type { DateRapoarte } from "@/lib/performanta-rapoarte";
import type { ObiectivDto } from "@/lib/performanta-tipuri";
import { StareBadge, culoareStare, dataOra, dataScurta, etichetaPerioada, procent } from "./ui-comune";

import { Card, CardHeader } from "../components/ui/card";
import { Select } from "../components/ui/input";
import { EmptyState } from "../components/ui/states";
import { useLocale } from "../lib/locale-context";
import { useCalePerf } from "./perf-cale";
import { SelectorPerioada } from "./perf-nav";

// Rândurile tabelului „Rezultate-cheie”. În română vin gata formatate din bibliotecă (aceleași ca la exportul Excel); în engleză se reconstruiesc din obiective.
type Rand = DateRapoarte["randuri"][number];
function randuriPeLimba(d: DateRapoarte, locale: Locale): Rand[] {
  if (locale === "ro") return d.randuri;
  const dict = PERFORMANTA_UI5_DICT[locale].rapoarte;
  const comune = PERFORMANTA_UI_DICT[locale].comune;
  const nr = (n: number | null, u: string | null) => (n === null ? "—" : `${Math.round(n * 100) / 100}${u ? ` ${u}` : ""}`);
  const out: Rand[] = [];
  for (const o of d.obiective as ObiectivDto[]) {
    if (o.status === "anulat") continue;
    for (const r of o.rezultate.filter((x) => x.status === "activ")) {
      const t = r.metoda === "binar" ? dict.realizat : r.metoda === "interval" ? `${nr(r.tinta, r.unitate)} – ${nr(r.tintaMax, r.unitate)}` : `${r.metoda === "descrescator" ? "≤ " : "≥ "}${nr(r.tinta, r.unitate)}`;
      out.push({
        obiectiv: o.titlu,
        nivel: o.nivel,
        responsabil: o.responsabilNume ?? "",
        departament: o.departmentNume ?? "",
        progresObiectiv: o.progres,
        stareObiectiv: comune.stare[o.stare],
        rezultat: r.titlu,
        metoda: r.metoda,
        tinta: t,
        valoare: r.valoare === null ? dict.faraDateValoare : r.metoda === "binar" ? (r.valoare >= 1 ? dict.realizat : dict.nerealizat) : nr(r.valoare, r.unitate),
        progres: r.progres,
        stare: comune.stare[r.stare],
        sursa: r.sursaEticheta ?? dict.introdusManual,
        ultimaActualizare: r.ultimaActualizare,
        incredere: r.incredere ?? "",
        formula: r.formula ?? "",
        atribuire: r.atribuire ?? "",
      });
    }
  }
  return out;
}


// Grafic cu bare grupate (planificate / finalizate) pe săptămâni. Valorile exacte sunt scrise pe fiecare bară și în tabelul de dedesubt.
function BareSaptamani({ date }: { date: DateRapoarte["saptamani"] }) {
  const locale = useLocale();
  const dict = PERFORMANTA_UI5_DICT[locale].rapoarte;
  const max = Math.max(1, ...date.map((s) => s.planificate));
  const lat = 56;
  const w = Math.max(date.length * lat + 40, 300);
  const h = 170;
  const baza = h - 28;
  const inalt = (n: number) => (n / max) * (baza - 22);
  return (
    <div className="ci-scrollbar overflow-x-auto">
      <svg role="img" aria-label={dict.graficAria(date.map((s) => dict.graficSegment(dataScurta(s.luni, locale), s.planificate, s.finalizate)).join("; "))} viewBox={`0 0 ${w} ${h}`} width={w} height={h} className="block">
        <line x1="24" x2={w - 8} y1={baza} y2={baza} stroke="var(--ci-border)" />
        {date.map((s, i) => {
          const x = 30 + i * lat;
          return (
            <g key={s.luni}>
              <rect x={x} y={baza - inalt(s.planificate)} width="20" height={inalt(s.planificate)} rx="3" fill="var(--ci-border-strong)" />
              <rect x={x + 22} y={baza - inalt(s.finalizate)} width="20" height={inalt(s.finalizate)} rx="3" fill="var(--ci-green)" />
              <text x={x + 10} y={baza - inalt(s.planificate) - 4} textAnchor="middle" fontSize="11" fill="var(--ci-text-muted)">{s.planificate}</text>
              <text x={x + 32} y={baza - inalt(s.finalizate) - 4} textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--ci-text)">{s.finalizate}</text>
              <text x={x + 21} y={h - 10} textAnchor="middle" fontSize="10.5" fill="var(--ci-text-muted)">{dataScurta(s.luni, locale)}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function RapoarteClient({ orgSlug, d, departamente }: { orgSlug: string; d: DateRapoarte; departamente: { id: string; nume: string }[] }) {
  const locale = useLocale();
  const dict = PERFORMANTA_UI5_DICT[locale].rapoarte;
  const etPerioada = etichetaPerioada(d.perioada, locale);
  const randuri = randuriPeLimba(d, locale);
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const dep = sp.get("dep") ?? "";
  const { demo, baza } = useCalePerf(orgSlug);
  const qs = (tip: string) => {
    const n = new URLSearchParams({ tip, perioada: d.perioada.cod });
    if (dep) n.set("dep", dep);
    return `/api/${orgSlug}/performanta-export?${n.toString()}`;
  };
  const totalStari = d.stari.reduce((s, x) => s + x.n, 0);
  const totalSurse = d.surse.manual + d.surse.crm + d.surse.kpi;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex flex-wrap items-center gap-2">
          <SelectorPerioada />
          <Select
            aria-label={dict.departament}
            className="!w-auto min-w-44"
            value={dep}
            onChange={(e) => {
              const n = new URLSearchParams(sp.toString());
              if (e.target.value) n.set("dep", e.target.value);
              else n.delete("dep");
              router.replace(`${pathname}?${n.toString()}`, { scroll: false });
            }}
          >
            <option value="">{dict.toataOrg}</option>
            {departamente.map((x) => (
              <option key={x.id} value={x.id}>
                {x.nume}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={demo ? "#" : qs("obiective")} onClick={(e) => demo && e.preventDefault()} aria-disabled={demo} title={demo ? dict.exportDemo : undefined} className="inline-flex h-9 items-center gap-2 rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] bg-[var(--ci-surface)] px-3.5 text-sm font-medium text-[var(--ci-text)] hover:bg-[var(--ci-surface-2)] focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none">
            <Download className="size-4" aria-hidden /> {dict.obiectiveExcel}
          </a>
          <a href={demo ? "#" : qs("munca")} onClick={(e) => demo && e.preventDefault()} aria-disabled={demo} title={demo ? dict.exportDemo : undefined} className="inline-flex h-9 items-center gap-2 rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] bg-[var(--ci-surface)] px-3.5 text-sm font-medium text-[var(--ci-text)] hover:bg-[var(--ci-surface-2)] focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none">
            <Download className="size-4" aria-hidden /> {dict.muncaExcel}
          </a>
          <button type="button" onClick={() => window.print()} className="inline-flex h-9 items-center gap-2 rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] bg-[var(--ci-surface)] px-3.5 text-sm font-medium text-[var(--ci-text)] hover:bg-[var(--ci-surface-2)] focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none">
            <Printer className="size-4" aria-hidden /> {dict.tipareste}
          </button>
        </div>
      </div>

      <p className="text-[12px] text-[var(--ci-text-muted)]">
        {dict.perioada}<strong className="text-[var(--ci-text)]">{etPerioada}</strong>
        {dict.perioadaText(dataScurta(d.perioada.start, locale), dataScurta(d.perioada.end, locale), dataOra(d.actualizatLa, locale))}
        <Link href={`${baza}/rapoarte/evaluari?perioada=${d.perioada.cod}`} className="font-medium text-[var(--ci-blue)] hover:underline">{dict.raportEvaluari}</Link>.
      </p>

      {d.obiective.length === 0 && d.persoane.length === 0 ? (
        <EmptyState title={dict.golTitlu} description={dict.golDescriere} />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card className="min-w-0">
              <CardHeader title={dict.cumStau} subtitle={dict.cumStauSub(totalStari, etPerioada)} />
              {totalStari === 0 ? (
                <p className="text-[13px] text-[var(--ci-text-muted)]">{dict.niciunObiectiv}</p>
              ) : (
                <>
                  <div role="img" aria-label={d.stari.map((s) => `${PERFORMANTA_UI_DICT[locale].comune.stare[s.stare]}: ${s.n}`).join(", ")} className="flex h-3 overflow-hidden rounded-full bg-[var(--ci-surface-2)]">
                    {d.stari.map((s) => (
                      <span key={s.stare} style={{ width: `${(s.n / totalStari) * 100}%`, background: culoareStare(s.stare) }} />
                    ))}
                  </div>
                  <ul className="mt-3 grid grid-cols-2 gap-1.5">
                    {d.stari.map((s) => (
                      <li key={s.stare} className="flex items-center justify-between gap-2 text-[12.5px]">
                        <StareBadge stare={s.stare} />
                        <span className="ci-tabular font-semibold text-[var(--ci-text)]">{s.n}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              <p className="mt-3 text-[11.5px] text-[var(--ci-text-muted)]">{dict.notaObiective}</p>
            </Card>

            <Card className="min-w-0">
              <CardHeader title={dict.deUnde} subtitle={dict.deUndeSub(totalSurse)} />
              {totalSurse === 0 ? (
                <p className="text-[13px] text-[var(--ci-text-muted)]">{dict.niciunRk}</p>
              ) : (
                <>
                  <div role="img" aria-label={dict.surseAria(d.surse.manual, d.surse.crm, d.surse.kpi)} className="flex h-3 overflow-hidden rounded-full bg-[var(--ci-surface-2)]">
                    <span style={{ width: `${(d.surse.manual / totalSurse) * 100}%`, background: "var(--ci-amber)" }} />
                    <span style={{ width: `${(d.surse.crm / totalSurse) * 100}%`, background: "var(--ci-blue)" }} />
                    <span style={{ width: `${(d.surse.kpi / totalSurse) * 100}%`, background: "var(--ci-green)" }} />
                  </div>
                  <ul className="mt-3 space-y-1.5 text-[12.5px] text-[var(--ci-text-muted)]">
                    <li className="flex justify-between"><span><span className="mr-2 inline-block size-2.5 rounded-sm" style={{ background: "var(--ci-amber)" }} aria-hidden />{dict.introduseManual}</span><strong className="ci-tabular text-[var(--ci-text)]">{d.surse.manual}</strong></li>
                    <li className="flex justify-between"><span><span className="mr-2 inline-block size-2.5 rounded-sm" style={{ background: "var(--ci-blue)" }} aria-hidden />{dict.calculateCrm}</span><strong className="ci-tabular text-[var(--ci-text)]">{d.surse.crm}</strong></li>
                    <li className="flex justify-between"><span><span className="mr-2 inline-block size-2.5 rounded-sm" style={{ background: "var(--ci-green)" }} aria-hidden />{dict.preluateKpi}</span><strong className="ci-tabular text-[var(--ci-text)]">{d.surse.kpi}</strong></li>
                  </ul>
                </>
              )}
              <p className="mt-3 text-[11.5px] text-[var(--ci-text-muted)]">{dict.notaSurse}</p>
            </Card>
          </div>

          <Card>
            <CardHeader title={dict.muncaSaptamani} subtitle={dict.muncaSaptamaniSub} />
            {d.saptamani.every((s) => s.planificate === 0) ? (
              <p className="text-[13px] text-[var(--ci-text-muted)]">{dict.niciOActivitate}</p>
            ) : (
              <>
                <BareSaptamani date={d.saptamani} />
                <ul className="mt-1 flex gap-4 text-[12px] text-[var(--ci-text-muted)]" aria-label={dict.legenda}>
                  <li><span className="mr-1.5 inline-block size-2.5 rounded-sm" style={{ background: "var(--ci-border-strong)" }} aria-hidden />{dict.planificate}</li>
                  <li><span className="mr-1.5 inline-block size-2.5 rounded-sm" style={{ background: "var(--ci-green)" }} aria-hidden />{dict.finalizate}</li>
                </ul>
                <details className="mt-2">
                  <summary className="cursor-pointer text-[12.5px] font-medium text-[var(--ci-blue)]">{dict.valorileExacte}</summary>
                  <div className="ci-scrollbar mt-2 overflow-x-auto">
                    <table className="w-full min-w-[28rem] border-collapse text-[12.5px]">
                      <thead className="text-left text-[12px] text-[var(--ci-text-muted)]">
                        <tr><th className="py-1 pr-3">{dict.saptamanaDe}</th><th className="px-3 py-1 text-right">{dict.planificate}</th><th className="px-3 py-1 text-right">{dict.finalizate}</th><th className="px-3 py-1 text-right">{dict.laTermen}</th></tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--ci-border)]">
                        {d.saptamani.map((s) => (
                          <tr key={s.luni}><th scope="row" className="py-1 pr-3 text-left font-normal">{dataScurta(s.luni, locale)}</th><td className="ci-tabular px-3 py-1 text-right">{s.planificate}</td><td className="ci-tabular px-3 py-1 text-right">{s.finalizate}</td><td className="ci-tabular px-3 py-1 text-right">{s.laTermen}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              </>
            )}
            <p className="mt-3 text-[11.5px] text-[var(--ci-text-muted)]">{dict.notaMunca}</p>
          </Card>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card className="min-w-0">
              <CardHeader title={dict.pePersoana} subtitle={dict.pePersoanaSub} />
              {d.persoane.length === 0 ? (
                <p className="text-[13px] text-[var(--ci-text-muted)]">{dict.nicioActivitate}</p>
              ) : (
                <div className="ci-scrollbar overflow-x-auto">
                  <table className="w-full min-w-[30rem] border-collapse text-[12.5px]">
                    <thead className="text-left text-[12px] text-[var(--ci-text-muted)]">
                      <tr><th className="py-1 pr-3">{dict.persoana}</th><th className="px-2 py-1 text-right">{dict.planificate}</th><th className="px-2 py-1 text-right">{dict.finalizate}</th><th className="px-2 py-1 text-right">{dict.restante}</th><th className="px-2 py-1 text-right">{dict.blocate}</th></tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--ci-border)]">
                      {d.persoane.map((p) => (
                        <tr key={p.nume}><th scope="row" className="py-1.5 pr-3 text-left font-normal text-[var(--ci-text)]">{p.nume}</th><td className="ci-tabular px-2 py-1.5 text-right">{p.planificate}</td><td className="ci-tabular px-2 py-1.5 text-right">{p.finalizate}</td><td className="ci-tabular px-2 py-1.5 text-right">{p.restante}</td><td className="ci-tabular px-2 py-1.5 text-right">{p.blocajeDeschise}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="mt-3 text-[11.5px] text-[var(--ci-text-muted)]">{dict.notaPersoana}</p>
            </Card>

            <Card className="min-w-0">
              <CardHeader title={dict.blocaje} subtitle={dict.blocajeSub(etPerioada)} />
              <dl className="grid grid-cols-3 gap-2 text-center">
                {[[dict.raportate, d.blocaje.total], [dict.incaDeschise, d.blocaje.deschise], [dict.rezolvate, d.blocaje.rezolvate]].map(([e, v]) => (
                  <div key={e as string} className="rounded-[var(--ci-radius-btn)] bg-[var(--ci-surface-2)] px-2 py-2.5">
                    <dd className="ci-display ci-tabular text-xl font-bold text-[var(--ci-text)]">{v}</dd>
                    <dt className="text-[12px] text-[var(--ci-text-muted)]">{e}</dt>
                  </div>
                ))}
              </dl>
              <p className="mt-3 text-[13px] text-[var(--ci-text)]">
                {dict.timpMediu}<strong>{d.blocaje.zileMedii === null ? dict.niciRezolvat : dict.zile(locale === "ro" ? String(d.blocaje.zileMedii).replace(".", ",") : String(d.blocaje.zileMedii))}</strong>
              </p>
              <p className="mt-3 text-[11.5px] text-[var(--ci-text-muted)]">{dict.notaBlocaje}</p>
            </Card>
          </div>

          <Card padded={false}>
            <div className="px-5 pt-5">
              <CardHeader title={dict.rezultateCheie} subtitle={dict.rezultateCheieSub} />
            </div>
            {randuri.length === 0 ? (
              <p className="px-5 pb-5 text-[13px] text-[var(--ci-text-muted)]">{dict.niciRkPerioada}</p>
            ) : (
              <div className="ci-scrollbar max-h-[60vh] overflow-auto">
                <table className="w-full min-w-[60rem] border-collapse text-[12.5px]">
                  <thead className="sticky top-0 z-[1] bg-[var(--ci-surface-2)] text-left text-[12px] font-semibold text-[var(--ci-text-muted)]">
                    <tr>
                      <th scope="col" className="px-4 py-2">{dict.obiectiv}</th>
                      <th scope="col" className="px-3 py-2">{dict.rezultatCheie}</th>
                      <th scope="col" className="px-3 py-2 text-right">{dict.valoare}</th>
                      <th scope="col" className="px-3 py-2">{dict.tinta}</th>
                      <th scope="col" className="px-3 py-2 text-right">{dict.progres}</th>
                      <th scope="col" className="px-3 py-2">{dict.stare}</th>
                      <th scope="col" className="px-3 py-2">{dict.sursa}</th>
                      <th scope="col" className="px-3 py-2">{dict.actualizat}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--ci-border)]">
                    {randuri.map((r, i) => (
                      <tr key={`${r.obiectiv}-${r.rezultat}-${i}`} className="align-top">
                        <th scope="row" className="px-4 py-2 text-left font-normal">
                          <span className="block font-semibold text-[var(--ci-text)]">{r.obiectiv}</span>
                          <span className="text-[var(--ci-text-muted)]">{r.responsabil}</span>
                        </th>
                        <td className="px-3 py-2">
                          <span className="block text-[var(--ci-text)]">{r.rezultat}</span>
                          <details className="text-[var(--ci-text-muted)] print:open">
                            <summary className="cursor-pointer text-[11.5px] font-medium text-[var(--ci-blue)]">{dict.formulaAtribuire}</summary>
                            <p className="mt-1"><strong className="font-medium text-[var(--ci-text)]">{dict.formula}</strong> {r.formula || "—"}</p>
                            <p><strong className="font-medium text-[var(--ci-text)]">{dict.atribuire}</strong> {r.atribuire || "—"}</p>
                          </details>
                        </td>
                        <td className="ci-tabular px-3 py-2 text-right text-[var(--ci-text)]">{r.valoare}</td>
                        <td className="px-3 py-2 text-[var(--ci-text-muted)]">{r.tinta}</td>
                        <td className="ci-tabular px-3 py-2 text-right text-[var(--ci-text)]">{procent(r.progres, 0, locale)}</td>
                        <td className="px-3 py-2 text-[var(--ci-text-muted)]">{r.stare}</td>
                        <td className="px-3 py-2 text-[var(--ci-text-muted)]">{r.sursa}</td>
                        <td className="px-3 py-2 text-[var(--ci-text-muted)]">{r.ultimaActualizare ? dataOra(r.ultimaActualizare, locale) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
