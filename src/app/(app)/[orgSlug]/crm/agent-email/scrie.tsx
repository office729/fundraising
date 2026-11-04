"use client";

import { Bot, Loader2, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import type { Mecanism } from "@/lib/agent-email/reguli";
import type { CandidatAgent, DatePaginaAgent, FiltreCandidati, RezultatCandidati } from "@/lib/agent-email/tipuri";
import { AGENT_EMAIL_UI_DICT } from "@/lib/i18n/dictionaries/agent-email-ui";

import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input, Label, Select, Textarea } from "../components/ui/input";
import { useLocale } from "../lib/locale-context";
import { cautaCandidatiAction, genereazaCiorne, listaCampanii } from "./actions";
import { fmtDataAn, type Anunta } from "./comun";

type TipLista = FiltreCandidati["tip"] | "trimise";

export function ScrieTab({ orgSlug, date, anunta, deschide }: { orgSlug: string; date: DatePaginaAgent; anunta: Anunta; deschide: (t: "ciorne") => void }) {
  const locale = useLocale();
  const d = AGENT_EMAIL_UI_DICT[locale].scrie;
  const router = useRouter();
  const [q, setQ] = useState("");
  const [responsabilId, setResponsabilId] = useState(date.colegi.some((c) => c.id === date.eu.id) ? date.eu.id : "");
  const [tip, setTip] = useState<TipLista>("toate");
  const [mecanismMarcat, setMecanismMarcat] = useState<FiltreCandidati["mecanism"]>("toate");
  const [scorMin, setScorMin] = useState(0);
  const [ordine, setOrdine] = useState<FiltreCandidati["ordine"]>("scor");
  const [doarCuAcord, setDoarCuAcord] = useState(true);
  const [rez, setRez] = useState<RezultatCandidati | null>(null);
  const [alese, setAlese] = useState<Set<string>>(new Set());
  const [deId, setDeId] = useState(date.expeditori.find((e) => e.id === date.eu.id)?.id ?? date.expeditori[0]?.id ?? "");
  const [mecanism, setMecanism] = useState<Mecanism>("sponsorizare");
  const [campanii, setCampanii] = useState<{ id: string; titlu: string }[] | null>(null);
  const [cazId, setCazId] = useState("");
  const [instructiuni, setInstructiuni] = useState("");
  const [cautare, startCautare] = useTransition();
  const [generare, startGenerare] = useTransition();
  const cerere = useRef(0);
  const expeditor = date.expeditori.find((e) => e.id === deId);

  useEffect(() => {
    if (mecanism === "caz" && campanii === null) listaCampanii(orgSlug).then(setCampanii).catch(() => setCampanii([]));
  }, [mecanism, campanii, orgSlug]);

  function cauta() {
    if (tip === "trimise") return;
    const nr = ++cerere.current;
    startCautare(async () => {
      const r = await cautaCandidatiAction(orgSlug, { q, responsabilId, tip, mecanism: mecanismMarcat, scorMin, doarCuAcord, ordine });
      if (nr !== cerere.current) return; // a venit între timp o căutare mai nouă
      if ("error" in r) {
        anunta("eroare", r.error);
        return;
      }
      setRez(r);
      setAlese(new Set());
    });
  }
  // La fiecare schimbare de filtru (nu și la fiecare literă din căutare: aceea pornește cu Enter sau cu butonul).
  useEffect(cauta, [responsabilId, tip, mecanismMarcat, scorMin, ordine, doarCuAcord]); // eslint-disable-line react-hooks/exhaustive-deps

  function comuta(id: string) {
    setAlese((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else if (n.size < 10) n.add(id);
      else anunta("eroare", d.maxFirme);
      return n;
    });
  }

  const trimiseUnice = new Map<string, DatePaginaAgent["mesaje"][number]>();
  for (const m of date.mesaje) {
    if (m.stare !== "trimis" || m.tip !== "prim") continue;
    const v = trimiseUnice.get(m.companyId);
    if (!v || (m.trimisLa ?? "") > (v.trimisLa ?? "")) trimiseUnice.set(m.companyId, m);
  }
  const cautat = q.trim().toLowerCase();
  const trimiseVizibile = [...trimiseUnice.values()].filter((m) => !cautat || m.firma.toLowerCase().includes(cautat)).sort((a, b) => (b.trimisLa ?? "").localeCompare(a.trimisLa ?? ""));

  return (
    <Card className="space-y-4">
      <h2 className="ci-display text-[16px] font-bold text-[var(--ci-text)]">{d.titlu}</h2>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2">
          <Label>{d.cauta}</Label>
          <div className="flex gap-2">
            <Input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && cauta()} placeholder={d.cauta} icon={<Search className="h-4 w-4" aria-hidden />} />
            <Button onClick={cauta} disabled={cautare || tip === "trimise"}>
              {cautare ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} {d.buton}
            </Button>
          </div>
        </div>
        <div>
          <Label>{d.responsabil}</Label>
          <Select value={responsabilId} onChange={(e) => setResponsabilId(e.target.value)}>
            <option value="">{d.toateFirmele}</option>
            {date.colegi.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nume}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>{d.scorMin}</Label>
          <Select value={scorMin} onChange={(e) => setScorMin(Number(e.target.value))}>
            <option value={0}>{d.scorOricare}</option>
            <option value={30}>30+</option>
            <option value={50}>50+</option>
            <option value={70}>70+</option>
          </Select>
        </div>
        <div>
          <Label>{d.mecanismMarcat}</Label>
          <Select value={mecanismMarcat} onChange={(e) => setMecanismMarcat(e.target.value as FiltreCandidati["mecanism"])}>
            {(["toate", "d177", "mec20"] as const).map((k) => (
              <option key={k} value={k}>
                {d.mecanismeMarcat[k]}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>{d.ordine}</Label>
          <Select value={ordine} onChange={(e) => setOrdine(e.target.value as FiltreCandidati["ordine"])}>
            <option value="scor">{d.ordineScor}</option>
            <option value="nume">{d.ordineNume}</option>
          </Select>
        </div>
        <label className="flex items-start gap-2 text-[13px] text-[var(--ci-text)] sm:col-span-2" title={d.doarAcordAjutor}>
          <input type="checkbox" checked={doarCuAcord} onChange={(e) => setDoarCuAcord(e.target.checked)} className="mt-0.5" />
          <span>
            {d.doarAcord}
            <span className="block text-[11.5px] text-[var(--ci-text-muted)]">{d.doarAcordAjutor}</span>
          </span>
        </label>
      </div>

      <div className="flex flex-wrap gap-1" role="group">
        {(["toate", "sponsori", "noi", "trimise"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setTip(k)}
            className={`rounded-full px-3 py-1.5 text-[12.5px] font-semibold ${tip === k ? "bg-[var(--ci-primary)] text-white" : "border border-[var(--ci-border)] text-[var(--ci-text-muted)] hover:text-[var(--ci-text)]"}`}
          >
            {d.tipuri[k]}
            {k === "trimise" ? ` (${trimiseUnice.size})` : ""}
          </button>
        ))}
        {rez && tip !== "trimise" && <span className="ml-2 self-center text-[12.5px] text-[var(--ci-text-muted)]">{d.firmeNr(rez.total, rez.plafonat)}</span>}
      </div>
      <p className="text-[12px] text-[var(--ci-text-muted)]">{d.regula}</p>
      {rez && tip !== "trimise" && (rez.explicatie.faraContactBun > 0 || rez.explicatie.scriseRecent > 0) && <p className="text-[12px] text-[var(--ci-text-muted)]">{d.explicatie(rez.explicatie.firme, rez.explicatie.faraContactBun, rez.explicatie.scriseRecent)}</p>}

      <div className="max-h-[420px] overflow-y-auto rounded-xl border border-[var(--ci-border)]">
        {tip === "trimise" ? (
          trimiseVizibile.length === 0 ? (
            <p className="p-4 text-[13px] text-[var(--ci-text-muted)]">{d.trimiseNimic}</p>
          ) : (
            <ul>
              {trimiseVizibile.map((m) => (
                <li key={m.companyId} className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-[var(--ci-border)] bg-[var(--ci-surface-2)] px-3 py-2 last:border-0">
                  <input type="checkbox" checked disabled aria-label={m.firma} />
                  <span className="min-w-0 flex-1">
                    <Link href={`/${orgSlug}/crm/companii/${m.companyId}`} className="text-[13.5px] font-semibold text-[var(--ci-text)] hover:underline">
                      {m.firma}
                    </Link>
                    <span className="block text-[11.5px] text-[var(--ci-text-muted)]">
                      {m.catre.nume} · {m.catre.email} · {d.deColeg(m.de.nume)}
                    </span>
                  </span>
                  <span className="text-right text-[12px]">
                    <span className="block font-semibold text-[var(--ci-green)]">{d.trimis(m.trimisLa ? fmtDataAn(m.trimisLa, locale) : "")}</span>
                    <span className="text-[11.5px] text-[var(--ci-text-muted)]">{m.raspunsuri.length ? d.aRaspuns : m.deschis ? d.deschisDe(m.deschis.nr) : d.nedeschis}</span>
                  </span>
                </li>
              ))}
            </ul>
          )
        ) : rez === null ? (
          <p className="p-4 text-[13px] text-[var(--ci-text-muted)]">{d.seIncarca}</p>
        ) : rez.lista.length === 0 ? (
          <p className="p-4 text-[13px] text-[var(--ci-text-muted)]">
            {d.nimic}
            {doarCuAcord ? d.nimicAcord : ""}
          </p>
        ) : (
          <ul>
            {rez.lista.map((c) => (
              <RandFirma key={c.id} c={c} orgSlug={orgSlug} bifat={alese.has(c.id)} comuta={() => comuta(c.id)} pdfGeneral={Boolean(date.pdfGeneral)} mecanism={mecanism} />
            ))}
          </ul>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div>
          <Label>{d.deLa}</Label>
          <Select value={deId} onChange={(e) => setDeId(e.target.value)}>
            {date.expeditori.length === 0 && <option value="">{d.fatarCont}</option>}
            {date.expeditori.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nume} ({e.email})
              </option>
            ))}
          </Select>
          {expeditor && <p className="mt-1 text-[11.5px] text-[var(--ci-text-muted)]">{d.deLaAjutor(expeditor.semnaturaRezumat)}</p>}
        </div>
        <div>
          <Label>{d.propunem}</Label>
          <Select value={mecanism} onChange={(e) => setMecanism(e.target.value as Mecanism)}>
            {(["sponsorizare", "d177", "caz"] as const).map((k) => (
              <option key={k} value={k}>
                {d.propuneri[k]}
              </option>
            ))}
          </Select>
          {mecanism === "caz" && (
            <>
              <Select value={cazId} onChange={(e) => setCazId(e.target.value)} aria-label={d.campanie} className="mt-1.5">
                <option value="">{campanii === null ? d.seIncarca : campanii.length ? d.alegeCampanie : d.faraCampanii}</option>
                {(campanii ?? []).map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.titlu}
                  </option>
                ))}
              </Select>
              <p className="mt-1 text-[11.5px] text-[var(--ci-text-muted)]">{d.campanieNota}</p>
            </>
          )}
        </div>
        <div>
          <Label>{d.indicatii}</Label>
          <Textarea value={instructiuni} onChange={(e) => setInstructiuni(e.target.value.slice(0, 400))} rows={2} placeholder={d.indicatiiExemplu} />
        </div>
      </div>

      <Button
        variant="primary"
        size="lg"
        disabled={generare || alese.size === 0 || !deId || (mecanism === "caz" && !cazId) || !date.aiConectat}
        onClick={() =>
          startGenerare(async () => {
            const r = await genereazaCiorne(orgSlug, { companyIds: [...alese], mecanism, cazId: mecanism === "caz" ? cazId : undefined, deId, instructiuni, doarCuAcord });
            if (r.create) anunta("ok", d.create(r.create));
            for (const e of r.erori ?? []) anunta("eroare", e);
            if (!r.create && !r.erori?.length) anunta("eroare", r.error ?? "");
            setAlese(new Set());
            cauta();
            router.refresh();
            if (r.create) deschide("ciorne");
          })
        }
      >
        {generare ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />} {generare ? d.seGenereaza(alese.size) : d.genereaza(alese.size)}
      </Button>
    </Card>
  );
}

function RandFirma({ c, orgSlug, bifat, comuta, pdfGeneral, mecanism }: { c: CandidatAgent; orgSlug: string; bifat: boolean; comuta: () => void; pdfGeneral: boolean; mecanism: Mecanism }) {
  const locale = useLocale();
  const d = AGENT_EMAIL_UI_DICT[locale].scrie;
  return (
    <li className={`flex items-start gap-3 border-b border-[var(--ci-border)] px-3 py-2.5 last:border-0 ${bifat ? "bg-[var(--ci-primary-soft)]" : ""}`}>
      <input type="checkbox" checked={bifat} onChange={comuta} aria-label={c.nume} className="mt-1" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Link href={`/${orgSlug}/crm/companii/${c.id}`} target="_blank" className="text-[14px] font-semibold text-[var(--ci-text)] hover:underline">
            {c.nume}
          </Link>
          <span title={d.scor} className={`rounded-md px-1.5 py-0.5 text-[12px] font-bold ${c.scor >= 70 ? "bg-[var(--ci-green-soft)] text-[var(--ci-green)]" : c.scor >= 50 ? "bg-[var(--ci-amber-soft)] text-[var(--ci-amber)]" : "bg-[var(--ci-surface-2)] text-[var(--ci-text-muted)]"}`}>{c.scor}</span>
          {c.sponsor && <span className="rounded-full bg-[var(--ci-red-soft)] px-1.5 py-px text-[10.5px] font-bold text-[var(--ci-red)]">♥ {d.sponsor}{c.sumaSponsorizata ? ` · ${Math.round(c.sumaSponsorizata).toLocaleString(locale === "ro" ? "ro-RO" : "en-GB")} lei` : ""}</span>}
          {c.areCiorna && <span className="rounded-full bg-amber-100 px-1.5 py-px text-[10.5px] font-bold text-amber-800">{d.areCiorna}</span>}
        </div>
        <div className="text-[11.5px] text-[var(--ci-text-muted)]">{c.loc ?? "—"}</div>
        <div className="mt-1 text-[12.5px] text-[var(--ci-text)]">
          {c.contact.nume}
          {c.contact.rol ? <span className="text-[var(--ci-text-muted)]"> · {c.contact.rol}</span> : null}
          <span className="block break-all font-mono text-[11.5px] text-[var(--ci-text-muted)]">{c.contact.email}</span>
        </div>
        <div className="mt-1 flex flex-wrap gap-1.5 text-[10.5px] font-semibold">
          <span className={`rounded-full px-2 py-0.5 ${c.contact.acord === "da" ? "bg-[var(--ci-green-soft)] text-[var(--ci-green)]" : "bg-[var(--ci-surface-2)] text-[var(--ci-text-muted)]"}`}>{c.contact.acord === "da" ? d.acordDa : d.acordNec}</span>
          {c.contact.cheie && <span className="rounded-full bg-[var(--ci-red-soft)] px-2 py-0.5 text-[var(--ci-red)]">♥ {d.contactDirect}</span>}
          <span className={`rounded-full px-2 py-0.5 ${c.pdfFirma ? "bg-[var(--ci-green-soft)] text-[var(--ci-green)]" : pdfGeneral ? "bg-[var(--ci-surface-2)] text-[var(--ci-text-muted)]" : "bg-[var(--ci-red-soft)] text-[var(--ci-red)]"}`}>{c.pdfFirma ? d.pdfFirma : pdfGeneral ? d.pdfGeneral : d.faraPdf}</span>
          {mecanism === "d177" && c.neeligibilD177 && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-800">{d.neeligibilD177}</span>}
        </div>
      </div>
    </li>
  );
}
