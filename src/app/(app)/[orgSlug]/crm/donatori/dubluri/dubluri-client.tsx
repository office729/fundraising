"use client";

import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { DONATORI_UI3_DICT } from "@/lib/i18n/dictionaries/donatori-ui-3";

import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { useLocale } from "../../lib/locale-context";
import { formatariPf } from "../pf-format";

import { imbinaDonatoriAction, respingeGrupDubluAction, restaureazaDubluriRespinseAction, type DateDubluri, type GrupDublu } from "./actions";

function Grup({ g, orgSlug, poateImbina, laGata }: { g: GrupDublu; orgSlug: string; poateImbina: boolean; laGata: (m: string) => void }) {
  const router = useRouter();
  const locale = useLocale();
  const t = DONATORI_UI3_DICT[locale].dubluri;
  const { nr, data: dataRo } = formatariPf(locale);
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
      laGata(t.unit(r.imbinati, principal?.nume ?? t.donatorulPastrat, nr(r.donatiiMutate + r.importuriMutate), nr(r.notiteMutate)));
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
      laGata(t.grupRespins);
      window.scrollTo({ top: 0, behavior: "smooth" });
      router.refresh();
    });

  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Badge tone={g.incredere === "mare" ? "amber" : "neutral"} icon={false}>
          {g.incredere === "mare" ? t.probabil : t.posibil}
        </Badge>
        <span className="text-[12.5px] text-[var(--ci-text-muted)]">{t.dupa} {g.motive.map((m) => t.motive[m] ?? m).join(", ")}</span>
      </div>
      <fieldset>
        <legend className="sr-only">{t.legenda}</legend>
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
                          {t.sugerat}
                        </Badge>
                      )}
                    </p>
                    <p className="break-all text-[12.5px] text-[var(--ci-text-muted)]">
                      {m.email}
                      {m.telefon ? ` · ${m.telefon}` : ""}
                      {m.localitate ? ` · ${m.localitate}` : ""}
                    </p>
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-[12.5px] text-[var(--ci-text-muted)]">
                      {nr(m.numarDonatii)} {m.numarDonatii === 1 ? t.donatie : t.donatii} · {nr(m.totalDonat)} lei · {t.prima} {dataRo(m.primaDonatieLa)} · {t.ultima} {dataRo(m.ultimaDonatieLa)}
                      {m.dezabonat && (
                        <Badge tone="amber" icon={false}>
                          {t.dezabonat}
                        </Badge>
                      )}
                      {m.abonamentActiv && (
                        <Badge tone="blue" icon={false}>
                          {t.lunaraActiva}
                        </Badge>
                      )}
                    </p>
                    {m.abonamentActiv && poateImbina && !esteDePastrat && (
                      <p className="mt-1 flex items-start gap-1.5 text-[12.5px] text-[#7a3e00]">
                        <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden /> {t.blocat}
                      </p>
                    )}
                    <Link href={`/${orgSlug}/crm/donatori/${m.id}`} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex min-h-9 items-center text-[12.5px] font-semibold text-[var(--ci-primary)] underline">
                      {t.deschideFisa}
                    </Link>
                  </div>
                  {poateImbina && (
                    <div className="flex flex-col items-end gap-1 text-[12.5px]">
                      <label className="flex min-h-11 cursor-pointer items-center gap-2">
                        <input
                          type="radio"
                          name={`pastrat-${g.membri[0].id}`}
                          className="size-5"
                          aria-label={t.pastreazaAria(m.nume, m.email)}
                          checked={esteDePastrat}
                          onChange={() => {
                            setPastrat(m.id);
                            setBifati(new Set());
                            setConfirma(false);
                          }}
                        />
                        {t.pastreazaAcesta}
                      </label>
                      {!pereche && !esteDePastrat && pastrat !== "" && (
                        <label className="flex min-h-11 cursor-pointer items-center gap-2">
                          <input
                            type="checkbox"
                            className="size-5"
                            aria-label={t.uneste(m.nume, m.email)}
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
                          {t.unesteCuCel}
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
                {pastrat === "" ? t.alegeMaiIntai : secundari.length === 0 ? t.bifeaza : t.unesteN(secundari.length, principal?.nume ?? "")}
              </Button>
              <Button className="min-h-11" loading={pending} disabled={pending} onClick={persoaneDiferite}>
                {t.suntDiferite}
              </Button>
            </div>
          ) : (
            <div role="group" aria-label={t.confirmaAria} className="rounded-lg bg-[var(--ci-surface-2)] p-3 text-[13px] text-[var(--ci-text)]">
              <p className="font-semibold">{t.confirmaTitlu}</p>
              <ul className="mt-1.5 list-disc space-y-1 pl-5 text-[12.5px]">
                <li>
                  {t.ramane} <strong>{principal?.nume}</strong> ({principal?.email}). {t.dispar} {secundari.map((m) => `${m.nume} (${m.email})`).join("; ")}.
                </li>
                <li>{t.confirma1}</li>
                <li>{t.confirma2}</li>
                <li>{t.confirma3}</li>
              </ul>
              <div className="mt-3 flex gap-2">
                <Button variant="danger" className="min-h-11" loading={pending} onClick={imbina}>
                  {t.daUneste}
                </Button>
                <Button className="min-h-11" disabled={pending} onClick={() => setConfirma(false)}>
                  {t.renunta}
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="mt-3 text-[12.5px] text-[var(--ci-text-muted)]">{t.doarAdmin}</p>
      )}
    </Card>
  );
}

export function DubluriClient({ orgSlug, date }: { orgSlug: string; date: DateDubluri }) {
  const router = useRouter();
  const locale = useLocale();
  const t = DONATORI_UI3_DICT[locale].dubluri;
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
            {t.totulOk}
          </p>
        </Card>
      ) : (
        <>
          <p className="text-[13px] text-[var(--ci-text-muted)]">
            {t.deVerificat(date.total, date.total > date.grupuri.length ? date.grupuri.length : null)}
          </p>
          {date.grupuri.map((g) => (
            <Grup key={g.membri.map((m) => m.id).join("-")} g={g} orgSlug={orgSlug} poateImbina={date.poateImbina} laGata={setMesaj} />
          ))}
        </>
      )}
      {date.ignorate > 0 && date.poateImbina && (
        <p className="text-[12.5px] text-[var(--ci-text-muted)]">
          {t.ignorate(date.ignorate)}{" "}
          <button
            type="button"
            className="min-h-9 font-semibold text-[var(--ci-primary)] underline disabled:opacity-50"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const r = await restaureazaDubluriRespinseAction(orgSlug);
                setMesaj(r.ok ? t.restaurate : r.eroare);
                if (r.ok) router.refresh();
              })
            }
          >
            {t.afiseazaDinNou}
          </button>
        </p>
      )}
    </div>
  );
}
