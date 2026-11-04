"use client";

import { ExternalLink, Globe, Search, UserCheck, UserX } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { tipTelefon } from "@/lib/deep-search-ai/validare";
import { vechime } from "@/lib/i18n/dictionaries/decidenti-ui";
import { COMPANII_UI_DICT } from "@/lib/i18n/dictionaries/companii-ui";
import { PROSPECTARE_DEEP_DICT } from "@/lib/i18n/dictionaries/prospectare-deep-ui";
import { antetFurnizori } from "@/lib/prospectare/deep-search";
import { NUME_FURNIZOR, type Furnizor } from "@/lib/prospectare/motor";

import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardHeader } from "../../components/ui/card";
import { useLocale } from "../../lib/locale-context";
import { CrediteFurnizori } from "./credite-furnizori";
import { cautaDecidentiWebAi } from "./deep-search-ai-actions";
import { aprobaCandidatiAction, cautaDeepSearch, respingeCandidatiAction, type RezultatAprobareLot, type RezultatDeepSearch } from "./deep-search-actions";
import { respingeCandidatAction, type StareProspectare } from "./prospectare-actions";

// Siglele furnizorilor (pictogramele din public/furnizori): doar ca să se recunoască de unde vine fiecare persoană.
const SIGLA: Record<Furnizor, string> = { lusha: "/furnizori/lusha.png", apollo: "/furnizori/apollo.svg", prospeo: "/furnizori/prospeo.png", hunter: "/furnizori/hunter.png" };
const eFurnizor = (s: string): s is Furnizor => s in SIGLA;

type Ocupat = "deep" | "lant" | "ai" | "aproba" | null;

// „Decidenți găsiți”: Deep Search la toți furnizorii conectați (Apollo întâi, apoi ceilalți în paralel), căutare pe internet cu AI sau în lanț (economic). Persoanele găsite stau în „De aprobat”
// până le aprobă cineva; abia la „Aprobă” se aduc emailul/telefonul, de la furnizorul care a găsit persoana, doar pentru cei bifați.
export function DecidentiCard({ orgSlug, companyId, stare, aiDisponibil }: { orgSlug: string; companyId: string; stare: StareProspectare; aiDisponibil: boolean }) {
  const router = useRouter();
  const locale = useLocale();
  const ui = COMPANII_UI_DICT[locale].decidenti;
  const d = PROSPECTARE_DEEP_DICT[locale].deep;
  const [pending, startTransition] = useTransition();
  const [ocupat, setOcupat] = useState<Ocupat>(null);
  const [eroare, setEroare] = useState<string | null>(null);
  const [notita, setNotita] = useState<string | null>(null);
  const [avertismente, setAvertismente] = useState<string[]>([]);
  const [antet, setAntet] = useState<string | null>(null);
  const [rezumat, setRezumat] = useState<string | null>(null);
  const [selectati, setSelectati] = useState<Set<string>>(new Set());
  const [cuTelefon, setCuTelefon] = useState(false);
  const [inWaalaxy, setInWaalaxy] = useState(false);
  const [confirmaExcludere, setConfirmaExcludere] = useState<string | null>(null);
  const [versiuneCredite, setVersiuneCredite] = useState(0); // crește după fiecare căutare, ca să se recitească creditele
  const faraChei = stare.furnizoriConfigurati.length === 0;
  const numeFurnizori = stare.furnizoriConfigurati.map((f: Furnizor) => NUME_FURNIZOR[f]);
  const vazute = useRef<Set<string>>(new Set());

  // Persoanele noi din listă se bifează singure doar dacă aprobarea lor nu costă nimic (au deja emailul sau vin de pe internet) sau dacă sunt foarte potrivite.
  useEffect(() => {
    const noi = stare.candidati.filter((c) => !vazute.current.has(c.id));
    if (noi.length === 0) return;
    for (const c of noi) vazute.current.add(c.id);
    setSelectati((acum) => {
      const urm = new Set([...acum].filter((id) => stare.candidati.some((c) => c.id === id)));
      for (const c of noi) if (c.sursa === "web-ai" || c.email || c.scor >= 80) urm.add(c.id);
      return urm;
    });
  }, [stare.candidati]);

  // Notița de reușită dispare singură.
  useEffect(() => {
    if (!notita) return;
    const t = setTimeout(() => setNotita(null), 9000);
    return () => clearTimeout(t);
  }, [notita]);

  const curata = () => {
    setEroare(null);
    setNotita(null);
    setAvertismente([]);
    setRezumat(null);
  };
  const numeSursa = (s: string) => (s === "web-ai" ? d.sursaInternet : (NUME_FURNIZOR[s as Furnizor] ?? s));

  const aratRezultat = (r: RezultatDeepSearch) => {
    if (!r.ok) return setEroare(r.eroare ?? null);
    const stari = r.stari ?? [];
    setAntet(stari.length ? d.antetFurnizori(antetFurnizori(stari, numeSursa, d.memorat)) : null);
    setRezumat(r.toateMemorate ? d.toateMemorate : r.noi ? d.amGasit(r.noi) : d.niciunNou);
  };

  const cauta = (mod: "deep" | "lant", forteaza = false) => {
    curata();
    setOcupat(mod);
    startTransition(async () => {
      const r = await cautaDeepSearch(orgSlug, companyId, mod, forteaza);
      aratRezultat(r);
      setVersiuneCredite((v) => v + 1);
      setOcupat(null);
      router.refresh();
    });
  };

  const cautaAi = (forteaza = false) => {
    curata();
    setOcupat("ai");
    startTransition(async () => {
      const r = await cautaDecidentiWebAi(orgSlug, companyId, forteaza);
      if (!r.ok) setEroare(r.eroare ?? null);
      else {
        setAntet(d.antetFurnizori(`${d.sursaInternet}: ${r.gasiti ?? 0}${r.dinMemorie ? ` (${d.memoratAi})` : ""}`));
        setRezumat(r.dinMemorie ? PROSPECTARE_DEEP_DICT[locale].msg.webMemorat : r.noi ? d.amGasit(r.noi) : d.niciunNou);
      }
      setOcupat(null);
      router.refresh();
    });
  };

  const aproba = () => {
    const ids = stare.candidati.filter((c) => selectati.has(c.id)).map((c) => c.id);
    if (ids.length === 0) return;
    curata();
    setOcupat("aproba");
    startTransition(async () => {
      const r: RezultatAprobareLot = await aprobaCandidatiAction(orgSlug, ids, { cuTelefon, trimiteWaalaxy: inWaalaxy && stare.waalaxyGata });
      if (r.eroare && r.adaugati === 0) setEroare(r.eroare);
      if (r.adaugati > 0) setNotita(d.rezultatAprobare(r.adaugati, r.faraEmail));
      const probleme = r.esuati.map((e) => d.esecFurnizor(e.furnizor, e.mesaj));
      if (r.ramase.length > 0) probleme.push(d.ramaseReincercare(r.ramase.length));
      if (r.excluse > 0) probleme.push(d.excluse(r.excluse));
      setAvertismente([...probleme, ...r.avertismente]);
      setSelectati(new Set(r.ramase));
      setVersiuneCredite((v) => v + 1);
      setOcupat(null);
      router.refresh();
    });
  };

  const respingeBifatii = () => {
    const ids = stare.candidati.filter((c) => selectati.has(c.id)).map((c) => c.id);
    if (ids.length === 0) return;
    curata();
    startTransition(async () => {
      const r = await respingeCandidatiAction(orgSlug, ids);
      if (r.error) setEroare(r.error);
      else setNotita(d.respinsBifati(r.respinsi));
      setSelectati(new Set());
      router.refresh();
    });
  };

  const excludeComplet = (id: string, nume: string) => {
    curata();
    startTransition(async () => {
      const r = await respingeCandidatAction(orgSlug, id, true);
      if (r.error) setEroare(r.error);
      else setNotita(ui.exclus(nume));
      setConfirmaExcludere(null);
      router.refresh();
    });
  };

  const comuta = (id: string) =>
    setSelectati((acum) => {
      const urm = new Set(acum);
      if (urm.has(id)) urm.delete(id);
      else urm.add(id);
      return urm;
    });
  const nrSel = stare.candidati.filter((c) => selectati.has(c.id)).length;
  const toti = stare.candidati.length > 0 && nrSel === stare.candidati.length;
  const arataTelefon = stare.candidati.some((c) => selectati.has(c.id) && c.sursa === "prospeo" && !c.telefon);
  const arataWaalaxy = stare.waalaxyGata && stare.candidati.some((c) => selectati.has(c.id) && c.linkedin);
  const areAi = stare.candidati.some((c) => c.sursa === "web-ai");
  const ai = stare.webAi;

  const buton = "min-h-10";
  return (
    <Card>
      <div aria-busy={pending}>
        <CardHeader
          title={ui.titlu(stare.candidati.length)}
          subtitle={faraChei ? (stare.esteAdmin ? ui.subtitluAdmin : ui.subtitluMembru) : ui.subtitluCautare(numeFurnizori.join(", "))}
          action={
            faraChei && stare.esteAdmin ? (
              <Link href={`/${orgSlug}/crm/setari#prospectare`} className="inline-flex min-h-10 items-center rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] px-3 text-sm font-semibold text-[var(--ci-text)] hover:bg-[var(--ci-surface-2)]">
                {ui.adaugaCheile}
              </Link>
            ) : null
          }
        />

        {!faraChei && (
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Button variant="primary" className={buton} onClick={() => cauta("deep")} loading={ocupat === "deep"} disabled={pending} title={d.btnHint}>
              {ocupat !== "deep" && <Search className="h-4 w-4" aria-hidden />} {ocupat === "deep" ? d.btnBusy : d.btn}
            </Button>
            {aiDisponibil && (
              <Button className={`${buton} !bg-emerald-600 !text-white hover:!bg-emerald-700`} onClick={() => cautaAi(false)} loading={ocupat === "ai"} disabled={pending} title={d.webHint}>
                {ocupat !== "ai" && <Globe className="h-4 w-4" aria-hidden />} {ocupat === "ai" ? d.webBusy : d.web}
              </Button>
            )}
            <button type="button" onClick={() => cauta("lant")} disabled={pending} title={d.lantHint} className="min-h-10 px-1 text-[13px] font-medium text-[var(--ci-text-muted)] underline-offset-2 hover:underline disabled:opacity-50">
              {ocupat === "lant" ? d.lantBusy : d.lant}
            </button>
            {stare.esteAdmin && (
              <button type="button" onClick={() => cauta("deep", true)} disabled={pending} className="min-h-10 px-1 text-[12px] text-[var(--ci-text-muted)] underline-offset-2 hover:underline disabled:opacity-50">
                {d.cautaDinNouDeep}
              </button>
            )}
          </div>
        )}

        <CrediteFurnizori orgSlug={orgSlug} versiune={versiuneCredite} />

        {!faraChei && (
          <p className="mb-3 text-xs leading-relaxed text-[var(--ci-text-muted)]">
            {pending && ocupat !== "aproba" ? ui.seCautaLa(numeFurnizori.join(", ")) : ui.poateConsuma}
            {stare.ultimaCautare && !pending && <> {ui.ultimaCautare(vechime(stare.ultimaCautare.la, locale), stare.ultimaCautare.deCine)}</>}
            {ai && !pending && (
              <>
                {" "}
                {d.aiMemorie(vechime(ai.la, locale), ai.gasiti)}
                {ai.proaspat && stare.esteAdmin && (
                  <>
                    {" "}
                    <button type="button" onClick={() => cautaAi(true)} disabled={pending} className="text-[var(--ci-primary)] underline-offset-2 hover:underline">
                      {d.cautaDinNouAi}
                    </button>
                  </>
                )}
                {ai.proaspat && !stare.esteAdmin && <span title={d.cautaDinNouAiHint}> ({d.memoratAi})</span>}
              </>
            )}
          </p>
        )}

        {eroare && (
          <p role="alert" className="mb-3 rounded-lg bg-[var(--ci-red-soft)] px-3 py-2 text-[13px] text-[#9b1c1c]">
            {eroare}
          </p>
        )}
        {(antet || rezumat) && !eroare && (
          <div role="status" className="mb-3 rounded-lg bg-[var(--ci-surface-2)] px-3 py-2 text-[13px] text-[var(--ci-text-muted)]">
            {rezumat && <p className="font-medium text-[var(--ci-text)]">{rezumat}</p>}
            {antet && <p className="mt-0.5 break-words">{antet}</p>}
          </div>
        )}
        {notita && (
          <p role="status" className="mb-3 rounded-lg bg-[var(--ci-green-soft)] px-3 py-2 text-[13px] text-[#17602f]">
            {notita}
          </p>
        )}
        {avertismente.length > 0 && (
          <ul role="status" className="mb-3 list-disc space-y-0.5 rounded-lg bg-[var(--ci-amber-soft)] py-2 pr-3 pl-7 text-[13px] text-[#7a3e00]">
            {avertismente.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        )}

        {stare.candidati.length > 0 ? (
          <>
            <p className="mb-2 text-xs leading-relaxed text-[var(--ci-text-muted)]">
              {d.intro} {areAi && d.introAi}
            </p>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => setSelectati(toti ? new Set() : new Set(stare.candidati.map((c) => c.id)))} className="min-h-10 px-1 text-[13px] font-medium text-[var(--ci-primary)] hover:underline">
                {toti ? d.niciunul : d.bifeazaTot}
              </button>
              <Button variant="primary" className={buton} onClick={aproba} loading={ocupat === "aproba"} disabled={pending || nrSel === 0}>
                {ocupat !== "aproba" && <UserCheck className="h-4 w-4" aria-hidden />} {ocupat === "aproba" ? d.aprobaBusy : d.aproba(nrSel)}
              </Button>
              <Button className={buton} onClick={respingeBifatii} disabled={pending || nrSel === 0}>
                <UserX className="h-4 w-4" aria-hidden /> {d.respingeBifatii(nrSel)}
              </Button>
            </div>
            {arataTelefon && (
              <label className="mb-2 flex cursor-pointer items-start gap-2 text-xs text-[var(--ci-text-muted)]">
                <input type="checkbox" className="mt-0.5 h-4 w-4" checked={cuTelefon} onChange={(e) => setCuTelefon(e.target.checked)} />
                <span>
                  <b>{d.cereTelefon}</b> — {d.cereTelefonText}
                </span>
              </label>
            )}
            {arataWaalaxy && (
              <label className="mb-2 flex min-h-8 cursor-pointer items-start gap-2 text-xs text-[var(--ci-text-muted)]">
                <input type="checkbox" className="mt-0.5 h-4 w-4" checked={inWaalaxy} onChange={(e) => setInWaalaxy(e.target.checked)} />
                <span>{d.trimiteWaalaxy}</span>
              </label>
            )}
            <ul className="space-y-2">
              {stare.candidati.map((c) => {
                const tel = tipTelefon(c.telefon);
                return (
                  <li key={c.id} className="rounded-lg border border-[var(--ci-border)] bg-[var(--ci-surface)] p-3">
                    <div className="flex items-start gap-3">
                      <input type="checkbox" className="mt-1 h-5 w-5 shrink-0" checked={selectati.has(c.id)} onChange={() => comuta(c.id)} aria-label={d.bifeaza(c.nume)} />
                      <div className="min-w-0 flex-1">
                        <p className="text-[14px] font-semibold break-words text-[var(--ci-text)]">
                          {c.nume}
                          {c.rol && <span className="font-normal text-[var(--ci-text-muted)]"> · {c.rol}</span>}
                        </p>
                        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--ci-text-muted)]">
                          {c.eticheta && (
                            <Badge tone="green" icon={false}>
                              {c.eticheta}
                            </Badge>
                          )}
                          {c.sursa === "web-ai" ? (
                            <span title={d.sursaInternetTitle}>
                              <Badge tone="teal" icon={false}>
                                {d.sursaInternet}
                              </Badge>
                            </span>
                          ) : (
                            <Badge tone="blue" icon={false}>
                              {eFurnizor(c.sursa) && <Image src={SIGLA[c.sursa]} alt="" aria-hidden width={14} height={14} unoptimized className="mr-1 inline h-3.5 w-3.5 rounded-sm bg-white object-contain" />}
                              {numeSursa(c.sursa)}
                            </Badge>
                          )}
                          {c.sursa === "web-ai" && c.sursaUrl && /^https?:\/\//i.test(c.sursaUrl) && (
                            <a href={c.sursaUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-[var(--ci-blue)] underline-offset-2 hover:underline">
                              {d.sursaLink} <ExternalLink className="h-3 w-3" aria-hidden />
                            </a>
                          )}
                          {c.alteSurse.length > 0 && <span>{d.gasitSiIn(c.alteSurse.map(numeSursa).join(", "))}</span>}
                          {c.dept && <span>{c.dept}</span>}
                          {c.email ? (
                            <span className="break-all">
                              {c.email}{" "}
                              {c.emailStatus === "valid" && (
                                <Badge tone="green" icon={false}>
                                  {ui.emailVerificat}
                                </Badge>
                              )}
                              {c.emailStatus === "risky" && (
                                <Badge tone="amber" icon={false}>
                                  {ui.emailRiscant}
                                </Badge>
                              )}
                            </span>
                          ) : (
                            <span>{c.linkedin ? ui.faraEmail : ui.faraDateContact}</span>
                          )}
                          {c.telefon && (
                            <span title={tel === "fix" ? d.telefonFixHint : tel === "mobil" ? d.telefonMobilHint : undefined}>
                              {tel === "fix" ? d.telefonFix : tel === "mobil" ? d.telefonMobil : "☎"} {c.telefon}
                            </span>
                          )}
                          {c.linkedin && (
                            <a href={c.linkedin} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-[var(--ci-blue)] underline-offset-2 hover:underline">
                              LinkedIn <ExternalLink className="h-3 w-3" aria-hidden />
                            </a>
                          )}
                          <span>{ui.gasit(vechime(c.gasitLa, locale))}</span>
                        </p>
                      </div>
                    </div>

                    {confirmaExcludere === c.id ? (
                      <div role="alertdialog" aria-label={ui.excludeAria(c.nume)} className="mt-2 rounded-md bg-[var(--ci-surface-2)] p-3 text-[13px] text-[var(--ci-text)]">
                        <p>
                          <strong>{c.nume}</strong> {ui.excludeText}
                        </p>
                        <div className="mt-2 flex gap-2">
                          <Button variant="danger" size="sm" className="min-h-10" disabled={pending} onClick={() => excludeComplet(c.id, c.nume)}>
                            {ui.confirmaExcluderea}
                          </Button>
                          <Button size="sm" className="min-h-10" onClick={() => setConfirmaExcludere(null)}>
                            {ui.renunta}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <button type="button" disabled={pending} onClick={() => setConfirmaExcludere(c.id)} className="mt-1 ml-8 min-h-8 text-xs text-[var(--ci-text-muted)] underline underline-offset-2 hover:text-[var(--ci-text)]">
                        {ui.ceaCerut}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
            {!stare.waalaxyGata && stare.candidati.some((c) => c.linkedin) && stare.esteAdmin && <p className="mt-2 text-xs text-[var(--ci-text-muted)]">{ui.waalaxyInfo}</p>}
          </>
        ) : (
          !faraChei &&
          !pending && (
            <p className="rounded-lg border border-dashed border-[var(--ci-border)] px-3 py-4 text-center text-[13px] text-[var(--ci-text-muted)]">{ui.nicioPersoana}</p>
          )
        )}

        <p className="mt-3 text-xs leading-relaxed text-[var(--ci-text-muted)]">
          <strong className="font-semibold text-[var(--ci-text)]">{ui.informareTitlu}</strong> {ui.informareText(stare.apeluriAzi, stare.limitaApeluri)}
        </p>
      </div>
    </Card>
  );
}
