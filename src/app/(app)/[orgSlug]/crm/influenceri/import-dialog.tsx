"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { INFLUENCERI_UI_DICT } from "@/lib/i18n/dictionaries/influenceri-ui";
import { inBucati, LIMITA_BUCATA, MAX_RANDURI_IMPORT, parseazaTabel, potrivesteTabel } from "@/lib/influenceri/import-tabel";
import type { RezultatImport } from "@/lib/influenceri/tipuri";

import { Button } from "../components/ui/button";
import { Dialog } from "../components/ui/dialog";
import { Textarea } from "../components/ui/input";
import { useLocale } from "../lib/locale-context";

import { importaAction } from "./actions";

const MAX_OCTETI = 5 * 1024 * 1024;

// Excelul se citește în browser, în rânduri de text; CSV-ul și tabelul lipit trec prin parserul pe caractere (acceptă celule pe mai multe rânduri).
async function celuleDinFisier(fisier: File): Promise<string[][]> {
  if (/\.(xlsx|xls|ods)$/i.test(fisier.name)) {
    const XLSX = await import("xlsx");
    const carte = XLSX.read(await fisier.arrayBuffer(), { type: "array" });
    const foaie = carte.Sheets[carte.SheetNames[0] ?? ""];
    if (!foaie) return [];
    const randuri = XLSX.utils.sheet_to_json<unknown[]>(foaie, { header: 1, defval: "", raw: false, blankrows: false });
    return randuri.map((r) => r.map((c) => String(c ?? "").trim()));
  }
  return parseazaTabel(await fisier.text());
}

export function ImportInfluenceri({ orgSlug, onInchide }: { orgSlug: string; onInchide: () => void }) {
  const locale = useLocale();
  const d = INFLUENCERI_UI_DICT[locale].import;
  const router = useRouter();
  const [lipit, setLipit] = useState("");
  const [dinFisier, setDinFisier] = useState<string[][] | null>(null);
  const [eroare, setEroare] = useState<string | null>(null);
  const [progres, setProgres] = useState<{ acum: number; total: number } | null>(null);
  const [rezultat, setRezultat] = useState<RezultatImport | null>(null);
  const [ocupat, start] = useTransition();

  const celule = useMemo(() => dinFisier ?? (lipit.trim() ? parseazaTabel(lipit) : []), [dinFisier, lipit]);
  const tabel = useMemo(() => potrivesteTabel(celule), [celule]);

  const alegeFisier = async (f: File | undefined) => {
    setEroare(null);
    setRezultat(null);
    if (!f) {
      setDinFisier(null);
      return;
    }
    if (f.size > MAX_OCTETI) {
      setEroare(d.fisierMare);
      return;
    }
    try {
      setDinFisier(await celuleDinFisier(f));
      setLipit("");
    } catch {
      setEroare(d.eroareCitire);
    }
  };

  const importa = () =>
    start(async () => {
      setEroare(null);
      const total: RezultatImport = { adaugate: 0, completate: 0, excluse: 0, erori: [] };
      const bucati = inBucati(tabel.randuri, LIMITA_BUCATA);
      let facut = 0;
      for (const [i, bucata] of bucati.entries()) {
        setProgres({ acum: facut, total: tabel.randuri.length });
        // Antetul e rândul 1, deci primul rând de date e „rândul 2”.
        const r = await importaAction(orgSlug, bucata, i * LIMITA_BUCATA + 2);
        if (!r.ok) {
          setEroare(r.eroare);
          break;
        }
        total.adaugate += r.data.adaugate;
        total.completate += r.data.completate;
        total.excluse += r.data.excluse;
        total.erori.push(...r.data.erori);
        facut += bucata.length;
      }
      setProgres(null);
      setRezultat(total);
      router.refresh();
    });

  return (
    <Dialog open onClose={onInchide} title={d.titlu} width="max-w-3xl">
      <div className="space-y-3 text-[13px] text-[var(--ci-text)]">
        <p className="text-[var(--ci-text-muted)]">{d.intro}</p>
        <p className="text-[12.5px] text-[var(--ci-text-muted)]">{d.coloane}</p>
        <label className="block">
          <span className="mb-1 block font-medium">{d.fisier}</span>
          <input type="file" accept=".csv,.tsv,.txt,.xlsx,.xls,.ods" onChange={(e) => alegeFisier(e.target.files?.[0])} className="block w-full text-[13px]" />
        </label>
        <label className="block">
          <span className="mb-1 block font-medium">{d.lipeste}</span>
          <Textarea
            value={lipit}
            onChange={(e) => {
              setLipit(e.target.value);
              setDinFisier(null);
              setRezultat(null);
            }}
            rows={5}
            className="font-mono text-[12px]"
            placeholder={d.lipestePlaceholder}
          />
        </label>

        {tabel.antet.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-1">
              <span className="mr-1 font-medium">{d.coloaneGasite}:</span>
              {tabel.antet.map((h, i) => (
                <span key={`${h}-${i}`} className={`rounded px-1.5 py-0.5 text-[12px] ${tabel.harta[i] ? "bg-[var(--ci-green-soft)] text-[var(--ci-green)]" : "bg-[var(--ci-surface-2)] text-[var(--ci-text-muted)] line-through"}`} title={tabel.harta[i] ? undefined : d.ignorata}>
                  {h || "…"}
                </span>
              ))}
            </div>
            <p>
              {d.randuriValide(tabel.randuri.length)}
              {tabel.goale > 0 && ` · ${d.randuriGoale(tabel.goale)}`}
              {tabel.depasire && ` · ${d.depasire(MAX_RANDURI_IMPORT)}`}
            </p>
          </div>
        )}

        {eroare && (
          <p role="alert" className="rounded-[var(--ci-radius-btn)] bg-[var(--ci-red-soft)] px-3 py-2">
            {eroare}
          </p>
        )}
        {progres && <p aria-live="polite">{d.seImporta(progres.acum, progres.total)}</p>}
        {rezultat && (
          <div className="space-y-1 rounded-[var(--ci-radius-btn)] bg-[var(--ci-surface-2)] px-3 py-2" aria-live="polite">
            <p>{d.rezultat(rezultat.adaugate, rezultat.completate, rezultat.excluse)}</p>
            {rezultat.erori.length > 0 && (
              <details>
                <summary className="cursor-pointer">
                  {d.erori}: {rezultat.erori.length}
                </summary>
                <ul className="mt-1 list-disc pl-5 text-[12.5px]">
                  {rezultat.erori.slice(0, 30).map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}

        <div className="flex flex-wrap justify-end gap-2">
          <Button onClick={onInchide}>{d.inchide}</Button>
          <Button variant="primary" onClick={importa} loading={ocupat} disabled={ocupat || tabel.randuri.length === 0}>
            {d.importa(tabel.randuri.length)}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
