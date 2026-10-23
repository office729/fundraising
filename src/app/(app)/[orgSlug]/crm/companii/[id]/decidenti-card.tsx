"use client";

import { ExternalLink, Search, UserCheck, UserX } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { vechime } from "@/lib/prospectare/afisare";
import { NUME_FURNIZOR, type Furnizor } from "@/lib/prospectare/motor";

import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardHeader } from "../../components/ui/card";
import { CrediteFurnizori } from "./credite-furnizori";
import { aprobaCandidatAction, cautaDecidentiPentruFirma, respingeCandidatAction, type RezultatActiune, type StareProspectare } from "./prospectare-actions";

// „Decidenți găsiți”: caută persoane de decizie pentru firmă cu conturile organizației (Apollo, Prospeo, Hunter, Lusha) și le păstrează în „De aprobat” până le aprobă cineva.
// La aprobare, persoana poate fi trimisă și în lista Waalaxy aleasă de organizație (abordare pe LinkedIn).
export function DecidentiCard({ orgSlug, companyId, stare }: { orgSlug: string; companyId: string; stare: StareProspectare }) {
  const router = useRouter();
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
          title={`Decidenți găsiți${stare.candidati.length ? ` (${stare.candidati.length})` : ""}`}
          subtitle={
            faraChei
              ? stare.esteAdmin
                ? "Adaugă conturile tale de la Apollo, Prospeo, Hunter sau Lusha ca să cauți decidenți pentru firmă."
                : "Nicio cheie conectată. Cere unui administrator al organizației să le adauge în Setări → Prospectare."
              : `Căutare cu conturile tale la ${numeFurnizori.join(", ")}. Persoanele găsite devin contacte abia după ce le aprobi.`
          }
          action={
            faraChei ? (
              stare.esteAdmin ? (
                <Link href={`/${orgSlug}/crm/setari#prospectare`} className="inline-flex min-h-10 items-center rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] px-3 text-sm font-semibold text-[var(--ci-text)] hover:bg-[var(--ci-surface-2)]">
                  Adaugă cheile
                </Link>
              ) : null
            ) : (
              <Button variant="primary" className="min-h-10" onClick={() => cauta(false)} loading={pending}>
                <Search className="h-4 w-4" aria-hidden /> {pending ? "Se caută…" : "Caută decidenți"}
              </Button>
            )
          }
        />

        <CrediteFurnizori orgSlug={orgSlug} versiune={versiuneCredite} />

        {!faraChei && (
          <p className="mb-3 text-xs leading-relaxed text-[var(--ci-text-muted)]">
            {pending ? `Se caută la ${numeFurnizori.join(", ")}; poate dura până la un minut.` : "Poate consuma credite din conturile conectate (de regulă câteva)."}
            {stare.ultimaCautare && !pending && (
              <>
                {" "}
                Ultima căutare: {vechime(stare.ultimaCautare.la)}
                {stare.ultimaCautare.deCine ? `, de ${stare.ultimaCautare.deCine}` : ""}.
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
            <p>
              Firma a fost căutată {vechime(deja.la)}
              {deja.deCine ? `, de ${deja.deCine}` : ""}. {deja.poateForta ? "O nouă căutare consumă din nou credite din conturile tale." : "Un administrator poate repeta căutarea dacă e nevoie."}
            </p>
            {deja.poateForta && (
              <div className="mt-2 flex gap-2">
                <Button variant="primary" size="sm" className="min-h-10" onClick={() => cauta(true)} disabled={pending}>
                  Caută din nou
                </Button>
                <Button size="sm" className="min-h-10" onClick={() => setRezultat(null)}>
                  Renunță
                </Button>
              </div>
            )}
          </div>
        )}
        {rezultat?.ok && cautareEsuata && (
          <div role="alert" className="mb-3 rounded-lg bg-[var(--ci-red-soft)] px-3 py-2 text-[13px] text-[#9b1c1c]">
            <p className="font-semibold">Căutarea nu a putut fi făcută complet, deci nu înseamnă că firma nu are decidenți.</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-5">
              {rezultat.avertismente?.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
            <Button size="sm" className="mt-2 min-h-10" onClick={() => cauta(true)} disabled={pending || !stare.esteAdmin} title={stare.esteAdmin ? undefined : "Doar un administrator poate repeta o căutare recentă."}>
              Încearcă din nou
            </Button>
          </div>
        )}
        {rezultat?.ok && !cautareEsuata && (
          <div role="status" className="mb-3 rounded-lg bg-[var(--ci-surface-2)] px-3 py-2 text-[13px] text-[var(--ci-text-muted)]">
            <p>
              {rezultat.noi
                ? `Am găsit ${rezultat.noi} ${rezultat.noi === 1 ? "persoană nouă" : "persoane noi"} pentru aprobare.`
                : rezultat.gasiti
                  ? "Persoanele găsite erau deja în contacte sau în lista ta."
                  : "Nu am găsit persoane noi pentru această firmă."}
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
            <p className="mb-2 text-xs text-[var(--ci-text-muted)]">De aprobat, ordonate după cât de probabil decid ele sponsorizarea:</p>
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
                                  e-mail verificat
                                </Badge>
                              )}
                              {c.emailStatus === "risky" && (
                                <Badge tone="amber" icon={false}>
                                  e-mail riscant
                                </Badge>
                              )}
                            </span>
                          ) : (
                            <span>{c.linkedin ? "fără e-mail" : "fără date de contact"}</span>
                          )}
                          {c.linkedin && (
                            <a href={c.linkedin} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-[var(--ci-blue)] underline-offset-2 hover:underline">
                              LinkedIn <ExternalLink className="h-3 w-3" aria-hidden />
                            </a>
                          )}
                          <span>găsit {vechime(c.gasitLa)}</span>
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          variant="primary"
                          className="min-h-10"
                          disabled={pending}
                          aria-label={`${trimiteWaalaxy ? "Adaugă la contacte și trimite în Waalaxy" : "Adaugă la contacte"}: ${c.nume}`}
                          onClick={() => ruleaza(() => aprobaCandidatAction(orgSlug, c.id, trimiteWaalaxy), `${c.nume} a fost adăugat(ă) la contacte${trimiteWaalaxy ? " și trimis(ă) în Waalaxy" : ""}. Primul contact: în 2 zile lucrătoare, vezi „De contactat azi”. Informează persoana despre prelucrarea datelor (art. 14 GDPR).`)}
                        >
                          <UserCheck className="h-4 w-4" aria-hidden /> {trimiteWaalaxy ? "Adaugă și trimite în Waalaxy" : "Adaugă la contacte"}
                        </Button>
                        <Button className="min-h-10" disabled={pending} aria-label={`Respinge: ${c.nume}`} onClick={() => ruleaza(() => respingeCandidatAction(orgSlug, c.id, false), `${c.nume} a fost respins(ă) și nu mai e propus(ă) pentru această firmă.`)}>
                          <UserX className="h-4 w-4" aria-hidden /> Respinge
                        </Button>
                      </div>
                    </div>

                    {stare.waalaxyGata && c.linkedin && (
                      <label className="mt-2 flex min-h-8 items-center gap-2 py-1 text-xs text-[var(--ci-text-muted)]">
                        <input type="checkbox" className="h-4 w-4" checked={Boolean(inWaalaxy[c.id])} onChange={(e) => setInWaalaxy((v) => ({ ...v, [c.id]: e.target.checked }))} />
                        La adăugare: trimite-o și în Waalaxy (abordare pe LinkedIn)
                      </label>
                    )}

                    {confirmaExcludere === c.id ? (
                      <div role="alertdialog" aria-label={`Exclude ${c.nume} de la prospectare`} className="mt-2 rounded-md bg-[var(--ci-surface-2)] p-3 text-[13px] text-[var(--ci-text)]">
                        <p>
                          <strong>{c.nume}</strong> a cerut să nu fie contactată. Nu va mai fi propusă pentru nicio firmă a organizației (poți anula excluderea din Setări → Prospectare).
                        </p>
                        <div className="mt-2 flex gap-2">
                          <Button variant="danger" size="sm" className="min-h-10" disabled={pending} onClick={() => ruleaza(() => respingeCandidatAction(orgSlug, c.id, true), `${c.nume} a fost exclus(ă) de la prospectare, pentru toate firmele.`)}>
                            Confirmă excluderea
                          </Button>
                          <Button size="sm" className="min-h-10" onClick={() => setConfirmaExcludere(null)}>
                            Renunță
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <button type="button" disabled={pending} onClick={() => setConfirmaExcludere(c.id)} className="mt-1 min-h-8 text-xs text-[var(--ci-text-muted)] underline underline-offset-2 hover:text-[var(--ci-text)]">
                        Ea a cerut să nu fie contactată
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
            {!stare.waalaxyGata && areLinkedin && stare.esteAdmin && (
              <p className="mt-2 text-xs text-[var(--ci-text-muted)]">Poți trimite persoanele și în Waalaxy, pentru abordare pe LinkedIn, după ce conectezi contul și alegi o listă în Setări → Prospectare.</p>
            )}
          </>
        ) : (
          !faraChei &&
          !pending && (
            <p className="rounded-lg border border-dashed border-[var(--ci-border)] px-3 py-4 text-center text-[13px] text-[var(--ci-text-muted)]">
              Nicio persoană de aprobat. Apasă „Caută decidenți” ca să vezi cine decide sponsorizările la această firmă.
            </p>
          )
        )}

        <p className="mt-3 text-xs leading-relaxed text-[var(--ci-text-muted)]">
          <strong className="font-semibold text-[var(--ci-text)]">Informarea persoanelor (art. 14 GDPR).</strong> Datele lor vin de la un terț: după ce le adaugi, informează-le despre prelucrare cât mai repede și în cel mult 30 de zile; la primul contact, spune-le sursa datelor. Azi: {stare.apeluriAzi} din {stare.limitaApeluri}{" "}
          apeluri către instrumente.
        </p>
      </div>
    </Card>
  );
}
