"use client";

import { Download, Printer } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import type { DateRapoarte } from "@/lib/performanta-rapoarte";
import { StareBadge, culoareStare, dataOra, dataScurta, procent } from "./ui-comune";

import { Card, CardHeader } from "../components/ui/card";
import { Select } from "../components/ui/input";
import { EmptyState } from "../components/ui/states";
import { SelectorPerioada } from "./perf-nav";


// Grafic cu bare grupate (planificate / finalizate) pe săptămâni. Valorile exacte sunt scrise pe fiecare bară și în tabelul de dedesubt.
function BareSaptamani({ date }: { date: DateRapoarte["saptamani"] }) {
  const max = Math.max(1, ...date.map((s) => s.planificate));
  const lat = 56;
  const w = Math.max(date.length * lat + 40, 300);
  const h = 170;
  const baza = h - 28;
  const inalt = (n: number) => (n / max) * (baza - 22);
  return (
    <div className="ci-scrollbar overflow-x-auto">
      <svg role="img" aria-label={`Activități planificate și finalizate pe săptămâni. ${date.map((s) => `Săptămâna din ${dataScurta(s.luni)}: ${s.planificate} planificate, ${s.finalizate} finalizate`).join("; ")}.`} viewBox={`0 0 ${w} ${h}`} width={w} height={h} className="block">
        <line x1="24" x2={w - 8} y1={baza} y2={baza} stroke="var(--ci-border)" />
        {date.map((s, i) => {
          const x = 30 + i * lat;
          return (
            <g key={s.luni}>
              <rect x={x} y={baza - inalt(s.planificate)} width="20" height={inalt(s.planificate)} rx="3" fill="var(--ci-border-strong)" />
              <rect x={x + 22} y={baza - inalt(s.finalizate)} width="20" height={inalt(s.finalizate)} rx="3" fill="var(--ci-green)" />
              <text x={x + 10} y={baza - inalt(s.planificate) - 4} textAnchor="middle" fontSize="11" fill="var(--ci-text-muted)">{s.planificate}</text>
              <text x={x + 32} y={baza - inalt(s.finalizate) - 4} textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--ci-text)">{s.finalizate}</text>
              <text x={x + 21} y={h - 10} textAnchor="middle" fontSize="10.5" fill="var(--ci-text-muted)">{dataScurta(s.luni)}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function RapoarteClient({ orgSlug, d, departamente }: { orgSlug: string; d: DateRapoarte; departamente: { id: string; nume: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const dep = sp.get("dep") ?? "";
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
            aria-label="Departament"
            className="!w-auto min-w-44"
            value={dep}
            onChange={(e) => {
              const n = new URLSearchParams(sp.toString());
              if (e.target.value) n.set("dep", e.target.value);
              else n.delete("dep");
              router.replace(`${pathname}?${n.toString()}`, { scroll: false });
            }}
          >
            <option value="">Toată organizația</option>
            {departamente.map((x) => (
              <option key={x.id} value={x.id}>
                {x.nume}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={qs("obiective")} className="inline-flex h-9 items-center gap-2 rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] bg-[var(--ci-surface)] px-3.5 text-sm font-medium text-[var(--ci-text)] hover:bg-[var(--ci-surface-2)] focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none">
            <Download className="size-4" aria-hidden /> Obiective (Excel)
          </a>
          <a href={qs("munca")} className="inline-flex h-9 items-center gap-2 rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] bg-[var(--ci-surface)] px-3.5 text-sm font-medium text-[var(--ci-text)] hover:bg-[var(--ci-surface-2)] focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none">
            <Download className="size-4" aria-hidden /> Muncă (Excel)
          </a>
          <button type="button" onClick={() => window.print()} className="inline-flex h-9 items-center gap-2 rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] bg-[var(--ci-surface)] px-3.5 text-sm font-medium text-[var(--ci-text)] hover:bg-[var(--ci-surface-2)] focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none">
            <Printer className="size-4" aria-hidden /> Tipărește
          </button>
        </div>
      </div>

      <p className="text-[12px] text-[var(--ci-text-muted)]">
        Perioada: <strong className="text-[var(--ci-text)]">{d.perioada.eticheta}</strong> ({dataScurta(d.perioada.start)} – {dataScurta(d.perioada.end)}) · calculat la {dataOra(d.actualizatLa)} · conține doar ce ai dreptul să vezi. Evaluările (1:1, review, autoevaluare, feedback) nu intră în rapoarte.
      </p>

      {d.obiective.length === 0 && d.persoane.length === 0 ? (
        <EmptyState title="Nimic de raportat în această perioadă" description="Rapoartele se construiesc din obiective, rezultate-cheie, activități și blocaje. Adaugă-le sau schimbă perioada." />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card className="min-w-0">
              <CardHeader title="Cum stau obiectivele" subtitle={`${totalStari} obiective · ${d.perioada.eticheta}`} />
              {totalStari === 0 ? (
                <p className="text-[13px] text-[var(--ci-text-muted)]">Niciun obiectiv.</p>
              ) : (
                <>
                  <div role="img" aria-label={d.stari.map((s) => `${s.eticheta}: ${s.n}`).join(", ")} className="flex h-3 overflow-hidden rounded-full bg-[var(--ci-surface-2)]">
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
              <p className="mt-3 text-[11.5px] text-[var(--ci-text-muted)]">Unitate: obiective. Sursa: obiectivele perioadei, fără cele anulate.</p>
            </Card>

            <Card className="min-w-0">
              <CardHeader title="De unde vin valorile" subtitle={`${totalSurse} rezultate-cheie active`} />
              {totalSurse === 0 ? (
                <p className="text-[13px] text-[var(--ci-text-muted)]">Niciun rezultat-cheie.</p>
              ) : (
                <>
                  <div role="img" aria-label={`Introduse manual: ${d.surse.manual}; din CRM: ${d.surse.crm}; din KPI: ${d.surse.kpi}`} className="flex h-3 overflow-hidden rounded-full bg-[var(--ci-surface-2)]">
                    <span style={{ width: `${(d.surse.manual / totalSurse) * 100}%`, background: "var(--ci-amber)" }} />
                    <span style={{ width: `${(d.surse.crm / totalSurse) * 100}%`, background: "var(--ci-blue)" }} />
                    <span style={{ width: `${(d.surse.kpi / totalSurse) * 100}%`, background: "var(--ci-green)" }} />
                  </div>
                  <ul className="mt-3 space-y-1.5 text-[12.5px] text-[var(--ci-text-muted)]">
                    <li className="flex justify-between"><span><span className="mr-2 inline-block size-2.5 rounded-sm" style={{ background: "var(--ci-amber)" }} aria-hidden />Introduse manual</span><strong className="ci-tabular text-[var(--ci-text)]">{d.surse.manual}</strong></li>
                    <li className="flex justify-between"><span><span className="mr-2 inline-block size-2.5 rounded-sm" style={{ background: "var(--ci-blue)" }} aria-hidden />Calculate din CRM</span><strong className="ci-tabular text-[var(--ci-text)]">{d.surse.crm}</strong></li>
                    <li className="flex justify-between"><span><span className="mr-2 inline-block size-2.5 rounded-sm" style={{ background: "var(--ci-green)" }} aria-hidden />Preluate din KPI</span><strong className="ci-tabular text-[var(--ci-text)]">{d.surse.kpi}</strong></li>
                  </ul>
                </>
              )}
              <p className="mt-3 text-[11.5px] text-[var(--ci-text-muted)]">Valorile introduse manual au nevoie de actualizări; cele din CRM se calculează la zi.</p>
            </Card>
          </div>

          <Card>
            <CardHeader title="Munca pe săptămâni" subtitle="Activități cu termen în săptămână: planificate și finalizate" />
            {d.saptamani.every((s) => s.planificate === 0) ? (
              <p className="text-[13px] text-[var(--ci-text-muted)]">Nicio activitate cu termen în această perioadă.</p>
            ) : (
              <>
                <BareSaptamani date={d.saptamani} />
                <ul className="mt-1 flex gap-4 text-[12px] text-[var(--ci-text-muted)]" aria-label="Legendă">
                  <li><span className="mr-1.5 inline-block size-2.5 rounded-sm" style={{ background: "var(--ci-border-strong)" }} aria-hidden />Planificate</li>
                  <li><span className="mr-1.5 inline-block size-2.5 rounded-sm" style={{ background: "var(--ci-green)" }} aria-hidden />Finalizate</li>
                </ul>
                <details className="mt-2">
                  <summary className="cursor-pointer text-[12.5px] font-medium text-[var(--ci-blue)]">Valorile exacte</summary>
                  <div className="ci-scrollbar mt-2 overflow-x-auto">
                    <table className="w-full min-w-[28rem] border-collapse text-[12.5px]">
                      <thead className="text-left text-[12px] text-[var(--ci-text-muted)]">
                        <tr><th className="py-1 pr-3">Săptămâna de la</th><th className="px-3 py-1 text-right">Planificate</th><th className="px-3 py-1 text-right">Finalizate</th><th className="px-3 py-1 text-right">La termen</th></tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--ci-border)]">
                        {d.saptamani.map((s) => (
                          <tr key={s.luni}><th scope="row" className="py-1 pr-3 text-left font-normal">{dataScurta(s.luni)}</th><td className="ci-tabular px-3 py-1 text-right">{s.planificate}</td><td className="ci-tabular px-3 py-1 text-right">{s.finalizate}</td><td className="ci-tabular px-3 py-1 text-right">{s.laTermen}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              </>
            )}
            <p className="mt-3 text-[11.5px] text-[var(--ci-text-muted)]">Unitate: activități. Sursa: planul săptămânii, după termen. „La termen” = finalizate până la data termenului. Nu măsoară calitatea muncii.</p>
          </Card>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card className="min-w-0">
              <CardHeader title="Pe persoană" subtitle="În ordine alfabetică, fără clasament" />
              {d.persoane.length === 0 ? (
                <p className="text-[13px] text-[var(--ci-text-muted)]">Nicio activitate.</p>
              ) : (
                <div className="ci-scrollbar overflow-x-auto">
                  <table className="w-full min-w-[30rem] border-collapse text-[12.5px]">
                    <thead className="text-left text-[12px] text-[var(--ci-text-muted)]">
                      <tr><th className="py-1 pr-3">Persoană</th><th className="px-2 py-1 text-right">Planificate</th><th className="px-2 py-1 text-right">Finalizate</th><th className="px-2 py-1 text-right">Restante</th><th className="px-2 py-1 text-right">Blocate</th></tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--ci-border)]">
                      {d.persoane.map((p) => (
                        <tr key={p.nume}><th scope="row" className="py-1.5 pr-3 text-left font-normal text-[var(--ci-text)]">{p.nume}</th><td className="ci-tabular px-2 py-1.5 text-right">{p.planificate}</td><td className="ci-tabular px-2 py-1.5 text-right">{p.finalizate}</td><td className="ci-tabular px-2 py-1.5 text-right">{p.restante}</td><td className="ci-tabular px-2 py-1.5 text-right">{p.blocajeDeschise}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="mt-3 text-[11.5px] text-[var(--ci-text-muted)]">Numărul de activități nu spune cât de bine merge cineva: sarcinile diferă ca mărime și dificultate.</p>
            </Card>

            <Card className="min-w-0">
              <CardHeader title="Blocaje" subtitle={`Deschise în ${d.perioada.eticheta}`} />
              <dl className="grid grid-cols-3 gap-2 text-center">
                {[["Raportate", d.blocaje.total], ["Încă deschise", d.blocaje.deschise], ["Rezolvate", d.blocaje.rezolvate]].map(([e, v]) => (
                  <div key={e as string} className="rounded-[var(--ci-radius-btn)] bg-[var(--ci-surface-2)] px-2 py-2.5">
                    <dd className="ci-display ci-tabular text-xl font-bold text-[var(--ci-text)]">{v}</dd>
                    <dt className="text-[12px] text-[var(--ci-text-muted)]">{e}</dt>
                  </div>
                ))}
              </dl>
              <p className="mt-3 text-[13px] text-[var(--ci-text)]">
                Timp mediu până la rezolvare: <strong>{d.blocaje.zileMedii === null ? "— (niciun blocaj rezolvat încă)" : `${String(d.blocaje.zileMedii).replace(".", ",")} zile`}</strong>
              </p>
              <p className="mt-3 text-[11.5px] text-[var(--ci-text-muted)]">Unitate: blocaje. Un timp mare spune că deciziile sau resursele întârzie, nu că cineva greșește.</p>
            </Card>
          </div>

          <Card padded={false}>
            <div className="px-5 pt-5">
              <CardHeader title="Rezultate-cheie" subtitle="Valoare, țintă, sursă, formulă și limite de atribuire pentru fiecare" />
            </div>
            {d.randuri.length === 0 ? (
              <p className="px-5 pb-5 text-[13px] text-[var(--ci-text-muted)]">Niciun rezultat-cheie în perioadă.</p>
            ) : (
              <div className="ci-scrollbar max-h-[60vh] overflow-auto">
                <table className="w-full min-w-[60rem] border-collapse text-[12.5px]">
                  <thead className="sticky top-0 z-[1] bg-[var(--ci-surface-2)] text-left text-[12px] font-semibold text-[var(--ci-text-muted)]">
                    <tr>
                      <th scope="col" className="px-4 py-2">Obiectiv</th>
                      <th scope="col" className="px-3 py-2">Rezultat-cheie</th>
                      <th scope="col" className="px-3 py-2 text-right">Valoare</th>
                      <th scope="col" className="px-3 py-2">Țintă</th>
                      <th scope="col" className="px-3 py-2 text-right">Progres</th>
                      <th scope="col" className="px-3 py-2">Stare</th>
                      <th scope="col" className="px-3 py-2">Sursă</th>
                      <th scope="col" className="px-3 py-2">Actualizat</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--ci-border)]">
                    {d.randuri.map((r, i) => (
                      <tr key={`${r.obiectiv}-${r.rezultat}-${i}`} className="align-top">
                        <th scope="row" className="px-4 py-2 text-left font-normal">
                          <span className="block font-semibold text-[var(--ci-text)]">{r.obiectiv}</span>
                          <span className="text-[var(--ci-text-muted)]">{r.responsabil}</span>
                        </th>
                        <td className="px-3 py-2">
                          <span className="block text-[var(--ci-text)]">{r.rezultat}</span>
                          <details className="text-[var(--ci-text-muted)] print:open">
                            <summary className="cursor-pointer text-[11.5px] font-medium text-[var(--ci-blue)]">Formulă și atribuire</summary>
                            <p className="mt-1"><strong className="font-medium text-[var(--ci-text)]">Formula:</strong> {r.formula || "—"}</p>
                            <p><strong className="font-medium text-[var(--ci-text)]">Atribuire:</strong> {r.atribuire || "—"}</p>
                          </details>
                        </td>
                        <td className="ci-tabular px-3 py-2 text-right text-[var(--ci-text)]">{r.valoare}</td>
                        <td className="px-3 py-2 text-[var(--ci-text-muted)]">{r.tinta}</td>
                        <td className="ci-tabular px-3 py-2 text-right text-[var(--ci-text)]">{procent(r.progres)}</td>
                        <td className="px-3 py-2 text-[var(--ci-text-muted)]">{r.stare}</td>
                        <td className="px-3 py-2 text-[var(--ci-text-muted)]">{r.sursa}</td>
                        <td className="px-3 py-2 text-[var(--ci-text-muted)]">{r.ultimaActualizare ? dataOra(r.ultimaActualizare) : "—"}</td>
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
