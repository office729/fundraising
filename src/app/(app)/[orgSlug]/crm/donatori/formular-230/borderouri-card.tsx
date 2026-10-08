"use client";

import { CheckCircle2, FileCode2, FileSpreadsheet, FileText } from "lucide-react";
import { useEffect, useState } from "react";

import { Card, CardHeader } from "../../components/ui/card";
import { listeazaBorderouri, marcheazaBorderouDepus, obtineDateBorderou, type BorderouSumar } from "./borderouri-actions";
import { descarcaExcelBorderou, descarcaPdfBorderou, descarcaXmlBorderou } from "./borderou-fisiere";

type Format = "xlsx" | "pdf" | "xml";

// Borderouri ANAF: formularele se grupează automat câte 50 (pe cont beneficiar și an); când un borderou se umple, următoarele
// formulare intră în borderoul următor. Fiecare borderou se descarcă în Excel, PDF sau XML (formatul borderoului ANAF).
export function BorderouriCard({ orgSlug }: { orgSlug: string }) {
  const [borderouri, setBorderouri] = useState<BorderouSumar[] | null>(null);
  const [eroare, setEroare] = useState("");
  const [lucru, setLucru] = useState<string | null>(null);

  useEffect(() => {
    listeazaBorderouri(orgSlug)
      .then(setBorderouri)
      .catch((e) => setEroare(e instanceof Error ? e.message : "Nu am putut încărca borderourile."));
  }, [orgSlug]);

  const cheie = (b: BorderouSumar, f?: string) => `${b.beneficiarId ?? "-"}|${b.an}|${b.nr}${f ? `|${f}` : ""}`;

  async function genereaza(b: BorderouSumar, format: Format) {
    setLucru(cheie(b, format));
    setEroare("");
    try {
      const date = await obtineDateBorderou(orgSlug, b.beneficiarId, b.an, b.nr);
      if (format === "xlsx") await descarcaExcelBorderou(date);
      else if (format === "pdf") await descarcaPdfBorderou(date);
      else descarcaXmlBorderou(date);
    } catch (e) {
      setEroare(e instanceof Error ? e.message : "Nu am putut genera fișierul.");
    } finally {
      setLucru(null);
    }
  }

  async function comutaDepus(b: BorderouSumar) {
    const depus = b.nrDepuse < b.nrFormulare;
    setLucru(cheie(b, "depus"));
    try {
      await marcheazaBorderouDepus(orgSlug, b.beneficiarId, b.an, b.nr, depus);
      setBorderouri(await listeazaBorderouri(orgSlug));
    } catch (e) {
      setEroare(e instanceof Error ? e.message : "Eroare.");
    } finally {
      setLucru(null);
    }
  }

  const btn = "inline-flex min-h-8 items-center gap-1.5 rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] px-2.5 text-[12px] font-semibold text-[var(--ci-text)] hover:bg-[var(--ci-surface-2)] disabled:opacity-50";

  return (
    <Card>
      <CardHeader title="Borderouri ANAF" subtitle="Se completează automat, câte 50 de formulare pe borderou; după 50, se trece la borderoul următor." />
      {eroare && <p className="mb-2 text-[13px] text-[var(--ci-red)]">{eroare}</p>}
      {borderouri === null ? (
        <p className="text-[13px] text-[var(--ci-text-muted)]">Se încarcă…</p>
      ) : borderouri.length === 0 ? (
        <p className="text-[13px] text-[var(--ci-text-muted)]">Niciun formular primit încă — borderoul se creează singur la primul formular.</p>
      ) : (
        <div className="space-y-2">
          {borderouri.map((b) => {
            const plin = b.nrFormulare >= b.max;
            const depus = b.nrDepuse === b.nrFormulare;
            return (
              <div key={cheie(b)} className="rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-[var(--ci-text)]">
                      Borderou nr. {b.nr} · {b.an} <span className="font-normal text-[var(--ci-text-muted)]">— {b.beneficiarNume}</span>
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[12px] text-[var(--ci-text-muted)]">
                      <span className="ci-tabular">
                        {b.nrFormulare} / {b.max} formulare
                      </span>
                      <span className={plin ? "font-semibold text-[var(--ci-green)]" : "text-[var(--ci-primary)]"}>{plin ? "plin" : `în completare (${b.max - b.nrFormulare} locuri libere)`}</span>
                      {depus && (
                        <span className="inline-flex items-center gap-1 text-[var(--ci-green)]">
                          <CheckCircle2 className="h-3 w-3" /> depus la ANAF
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button type="button" className={btn} disabled={lucru !== null} onClick={() => genereaza(b, "xlsx")}>
                      <FileSpreadsheet className="h-3.5 w-3.5" /> Excel
                    </button>
                    <button type="button" className={btn} disabled={lucru !== null} onClick={() => genereaza(b, "pdf")}>
                      <FileText className="h-3.5 w-3.5" /> PDF
                    </button>
                    <button type="button" className={btn} disabled={lucru !== null} onClick={() => genereaza(b, "xml")} title="Fișier XML în formatul borderoului ANAF">
                      <FileCode2 className="h-3.5 w-3.5" /> XML
                    </button>
                    <button type="button" className={btn} disabled={lucru !== null} onClick={() => comutaDepus(b)}>
                      {depus ? "Scoate «depus»" : "Marchează depus"}
                    </button>
                  </div>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--ci-surface-2)]">
                  <div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.round((b.nrFormulare / b.max) * 100))}%`, background: plin ? "var(--ci-green)" : "var(--ci-primary)" }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
