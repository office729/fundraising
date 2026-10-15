"use client";

import { ChevronDown, Download, Info, Megaphone, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { MODEL_ATRIBUIRE } from "@/lib/reclame/atribuire";
import {
  calculeazaIndicatori,
  esteEsantionSuficient,
  formatLei,
  formatNumar,
  formatProcent,
  formatRoas,
  PRAG_MINIM_DONATII,
  PRESETURI,
  propozitieRezumat,
  rata,
  variatie,
  type Indicatori,
} from "@/lib/reclame/calcule";
import { DICTIONAR_METRICI } from "@/lib/reclame/dictionar";
import { baniInLei, construiesteCsv } from "@/lib/reclame/export-csv";
import type { LinieRaport } from "@/lib/reclame/raport";

import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Dialog } from "../components/ui/dialog";
import { Input, Label, Select } from "../components/ui/input";
import { EmptyState } from "../components/ui/states";
import { Tabs } from "../components/ui/tabs";

import { salveazaLegaturaAction, type DateReclame } from "./actions";
import { GraficReclame } from "./grafic";
import { TabConexiuni } from "./tab-conexiuni";
import { TabImport } from "./tab-import";
import { TabInstructiuni } from "./tab-instructiuni";
import { TabLinkuri } from "./tab-linkuri";

const dataRo = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("ro-RO", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" });
const dataOraRo = (iso: string) => new Date(iso).toLocaleString("ro-RO", { timeZone: "Europe/Bucharest", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

type Bun = "sus" | "jos" | "neutru"; // ce sens al variației e favorabil

function Variatie({ curent, anterior, bun }: { curent: number | null; anterior: number | null; bun: Bun }) {
  const v = variatie(curent, anterior);
  if (!v) return <span className="text-[12px] text-[var(--ci-text-faint)]">fără comparație</span>;
  if (v.sens === "egal") return <span className="text-[12px] text-[var(--ci-text-muted)]">neschimbat față de perioada anterioară</span>;
  const favorabil = bun === "neutru" ? null : bun === v.sens;
  const clasa = favorabil === null ? "text-[var(--ci-text-muted)]" : favorabil ? "text-[var(--ci-green)]" : "text-[var(--ci-red)]";
  const text = `${v.sens === "sus" ? "mai mult" : "mai puțin"} cu ${formatProcent(Math.abs(v.procent))}`;
  return (
    <span className={`text-[12px] font-medium ${clasa}`} aria-label={`${text} față de perioada anterioară`}>
      {v.sens === "sus" ? "▲" : "▼"} {formatProcent(Math.abs(v.procent))} <span className="font-normal text-[var(--ci-text-muted)]">față de perioada anterioară</span>
    </span>
  );
}

function Kpi({ titlu, valoare, explicatie, children, definitie }: { titlu: string; valoare: string; explicatie: string; children?: React.ReactNode; definitie?: string }) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[13px] font-medium text-[var(--ci-text-muted)]">{titlu}</p>
        {definitie && (
          <span title={definitie} aria-label={`Cum se calculează: ${definitie}`} role="img" className="cursor-help text-[var(--ci-text-faint)]">
            <Info className="h-3.5 w-3.5" />
          </span>
        )}
      </div>
      <p className="ci-display ci-tabular mt-1.5 text-[30px] leading-none font-bold text-[var(--ci-text)]">{valoare}</p>
      <p className="mt-1.5 text-[12.5px] text-[var(--ci-text-muted)]">{explicatie}</p>
      {children && <div className="mt-2">{children}</div>}
    </Card>
  );
}

const def = (cheie: string) => DICTIONAR_METRICI.find((d) => d.cheie === cheie)?.formula;

function concluzie(l: LinieRaport, ind: Indicatori): { text: string; ton: "neutral" | "green" | "amber" } {
  if (l.totaluri.cheltuieliBani === 0) return { text: "Fără cheltuială", ton: "neutral" };
  if (!esteEsantionSuficient(l.totaluri.donatii)) return { text: "Date insuficiente", ton: "neutral" };
  if (ind.roasNet !== null && ind.roasNet >= 1) return { text: "Acoperă costul", ton: "green" };
  return { text: "Sub costul reclamei", ton: "amber" };
}

type Sortare = "cheltuieli" | "donatii" | "net" | "roas";

export function ReclameVedere({ orgSlug, date }: { orgSlug: string; date: DateReclame }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const { perioada, raport, anterior } = date;
  const t = raport.totaluri;
  const ind = calculeazaIndicatori(t);
  const indAnt = calculeazaIndicatori(anterior);

  const [preset, setPreset] = useState<string>(perioada.preset);
  const [de, setDe] = useState(perioada.de);
  const [pana, setPana] = useState(perioada.pana);
  const [fer, setFer] = useState(String(date.fereastraZile));
  const [net, setNet] = useState(true);
  const [platformaFiltru, setPlatformaFiltru] = useState<string | null>(null);
  const [cautare, setCautare] = useState("");
  const [sortare, setSortare] = useState<Sortare>("cheltuieli");
  const [detaliu, setDetaliu] = useState<LinieRaport | null>(null);

  function navigheaza(p: { preset?: string; de?: string; pana?: string; fer?: string }) {
    const q = new URLSearchParams();
    q.set("preset", p.preset ?? preset);
    if ((p.preset ?? preset) === "personalizat") {
      q.set("de", p.de ?? de);
      q.set("pana", p.pana ?? pana);
    }
    q.set("fer", p.fer ?? fer);
    start(() => router.push(`/${orgSlug}/crm/reclame?${q.toString()}`));
  }

  const dateIncomplete = raport.costNealocatBani > 0 || raport.donatiiFaraCostLegat > 0 || date.calitate.surse.length === 0 || perioada.ziuaInCurs;
  const fara = t.cheltuieliBani === 0 && t.donatii === 0 && date.importuri.length === 0 && date.linkuri.length === 0;

  const grafic = raport.peZi.map((z) => ({ zi: z.ziua, cheltuieli: z.cheltuieliBani / 100, donatii: (net ? z.netBani : z.brutBani) / 100 }));

  const linii = useMemo(() => {
    const q = cautare.trim().toLowerCase();
    const v = raport.peCampanie.filter((l) => (!platformaFiltru || l.platforma === platformaFiltru) && (!q || `${l.eticheta} ${l.utmCampanie ?? ""}`.toLowerCase().includes(q)));
    const cheie = (l: LinieRaport) => {
      const i = calculeazaIndicatori(l.totaluri);
      return sortare === "cheltuieli" ? l.totaluri.cheltuieliBani : sortare === "donatii" ? l.totaluri.donatii : sortare === "net" ? i.netBani : (i.roasNet ?? -1);
    };
    return [...v].sort((a, b) => cheie(b) - cheie(a));
  }, [raport.peCampanie, platformaFiltru, cautare, sortare]);

  function exporta() {
    const csv = construiesteCsv(
      {
        perioada: `${perioada.de} – ${perioada.pana}`,
        fusOrar: "Europe/Bucharest",
        moneda: "RON",
        model: MODEL_ATRIBUIRE,
        fereastraZile: date.fereastraZile,
        actualizat: date.calitate.surse.map((s) => `${date.etichetePlatforme[s.platforma] ?? s.platforma}: ${s.ultimaZi ?? "—"}`).join("; ") || "fără costuri importate",
      },
      linii.map((l) => {
        const i = calculeazaIndicatori(l.totaluri);
        return {
          platforma: date.etichetePlatforme[l.platforma] ?? l.platforma,
          campanie: l.eticheta,
          codUtm: l.utmCampanie,
          cheltuieliLei: baniInLei(l.totaluri.cheltuieliBani),
          donatii: l.totaluri.donatii,
          brutLei: baniInLei(l.totaluri.brutBani),
          netLei: baniInLei(i.netBani),
          costPerDonatieLei: i.costPerDonatieBani === null ? null : baniInLei(i.costPerDonatieBani),
          roasNet: i.roasNet,
          donatoriNoi: l.totaluri.donatoriNoi,
        };
      }),
    );
    const url = URL.createObjectURL(new Blob(["﻿", csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `performanta-reclame_${perioada.de}_${perioada.pana}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const etichetaDonatii = net ? "Donații nete atribuite" : "Donații brute atribuite";
  const ultimaActualizare = date.calitate.surse.length ? date.calitate.surse.map((s) => s.actualizatLa).filter(Boolean).sort().at(-1) : null;

  return (
    <div className="mx-auto max-w-[1100px] space-y-5">
      {/* A. Antet */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--ci-radius-btn)] bg-[var(--ci-primary-soft)] text-[var(--ci-primary)]" aria-hidden>
            <Megaphone className="h-5 w-5" />
          </span>
          <div>
            <h1 className="ci-display text-xl font-bold text-[var(--ci-text)]">Performanța reclamelor</h1>
            <p className="mt-0.5 text-[13px] text-[var(--ci-text-muted)]">Vezi cât investim și ce donații sunt atribuite reclamelor.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-2.5">
          <div>
            <Label htmlFor="rc-preset">Perioada</Label>
            <Select
              id="rc-preset"
              value={preset}
              onChange={(e) => {
                setPreset(e.target.value);
                if (e.target.value !== "personalizat") navigheaza({ preset: e.target.value });
              }}
            >
              {PRESETURI.map((p) => (
                <option key={p.cheie} value={p.cheie}>
                  {p.eticheta}
                </option>
              ))}
            </Select>
          </div>
          {preset === "personalizat" && (
            <>
              <div>
                <Label htmlFor="rc-de">De la</Label>
                <Input id="rc-de" type="date" value={de} max={pana} onChange={(e) => setDe(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="rc-pana">Până la</Label>
                <Input id="rc-pana" type="date" value={pana} min={de} onChange={(e) => setPana(e.target.value)} />
              </div>
              <Button variant="primary" disabled={pending || !de || !pana || de > pana} onClick={() => navigheaza({ preset: "personalizat" })}>
                Aplică
              </Button>
            </>
          )}
          <div>
            <Label htmlFor="rc-fer">Fereastra de atribuire</Label>
            <Select
              id="rc-fer"
              value={fer}
              onChange={(e) => {
                setFer(e.target.value);
                navigheaza({ fer: e.target.value });
              }}
            >
              <option value="1">1 zi</option>
              <option value="7">7 zile</option>
              <option value="30">30 de zile</option>
            </Select>
          </div>
          <Button onClick={exporta} disabled={linii.length === 0}>
            <Download className="h-3.5 w-3.5" /> Exportă
          </Button>
        </div>
      </div>

      <p className="text-[12.5px] text-[var(--ci-text-muted)]">
        {dataRo(perioada.de)} – {dataRo(perioada.pana)} · comparat cu {dataRo(perioada.anterioara.de)} – {dataRo(perioada.anterioara.pana)} · model: ultimul clic eligibil, fereastră de {date.fereastraZile} {date.fereastraZile === 1 ? "zi" : "zile"} · lei (RON), ora României ·{" "}
        {ultimaActualizare ? `costuri actualizate ${dataOraRo(ultimaActualizare)}` : "costuri neimportate"}
      </p>
      {perioada.ziuaInCurs && <p className="rounded-[var(--ci-radius-btn)] bg-[var(--ci-amber-soft)] px-3 py-2 text-[13px] text-[var(--ci-text)]">Perioada include ziua în curs, care e incompletă: costurile și donațiile ei se completează în următoarele ore.</p>}

      <Tabs
        tabs={[
          { key: "rezumat", label: "Rezumat" },
          { key: "linkuri", label: "Linkuri UTM" },
          { key: "conexiuni", label: "Conexiuni" },
          { key: "import", label: "Import costuri" },
          { key: "instructiuni", label: "Instrucțiuni de implementare" },
        ]}
      >
        {(activ) => (
          <>
            <div hidden={activ !== "rezumat"} className="space-y-5">
              {fara ? (
                <EmptyState
                  icon={Megaphone}
                  title="Nu există încă date despre reclame"
                  description="Creează linkuri cu coduri UTM pentru reclamele tale, apoi importă costurile din Ads Manager. Donațiile făcute prin aceste linkuri apar aici după confirmarea plății."
                />
              ) : (
                <>
                  {/* B. Rezumatul principal */}
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <Kpi titlu="Cheltuieli reclame" valoare={formatLei(t.cheltuieliBani, 0)} explicatie="Costul raportat sau importat" definitie={def("cheltuieli")}>
                      <Variatie curent={t.cheltuieliBani} anterior={anterior.cheltuieliBani} bun="neutru" />
                    </Kpi>
                    <Kpi titlu="Donații confirmate atribuite reclamelor" valoare={formatNumar(t.donatii)} explicatie={`${formatNumar(t.donatoriNoi)} donatori noi · plăți confirmate de procesator`} definitie={def("donatii")}>
                      <Variatie curent={t.donatii} anterior={anterior.donatii} bun="sus" />
                    </Kpi>
                    <Kpi titlu="Donații nete atribuite" valoare={formatLei(ind.netBani, 0)} explicatie={`${formatLei(t.brutBani, 0)} brut, minus ${formatLei(t.rambursatBani, 0)} rambursat`} definitie={def("net")}>
                      <Variatie curent={ind.netBani} anterior={indAnt.netBani} bun="sus" />
                    </Kpi>
                    <Kpi titlu="Cost per donație" valoare={formatLei(ind.costPerDonatieBani)} explicatie={ind.costPerDonatieBani === null ? "Apare când există donații atribuite" : `Cost per donator nou: ${formatLei(ind.costPerDonatorNouBani)}`} definitie={def("cpa")}>
                      <Variatie curent={ind.costPerDonatieBani} anterior={indAnt.costPerDonatieBani} bun="jos" />
                    </Kpi>
                    <Kpi titlu="Lei donați la 1 leu cheltuit (ROAS net)" valoare={formatRoas(ind.roasNet)} explicatie={`ROAS brut ${formatRoas(ind.roasBrut)}`} definitie={def("roas-net")}>
                      <Variatie curent={ind.roasNet} anterior={indAnt.roasNet} bun="sus" />
                    </Kpi>
                    <Kpi titlu="Rămas după reclame" valoare={formatLei(ind.ramasBani, 0)} explicatie="Net minus cheltuieli; nu e profit" definitie={def("ramas")}>
                      <Variatie curent={ind.ramasBani} anterior={indAnt.ramasBani} bun="sus" />
                    </Kpi>
                  </div>
                  <p className="text-[14px] text-[var(--ci-text)]">{propozitieRezumat(t, ind, dateIncomplete)}</p>

                  {/* C. Evoluție și comparație între platforme */}
                  <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
                    <Card>
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <h2 className="text-[15px] font-bold text-[var(--ci-text)]">Evoluție pe zile</h2>
                        <div role="group" aria-label="Valoarea donațiilor" className="inline-flex overflow-hidden rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] text-[12.5px]">
                          <button type="button" aria-pressed={!net} onClick={() => setNet(false)} className={`px-3 py-1.5 ${!net ? "bg-[var(--ci-primary)] text-white" : "bg-[var(--ci-surface)] text-[var(--ci-text)]"}`}>
                            Brut
                          </button>
                          <button type="button" aria-pressed={net} onClick={() => setNet(true)} className={`px-3 py-1.5 ${net ? "bg-[var(--ci-primary)] text-white" : "bg-[var(--ci-surface)] text-[var(--ci-text)]"}`}>
                            Net
                          </button>
                        </div>
                      </div>
                      <GraficReclame date={grafic} etichetaDonatii={etichetaDonatii} />
                    </Card>
                    <Card>
                      <h2 className="text-[15px] font-bold text-[var(--ci-text)]">Pe platforme</h2>
                      <p className="text-[12.5px] text-[var(--ci-text-muted)]">Apasă o platformă ca să filtrezi tabelul de campanii.</p>
                      <div className="mt-3 space-y-2">
                        {raport.pePlatforma.length === 0 ? (
                          <p className="text-[13px] text-[var(--ci-text-muted)]">Nicio platformă cu date în perioadă.</p>
                        ) : (
                          raport.pePlatforma.map((p) => {
                            const i = calculeazaIndicatori(p.totaluri);
                            const activa = platformaFiltru === p.platforma;
                            return (
                              <button
                                key={p.cheie}
                                type="button"
                                aria-pressed={activa}
                                onClick={() => setPlatformaFiltru(activa ? null : p.platforma)}
                                className={`w-full rounded-[var(--ci-radius-btn)] border px-3 py-2.5 text-left transition ${activa ? "border-[var(--ci-primary)] bg-[var(--ci-primary-soft)]" : "border-[var(--ci-border)] hover:bg-[var(--ci-surface-2)]"}`}
                              >
                                <span className="flex items-center justify-between gap-2 text-[13.5px] font-semibold text-[var(--ci-text)]">
                                  {p.eticheta}
                                  <span className="ci-tabular text-[13px]">{formatRoas(i.roasNet)}</span>
                                </span>
                                <span className="ci-tabular mt-0.5 block text-[12px] text-[var(--ci-text-muted)]">
                                  {formatLei(p.totaluri.cheltuieliBani, 0)} cheltuiți · {formatNumar(p.totaluri.donatii)} donații · {formatLei(i.netBani, 0)} net
                                </span>
                                {raport.pePlasament.filter((x) => x.platforma === p.platforma).length > 1 && (
                                  <span className="ci-tabular mt-1 block text-[11.5px] text-[var(--ci-text-muted)]">
                                    {raport.pePlasament
                                      .filter((x) => x.platforma === p.platforma)
                                      .map((x) => `${x.eticheta}: ${formatLei(x.totaluri.cheltuieliBani, 0)}, ${formatNumar(x.totaluri.donatii)} donații`)
                                      .join(" · ")}
                                  </span>
                                )}
                              </button>
                            );
                          })
                        )}
                      </div>
                    </Card>
                  </div>

                  {/* D. Tabelul de campanii */}
                  <Card padded={false}>
                    <div className="flex flex-wrap items-end justify-between gap-3 p-4 pb-3">
                      <div>
                        <h2 className="text-[15px] font-bold text-[var(--ci-text)]">Campanii</h2>
                        {platformaFiltru && (
                          <button type="button" onClick={() => setPlatformaFiltru(null)} className="text-[12.5px] font-medium text-[var(--ci-primary)] hover:underline">
                            Filtru: {date.etichetePlatforme[platformaFiltru] ?? platformaFiltru} · șterge filtrul
                          </button>
                        )}
                      </div>
                      <div className="flex flex-wrap items-end gap-2.5">
                        <div className="w-56">
                          <Label htmlFor="rc-cauta">Caută</Label>
                          <Input id="rc-cauta" icon={<Search className="h-3.5 w-3.5" />} value={cautare} onChange={(e) => setCautare(e.target.value)} placeholder="Campanie sau cod UTM" />
                        </div>
                        <div>
                          <Label htmlFor="rc-sort">Sortează după</Label>
                          <Select id="rc-sort" value={sortare} onChange={(e) => setSortare(e.target.value as Sortare)}>
                            <option value="cheltuieli">Cheltuieli</option>
                            <option value="donatii">Număr de donații</option>
                            <option value="net">Donații nete</option>
                            <option value="roas">ROAS net</option>
                          </Select>
                        </div>
                      </div>
                    </div>
                    {linii.length === 0 ? (
                      <p className="px-4 pb-5 text-[13px] text-[var(--ci-text-muted)]">Nicio campanie în această selecție.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[760px] text-left text-[13px]">
                          <thead className="bg-[var(--ci-surface-2)] text-[11.5px] tracking-wide text-[var(--ci-text-muted)] uppercase">
                            <tr>
                              <th className="px-4 py-2 font-semibold">Campanie</th>
                              <th className="px-3 py-2 font-semibold">Platformă</th>
                              <th className="px-3 py-2 text-right font-semibold">Cheltuieli</th>
                              <th className="px-3 py-2 text-right font-semibold">Donații</th>
                              <th className="px-3 py-2 text-right font-semibold">Donații nete</th>
                              <th className="px-3 py-2 text-right font-semibold">Cost/donație</th>
                              <th className="px-3 py-2 text-right font-semibold">ROAS net</th>
                              <th className="px-3 py-2 font-semibold">Concluzie</th>
                            </tr>
                          </thead>
                          <tbody>
                            {linii.map((l) => {
                              const i = calculeazaIndicatori(l.totaluri);
                              const c = concluzie(l, i);
                              return (
                                <tr key={l.cheie} className="cursor-pointer border-t border-[var(--ci-border)] hover:bg-[var(--ci-surface-2)]" onClick={() => setDetaliu(l)}>
                                  <td className="px-4 py-2.5">
                                    <button type="button" onClick={(e) => { e.stopPropagation(); setDetaliu(l); }} className="text-left font-semibold text-[var(--ci-text)] hover:underline">
                                      {l.eticheta}
                                    </button>
                                    <span className="block text-[11.5px] text-[var(--ci-text-muted)]">{l.utmCampanie ?? "fără cod UTM"}{!l.legata && " · nelegată"}</span>
                                  </td>
                                  <td className="px-3 py-2.5">{date.etichetePlatforme[l.platforma] ?? l.platforma}</td>
                                  <td className="ci-tabular px-3 py-2.5 text-right">{formatLei(l.totaluri.cheltuieliBani, 0)}</td>
                                  <td className="ci-tabular px-3 py-2.5 text-right">{formatNumar(l.totaluri.donatii)}</td>
                                  <td className="ci-tabular px-3 py-2.5 text-right">{formatLei(i.netBani, 0)}</td>
                                  <td className="ci-tabular px-3 py-2.5 text-right">{formatLei(i.costPerDonatieBani, 0)}</td>
                                  <td className="ci-tabular px-3 py-2.5 text-right font-semibold">{formatRoas(i.roasNet)}</td>
                                  <td className="px-3 py-2.5">
                                    <Badge tone={c.ton} icon={false}>
                                      {c.text}
                                    </Badge>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                    <p className="border-t border-[var(--ci-border)] px-4 py-2.5 text-[12px] text-[var(--ci-text-muted)]">
                      Concluzia apare doar cu cel puțin {PRAG_MINIM_DONATII} donații atribuite; sub prag cifrele variază prea mult de la o donație la alta ca să spună ceva. Nu sugerăm creșteri de buget.
                    </p>
                  </Card>

                  {/* E. Parcursul până la donație */}
                  <Card>
                    <h2 className="text-[15px] font-bold text-[var(--ci-text)]">Parcursul până la donație</h2>
                    <p className="text-[12.5px] text-[var(--ci-text-muted)]">Doar traficul din campanii legate de un cod UTM. Vizitatorii se numără pe zi, fără cookie-uri, deci pașii nu sunt o cohortă strictă.</p>
                    <ol className="mt-3 grid gap-3 sm:grid-cols-4">
                      {[
                        { n: "Vizitatori", v: date.parcurs.vizitatori, r: null as number | null },
                        { n: "Au deschis formularul", v: date.parcurs.deschideri, r: rata(date.parcurs.deschideri, date.parcurs.vizitatori) },
                        { n: "Au început o donație", v: date.parcurs.incercari, r: rata(date.parcurs.incercari, date.parcurs.deschideri) },
                        { n: "Plată confirmată", v: date.parcurs.confirmate, r: rata(date.parcurs.confirmate, date.parcurs.incercari) },
                      ].map((p) => (
                        <li key={p.n} className="rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] px-3 py-2.5">
                          <p className="text-[12px] text-[var(--ci-text-muted)]">{p.n}</p>
                          <p className="ci-display ci-tabular text-[22px] font-bold text-[var(--ci-text)]">{formatNumar(p.v)}</p>
                          <p className="text-[11.5px] text-[var(--ci-text-muted)]">{p.r === null ? " " : `${formatProcent(p.r)} din pasul anterior`}</p>
                        </li>
                      ))}
                    </ol>
                    {date.parcurs.vizitatori === 0 && <p className="mt-2 text-[12.5px] text-[var(--ci-text-muted)]">Nu există trafic măsurat din campanii legate. Legarea unei campanii de un cod UTM se face la import.</p>}
                  </Card>

                  {date.reinnoiri.abonamente > 0 && (
                    <Card>
                      <h2 className="text-[15px] font-bold text-[var(--ci-text)]">Abonamente atribuite</h2>
                      <p className="mt-1 text-[13px] text-[var(--ci-text-muted)]">
                        {date.reinnoiri.abonamente} {date.reinnoiri.abonamente === 1 ? "abonament lunar atribuit" : "abonamente lunare atribuite"} reclamelor; reînnoirile încasate după prima plată: <strong className="ci-tabular text-[var(--ci-text)]">{formatLei(date.reinnoiri.incasatBani, 0)}</strong>. Nu sunt incluse în indicatorii de mai sus.
                      </p>
                    </Card>
                  )}

                  {/* F. Calitatea datelor */}
                  <Card padded={false}>
                    <details>
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-4 text-[15px] font-bold text-[var(--ci-text)]">
                        <span>
                          Calitatea datelor{" "}
                          {dateIncomplete && (
                            <Badge tone="amber" icon={false}>
                              ceva lipsește
                            </Badge>
                          )}
                        </span>
                        <ChevronDown className="h-4 w-4 text-[var(--ci-text-muted)]" aria-hidden />
                      </summary>
                      <div className="space-y-3 border-t border-[var(--ci-border)] p-4 text-[13px] text-[var(--ci-text)]">
                        <div>
                          <p className="font-semibold">Surse de costuri</p>
                          {date.calitate.surse.length === 0 ? (
                            <p className="text-[var(--ci-text-muted)]">Niciun cost importat. Mergi la „Import costuri”.</p>
                          ) : (
                            <ul className="mt-1 space-y-0.5 text-[var(--ci-text-muted)]">
                              {date.calitate.surse.map((s) => (
                                <li key={s.platforma}>
                                  {date.etichetePlatforme[s.platforma] ?? s.platforma}: costuri până la {s.ultimaZi ? dataRo(s.ultimaZi) : "—"}
                                  {s.actualizatLa ? `, actualizate ${dataOraRo(s.actualizatLa)}` : ""} (
                                  {date.conexiuni.some((c) => c.platforma === s.platforma && c.stare === "activ") ? "sincronizare automată" : "import manual"})
                                  {date.conexiuni.some((c) => c.platforma === s.platforma && c.stare !== "activ") && " · conexiunea cere atenție, vezi fila Conexiuni"}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                        <div>
                          <p className="font-semibold">Donații în perioadă</p>
                          <p className="text-[var(--ci-text-muted)]">
                            {formatNumar(date.calitate.donatiiConfirmate)} confirmate, din care {formatNumar(date.calitate.cuAtribuire)} au un context de atribuire (orice canal). Restul sunt directe sau fără parametri UTM și rămân neatribuite. {formatNumar(t.donatii)} sunt atribuite reclamelor plătite.
                          </p>
                        </div>
                        {raport.donatiiFaraCostLegat > 0 && (
                          <p className="rounded-[var(--ci-radius-btn)] bg-[var(--ci-amber-soft)] px-3 py-2">
                            {raport.donatiiFaraCostLegat} donații vin din reclame al căror cod UTM nu e legat de nicio cheltuială importată. Leagă codul în fereastra campaniei sau reimportă costurile cu codul completat.
                          </p>
                        )}
                        {raport.costNealocatBani > 0 && (
                          <p className="rounded-[var(--ci-radius-btn)] bg-[var(--ci-amber-soft)] px-3 py-2">
                            {formatLei(raport.costNealocatBani, 0)} din cheltuieli sunt la campanii fără cod UTM legat (nealocate). Ele intră în totalul cheltuielilor, dar nu pot fi comparate cu donații.
                          </p>
                        )}
                        <ul className="list-disc space-y-1 pl-5 text-[var(--ci-text-muted)]">
                          <li>Valoarea netă scade doar rambursările; comisioanele procesatorului nu sunt păstrate pe donație și nu sunt scăzute.</li>
                          <li>Conversiile raportate de platformele de reclame nu sunt incluse; conectarea lor prin API nu e activă în această versiune.</li>
                          <li>Donațiile fără parametri UTM și fără acord pentru statistici rămân neatribuite: cifrele sunt un minim verificabil.</li>
                        </ul>
                      </div>
                    </details>
                  </Card>
                </>
              )}
            </div>

            <div hidden={activ !== "linkuri"}>
              <TabLinkuri orgSlug={orgSlug} date={date} />
            </div>
            <div hidden={activ !== "conexiuni"}>
              <TabConexiuni orgSlug={orgSlug} date={date} />
            </div>
            <div hidden={activ !== "import"}>
              <TabImport orgSlug={orgSlug} date={date} />
            </div>
            <div hidden={activ !== "instructiuni"}>
              <TabInstructiuni orgSlug={orgSlug} />
            </div>
          </>
        )}
      </Tabs>

      {detaliu && <DetaliuCampanie orgSlug={orgSlug} linie={detaliu} date={date} onClose={() => setDetaliu(null)} />}
    </div>
  );
}

// Panoul unei campanii: cifrele complete, explicația atribuirii și, pentru cheltuielile nealocate, legarea de un cod UTM.
function DetaliuCampanie({ orgSlug, linie, date, onClose }: { orgSlug: string; linie: LinieRaport; date: DateReclame; onClose: () => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const i = calculeazaIndicatori(linie.totaluri);
  const legatura = date.legaturi.find((x) => linie.cheie === `${x.platforma}|~${x.campanieCheie}` || (x.utmCampanie && linie.cheie === `${x.platforma}|${x.utmCampanie}`));
  const [cod, setCod] = useState(legatura?.utmCampanie ?? "");
  const [mesaj, setMesaj] = useState<{ ok: boolean; text: string } | null>(null);
  const rand = (e: string, v: string) => (
    <div className="flex justify-between gap-4 border-b border-[var(--ci-border)] py-1.5 text-[13px]">
      <dt className="text-[var(--ci-text-muted)]">{e}</dt>
      <dd className="ci-tabular font-semibold text-[var(--ci-text)]">{v}</dd>
    </div>
  );
  const clicuri = linie.clicuri;
  return (
    <Dialog open onClose={onClose} title={linie.eticheta} width="max-w-lg">
      <div className="space-y-4">
        <p className="text-[12.5px] text-[var(--ci-text-muted)]">
          {date.etichetePlatforme[linie.platforma] ?? linie.platforma} · {linie.utmCampanie ? `cod UTM ${linie.utmCampanie}` : "fără cod UTM"}
        </p>
        <dl>
          {rand("Cheltuieli", formatLei(linie.totaluri.cheltuieliBani))}
          {rand("Donații confirmate atribuite", formatNumar(linie.totaluri.donatii))}
          {rand("Valoare brută", formatLei(linie.totaluri.brutBani))}
          {rand("Rambursat", formatLei(linie.totaluri.rambursatBani))}
          {rand("Valoare netă", formatLei(i.netBani))}
          {rand("Cost per donație", formatLei(i.costPerDonatieBani))}
          {rand("Cost per donator nou", formatLei(i.costPerDonatorNouBani))}
          {rand("ROAS net", formatRoas(i.roasNet))}
          {rand("Valoarea medie a donației", formatLei(i.mediaDonatieBani))}
          {rand("Donatori noi / existenți / neclasificați", `${linie.totaluri.donatoriNoi} / ${linie.totaluri.donatoriExistenti} / ${linie.totaluri.donatoriNeclasificati}`)}
          {rand("Afișări", formatNumar(linie.afisari))}
          {rand("Clicuri pe link (raportate de platformă)", formatNumar(clicuri))}
        </dl>
        <p className="text-[12.5px] text-[var(--ci-text-muted)]">
          Atribuire: donațiile de aici au ultimul clic eligibil dintr-o reclamă plătită cu codul {linie.utmCampanie ?? "(fără cod)"}, în fereastra de {date.fereastraZile} {date.fereastraZile === 1 ? "zi" : "zile"}. Un clic ulterior din email sau social organic ar fi mutat donația în alt canal.
          {linie.nota ? ` ${linie.nota}.` : ""}
        </p>
        {legatura && (
          <form
            className="space-y-2 border-t border-[var(--ci-border)] pt-3"
            onSubmit={(e) => {
              e.preventDefault();
              setMesaj(null);
              start(async () => {
                const r = await salveazaLegaturaAction(orgSlug, { platforma: legatura.platforma, campanieCheie: legatura.campanieCheie, utmCampanie: cod });
                if (r.ok) {
                  setMesaj({ ok: true, text: "Legătura a fost salvată." });
                  router.refresh();
                } else setMesaj({ ok: false, text: r.eroare });
              });
            }}
          >
            <Label htmlFor="rc-cod">Codul UTM al acestei campanii</Label>
            <div className="flex gap-2">
              <Input id="rc-cod" value={cod} onChange={(e) => setCod(e.target.value)} placeholder="cmp_026" />
              <Button type="submit" variant="primary" loading={pending}>
                Salvează
              </Button>
            </div>
            {mesaj && (
              <p role="status" className={`text-[12.5px] ${mesaj.ok ? "text-[var(--ci-green)]" : "text-[var(--ci-red)]"}`}>
                {mesaj.text}
              </p>
            )}
          </form>
        )}
      </div>
    </Dialog>
  );
}
