"use client";

import { Download, Lock, Printer } from "lucide-react";

import { PERFORMANTA_UI5_DICT } from "@/lib/i18n/dictionaries/performanta-ui-5";
import type { RaportEvaluari } from "@/lib/performanta-rapoarte-evaluari";

import { Card, CardHeader } from "../components/ui/card";
import { EmptyState } from "../components/ui/states";
import { useLocale } from "../lib/locale-context";
import { useCalePerf } from "./perf-cale";
import { SelectorPerioada } from "./perf-nav";
import { dataCompleta, dataOra, dataScurta, etichetaPerioada } from "./ui-comune";

export function RapoarteEvaluariClient({ orgSlug, d, admin, manager }: { orgSlug: string; d: RaportEvaluari; admin: boolean; manager: boolean }) {
  const locale = useLocale();
  const dict = PERFORMANTA_UI5_DICT[locale].evaluari;
  const t = d.totaluri;
  const { demo } = useCalePerf(orgSlug);
  const etPerioada = etichetaPerioada(d.perioada, locale);
  const scop = admin ? dict.scopAdmin : manager ? dict.scopManager : dict.scopTu;
  const cifre = [
    { e: dict.cifre[0], n: t.cuCheckin },
    { e: dict.cifre[1], n: t.cu1la1 },
    { e: dict.cifre[2], n: t.cuReview },
    { e: dict.cifre[3], n: t.cuAutoevaluare },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <SelectorPerioada />
        <div className="flex flex-wrap gap-2">
          <a
            href={demo ? "#" : `/api/${orgSlug}/performanta-evaluari-export?perioada=${d.perioada.cod}`}
            aria-disabled={demo}
            title={demo ? PERFORMANTA_UI5_DICT[locale].rapoarte.exportDemo : undefined}
            onClick={(e) => {
              if (demo || !window.confirm(dict.confirmaExport)) e.preventDefault();
            }}
            className="inline-flex h-9 items-center gap-2 rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] bg-[var(--ci-surface)] px-3.5 text-sm font-medium text-[var(--ci-text)] hover:bg-[var(--ci-surface-2)] focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none"
          >
            <Download className="size-4" aria-hidden /> {dict.exportConfidential}
          </a>
          <button type="button" onClick={() => window.print()} className="inline-flex h-9 items-center gap-2 rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] bg-[var(--ci-surface)] px-3.5 text-sm font-medium text-[var(--ci-text)] hover:bg-[var(--ci-surface-2)] focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none">
            <Printer className="size-4" aria-hidden /> {dict.tiparesteAcoperirea}
          </button>
        </div>
      </div>

      <div className="flex items-start gap-2 rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] bg-[var(--ci-surface)] px-4 py-3 text-[13px] text-[var(--ci-text-muted)]">
        <Lock className="mt-0.5 size-4 shrink-0" aria-hidden />
        <p>
          <strong className="text-[var(--ci-text)]">{dict.confBold}</strong>
          {dict.confA(scop)}
          <strong>{dict.participare}</strong>
          {dict.confB(etPerioada, dataOra(d.actualizatLa, locale))}
        </p>
      </div>

      {d.persoane.length === 0 ? (
        <EmptyState title={dict.golTitlu} description={dict.golDescriere} />
      ) : (
        <>
          <section aria-label={dict.cifreAmsamblu} className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
            {cifre.map((c) => (
              <Card key={c.e} className="!p-4">
                <p className="ci-display ci-tabular text-2xl font-bold text-[var(--ci-text)]">
                  {c.n}
                  <span className="text-[14px] font-normal text-[var(--ci-text-muted)]">{dict.din(t.persoane)}</span>
                </p>
                <p className="mt-0.5 text-[12.5px] text-[var(--ci-text-muted)]">{c.e}</p>
              </Card>
            ))}
          </section>

          <Card padded={false}>
            <div className="px-5 pt-5">
              <CardHeader title={dict.acoperire} subtitle={dict.acoperireSub(d.perioada.saptamaniScurse, dataScurta(d.perioada.start, locale))} />
            </div>
            <div className="ci-scrollbar max-h-[65vh] overflow-auto">
              <table className="w-full min-w-[56rem] border-collapse text-[12.5px]">
                <thead className="sticky top-0 z-[1] bg-[var(--ci-surface-2)] text-left text-[12px] font-semibold text-[var(--ci-text-muted)]">
                  <tr>
                    <th scope="col" className="px-4 py-2">{dict.persoana}</th>
                    <th scope="col" className="px-3 py-2 text-right">{dict.actualizari}</th>
                    <th scope="col" className="px-3 py-2 text-right">1:1</th>
                    <th scope="col" className="px-3 py-2">{dict.ultima1la1}</th>
                    <th scope="col" className="px-3 py-2">{dict.review1}</th>
                    <th scope="col" className="px-3 py-2">{dict.autoevaluare}</th>
                    <th scope="col" className="px-3 py-2 text-right">{dict.feedback}</th>
                    <th scope="col" className="px-3 py-2 text-right">{dict.dezvoltare}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--ci-border)]">
                  {d.persoane.map((p) => (
                    <tr key={p.id}>
                      <th scope="row" className="px-4 py-2 text-left font-semibold text-[var(--ci-text)]">{p.nume}</th>
                      <td className="ci-tabular px-3 py-2 text-right">{dict.checkinuri(p.checkinuri, d.perioada.saptamaniScurse)}</td>
                      <td className="ci-tabular px-3 py-2 text-right">{p.nr1la1}</td>
                      <td className="px-3 py-2 text-[var(--ci-text-muted)]">{p.ultima1la1 ? dataCompleta(p.ultima1la1, locale) : "—"}</td>
                      <td className="px-3 py-2 text-[var(--ci-text-muted)]">{dict.review[p.review]}</td>
                      <td className="px-3 py-2 text-[var(--ci-text-muted)]">{p.autoevaluare ? dict.da : dict.nu}</td>
                      <td className="ci-tabular px-3 py-2 text-right">{p.feedbackPrimit} / {p.feedbackDat}</td>
                      <td className="ci-tabular px-3 py-2 text-right">{p.dezvoltareAtinse} / {p.dezvoltareInCurs} / {p.dezvoltareTotal}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="border-t border-[var(--ci-border)] px-5 py-3 text-[11.5px] text-[var(--ci-text-muted)]">
              {dict.nota}
            </p>
          </Card>
        </>
      )}
    </div>
  );
}
