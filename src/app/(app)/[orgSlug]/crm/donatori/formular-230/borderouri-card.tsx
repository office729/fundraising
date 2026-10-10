"use client";

import { CheckCircle2, Eye, FileCode2, FileSpreadsheet, FileText, FileSignature } from "lucide-react";
import { useState } from "react";

import { PROCENT_IMPLICIT, type DateBorderou } from "@/lib/borderou230";

import { Card, CardHeader } from "../../components/ui/card";
import { Dialog } from "../../components/ui/dialog";
import { listeazaBorderouri, marcheazaBorderouDepus, obtineDateBorderou, type BorderouSumar } from "./borderouri-actions";
import { descarcaExcelBorderou, descarcaPdfBorderou, descarcaPdfInteligentBorderou, descarcaXmlBorderou } from "./borderou-fisiere";

type Format = "xlsx" | "pdf" | "xml" | "d230";

// Borderouri ANAF: formularele se grupează automat câte 50 (pe cont beneficiar și an); când un borderou se umple, următoarele
// formulare intră în borderoul următor. Fiecare borderou se descarcă în Excel, PDF sau XML (formatul borderoului ANAF).
// Lista vine de la server (page.tsx) — o acțiune de server nu poate fi apelată la prima randare a unui component client
// (eroarea React #441), deci nu o apelăm dintr-un efect la montare.
export function BorderouriCard({ orgSlug, initial }: { orgSlug: string; initial: BorderouSumar[] }) {
  const [borderouri, setBorderouri] = useState<BorderouSumar[] | null>(initial);
  const [eroare, setEroare] = useState("");
  const [lucru, setLucru] = useState<string | null>(null);
  const [previzualizare, setPrevizualizare] = useState<DateBorderou | null>(null);

  const cheie = (b: BorderouSumar, f?: string) => `${b.beneficiarId ?? "-"}|${b.an}|${b.nr}${f ? `|${f}` : ""}`;

  async function genereaza(b: BorderouSumar, format: Format) {
    setLucru(cheie(b, format));
    setEroare("");
    try {
      const date = await obtineDateBorderou(orgSlug, b.beneficiarId, b.an, b.nr);
      if (format === "xlsx") await descarcaExcelBorderou(date);
      else if (format === "pdf") await descarcaPdfBorderou(date);
      else if (format === "d230") await descarcaPdfInteligentBorderou(date);
      else descarcaXmlBorderou(date);
    } catch (e) {
      setEroare(e instanceof Error ? e.message : "Nu am putut genera fișierul.");
    } finally {
      setLucru(null);
    }
  }

  // „Vezi borderoul”: același conținut ca în fișiere, direct pe ecran.
  async function vezi(b: BorderouSumar) {
    setLucru(cheie(b, "vezi"));
    setEroare("");
    try {
      setPrevizualizare(await obtineDateBorderou(orgSlug, b.beneficiarId, b.an, b.nr));
    } catch (e) {
      setEroare(e instanceof Error ? e.message : "Nu am putut deschide borderoul.");
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
    <div id="borderouri-anaf" className="scroll-mt-20">
    <Card>
      <CardHeader title="Borderouri ANAF" subtitle="Se completează automat, câte 50 de formulare pe borderou; după 50, se trece la borderoul următor." />
      {eroare && <p className="mb-2 text-[13px] text-[var(--ci-red)]">{eroare}</p>}
      <p className="mb-3 rounded-lg bg-[var(--ci-surface-2)] p-2.5 text-[12px] leading-relaxed text-[var(--ci-text-muted)]">
        <strong className="text-[var(--ci-text)]">PDF inteligent ANAF:</strong> formularul oficial D230 în modul „Entitate nonprofit”, cu entitatea (denumire, CIF, cont/subcont), borderoul și cei max. 50 de contribuabili deja completați.
        Deschide-l în <strong>Adobe Acrobat Reader</strong> (nu în browser), apasă <strong>Validare</strong>, apoi semnează-l electronic. Când un borderou se umple, următoarele formulare intră automat într-un borderou nou, cu fișierul lui.
      </p>
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
                    <button type="button" className={`${btn} !border-[var(--ci-primary)] !text-[var(--ci-primary)]`} disabled={lucru !== null} onClick={() => vezi(b)}>
                      <Eye className="h-3.5 w-3.5" /> Vezi borderoul
                    </button>
                    <button
                      type="button"
                      className={`${btn} !border-[var(--ci-primary)] !bg-[var(--ci-primary)] !text-white hover:opacity-90`}
                      disabled={lucru !== null}
                      onClick={() => genereaza(b, "d230")}
                      title="Formularul oficial D230 (PDF inteligent ANAF), deja completat — rămân doar validarea și semnarea"
                    >
                      <FileSignature className="h-3.5 w-3.5" /> {lucru === cheie(b, "d230") ? "Se pregătește…" : "PDF inteligent ANAF"}
                    </button>
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
      <Dialog open={previzualizare !== null} onClose={() => setPrevizualizare(null)} title={previzualizare ? `Borderou nr. ${previzualizare.nr} · ${previzualizare.an}` : "Borderou"} width="max-w-6xl">
        {previzualizare && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-x-6 gap-y-1 rounded-lg bg-[var(--ci-surface-2)] p-3 text-[13px] sm:grid-cols-2">
              <p>
                <span className="text-[var(--ci-text-muted)]">Entitate beneficiară:</span> <strong>{previzualizare.entitate.den}</strong>
              </p>
              <p>
                <span className="text-[var(--ci-text-muted)]">CUI / CIF:</span> <strong>{previzualizare.entitate.cui || "—"}</strong>
              </p>
              <p>
                <span className="text-[var(--ci-text-muted)]">IBAN:</span> <strong className="break-all">{previzualizare.entitate.iban || "—"}</strong>
              </p>
              <p>
                <span className="text-[var(--ci-text-muted)]">Data borderoului:</span> <strong>{previzualizare.dataBorderou}</strong> · procent {PROCENT_IMPLICIT}% · <strong>{previzualizare.declaratii.length}</strong> declarații
              </p>
            </div>
            <div className="max-h-[60vh] overflow-auto rounded-lg border border-[var(--ci-border)]">
              <table className="w-full min-w-[900px] text-[12px]">
                <thead className="sticky top-0 bg-[var(--ci-surface-2)] text-left text-[11px] tracking-wide text-[var(--ci-text-muted)] uppercase">
                  <tr>
                    {["Nr.", "Nume", "Ini.", "Prenume", "CNP", "Adresă", "Telefon", "Email", "2 ani", "Acord", "Data"].map((h) => (
                      <th key={h} className="px-2.5 py-2 font-semibold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previzualizare.declaratii.map((x) => (
                    <tr key={x.nrPoz} className="border-t border-[var(--ci-border)] align-top">
                      <td className="ci-tabular px-2.5 py-1.5">{x.nrPoz}</td>
                      <td className="px-2.5 py-1.5 font-medium text-[var(--ci-text)]">{x.nume}</td>
                      <td className="px-2.5 py-1.5">{x.initiala}</td>
                      <td className="px-2.5 py-1.5 font-medium text-[var(--ci-text)]">{x.prenume}</td>
                      <td className="ci-tabular px-2.5 py-1.5">{x.cnp}</td>
                      <td className="px-2.5 py-1.5">{x.adresa || "—"}</td>
                      <td className="px-2.5 py-1.5 whitespace-nowrap">{x.telefon || "—"}</td>
                      <td className="px-2.5 py-1.5 break-all">{x.email}</td>
                      <td className="px-2.5 py-1.5">{x.doiAni ? "Da" : "Nu"}</td>
                      <td className="px-2.5 py-1.5">{x.acord ? "Da" : "Nu"}</td>
                      <td className="px-2.5 py-1.5 whitespace-nowrap">{x.dataCompletarii}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" className={`${btn} !border-[var(--ci-primary)] !text-[var(--ci-primary)]`} onClick={() => descarcaPdfInteligentBorderou(previzualizare).catch((e) => setEroare(e instanceof Error ? e.message : "Nu am putut genera PDF-ul inteligent."))}>
                <FileSignature className="h-3.5 w-3.5" /> PDF inteligent ANAF
              </button>
              <button type="button" className={btn} onClick={() => descarcaExcelBorderou(previzualizare)}>
                <FileSpreadsheet className="h-3.5 w-3.5" /> Excel
              </button>
              <button type="button" className={btn} onClick={() => descarcaPdfBorderou(previzualizare)}>
                <FileText className="h-3.5 w-3.5" /> PDF
              </button>
              <button type="button" className={btn} onClick={() => descarcaXmlBorderou(previzualizare)}>
                <FileCode2 className="h-3.5 w-3.5" /> XML
              </button>
            </div>
          </div>
        )}
      </Dialog>    </Card>
    </div>
  );
}
