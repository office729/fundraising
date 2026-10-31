"use client";

import { FileUp, Trash2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { RECLAME_UI_DICT } from "@/lib/i18n/dictionaries/reclame-ui";
import { PLATFORME } from "@/lib/reclame/atribuire";
import type { CampMapat, Mapare } from "@/lib/reclame/csv-costuri";

import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input, Label, Select } from "../components/ui/input";
import { EmptyState } from "../components/ui/states";
import { useLocale } from "../lib/locale-context";

import { analizeazaCsvAction, confirmaImportAction, stergeImportAction, type AnalizaCsv, type DateReclame } from "./actions";
import { formatariReclame } from "./format";
import { Rich } from "./rich";

const ORDINE: CampMapat[] = ["ziua", "cheltuiala", "campanieNume", "campanieCheie", "setNume", "reclamaNume", "afisari", "clicuri", "plasament", "cont"];
type Ok = Extract<AnalizaCsv, { ok: true }>;

// Import de costuri din CSV (export din Ads Manager), pentru cine nu vrea sau nu poate conecta contul din fila „Conexiuni”. Importul manual e etichetat ca atare.
export function TabImport({ orgSlug, date }: { orgSlug: string; date: DateReclame }) {
  const locale = useLocale();
  const dict = RECLAME_UI_DICT[locale].import;
  const f = formatariReclame(locale);
  const { lei: formatLei, numar: formatNumar, data: dataRo, zi: ziRo, decimal } = f;
  const router = useRouter();
  const [pending, start] = useTransition();
  const [platforma, setPlatforma] = useState("meta");
  const [numeFisier, setNumeFisier] = useState("");
  const [text, setText] = useState("");
  const [analiza, setAnaliza] = useState<Ok | null>(null);
  const [mapare, setMapare] = useState<Mapare>({});
  const [moneda, setMoneda] = useState("RON");
  const [curs, setCurs] = useState("");
  const [legaturi, setLegaturi] = useState<Record<string, string>>({});
  const [eroare, setEroare] = useState<string | null>(null);
  const [succes, setSucces] = useState<string | null>(null);

  function reseteaza() {
    setNumeFisier("");
    setText("");
    setAnaliza(null);
    setMapare({});
    setLegaturi({});
    setEroare(null);
  }

  function preiaAnaliza(r: AnalizaCsv, platformaCurenta: string, pastreazaLegaturi = false) {
    if (!r.ok) {
      setAnaliza(null);
      setEroare(r.eroare);
      return;
    }
    setEroare(null);
    setAnaliza(r);
    setMapare(r.mapare);
    if (r.moneda) setMoneda(r.moneda);
    if (!pastreazaLegaturi) setLegaturi(Object.fromEntries(r.campanii.map((c) => [c.cheie, c.utmExistent[platformaCurenta] ?? ""])));
  }

  async function alegeFisier(f: File | undefined) {
    setSucces(null);
    if (!f) return;
    if (f.size > 3_000_000) {
      setEroare(dict.fisierMare);
      return;
    }
    const continut = await f.text();
    setNumeFisier(f.name);
    setText(continut);
    start(async () => preiaAnaliza(await analizeazaCsvAction(orgSlug, { text: continut }), platforma));
  }

  function schimbaColoana(camp: CampMapat, valoare: string) {
    const nou: Mapare = { ...mapare };
    if (valoare === "") delete nou[camp];
    else nou[camp] = Number(valoare);
    setMapare(nou);
    start(async () => preiaAnaliza(await analizeazaCsvAction(orgSlug, { text, mapare: nou }), platforma, true));
  }

  const cursNumar = moneda === "RON" ? 1 : Number(curs.replace(",", "."));
  const cursValid = Number.isFinite(cursNumar) && cursNumar > 0;
  const poateImporta = !!analiza && analiza.randuriValide > 0 && /^[A-Za-z]{3}$/.test(moneda) && cursValid;

  function importa() {
    if (!analiza) return;
    setEroare(null);
    setSucces(null);
    start(async () => {
      const r = await confirmaImportAction(orgSlug, { text, mapare, platforma, moneda, cursRon: cursNumar, numeFisier, legaturi });
      if (r.ok) {
        setSucces(dict.succes(formatNumar(r.randuri), formatLei(r.totalBani)));
        reseteaza();
        router.refresh();
      } else setEroare(r.eroare);
    });
  }

  return (
    <div className="space-y-5">
      <Card className="space-y-4">
        <div>
          <h2 className="flex items-center gap-2 text-[16px] font-bold text-[var(--ci-text)]">
            <FileUp className="h-4 w-4 text-[var(--ci-primary)]" aria-hidden /> {dict.title}
          </h2>
          <p className="mt-0.5 text-[13px] text-[var(--ci-text-muted)]">
            {dict.descriere}
          </p>
          <details className="mt-2 rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] px-3 py-2">
            <summary className="cursor-pointer text-[13px] font-semibold text-[var(--ci-text)]">{dict.cumDescarc}</summary>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-[12.5px] text-[var(--ci-text-muted)]">
              <li>{dict.d1}</li>
              <li>
                <Rich text={dict.d2} />
              </li>
              <li>{dict.d3}</li>
              <li>{dict.d4}</li>
            </ol>
            <p className="mt-1.5 text-[12px] text-[var(--ci-text-muted)]">{dict.dNota}</p>
          </details>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="im-platforma">{dict.platforma}</Label>
            <Select
              id="im-platforma"
              value={platforma}
              onChange={(e) => {
                setPlatforma(e.target.value);
                if (analiza) setLegaturi(Object.fromEntries(analiza.campanii.map((c) => [c.cheie, c.utmExistent[e.target.value] ?? ""])));
              }}
            >
              {PLATFORME.map((p) => (
                <option key={p.cheie} value={p.cheie}>
                  {RECLAME_UI_DICT[locale].platforme[p.cheie] ?? p.eticheta}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="im-fisier">{dict.fisierCsv}</Label>
            <input id="im-fisier" type="file" accept=".csv,.tsv,.txt,text/csv" onChange={(e) => void alegeFisier(e.target.files?.[0])} className="block w-full text-[13px] text-[var(--ci-text)] file:mr-3 file:rounded-[var(--ci-radius-btn)] file:border file:border-[var(--ci-border)] file:bg-[var(--ci-surface)] file:px-3 file:py-1.5 file:text-[13px] file:font-medium" />
            {numeFisier && <p className="mt-1 text-[12px] text-[var(--ci-text-muted)]">{numeFisier}</p>}
          </div>
        </div>

        {eroare && (
          <p role="alert" className="rounded-[var(--ci-radius-btn)] bg-[var(--ci-red-soft)] px-3 py-2 text-[13px] text-[var(--ci-red)]">
            {eroare}
          </p>
        )}
        {succes && (
          <p role="status" className="rounded-[var(--ci-radius-btn)] bg-[var(--ci-green-soft)] px-3 py-2 text-[13px] text-[var(--ci-green)]">
            {succes}
          </p>
        )}

        {analiza && (
          <div className="space-y-5 border-t border-[var(--ci-border)] pt-4">
            <div>
              <h3 className="text-[14px] font-bold text-[var(--ci-text)]">{dict.pas1}</h3>
              <p className="text-[12.5px] text-[var(--ci-text-muted)]">{dict.pas1Hint}</p>
              <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {ORDINE.map((camp) => (
                  <div key={camp}>
                    <Label htmlFor={`im-col-${camp}`}>
                      {dict.campuri[camp]}
                      {(camp === "ziua" || camp === "cheltuiala") && " *"}
                    </Label>
                    <Select id={`im-col-${camp}`} value={mapare[camp] === undefined ? "" : String(mapare[camp])} onChange={(e) => schimbaColoana(camp, e.target.value)}>
                      <option value="">{dict.nuExista}</option>
                      {analiza.antet.map((h, i) => (
                        <option key={i} value={i}>
                          {h || dict.coloana(i + 1)}
                        </option>
                      ))}
                    </Select>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-3 rounded-[var(--ci-radius-btn)] bg-[var(--ci-surface-2)] p-3 text-[13px] sm:grid-cols-4">
              <div>
                <p className="text-[var(--ci-text-muted)]">{dict.randuriValide}</p>
                <p className="ci-tabular font-bold text-[var(--ci-text)]">{dict.dinTotal(formatNumar(analiza.randuriValide), formatNumar(analiza.randuriInFisier))}</p>
              </div>
              <div>
                <p className="text-[var(--ci-text-muted)]">{dict.perioada}</p>
                <p className="font-bold text-[var(--ci-text)]">{analiza.de && analiza.pana ? `${ziRo(analiza.de)} – ${ziRo(analiza.pana)}` : "—"}</p>
              </div>
              <div>
                <p className="text-[var(--ci-text-muted)]">{dict.totalFisier(moneda.toUpperCase())}</p>
                <p className="ci-tabular font-bold text-[var(--ci-text)]">{decimal(analiza.totalBani / 100)}</p>
              </div>
              <div>
                <p className="text-[var(--ci-text-muted)]">{dict.totalLei}</p>
                <p className="ci-tabular font-bold text-[var(--ci-text)]">{cursValid ? formatLei(Math.round(analiza.totalBani * cursNumar)) : "—"}</p>
              </div>
            </div>

            {analiza.nrErori > 0 && (
              <div className="rounded-[var(--ci-radius-btn)] bg-[var(--ci-amber-soft)] p-3 text-[13px] text-[var(--ci-text)]">
                <p className="font-semibold">{analiza.nrErori} {analiza.nrErori === 1 ? dict.randSarit : dict.randuriSarite} {dict.restulSeImporta}</p>
                <ul className="mt-1 list-disc pl-5 text-[12.5px]">
                  {analiza.erori.map((e) => (
                    <li key={e.linie}>
                      {dict.linia(e.linie, e.mesaj)}
                    </li>
                  ))}
                </ul>
                {analiza.nrErori > analiza.erori.length && <p className="mt-1 text-[12px] text-[var(--ci-text-muted)]">{dict.sisincaUnele(analiza.nrErori - analiza.erori.length)}</p>}
              </div>
            )}
            {analiza.ignorate > 0 && <p className="text-[12.5px] text-[var(--ci-text-muted)]">{dict.ignorate(analiza.ignorate)}</p>}

            <div>
              <h3 className="text-[14px] font-bold text-[var(--ci-text)]">{dict.pas2}</h3>
              <div className="mt-2 flex flex-wrap items-end gap-3">
                <div className="w-28">
                  <Label htmlFor="im-moneda">{dict.monedaFisier}</Label>
                  <Input id="im-moneda" value={moneda} maxLength={3} onChange={(e) => setMoneda(e.target.value.toUpperCase())} />
                </div>
                {moneda.toUpperCase() !== "RON" && (
                  <div className="w-48">
                    <Label htmlFor="im-curs">{dict.cursLabel(moneda || "…")}</Label>
                    <Input id="im-curs" inputMode="decimal" value={curs} onChange={(e) => setCurs(e.target.value)} placeholder={dict.cursPlaceholder} />
                  </div>
                )}
              </div>
              <p className="mt-1 text-[12px] text-[var(--ci-text-muted)]">
                {analiza.moneda ? dict.monedaCitita(analiza.moneda) : dict.monedaNecitita}
                {dict.cursPastrat}
              </p>
            </div>

            <div>
              <h3 className="text-[14px] font-bold text-[var(--ci-text)]">{dict.pas3}</h3>
              <p className="text-[12.5px] text-[var(--ci-text-muted)]">{dict.pas3Hint}</p>
              <div className="mt-2 overflow-x-auto rounded-[var(--ci-radius-card)] border border-[var(--ci-border)]">
                <table className="w-full min-w-[480px] text-left text-[13px]">
                  <thead className="bg-[var(--ci-surface-2)] text-[11.5px] tracking-wide text-[var(--ci-text-muted)] uppercase">
                    <tr>
                      <th className="px-3 py-2 font-semibold">{dict.campanieInFisier}</th>
                      <th className="px-3 py-2 font-semibold">{dict.codUtm}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analiza.campanii.map((c) => (
                      <tr key={c.cheie} className="border-t border-[var(--ci-border)]">
                        <td className="px-3 py-2">{c.nume || c.cheie}</td>
                        <td className="px-3 py-2">
                          <Input aria-label={dict.codUtmPentru(c.nume || c.cheie)} value={legaturi[c.cheie] ?? ""} onChange={(e) => setLegaturi((p) => ({ ...p, [c.cheie]: e.target.value }))} placeholder="cmp_026" className="max-w-[180px]" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {analiza.previzualizare.length > 0 && (
              <div>
                <h3 className="text-[14px] font-bold text-[var(--ci-text)]">{dict.previzualizare(analiza.previzualizare.length)}</h3>
                <div className="mt-2 overflow-x-auto rounded-[var(--ci-radius-card)] border border-[var(--ci-border)]">
                  <table className="w-full min-w-[560px] text-left text-[12.5px]">
                    <thead className="bg-[var(--ci-surface-2)] text-[11.5px] tracking-wide text-[var(--ci-text-muted)] uppercase">
                      <tr>
                        <th className="px-3 py-2 font-semibold">{dict.ziua}</th>
                        <th className="px-3 py-2 font-semibold">{dict.campanie}</th>
                        <th className="px-3 py-2 font-semibold">{dict.reclama}</th>
                        <th className="px-3 py-2 text-right font-semibold">{dict.cheltuiala}</th>
                        <th className="px-3 py-2 text-right font-semibold">{dict.afisari}</th>
                        <th className="px-3 py-2 text-right font-semibold">{dict.clicuri}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analiza.previzualizare.map((r, i) => (
                        <tr key={i} className="border-t border-[var(--ci-border)]">
                          <td className="px-3 py-1.5 whitespace-nowrap">{r.ziua}</td>
                          <td className="px-3 py-1.5">{r.campanieNume || "—"}</td>
                          <td className="px-3 py-1.5">{r.reclamaNume || "—"}</td>
                          <td className="ci-tabular px-3 py-1.5 text-right">{decimal(r.cheltuialaMinor / 100)}</td>
                          <td className="ci-tabular px-3 py-1.5 text-right">{formatNumar(r.afisari)}</td>
                          <td className="ci-tabular px-3 py-1.5 text-right">{formatNumar(r.clicuri)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary" size="lg" loading={pending} disabled={!poateImporta || pending} onClick={importa}>
                <Upload className="h-4 w-4" /> {dict.importa(formatNumar(analiza.randuriValide))}
              </Button>
              <Button type="button" onClick={reseteaza} disabled={pending}>
                {dict.renunt}
              </Button>
              {!cursValid && <span className="text-[12.5px] text-[var(--ci-red)]">{dict.introduCursul}</span>}
            </div>
          </div>
        )}
      </Card>

      <Card>
        <h2 className="text-[15px] font-bold text-[var(--ci-text)]">{dict.istoric}</h2>
        {date.importuri.length === 0 ? (
          <div className="mt-3">
            <EmptyState icon={FileUp} title={dict.niciunImport} description={dict.niciunImportDescriere} />
          </div>
        ) : (
          <ul className="mt-3 divide-y divide-[var(--ci-border)]">
            {date.importuri.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5 text-[13px]">
                <div>
                  <p className="font-semibold text-[var(--ci-text)]">
                    {date.etichetePlatforme[i.platforma] ?? i.platforma} <Badge tone="neutral" icon={false}>{dict.importManual}</Badge>
                  </p>
                  <p className="text-[12.5px] text-[var(--ci-text-muted)]">
                    {i.deLa && i.panaLa ? `${ziRo(i.deLa)} – ${ziRo(i.panaLa)}` : "—"} · {formatNumar(i.randuri)} {dict.randuri} · {formatLei(i.totalRonBani)}
                    {i.moneda !== "RON" ? dict.curs(i.cursRon.toLocaleString(f.loc), i.moneda) : ""} · {dict.importat} {dataRo(i.creatLa)}
                    {i.numeFisier ? ` · ${i.numeFisier}` : ""}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  aria-label={dict.stergeImport(dataRo(i.creatLa))}
                  onClick={() => {
                    if (!window.confirm(dict.confirmaStergere)) return;
                    start(async () => {
                      await stergeImportAction(orgSlug, i.id);
                      router.refresh();
                    });
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
