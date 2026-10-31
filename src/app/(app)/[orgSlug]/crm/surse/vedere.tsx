import { Download, Eye, FileSignature, HandCoins, Info, Percent, Users, Wallet } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { CANALE, etichetaSursa, TIPURI, type Canal } from "@/lib/atribuire/clasificare";
import { MODELE, rata } from "@/lib/atribuire/model";
import { filtreInParametri, PERIOADE_RAPORT, ziuaRoJs, type Raport } from "@/lib/atribuire/rapoarte";
import { etichetaSursaTr, SURSE_UI_DICT } from "@/lib/i18n/dictionaries/surse-ui";
import type { Locale } from "@/lib/i18n/config";

import { Badge, type StatusTone } from "../components/ui/badge";
import { Breadcrumb } from "../components/ui/breadcrumb";
import { Card, CardHeader } from "../components/ui/card";
import { EmptyState } from "../components/ui/states";
import { formatSuma } from "../lib/format";
import { FereastraAtribuire } from "./fereastra-atribuire";
import { GeneratorLinkuri, type TintaLink } from "./generator-linkuri";
import { GraficEvolutie, type PunctGrafic } from "./grafic";

const TON_TIP: Record<string, StatusTone> = { platit: "orange", organic: "green", nedeterminat: "neutral" };
const TON_CANAL = (c: Canal): StatusTone => (c === "direct" ? "neutral" : c.endsWith("platit") || c.endsWith("platita") ? "orange" : c === "social_nedeterminat" || c === "altele" ? "neutral" : "blue");

function Kpi({ icon, eticheta, valoare, nota }: { icon: ReactNode; eticheta: string; valoare: string; nota?: string }) {
  return (
    <Card>
      <p className="flex items-center gap-1.5 text-[12px] text-[var(--ci-text-muted)]">
        <span className="text-[var(--ci-primary)]" aria-hidden="true">
          {icon}
        </span>
        {eticheta}
      </p>
      <p className="ci-tabular mt-1 text-xl font-bold text-[var(--ci-text)]">{valoare}</p>
      {nota && <p className="mt-0.5 text-[11.5px] text-[var(--ci-text-faint)]">{nota}</p>}
    </Card>
  );
}

const celula = "px-3 py-2 text-right ci-tabular whitespace-nowrap";
const capTabel = "px-3 py-2 text-right font-medium whitespace-nowrap";
const capText = "px-3 py-2 text-left font-medium whitespace-nowrap";

function zileDinPerioada(de: string, pana: string): string[] {
  const out: string[] = [];
  const [a, l, z] = de.split("-").map(Number);
  let t = Date.UTC(a!, l! - 1, z!);
  const [a2, l2, z2] = pana.split("-").map(Number);
  const sfarsit = Date.UTC(a2!, l2! - 1, z2!);
  while (t <= sfarsit && out.length < 420) {
    out.push(new Date(t).toISOString().slice(0, 10));
    t += 86_400_000;
  }
  return out;
}

export function SurseVedere({
  locale,
  orgSlug,
  orgNume,
  raport,
  tab,
  poateAdministra,
  tinte,
  siteUrl,
}: {
  locale: Locale;
  orgSlug: string;
  orgNume: string;
  raport: Raport;
  tab: "rezumat" | "linkuri";
  poateAdministra: boolean;
  tinte: TintaLink[];
  siteUrl: string;
}) {
  const d = SURSE_UI_DICT[locale];
  const nr = (n: number) => n.toLocaleString(d.numere);
  const pct = (n: number, den: number) => {
    const r = rata(n, den);
    return r === null ? "—" : `${r.toLocaleString(d.numere, { maximumFractionDigits: 1 })}%`;
  };
  const dataRo = (iso: string) => iso.split("-").reverse().join(locale === "ro" ? "." : "/");
  const dataOraRo = (iso: string) => new Date(iso).toLocaleString(d.numere, { timeZone: "Europe/Bucharest", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const sursa = (x: string) => etichetaSursaTr(locale, x, etichetaSursa);
  const suma = (v: number) => formatSuma(v, undefined, locale);
  const f = raport.filtre;
  const baza = `/${orgSlug}/crm/surse`;
  const q = filtreInParametri(f);
  const exportHref = `/api/${orgSlug}/surse-export?${q.toString()}`;
  const tabHref = (t: "rezumat" | "linkuri") => `${baza}${t === "linkuri" ? "?tab=linkuri" : `?${q.toString()}`}`;
  const model = MODELE.find((m) => m.cheie === f.model)!;
  const modelTr = d.modele[model.cheie] ?? model;

  const toateZilele = zileDinPerioada(f.de, f.pana);
  const dupaZi = new Map(raport.serie.map((p) => [p.ziua, p]));
  const grafic: PunctGrafic[] = toateZilele.map((z) => ({ zi: z, vizitatori: dupaZi.get(z)?.vizitatori ?? 0, donatii: dupaZi.get(z)?.donatiiConfirmate ?? 0, formulare: dupaZi.get(z)?.formulareTrimise ?? 0 }));

  const t = raport.total;
  const fara = raport.fracFaraAcord;
  const faraDate = t.vizitatori === 0 && t.donatiiInitiate === 0 && t.formulareTrimise === 0 && raport.sponsorizare20.companiiAdaugate === 0 && raport.sponsorizare20.sponsorizariIncasate === 0;
  const aratFlux = (x: "campanie" | "f230") => f.flux === "toate" || f.flux === x;

  return (
    <div className="mx-auto max-w-[1180px] space-y-5">
      <Breadcrumb items={[{ label: d.breadcrumbFonduri, href: `/${orgSlug}/crm/strangere-fonduri` }, { label: d.titlu }]} />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">{d.titlu}</h1>
          <p className="mt-0.5 max-w-2xl text-[13px] text-[var(--ci-text-muted)]">
            {d.intro}
          </p>
        </div>
        <nav aria-label={d.sectiune} className="flex gap-1 rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] bg-[var(--ci-surface)] p-1">
          {(["rezumat", "linkuri"] as const).map((x) => (
            <Link
              key={x}
              prefetch={false}
              href={tabHref(x)}
              aria-current={x === tab ? "page" : undefined}
              className={`rounded-[calc(var(--ci-radius-btn)-2px)] px-3 py-1.5 text-[13px] font-medium transition ${x === tab ? "bg-[var(--ci-primary)] text-white" : "text-[var(--ci-text-muted)] hover:bg-[var(--ci-surface-2)] hover:text-[var(--ci-text)]"}`}
            >
              {x === "rezumat" ? d.tabRezumat : d.tabLinkuri}
            </Link>
          ))}
        </nav>
      </div>

      {tab === "linkuri" ? (
        <GeneratorLinkuri siteUrl={siteUrl} tinte={tinte} />
      ) : (
        <>
          <form method="get" className="space-y-3 rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] bg-[var(--ci-surface)] p-4">
            <div className="flex flex-wrap items-end gap-3">
              <Camp eticheta={d.filtre.de} id="f-de">
                <input id="f-de" type="date" name="de" defaultValue={f.de} max={ziuaRoJs(0)} className={campClasa} />
              </Camp>
              <Camp eticheta={d.filtre.pana} id="f-pana">
                <input id="f-pana" type="date" name="pana" defaultValue={f.pana} max={ziuaRoJs(0)} className={campClasa} />
              </Camp>
              <Camp eticheta={d.filtre.flux} id="f-flux">
                <select id="f-flux" name="flux" defaultValue={f.pageId ? "campanie" : f.flux} className={campClasa}>
                  <option value="toate">{d.filtre.toateFluxurile}</option>
                  <option value="campanie">{d.fluxuri.campanie}</option>
                  <option value="f230">{d.fluxuri.f230}</option>
                </select>
              </Camp>
              <Camp eticheta={d.filtre.campanie} id="f-campanie">
                <select id="f-campanie" name="campanie" defaultValue={f.pageId ?? ""} className={`${campClasa} max-w-[240px]`}>
                  <option value="">{d.filtre.toateCampaniile}</option>
                  {raport.campaniiDisponibile.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.titlu}
                    </option>
                  ))}
                </select>
              </Camp>
              <Camp eticheta={d.filtre.sursa} id="f-sursa">
                <select id="f-sursa" name="sursa" defaultValue={f.sursa ?? ""} className={campClasa}>
                  <option value="">{d.filtre.toateSursele}</option>
                  {raport.opSurse.map((s) => (
                    <option key={s} value={s}>
                      {sursa(s)}
                    </option>
                  ))}
                </select>
              </Camp>
              <Camp eticheta={d.filtre.canal} id="f-canal">
                <select id="f-canal" name="canal" defaultValue={f.canal ?? ""} className={campClasa}>
                  <option value="">{d.filtre.toateCanalele}</option>
                  {CANALE.map((c) => (
                    <option key={c} value={c}>
                      {d.canal[c]}
                    </option>
                  ))}
                </select>
              </Camp>
              <Camp eticheta={d.filtre.tip} id="f-tip">
                <select id="f-tip" name="tip" defaultValue={f.tip ?? ""} className={campClasa}>
                  <option value="">{d.filtre.toate}</option>
                  {TIPURI.map((x) => (
                    <option key={x} value={x}>
                      {d.tip[x]}
                    </option>
                  ))}
                </select>
              </Camp>
              <Camp eticheta={d.filtre.campMarketing} id="f-camp">
                <select id="f-camp" name="camp" defaultValue={f.campanieMarketing ?? ""} className={campClasa}>
                  <option value="">{d.filtre.toate}</option>
                  {raport.opCampaniiMarketing.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </Camp>
              <Camp eticheta={d.filtre.model} id="f-model">
                <select id="f-model" name="model" defaultValue={f.model} className={campClasa}>
                  {MODELE.map((m) => (
                    <option key={m.cheie} value={m.cheie}>
                      {d.modele[m.cheie]?.eticheta ?? m.eticheta}
                    </option>
                  ))}
                </select>
              </Camp>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button type="submit" className="h-9 rounded-[var(--ci-radius-btn)] bg-[var(--ci-primary)] px-4 text-[13px] font-semibold text-white hover:bg-[var(--ci-primary-hover)]">
                {d.filtre.aplica}
              </button>
              <span className="text-[12px] text-[var(--ci-text-faint)]">{d.filtre.rapid}</span>
              {PERIOADE_RAPORT.map((p) => (
                <Link key={p.cheie} prefetch={false} href={`${baza}?perioada=${p.cheie}`} className="rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] px-2.5 py-1 text-[12.5px] text-[var(--ci-text-muted)] hover:bg-[var(--ci-surface-2)]">
                  {d.perioade[p.cheie] ?? p.eticheta}
                </Link>
              ))}
              {poateAdministra && (
                <a href={exportHref} className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] px-3 text-[13px] font-medium text-[var(--ci-text)] hover:bg-[var(--ci-surface-2)]">
                  <Download className="h-4 w-4" aria-hidden="true" />
                  {d.filtre.export}
                </a>
              )}
            </div>
          </form>

          <div className="flex gap-2.5 rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] bg-[var(--ci-surface-2)] px-4 py-3 text-[12.5px] leading-relaxed text-[var(--ci-text-muted)]">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ci-primary)]" aria-hidden="true" />
            <div>
              <p>
                <strong className="text-[var(--ci-text)]">{d.nota.statisticile}</strong>
                {d.nota.nuToate} {d.nota.perioada} {dataRo(f.de)} – {dataRo(f.pana)} {d.nota.oraRo} {d.nota.modelul} <strong className="text-[var(--ci-text)]">{modelTr.eticheta}</strong>. {modelTr.descriere} {d.nota.fereastra(raport.fereastraZile)}
              </p>
              <ul className="mt-1.5 list-disc space-y-0.5 pl-5">
                {fara !== null && fara > 0 && <li>{d.nota.faraAcord(fara.toLocaleString(d.numere, { maximumFractionDigits: 0 }))}</li>}
                {raport.tipNedeterminatVizitatori !== null && raport.tipNedeterminatVizitatori > 0 && (
                  <li>{d.nota.nedeterminat(raport.tipNedeterminatVizitatori.toLocaleString(d.numere, { maximumFractionDigits: 0 }))}</li>
                )}
                {raport.conversiiNeatribuite > 0 && <li>{d.nota.neatribuite(nr(raport.conversiiNeatribuite), nr(raport.conversiiTotal))}</li>}
                <li>{d.nota.blocare}</li>
              </ul>
            </div>
          </div>

          {faraDate ? (
            <EmptyState
              icon={Eye}
              title={d.gol.titlu}
              description={d.gol.desc}
              action={
                <Link prefetch={false} href={tabHref("linkuri")} className="rounded-[var(--ci-radius-btn)] bg-[var(--ci-primary)] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[var(--ci-primary-hover)]">
                  {d.gol.buton}
                </Link>
              }
            />
          ) : (
            <>
              {aratFlux("campanie") && (
                <section aria-labelledby="h-camp" className="space-y-2">
                  <h2 id="h-camp" className="ci-display text-[14px] font-semibold text-[var(--ci-text)]">
                    {d.fluxuri.campanie}
                  </h2>
                  <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                    <Kpi icon={<Users className="h-3.5 w-3.5" />} eticheta={d.kpi.vizitatori} valoare={nr(raport.totalCampanie.vizitatori)} nota={d.kpi.sesiuni(nr(raport.totalCampanie.sesiuni))} />
                    <Kpi icon={<HandCoins className="h-3.5 w-3.5" />} eticheta={d.kpi.donatiiConfirmate} valoare={nr(raport.totalCampanie.donatiiConfirmate)} nota={d.kpi.donatiiNota(nr(raport.totalCampanie.donatiiInitiate), nr(raport.totalCampanie.donatiiRambursate))} />
                    <Kpi icon={<Users className="h-3.5 w-3.5" />} eticheta={d.kpi.donatoriUnici} valoare={nr(raport.totalCampanie.donatoriUnici)} nota={d.kpi.dupaEmail} />
                    <Kpi icon={<Wallet className="h-3.5 w-3.5" />} eticheta={d.kpi.valoareNeta} valoare={suma(raport.totalCampanie.sumaNeta)} nota={d.kpi.brut(suma(raport.totalCampanie.sumaBruta))} />
                    <Kpi icon={<Percent className="h-3.5 w-3.5" />} eticheta={d.kpi.rataConversie} valoare={pct(raport.totalCampanie.donatiiConfirmate, raport.totalCampanie.vizitatori)} nota={d.kpi.rataConversieNota} />
                  </div>
                </section>
              )}
              {aratFlux("f230") && !f.pageId && (
                <section aria-labelledby="h-f230" className="space-y-2">
                  <h2 id="h-f230" className="ci-display text-[14px] font-semibold text-[var(--ci-text)]">
                    {d.fluxuri.f230}
                  </h2>
                  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <Kpi icon={<Users className="h-3.5 w-3.5" />} eticheta={d.kpi.vizitatori} valoare={nr(raport.totalF230.vizitatori)} nota={d.kpi.sesiuni(nr(raport.totalF230.sesiuni))} />
                    <Kpi icon={<FileSignature className="h-3.5 w-3.5" />} eticheta={d.kpi.formulareIncepute} valoare={nr(raport.totalF230.startFormular)} nota={d.kpi.formulareInceputeNota} />
                    <Kpi icon={<FileSignature className="h-3.5 w-3.5" />} eticheta={d.kpi.formulareTrimise} valoare={nr(raport.totalF230.formulareTrimise)} nota={d.kpi.formulareTrimiseNota} />
                    <Kpi icon={<Percent className="h-3.5 w-3.5" />} eticheta={d.kpi.rataFinalizare} valoare={pct(raport.totalF230.formulareTrimise, raport.totalF230.startFormular)} nota={d.kpi.rataFinalizareNota} />
                  </div>
                </section>
              )}
              {f.flux === "toate" && !f.pageId && (
                <section aria-labelledby="h-20" className="space-y-2">
                  <h2 id="h-20" className="ci-display text-[14px] font-semibold text-[var(--ci-text)]">
                    {d.fluxuri.sponsorizare20}
                  </h2>
                  <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                    <Kpi icon={<Users className="h-3.5 w-3.5" />} eticheta={d.kpi.firmeAdaugate} valoare={nr(raport.sponsorizare20.companiiAdaugate)} />
                    <Kpi icon={<FileSignature className="h-3.5 w-3.5" />} eticheta={d.kpi.contracteTrimise} valoare={nr(raport.sponsorizare20.contracteTrimise)} />
                    <Kpi icon={<FileSignature className="h-3.5 w-3.5" />} eticheta={d.kpi.contracteSemnate} valoare={nr(raport.sponsorizare20.contracteSemnate)} nota={d.kpi.semnatNuIncasat} />
                    <Kpi icon={<HandCoins className="h-3.5 w-3.5" />} eticheta={d.kpi.sponsorizariIncasate} valoare={nr(raport.sponsorizare20.sponsorizariIncasate)} />
                    <Kpi icon={<Wallet className="h-3.5 w-3.5" />} eticheta={d.kpi.sumaIncasata} valoare={suma(raport.sponsorizare20.sumaIncasata)} />
                  </div>
                  <p className="text-[12px] text-[var(--ci-text-muted)]">{d.kpi.sponsorizareNota}</p>
                </section>
              )}

              <Card>
                <CardHeader title={d.perTip.titlu} subtitle={d.perTip.subtitlu} />
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-[13px]">
                    <thead className="border-b border-[var(--ci-border)] text-[12px] text-[var(--ci-text-muted)]">
                      <tr>
                        <th className={capText}>{d.perTip.tipPromovare}</th>
                        <th className={capTabel}>{d.perTip.vizitatori}</th>
                        <th className={capTabel}>{d.perTip.donatiiConfirmate}</th>
                        <th className={capTabel}>{d.perTip.donatoriUnici}</th>
                        <th className={capTabel}>{d.perTip.valoareNeta}</th>
                        <th className={capTabel}>{d.perTip.formulare}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {raport.perTip.map((x) => (
                        <tr key={x.tip} className="border-b border-[var(--ci-border)] last:border-0">
                          <td className="px-3 py-2">
                            <Badge tone={TON_TIP[x.tip]} icon={false}>
                              {d.tip[x.tip]}
                            </Badge>
                          </td>
                          <td className={celula}>{nr(x.vizitatori)}</td>
                          <td className={celula}>{nr(x.donatiiConfirmate)}</td>
                          <td className={celula}>{nr(x.donatoriUnici)}</td>
                          <td className={celula}>{suma(x.sumaNeta)}</td>
                          <td className={celula}>{nr(x.formulareTrimise)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-[12px] text-[var(--ci-text-faint)]">{d.perTip.nota}</p>
              </Card>

              <Card>
                <CardHeader title={d.evolutie.titlu} subtitle={d.evolutie.subtitlu} />
                <GraficEvolutie date={grafic} />
              </Card>

              <Card padded={false}>
                <div className="p-5 pb-3">
                  <CardHeader title={d.peSursa.titlu} subtitle={d.peSursa.subtitlu} />
                </div>
                {raport.tabel.length === 0 ? (
                  <p className="px-5 pb-5 text-[13px] text-[var(--ci-text-muted)]">{d.peSursa.niciunRand}</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[1080px] text-[13px]">
                      <thead className="border-y border-[var(--ci-border)] bg-[var(--ci-surface-2)] text-[12px] text-[var(--ci-text-muted)]">
                        <tr>
                          <th className={capText}>{d.peSursa.sursa}</th>
                          <th className={capText}>{d.peSursa.canal}</th>
                          <th className={capText}>{d.peSursa.tip}</th>
                          <th className={capText}>{d.peSursa.campMarketing}</th>
                          <th className={capText}>{d.peSursa.continut}</th>
                          <th className={capTabel}>{d.peSursa.vizitatori}</th>
                          <th className={capTabel}>{d.peSursa.clickDoneaza}</th>
                          <th className={capTabel}>{d.peSursa.donatiiIncepute}</th>
                          <th className={capTabel}>{d.peSursa.donatiiConfirmate}</th>
                          <th className={capTabel}>{d.peSursa.donatori}</th>
                          <th className={capTabel}>{d.peSursa.valoareNeta}</th>
                          <th className={capTabel}>{d.peSursa.rataConv}</th>
                          <th className={capTabel}>{d.peSursa.formulareIncepute}</th>
                          <th className={capTabel}>{d.peSursa.formulareTrimise}</th>
                          <th className={capTabel}>{d.peSursa.rataFin}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {raport.tabel.map((x) => (
                          <tr key={`${x.sursa}|${x.canal}|${x.tip}|${x.campanie}|${x.continut}`} className="border-b border-[var(--ci-border)] last:border-0">
                            <td className="px-3 py-2 font-medium text-[var(--ci-text)]">{sursa(x.sursa)}</td>
                            <td className="px-3 py-2">
                              <Badge tone={TON_CANAL(x.canal)} icon={false}>
                                {d.canalScurt[x.canal]}
                              </Badge>
                            </td>
                            <td className="px-3 py-2">
                              <Badge tone={TON_TIP[x.tip]} icon={false}>
                                {d.tip[x.tip]}
                              </Badge>
                            </td>
                            <td className="px-3 py-2 text-[var(--ci-text-muted)]">{x.campanie || "—"}</td>
                            <td className="px-3 py-2 text-[var(--ci-text-muted)]">{x.continut || "—"}</td>
                            <td className={celula}>{nr(x.vizitatori)}</td>
                            <td className={celula}>{nr(x.clickDoneaza)}</td>
                            <td className={celula}>{nr(x.startDonatie)}</td>
                            <td className={celula}>{nr(x.donatiiConfirmate)}</td>
                            <td className={celula}>{nr(x.donatoriUnici)}</td>
                            <td className={celula}>{suma(x.sumaNeta)}</td>
                            <td className={celula}>{pct(x.donatiiConfirmate, x.vizitatori)}</td>
                            <td className={celula}>{nr(x.startFormular)}</td>
                            <td className={celula}>{nr(x.formulareTrimise)}</td>
                            <td className={celula}>{pct(x.formulareTrimise, x.startFormular)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>

              {raport.campanii.length > 0 && aratFlux("campanie") && (
                <Card padded={false}>
                  <div className="p-5 pb-3">
                    <CardHeader title={d.peCampanie.titlu} />
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[720px] text-[13px]">
                      <thead className="border-y border-[var(--ci-border)] bg-[var(--ci-surface-2)] text-[12px] text-[var(--ci-text-muted)]">
                        <tr>
                          <th className={capText}>{d.peCampanie.campanie}</th>
                          <th className={capTabel}>{d.peSursa.vizitatori}</th>
                          <th className={capTabel}>{d.peSursa.donatiiConfirmate}</th>
                          <th className={capTabel}>{d.peSursa.donatori}</th>
                          <th className={capTabel}>{d.peSursa.valoareNeta}</th>
                          <th className={capTabel}>{d.peSursa.rataConv}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {raport.campanii.map((c) => (
                          <tr key={c.pageId} className="border-b border-[var(--ci-border)] last:border-0">
                            <td className="px-3 py-2">
                              <Link prefetch={false} href={`${baza}?${filtreInParametri({ ...f, pageId: c.pageId, flux: "campanie" }).toString()}`} className="font-medium text-[var(--ci-primary)] hover:underline">
                                {c.titlu}
                              </Link>
                            </td>
                            <td className={celula}>{nr(c.vizitatori)}</td>
                            <td className={celula}>{nr(c.donatiiConfirmate)}</td>
                            <td className={celula}>{nr(c.donatoriUnici)}</td>
                            <td className={celula}>{suma(c.sumaNeta)}</td>
                            <td className={celula}>{pct(c.donatiiConfirmate, c.vizitatori)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}

              <Card>
                <CardHeader title={d.costuri.titlu} subtitle={d.costuri.subtitlu} />
                {raport.costuri.length === 0 ? (
                  <p className="text-[13px] text-[var(--ci-text-muted)]">
                    <strong className="text-[var(--ci-text)]">{d.costuri.indisponibil}</strong>
                    {d.costuri.indisponibilText}
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[560px] text-[13px]">
                      <thead className="border-b border-[var(--ci-border)] text-[12px] text-[var(--ci-text-muted)]">
                        <tr>
                          <th className={capText}>{d.costuri.campMarketing}</th>
                          <th className={capTabel}>{d.costuri.cheltuit}</th>
                          <th className={capTabel}>{d.costuri.donatori}</th>
                          <th className={capTabel}>{d.costuri.costDonator}</th>
                          <th className={capTabel}>{d.costuri.formulare}</th>
                          <th className={capTabel}>{d.costuri.costFormular}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {raport.costuri.map((c) => (
                          <tr key={c.campanie} className="border-b border-[var(--ci-border)] last:border-0">
                            <td className="px-3 py-2 text-[var(--ci-text)]">{c.campanie}</td>
                            <td className={celula}>{suma(c.costLei)}</td>
                            <td className={celula}>{nr(c.donatori)}</td>
                            <td className={celula}>{c.costPerDonator === null ? d.costuri.indisponibilCelula : suma(c.costPerDonator)}</td>
                            <td className={celula}>{nr(c.formulare)}</td>
                            <td className={celula}>{c.costPerFormular === null ? d.costuri.indisponibilCelula : suma(c.costPerFormular)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>

              <Card padded={false}>
                <div className="p-5 pb-3">
                  <CardHeader
                    title={d.conversii.titlu}
                    subtitle={poateAdministra ? d.conversii.subtitluAdmin : d.conversii.subtitluMembru}
                  />
                </div>
                {raport.ultimeleConversii.length === 0 ? (
                  <p className="px-5 pb-5 text-[13px] text-[var(--ci-text-muted)]">{d.conversii.nicio}</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[820px] text-[13px]">
                      <thead className="border-y border-[var(--ci-border)] bg-[var(--ci-surface-2)] text-[12px] text-[var(--ci-text-muted)]">
                        <tr>
                          <th className={capText}>{d.conversii.data}</th>
                          <th className={capText}>{d.conversii.ce}</th>
                          <th className={capText}>{d.conversii.stare}</th>
                          <th className={capTabel}>{d.conversii.suma}</th>
                          <th className={capText}>{d.conversii.sursaAtribuita}</th>
                          <th className={capText}>{d.conversii.tip}</th>
                          <th className={capText}>{d.conversii.campMarketing}</th>
                          {poateAdministra && <th className={capText}>{d.conversii.vizitator}</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {raport.ultimeleConversii.map((c, i) => (
                          <tr key={`${c.la}-${i}`} className="border-b border-[var(--ci-border)] last:border-0">
                            <td className="px-3 py-2 whitespace-nowrap text-[var(--ci-text-muted)]">{dataOraRo(c.la)}</td>
                            <td className="px-3 py-2">{c.tip === "f230" ? d.conversii.formular230 : (c.pageTitlu ?? d.conversii.donatie)}</td>
                            <td className="px-3 py-2 text-[var(--ci-text-muted)]">{d.stare[c.stare] ?? c.stare}</td>
                            <td className={celula}>{c.suma !== null ? suma(c.suma) : "—"}</td>
                            <td className="px-3 py-2">
                              {sursa(c.sursa)} · {d.canalScurt[c.canal]}
                            </td>
                            <td className="px-3 py-2">{d.tip[c.tipPromovare]}</td>
                            <td className="px-3 py-2 text-[var(--ci-text-muted)]">{c.campanie || "—"}</td>
                            {poateAdministra && (
                              <td className="px-3 py-2 whitespace-nowrap">
                                {c.vizitatorId && c.persistent ? (
                                  <Link prefetch={false} href={`${baza}/vizitator/${encodeURIComponent(c.vizitatorId)}`} className="font-mono text-[12px] text-[var(--ci-primary)] hover:underline">
                                    {c.vizitatorId.slice(0, 8)}…
                                  </Link>
                                ) : (
                                  <span className="text-[var(--ci-text-faint)]">{d.conversii.faraIstoric}</span>
                                )}
                                {c.donatorId && (
                                  <Link prefetch={false} href={`/${orgSlug}/crm/donatori/reali/${c.donatorId}`} className="ml-2 text-[12px] text-[var(--ci-primary)] hover:underline">
                                    {d.conversii.donator}
                                  </Link>
                                )}
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </>
          )}

          <Card>
            <CardHeader title={d.cum.titlu} />
            <dl className="grid gap-x-8 gap-y-2 text-[13px] text-[var(--ci-text-muted)] md:grid-cols-2">
              {d.cum.defs.map((x) => (
                <Def key={x.t} t={x.t}>
                  {x.d}
                </Def>
              ))}
            </dl>
            {poateAdministra && (
              <div className="mt-4 border-t border-[var(--ci-border)] pt-4">
                <FereastraAtribuire orgSlug={orgSlug} initiala={raport.fereastraZile} />
              </div>
            )}
          </Card>
          <p className="text-[11.5px] text-[var(--ci-text-faint)]">{d.cum.subsol(orgNume)}</p>
        </>
      )}
    </div>
  );
}

const campClasa = "h-9 rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] bg-[var(--ci-surface)] px-2.5 text-[13px] text-[var(--ci-text)]";

function Camp({ eticheta, id, children }: { eticheta: string; id: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-[12px] font-medium text-[var(--ci-text-muted)]">
        {eticheta}
      </label>
      {children}
    </div>
  );
}
function Def({ t, children }: { t: string; children: ReactNode }) {
  return (
    <div>
      <dt className="font-medium text-[var(--ci-text)]">{t}</dt>
      <dd>{children}</dd>
    </div>
  );
}

