import { BarChart3, Eye, HandCoins, MousePointerClick, Percent, Users, Wallet } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { caleCampanie } from "@/lib/link-campanie";

import { Breadcrumb } from "../components/ui/breadcrumb";
import { Card, CardHeader } from "../components/ui/card";
import { EmptyState } from "../components/ui/states";
import { formatSuma } from "../lib/format";
import { GraficeTrafic, type PunctZi } from "./grafice";
import type { incarcaStatistici } from "./queries";

export const PERIOADE = [
  { zile: 7, eticheta: "7 zile" },
  { zile: 30, eticheta: "30 de zile" },
  { zile: 90, eticheta: "90 de zile" },
  { zile: 365, eticheta: "12 luni" },
] as const;

const SURSE: Record<string, string> = {
  direct: "Direct (link scris sau copiat, aplicații de mesagerie)",
  social: "Rețele sociale",
  cautare: "Căutare (Google, Bing…)",
  email: "E-mail și newslettere",
  site: "Site-ul Alexandrit",
  trimitere: "Alte site-uri",
};
const DISPOZITIVE: Record<string, string> = { mobil: "Telefon", tableta: "Tabletă", desktop: "Calculator" };
const TARI: Record<string, string> = { RO: "România", MD: "Moldova", DE: "Germania", GB: "Marea Britanie", IT: "Italia", ES: "Spania", FR: "Franța", US: "SUA", AT: "Austria", BE: "Belgia", NL: "Țările de Jos", IE: "Irlanda" };

type Agregat = { vizitatori: number; vizualizari: number; deschideri: number };

// Fiecare zi din perioadă apare în grafic, chiar și fără trafic (altfel linia ar sări peste zilele goale).
function zileDinPerioada(zile: number): string[] {
  const azi = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Bucharest", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const [a, l, z] = azi.split("-").map(Number);
  const baza = Date.UTC(a!, l! - 1, z!);
  return Array.from({ length: zile }, (_, i) => new Date(baza - (zile - 1 - i) * 86_400_000).toISOString().slice(0, 10));
}

const pct = (a: number, b: number) => (b > 0 ? `${((a / b) * 100).toLocaleString("ro-RO", { maximumFractionDigits: 1 })}%` : "—");
const nr = (n: number) => n.toLocaleString("ro-RO");
const dataRo = (iso: string) => iso.split("-").reverse().join(".");

function Kpi({ icon, eticheta, valoare, nota }: { icon: ReactNode; eticheta: string; valoare: string; nota?: string }) {
  return (
    <Card>
      <p className="flex items-center gap-1.5 text-[12px] text-[var(--ci-text-muted)]">
        <span className="text-[var(--ci-primary)]" aria-hidden="true">{icon}</span>
        {eticheta}
      </p>
      <p className="ci-tabular mt-1 text-xl font-bold text-[var(--ci-text)]">{valoare}</p>
      {nota && <p className="mt-0.5 text-[11.5px] text-[var(--ci-text-faint)]">{nota}</p>}
    </Card>
  );
}

function Bare({ randuri, gol }: { randuri: { eticheta: string; valoare: number; nota?: string }[]; gol: string }) {
  const max = Math.max(1, ...randuri.map((r) => r.valoare));
  const total = randuri.reduce((s, r) => s + r.valoare, 0);
  if (randuri.length === 0) return <p className="text-[13px] text-[var(--ci-text-muted)]">{gol}</p>;
  return (
    <ul className="space-y-2.5">
      {randuri.map((r) => (
        <li key={r.eticheta}>
          <div className="flex items-baseline justify-between gap-3 text-[13px]">
            <span className="min-w-0 truncate text-[var(--ci-text)]">{r.eticheta}</span>
            <span className="ci-tabular shrink-0 text-[var(--ci-text-muted)]">
              {nr(r.valoare)} · {pct(r.valoare, total)}
              {r.nota ? ` · ${r.nota}` : ""}
            </span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--ci-surface-2)]">
            <div className="h-full rounded-full bg-[var(--ci-primary)]" style={{ width: `${Math.max(3, (r.valoare / max) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export type DateStatistici = Awaited<ReturnType<typeof incarcaStatistici>>;

export function StatisticiVedere({ orgSlug, zile, d, campanieId = null }: { orgSlug: string; zile: number; d: DateStatistici; campanieId?: string | null }) {
  const campanie = d.pagini.find((p) => p.id === campanieId) ?? null;
  const sufixCampanie = campanie ? `&campanie=${campanie.id}` : "";
  const gv = d.global.find((g) => g.tip === "vizita") ?? { vizualizari: 0, unici: 0 };
  const gd = d.global.find((g) => g.tip === "deschide_donatia") ?? { vizualizari: 0, unici: 0 };
  const vizitatori = gv.unici;
  const deschideri = gd.unici;

  const incepeMasurarea = d.prima;
  const startPerioada = zileDinPerioada(zile)[0]!;
  const masuratPartial = !incepeMasurarea || incepeMasurarea > startPerioada;

  // Rata de conversie se calculează doar pe donațiile din zilele în care traficul era deja măsurat, ca raportul să fie corect.
  const donMasurate = d.donZilnic.filter((x) => incepeMasurarea && x.ziua >= incepeMasurarea).reduce((s, x) => s + x.donatii, 0);

  const zileGrafic = zileDinPerioada(zile);
  const vizitatoriPeZi = new Map(d.zilnic.map((z) => [z.ziua, z.unici]));
  const donPeZi = new Map(d.donZilnic.map((z) => [z.ziua, z]));
  const grafic: PunctZi[] = zileGrafic.map((z) => ({ zi: z, vizitatori: vizitatoriPeZi.get(z) ?? 0, donatii: donPeZi.get(z)?.donatii ?? 0, venituri: donPeZi.get(z)?.venituri ?? 0 }));

  const agreg = (pageId: string): Agregat => {
    const v = d.perPagina.find((x) => x.pageId === pageId && x.tip === "vizita");
    const o = d.perPagina.find((x) => x.pageId === pageId && x.tip === "deschide_donatia");
    return { vizitatori: v?.unici ?? 0, vizualizari: v?.vizualizari ?? 0, deschideri: o?.unici ?? 0 };
  };
  const randuriCampanii = d.pagini
    .map((p) => {
      const a = agreg(p.id);
      const don = d.donPerPagina.find((x) => x.pageId === p.id);
      return { ...p, ...a, donatii: don?.donatii ?? 0, venituri: don?.venituri ?? 0 };
    })
    .filter((r) => r.vizitatori > 0 || r.donatii > 0)
    .sort((a, b) => b.vizitatori - a.vizitatori || b.venituri - a.venituri);

  const faraDate = vizitatori === 0 && d.donGlobal.donatii === 0;

  return (
    <div className="mx-auto max-w-[1100px] space-y-5">
      <Breadcrumb items={[{ label: "Strângere de fonduri", href: `/${orgSlug}/crm/strangere-fonduri` }, { label: "Statistici campanii" }]} />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">{campanie ? campanie.titlu : "Statistici campanii"}</h1>
          <p className="mt-0.5 text-[13px] text-[var(--ci-text-muted)]">
            {campanie ? "Statisticile acestei campanii: câți oameni o văd, de unde vin și câți donează." : "Câți oameni îți văd campaniile, de unde vin și câți donează."}
          </p>
        </div>
        <nav aria-label="Perioadă" className="flex gap-1 rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] bg-[var(--ci-surface)] p-1">
          {PERIOADE.map((p) => (
            <Link
              key={p.zile}
              prefetch={false}
              href={`/${orgSlug}/crm/statistici-campanii?zile=${p.zile}${sufixCampanie}`}
              aria-current={p.zile === zile ? "page" : undefined}
              className={`rounded-[calc(var(--ci-radius-btn)-2px)] px-3 py-1.5 text-[13px] font-medium transition ${
                p.zile === zile ? "bg-[var(--ci-primary)] text-white" : "text-[var(--ci-text-muted)] hover:bg-[var(--ci-surface-2)] hover:text-[var(--ci-text)]"
              }`}
            >
              {p.eticheta}
            </Link>
          ))}
        </nav>
      </div>

      {d.pagini.length > 1 && (
        <form method="get" className="flex flex-wrap items-center gap-2 text-[13px]">
          <input type="hidden" name="zile" value={zile} />
          <label htmlFor="campanie" className="text-[var(--ci-text-muted)]">
            Campania:
          </label>
          <select id="campanie" name="campanie" defaultValue={campanie?.id ?? ""} className="max-w-[320px] rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] bg-[var(--ci-surface)] px-2.5 py-1.5 text-[13px] text-[var(--ci-text)]">
            <option value="">Toate campaniile</option>
            {d.pagini.map((p) => (
              <option key={p.id} value={p.id}>
                {p.titlu}
              </option>
            ))}
          </select>
          <button type="submit" className="rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] bg-[var(--ci-surface)] px-3 py-1.5 font-medium text-[var(--ci-text)] hover:bg-[var(--ci-surface-2)]">
            Afișează
          </button>
          {campanie && (
            <Link prefetch={false} href={`/${orgSlug}/crm/statistici-campanii?zile=${zile}`} className="font-medium text-[var(--ci-primary)] hover:underline">
              Toate campaniile
            </Link>
          )}
        </form>
      )}

      <div className="rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] bg-[var(--ci-surface-2)] px-4 py-3 text-[12.5px] leading-relaxed text-[var(--ci-text-muted)]">
        {incepeMasurarea ? (
          <>
            Alexandrit măsoară traficul paginilor tale de campanie începând cu <b className="text-[var(--ci-text)]">{dataRo(incepeMasurarea)}</b>.
            {masuratPartial && " Pentru perioada aleasă, vizitatorii dinainte de această dată nu sunt incluși, dar donațiile și veniturile sunt complete."}
          </>
        ) : (
          <>Măsurarea traficului a pornit acum: vizitatorii apar aici după prima vizită pe o pagină de campanie. Donațiile și veniturile sunt afișate complet.</>
        )}{" "}
        Măsurarea nu folosește cookie-uri și nu păstrează adresa IP; fiecare vizitator unic se numără o singură dată pe zi, iar vizitele echipei tale (cu cont autentificat) și ale roboților sunt excluse.
      </div>

      {faraDate ? (
        <EmptyState
          icon={BarChart3}
          title="Încă nu sunt date pentru această perioadă"
          description="Distribuie linkul unei campanii. După primele vizite și donații, aici vezi traficul, sursele și veniturile."
          action={
            <Link prefetch={false} href={`/${orgSlug}/crm/strangere-fonduri`} className="text-[13px] font-medium text-[var(--ci-primary)] hover:underline">
              Mergi la campanii →
            </Link>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <Kpi icon={<Users className="h-3.5 w-3.5" />} eticheta="Vizitatori unici" valoare={nr(vizitatori)} nota="o dată pe zi" />
            <Kpi icon={<Eye className="h-3.5 w-3.5" />} eticheta="Vizualizări" valoare={nr(gv.vizualizari)} />
            <Kpi icon={<HandCoins className="h-3.5 w-3.5" />} eticheta="Donații" valoare={nr(d.donGlobal.donatii)} nota={d.donGlobal.recurente > 0 ? `${nr(d.donGlobal.recurente)} lunare` : undefined} />
            <Kpi icon={<Percent className="h-3.5 w-3.5" />} eticheta="Rată de conversie" valoare={pct(donMasurate, vizitatori)} nota="donații / vizitatori" />
            <Kpi icon={<Wallet className="h-3.5 w-3.5" />} eticheta="Venituri" valoare={formatSuma(d.donGlobal.venituri)} nota="după rambursări" />
            <Kpi icon={<MousePointerClick className="h-3.5 w-3.5" />} eticheta="Donație medie" valoare={d.donGlobal.donatii > 0 ? formatSuma(Math.round(d.donGlobal.venituri / d.donGlobal.donatii)) : "—"} />
          </div>

          <Card>
            <CardHeader title="Drumul spre donație" subtitle="Din câți oameni ajung pe pagină, câți deschid formularul și câți donează." />
            <div className="space-y-3">
              {[
                { eticheta: "Au vizitat o pagină de campanie", valoare: vizitatori, nota: "100%" },
                { eticheta: "Au deschis formularul de donație", valoare: deschideri, nota: `${pct(deschideri, vizitatori)} dintre vizitatori` },
                { eticheta: "Au donat", valoare: donMasurate, nota: `${pct(donMasurate, deschideri)} dintre cei care au deschis formularul` },
              ].map((p) => (
                <div key={p.eticheta}>
                  <div className="flex items-baseline justify-between gap-3 text-[13px]">
                    <span className="text-[var(--ci-text)]">{p.eticheta}</span>
                    <span className="ci-tabular text-[var(--ci-text-muted)]">
                      <b className="text-[var(--ci-text)]">{nr(p.valoare)}</b> · {p.nota}
                    </span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-[var(--ci-surface-2)]">
                    <div className="h-full rounded-full bg-[var(--ci-primary)]" style={{ width: `${vizitatori > 0 ? Math.max(2, Math.min(100, (p.valoare / vizitatori) * 100)) : 0}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="Trafic și venituri pe zile" />
            <GraficeTrafic date={grafic} />
          </Card>

          {!campanie && (
          <Card padded={false}>
            <div className="p-5 pb-3">
              <CardHeader title="Pe campanii" subtitle="Doar campaniile cu vizite sau donații în perioada aleasă." />
            </div>
            {randuriCampanii.length === 0 ? (
              <p className="px-5 pb-5 text-[13px] text-[var(--ci-text-muted)]">Nicio campanie nu are vizite sau donații în această perioadă.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-[13px]">
                  <thead>
                    <tr className="border-y border-[var(--ci-border)] bg-[var(--ci-surface-2)] text-left text-[12px] text-[var(--ci-text-muted)]">
                      <th className="px-5 py-2 font-medium">Campanie</th>
                      <th className="px-3 py-2 text-right font-medium">Vizitatori</th>
                      <th className="px-3 py-2 text-right font-medium">Deschid formularul</th>
                      <th className="px-3 py-2 text-right font-medium">Donații</th>
                      <th className="px-3 py-2 text-right font-medium">Conversie</th>
                      <th className="px-3 py-2 text-right font-medium">Venituri</th>
                      <th className="px-5 py-2 text-right font-medium">Donație medie</th>
                    </tr>
                  </thead>
                  <tbody>
                    {randuriCampanii.map((r) => (
                      <tr key={r.id} className="border-b border-[var(--ci-border)] last:border-0">
                        <td className="px-5 py-2.5">
                          <a href={caleCampanie(orgSlug, r.slug)} target="_blank" rel="noopener noreferrer" className="font-medium text-[var(--ci-text)] hover:text-[var(--ci-primary)] hover:underline">
                            {r.titlu}
                          </a>
                          {r.status !== "activa" && <span className="ml-2 text-[11.5px] text-[var(--ci-text-faint)]">(închisă)</span>}
                        </td>
                        <td className="ci-tabular px-3 py-2.5 text-right">{nr(r.vizitatori)}</td>
                        <td className="ci-tabular px-3 py-2.5 text-right">{nr(r.deschideri)}</td>
                        <td className="ci-tabular px-3 py-2.5 text-right">{nr(r.donatii)}</td>
                        <td className="ci-tabular px-3 py-2.5 text-right">{pct(r.donatii, r.vizitatori)}</td>
                        <td className="ci-tabular px-3 py-2.5 text-right font-medium">{formatSuma(r.venituri)}</td>
                        <td className="ci-tabular px-5 py-2.5 text-right">{r.donatii > 0 ? formatSuma(Math.round(r.venituri / r.donatii)) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
          )}

          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader title="De unde vin vizitatorii" />
              <Bare randuri={d.surse.map((s) => ({ eticheta: SURSE[s.sursa] ?? s.sursa, valoare: s.unici })).sort((a, b) => b.valoare - a.valoare)} gol="Încă nu sunt vizitatori în această perioadă." />
              {d.sursaDetalii.length > 0 && (
                <div className="mt-5 border-t border-[var(--ci-border)] pt-4">
                  <p className="mb-2 text-[12px] font-medium text-[var(--ci-text-muted)]">Cele mai frecvente adrese și etichete</p>
                  <Bare randuri={d.sursaDetalii.map((s) => ({ eticheta: s.detaliu ?? "", valoare: s.unici }))} gol="" />
                </div>
              )}
            </Card>
            <Card>
              <CardHeader title="Campanii de promovare (după etichetă)" subtitle="Din linkurile cu parametri utm_campaign și utm_source, ca să vezi ce postare sau ce mesaj aduce donații." />
              <Bare randuri={d.utm.map((s) => ({ eticheta: s.utm ?? "", valoare: s.unici }))} gol="Nicio etichetă încă. Adaugă la linkul campaniei, de exemplu: ?utm_source=facebook&utm_campaign=numele-postarii" />
              {d.donSursa.length > 0 && (
                <div className="mt-5 border-t border-[var(--ci-border)] pt-4">
                  <p className="mb-2 text-[12px] font-medium text-[var(--ci-text-muted)]">Donații după etichetă (număr · venituri)</p>
                  <ul className="space-y-1.5 text-[13px]">
                    {d.donSursa.map((s) => (
                      <li key={s.sursa} className="flex justify-between gap-3">
                        <span className="min-w-0 truncate text-[var(--ci-text)]">{s.sursa}</span>
                        <span className="ci-tabular shrink-0 text-[var(--ci-text-muted)]">
                          {nr(s.donatii)} · {formatSuma(s.venituri)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
            <Card>
              <CardHeader title="Dispozitive" />
              <Bare randuri={d.dispozitive.map((s) => ({ eticheta: DISPOZITIVE[s.dispozitiv] ?? s.dispozitiv, valoare: s.unici })).sort((a, b) => b.valoare - a.valoare)} gol="Încă nu sunt vizitatori în această perioadă." />
            </Card>
            <Card>
              <CardHeader title="Țări" subtitle="După locul din care se conectează vizitatorii." />
              <Bare randuri={d.tari.map((s) => ({ eticheta: TARI[s.tara ?? ""] ?? s.tara ?? "", valoare: s.unici }))} gol="Țările apar după primele vizite pe site-ul publicat." />
            </Card>
          </div>

          <p className="text-[12px] leading-relaxed text-[var(--ci-text-faint)]">
            Nu măsurăm vârsta, genul sau interesele vizitatorilor: Alexandrit nu folosește cookie-uri de urmărire, deci aceste date nu există. „Vizitatori unici” înseamnă persoane diferite într-o zi; același om care revine în zile diferite se numără în fiecare zi.
          </p>
        </>
      )}
    </div>
  );
}

