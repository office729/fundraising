import { BarChart3, Eye, HandCoins, MousePointerClick, Percent, Users, Wallet } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import type { Locale } from "@/lib/i18n/config";
import { STATISTICI_CAMPANII_UI_DICT } from "@/lib/i18n/dictionaries/statistici-campanii-ui";
import { caleCampanie } from "@/lib/link-campanie";

import { Breadcrumb } from "../components/ui/breadcrumb";
import { Card, CardHeader } from "../components/ui/card";
import { EmptyState } from "../components/ui/states";
import { formatSuma } from "../lib/format";
import { GraficeTrafic, type PunctZi } from "./grafice";
import type { incarcaStatistici } from "./queries";

// Etichetele perioadelor sunt în dicționar (STATISTICI_CAMPANII_UI_DICT.perioade), după număr de zile.
export const PERIOADE = [{ zile: 7 }, { zile: 30 }, { zile: 90 }, { zile: 365 }] as const;

type Agregat = { vizitatori: number; vizualizari: number; deschideri: number };

// Fiecare zi din perioadă apare în grafic, chiar și fără trafic (altfel linia ar sări peste zilele goale).
function zileDinPerioada(zile: number): string[] {
  const azi = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Bucharest", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const [a, l, z] = azi.split("-").map(Number);
  const baza = Date.UTC(a!, l! - 1, z!);
  return Array.from({ length: zile }, (_, i) => new Date(baza - (zile - 1 - i) * 86_400_000).toISOString().slice(0, 10));
}

type Format = { pct: (a: number, b: number) => string; nr: (n: number) => string };
const formatari = (locale: Locale): Format => {
  const loc = locale === "ro" ? "ro-RO" : "en-GB";
  return {
    pct: (a, b) => (b > 0 ? `${((a / b) * 100).toLocaleString(loc, { maximumFractionDigits: 1 })}%` : "—"),
    nr: (n) => n.toLocaleString(loc),
  };
};
// „2026-10-31” → „31.10.2026” (română) sau „31 Oct 2026” (engleză).
const dataLocala = (iso: string, locale: Locale) =>
  locale === "ro" ? iso.split("-").reverse().join(".") : new Date(`${iso}T12:00:00`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

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

function Bare({ randuri, gol, f }: { randuri: { eticheta: string; valoare: number; nota?: string }[]; gol: string; f: Format }) {
  const { pct, nr } = f;
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

export function StatisticiVedere({ orgSlug, locale, zile, d, campanieId = null }: { orgSlug: string; locale: Locale; zile: number; d: DateStatistici; campanieId?: string | null }) {
  const t = STATISTICI_CAMPANII_UI_DICT[locale];
  const f = formatari(locale);
  const { pct, nr } = f;
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
      <Breadcrumb items={[{ label: t.breadcrumbParinte, href: `/${orgSlug}/crm/strangere-fonduri` }, { label: t.title }]} />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">{campanie ? campanie.titlu : t.title}</h1>
          <p className="mt-0.5 text-[13px] text-[var(--ci-text-muted)]">
            {campanie ? t.subtitleCampanie : t.subtitleToate}
          </p>
        </div>
        <nav aria-label={t.perioadaAria} className="flex gap-1 rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] bg-[var(--ci-surface)] p-1">
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
              {t.perioade[p.zile]}
            </Link>
          ))}
        </nav>
      </div>

      {d.pagini.length > 1 && (
        <form method="get" className="flex flex-wrap items-center gap-2 text-[13px]">
          <input type="hidden" name="zile" value={zile} />
          <label htmlFor="campanie" className="text-[var(--ci-text-muted)]">
            {t.filtru.campania}
          </label>
          <select id="campanie" name="campanie" defaultValue={campanie?.id ?? ""} className="max-w-[320px] rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] bg-[var(--ci-surface)] px-2.5 py-1.5 text-[13px] text-[var(--ci-text)]">
            <option value="">{t.filtru.toate}</option>
            {d.pagini.map((p) => (
              <option key={p.id} value={p.id}>
                {p.titlu}
              </option>
            ))}
          </select>
          <button type="submit" className="rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] bg-[var(--ci-surface)] px-3 py-1.5 font-medium text-[var(--ci-text)] hover:bg-[var(--ci-surface-2)]">
            {t.filtru.afiseaza}
          </button>
          {campanie && (
            <Link prefetch={false} href={`/${orgSlug}/crm/statistici-campanii?zile=${zile}`} className="font-medium text-[var(--ci-primary)] hover:underline">
              {t.filtru.toate}
            </Link>
          )}
        </form>
      )}

      <div className="rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] bg-[var(--ci-surface-2)] px-4 py-3 text-[12.5px] leading-relaxed text-[var(--ci-text-muted)]">
        {incepeMasurarea ? (
          <>
            {t.masurare.incepe} <b className="text-[var(--ci-text)]">{dataLocala(incepeMasurarea, locale)}</b>.
            {masuratPartial && ` ${t.masurare.partial}`}
          </>
        ) : (
          <>{t.masurare.pornit}</>
        )}{" "}
        {t.masurare.confidentialitate}
      </div>

      {faraDate ? (
        <EmptyState
          icon={BarChart3}
          title={t.gol.title}
          description={t.gol.description}
          action={
            <Link prefetch={false} href={`/${orgSlug}/crm/strangere-fonduri`} className="text-[13px] font-medium text-[var(--ci-primary)] hover:underline">
              {t.gol.actiune}
            </Link>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <Kpi icon={<Users className="h-3.5 w-3.5" />} eticheta={t.kpi.vizitatoriUnici} valoare={nr(vizitatori)} nota={t.kpi.oDataPeZi} />
            <Kpi icon={<Eye className="h-3.5 w-3.5" />} eticheta={t.kpi.vizualizari} valoare={nr(gv.vizualizari)} />
            <Kpi icon={<HandCoins className="h-3.5 w-3.5" />} eticheta={t.kpi.donatii} valoare={nr(d.donGlobal.donatii)} nota={d.donGlobal.recurente > 0 ? `${nr(d.donGlobal.recurente)} ${t.kpi.lunare}` : undefined} />
            <Kpi icon={<Percent className="h-3.5 w-3.5" />} eticheta={t.kpi.rataConversie} valoare={pct(donMasurate, vizitatori)} nota={t.kpi.donatiiVizitatori} />
            <Kpi icon={<Wallet className="h-3.5 w-3.5" />} eticheta={t.kpi.venituri} valoare={formatSuma(d.donGlobal.venituri, "RON", locale)} nota={t.kpi.dupaRambursari} />
            <Kpi icon={<MousePointerClick className="h-3.5 w-3.5" />} eticheta={t.kpi.donatieMedie} valoare={d.donGlobal.donatii > 0 ? formatSuma(Math.round(d.donGlobal.venituri / d.donGlobal.donatii), "RON", locale) : "—"} />
          </div>

          <Card>
            <CardHeader title={t.drum.title} subtitle={t.drum.subtitle} />
            <div className="space-y-3">
              {[
                { eticheta: t.drum.vizitat, valoare: vizitatori, nota: "100%" },
                { eticheta: t.drum.deschis, valoare: deschideri, nota: `${pct(deschideri, vizitatori)} ${t.drum.dintreVizitatori}` },
                { eticheta: t.drum.donat, valoare: donMasurate, nota: `${pct(donMasurate, deschideri)} ${t.drum.dintreCeiCareAuDeschis}` },
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
            <CardHeader title={t.grafic.title} />
            <GraficeTrafic date={grafic} />
          </Card>

          {!campanie && (
          <Card padded={false}>
            <div className="p-5 pb-3">
              <CardHeader title={t.pePagini.title} subtitle={t.pePagini.subtitle} />
            </div>
            {randuriCampanii.length === 0 ? (
              <p className="px-5 pb-5 text-[13px] text-[var(--ci-text-muted)]">{t.pePagini.gol}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-[13px]">
                  <thead>
                    <tr className="border-y border-[var(--ci-border)] bg-[var(--ci-surface-2)] text-left text-[12px] text-[var(--ci-text-muted)]">
                      <th className="px-5 py-2 font-medium">{t.pePagini.campanie}</th>
                      <th className="px-3 py-2 text-right font-medium">{t.pePagini.vizitatori}</th>
                      <th className="px-3 py-2 text-right font-medium">{t.pePagini.deschidFormularul}</th>
                      <th className="px-3 py-2 text-right font-medium">{t.pePagini.donatii}</th>
                      <th className="px-3 py-2 text-right font-medium">{t.pePagini.conversie}</th>
                      <th className="px-3 py-2 text-right font-medium">{t.pePagini.venituri}</th>
                      <th className="px-5 py-2 text-right font-medium">{t.pePagini.donatieMedie}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {randuriCampanii.map((r) => (
                      <tr key={r.id} className="border-b border-[var(--ci-border)] last:border-0">
                        <td className="px-5 py-2.5">
                          <a href={caleCampanie(orgSlug, r.slug)} target="_blank" rel="noopener noreferrer" className="font-medium text-[var(--ci-text)] hover:text-[var(--ci-primary)] hover:underline">
                            {r.titlu}
                          </a>
                          {r.status !== "activa" && <span className="ml-2 text-[11.5px] text-[var(--ci-text-faint)]">{t.pePagini.inchisa}</span>}
                        </td>
                        <td className="ci-tabular px-3 py-2.5 text-right">{nr(r.vizitatori)}</td>
                        <td className="ci-tabular px-3 py-2.5 text-right">{nr(r.deschideri)}</td>
                        <td className="ci-tabular px-3 py-2.5 text-right">{nr(r.donatii)}</td>
                        <td className="ci-tabular px-3 py-2.5 text-right">{pct(r.donatii, r.vizitatori)}</td>
                        <td className="ci-tabular px-3 py-2.5 text-right font-medium">{formatSuma(r.venituri, "RON", locale)}</td>
                        <td className="ci-tabular px-5 py-2.5 text-right">{r.donatii > 0 ? formatSuma(Math.round(r.venituri / r.donatii), "RON", locale) : "—"}</td>
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
              <CardHeader title={t.surse.title} />
              <Bare f={f} randuri={d.surse.map((s) => ({ eticheta: t.surse.etichete[s.sursa] ?? s.sursa, valoare: s.unici })).sort((a, b) => b.valoare - a.valoare)} gol={t.surse.goalVizitatori} />
              {d.sursaDetalii.length > 0 && (
                <div className="mt-5 border-t border-[var(--ci-border)] pt-4">
                  <p className="mb-2 text-[12px] font-medium text-[var(--ci-text-muted)]">{t.surse.celeMaiFrecvente}</p>
                  <Bare f={f} randuri={d.sursaDetalii.map((s) => ({ eticheta: s.detaliu ?? "", valoare: s.unici }))} gol="" />
                </div>
              )}
            </Card>
            <Card>
              <CardHeader title={t.utm.title} subtitle={t.utm.subtitle} />
              <Bare f={f} randuri={d.utm.map((s) => ({ eticheta: s.utm ?? "", valoare: s.unici }))} gol={t.utm.gol} />
              {d.donSursa.length > 0 && (
                <div className="mt-5 border-t border-[var(--ci-border)] pt-4">
                  <p className="mb-2 text-[12px] font-medium text-[var(--ci-text-muted)]">{t.utm.donatiiDupaEticheta}</p>
                  <ul className="space-y-1.5 text-[13px]">
                    {d.donSursa.map((s) => (
                      <li key={s.sursa} className="flex justify-between gap-3">
                        <span className="min-w-0 truncate text-[var(--ci-text)]">{s.sursa}</span>
                        <span className="ci-tabular shrink-0 text-[var(--ci-text-muted)]">
                          {nr(s.donatii)} · {formatSuma(s.venituri, "RON", locale)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
            <Card>
              <CardHeader title={t.dispozitive.title} />
              <Bare f={f} randuri={d.dispozitive.map((s) => ({ eticheta: t.dispozitive.etichete[s.dispozitiv] ?? s.dispozitiv, valoare: s.unici })).sort((a, b) => b.valoare - a.valoare)} gol={t.surse.goalVizitatori} />
            </Card>
            <Card>
              <CardHeader title={t.tari.title} subtitle={t.tari.subtitle} />
              <Bare f={f} randuri={d.tari.map((s) => ({ eticheta: t.tari.nume[s.tara ?? ""] ?? s.tara ?? "", valoare: s.unici }))} gol={t.tari.gol} />
            </Card>
          </div>

          <p className="text-[12px] leading-relaxed text-[var(--ci-text-faint)]">
            {t.nota}
          </p>
        </>
      )}
    </div>
  );
}

