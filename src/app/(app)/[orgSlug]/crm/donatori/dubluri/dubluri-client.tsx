"use client";

import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";

import { imbinaDonatoriAction, respingeGrupDubluAction, restaureazaDubluriRespinseAction, type DateDubluri, type GrupDublu } from "./actions";

const nr = (n: number) => n.toLocaleString("ro-RO");
const dataRo = (iso: string) => new Date(iso).toLocaleDateString("ro-RO", { timeZone: "Europe/Bucharest", day: "2-digit", month: "2-digit", year: "numeric" });
const NUME_MOTIV: Record<string, string> = { email: "aceeași adresă de e-mail (scrisă puțin diferit)", telefon: "același telefon", "nume+localitate": "același nume și aceeași localitate" };

function Grup({ g, orgSlug, poateImbina, laGata }: { g: GrupDublu; orgSlug: string; poateImbina: boolean; laGata: (m: string) => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // La „probabil aceeași persoană” e propus donatorul cu cele mai multe donații; la „posibil” alegerea rămâne a omului (nimic ales din oficiu).
  const [pastrat, setPastrat] = useState(g.incredere === "mare" ? g.sugerat : "");
  // Grupurile de 2 donatori unesc perechea; la 3 sau mai mulți bifezi tu cine se unește (nimic bifat din oficiu).
  const pereche = g.membri.length === 2;
  const [bifati, setBifati] = useState<Set<string>>(new Set());
  const [confirma, setConfirma] = useState(false);
  const [eroare, setEroare] = useState<string | null>(null);

  const secundari = g.membri.filter((m) => m.id !== pastrat && (pereche || bifati.has(m.id)));
  const principal = g.membri.find((m) => m.id === pastrat);
  const blocati = secundari.filter((m) => m.abonamentActiv);

  const imbina = () =>
    startTransition(async () => {
      setEroare(null);
      const r = await imbinaDonatoriAction(orgSlug, pastrat, secundari.map((m) => m.id));
      if (!r.ok) {
        setEroare(r.eroare);
        return;
      }
      laGata(`${r.imbinati === 1 ? "Un donator a fost unit" : `${r.imbinati} donatori au fost uniți`} cu ${principal?.nume ?? "donatorul păstrat"}: ${nr(r.donatiiMutate + r.importuriMutate)} donații și ${nr(r.notiteMutate)} notițe au trecut la el.`);
      window.scrollTo({ top: 0, behavior: "smooth" });
      router.refresh();
    });

  const persoaneDiferite = () =>
    startTransition(async () => {
      setEroare(null);
      const r = await respingeGrupDubluAction(orgSlug, g.membri.map((m) => m.id));
      if (!r.ok) {
        setEroare(r.eroare);
        return;
      }
      laGata("Grupul nu va mai fi propus (decât dacă apare în el un donator nou). Nu s-a schimbat nimic la donatori.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      router.refresh();
    });

  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Badge tone={g.incredere === "mare" ? "amber" : "neutral"} icon={false}>
          {g.incredere === "mare" ? "Probabil aceeași persoană" : "Posibil aceeași persoană"}
        </Badge>
        <span className="text-[12.5px] text-[var(--ci-text-muted)]">după {g.motive.map((m) => NUME_MOTIV[m] ?? m).join(", ")}</span>
      </div>
      <fieldset>
        <legend className="sr-only">Donatori care par aceeași persoană: alege pe cine păstrezi</legend>
        <ul className="space-y-2">
          {g.membri.map((m) => {
            const esteDePastrat = m.id === pastrat;
            const sugerat = m.id === g.sugerat && g.incredere === "mare";
            return (
              <li key={m.id} className={`rounded-[var(--ci-radius-btn)] border p-3 ${esteDePastrat ? "border-[var(--ci-primary)] bg-[var(--ci-primary-soft)]" : "border-[var(--ci-border)] bg-[var(--ci-surface)]"}`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold text-[var(--ci-text)]">
                      {m.nume}{" "}
                      {sugerat && (
                        <Badge tone="blue" icon={false}>
                          sugerat: are cele mai multe donații
                        </Badge>
                      )}
                    </p>
                    <p className="break-all text-[12.5px] text-[var(--ci-text-muted)]">
                      {m.email}
                      {m.telefon ? ` · ${m.telefon}` : ""}
                      {m.localitate ? ` · ${m.localitate}` : ""}
                    </p>
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-[12.5px] text-[var(--ci-text-muted)]">
                      {nr(m.numarDonatii)} {m.numarDonatii === 1 ? "donație" : "donații"} · {nr(m.totalDonat)} lei · prima {dataRo(m.primaDonatieLa)} · ultima {dataRo(m.ultimaDonatieLa)}
                      {m.dezabonat && (
                        <Badge tone="amber" icon={false}>
                          dezabonat de la e-mailuri
                        </Badge>
                      )}
                      {m.abonamentActiv && (
                        <Badge tone="blue" icon={false}>
                          donație lunară activă
                        </Badge>
                      )}
                    </p>
                    {m.abonamentActiv && poateImbina && !esteDePastrat && (
                      <p className="mt-1 flex items-start gap-1.5 text-[12.5px] text-[#7a3e00]">
                        <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden /> Nu poate fi unit cât timp are donație lunară activă: următoarea plată ar recrea donatorul. Oprește abonamentul din Stripe, apoi revino.
                      </p>
                    )}
                    <Link href={`/${orgSlug}/crm/donatori/${m.id}`} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex min-h-9 items-center text-[12.5px] font-semibold text-[var(--ci-primary)] underline">
                      Deschide fișa donatorului (într-o filă nouă)
                    </Link>
                  </div>
                  {poateImbina && (
                    <div className="flex flex-col items-end gap-1 text-[12.5px]">
                      <label className="flex min-h-11 cursor-pointer items-center gap-2">
                        <input
                          type="radio"
                          name={`pastrat-${g.membri[0].id}`}
                          className="size-5"
                          aria-label={`Păstrează pe ${m.nume} (${m.email})`}
                          checked={esteDePastrat}
                          onChange={() => {
                            setPastrat(m.id);
                            setBifati(new Set());
                            setConfirma(false);
                          }}
                        />
                        Păstrează acesta
                      </label>
                      {!pereche && !esteDePastrat && pastrat !== "" && (
                        <label className="flex min-h-11 cursor-pointer items-center gap-2">
                          <input
                            type="checkbox"
                            className="size-5"
                            aria-label={`Unește pe ${m.nume} (${m.email}) cu donatorul păstrat`}
                            checked={bifati.has(m.id)}
                            onChange={(e) => {
                              setBifati((s) => {
                                const n = new Set(s);
                                if (e.target.checked) n.add(m.id);
                                else n.delete(m.id);
                                return n;
                              });
                              setConfirma(false);
                            }}
                          />
                          Unește cu cel păstrat
                        </label>
                      )}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </fieldset>

      {poateImbina ? (
        <div className="mt-3">
          {eroare && (
            <p role="alert" className="mb-2 rounded-lg bg-[var(--ci-red-soft)] px-3 py-2 text-[13px] text-[#9b1c1c]">
              {eroare}
            </p>
          )}
          {!confirma ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="primary" className="min-h-11" disabled={secundari.length === 0 || pastrat === "" || blocati.length > 0 || pending} onClick={() => setConfirma(true)}>
                {pastrat === "" ? "Alege mai întâi pe cine păstrezi" : secundari.length === 0 ? "Bifează donatorii de unit" : `Unește ${secundari.length} ${secundari.length === 1 ? "donator" : "donatori"} în ${principal?.nume ?? ""}`}
              </Button>
              <Button className="min-h-11" loading={pending} disabled={pending} onClick={persoaneDiferite}>
                Sunt persoane diferite
              </Button>
            </div>
          ) : (
            <div role="group" aria-label="Confirmă unirea" className="rounded-lg bg-[var(--ci-surface-2)] p-3 text-[13px] text-[var(--ci-text)]">
              <p className="font-semibold">Nu se poate anula. Confirmi unirea?</p>
              <ul className="mt-1.5 list-disc space-y-1 pl-5 text-[12.5px]">
                <li>
                  Rămâne: <strong>{principal?.nume}</strong> ({principal?.email}). Dispar din listă: {secundari.map((m) => `${m.nume} (${m.email})`).join("; ")}.
                </li>
                <li>Donațiile, importurile și notițele lor trec la donatorul păstrat; telefonul, localitatea și județul lipsă se completează. Adresele vechi nu se păstrează: o donație nouă făcută cu una dintre ele ar crea din nou un donator separat.</li>
                <li>Acordul pentru e-mailuri nu se mută de pe o adresă pe alta: dacă ai ales un donator care n-a fost întrebat, rămâne „necunoscut”, chiar dacă celălalt a bifat. Refuzul sau dezabonarea oricăruia rămâne valabilă.</li>
                <li>Se înregistrează în jurnal (fără datele personale ale celor uniți).</li>
              </ul>
              <div className="mt-3 flex gap-2">
                <Button variant="danger" className="min-h-11" loading={pending} onClick={imbina}>
                  Da, unește
                </Button>
                <Button className="min-h-11" disabled={pending} onClick={() => setConfirma(false)}>
                  Renunță
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="mt-3 text-[12.5px] text-[var(--ci-text-muted)]">Doar un administrator poate uni donatori.</p>
      )}
    </Card>
  );
}

export function DubluriClient({ orgSlug, date }: { orgSlug: string; date: DateDubluri }) {
  const router = useRouter();
  const [mesaj, setMesaj] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <div className="space-y-4">
      {mesaj && (
        <p role="status" className="rounded-lg bg-[var(--ci-green-soft)] px-3 py-2 text-[13px] text-[#17602f]">
          {mesaj}
        </p>
      )}
      {date.grupuri.length === 0 ? (
        <Card>
          <p className="text-center text-[13px] text-[var(--ci-text-muted)]">
            Totul e în ordine: nu există donatori care par aceeași persoană. Pagina verifică din nou de fiecare dată când o deschizi: după adresa de e-mail, telefon și nume cu localitate.
          </p>
        </Card>
      ) : (
        <>
          <p className="text-[13px] text-[var(--ci-text-muted)]">
            {nr(date.total)} {date.total === 1 ? "grup" : "grupuri"} de verificat{date.total > date.grupuri.length ? ` (se arată primele ${nr(date.grupuri.length)}, cele mai sigure întâi)` : ""}.
          </p>
          {date.grupuri.map((g) => (
            <Grup key={g.membri.map((m) => m.id).join("-")} g={g} orgSlug={orgSlug} poateImbina={date.poateImbina} laGata={setMesaj} />
          ))}
        </>
      )}
      {date.ignorate > 0 && date.poateImbina && (
        <p className="text-[12.5px] text-[var(--ci-text-muted)]">
          {nr(date.ignorate)} {date.ignorate === 1 ? "grup marcat" : "grupuri marcate"} „Sunt persoane diferite”.{" "}
          <button
            type="button"
            className="min-h-9 font-semibold text-[var(--ci-primary)] underline disabled:opacity-50"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const r = await restaureazaDubluriRespinseAction(orgSlug);
                setMesaj(r.ok ? "Grupurile ignorate vor fi propuse din nou." : r.eroare);
                if (r.ok) router.refresh();
              })
            }
          >
            Afișează-le din nou
          </button>
        </p>
      )}
    </div>
  );
}
