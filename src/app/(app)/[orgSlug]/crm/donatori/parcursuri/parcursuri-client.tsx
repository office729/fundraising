"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import {
  corpHtml,
  FEREASTRA_CONVERSIE_ZILE,
  formatLei,
  LIMITE_PARCURS,
  PLAFON_ZI_ORGANIZATIE,
  procentConversie,
  subiectRandat,
  VARIABILE_PARCURS,
  type EroareParcurs,
  type PasParcurs,
} from "@/lib/parcursuri-donatori";

import { DONATORI_UI4_DICT } from "@/lib/i18n/dictionaries/donatori-ui-4";

import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Input, Label, Textarea } from "../../components/ui/input";
import { useLocale } from "../../lib/locale-context";
import { formatariPf } from "../pf-format";

import { salveazaParcurs, trimiteTestParcurs, type DateParcursuri, type ParcursDate } from "./actions";

// Cât de târziu e „zile”: la primul pas se numără de la eveniment, la următorii de la trimiterea pasului anterior.
function etichetaZile(t: (typeof DONATORI_UI4_DICT)["ro" | "en"], cheie: string, index: number, zile: number): string {
  if ((cheie === "upgrade" || cheie === "reactivare") && index === 0) return t.imediat;
  if (index === 0) {
    const eveniment = cheie === "welcome" ? t.evenimente.welcome : cheie === "a_doua_donatie" ? t.evenimente.a_doua_donatie : t.evenimente.altul;
    return t.dupaEveniment(t.zile(zile), eveniment);
  }
  return t.dupaPasulAnterior(t.zile(zile));
}

const ONLY_SUMAR = { prenume: "Ana", suma: formatLei(100), total: formatLei(350), campanie: "Campania ta", link: "https://exemplu.ro/campania-ta" };

function Parcurs({ p, orgSlug, poateEdita, emailOk, organizatie }: { p: ParcursDate; orgSlug: string; poateEdita: boolean; emailOk: boolean; organizatie: string }) {
  const router = useRouter();
  const locale = useLocale();
  const t = DONATORI_UI4_DICT[locale];
  const meta = t.meta[p.cheie];
  const { nr, data: dataRo } = formatariPf(locale);
  const [pending, startTransition] = useTransition();
  const [pasi, setPasi] = useState<PasParcurs[]>(p.pasi);
  const [deschisCard, setDeschisCard] = useState(false);
  const [deschis, setDeschis] = useState(0);
  const [mesaj, setMesaj] = useState<{ tip: "ok" | "eroare"; text: string } | null>(null);
  const [mesajTest, setMesajTest] = useState<{ pas: number; tip: "ok" | "eroare"; text: string } | null>(null);
  const [erori, setErori] = useState<EroareParcurs[]>([]);
  const [confirma, setConfirma] = useState<null | "porneste" | "opreste" | "restaureaza">(null);
  const [acord, setAcord] = useState(false);
  const [stergePas, setStergePas] = useState<number | null>(null);
  const modificat = JSON.stringify(pasi) !== JSON.stringify(p.pasi);
  const valoriExemplu = { ...ONLY_SUMAR, organizatie };

  // Textele modificate și nesalvate se pierd la închiderea paginii: întrebăm înainte.
  useEffect(() => {
    if (!modificat) return;
    const avertizeaza = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", avertizeaza);
    return () => window.removeEventListener("beforeunload", avertizeaza);
  }, [modificat]);

  const schimba = (i: number, parte: Partial<PasParcurs>) => setPasi((v) => v.map((x, j) => (j === i ? { ...x, ...parte } : x)));

  const insereaza = (i: number, variabila: string) => {
    const camp = document.getElementById(`corp-${p.cheie}-${i}`) as HTMLTextAreaElement | null;
    const text = `{${variabila}}`;
    const inceput = camp?.selectionStart ?? pasi[i].corp.length;
    const sfarsit = camp?.selectionEnd ?? inceput;
    schimba(i, { corp: pasi[i].corp.slice(0, inceput) + text + pasi[i].corp.slice(sfarsit) });
    requestAnimationFrame(() => {
      camp?.focus();
      camp?.setSelectionRange(inceput + text.length, inceput + text.length);
    });
  };

  const salveaza = (activ: boolean, confirmaAcord = false) =>
    startTransition(async () => {
      setMesaj(null);
      setErori([]);
      const r = await salveazaParcurs(orgSlug, p.cheie, pasi, activ, confirmaAcord);
      if (!r.ok) {
        setErori(r.erori ?? []);
        setMesaj({ tip: "eroare", text: r.erori && r.erori.length > 0 ? t.verificaCampurile : r.eroare });
        const primulPas = r.erori?.find((e) => e.pas !== null)?.pas;
        if (typeof primulPas === "number") {
          setDeschisCard(true);
          setDeschis(primulPas);
        }
        return;
      }
      setConfirma(null);
      setAcord(false);
      setMesaj({ tip: "ok", text: r.activ ? t.salvatActiv : t.salvatOprit });
      router.refresh();
    });

  const test = (i: number) =>
    startTransition(async () => {
      setMesajTest(null);
      const r = await trimiteTestParcurs(orgSlug, p.cheie, pasi, i);
      setMesajTest({ pas: i, ...(r.ok ? { tip: "ok" as const, text: t.testTrimis(r.catre) } : { tip: "eroare" as const, text: r.eroare }) });
    });

  const r = p.rezultate;
  const trimiseTotal = p.statistici.reduce((s, x) => s + x.trimiseTotal, 0);

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[15px] font-semibold text-[var(--ci-text)]">{meta?.nume ?? p.nume}</h2>
            <Badge tone={p.activ ? "green" : "neutral"} icon={false}>
              {p.activ ? t.activ : t.oprit}
            </Badge>
          </div>
          <p className="mt-1 max-w-2xl text-[13px] text-[var(--ci-text-muted)]">{meta?.descriere ?? p.descriere}</p>
          <p className="mt-1 text-[12.5px] text-[var(--ci-text-muted)]">
            {t.pasi(pasi.length)} · {t.trimise(nr(trimiseTotal))}
            {r && r.inscrisi > 0 ? t.aDonatDupa(nr(r.convertiti), procentConversie(r.convertiti, r.inscrisi) ?? 0) : ""}
            {p.activ && p.activDin ? t.activDin(dataRo(p.activDin)) : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button className="min-h-11" aria-expanded={deschisCard} onClick={() => setDeschisCard(!deschisCard)}>
            {deschisCard ? t.ascundeDetalii : poateEdita ? t.veziEditeaza : t.veziDetalii}
          </Button>
          {poateEdita &&
            (p.activ ? (
              <Button className="min-h-11" disabled={pending} onClick={() => setConfirma("opreste")}>
                {t.opreste}
              </Button>
            ) : (
              <Button variant="primary" className="min-h-11" disabled={pending || !emailOk} onClick={() => setConfirma("porneste")}>
                {t.porneste}
              </Button>
            ))}
        </div>
      </div>

      {confirma === "opreste" && (
        <div role="group" aria-label={t.confirmaOprire} className="mt-3 rounded-lg bg-[var(--ci-surface-2)] p-3 text-[13px] text-[var(--ci-text)]">
          <p className="font-semibold">{t.opresti(meta?.nume ?? p.nume)}</p>
          <ul className="mt-1.5 list-disc space-y-1 pl-5 text-[12.5px]">
            <li>{t.oprire1}</li>
            <li>{t.oprire2}</li>
            <li>{t.oprire3}</li>
          </ul>
          <div className="mt-3 flex gap-2">
            <Button variant="danger" className="min-h-11" loading={pending} onClick={() => salveaza(false)}>
              {t.opresteParcursul}
            </Button>
            <Button className="min-h-11" disabled={pending} onClick={() => setConfirma(null)}>
              {t.renunta}
            </Button>
          </div>
        </div>
      )}

      {confirma === "porneste" && !p.activ && (
        <div role="group" aria-label={t.confirmaPornire} className="mt-3 rounded-lg bg-[var(--ci-surface-2)] p-3 text-[13px] text-[var(--ci-text)]">
          <p className="font-semibold">{t.pornesti(meta?.nume ?? p.nume)}</p>
          <ul className="mt-1.5 list-disc space-y-1 pl-5 text-[12.5px]">
            {p.cheie === "welcome" || p.cheie === "a_doua_donatie" ? (
              <li>{t.pornire1}</li>
            ) : (
              <li>
                {p.eligibiliPas1 === null ? t.nuEstimam : t.acumDonatori(nr(p.eligibiliPas1))}
                {t.trimitereTreptata(PLAFON_ZI_ORGANIZATIE)}
              </li>
            )}
            <li>{t.pornire3}</li>
            <li>
              {modificat ? t.modificariNesalvate : t.textePlecare}
              {t.trimiteTest}
            </li>
          </ul>
          <label className="mt-3 flex min-h-11 cursor-pointer items-start gap-3 text-[13px]">
            <input type="checkbox" className="mt-0.5 size-5 shrink-0" checked={acord} onChange={(e) => setAcord(e.target.checked)} />
            <span>{t.acordText}</span>
          </label>
          <div className="mt-3 flex gap-2">
            <Button variant="primary" className="min-h-11" loading={pending} disabled={!acord} onClick={() => salveaza(true, acord)}>
              {t.pornesteParcursul}
            </Button>
            <Button className="min-h-11" disabled={pending} onClick={() => setConfirma(null)}>
              {t.renunta}
            </Button>
          </div>
        </div>
      )}

      {mesaj && !deschisCard && (
        <p role={mesaj.tip === "eroare" ? "alert" : "status"} className={`mt-3 rounded-lg px-3 py-2 text-[13px] ${mesaj.tip === "eroare" ? "bg-[var(--ci-red-soft)] text-[#9b1c1c]" : "bg-[var(--ci-green-soft)] text-[#17602f]"}`}>
          {mesaj.text}
        </p>
      )}

      {deschisCard && (
        <div className="mt-4">
          {p.activ && poateEdita && <p className="mb-3 rounded-lg bg-[var(--ci-amber-soft)] px-3 py-2 text-[12.5px] text-[#7a3e00]">{t.avertizareActiv}</p>}

          {r && r.inscrisi > 0 ? (
            <div className="rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] bg-[var(--ci-surface-2)] p-3">
              <p className="text-[12px] font-semibold uppercase tracking-wide text-[var(--ci-text-muted)]">{t.ceAAdus}</p>
              <dl className="mt-2 grid grid-cols-2 gap-3 md:grid-cols-4">
                <div>
                  <dt className="text-[12px] text-[var(--ci-text-muted)]">{t.auPrimit}</dt>
                  <dd className="text-[18px] font-bold tabular-nums text-[var(--ci-text)]">{nr(r.inscrisi)}</dd>
                </div>
                <div>
                  <dt className="text-[12px] text-[var(--ci-text-muted)]">{t.auDonatDupa}</dt>
                  <dd className="text-[18px] font-bold tabular-nums text-[var(--ci-text)]">
                    {nr(r.convertiti)} <span className="text-[13px] font-semibold text-[var(--ci-text-muted)]">({procentConversie(r.convertiti, r.inscrisi) ?? 0}%)</span>
                  </dd>
                </div>
                <div>
                  <dt className="text-[12px] text-[var(--ci-text-muted)]">{t.deObicei}</dt>
                  <dd className="text-[18px] font-bold tabular-nums text-[var(--ci-text)]">{r.medianaZile === null ? "—" : t.zileMediana(r.medianaZile.toLocaleString(locale === "ro" ? "ro-RO" : "en-GB"))}</dd>
                </div>
                <div>
                  <dt className="text-[12px] text-[var(--ci-text-muted)]">{t.donatInTotal}</dt>
                  <dd className="text-[18px] font-bold tabular-nums text-[var(--ci-text)]">{nr(r.venit)} lei</dd>
                </div>
              </dl>
              {r.control && r.control.inscrisi > 0 && (
                <p className="mt-2 text-[12.5px] text-[var(--ci-text)]">
                  {t.control(nr(r.control.inscrisi), nr(r.control.convertiti), procentConversie(r.control.convertiti, r.control.inscrisi) ?? 0)}
                </p>
              )}
              <p className="mt-2 text-[12px] text-[var(--ci-text-muted)]">
                {t.reusita(meta?.obiectiv ?? p.obiectiv, FEREASTRA_CONVERSIE_ZILE)}{" "}
                {r.pasi.map((x) => t.peStep(x.pas, nr(x.trimise), nr(x.convertiti))).join("; ")}.
              </p>
            </div>
          ) : (
            <p className="text-[12.5px] text-[var(--ci-text-muted)]">{t.rezultateGoale}</p>
          )}

          <ol className="mt-4 space-y-3">
            {pasi.map((pas, i) => {
              const stat = p.statistici[i];
              const deschisAcum = deschis === i;
              const eroriPas = erori.filter((e) => e.pas === i);
              return (
                <li key={i} className="rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] bg-[var(--ci-surface)]">
                  <button type="button" className="flex min-h-11 w-full flex-wrap items-center justify-between gap-2 px-3 py-2 text-left focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none" aria-expanded={deschisAcum} onClick={() => setDeschis(deschisAcum ? -1 : i)}>
                    <span className="min-w-0">
                      <span className="block text-[13.5px] font-semibold text-[var(--ci-text)]">
                        {t.pasul(i + 1, subiectRandat(pas.subiect, valoriExemplu) || t.faraSubiect)}
                        {eroriPas.length > 0 && <span className="ml-2 text-[12px] font-semibold text-[#9b1c1c]">{t.deCorectat}</span>}
                      </span>
                      <span className="block text-[12.5px] text-[var(--ci-text-muted)]">{etichetaZile(t, p.cheie, i, pas.zile)}</span>
                    </span>
                    {stat && <span className="text-[12.5px] text-[var(--ci-text-muted)]">{t.trimiseLast30(nr(stat.trimiseTotal), nr(stat.trimiseUltimele30Zile))}</span>}
                  </button>
                  {deschisAcum && (
                    <div className="grid gap-4 border-t border-[var(--ci-border)] p-3 md:grid-cols-2">
                      {poateEdita ? (
                        <div className="space-y-3">
                          {eroriPas.length > 0 && (
                            <ul role="alert" className="list-disc space-y-1 rounded-lg bg-[var(--ci-red-soft)] py-2 pr-3 pl-7 text-[12.5px] text-[#9b1c1c]">
                              {eroriPas.map((e, k) => (
                                <li key={k}>{e.mesaj}</li>
                              ))}
                            </ul>
                          )}
                          {!((p.cheie === "upgrade" || p.cheie === "reactivare") && i === 0) && (
                            <div>
                              <Label htmlFor={`zile-${p.cheie}-${i}`}>{t.trimiteDupaZile}</Label>
                              <Input id={`zile-${p.cheie}-${i}`} type="number" min={1} max={LIMITE_PARCURS.maxZile} value={Number.isFinite(pas.zile) ? pas.zile : ""} onChange={(e) => schimba(i, { zile: e.target.value === "" ? Number.NaN : Number(e.target.value) })} className="max-w-28" aria-describedby={`zile-ajutor-${p.cheie}-${i}`} />
                              <p id={`zile-ajutor-${p.cheie}-${i}`} className="mt-1 text-[12px] text-[var(--ci-text-muted)]">
                                {t.seTrimite(Number.isFinite(pas.zile) ? etichetaZile(t, p.cheie, i, pas.zile) : t.dupaNrZile)}
                              </p>
                            </div>
                          )}
                          <div>
                            <Label htmlFor={`subiect-${p.cheie}-${i}`}>{t.subiect}</Label>
                            <Input id={`subiect-${p.cheie}-${i}`} value={pas.subiect} maxLength={LIMITE_PARCURS.maxSubiect} onChange={(e) => schimba(i, { subiect: e.target.value })} aria-invalid={eroriPas.some((e) => /subiect/i.test(e.mesaj))} />
                            <p className="mt-1 text-[12px] text-[var(--ci-text-muted)]">{t.subiectNota}</p>
                          </div>
                          <div>
                            <Label htmlFor={`corp-${p.cheie}-${i}`}>{t.mesaj}</Label>
                            <Textarea id={`corp-${p.cheie}-${i}`} rows={9} value={pas.corp} maxLength={LIMITE_PARCURS.maxCorp} onChange={(e) => schimba(i, { corp: e.target.value })} />
                            <div className="mt-1 flex flex-wrap items-center gap-1.5" role="group" aria-label={t.insereazaAria}>
                              <span className="text-[12px] text-[var(--ci-text-muted)]">{t.insereaza}</span>
                              {VARIABILE_PARCURS.map((v) => (
                                <button key={v} type="button" onClick={() => insereaza(i, v)} className="min-h-8 rounded-full border border-[var(--ci-border)] bg-[var(--ci-surface-2)] px-2.5 text-[12px] font-semibold text-[var(--ci-text)] hover:border-[var(--ci-primary)] focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none">
                                  {v}
                                </button>
                              ))}
                            </div>
                            <p className="mt-1 text-[12px] text-[var(--ci-text-muted)]">{t.mesajNota}</p>
                          </div>
                          <div>
                            <Label htmlFor={`buton-${p.cheie}-${i}`}>{t.textButon}</Label>
                            <Input id={`buton-${p.cheie}-${i}`} value={pas.buton ?? ""} maxLength={LIMITE_PARCURS.maxButon} onChange={(e) => schimba(i, { buton: e.target.value })} />
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button className="min-h-11" disabled={pending || !emailOk} onClick={() => test(i)}>
                              {t.trimiteTestBtn}
                            </Button>
                            {pasi.length > 1 && stergePas !== i && (
                              <Button className="min-h-11" disabled={pending} onClick={() => setStergePas(i)}>
                                {t.stergePasul}
                              </Button>
                            )}
                          </div>
                          <p className="text-[12px] text-[var(--ci-text-muted)]">{t.testNota}</p>
                          {mesajTest && mesajTest.pas === i && (
                            <p role={mesajTest.tip === "eroare" ? "alert" : "status"} className={`rounded-lg px-3 py-2 text-[13px] ${mesajTest.tip === "eroare" ? "bg-[var(--ci-red-soft)] text-[#9b1c1c]" : "bg-[var(--ci-green-soft)] text-[#17602f]"}`}>
                              {mesajTest.text}
                            </p>
                          )}
                          {stergePas === i && (
                            <div role="group" aria-label={t.confirmaStergerePas} className="rounded-lg bg-[var(--ci-surface-2)] p-3 text-[12.5px]">
                              <p className="font-semibold">{t.stergiPasul(i + 1)}</p>
                              <p className="mt-1">{t.stergerePasText}</p>
                              <div className="mt-2 flex gap-2">
                                <Button
                                  variant="danger"
                                  className="min-h-11"
                                  onClick={() => {
                                    setPasi((v) => v.filter((_, j) => j !== i));
                                    setStergePas(null);
                                    setDeschis(0);
                                  }}
                                >
                                  {t.stergePasul}
                                </Button>
                                <Button className="min-h-11" onClick={() => setStergePas(null)}>
                                  {t.renunta}
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-[12.5px] text-[var(--ci-text-muted)]">{t.doarAdminTexte}</p>
                      )}
                      <div>
                        <p className="mb-1 text-[12px] font-semibold uppercase tracking-wide text-[var(--ci-text-muted)]">{t.previzualizare}</p>
                        <div className="rounded-lg border border-[var(--ci-border)] bg-white p-4 text-[#14213d]" dangerouslySetInnerHTML={{ __html: corpHtml(pas.corp, valoriExemplu) }} />
                        {pas.buton && (
                          <p className="mt-2 text-center">
                            <span className="inline-block rounded-lg bg-[#154a85] px-5 py-2.5 text-[13px] font-semibold text-white">{pas.buton}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>

          {poateEdita && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button variant="primary" className="min-h-11" loading={pending} disabled={!modificat && p.esteSalvat} onClick={() => salveaza(p.activ)}>
                {t.salveazaTextele}
              </Button>
              {pasi.length < LIMITE_PARCURS.maxPasi && (
                <Button
                  className="min-h-11"
                  disabled={pending}
                  onClick={() => {
                    setPasi((v) => [...v, { zile: 7, subiect: "", corp: "" }]);
                    setDeschis(pasi.length);
                  }}
                >
                  {t.adaugaPas}
                </Button>
              )}
              {modificat && (
                <Button
                  className="min-h-11"
                  disabled={pending}
                  onClick={() => {
                    setPasi(p.pasi);
                    setErori([]);
                    setMesaj(null);
                  }}
                >
                  {t.renuntaModificari}
                </Button>
              )}
              {confirma !== "restaureaza" && JSON.stringify(p.pasi) !== JSON.stringify(p.pasiImplicit) && (
                <Button className="min-h-11" disabled={pending} onClick={() => setConfirma("restaureaza")}>
                  {t.restaureazaOriginal}
                </Button>
              )}
            </div>
          )}
          {confirma === "restaureaza" && (
            <div role="group" aria-label={t.confirmaRestaurare} className="mt-3 rounded-lg bg-[var(--ci-surface-2)] p-3 text-[12.5px]">
              <p className="font-semibold">{t.reviiOriginale}</p>
              <p className="mt-1">{t.restaurareText}</p>
              <div className="mt-2 flex gap-2">
                <Button
                  variant="danger"
                  className="min-h-11"
                  onClick={() => {
                    setPasi(p.pasiImplicit);
                    setErori([]);
                    setConfirma(null);
                    setDeschis(0);
                  }}
                >
                  {t.restaureaza}
                </Button>
                <Button className="min-h-11" onClick={() => setConfirma(null)}>
                  {t.renunta}
                </Button>
              </div>
            </div>
          )}
          {mesaj && (
            <p role={mesaj.tip === "eroare" ? "alert" : "status"} className={`mt-3 rounded-lg px-3 py-2 text-[13px] ${mesaj.tip === "eroare" ? "bg-[var(--ci-red-soft)] text-[#9b1c1c]" : "bg-[var(--ci-green-soft)] text-[#17602f]"}`}>
              {mesaj.text}
            </p>
          )}
        </div>
      )}
    </Card>
  );
}

export function ParcursuriClient({ orgSlug, date }: { orgSlug: string; date: DateParcursuri }) {
  const locale = useLocale();
  const t = DONATORI_UI4_DICT[locale];
  const { nr } = formatariPf(locale);
  const active = date.parcursuri.filter((p) => p.activ).length;
  const c = date.contactabili;
  return (
    <div className="space-y-4">
      {!date.emailConfigurat && (
        <p role="alert" className="rounded-lg bg-[var(--ci-amber-soft)] px-3 py-2 text-[13px] text-[#7a3e00]">
          {t.emailNeconfigurat}
        </p>
      )}
      <Card>
        <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div>
            <dt className="text-[12px] text-[var(--ci-text-muted)]">{t.parcursuriActive}</dt>
            <dd className="text-[18px] font-bold tabular-nums text-[var(--ci-text)]">
              {active} <span className="text-[13px] font-semibold text-[var(--ci-text-muted)]">{t.dinTotal(date.parcursuri.length)}</span>
            </dd>
          </div>
          {c && (
            <>
              <div>
                <dt className="text-[12px] text-[var(--ci-text-muted)]">{t.pot}</dt>
                <dd className="text-[18px] font-bold tabular-nums text-[var(--ci-text)]">
                  {nr(c.pot)} <span className="text-[13px] font-semibold text-[var(--ci-text-muted)]">{t.dinN(nr(c.total))}</span>
                </dd>
              </div>
              <div>
                <dt className="text-[12px] text-[var(--ci-text-muted)]">{t.faraAcord}</dt>
                <dd className="text-[18px] font-bold tabular-nums text-[var(--ci-text)]">{nr(c.faraAcord + c.refuz)}</dd>
              </div>
              <div>
                <dt className="text-[12px] text-[var(--ci-text-muted)]">{t.dezabonati}</dt>
                <dd className="text-[18px] font-bold tabular-nums text-[var(--ci-text)]">{nr(c.dezabonati)}</dd>
              </div>
            </>
          )}
        </dl>
        {c && c.pot < c.total && (
          <p className="mt-2 text-[12.5px] text-[var(--ci-text-muted)]">
            {t.acordNota(nr(c.faraAcord), nr(c.refuz), c.acordDeclarat > 0 ? nr(c.acordDeclarat) : null)}
          </p>
        )}
        {c && c.adreseProblematice > 0 && (
          <p className="mt-2 text-[12.5px] text-[var(--ci-text-muted)]">
            {t.adrese(c.adreseProblematice, nr(c.adreseProblematice))}
          </p>
        )}
        <details className="mt-3 text-[12.5px] text-[var(--ci-text-muted)]">
          <summary className="min-h-9 cursor-pointer font-semibold text-[var(--ci-text)]">{t.cumFunctioneaza}</summary>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            <li>{t.cum1(PLAFON_ZI_ORGANIZATIE)}</li>
            <li>{t.cum2}</li>
            <li>{t.cum3}</li>
            <li>{t.cum4}</li>
          </ul>
        </details>
      </Card>
      {date.parcursuri.map((p) => (
        <Parcurs key={p.cheie} p={p} orgSlug={orgSlug} poateEdita={date.poateEdita} emailOk={date.emailConfigurat} organizatie={date.organizatie} />
      ))}
      <p className="text-[12.5px] text-[var(--ci-text-muted)]">{t.subsol}</p>
    </div>
  );
}
