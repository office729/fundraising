"use client";

import { ExternalLink, Search, UserCheck, UserX } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { vechime } from "@/lib/i18n/dictionaries/decidenti-ui";
import { COMPANII_UI_DICT } from "@/lib/i18n/dictionaries/companii-ui";
import { NUME_FURNIZOR, type Furnizor } from "@/lib/prospectare/motor";

import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardHeader } from "../../components/ui/card";
import { useLocale } from "../../lib/locale-context";
import { CrediteFurnizori } from "./credite-furnizori";
import { aprobaCandidatAction, cautaDecidentiPentruFirma, respingeCandidatAction, type RezultatActiune, type StareProspectare } from "./prospectare-actions";

// „Decidenți găsiți”: caută persoane de decizie pentru firmă cu conturile organizației (Apollo, Prospeo, Hunter, Lusha) și le păstrează în „De aprobat” până le aprobă cineva.
// La aprobare, persoana poate fi trimisă și în lista Waalaxy aleasă de organizație (abordare pe LinkedIn).
export function DecidentiCard({ orgSlug, companyId, stare }: { orgSlug: string; companyId: string; stare: StareProspectare }) {
  const router = useRouter();
  const locale = useLocale();
  const ui = COMPANII_UI_DICT[locale].decidenti;
  const [pending, startTransition] = useTransition();
  const [rezultat, setRezultat] = useState<RezultatActiune | null>(null);
  const [eroare, setEroare] = useState<string | null>(null);
  const [notita, setNotita] = useState<string | null>(null);
  const [avertisment, setAvertisment] = useState<string | null>(null);
  const [inWaalaxy, setInWaalaxy] = useState<Record<string, boolean>>({});
  const [confirmaExcludere, setConfirmaExcludere] = useState<string | null>(null);
  const [versiuneCredite, setVersiuneCredite] = useState(0); // crește după fiecare căutare, ca să se recitească creditele
  const faraChei = stare.furnizoriConfigurati.length === 0;
  const numeFurnizori = stare.furnizoriConfigurati.map((f: Furnizor) => NUME_FURNIZOR[f]);
  const areLinkedin = stare.candidati.some((c) => c.linkedin);

  // Notița de reușită dispare singură.
  useEffect(() => {
    if (!notita) return;
    const t = setTimeout(() => setNotita(null), 7000);
    return () => clearTimeout(t);
  }, [notita]);

  const cauta = (forteaza = false) =>
    startTransition(async () => {
      setEroare(null);
      setNotita(null);
      setAvertisment(null);
      setRezultat(null);
      const r = await cautaDecidentiPentruFirma(orgSlug, companyId, forteaza);
      setRezultat(r);
      setVersiuneCredite((v) => v + 1);
      router.refresh();
    });

  const ruleaza = (f: () => Promise<{ error: string | null; avertisment?: string }>, reusit: string) =>
    startTransition(async () => {
      setEroare(null);
      setNotita(null);
      setAvertisment(null);
      const r = await f();
      if (r.error) setEroare(r.error);
      else {
        setNotita(reusit);
        if (r.avertisment) setAvertisment(r.avertisment);
      }
      setConfirmaExcludere(null);
      router.refresh();
    });

  // Căutarea nu a reușit deloc (toți furnizorii au dat eroare) ≠ căutarea n-a găsit pe nimeni.
  const cautareEsuata = rezultat?.ok === true && (rezultat.noi ?? 0) === 0 && (rezultat.gasiti ?? 0) === 0 && (rezultat.avertismente?.length ?? 0) > 0;
  const deja = rezultat && !rezultat.ok ? rezultat.deja : undefined;
  const eroareCautare = rezultat && !rezultat.ok && !rezultat.deja ? rezultat.eroare : null;

  return (
    <Card>
      <div aria-busy={pending}>
        <CardHeader
          title={ui.titlu(stare.candidati.length)}
          subtitle={
            faraChei
              ? stare.esteAdmin
                ? ui.subtitluAdmin
                : ui.subtitluMembru
              : ui.subtitluCautare(numeFurnizori.join(", "))
          }
          action={
            faraChei ? (
              stare.esteAdmin ? (
                <Link href={`/${orgSlug}/crm/setari#prospectare`} className="inline-flex min-h-10 items-center rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] px-3 text-sm font-semibold text-[var(--ci-text)] hover:bg-[var(--ci-surface-2)]">
                  {ui.adaugaCheile}
                </Link>
              ) : null
            ) : (
              <Button variant="primary" className="min-h-10" onClick={() => cauta(false)} loading={pending}>
                <Search className="h-4 w-4" aria-hidden /> {pending ? ui.seCauta : ui.cautaBtn}
              </Button>
            )
          }
        />

        <CrediteFurnizori orgSlug={orgSlug} versiune={versiuneCredite} />

        {!faraChei && (
          <p className="mb-3 text-xs leading-relaxed text-[var(--ci-text-muted)]">
            {pending ? ui.seCautaLa(numeFurnizori.join(", ")) : ui.poateConsuma}
            {stare.ultimaCautare && !pending && (
              <>
                {" "}
                {ui.ultimaCautare(vechime(stare.ultimaCautare.la, locale), stare.ultimaCautare.deCine)}
              </>
            )}
          </p>
        )}

        {eroare && (
          <p role="alert" className="mb-3 rounded-lg bg-[var(--ci-red-soft)] px-3 py-2 text-[13px] text-[#9b1c1c]">
            {eroare}
          </p>
        )}
        {eroareCautare && (
          <p role="alert" className="mb-3 rounded-lg bg-[var(--ci-red-soft)] px-3 py-2 text-[13px] text-[#9b1c1c]">
            {eroareCautare}
          </p>
        )}
        {deja && (
          <div role="status" className="mb-3 rounded-lg bg-[var(--ci-amber-soft)] px-3 py-2 text-[13px] text-[#7a3e00]">
            <p>{ui.cautataRecent(vechime(deja.la, locale), deja.deCine, deja.poateForta)}</p>
            {deja.poateForta && (
              <div className="mt-2 flex gap-2">
                <Button variant="primary" size="sm" className="min-h-10" onClick={() => cauta(true)} disabled={pending}>
                  {ui.cautaDinNou}
                </Button>
                <Button size="sm" className="min-h-10" onClick={() => setRezultat(null)}>
                  {ui.renunta}
                </Button>
              </div>
            )}
          </div>
        )}
        {rezultat?.ok && cautareEsuata && (
          <div role="alert" className="mb-3 rounded-lg bg-[var(--ci-red-soft)] px-3 py-2 text-[13px] text-[#9b1c1c]">
            <p className="font-semibold">{ui.cautareIncompleta}</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-5">
              {rezultat.avertismente?.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
            <Button size="sm" className="mt-2 min-h-10" onClick={() => cauta(true)} disabled={pending || !stare.esteAdmin} title={stare.esteAdmin ? undefined : ui.doarAdminRepeta}>
              {ui.incearcaDinNou}
            </Button>
          </div>
        )}
        {rezultat?.ok && !cautareEsuata && (
          <div role="status" className="mb-3 rounded-lg bg-[var(--ci-surface-2)] px-3 py-2 text-[13px] text-[var(--ci-text-muted)]">
            <p>
              {rezultat.noi
                ? ui.amGasit(rezultat.noi)
                : rezultat.gasiti
                  ? ui.dejaInContacte
                  : ui.niciuna}
            </p>
            {rezultat.avertismente && rezultat.avertismente.length > 0 && (
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-[#7a3e00]">
                {rezultat.avertismente.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            )}
          </div>
        )}
        {notita && (
          <p role="status" className="mb-3 rounded-lg bg-[var(--ci-green-soft)] px-3 py-2 text-[13px] text-[#17602f]">
            {notita}
          </p>
        )}
        {avertisment && (
          <p role="status" className="mb-3 rounded-lg bg-[var(--ci-amber-soft)] px-3 py-2 text-[13px] text-[#7a3e00]">
            {avertisment}
          </p>
        )}

        {stare.candidati.length > 0 ? (
          <>
            <p className="mb-2 text-xs text-[var(--ci-text-muted)]">{ui.deAprobatOrdonate}</p>
            <ul className="space-y-2">
              {stare.candidati.map((c) => {
                const trimiteWaalaxy = Boolean(inWaalaxy[c.id] && c.linkedin);
                return (
                  <li key={c.id} className="rounded-lg border border-[var(--ci-border)] bg-[var(--ci-surface)] p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[14px] font-semibold text-[var(--ci-text)]">
                          {c.nume}
                          {c.rol && <span className="font-normal text-[var(--ci-text-muted)]"> · {c.rol}</span>}
                        </p>
                        <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--ci-text-muted)]">
                          {c.eticheta && (
                            <Badge tone="green" icon={false}>
                              {c.eticheta}
                            </Badge>
                          )}
                          <Badge tone="blue" icon={false}>
                            {NUME_FURNIZOR[c.sursa as Furnizor] ?? c.sursa}
                          </Badge>
                          {c.dept && <span>{c.dept}</span>}
                          {c.email ? (
                            <span>
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
                          {c.linkedin && (
                            <a href={c.linkedin} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-[var(--ci-blue)] underline-offset-2 hover:underline">
                              LinkedIn <ExternalLink className="h-3 w-3" aria-hidden />
                            </a>
                          )}
                          <span>{ui.gasit(vechime(c.gasitLa, locale))}</span>
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          variant="primary"
                          className="min-h-10"
                          disabled={pending}
                          aria-label={ui.adaugaAria(trimiteWaalaxy, c.nume)}
                          onClick={() => ruleaza(() => aprobaCandidatAction(orgSlug, c.id, trimiteWaalaxy), ui.adaugat(c.nume, trimiteWaalaxy))}
                        >
                          <UserCheck className="h-4 w-4" aria-hidden /> {trimiteWaalaxy ? ui.adaugaSiTrimite : ui.adaugaLaContacte}
                        </Button>
                        <Button className="min-h-10" disabled={pending} aria-label={ui.respingeAria(c.nume)} onClick={() => ruleaza(() => respingeCandidatAction(orgSlug, c.id, false), ui.respins(c.nume))}>
                          <UserX className="h-4 w-4" aria-hidden /> {ui.respinge}
                        </Button>
                      </div>
                    </div>

                    {stare.waalaxyGata && c.linkedin && (
                      <label className="mt-2 flex min-h-8 items-center gap-2 py-1 text-xs text-[var(--ci-text-muted)]">
                        <input type="checkbox" className="h-4 w-4" checked={Boolean(inWaalaxy[c.id])} onChange={(e) => setInWaalaxy((v) => ({ ...v, [c.id]: e.target.checked }))} />
                        {ui.trimiteWaalaxyBifa}
                      </label>
                    )}

                    {confirmaExcludere === c.id ? (
                      <div role="alertdialog" aria-label={ui.excludeAria(c.nume)} className="mt-2 rounded-md bg-[var(--ci-surface-2)] p-3 text-[13px] text-[var(--ci-text)]">
                        <p>
                          <strong>{c.nume}</strong> {ui.excludeText}
                        </p>
                        <div className="mt-2 flex gap-2">
                          <Button variant="danger" size="sm" className="min-h-10" disabled={pending} onClick={() => ruleaza(() => respingeCandidatAction(orgSlug, c.id, true), ui.exclus(c.nume))}>
                            {ui.confirmaExcluderea}
                          </Button>
                          <Button size="sm" className="min-h-10" onClick={() => setConfirmaExcludere(null)}>
                            {ui.renunta}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <button type="button" disabled={pending} onClick={() => setConfirmaExcludere(c.id)} className="mt-1 min-h-8 text-xs text-[var(--ci-text-muted)] underline underline-offset-2 hover:text-[var(--ci-text)]">
                        {ui.ceaCerut}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
            {!stare.waalaxyGata && areLinkedin && stare.esteAdmin && (
              <p className="mt-2 text-xs text-[var(--ci-text-muted)]">{ui.waalaxyInfo}</p>
            )}
          </>
        ) : (
          !faraChei &&
          !pending && (
            <p className="rounded-lg border border-dashed border-[var(--ci-border)] px-3 py-4 text-center text-[13px] text-[var(--ci-text-muted)]">
              {ui.nicioPersoana}
            </p>
          )
        )}

        <p className="mt-3 text-xs leading-relaxed text-[var(--ci-text-muted)]">
          <strong className="font-semibold text-[var(--ci-text)]">{ui.informareTitlu}</strong> {ui.informareText(stare.apeluriAzi, stare.limitaApeluri)}
        </p>
      </div>
    </Card>
  );
}
