"use client";

import { Bot, Loader2, Phone, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { revenireScadenta } from "@/lib/agent-email/reguli";
import type { DatePaginaAgent, MesajClient } from "@/lib/agent-email/tipuri";
import { AGENT_EMAIL_UI_DICT } from "@/lib/i18n/dictionaries/agent-email-ui";
import { sarbatoriRo } from "@/lib/sarbatori-ro";

import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { useLocale } from "../lib/locale-context";
import { ScriptTelefon } from "../companii/[id]/script-telefon";
import { genereazaReveniri, getScriptApel, marcheazaApelFacut, verificaRaspunsuriAcum, type DateApel } from "./actions";
import { areRaspunsReal, fmtDataOra, raspunsNecitit, type Anunta } from "./comun";

const esteSarbatoare = (iso: string) => sarbatoriRo(Number(iso.slice(0, 4))).has(iso);

function Bloc({ titlu, n, culoare, children }: { titlu: string; n: number; culoare: string; children?: React.ReactNode }) {
  return (
    <div className="min-w-[160px] flex-1 rounded-xl border border-[var(--ci-border)] p-3">
      <div className="flex items-baseline gap-2">
        <span className={`text-[22px] font-bold ${culoare}`}>{n}</span>
        <span className="text-[12.5px] font-semibold text-[var(--ci-text)]">{titlu}</span>
      </div>
      {children}
    </div>
  );
}

// Pregătirea apelului: telefonul persoanei + scriptul (deschidere, calificare, propunere, cerere de 15 minute), calculat pe server cu datele firmei.
function PanouApel({ orgSlug, m }: { orgSlug: string; m: MesajClient }) {
  const locale = useLocale();
  const d = AGENT_EMAIL_UI_DICT[locale].azi;
  const [date, setDate] = useState<DateApel | null | undefined>(undefined);
  useEffect(() => {
    let viu = true;
    getScriptApel(orgSlug, m.id)
      .then((x) => viu && setDate(x))
      .catch(() => viu && setDate(null));
    return () => {
      viu = false;
    };
  }, [orgSlug, m.id]);
  if (date === undefined) return <p className="py-2 text-[12.5px] text-[var(--ci-text-muted)]">{d.seIncarcaScript}</p>;
  if (!date) return <p className="py-2 text-[12.5px] text-[var(--ci-red)]">{d.faraScript}</p>;
  return (
    <div className="mt-2 space-y-2 rounded-xl bg-[var(--ci-surface-2)] p-3">
      <p className="text-[12.5px] text-[var(--ci-text)]">
        <b>{date.persoana}</b>
        {date.rol ? ` (${date.rol})` : ""} · {d.telefon}:{" "}
        {date.telefon ? (
          <a href={`tel:${date.telefon.replace(/[^+\d]/g, "")}`} className="font-semibold text-[var(--ci-primary)] hover:underline">
            {date.telefon}
          </a>
        ) : (
          <span className="text-[var(--ci-text-muted)]">{d.faraTelefon}</span>
        )}
      </p>
      <ScriptTelefon script={date.script} />
    </div>
  );
}

export function AziTab({ orgSlug, date, anunta, deschide }: { orgSlug: string; date: DatePaginaAgent; anunta: Anunta; deschide: (t: "ciorne" | "scrie" | "trimise") => void }) {
  const locale = useLocale();
  const d = AGENT_EMAIL_UI_DICT[locale].azi;
  const router = useRouter();
  const [ocupat, start] = useTransition();
  const [seCiteste, startCitire] = useTransition();
  const [apelDeschis, setApelDeschis] = useState<string | null>(null);
  const acum = new Date(date.acum);
  const toate = date.mesaje;
  const trimise = toate.filter((m) => m.stare === "trimis");
  const deAprobat = toate.filter((m) => m.stare === "ciorna" || m.stare === "eroare");
  const blocate = toate.filter((m) => m.stare === "se_trimite" && m.seTrimiteLa && acum.getTime() - Date.parse(m.seTrimiteLa) > 10 * 60_000);
  const necitite = trimise.filter(raspunsNecitit);
  const auRevenire = new Set(toate.filter((m) => m.tip === "revenire" && m.revenireLa).map((m) => m.revenireLa!));
  const reveniri = trimise.filter((m) => revenireScadenta({ tip: m.tip, stare: m.stare, trimisLa: m.trimisLa ? new Date(m.trimisLa) : null, areRaspunsReal: areRaspunsReal(m), areRevenire: auRevenire.has(m.id) }, acum, esteSarbatoare));
  // De sunat: revenirea a rămas fără răspuns 5 zile lucrătoare (programat de server), iar nici emailul inițial nu a primit răspuns.
  const dupaId = new Map(toate.map((m) => [m.id, m]));
  const deSunat = trimise.filter((m) => m.tip === "revenire" && m.apelLa && !m.apelFacutLa && !areRaspunsReal(m) && !(m.revenireLa && dupaId.get(m.revenireLa) && areRaspunsReal(dupaId.get(m.revenireLa)!)));
  const deschisDeMaiMulte = trimise.filter((m) => m.deschis && m.deschis.nr >= 2 && !areRaspunsReal(m));
  const gol = !deAprobat.length && !necitite.length && !reveniri.length && !deSunat.length && !deschisDeMaiMulte.length && !blocate.length;
  const cont = date.contulMeu;

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <h2 className="ci-display text-[16px] font-bold text-[var(--ci-text)]">{d.titlu}</h2>
        {gol ? (
          <p className="text-[13px] text-[var(--ci-text-muted)]">{d.gol}</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            <Bloc titlu={d.raspunsuri} n={necitite.length} culoare="text-[var(--ci-primary)]">
              <div className="mt-1 text-[11.5px] text-[var(--ci-text-muted)]">{necitite.slice(0, 4).map((m) => m.firma).join(", ") || "—"}</div>
              {necitite.length > 0 && (
                <button type="button" onClick={() => deschide("trimise")} className="mt-1 text-[12px] font-semibold underline">
                  {d.deschide}
                </button>
              )}
            </Bloc>
            <Bloc titlu={d.reveniri} n={reveniri.length} culoare="text-amber-700">
              {reveniri.length > 0 && (
                <Button
                  variant="primary"
                  size="sm"
                  className="mt-1.5"
                  disabled={ocupat}
                  onClick={() =>
                    start(async () => {
                      const r = await genereazaReveniri(orgSlug);
                      if (r.create) anunta("ok", r.mesaj ?? "");
                      else anunta("eroare", r.erori?.[0] ?? r.error ?? "");
                      router.refresh();
                      if (r.create) deschide("ciorne");
                    })
                  }
                >
                  {ocupat ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bot className="h-3.5 w-3.5" />} {ocupat ? d.seScriu : d.scrieReveniri}
                </Button>
              )}
            </Bloc>
            <Bloc titlu={d.deSunat} n={deSunat.length} culoare="text-[var(--ci-red)]" />
            <Bloc titlu={d.deschisDeMaiMulte} n={deschisDeMaiMulte.length} culoare="text-[var(--ci-green)]">
              <div className="mt-1 text-[11.5px] text-[var(--ci-text-muted)]">{deschisDeMaiMulte.slice(0, 4).map((m) => m.firma).join(", ") || "—"}</div>
            </Bloc>
            <Bloc titlu={d.deAprobat} n={deAprobat.length} culoare="text-[var(--ci-text)]">
              {deAprobat.length > 0 && (
                <button type="button" onClick={() => deschide("ciorne")} className="mt-1 text-[12px] font-semibold underline">
                  {d.deschide}
                </button>
              )}
            </Bloc>
            {blocate.length > 0 && (
              <Bloc titlu={d.blocate} n={blocate.length} culoare="text-[var(--ci-red)]">
                <div className="mt-1 text-[11.5px] text-[var(--ci-text-muted)]">{blocate.map((m) => m.firma).join(", ")}</div>
              </Bloc>
            )}
          </div>
        )}
      </Card>

      {deSunat.length > 0 && (
        <Card className="space-y-2">
          <h3 className="flex items-center gap-2 text-[14px] font-bold text-[var(--ci-text)]">
            <Phone className="h-4 w-4" aria-hidden /> {d.deSunat}
          </h3>
          <ul className="divide-y divide-[var(--ci-border)]">
            {deSunat.map((m) => (
              <li key={m.id} className="py-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/${orgSlug}/crm/companii/${m.companyId}`} className="text-[14px] font-semibold text-[var(--ci-text)] hover:underline">
                    {m.firma}
                  </Link>
                  <span className="text-[12.5px] text-[var(--ci-text-muted)]">{m.catre.nume}</span>
                  <span className="ml-auto flex gap-2">
                    <Button size="sm" variant="secondary" onClick={() => setApelDeschis(apelDeschis === m.id ? null : m.id)}>
                      {d.scriptApel}
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={ocupat}
                      onClick={() =>
                        start(async () => {
                          const r = await marcheazaApelFacut(orgSlug, m.id);
                          if (!r.ok) anunta("eroare", r.error ?? "");
                          router.refresh();
                        })
                      }
                    >
                      {d.apelFacut}
                    </Button>
                  </span>
                </div>
                {apelDeschis === m.id && <PanouApel orgSlug={orgSlug} m={m} />}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="flex flex-wrap items-center gap-3">
        <Button
          disabled={seCiteste || !cont}
          onClick={() =>
            startCitire(async () => {
              const r = await verificaRaspunsuriAcum(orgSlug);
              if (r.ok) anunta("ok", r.mesaj ?? "");
              else anunta("eroare", r.error ?? "");
              router.refresh();
            })
          }
        >
          {seCiteste ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} {seCiteste ? d.seVerifica : d.verificaAcum}
        </Button>
        <span className="text-[12.5px] text-[var(--ci-text-muted)]">{cont?.imapVerificatLa ? d.ultimaVerificare(fmtDataOra(cont.imapVerificatLa, locale)) : d.faraVerificare}</span>
        {cont?.imapEroare && <span className="w-full text-[12.5px] text-[var(--ci-red)]">{d.erorImap[cont.imapEroare.split(":")[0]] ?? cont.imapEroare}</span>}
      </Card>
    </div>
  );
}
