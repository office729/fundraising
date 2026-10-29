import { Download, Eye, FileSignature, HandCoins, Info, Percent, Users, Wallet } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { CANALE, ETICHETE_CANAL, ETICHETE_FLUX, ETICHETE_TIP, etichetaSursa, TIPURI, type Canal } from "@/lib/atribuire/clasificare";
import { MODELE, rata } from "@/lib/atribuire/model";
import { filtreInParametri, PERIOADE_RAPORT, ziuaRoJs, type Raport } from "@/lib/atribuire/rapoarte";

import { Badge, type StatusTone } from "../components/ui/badge";
import { Breadcrumb } from "../components/ui/breadcrumb";
import { Card, CardHeader } from "../components/ui/card";
import { EmptyState } from "../components/ui/states";
import { formatSuma } from "../lib/format";
import { FereastraAtribuire } from "./fereastra-atribuire";
import { GeneratorLinkuri, type TintaLink } from "./generator-linkuri";
import { GraficEvolutie, type PunctGrafic } from "./grafic";

const nr = (n: number) => n.toLocaleString("ro-RO");
const pct = (n: number, d: number) => {
  const r = rata(n, d);
  return r === null ? "—" : `${r.toLocaleString("ro-RO", { maximumFractionDigits: 1 })}%`;
};
const dataRo = (iso: string) => iso.split("-").reverse().join(".");
const dataOraRo = (iso: string) => new Date(iso).toLocaleString("ro-RO", { timeZone: "Europe/Bucharest", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
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
  orgSlug,
  orgNume,
  raport,
  tab,
  poateAdministra,
  tinte,
  siteUrl,
}: {
  orgSlug: string;
  orgNume: string;
  raport: Raport;
  tab: "rezumat" | "linkuri";
  poateAdministra: boolean;
  tinte: TintaLink[];
  siteUrl: string;
}) {
  const f = raport.filtre;
  const baza = `/${orgSlug}/crm/surse`;
  const q = filtreInParametri(f);
  const exportHref = `/api/${orgSlug}/surse-export?${q.toString()}`;
  const tabHref = (t: "rezumat" | "linkuri") => `${baza}${t === "linkuri" ? "?tab=linkuri" : `?${q.toString()}`}`;
  const model = MODELE.find((m) => m.cheie === f.model)!;

  const toateZilele = zileDinPerioada(f.de, f.pana);
  const dupaZi = new Map(raport.serie.map((p) => [p.ziua, p]));
  const grafic: PunctGrafic[] = toateZilele.map((z) => ({ zi: z, vizitatori: dupaZi.get(z)?.vizitatori ?? 0, donatii: dupaZi.get(z)?.donatiiConfirmate ?? 0, formulare: dupaZi.get(z)?.formulareTrimise ?? 0 }));

  const t = raport.total;
  const fara = raport.fracFaraAcord;
  const faraDate = t.vizitatori === 0 && t.donatiiInitiate === 0 && t.formulareTrimise === 0 && raport.sponsorizare20.companiiAdaugate === 0 && raport.sponsorizare20.sponsorizariIncasate === 0;
  const aratFlux = (x: "campanie" | "f230") => f.flux === "toate" || f.flux === x;

  return (
    <div className="mx-auto max-w-[1180px] space-y-5">
      <Breadcrumb items={[{ label: "Strângere de fonduri", href: `/${orgSlug}/crm/strangere-fonduri` }, { label: "Statistici și surse" }]} />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">Statistici și surse</h1>
          <p className="mt-0.5 max-w-2xl text-[13px] text-[var(--ci-text-muted)]">
            De unde vin oamenii care îți văd campaniile și Formularul 230, dacă vin din promovare organică sau plătită, și câți dintre ei donează sau trimit formularul.
          </p>
        </div>
        <nav aria-label="Secțiune" className="flex gap-1 rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] bg-[var(--ci-surface)] p-1">
          {(["rezumat", "linkuri"] as const).map((x) => (
            <Link
              key={x}
              prefetch={false}
              href={tabHref(x)}
              aria-current={x === tab ? "page" : undefined}
              className={`rounded-[calc(var(--ci-radius-btn)-2px)] px-3 py-1.5 text-[13px] font-medium transition ${x === tab ? "bg-[var(--ci-primary)] text-white" : "text-[var(--ci-text-muted)] hover:bg-[var(--ci-surface-2)] hover:text-[var(--ci-text)]"}`}
            >
              {x === "rezumat" ? "Statistici" : "Generator de linkuri"}
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
              <Camp eticheta="De la" id="f-de">
                <input id="f-de" type="date" name="de" defaultValue={f.de} max={ziuaRoJs(0)} className={campClasa} />
              </Camp>
              <Camp eticheta="Până la" id="f-pana">
                <input id="f-pana" type="date" name="pana" defaultValue={f.pana} max={ziuaRoJs(0)} className={campClasa} />
              </Camp>
              <Camp eticheta="Tip de flux" id="f-flux">
                <select id="f-flux" name="flux" defaultValue={f.pageId ? "campanie" : f.flux} className={campClasa}>
                  <option value="toate">Toate fluxurile</option>
                  <option value="campanie">{ETICHETE_FLUX.campanie}</option>
                  <option value="f230">{ETICHETE_FLUX.f230}</option>
                </select>
              </Camp>
              <Camp eticheta="Campanie" id="f-campanie">
                <select id="f-campanie" name="campanie" defaultValue={f.pageId ?? ""} className={`${campClasa} max-w-[240px]`}>
                  <option value="">Toate campaniile</option>
                  {raport.campaniiDisponibile.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.titlu}
                    </option>
                  ))}
                </select>
              </Camp>
              <Camp eticheta="Sursă" id="f-sursa">
                <select id="f-sursa" name="sursa" defaultValue={f.sursa ?? ""} className={campClasa}>
                  <option value="">Toate sursele</option>
                  {raport.opSurse.map((s) => (
                    <option key={s} value={s}>
                      {etichetaSursa(s)}
                    </option>
                  ))}
                </select>
              </Camp>
              <Camp eticheta="Canal" id="f-canal">
                <select id="f-canal" name="canal" defaultValue={f.canal ?? ""} className={campClasa}>
                  <option value="">Toate canalele</option>
                  {CANALE.map((c) => (
                    <option key={c} value={c}>
                      {ETICHETE_CANAL[c]}
                    </option>
                  ))}
                </select>
              </Camp>
              <Camp eticheta="Organic / plătit" id="f-tip">
                <select id="f-tip" name="tip" defaultValue={f.tip ?? ""} className={campClasa}>
                  <option value="">Toate</option>
                  {TIPURI.map((x) => (
                    <option key={x} value={x}>
                      {ETICHETE_TIP[x]}
                    </option>
                  ))}
                </select>
              </Camp>
              <Camp eticheta="Campanie de marketing" id="f-camp">
                <select id="f-camp" name="camp" defaultValue={f.campanieMarketing ?? ""} className={campClasa}>
                  <option value="">Toate</option>
                  {raport.opCampaniiMarketing.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </Camp>
              <Camp eticheta="Model de atribuire" id="f-model">
                <select id="f-model" name="model" defaultValue={f.model} className={campClasa}>
                  {MODELE.map((m) => (
                    <option key={m.cheie} value={m.cheie}>
                      {m.eticheta}
                    </option>
                  ))}
                </select>
              </Camp>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button type="submit" className="h-9 rounded-[var(--ci-radius-btn)] bg-[var(--ci-primary)] px-4 text-[13px] font-semibold text-white hover:bg-[var(--ci-primary-hover)]">
                Aplică filtrele
              </button>
              <span className="text-[12px] text-[var(--ci-text-faint)]">Rapid:</span>
              {PERIOADE_RAPORT.map((p) => (
                <Link key={p.cheie} prefetch={false} href={`${baza}?perioada=${p.cheie}`} className="rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] px-2.5 py-1 text-[12.5px] text-[var(--ci-text-muted)] hover:bg-[var(--ci-surface-2)]">
                  {p.eticheta}
                </Link>
              ))}
              {poateAdministra && (
                <a href={exportHref} className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] px-3 text-[13px] font-medium text-[var(--ci-text)] hover:bg-[var(--ci-surface-2)]">
                  <Download className="h-4 w-4" aria-hidden="true" />
                  Export CSV (filtrele de acum)
                </a>
              )}
            </div>
          </form>

          <div className="flex gap-2.5 rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] bg-[var(--ci-surface-2)] px-4 py-3 text-[12.5px] leading-relaxed text-[var(--ci-text-muted)]">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ci-primary)]" aria-hidden="true" />
            <div>
              <p>
                <strong className="text-[var(--ci-text)]">Statisticile arată traficul observabil</strong>, nu toate vizitele. Perioada: {dataRo(f.de)} – {dataRo(f.pana)} (ora României). Modelul de atribuire: <strong className="text-[var(--ci-text)]">{model.eticheta}</strong>. {model.descriere} Fereastra de atribuire: {raport.fereastraZile} de zile.
              </p>
              <ul className="mt-1.5 list-disc space-y-0.5 pl-5">
                {fara !== null && fara > 0 && <li>{fara.toLocaleString("ro-RO", { maximumFractionDigits: 0 })}% dintre vizitatori nu au dat acordul pentru statistici: ei sunt numărați doar pe zi, fără istoric între vizite.</li>}
                {raport.tipNedeterminatVizitatori !== null && raport.tipNedeterminatVizitatori > 0 && (
                  <li>{raport.tipNedeterminatVizitatori.toLocaleString("ro-RO", { maximumFractionDigits: 0 })}% dintre vizitatori au sursa sau tipul promovării nedeterminat (de exemplu Facebook fără link etichetat sau acces direct). Folosește linkurile din generator ca să afli.</li>
                )}
                {raport.conversiiNeatribuite > 0 && <li>{nr(raport.conversiiNeatribuite)} din {nr(raport.conversiiTotal)} conversii nu au nicio sursă nedirectă în fereastra de atribuire (rămân „Direct”).</li>}
                <li>Blocarea trackingului sau lipsa parametrilor din link pot limita măsurarea. Donațiile și formularele se înregistrează oricum, chiar dacă sursa lor nu se cunoaște.</li>
              </ul>
            </div>
          </div>

          {faraDate ? (
            <EmptyState
              icon={Eye}
              title="Încă nu sunt date în această perioadă"
              description="Trimite oamenii pe linkuri etichetate din „Generator de linkuri”. Vizitele, donațiile confirmate și formularele trimise apar aici pe măsură ce se întâmplă."
              action={
                <Link prefetch={false} href={tabHref("linkuri")} className="rounded-[var(--ci-radius-btn)] bg-[var(--ci-primary)] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[var(--ci-primary-hover)]">
                  Deschide generatorul de linkuri
                </Link>
              }
            />
          ) : (
            <>
              {aratFlux("campanie") && (
                <section aria-labelledby="h-camp" className="space-y-2">
                  <h2 id="h-camp" className="ci-display text-[14px] font-semibold text-[var(--ci-text)]">
                    {ETICHETE_FLUX.campanie}
                  </h2>
                  <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                    <Kpi icon={<Users className="h-3.5 w-3.5" />} eticheta="Vizitatori" valoare={nr(raport.totalCampanie.vizitatori)} nota={`${nr(raport.totalCampanie.sesiuni)} sesiuni`} />
                    <Kpi icon={<HandCoins className="h-3.5 w-3.5" />} eticheta="Donații confirmate" valoare={nr(raport.totalCampanie.donatiiConfirmate)} nota={`din ${nr(raport.totalCampanie.donatiiInitiate)} trimise la plată · ${nr(raport.totalCampanie.donatiiRambursate)} rambursate`} />
                    <Kpi icon={<Users className="h-3.5 w-3.5" />} eticheta="Donatori unici" valoare={nr(raport.totalCampanie.donatoriUnici)} nota="după adresa de email" />
                    <Kpi icon={<Wallet className="h-3.5 w-3.5" />} eticheta="Valoare netă" valoare={formatSuma(raport.totalCampanie.sumaNeta)} nota={`brut ${formatSuma(raport.totalCampanie.sumaBruta)}`} />
                    <Kpi icon={<Percent className="h-3.5 w-3.5" />} eticheta="Rata de conversie" valoare={pct(raport.totalCampanie.donatiiConfirmate, raport.totalCampanie.vizitatori)} nota="donații confirmate ÷ vizitatori" />
                  </div>
                </section>
              )}
              {aratFlux("f230") && !f.pageId && (
                <section aria-labelledby="h-f230" className="space-y-2">
                  <h2 id="h-f230" className="ci-display text-[14px] font-semibold text-[var(--ci-text)]">
                    {ETICHETE_FLUX.f230}
                  </h2>
                  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <Kpi icon={<Users className="h-3.5 w-3.5" />} eticheta="Vizitatori" valoare={nr(raport.totalF230.vizitatori)} nota={`${nr(raport.totalF230.sesiuni)} sesiuni`} />
                    <Kpi icon={<FileSignature className="h-3.5 w-3.5" />} eticheta="Formulare începute" valoare={nr(raport.totalF230.startFormular)} nota="sesiuni cu cel puțin un câmp completat" />
                    <Kpi icon={<FileSignature className="h-3.5 w-3.5" />} eticheta="Formulare trimise" valoare={nr(raport.totalF230.formulareTrimise)} nota="salvate cu succes; nu înseamnă acceptate de ANAF sau încasate" />
                    <Kpi icon={<Percent className="h-3.5 w-3.5" />} eticheta="Rata de finalizare" valoare={pct(raport.totalF230.formulareTrimise, raport.totalF230.startFormular)} nota="trimise ÷ începute" />
                  </div>
                </section>
              )}
              {f.flux === "toate" && !f.pageId && (
                <section aria-labelledby="h-20" className="space-y-2">
                  <h2 id="h-20" className="ci-display text-[14px] font-semibold text-[var(--ci-text)]">
                    {ETICHETE_FLUX.sponsorizare20}
                  </h2>
                  <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                    <Kpi icon={<Users className="h-3.5 w-3.5" />} eticheta="Firme adăugate" valoare={nr(raport.sponsorizare20.companiiAdaugate)} />
                    <Kpi icon={<FileSignature className="h-3.5 w-3.5" />} eticheta="Contracte trimise" valoare={nr(raport.sponsorizare20.contracteTrimise)} />
                    <Kpi icon={<FileSignature className="h-3.5 w-3.5" />} eticheta="Contracte semnate" valoare={nr(raport.sponsorizare20.contracteSemnate)} nota="semnat nu înseamnă încasat" />
                    <Kpi icon={<HandCoins className="h-3.5 w-3.5" />} eticheta="Sponsorizări încasate" valoare={nr(raport.sponsorizare20.sponsorizariIncasate)} />
                    <Kpi icon={<Wallet className="h-3.5 w-3.5" />} eticheta="Sumă efectiv încasată" valoare={formatSuma(raport.sponsorizare20.sumaIncasata)} />
                  </div>
                  <p className="text-[12px] text-[var(--ci-text-muted)]">Acest flux nu are pagini publice: contractele se generează în CRM Companii, deci cifrele vin din evidența CRM și nu au sursă de pe web. Filtrele de sursă nu se aplică.</p>
                </section>
              )}

              <Card>
                <CardHeader title="Promovare organică și plătită" subtitle="Fiecare vizitator și rezultat apare o singură dată, în funcție de modelul ales. „Nedeterminat” = nu se poate stabili dacă a fost reclamă sau postare obișnuită." />
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-[13px]">
                    <thead className="border-b border-[var(--ci-border)] text-[12px] text-[var(--ci-text-muted)]">
                      <tr>
                        <th className={capText}>Tip promovare</th>
                        <th className={capTabel}>Vizitatori</th>
                        <th className={capTabel}>Donații confirmate</th>
                        <th className={capTabel}>Donatori unici</th>
                        <th className={capTabel}>Valoare netă</th>
                        <th className={capTabel}>Formulare 230 trimise</th>
                      </tr>
                    </thead>
                    <tbody>
                      {raport.perTip.map((x) => (
                        <tr key={x.tip} className="border-b border-[var(--ci-border)] last:border-0">
                          <td className="px-3 py-2">
                            <Badge tone={TON_TIP[x.tip]} icon={false}>
                              {ETICHETE_TIP[x.tip]}
                            </Badge>
                          </td>
                          <td className={celula}>{nr(x.vizitatori)}</td>
                          <td className={celula}>{nr(x.donatiiConfirmate)}</td>
                          <td className={celula}>{nr(x.donatoriUnici)}</td>
                          <td className={celula}>{formatSuma(x.sumaNeta)}</td>
                          <td className={celula}>{nr(x.formulareTrimise)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-[12px] text-[var(--ci-text-faint)]">„Organic” include și newsletterele, WhatsApp, QR și site-urile partenere, care au canale proprii în tabelul de mai jos.</p>
              </Card>

              <Card>
                <CardHeader title="Evoluție în timp" subtitle="Vizitatori (linie) și rezultate (bare), pe zile." />
                <GraficEvolutie date={grafic} />
              </Card>

              <Card padded={false}>
                <div className="p-5 pb-3">
                  <CardHeader title="Pe sursă și campanie de marketing" subtitle="Vizitatorii sunt grupați după sursa sesiunii lor; donațiile și formularele, după modelul de atribuire ales." />
                </div>
                {raport.tabel.length === 0 ? (
                  <p className="px-5 pb-5 text-[13px] text-[var(--ci-text-muted)]">Niciun rând pentru filtrele alese.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[1080px] text-[13px]">
                      <thead className="border-y border-[var(--ci-border)] bg-[var(--ci-surface-2)] text-[12px] text-[var(--ci-text-muted)]">
                        <tr>
                          <th className={capText}>Sursă</th>
                          <th className={capText}>Canal</th>
                          <th className={capText}>Tip</th>
                          <th className={capText}>Campanie de marketing</th>
                          <th className={capText}>Conținut</th>
                          <th className={capTabel}>Vizitatori</th>
                          <th className={capTabel}>Clic „Donează”</th>
                          <th className={capTabel}>Donații începute</th>
                          <th className={capTabel}>Donații confirmate</th>
                          <th className={capTabel}>Donatori</th>
                          <th className={capTabel}>Valoare netă</th>
                          <th className={capTabel}>Rată conv.</th>
                          <th className={capTabel}>Formulare începute</th>
                          <th className={capTabel}>Formulare trimise</th>
                          <th className={capTabel}>Rată fin.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {raport.tabel.map((x) => (
                          <tr key={`${x.sursa}|${x.canal}|${x.tip}|${x.campanie}|${x.continut}`} className="border-b border-[var(--ci-border)] last:border-0">
                            <td className="px-3 py-2 font-medium text-[var(--ci-text)]">{etichetaSursa(x.sursa)}</td>
                            <td className="px-3 py-2">
                              <Badge tone={TON_CANAL(x.canal)} icon={false}>
                                {ETICHETE_CANAL[x.canal].replace(" (organic sau plătit nedeterminat)", "")}
                              </Badge>
                            </td>
                            <td className="px-3 py-2">
                              <Badge tone={TON_TIP[x.tip]} icon={false}>
                                {ETICHETE_TIP[x.tip]}
                              </Badge>
                            </td>
                            <td className="px-3 py-2 text-[var(--ci-text-muted)]">{x.campanie || "—"}</td>
                            <td className="px-3 py-2 text-[var(--ci-text-muted)]">{x.continut || "—"}</td>
                            <td className={celula}>{nr(x.vizitatori)}</td>
                            <td className={celula}>{nr(x.clickDoneaza)}</td>
                            <td className={celula}>{nr(x.startDonatie)}</td>
                            <td className={celula}>{nr(x.donatiiConfirmate)}</td>
                            <td className={celula}>{nr(x.donatoriUnici)}</td>
                            <td className={celula}>{formatSuma(x.sumaNeta)}</td>
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
                    <CardHeader title="Pe campanie de strângere de fonduri" />
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[720px] text-[13px]">
                      <thead className="border-y border-[var(--ci-border)] bg-[var(--ci-surface-2)] text-[12px] text-[var(--ci-text-muted)]">
                        <tr>
                          <th className={capText}>Campanie</th>
                          <th className={capTabel}>Vizitatori</th>
                          <th className={capTabel}>Donații confirmate</th>
                          <th className={capTabel}>Donatori</th>
                          <th className={capTabel}>Valoare netă</th>
                          <th className={capTabel}>Rată conv.</th>
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
                            <td className={celula}>{formatSuma(c.sumaNeta)}</td>
                            <td className={celula}>{pct(c.donatiiConfirmate, c.vizitatori)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}

              <Card>
                <CardHeader title="Cost per rezultat" subtitle="Din cheltuielile reale de reclame importate sau sincronizate în „Performanța reclamelor”, legate de campania de marketing prin codul din link." />
                {raport.costuri.length === 0 ? (
                  <p className="text-[13px] text-[var(--ci-text-muted)]">
                    <strong className="text-[var(--ci-text)]">Indisponibil.</strong> Nu există cheltuieli de reclame legate de campaniile de marketing din această perioadă. Fără ele nu se calculează niciun cost per donator, formular sau solicitare.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[560px] text-[13px]">
                      <thead className="border-b border-[var(--ci-border)] text-[12px] text-[var(--ci-text-muted)]">
                        <tr>
                          <th className={capText}>Campanie de marketing</th>
                          <th className={capTabel}>Cheltuit</th>
                          <th className={capTabel}>Donatori</th>
                          <th className={capTabel}>Cost / donator</th>
                          <th className={capTabel}>Formulare 230</th>
                          <th className={capTabel}>Cost / formular</th>
                        </tr>
                      </thead>
                      <tbody>
                        {raport.costuri.map((c) => (
                          <tr key={c.campanie} className="border-b border-[var(--ci-border)] last:border-0">
                            <td className="px-3 py-2 text-[var(--ci-text)]">{c.campanie}</td>
                            <td className={celula}>{formatSuma(c.costLei)}</td>
                            <td className={celula}>{nr(c.donatori)}</td>
                            <td className={celula}>{c.costPerDonator === null ? "Indisponibil" : formatSuma(c.costPerDonator)}</td>
                            <td className={celula}>{nr(c.formulare)}</td>
                            <td className={celula}>{c.costPerFormular === null ? "Indisponibil" : formatSuma(c.costPerFormular)}</td>
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
                    title="Ultimele conversii"
                    subtitle={poateAdministra ? "Deschide istoricul unui vizitator (ID pseudonim) ca să vezi prima vizită, vizitele ulterioare și cum a fost atribuită conversia." : "Istoricul vizitatorilor identificabili e vizibil doar proprietarului și administratorilor."}
                  />
                </div>
                {raport.ultimeleConversii.length === 0 ? (
                  <p className="px-5 pb-5 text-[13px] text-[var(--ci-text-muted)]">Nicio conversie în această perioadă.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[820px] text-[13px]">
                      <thead className="border-y border-[var(--ci-border)] bg-[var(--ci-surface-2)] text-[12px] text-[var(--ci-text-muted)]">
                        <tr>
                          <th className={capText}>Data</th>
                          <th className={capText}>Ce</th>
                          <th className={capText}>Stare</th>
                          <th className={capTabel}>Sumă</th>
                          <th className={capText}>Sursă atribuită</th>
                          <th className={capText}>Tip</th>
                          <th className={capText}>Campanie de marketing</th>
                          {poateAdministra && <th className={capText}>Vizitator</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {raport.ultimeleConversii.map((c, i) => (
                          <tr key={`${c.la}-${i}`} className="border-b border-[var(--ci-border)] last:border-0">
                            <td className="px-3 py-2 whitespace-nowrap text-[var(--ci-text-muted)]">{dataOraRo(c.la)}</td>
                            <td className="px-3 py-2">{c.tip === "f230" ? "Formular 230" : (c.pageTitlu ?? "Donație")}</td>
                            <td className="px-3 py-2 text-[var(--ci-text-muted)]">{STARE[c.stare] ?? c.stare}</td>
                            <td className={celula}>{c.suma !== null ? formatSuma(c.suma) : "—"}</td>
                            <td className="px-3 py-2">
                              {etichetaSursa(c.sursa)} · {ETICHETE_CANAL[c.canal].replace(" (organic sau plătit nedeterminat)", "")}
                            </td>
                            <td className="px-3 py-2">{ETICHETE_TIP[c.tipPromovare]}</td>
                            <td className="px-3 py-2 text-[var(--ci-text-muted)]">{c.campanie || "—"}</td>
                            {poateAdministra && (
                              <td className="px-3 py-2 whitespace-nowrap">
                                {c.vizitatorId && c.persistent ? (
                                  <Link prefetch={false} href={`${baza}/vizitator/${encodeURIComponent(c.vizitatorId)}`} className="font-mono text-[12px] text-[var(--ci-primary)] hover:underline">
                                    {c.vizitatorId.slice(0, 8)}…
                                  </Link>
                                ) : (
                                  <span className="text-[var(--ci-text-faint)]">fără istoric (fără acord)</span>
                                )}
                                {c.donatorId && (
                                  <Link prefetch={false} href={`/${orgSlug}/crm/donatori/reali/${c.donatorId}`} className="ml-2 text-[12px] text-[var(--ci-primary)] hover:underline">
                                    donator
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
            <CardHeader title="Cum se calculează" />
            <dl className="grid gap-x-8 gap-y-2 text-[13px] text-[var(--ci-text-muted)] md:grid-cols-2">
              <Def t="Vizitatori">Vizitatori distincți cu cel puțin o vizită în perioadă. Din surse diferite nu se adună: un vizitator care a venit din două surse apare în ambele rânduri, dar o singură dată în totaluri.</Def>
              <Def t="Donație confirmată">Doar cea confirmată de procesatorul de plată (webhook). Nu o dovedește vizita paginii de mulțumire. Valoarea netă scade rambursările.</Def>
              <Def t="Rata de conversie">Donații confirmate ÷ vizitatori. Fără vizitatori nu există rată („—”).</Def>
              <Def t="Rata de finalizare (F230)">Formulare trimise ÷ formulare începute. „Trimis” înseamnă salvat cu succes, nu acceptat de ANAF și nu bani încasați.</Def>
              <Def t="Donatori unici">Adrese de email distincte ale donațiilor confirmate. Nu se unesc persoane după IP și nu se folosește amprentarea dispozitivului.</Def>
              <Def t="Sume">În lei. Donațiile plătite în altă monedă sunt deja convertite de platformă la cursul zilei donației; nu se adună valute diferite.</Def>
              <Def t="Prima / ultima sursă">„Ultima sursă nedirectă” ignoră o revenire directă și caută în fereastra de atribuire; „prima sursă” e prima vizită observată; „sesiunea conversiei” e sursa vizitei în care s-a făcut donația. Instantaneul se salvează la conversie și nu se mai schimbă.</Def>
              <Def t="Regulile de sursă">UTM întâi; apoi identificatori de reclame care dovedesc plata (gclid etc.; fbclid nu o dovedește); apoi site-ul de proveniență; altfel Direct. Absența UTM nu înseamnă „organic”.</Def>
            </dl>
            {poateAdministra && (
              <div className="mt-4 border-t border-[var(--ci-border)] pt-4">
                <FereastraAtribuire orgSlug={orgSlug} initiala={raport.fereastraZile} />
              </div>
            )}
          </Card>
          <p className="text-[11.5px] text-[var(--ci-text-faint)]">{orgNume} · evenimentele de trafic se păstrează 13 luni.</p>
        </>
      )}
    </div>
  );
}

const STARE: Record<string, string> = { reusita: "Confirmată", in_asteptare: "În așteptare", esuata: "Eșuată", rambursata: "Rambursată", trimis: "Trimis" };
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

