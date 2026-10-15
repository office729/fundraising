"use client";

import { FileUp, Trash2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { PLATFORME } from "@/lib/reclame/atribuire";
import { formatLei, formatNumar } from "@/lib/reclame/calcule";
import { ETICHETE_CAMPURI, type CampMapat, type Mapare } from "@/lib/reclame/csv-costuri";

import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input, Label, Select } from "../components/ui/input";
import { EmptyState } from "../components/ui/states";

import { analizeazaCsvAction, confirmaImportAction, stergeImportAction, type AnalizaCsv, type DateReclame } from "./actions";

const dataRo = (iso: string) => new Date(iso).toLocaleDateString("ro-RO", { timeZone: "Europe/Bucharest", day: "numeric", month: "short", year: "numeric" });
const ziRo = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("ro-RO", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" });

const ORDINE: CampMapat[] = ["ziua", "cheltuiala", "campanieNume", "campanieCheie", "setNume", "reclamaNume", "afisari", "clicuri", "plasament", "cont"];
type Ok = Extract<AnalizaCsv, { ok: true }>;

// Import de costuri din CSV (export din Ads Manager), pentru cine nu vrea sau nu poate conecta contul din fila „Conexiuni”. Importul manual e etichetat ca atare.
export function TabImport({ orgSlug, date }: { orgSlug: string; date: DateReclame }) {
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
      setEroare("Fișierul e prea mare (peste 3 MB). Importă-l pe perioade mai scurte.");
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
        setSucces(`Am importat ${formatNumar(r.randuri)} rânduri, în valoare de ${formatLei(r.totalBani)}. Raportul din „Rezumat” s-a actualizat.`);
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
            <FileUp className="h-4 w-4 text-[var(--ci-primary)]" aria-hidden /> Import costuri din CSV
          </h2>
          <p className="mt-0.5 text-[13px] text-[var(--ci-text-muted)]">
            Varianta fără conectare: descarci din Ads Manager un raport pe zile și îl încarci aici. Reimportul aceleiași perioade înlocuiește rândurile, nu le dublează. Datele importate sunt marcate „import manual”. Dacă preferi să vină singure, conectează contul în fila „Conexiuni”.
          </p>
          <details className="mt-2 rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] px-3 py-2">
            <summary className="cursor-pointer text-[13px] font-semibold text-[var(--ci-text)]">Cum descarc raportul din Ads Manager?</summary>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-[12.5px] text-[var(--ci-text-muted)]">
              <li>În Ads Manager alege perioada dorită (de exemplu ultimele 30 de zile).</li>
              <li>La „Defalcare” alege <strong className="text-[var(--ci-text)]">Timp → Zi</strong>.</li>
              <li>Din „Coloane” bifează: Numele campaniei, Numele setului de reclame, Numele reclamei, Suma cheltuită, Afișări, Clicuri pe link.</li>
              <li>Apasă „Rapoarte” → „Exportă datele tabelului” → format CSV, apoi încarcă fișierul aici.</li>
            </ol>
            <p className="mt-1.5 text-[12px] text-[var(--ci-text-muted)]">Numele butoanelor din Meta se mai schimbă; important e ca fișierul să aibă o linie pe zi și coloanele de mai sus.</p>
          </details>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="im-platforma">Platforma</Label>
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
                  {p.eticheta}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="im-fisier">Fișier CSV</Label>
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
              <h3 className="text-[14px] font-bold text-[var(--ci-text)]">1. Coloanele recunoscute</h3>
              <p className="text-[12.5px] text-[var(--ci-text-muted)]">Verifică potrivirea; ziua și suma cheltuită sunt obligatorii. Poți corecta orice coloană.</p>
              <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {ORDINE.map((camp) => (
                  <div key={camp}>
                    <Label htmlFor={`im-col-${camp}`}>
                      {ETICHETE_CAMPURI[camp]}
                      {(camp === "ziua" || camp === "cheltuiala") && " *"}
                    </Label>
                    <Select id={`im-col-${camp}`} value={mapare[camp] === undefined ? "" : String(mapare[camp])} onChange={(e) => schimbaColoana(camp, e.target.value)}>
                      <option value="">— nu există —</option>
                      {analiza.antet.map((h, i) => (
                        <option key={i} value={i}>
                          {h || `Coloana ${i + 1}`}
                        </option>
                      ))}
                    </Select>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-3 rounded-[var(--ci-radius-btn)] bg-[var(--ci-surface-2)] p-3 text-[13px] sm:grid-cols-4">
              <div>
                <p className="text-[var(--ci-text-muted)]">Rânduri valide</p>
                <p className="ci-tabular font-bold text-[var(--ci-text)]">{formatNumar(analiza.randuriValide)} din {formatNumar(analiza.randuriInFisier)}</p>
              </div>
              <div>
                <p className="text-[var(--ci-text-muted)]">Perioada</p>
                <p className="font-bold text-[var(--ci-text)]">{analiza.de && analiza.pana ? `${ziRo(analiza.de)} – ${ziRo(analiza.pana)}` : "—"}</p>
              </div>
              <div>
                <p className="text-[var(--ci-text-muted)]">Total în fișier ({moneda.toUpperCase()})</p>
                <p className="ci-tabular font-bold text-[var(--ci-text)]">{new Intl.NumberFormat("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(analiza.totalBani / 100)}</p>
              </div>
              <div>
                <p className="text-[var(--ci-text-muted)]">Total în lei</p>
                <p className="ci-tabular font-bold text-[var(--ci-text)]">{cursValid ? formatLei(Math.round(analiza.totalBani * cursNumar)) : "—"}</p>
              </div>
            </div>

            {analiza.nrErori > 0 && (
              <div className="rounded-[var(--ci-radius-btn)] bg-[var(--ci-amber-soft)] p-3 text-[13px] text-[var(--ci-text)]">
                <p className="font-semibold">{analiza.nrErori} {analiza.nrErori === 1 ? "rând a fost sărit" : "rânduri au fost sărite"} (restul se importă)</p>
                <ul className="mt-1 list-disc pl-5 text-[12.5px]">
                  {analiza.erori.map((e) => (
                    <li key={e.linie}>
                      linia {e.linie}: {e.mesaj}
                    </li>
                  ))}
                </ul>
                {analiza.nrErori > analiza.erori.length && <p className="mt-1 text-[12px] text-[var(--ci-text-muted)]">… și încă {analiza.nrErori - analiza.erori.length}.</p>}
              </div>
            )}
            {analiza.ignorate > 0 && <p className="text-[12.5px] text-[var(--ci-text-muted)]">{analiza.ignorate} rânduri de total sau goale au fost ignorate.</p>}

            <div>
              <h3 className="text-[14px] font-bold text-[var(--ci-text)]">2. Moneda</h3>
              <div className="mt-2 flex flex-wrap items-end gap-3">
                <div className="w-28">
                  <Label htmlFor="im-moneda">Moneda din fișier</Label>
                  <Input id="im-moneda" value={moneda} maxLength={3} onChange={(e) => setMoneda(e.target.value.toUpperCase())} />
                </div>
                {moneda.toUpperCase() !== "RON" && (
                  <div className="w-48">
                    <Label htmlFor="im-curs">Curs în lei (1 {moneda || "…"} = ? lei)</Label>
                    <Input id="im-curs" inputMode="decimal" value={curs} onChange={(e) => setCurs(e.target.value)} placeholder="de exemplu 4,97" />
                  </div>
                )}
              </div>
              <p className="mt-1 text-[12px] text-[var(--ci-text-muted)]">
                {analiza.moneda ? `Moneda a fost citită din antetul fișierului (${analiza.moneda}). ` : "Fișierul nu spune moneda; verific-o. "}
                Cursul folosit se păstrează la fiecare rând, ca raportul să rămână explicabil.
              </p>
            </div>

            <div>
              <h3 className="text-[14px] font-bold text-[var(--ci-text)]">3. Legătura cu codurile UTM</h3>
              <p className="text-[12.5px] text-[var(--ci-text-muted)]">
                Scrie codul (utm_campaign) folosit în linkurile fiecărei campanii, ca donațiile să poată fi comparate cu cheltuiala. Lăsat gol, costul rămâne „nealocat”; un cod deja legat nu se șterge.
              </p>
              <div className="mt-2 overflow-x-auto rounded-[var(--ci-radius-card)] border border-[var(--ci-border)]">
                <table className="w-full min-w-[480px] text-left text-[13px]">
                  <thead className="bg-[var(--ci-surface-2)] text-[11.5px] tracking-wide text-[var(--ci-text-muted)] uppercase">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Campanie în fișier</th>
                      <th className="px-3 py-2 font-semibold">Cod UTM</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analiza.campanii.map((c) => (
                      <tr key={c.cheie} className="border-t border-[var(--ci-border)]">
                        <td className="px-3 py-2">{c.nume || c.cheie}</td>
                        <td className="px-3 py-2">
                          <Input aria-label={`Cod UTM pentru ${c.nume || c.cheie}`} value={legaturi[c.cheie] ?? ""} onChange={(e) => setLegaturi((p) => ({ ...p, [c.cheie]: e.target.value }))} placeholder="cmp_026" className="max-w-[180px]" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {analiza.previzualizare.length > 0 && (
              <div>
                <h3 className="text-[14px] font-bold text-[var(--ci-text)]">Previzualizare (primele {analiza.previzualizare.length} rânduri)</h3>
                <div className="mt-2 overflow-x-auto rounded-[var(--ci-radius-card)] border border-[var(--ci-border)]">
                  <table className="w-full min-w-[560px] text-left text-[12.5px]">
                    <thead className="bg-[var(--ci-surface-2)] text-[11.5px] tracking-wide text-[var(--ci-text-muted)] uppercase">
                      <tr>
                        <th className="px-3 py-2 font-semibold">Ziua</th>
                        <th className="px-3 py-2 font-semibold">Campanie</th>
                        <th className="px-3 py-2 font-semibold">Reclamă</th>
                        <th className="px-3 py-2 text-right font-semibold">Cheltuială</th>
                        <th className="px-3 py-2 text-right font-semibold">Afișări</th>
                        <th className="px-3 py-2 text-right font-semibold">Clicuri</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analiza.previzualizare.map((r, i) => (
                        <tr key={i} className="border-t border-[var(--ci-border)]">
                          <td className="px-3 py-1.5 whitespace-nowrap">{r.ziua}</td>
                          <td className="px-3 py-1.5">{r.campanieNume || "—"}</td>
                          <td className="px-3 py-1.5">{r.reclamaNume || "—"}</td>
                          <td className="ci-tabular px-3 py-1.5 text-right">{new Intl.NumberFormat("ro-RO", { minimumFractionDigits: 2 }).format(r.cheltuialaMinor / 100)}</td>
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
                <Upload className="h-4 w-4" /> Importă {formatNumar(analiza.randuriValide)} rânduri
              </Button>
              <Button type="button" onClick={reseteaza} disabled={pending}>
                Renunț
              </Button>
              {!cursValid && <span className="text-[12.5px] text-[var(--ci-red)]">Introdu cursul de conversie în lei.</span>}
            </div>
          </div>
        )}
      </Card>

      <Card>
        <h2 className="text-[15px] font-bold text-[var(--ci-text)]">Istoricul importurilor</h2>
        {date.importuri.length === 0 ? (
          <div className="mt-3">
            <EmptyState icon={FileUp} title="Niciun import încă" description="După primul import, fiecare fișier apare aici, cu perioada și suma." />
          </div>
        ) : (
          <ul className="mt-3 divide-y divide-[var(--ci-border)]">
            {date.importuri.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5 text-[13px]">
                <div>
                  <p className="font-semibold text-[var(--ci-text)]">
                    {date.etichetePlatforme[i.platforma] ?? i.platforma} <Badge tone="neutral" icon={false}>import manual</Badge>
                  </p>
                  <p className="text-[12.5px] text-[var(--ci-text-muted)]">
                    {i.deLa && i.panaLa ? `${ziRo(i.deLa)} – ${ziRo(i.panaLa)}` : "—"} · {formatNumar(i.randuri)} rânduri · {formatLei(i.totalRonBani)}
                    {i.moneda !== "RON" ? ` (curs ${i.cursRon.toLocaleString("ro-RO")} ${i.moneda}/lei)` : ""} · importat {dataRo(i.creatLa)}
                    {i.numeFisier ? ` · ${i.numeFisier}` : ""}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  aria-label={`Șterge importul din ${dataRo(i.creatLa)}`}
                  onClick={() => {
                    if (!window.confirm("Ștergi costurile aduse de acest import? Rândurile înlocuite ulterior de alt import nu sunt afectate.")) return;
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
