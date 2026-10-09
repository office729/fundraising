"use client";

import { Download, Lock, Printer } from "lucide-react";

import type { RaportEvaluari } from "@/lib/performanta-rapoarte-evaluari";

import { Card, CardHeader } from "../components/ui/card";
import { EmptyState } from "../components/ui/states";
import { useCalePerf } from "./perf-cale";
import { SelectorPerioada } from "./perf-nav";
import { dataCompleta, dataOra, dataScurta } from "./ui-comune";

const REVIEW = { niciunul: "niciunul vizibil", privat: "privat", partajat: "partajat" } as const;

export function RapoarteEvaluariClient({ orgSlug, d, admin, manager }: { orgSlug: string; d: RaportEvaluari; admin: boolean; manager: boolean }) {
  const t = d.totaluri;
  const { demo } = useCalePerf(orgSlug);
  const scop = admin ? "toată organizația" : manager ? "tu și echipa ta" : "doar tu";
  const cifre = [
    { e: "cu cel puțin o actualizare săptămânală", n: t.cuCheckin },
    { e: "cu cel puțin o discuție 1:1", n: t.cu1la1 },
    { e: "cu un review în perioadă", n: t.cuReview },
    { e: "cu autoevaluare", n: t.cuAutoevaluare },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <SelectorPerioada />
        <div className="flex flex-wrap gap-2">
          <a
            href={demo ? "#" : `/api/${orgSlug}/performanta-evaluari-export?perioada=${d.perioada.cod}`}
            aria-disabled={demo}
            title={demo ? "Exportul nu e disponibil în modul demonstrativ" : undefined}
            onClick={(e) => {
              if (demo || !window.confirm("Exportul conține textele evaluărilor pe care ai voie să le vezi și rămâne în jurnalul de audit (cine, când, câte intrări). Documentul e confidențial. Continui?")) e.preventDefault();
            }}
            className="inline-flex h-9 items-center gap-2 rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] bg-[var(--ci-surface)] px-3.5 text-sm font-medium text-[var(--ci-text)] hover:bg-[var(--ci-surface-2)] focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none"
          >
            <Download className="size-4" aria-hidden /> Export confidențial (Excel)
          </a>
          <button type="button" onClick={() => window.print()} className="inline-flex h-9 items-center gap-2 rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] bg-[var(--ci-surface)] px-3.5 text-sm font-medium text-[var(--ci-text)] hover:bg-[var(--ci-surface-2)] focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none">
            <Printer className="size-4" aria-hidden /> Tipărește acoperirea
          </button>
        </div>
      </div>

      <div className="flex items-start gap-2 rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] bg-[var(--ci-surface)] px-4 py-3 text-[13px] text-[var(--ci-text-muted)]">
        <Lock className="mt-0.5 size-4 shrink-0" aria-hidden />
        <p>
          <strong className="text-[var(--ci-text)]">Confidențial.</strong> Ai în raport: {scop}. Vezi doar intrările pe care ai dreptul să le vezi: un review nepartajat îl văd doar autorul și administratorii. Raportul arată <strong>participarea</strong> la discuții (au avut loc sau nu), nu calitatea lor și nu un scor al persoanei. Exportul cu conținut se înregistrează în audit. Perioada: {d.perioada.eticheta} · calculat la {dataOra(d.actualizatLa)}.
        </p>
      </div>

      {d.persoane.length === 0 ? (
        <EmptyState title="Nicio persoană în raport" description="Raportul se construiește din profilurile de angajat. Fără un profil legat de contul tău și fără oameni în subordine, nu ai ce vedea aici." />
      ) : (
        <>
          <section aria-label="Cifre de ansamblu" className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
            {cifre.map((c) => (
              <Card key={c.e} className="!p-4">
                <p className="ci-display ci-tabular text-2xl font-bold text-[var(--ci-text)]">
                  {c.n}
                  <span className="text-[14px] font-normal text-[var(--ci-text-muted)]"> din {t.persoane}</span>
                </p>
                <p className="mt-0.5 text-[12.5px] text-[var(--ci-text-muted)]">{c.e}</p>
              </Card>
            ))}
          </section>

          <Card padded={false}>
            <div className="px-5 pt-5">
              <CardHeader title="Acoperire pe persoană" subtitle={`În ordine alfabetică, fără clasament · ${d.perioada.saptamaniScurse} săptămâni scurse din ${dataScurta(d.perioada.start)}`} />
            </div>
            <div className="ci-scrollbar max-h-[65vh] overflow-auto">
              <table className="w-full min-w-[56rem] border-collapse text-[12.5px]">
                <thead className="sticky top-0 z-[1] bg-[var(--ci-surface-2)] text-left text-[12px] font-semibold text-[var(--ci-text-muted)]">
                  <tr>
                    <th scope="col" className="px-4 py-2">Persoană</th>
                    <th scope="col" className="px-3 py-2 text-right">Actualizări</th>
                    <th scope="col" className="px-3 py-2 text-right">1:1</th>
                    <th scope="col" className="px-3 py-2">Ultima 1:1</th>
                    <th scope="col" className="px-3 py-2">Review</th>
                    <th scope="col" className="px-3 py-2">Autoevaluare</th>
                    <th scope="col" className="px-3 py-2 text-right">Feedback primit / dat</th>
                    <th scope="col" className="px-3 py-2 text-right">Dezvoltare (atinse / în curs / total)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--ci-border)]">
                  {d.persoane.map((p) => (
                    <tr key={p.id}>
                      <th scope="row" className="px-4 py-2 text-left font-semibold text-[var(--ci-text)]">{p.nume}</th>
                      <td className="ci-tabular px-3 py-2 text-right">{p.checkinuri} din {d.perioada.saptamaniScurse}</td>
                      <td className="ci-tabular px-3 py-2 text-right">{p.nr1la1}</td>
                      <td className="px-3 py-2 text-[var(--ci-text-muted)]">{p.ultima1la1 ? dataCompleta(p.ultima1la1) : "—"}</td>
                      <td className="px-3 py-2 text-[var(--ci-text-muted)]">{REVIEW[p.review]}</td>
                      <td className="px-3 py-2 text-[var(--ci-text-muted)]">{p.autoevaluare ? "da" : "nu"}</td>
                      <td className="ci-tabular px-3 py-2 text-right">{p.feedbackPrimit} / {p.feedbackDat}</td>
                      <td className="ci-tabular px-3 py-2 text-right">{p.dezvoltareAtinse} / {p.dezvoltareInCurs} / {p.dezvoltareTotal}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="border-t border-[var(--ci-border)] px-5 py-3 text-[11.5px] text-[var(--ci-text-muted)]">
              Unitate: intrări din perioadă. Sursa: Discuții și evaluări. „Niciun review vizibil” poate însemna și un review nepartajat al altcuiva. Numărul de intrări nu spune cât de bună a fost o discuție.
            </p>
          </Card>
        </>
      )}
    </div>
  );
}
