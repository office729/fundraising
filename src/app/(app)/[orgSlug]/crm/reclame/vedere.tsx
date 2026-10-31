"use client";

import { ChevronDown, Download, Info, Megaphone, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { RECLAME_UI_DICT } from "@/lib/i18n/dictionaries/reclame-ui";
import { MODEL_ATRIBUIRE } from "@/lib/reclame/atribuire";
import { calculeazaIndicatori, esteEsantionSuficient, PRAG_MINIM_DONATII, PRESETURI, rata, variatie, type Indicatori } from "@/lib/reclame/calcule";
import { baniInLei, construiesteCsv } from "@/lib/reclame/export-csv";
import type { LinieRaport } from "@/lib/reclame/raport";

import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Dialog } from "../components/ui/dialog";
import { Input, Label, Select } from "../components/ui/input";
import { EmptyState } from "../components/ui/states";
import { Tabs } from "../components/ui/tabs";
import { useLocale } from "../lib/locale-context";

import { salveazaLegaturaAction, type DateReclame } from "./actions";
import { formatariReclame, type FormatariReclame } from "./format";
import { GraficReclame } from "./grafic";
import { TabConexiuni } from "./tab-conexiuni";
import { TabImport } from "./tab-import";
import { TabGhid } from "./tab-ghid";
import { TabLinkuri } from "./tab-linkuri";
import { traduLib } from "./texte-lib";

type Bun = "sus" | "jos" | "neutru"; // ce sens al variației e favorabil

function Variatie({ curent, anterior, bun }: { curent: number | null; anterior: number | null; bun: Bun }) {
  const locale = useLocale();
  const t = RECLAME_UI_DICT[locale].variatie;
  const { procent: formatProcent } = formatariReclame(locale);
  const v = variatie(curent, anterior);
  if (!v) return <span className="text-[12px] text-[var(--ci-text-faint)]">{t.faraComparatie}</span>;
  if (v.sens === "egal") return <span className="text-[12px] text-[var(--ci-text-muted)]">{t.neschimbat}</span>;
  const favorabil = bun === "neutru" ? null : bun === v.sens;
  const clasa = favorabil === null ? "text-[var(--ci-text-muted)]" : favorabil ? "text-[var(--ci-green)]" : "text-[var(--ci-red)]";
  const text = `${v.sens === "sus" ? t.maiMult : t.maiPutin} ${t.cu} ${formatProcent(Math.abs(v.procent))}`;
  return (
    <span className={`text-[12px] font-medium ${clasa}`} aria-label={`${text} ${t.fataDe}`}>
      {v.sens === "sus" ? "▲" : "▼"} {formatProcent(Math.abs(v.procent))} <span className="font-normal text-[var(--ci-text-muted)]">{t.fataDe}</span>
    </span>
  );
}

function Kpi({ titlu, valoare, explicatie, children, definitie }: { titlu: string; valoare: string; explicatie: string; children?: React.ReactNode; definitie?: string }) {
  const cumSeCalculeaza = RECLAME_UI_DICT[useLocale()].cumSeCalculeaza;
  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[13px] font-medium text-[var(--ci-text-muted)]">{titlu}</p>
        {definitie && (
          <span title={definitie} aria-label={cumSeCalculeaza(definitie)} role="img" className="cursor-help text-[var(--ci-text-faint)]">
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

function concluzie(l: LinieRaport, ind: Indicatori, t: (typeof RECLAME_UI_DICT)["ro"]["concluzie"]): { text: string; ton: "neutral" | "green" | "amber" } {
  if (l.totaluri.cheltuieliBani === 0) return { text: t.faraCheltuiala, ton: "neutral" };
  if (!esteEsantionSuficient(l.totaluri.donatii)) return { text: t.dateInsuficiente, ton: "neutral" };
  if (ind.roasNet !== null && ind.roasNet >= 1) return { text: t.acoperaCostul, ton: "green" };
  return { text: t.subCost, ton: "amber" };
}

// Propoziția de rezumat (aceeași logică ca propozitieRezumat din src/lib/reclame/calcule.ts), în limba platformei.
function propozitieRezumat(d: (typeof RECLAME_UI_DICT)["ro"]["propozitie"], f: FormatariReclame, t: LinieRaport["totaluri"], ind: Indicatori, cuDateIncomplete: boolean): string {
  if (t.cheltuieliBani === 0 && t.donatii === 0) return d.gol;
  if (t.cheltuieliBani === 0) return d.faraCheltuieli;
  const baza = ind.roasNet === null ? "" : d.baza(f.decimal(ind.roasNet));
  const limita = cuDateIncomplete ? d.incomplet : "";
  return `${baza}${limita}`.trim();
}

type Sortare = "cheltuieli" | "donatii" | "net" | "roas";

export function ReclameVedere({ orgSlug, date }: { orgSlug: string; date: DateReclame }) {
  const locale = useLocale();
  const dict = RECLAME_UI_DICT[locale];
  const f = formatariReclame(locale);
  const { lei: formatLei, numar: formatNumar, roas: formatRoas, procent: formatProcent, zi: dataRo, dataOra: dataOraRo } = f;
  const def = (cheie: string) => dict.ghid.metrici[cheie]?.formula;
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
        actualizat: date.calitate.surse.map((s) => `${date.etichetePlatforme[s.platforma] ?? s.platforma}: ${s.ultimaZi ?? "—"}`).join("; ") || "fără costuri importate", // conținutul fișierului CSV exportat rămâne în română
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

  const etichetaDonatii = net ? dict.evolutie.donatiiNete : dict.evolutie.donatiiBrute;
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
            <h1 className="ci-display text-xl font-bold text-[var(--ci-text)]">{dict.page.title}</h1>
            <p className="mt-0.5 text-[13px] text-[var(--ci-text-muted)]">{dict.antet.subtitle}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-2.5">
          <div>
            <Label htmlFor="rc-preset">{dict.antet.perioada}</Label>
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
                  {dict.presetari[p.cheie] ?? p.eticheta}
                </option>
              ))}
            </Select>
          </div>
          {preset === "personalizat" && (
            <>
              <div>
                <Label htmlFor="rc-de">{dict.antet.deLa}</Label>
                <Input id="rc-de" type="date" value={de} max={pana} onChange={(e) => setDe(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="rc-pana">{dict.antet.panaLa}</Label>
                <Input id="rc-pana" type="date" value={pana} min={de} onChange={(e) => setPana(e.target.value)} />
              </div>
              <Button variant="primary" disabled={pending || !de || !pana || de > pana} onClick={() => navigheaza({ preset: "personalizat" })}>
                {dict.antet.aplica}
              </Button>
            </>
          )}
          <div>
            <Label htmlFor="rc-fer">{dict.antet.fereastra}</Label>
            <Select
              id="rc-fer"
              value={fer}
              onChange={(e) => {
                setFer(e.target.value);
                navigheaza({ fer: e.target.value });
              }}
            >
              <option value="1">{dict.antet.ferZi}</option>
              <option value="7">{dict.antet.ferZile7}</option>
              <option value="30">{dict.antet.ferZile30}</option>
            </Select>
          </div>
          <Button onClick={exporta} disabled={linii.length === 0}>
            <Download className="h-3.5 w-3.5" /> {dict.antet.exporta}
          </Button>
        </div>
      </div>

      <p className="text-[12.5px] text-[var(--ci-text-muted)]">
        {dataRo(perioada.de)} – {dataRo(perioada.pana)} · {dict.sumar.comparatCu} {dataRo(perioada.anterioara.de)} – {dataRo(perioada.anterioara.pana)} · {dict.sumar.model} {date.fereastraZile} {date.fereastraZile === 1 ? dict.sumar.zi : dict.sumar.zile} · {dict.sumar.monedaFus} ·{" "}
        {ultimaActualizare ? dict.sumar.costuriActualizate(dataOraRo(ultimaActualizare)) : dict.sumar.costuriNeimportate}
      </p>
      {perioada.ziuaInCurs && <p className="rounded-[var(--ci-radius-btn)] bg-[var(--ci-amber-soft)] px-3 py-2 text-[13px] text-[var(--ci-text)]">{dict.sumar.ziuaInCurs}</p>}

      <Tabs
        tabs={[
          { key: "rezumat", label: dict.taburi.rezumat },
          { key: "linkuri", label: dict.taburi.linkuri },
          { key: "conexiuni", label: dict.taburi.conexiuni },
          { key: "import", label: dict.taburi.import },
          { key: "instructiuni", label: dict.taburi.instructiuni },
        ]}
      >
        {(activ) => (
          <>
            <div hidden={activ !== "rezumat"} className="space-y-5">
              <PasiPornire date={date} />
              {fara ? (
                <EmptyState
                  icon={Megaphone}
                  title={dict.gol.title}
                  description={dict.gol.description}
                />
              ) : (
                <>
                  {/* B. Rezumatul principal */}
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <Kpi titlu={dict.kpi.cheltuieli} valoare={formatLei(t.cheltuieliBani, 0)} explicatie={dict.kpi.cheltuieliExpl} definitie={def("cheltuieli")}>
                      <Variatie curent={t.cheltuieliBani} anterior={anterior.cheltuieliBani} bun="neutru" />
                    </Kpi>
                    <Kpi titlu={dict.kpi.donatii} valoare={formatNumar(t.donatii)} explicatie={dict.kpi.donatiiExpl(formatNumar(t.donatoriNoi))} definitie={def("donatii")}>
                      <Variatie curent={t.donatii} anterior={anterior.donatii} bun="sus" />
                    </Kpi>
                    <Kpi titlu={dict.kpi.net} valoare={formatLei(ind.netBani, 0)} explicatie={dict.kpi.netExpl(formatLei(t.brutBani, 0), formatLei(t.rambursatBani, 0))} definitie={def("net")}>
                      <Variatie curent={ind.netBani} anterior={indAnt.netBani} bun="sus" />
                    </Kpi>
                    <Kpi titlu={dict.kpi.costDonatie} valoare={formatLei(ind.costPerDonatieBani)} explicatie={ind.costPerDonatieBani === null ? dict.kpi.costDonatieFara : dict.kpi.costDonatorNou(formatLei(ind.costPerDonatorNouBani))} definitie={def("cpa")}>
                      <Variatie curent={ind.costPerDonatieBani} anterior={indAnt.costPerDonatieBani} bun="jos" />
                    </Kpi>
                    <Kpi titlu={dict.kpi.roasNet} valoare={formatRoas(ind.roasNet)} explicatie={dict.kpi.roasBrut(formatRoas(ind.roasBrut))} definitie={def("roas-net")}>
                      <Variatie curent={ind.roasNet} anterior={indAnt.roasNet} bun="sus" />
                    </Kpi>
                    <Kpi titlu={dict.kpi.ramas} valoare={formatLei(ind.ramasBani, 0)} explicatie={dict.kpi.ramasExpl} definitie={def("ramas")}>
                      <Variatie curent={ind.ramasBani} anterior={indAnt.ramasBani} bun="sus" />
                    </Kpi>
                  </div>
                  <p className="text-[14px] text-[var(--ci-text)]">{propozitieRezumat(dict.propozitie, f, t, ind, dateIncomplete)}</p>

                  {/* C. Evoluție și comparație între platforme */}
                  <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
                    <Card>
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <h2 className="text-[15px] font-bold text-[var(--ci-text)]">{dict.evolutie.title}</h2>
                        <div role="group" aria-label={dict.evolutie.valoareaDonatiilor} className="inline-flex overflow-hidden rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] text-[12.5px]">
                          <button type="button" aria-pressed={!net} onClick={() => setNet(false)} className={`px-3 py-1.5 ${!net ? "bg-[var(--ci-primary)] text-white" : "bg-[var(--ci-surface)] text-[var(--ci-text)]"}`}>
                            {dict.evolutie.brut}
                          </button>
                          <button type="button" aria-pressed={net} onClick={() => setNet(true)} className={`px-3 py-1.5 ${net ? "bg-[var(--ci-primary)] text-white" : "bg-[var(--ci-surface)] text-[var(--ci-text)]"}`}>
                            {dict.evolutie.net}
                          </button>
                        </div>
                      </div>
                      <GraficReclame date={grafic} etichetaDonatii={etichetaDonatii} />
                    </Card>
                    <Card>
                      <h2 className="text-[15px] font-bold text-[var(--ci-text)]">{dict.pePlatforme.title}</h2>
                      <p className="text-[12.5px] text-[var(--ci-text-muted)]">{dict.pePlatforme.hint}</p>
                      <div className="mt-3 space-y-2">
                        {raport.pePlatforma.length === 0 ? (
                          <p className="text-[13px] text-[var(--ci-text-muted)]">{dict.pePlatforme.nimic}</p>
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
                                  {formatLei(p.totaluri.cheltuieliBani, 0)} {dict.pePlatforme.cheltuiti} · {formatNumar(p.totaluri.donatii)} {dict.pePlatforme.donatii} · {formatLei(i.netBani, 0)} {dict.pePlatforme.net}
                                </span>
                                {raport.pePlasament.filter((x) => x.platforma === p.platforma).length > 1 && (
                                  <span className="ci-tabular mt-1 block text-[11.5px] text-[var(--ci-text-muted)]">
                                    {raport.pePlasament
                                      .filter((x) => x.platforma === p.platforma)
                                      .map((x) => `${traduLib(locale, x.eticheta)}: ${formatLei(x.totaluri.cheltuieliBani, 0)}, ${formatNumar(x.totaluri.donatii)} ${dict.pePlatforme.donatii}`)
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
                        <h2 className="text-[15px] font-bold text-[var(--ci-text)]">{dict.tabel.title}</h2>
                        {platformaFiltru && (
                          <button type="button" onClick={() => setPlatformaFiltru(null)} className="text-[12.5px] font-medium text-[var(--ci-primary)] hover:underline">
                            {dict.tabel.filtru(date.etichetePlatforme[platformaFiltru] ?? platformaFiltru)}
                          </button>
                        )}
                      </div>
                      <div className="flex flex-wrap items-end gap-2.5">
                        <div className="w-56">
                          <Label htmlFor="rc-cauta">{dict.tabel.cauta}</Label>
                          <Input id="rc-cauta" icon={<Search className="h-3.5 w-3.5" />} value={cautare} onChange={(e) => setCautare(e.target.value)} placeholder={dict.tabel.placeholderCauta} />
                        </div>
                        <div>
                          <Label htmlFor="rc-sort">{dict.tabel.sorteaza}</Label>
                          <Select id="rc-sort" value={sortare} onChange={(e) => setSortare(e.target.value as Sortare)}>
                            <option value="cheltuieli">{dict.tabel.sortCheltuieli}</option>
                            <option value="donatii">{dict.tabel.sortDonatii}</option>
                            <option value="net">{dict.tabel.sortNet}</option>
                            <option value="roas">{dict.tabel.sortRoas}</option>
                          </Select>
                        </div>
                      </div>
                    </div>
                    {linii.length === 0 ? (
                      <p className="px-4 pb-5 text-[13px] text-[var(--ci-text-muted)]">{dict.tabel.gol}</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[760px] text-left text-[13px]">
                          <thead className="bg-[var(--ci-surface-2)] text-[11.5px] tracking-wide text-[var(--ci-text-muted)] uppercase">
                            <tr>
                              <th className="px-4 py-2 font-semibold">{dict.tabel.campanie}</th>
                              <th className="px-3 py-2 font-semibold">{dict.tabel.platforma}</th>
                              <th className="px-3 py-2 text-right font-semibold">{dict.tabel.cheltuieli}</th>
                              <th className="px-3 py-2 text-right font-semibold">{dict.tabel.donatii}</th>
                              <th className="px-3 py-2 text-right font-semibold">{dict.tabel.donatiiNete}</th>
                              <th className="px-3 py-2 text-right font-semibold">{dict.tabel.costDonatie}</th>
                              <th className="px-3 py-2 text-right font-semibold">{dict.tabel.roasNet}</th>
                              <th className="px-3 py-2 font-semibold">{dict.tabel.concluzie}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {linii.map((l) => {
                              const i = calculeazaIndicatori(l.totaluri);
                              const c = concluzie(l, i, dict.concluzie);
                              return (
                                <tr key={l.cheie} className="cursor-pointer border-t border-[var(--ci-border)] hover:bg-[var(--ci-surface-2)]" onClick={() => setDetaliu(l)}>
                                  <td className="px-4 py-2.5">
                                    <button type="button" onClick={(e) => { e.stopPropagation(); setDetaliu(l); }} className="text-left font-semibold text-[var(--ci-text)] hover:underline">
                                      {traduLib(locale, l.eticheta)}
                                    </button>
                                    <span className="block text-[11.5px] text-[var(--ci-text-muted)]">{l.utmCampanie ?? dict.tabel.faraCod}{!l.legata && dict.tabel.nelegata}</span>
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
                      {dict.tabel.nota(PRAG_MINIM_DONATII)}
                    </p>
                  </Card>

                  {/* E. Parcursul până la donație */}
                  <Card>
                    <h2 className="text-[15px] font-bold text-[var(--ci-text)]">{dict.parcurs.title}</h2>
                    <p className="text-[12.5px] text-[var(--ci-text-muted)]">{dict.parcurs.subtitle}</p>
                    <ol className="mt-3 grid gap-3 sm:grid-cols-4">
                      {[
                        { n: dict.parcurs.vizitatori, v: date.parcurs.vizitatori, r: null as number | null },
                        { n: dict.parcurs.deschis, v: date.parcurs.deschideri, r: rata(date.parcurs.deschideri, date.parcurs.vizitatori) },
                        { n: dict.parcurs.inceput, v: date.parcurs.incercari, r: rata(date.parcurs.incercari, date.parcurs.deschideri) },
                        { n: dict.parcurs.confirmata, v: date.parcurs.confirmate, r: rata(date.parcurs.confirmate, date.parcurs.incercari) },
                      ].map((p) => (
                        <li key={p.n} className="rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] px-3 py-2.5">
                          <p className="text-[12px] text-[var(--ci-text-muted)]">{p.n}</p>
                          <p className="ci-display ci-tabular text-[22px] font-bold text-[var(--ci-text)]">{formatNumar(p.v)}</p>
                          <p className="text-[11.5px] text-[var(--ci-text-muted)]">{p.r === null ? " " : `${formatProcent(p.r)} ${dict.parcurs.dinPasulAnterior}`}</p>
                        </li>
                      ))}
                    </ol>
                    {date.parcurs.vizitatori === 0 && <p className="mt-2 text-[12.5px] text-[var(--ci-text-muted)]">{dict.parcurs.faraTrafic}</p>}
                  </Card>

                  {date.reinnoiri.abonamente > 0 && (
                    <Card>
                      <h2 className="text-[15px] font-bold text-[var(--ci-text)]">{dict.abonamente.title}</h2>
                      <p className="mt-1 text-[13px] text-[var(--ci-text-muted)]">
                        {date.reinnoiri.abonamente} {date.reinnoiri.abonamente === 1 ? dict.abonamente.unul : dict.abonamente.mai} {dict.abonamente.mijloc} <strong className="ci-tabular text-[var(--ci-text)]">{formatLei(date.reinnoiri.incasatBani, 0)}</strong>. {dict.abonamente.sfarsit}
                      </p>
                    </Card>
                  )}

                  {/* F. Calitatea datelor */}
                  <Card padded={false}>
                    <details>
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-4 text-[15px] font-bold text-[var(--ci-text)]">
                        <span>
                          {dict.calitate.title}{" "}
                          {dateIncomplete && (
                            <Badge tone="amber" icon={false}>
                              {dict.calitate.cevaLipseste}
                            </Badge>
                          )}
                        </span>
                        <ChevronDown className="h-4 w-4 text-[var(--ci-text-muted)]" aria-hidden />
                      </summary>
                      <div className="space-y-3 border-t border-[var(--ci-border)] p-4 text-[13px] text-[var(--ci-text)]">
                        <div>
                          <p className="font-semibold">{dict.calitate.surseCosturi}</p>
                          {date.calitate.surse.length === 0 ? (
                            <p className="text-[var(--ci-text-muted)]">{dict.calitate.niciunCost}</p>
                          ) : (
                            <ul className="mt-1 space-y-0.5 text-[var(--ci-text-muted)]">
                              {date.calitate.surse.map((s) => (
                                <li key={s.platforma}>
                                  {date.etichetePlatforme[s.platforma] ?? s.platforma}: {dict.calitate.costuriPanaLa} {s.ultimaZi ? dataRo(s.ultimaZi) : "—"}
                                  {s.actualizatLa ? `, ${dict.calitate.actualizate} ${dataOraRo(s.actualizatLa)}` : ""} (
                                  {date.conexiuni.some((c) => c.platforma === s.platforma && c.stare === "activ") ? dict.calitate.sincAuto : dict.calitate.importManual})
                                  {date.conexiuni.some((c) => c.platforma === s.platforma && c.stare !== "activ") && dict.calitate.cereAtentie}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                        <div>
                          <p className="font-semibold">{dict.calitate.donatiiInPerioada}</p>
                          <p className="text-[var(--ci-text-muted)]">
                            {dict.calitate.donatiiText(formatNumar(date.calitate.donatiiConfirmate), formatNumar(date.calitate.cuAtribuire), formatNumar(t.donatii))}
                          </p>
                        </div>
                        {raport.donatiiFaraCostLegat > 0 && (
                          <p className="rounded-[var(--ci-radius-btn)] bg-[var(--ci-amber-soft)] px-3 py-2">
                            {dict.calitate.faraCostLegat(raport.donatiiFaraCostLegat)}
                          </p>
                        )}
                        {raport.costNealocatBani > 0 && (
                          <p className="rounded-[var(--ci-radius-btn)] bg-[var(--ci-amber-soft)] px-3 py-2">
                            {dict.calitate.costNealocat(formatLei(raport.costNealocatBani, 0))}
                          </p>
                        )}
                        <ul className="list-disc space-y-1 pl-5 text-[var(--ci-text-muted)]">
                          <li>{dict.calitate.nota1}</li>
                          <li>{dict.calitate.nota2}</li>
                          <li>{dict.calitate.nota3}</li>
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
              <TabGhid />
            </div>
          </>
        )}
      </Tabs>

      {detaliu && <DetaliuCampanie orgSlug={orgSlug} linie={detaliu} date={date} onClose={() => setDetaliu(null)} />}
    </div>
  );
}

// Lista scurtă de pornire: ce ai făcut deja și ce urmează. Dispare când toți pașii sunt bifați.
function PasiPornire({ date }: { date: DateReclame }) {
  const dict = RECLAME_UI_DICT[useLocale()].pornire;
  const costuriAduse = date.conexiuni.some((c) => c.platforma === "meta" && c.stare === "activ") || date.importuri.length > 0;
  const pasi = [
    { ok: date.linkuri.length > 0, ...dict.pasi[0]! },
    { ok: date.parcurs.vizitatori > 0 || date.raport.totaluri.donatii > 0, ...dict.pasi[1]! },
    { ok: costuriAduse, ...dict.pasi[2]! },
    { ok: date.raport.totaluri.donatii > 0, ...dict.pasi[3]! },
  ];
  if (pasi.every((p) => p.ok)) return null;
  const facute = pasi.filter((p) => p.ok).length;
  return (
    <Card>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[15px] font-bold text-[var(--ci-text)]">{dict.title}</h2>
        <p className="text-[12.5px] text-[var(--ci-text-muted)]">{dict.pasiFacuti(facute, pasi.length)}</p>
      </div>
      <ol className="mt-3 space-y-2.5">
        {pasi.map((p, i) => (
          <li key={p.titlu} className="flex items-start gap-3">
            <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${p.ok ? "bg-[var(--ci-green)] text-white" : "border border-[var(--ci-border-strong)] text-[var(--ci-text-muted)]"}`} aria-hidden>
              {p.ok ? "✓" : i + 1}
            </span>
            <div>
              <p className={`text-[13.5px] font-semibold ${p.ok ? "text-[var(--ci-text-muted)] line-through" : "text-[var(--ci-text)]"}`}>
                {p.titlu}
                <span className="sr-only">{p.ok ? dict.facut : dict.deFacut}</span>
              </p>
              {!p.ok && <p className="text-[12.5px] text-[var(--ci-text-muted)]">{p.cum}</p>}
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}

// Panoul unei campanii: cifrele complete, explicația atribuirii și, pentru cheltuielile nealocate, legarea de un cod UTM.
function DetaliuCampanie({ orgSlug, linie, date, onClose }: { orgSlug: string; linie: LinieRaport; date: DateReclame; onClose: () => void }) {
  const locale = useLocale();
  const dict = RECLAME_UI_DICT[locale].detaliu;
  const { lei: formatLei, numar: formatNumar, roas: formatRoas } = formatariReclame(locale);
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
    <Dialog open onClose={onClose} title={traduLib(locale, linie.eticheta)} width="max-w-lg">
      <div className="space-y-4">
        <p className="text-[12.5px] text-[var(--ci-text-muted)]">
          {date.etichetePlatforme[linie.platforma] ?? linie.platforma} · {linie.utmCampanie ? dict.cod(linie.utmCampanie) : dict.fara}
        </p>
        <dl>
          {rand(dict.cheltuieli, formatLei(linie.totaluri.cheltuieliBani))}
          {rand(dict.donatii, formatNumar(linie.totaluri.donatii))}
          {rand(dict.brut, formatLei(linie.totaluri.brutBani))}
          {rand(dict.rambursat, formatLei(linie.totaluri.rambursatBani))}
          {rand(dict.netaVal, formatLei(i.netBani))}
          {rand(dict.costDonatie, formatLei(i.costPerDonatieBani))}
          {rand(dict.costDonatorNou, formatLei(i.costPerDonatorNouBani))}
          {rand(dict.roasNet, formatRoas(i.roasNet))}
          {rand(dict.media, formatLei(i.mediaDonatieBani))}
          {rand(dict.donatori, `${linie.totaluri.donatoriNoi} / ${linie.totaluri.donatoriExistenti} / ${linie.totaluri.donatoriNeclasificati}`)}
          {rand(dict.afisari, formatNumar(linie.afisari))}
          {rand(dict.clicuri, formatNumar(clicuri))}
        </dl>
        <p className="text-[12.5px] text-[var(--ci-text-muted)]">
          {dict.atribuire(linie.utmCampanie ?? dict.faraCodParan, date.fereastraZile)}
          {linie.nota ? ` ${traduLib(locale, linie.nota)}.` : ""}
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
                  setMesaj({ ok: true, text: dict.legaturaSalvata });
                  router.refresh();
                } else setMesaj({ ok: false, text: r.eroare });
              });
            }}
          >
            <Label htmlFor="rc-cod">{dict.codulUtm}</Label>
            <div className="flex gap-2">
              <Input id="rc-cod" value={cod} onChange={(e) => setCod(e.target.value)} placeholder="cmp_026" />
              <Button type="submit" variant="primary" loading={pending}>
                {dict.salveaza}
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
