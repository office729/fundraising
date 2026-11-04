"use client";

import { CheckCircle2, Loader2, MailOpen, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import type { EtichetaRaspuns } from "@/lib/agent-email/reguli";
import type { DatePaginaAgent, MesajClient } from "@/lib/agent-email/tipuri";
import { AGENT_EMAIL_UI_DICT } from "@/lib/i18n/dictionaries/agent-email-ui";

import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { useLocale } from "../lib/locale-context";
import { marcheazaRaspunsCitit, verificaRaspunsuriAcum } from "./actions";
import { areRaspunsReal, fmtDataOra, raspunsNecitit, type Anunta } from "./comun";

type Filtru = "toate" | "raspuns" | "deschise" | "nedeschise" | "fara";

const CULOARE: Record<EtichetaRaspuns, string> = {
  interesat: "bg-[var(--ci-green-soft)] text-[var(--ci-green)]",
  detalii: "bg-[var(--ci-green-soft)] text-[var(--ci-green)]",
  nu_acum: "bg-amber-100 text-amber-800",
  refuz: "bg-[var(--ci-red-soft)] text-[var(--ci-red)]",
  alt_contact: "bg-sky-100 text-sky-800",
  stop: "bg-[var(--ci-red-soft)] text-[var(--ci-red)]",
  automat: "bg-[var(--ci-surface-2)] text-[var(--ci-text-muted)]",
  altul: "bg-sky-100 text-sky-800",
};

export function TrimiseTab({ orgSlug, date, anunta }: { orgSlug: string; date: DatePaginaAgent; anunta: Anunta }) {
  const locale = useLocale();
  const d = AGENT_EMAIL_UI_DICT[locale].trimise;
  const router = useRouter();
  const [seCiteste, startCitire] = useTransition();
  const [ocupat, start] = useTransition();
  const [filtru, setFiltru] = useState<Filtru>("toate");
  const [deschis, setDeschis] = useState<string | null>(null);
  const trimise = date.mesaje.filter((m) => m.stare === "trimis");
  if (!trimise.length) return <Card className="text-[13px] text-[var(--ci-text-muted)]">{d.gol}</Card>;

  const ultimaActivitate = (m: MesajClient) => m.raspunsuri[0]?.primitLa ?? m.trimisLa ?? m.creat;
  const ord = [...trimise].sort((a, b) => Number(raspunsNecitit(b)) - Number(raspunsNecitit(a)) || ultimaActivitate(b).localeCompare(ultimaActivitate(a)));
  const cuRaspuns = trimise.filter(areRaspunsReal).length;
  const deschise = trimise.filter((m) => m.deschis || m.raspunsuri.length).length;
  const necitite = trimise.filter(raspunsNecitit).length;
  const pct = (a: number) => Math.round((a / trimise.length) * 100);
  const vizibile = ord.filter((m) =>
    filtru === "raspuns" ? areRaspunsReal(m) : filtru === "fara" ? !areRaspunsReal(m) : filtru === "deschise" ? Boolean(m.deschis || m.raspunsuri.length) : filtru === "nedeschise" ? !m.deschis && !m.raspunsuri.length : true,
  );

  return (
    <Card padded={false} className="overflow-hidden">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-[var(--ci-border)] px-4 py-3">
        <h2 className="ci-display text-[16px] font-bold text-[var(--ci-text)]">
          {d.titlu} <span className="text-[var(--ci-text-muted)]">({trimise.length})</span>
        </h2>
        <span className="text-[12.5px] text-[var(--ci-text)]">
          {d.deschise(deschise, pct(deschise))} · {d.raspunsuri(cuRaspuns, pct(cuRaspuns))}
          {necitite ? <span className="ml-2 rounded-full bg-[var(--ci-primary)] px-2 py-0.5 text-[11px] font-bold text-white">{d.noi(necitite)}</span> : null}
        </span>
        <div className="flex flex-wrap gap-1 text-[12px]">
          {(["toate", "deschise", "nedeschise", "raspuns", "fara"] as const).map((f) => (
            <button key={f} type="button" onClick={() => setFiltru(f)} className={`rounded-full px-2.5 py-1 ${filtru === f ? "bg-[var(--ci-primary)] text-white" : "text-[var(--ci-text-muted)] hover:text-[var(--ci-text)]"}`}>
              {d.filtre[f]}
            </button>
          ))}
        </div>
        <Button
          size="sm"
          className="ml-auto"
          disabled={seCiteste || !date.contulMeu}
          onClick={() =>
            startCitire(async () => {
              const r = await verificaRaspunsuriAcum(orgSlug);
              anunta(r.ok ? "ok" : "eroare", (r.ok ? r.mesaj : r.error) ?? "");
              router.refresh();
            })
          }
        >
          {seCiteste ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} {AGENT_EMAIL_UI_DICT[locale].azi.verificaAcum}
        </Button>
      </div>
      <ul className="max-h-[640px] divide-y divide-[var(--ci-border)] overflow-y-auto">
        {vizibile.map((m) => (
          <li key={m.id} className={`flex items-start gap-3 px-4 py-3 ${raspunsNecitit(m) ? "bg-[var(--ci-primary-soft)]" : ""}`}>
            <span className="mt-0.5 shrink-0">{m.raspunsuri.length ? <MailOpen className="h-4 w-4 text-[var(--ci-primary)]" aria-hidden /> : <CheckCircle2 className="h-4 w-4 text-[var(--ci-green)]" aria-hidden />}</span>
            <div className="min-w-0 flex-1 text-[13px]">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <Link href={`/${orgSlug}/crm/companii/${m.companyId}`} className="font-semibold text-[var(--ci-text)] hover:underline">
                  {m.firma}
                </Link>
                <span className="text-[11.5px] text-[var(--ci-text-muted)]">
                  {m.catre.nume} · <span className="break-all">{m.catre.email}</span> · {m.trimisLa ? fmtDataOra(m.trimisLa, locale) : ""} · {AGENT_EMAIL_UI_DICT[locale].scrie.deColeg(m.de.nume)}
                </span>
              </div>
              <div className="text-[var(--ci-text)]">
                {m.tip === "revenire" && <span className="mr-1.5 rounded-full bg-sky-100 px-1.5 py-px text-[10.5px] font-bold text-sky-800">{d.revenire}</span>}„{m.subiect}”
              </div>
              {m.aprobatDe && m.aprobatDe !== m.de.nume && <div className="text-[11px] text-[var(--ci-text-muted)]">{d.aprobatDe(m.aprobatDe)}</div>}
              <div className="mt-0.5 text-[11.5px]">
                {m.deschis ? (
                  <span className="font-semibold text-[var(--ci-green)]" title={d.deschisPrima(fmtDataOra(m.deschis.prima, locale))}>
                    👁 {d.deschis(m.deschis.nr, fmtDataOra(m.deschis.ultima, locale))}
                  </span>
                ) : m.raspunsuri.length ? null : (
                  <span className="text-[var(--ci-text-muted)]" title={d.nedeschisAjutor}>
                    {d.nedeschis}
                  </span>
                )}
              </div>
              {m.raspunsuri.map((r) => (
                <div key={r.id} className="mt-1.5">
                  {r.automat ? (
                    <div className="text-[11.5px] text-[var(--ci-text-muted)]">↩ {d.raspunsAutomat(fmtDataOra(r.primitLa, locale), r.fragment.slice(0, 80))}</div>
                  ) : (
                    <>
                      <button type="button" onClick={() => setDeschis(deschis === r.id ? null : r.id)} className="flex flex-wrap items-center gap-2 text-left" aria-expanded={deschis === r.id}>
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${CULOARE[r.eticheta]}`}>{d.etichete[r.eticheta]}</span>
                        <span className="text-[11.5px] text-[var(--ci-text-muted)]">{fmtDataOra(r.primitLa, locale)}</span>
                        {deschis !== r.id && <span className="min-w-0 text-[12px] text-[var(--ci-text)]">{r.fragment.slice(0, 90) + (r.fragment.length > 90 ? "…" : "")}</span>}
                      </button>
                      {deschis === r.id && (
                        <div className="mt-1.5 rounded-lg border border-[var(--ci-border)] bg-[var(--ci-surface)] p-3">
                          <div className="mb-1 text-[11.5px] font-semibold text-[var(--ci-text-muted)]">{r.subiect}</div>
                          <p className="whitespace-pre-wrap text-[12.5px] leading-relaxed text-[var(--ci-text)]">{r.fragment}</p>
                          <p className="mt-2 text-[11px] text-[var(--ci-text-muted)]">{d.raspundeDin(m.de.email)}</p>
                          {!r.citit && (
                            <Button
                              size="sm"
                              className="mt-2"
                              disabled={ocupat}
                              onClick={() =>
                                start(async () => {
                                  const x = await marcheazaRaspunsCitit(orgSlug, m.id);
                                  if (!x.ok) anunta("eroare", x.error ?? "");
                                  router.refresh();
                                })
                              }
                            >
                              {d.marcheazaCitit}
                            </Button>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
