import { AlertTriangle, ChevronLeft, ChevronRight, HelpCircle, Info, Radar, X } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import type { Locale } from "@/lib/i18n/config";
import { SURSE_DONATII_UI_DICT } from "@/lib/i18n/dictionaries/surse-donatii-ui";
import { CATEGORII, esteCategorieSursa, etichetaSursa } from "@/lib/surse-donatii/nucleu";
import type { RaportComplet } from "@/lib/surse-donatii/raport";
import { formatEur, formatProcent, parametriUrl, presetari, valoareCampanie, type FiltreSurse } from "@/lib/surse-donatii/raport-reguli";

import { Breadcrumb } from "../components/ui/breadcrumb";
import { Card, CardHeader } from "../components/ui/card";
import { EmptyState } from "../components/ui/states";
import { formatDataOra } from "../lib/format";

const campClasa = "h-9 w-full rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] bg-[var(--ci-surface)] px-2.5 text-[13px] text-[var(--ci-text)]";
const capText = "px-3 py-2 text-left font-medium";
const capNr = "px-3 py-2 text-right font-medium";
const celNr = "px-3 py-2 text-right ci-tabular whitespace-nowrap";

function Camp({ eticheta, id, children }: { eticheta: string; id: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-1 block text-[12px] font-medium text-[var(--ci-text-muted)]">
        {eticheta}
      </label>
      {children}
    </div>
  );
}

export function SurseDonatiiVedere({ locale, orgSlug, filtre: f, date, azi }: { locale: Locale; orgSlug: string; filtre: FiltreSurse; date: RaportComplet; azi: string }) {
  const d = SURSE_DONATII_UI_DICT[locale];
  const { raport, campanii, detalii } = date;
  const baza = `/${orgSlug}/crm/surse-donatii`;
  const eur = (c: number) => formatEur(c, locale);
  // Fără nicio donație cu conversie nu avem sumă: „—”, nu 0 EUR.
  const eurN = (c: number | null) => (c === null ? "—" : formatEur(c, locale));
  const sursa = (c: string) => (esteCategorieSursa(c) ? etichetaSursa(c, locale) : c);
  const href = (x: FiltreSurse, ancora = "") => {
    const q = parametriUrl(x).toString();
    return `${baza}${q ? `?${q}` : ""}${ancora}`;
  };
  const filtreActive = Boolean(f.de || f.pana || f.sursa || f.campanie.tip !== "toate");
  const gol = raport.randuri.length === 0;

  // Opțiunile campaniei: valorile existente + „Fără campanie”; o campanie din adresă care nu e în listă se adaugă, ca selecția să nu se piardă.
  const valoareAleasa = valoareCampanie(f.campanie);
  const optiuniCampanie = campanii.map((c) => ({ valoare: valoareCampanie({ tip: "nume", nume: c.eticheta }), eticheta: c.eticheta }));
  const numeAles = f.campanie.tip === "nume" ? f.campanie.nume.toLowerCase() : null;
  if (f.campanie.tip === "nume" && !optiuniCampanie.some((o) => o.eticheta.toLowerCase() === numeAles)) optiuniCampanie.unshift({ valoare: valoareAleasa, eticheta: f.campanie.nume });
  const valoareSelect = (numeAles && optiuniCampanie.find((o) => o.eticheta.toLowerCase() === numeAles)?.valoare) || valoareAleasa;

  return (
    <div className="mx-auto max-w-[1180px] space-y-5">
      <Breadcrumb items={[{ label: d.breadcrumbFonduri, href: `/${orgSlug}/crm/strangere-fonduri` }, { label: d.titlu }]} />

      <div>
        <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">{d.titlu}</h1>
        <p className="mt-1 flex max-w-3xl gap-2 text-[13px] leading-relaxed text-[var(--ci-text-muted)]">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ci-primary)]" aria-hidden="true" />
          <span>{d.explicatie}</span>
        </p>
      </div>

      <form method="get" action={baza} className="space-y-3 rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] bg-[var(--ci-surface)] p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Camp eticheta={d.filtre.de} id="sd-de">
            <input id="sd-de" type="date" name="de" defaultValue={f.de ?? ""} max={azi} className={campClasa} />
          </Camp>
          <Camp eticheta={d.filtre.pana} id="sd-pana">
            <input id="sd-pana" type="date" name="pana" defaultValue={f.pana ?? ""} max={azi} className={campClasa} />
          </Camp>
          <Camp eticheta={d.filtre.sursa} id="sd-sursa">
            <select id="sd-sursa" name="sursa" defaultValue={f.sursa ?? ""} className={campClasa}>
              <option value="">{d.filtre.toateSursele}</option>
              {CATEGORII.map((c) => (
                <option key={c} value={c}>
                  {etichetaSursa(c, locale)}
                </option>
              ))}
            </select>
          </Camp>
          <Camp eticheta={d.filtre.campanie} id="sd-campanie">
            <select id="sd-campanie" name="campanie" defaultValue={valoareSelect} className={campClasa}>
              <option value="">{d.filtre.toateCampaniile}</option>
              <option value="-">{d.filtre.faraCampanie}</option>
              {optiuniCampanie.map((o) => (
                <option key={o.valoare} value={o.valoare}>
                  {o.eticheta}
                </option>
              ))}
            </select>
          </Camp>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="submit" className="h-9 rounded-[var(--ci-radius-btn)] bg-[var(--ci-primary)] px-4 text-[13px] font-semibold text-white hover:bg-[var(--ci-primary-hover)]">
            {d.filtre.aplica}
          </button>
          <span className="text-[12px] text-[var(--ci-text-faint)]">{d.filtre.perioada}</span>
          {presetari(azi).map((p) => {
            const activ = f.de === p.de && f.pana === p.pana;
            return (
              <Link
                key={p.cheie}
                prefetch={false}
                href={href({ ...f, de: p.de, pana: p.pana, detalii: null, pagina: 1 })}
                aria-current={activ ? "true" : undefined}
                className={`rounded-[var(--ci-radius-btn)] border px-2.5 py-1 text-[12.5px] ${activ ? "border-[var(--ci-primary)] bg-[var(--ci-primary-soft)] font-medium text-[var(--ci-text)]" : "border-[var(--ci-border)] text-[var(--ci-text-muted)] hover:bg-[var(--ci-surface-2)]"}`}
              >
                {d.filtre.presetari[p.cheie]}
              </Link>
            );
          })}
        </div>
        <p className="text-[12px] text-[var(--ci-text-faint)]">{d.notaData}</p>
      </form>

      {raport.total.faraConversie > 0 && (
        <div role="note" className="flex gap-2.5 rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] bg-[var(--ci-amber-soft)] px-4 py-3 text-[13px] leading-relaxed text-[var(--ci-text)]">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ci-amber)]" aria-hidden="true" />
          <p>
            <strong>{d.faraConversie(raport.total.faraConversie)}</strong> {d.faraConversieAjutor}
          </p>
        </div>
      )}

      {gol ? (
        <EmptyState
          icon={Radar}
          title={d.gol.titlu}
          description={filtreActive ? d.gol.descriereFiltre : d.gol.descriere}
          action={
            filtreActive ? (
              <Link prefetch={false} href={baza} className="rounded-[var(--ci-radius-btn)] bg-[var(--ci-primary)] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[var(--ci-primary-hover)]">
                {d.gol.sterge}
              </Link>
            ) : undefined
          }
        />
      ) : (
        <Card>
          <CardHeader title={d.tabel.titlu} subtitle={d.tabel.subtitlu} />

          {/* Telefon: câte un card pe sursă (fără scroll orizontal); de la md în sus, tabelul. */}
          <ul className="space-y-3 md:hidden">
            {raport.randuri.map((r) => (
              <li key={r.categorie} className="rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[14px] font-semibold text-[var(--ci-text)]">{sursa(r.categorie)}</p>
                  <p className="ci-tabular text-[13px] font-medium text-[var(--ci-text-muted)]">{formatProcent(r.pondere, locale)}</p>
                </div>
                <dl className="mt-2 grid grid-cols-3 gap-2 text-[12px]">
                  <div>
                    <dt className="text-[var(--ci-text-muted)]">{d.tabel.donatii}</dt>
                    <dd className="ci-tabular text-[13px] font-medium text-[var(--ci-text)]">{r.donatii.toLocaleString(locale === "ro" ? "ro-RO" : "en-GB")}</dd>
                  </div>
                  <div>
                    <dt className="text-[var(--ci-text-muted)]">{d.tabel.total}</dt>
                    <dd className="ci-tabular text-[13px] font-medium text-[var(--ci-text)]">{eurN(r.totalCenti)}</dd>
                  </div>
                  <div>
                    <dt className="text-[var(--ci-text-muted)]">{d.tabel.medie}</dt>
                    <dd className="ci-tabular text-[13px] font-medium text-[var(--ci-text)]">{r.medieCenti === null ? "—" : eur(r.medieCenti)}</dd>
                  </div>
                </dl>
                {r.faraConversie > 0 && <p className="mt-1.5 text-[11.5px] text-[var(--ci-amber)]">{d.tabel.faraConversieRand(r.faraConversie)}</p>}
                <Link prefetch={false} href={href({ ...f, detalii: r.categorie, pagina: 1 }, "#detalii")} className="mt-2 inline-block text-[13px] font-medium text-[var(--ci-primary)] hover:underline">
                  {d.tabel.veziDonatiile}
                </Link>
              </li>
            ))}
            <li className="rounded-[var(--ci-radius-btn)] bg-[var(--ci-surface-2)] p-3">
              <p className="text-[13px] font-semibold text-[var(--ci-text)]">{d.tabel.totalRand}</p>
              <dl className="mt-1 grid grid-cols-3 gap-2 text-[12px]">
                <div>
                  <dt className="text-[var(--ci-text-muted)]">{d.tabel.donatii}</dt>
                  <dd className="ci-tabular text-[13px] font-semibold text-[var(--ci-text)]">{raport.total.donatii.toLocaleString(locale === "ro" ? "ro-RO" : "en-GB")}</dd>
                </div>
                <div>
                  <dt className="text-[var(--ci-text-muted)]">{d.tabel.total}</dt>
                  <dd className="ci-tabular text-[13px] font-semibold text-[var(--ci-text)]">{eurN(raport.total.totalCenti)}</dd>
                </div>
                <div>
                  <dt className="text-[var(--ci-text-muted)]">{d.tabel.medie}</dt>
                  <dd className="ci-tabular text-[13px] font-semibold text-[var(--ci-text)]">{raport.total.medieCenti === null ? "—" : eur(raport.total.medieCenti)}</dd>
                </div>
              </dl>
            </li>
          </ul>

          <div className="hidden md:block">
            <table className="w-full text-[13px]">
              <thead className="border-b border-[var(--ci-border)] text-[12px] text-[var(--ci-text-muted)]">
                <tr>
                  <th scope="col" className={capText}>
                    {d.tabel.sursa}
                  </th>
                  <th scope="col" className={capNr}>
                    {d.tabel.donatii}
                  </th>
                  <th scope="col" className={capNr}>
                    {d.tabel.total}
                  </th>
                  <th scope="col" className={capNr}>
                    {d.tabel.medie}
                  </th>
                  <th scope="col" className={capNr}>
                    {d.tabel.pondere}
                  </th>
                  <th scope="col" className="px-3 py-2">
                    <span className="sr-only">{d.tabel.veziDonatiile}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {raport.randuri.map((r) => (
                  <tr key={r.categorie} className={`border-b border-[var(--ci-border)] ${detalii?.categorie === r.categorie ? "bg-[var(--ci-primary-soft)]" : ""}`}>
                    <th scope="row" className="px-3 py-2 text-left font-medium text-[var(--ci-text)]">
                      {sursa(r.categorie)}
                    </th>
                    <td className={celNr}>
                      {r.donatii.toLocaleString(locale === "ro" ? "ro-RO" : "en-GB")}
                      {r.faraConversie > 0 && <span className="block text-[11px] font-normal text-[var(--ci-amber)]">{d.tabel.faraConversieRand(r.faraConversie)}</span>}
                    </td>
                    <td className={celNr}>{eurN(r.totalCenti)}</td>
                    <td className={celNr}>{r.medieCenti === null ? "—" : eur(r.medieCenti)}</td>
                    <td className={celNr}>{formatProcent(r.pondere, locale)}</td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      <Link prefetch={false} href={href({ ...f, detalii: r.categorie, pagina: 1 }, "#detalii")} className="text-[13px] font-medium text-[var(--ci-primary)] hover:underline">
                        {d.tabel.veziDonatiile}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-[var(--ci-surface-2)] font-semibold text-[var(--ci-text)]">
                  <th scope="row" className="px-3 py-2 text-left">
                    {d.tabel.totalRand}
                  </th>
                  <td className={celNr}>{raport.total.donatii.toLocaleString(locale === "ro" ? "ro-RO" : "en-GB")}</td>
                  <td className={celNr}>{eurN(raport.total.totalCenti)}</td>
                  <td className={celNr}>{raport.total.medieCenti === null ? "—" : eur(raport.total.medieCenti)}</td>
                  <td className={celNr}>{raport.total.totalCenti ? formatProcent(100, locale) : "—"}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      )}

      {detalii && (
        <section id="detalii" aria-labelledby="h-detalii" className="scroll-mt-20">
          <Card>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 id="h-detalii" className="ci-display text-[15px] font-semibold text-[var(--ci-text)]">
                  {d.detalii.titlu(sursa(detalii.categorie))}
                </h2>
                <p className="mt-0.5 text-[13px] text-[var(--ci-text-muted)]">
                  {d.detalii.subtitlu(detalii.total, eurN(raport.randuri.find((r) => r.categorie === detalii.categorie)?.totalCenti ?? null))}
                </p>
              </div>
              <Link prefetch={false} href={href({ ...f, detalii: null, pagina: 1 })} className="inline-flex shrink-0 items-center gap-1 rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] px-2.5 py-1.5 text-[12.5px] text-[var(--ci-text-muted)] hover:bg-[var(--ci-surface-2)]">
                <X className="h-3.5 w-3.5" aria-hidden="true" />
                {d.detalii.inchide}
              </Link>
            </div>

            {detalii.randuri.length === 0 ? (
              <p className="text-[13px] text-[var(--ci-text-muted)]">{d.detalii.gol}</p>
            ) : (
              <>
                <ul className="space-y-2 md:hidden">
                  {detalii.randuri.map((r, i) => (
                    <li key={`${detalii.paginare.offset + i}`} className="rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] p-3 text-[12.5px]">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[var(--ci-text-muted)]">{formatDataOra(r.plataLa, locale)}</span>
                        <span className="ci-tabular font-semibold text-[var(--ci-text)]">{r.sumaEurCenti === null ? d.detalii.indisponibila : eur(r.sumaEurCenti)}</span>
                      </div>
                      <p className="mt-1 text-[var(--ci-text)]">{r.campaniaPublica ?? d.detalii.campanieStearsa}</p>
                      <p className="text-[var(--ci-text-muted)]">
                        {sursa(r.categorie)} · {r.campanieMarketing ?? d.detalii.fara}
                      </p>
                    </li>
                  ))}
                </ul>
                <div className="hidden md:block">
                  <table className="w-full text-[13px]">
                    <thead className="border-b border-[var(--ci-border)] text-[12px] text-[var(--ci-text-muted)]">
                      <tr>
                        <th scope="col" className={capText}>
                          {d.detalii.data}
                        </th>
                        <th scope="col" className={capNr}>
                          {d.detalii.suma}
                        </th>
                        <th scope="col" className={capText}>
                          {d.detalii.campaniaPublica}
                        </th>
                        <th scope="col" className={capText}>
                          {d.detalii.sursa}
                        </th>
                        <th scope="col" className={capText}>
                          {d.detalii.campanieMarketing}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {detalii.randuri.map((r, i) => (
                        <tr key={`${detalii.paginare.offset + i}`} className="border-b border-[var(--ci-border)] last:border-0">
                          <td className="px-3 py-2 whitespace-nowrap text-[var(--ci-text-muted)]">{formatDataOra(r.plataLa, locale)}</td>
                          <td className={celNr}>{r.sumaEurCenti === null ? <span className="text-[var(--ci-amber)]">{d.detalii.indisponibila}</span> : eur(r.sumaEurCenti)}</td>
                          <td className="px-3 py-2 text-[var(--ci-text)]">{r.campaniaPublica ?? d.detalii.campanieStearsa}</td>
                          <td className="px-3 py-2 text-[var(--ci-text)]">{sursa(r.categorie)}</td>
                          <td className="px-3 py-2 text-[var(--ci-text-muted)]">{r.campanieMarketing ?? d.detalii.fara}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {detalii.paginare.pagini > 1 && (
              <nav aria-label={d.detalii.pagina(detalii.paginare.pagina, detalii.paginare.pagini)} className="mt-4 flex items-center justify-between gap-2 text-[13px]">
                {detalii.paginare.pagina > 1 ? (
                  <Link prefetch={false} href={href({ ...f, detalii: detalii.categorie, pagina: detalii.paginare.pagina - 1 }, "#detalii")} className="inline-flex items-center gap-1 rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] px-3 py-1.5 hover:bg-[var(--ci-surface-2)]">
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                    {d.detalii.anterioara}
                  </Link>
                ) : (
                  <span />
                )}
                <span className="text-[var(--ci-text-muted)]">{d.detalii.pagina(detalii.paginare.pagina, detalii.paginare.pagini)}</span>
                {detalii.paginare.pagina < detalii.paginare.pagini ? (
                  <Link prefetch={false} href={href({ ...f, detalii: detalii.categorie, pagina: detalii.paginare.pagina + 1 }, "#detalii")} className="inline-flex items-center gap-1 rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] px-3 py-1.5 hover:bg-[var(--ci-surface-2)]">
                    {d.detalii.urmatoarea}
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                ) : (
                  <span />
                )}
              </nav>
            )}
          </Card>
        </section>
      )}

      {/* Ajutorul: secțiune pliabilă (funcționează și pe telefon, fără JavaScript). Deschisă din start când nu există încă nicio donație cu sursă. */}
      <details id="ajutor" open={gol && !filtreActive} className="group rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] bg-[var(--ci-surface)]">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-[14px] font-semibold text-[var(--ci-text)] [&::-webkit-details-marker]:hidden">
          <HelpCircle className="h-4 w-4 shrink-0 text-[var(--ci-primary)]" aria-hidden="true" />
          <span className="flex-1">{d.ajutor.titlu}</span>
          <ChevronRight className="h-4 w-4 shrink-0 text-[var(--ci-text-muted)] transition-transform group-open:rotate-90" aria-hidden="true" />
        </summary>
        <div className="space-y-5 border-t border-[var(--ci-border)] px-4 py-4 text-[13px] leading-relaxed text-[var(--ci-text-muted)]">
          <p>{d.ajutor.intro}</p>

          <div>
            <h2 className="ci-display text-[14px] font-semibold text-[var(--ci-text)]">{d.ajutor.reguliTitlu}</h2>
            <p className="mt-0.5">{d.ajutor.reguliNota}</p>
            <ol className="mt-2 space-y-2">
              {d.ajutor.reguli.map((r, i) => (
                <li key={r.n} className="flex gap-3">
                  <span className="ci-tabular flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--ci-surface-2)] text-[12px] font-semibold text-[var(--ci-text)]">{i + 1}</span>
                  <p>
                    <strong className="text-[var(--ci-text)]">{r.n}.</strong> {r.d}
                  </p>
                </li>
              ))}
            </ol>
          </div>

          <div>
            <h2 className="ci-display text-[14px] font-semibold text-[var(--ci-text)]">{d.ajutor.etichetareTitlu}</h2>
            <ul className="mt-2 space-y-3">
              {d.ajutor.etichetare.map((e) => (
                <li key={e.n}>
                  <p>
                    <strong className="text-[var(--ci-text)]">{e.n}.</strong> {e.d}
                  </p>
                  {e.ex && <code className="mt-1 block overflow-x-auto rounded-[var(--ci-radius-btn)] bg-[var(--ci-surface-2)] px-3 py-2 text-[12px] break-all whitespace-pre-wrap text-[var(--ci-text)]">{e.ex}</code>}
                </li>
              ))}
            </ul>
            <p className="mt-3">{d.ajutor.campanieNota}</p>
          </div>

          <div>
            <h2 className="ci-display text-[14px] font-semibold text-[var(--ci-text)]">{d.ajutor.pastrareTitlu}</h2>
            <ul className="mt-2 list-disc space-y-1.5 pl-5">
              {d.ajutor.pastrare.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>

          <div className="rounded-[var(--ci-radius-btn)] bg-[var(--ci-surface-2)] px-4 py-3">
            <h2 className="ci-display text-[14px] font-semibold text-[var(--ci-text)]">{d.ajutor.exempluTitlu}</h2>
            <p className="mt-1">{d.ajutor.exemplu}</p>
          </div>
        </div>
      </details>
    </div>
  );
}
