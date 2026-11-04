"use client";

import { Bot, Loader2, Send, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { areProbleme, ciornaExpirata, corpEmailHtml, salutPentru, trimitereBlocata, verificaCiorna, type Problema } from "@/lib/agent-email/reguli";
import type { DatePaginaAgent, MesajClient, PrevizualizareMesaj } from "@/lib/agent-email/tipuri";
import { AGENT_EMAIL_UI_DICT } from "@/lib/i18n/dictionaries/agent-email-ui";

import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Dialog } from "../components/ui/dialog";
import { Input, Select, Textarea } from "../components/ui/input";
import { useLocale } from "../lib/locale-context";
import { getPrevizualizare, rescrieCiorna, salveazaTextCiorna, schimbaExpeditor, stergeCiorna, stergeCiorneInMasa, trimiteCiorna, trimiteTest } from "./actions";
import type { Anunta } from "./comun";

type Dict = (typeof AGENT_EMAIL_UI_DICT)["ro"] | (typeof AGENT_EMAIL_UI_DICT)["en"];

function textProblema(d: Dict["ciorne"], p: Problema): string {
  const t = d.problema;
  switch (p.cod) {
    case "firma_lipsa":
      return t.firma_lipsa(p.detaliu ?? "");
    case "destinatar_lipsa":
      return t.destinatar_lipsa(p.detaliu ?? "");
    case "loc_de_completat":
      return t.loc_de_completat();
    case "prea_lung":
      return t.prea_lung(p.numar ?? 0, p.maxim ?? 0);
    case "prea_scurt":
      return t.prea_scurt(p.numar ?? 0);
    case "link":
      return t.link(p.detaliu ?? "");
    case "alt_coleg":
      return t.alt_coleg(p.detaliu ?? "");
    case "alta_firma":
      return t.alta_firma(p.detaliu ?? "");
    case "salut_lipsa":
      return t.salut_lipsa();
    case "salut_schimbat":
      return t.salut_schimbat(p.detaliu ?? "");
    case "subiect_gol":
      return t.subiect_gol();
    case "subiect_lung":
      return t.subiect_lung(p.numar ?? 0);
  }
}

export function CiorneTab({ orgSlug, date, anunta }: { orgSlug: string; date: DatePaginaAgent; anunta: Anunta }) {
  const locale = useLocale();
  const d = AGENT_EMAIL_UI_DICT[locale].ciorne;
  const router = useRouter();
  const [ocupat, start] = useTransition();
  const deAprobat = date.mesaje.filter((m) => m.stare !== "trimis");
  const vechi = deAprobat.filter((m) => m.stare !== "se_trimite" && Date.parse(m.creat) < Date.parse(date.acum) - 7 * 86_400_000).length;
  const toate = deAprobat.filter((m) => m.stare !== "se_trimite").length;

  function sterge(care: "vechi" | "toate", n: number) {
    if (!confirm(care === "vechi" ? d.confirmaVechi(n) : d.confirmaToate(n))) return;
    start(async () => {
      const r = await stergeCiorneInMasa(orgSlug, care);
      if (r.ok) anunta("ok", r.mesaj ?? "");
      else anunta("eroare", r.error ?? "");
      router.refresh();
    });
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="ci-display text-[16px] font-bold text-[var(--ci-text)]">
          {d.titlu} <span className="text-[var(--ci-text-muted)]">({deAprobat.length})</span>
        </h2>
        {toate > 0 && (
          <div className="ml-auto flex flex-wrap gap-2">
            {vechi > 0 && (
              <Button size="sm" disabled={ocupat} onClick={() => sterge("vechi", vechi)}>
                <Trash2 className="h-4 w-4" /> {d.stergeVechi(vechi)}
              </Button>
            )}
            <Button size="sm" variant="ghost" disabled={ocupat} onClick={() => sterge("toate", toate)}>
              {ocupat ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} {d.stergeToate(toate)}
            </Button>
          </div>
        )}
      </div>
      <p className="text-[12px] text-[var(--ci-text-muted)]">{d.autoStergere}</p>
      {deAprobat.length === 0 ? (
        <Card className="text-[13px] text-[var(--ci-text-muted)]">{d.gol}</Card>
      ) : (
        deAprobat.map((m) => <CardCiorna key={`${m.id}:${m.subiect}:${m.mesaj.length}:${m.stare}:${m.de.id}`} orgSlug={orgSlug} m={m} date={date} alteFirme={deAprobat.filter((x) => x.companyId !== m.companyId).map((x) => x.firma)} anunta={anunta} />)
      )}
    </section>
  );
}

function CardCiorna({ orgSlug, m, date, alteFirme, anunta }: { orgSlug: string; m: MesajClient; date: DatePaginaAgent; alteFirme: string[]; anunta: Anunta }) {
  const locale = useLocale();
  const dict = AGENT_EMAIL_UI_DICT[locale];
  const d = dict.ciorne;
  const router = useRouter();
  const [subiect, setSubiect] = useState(m.subiect);
  const [mesaj, setMesaj] = useState(m.mesaj);
  const [deNou, setDeNou] = useState(m.de.id ?? "");
  const [ocupat, start] = useTransition();
  const [confirmare, setConfirmare] = useState(false);
  const modificat = subiect !== m.subiect || mesaj !== m.mesaj;
  const revenire = m.tip === "revenire";
  const eMea = m.de.id === date.eu.id;
  const probleme = verificaCiorna({
    firma: m.firma,
    contactNume: m.catre.nume,
    subiect,
    mesaj,
    tip: m.tip,
    alteFirme,
    alteNumeColegi: date.numeColegi.filter((n) => n !== m.de.nume),
    linkuriPermise: m.cazLink ? [m.cazLink] : [],
    salutAsteptat: salutPentru(m.catre.nume).salut,
  });
  const expirata = ciornaExpirata(new Date(m.creat), new Date(date.acum));
  // O trimitere "se_trimite" mai veche de 10 minute poate fi reluată (serverul o acceptă), dar colegul e rugat să verifice întâi folderul "Trimise" al căsuței.
  const seTrimiteNeconfirmat = m.stare === "se_trimite";
  const seTrimite = seTrimiteNeconfirmat && !trimitereBlocata(m.seTrimiteLa ? new Date(m.seTrimiteLa) : null, new Date(date.acum));
  const blocat = areProbleme(probleme) || expirata || seTrimite;
  const variante = m.subiectAlt ? [m.aiSubiect || m.subiect, m.subiectAlt] : [];
  const mecanism = dict.statistici.mecanisme[m.mecanism];

  function actiune(f: () => Promise<{ ok: boolean; error?: string; mesaj?: string }>, ok?: string) {
    start(async () => {
      const r = await f();
      if (r.ok) {
        if (ok || r.mesaj) anunta("ok", ok ?? r.mesaj ?? "");
      } else anunta("eroare", r.error ?? "");
      router.refresh();
    });
  }

  return (
    <article className={`space-y-3 rounded-[var(--ci-radius-card)] border bg-[var(--ci-surface)] p-4 ${m.stare === "eroare" || expirata ? "border-[var(--ci-red)]" : "border-[var(--ci-border)]"}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <Link href={`/${orgSlug}/crm/companii/${m.companyId}`} className="text-[15px] font-bold text-[var(--ci-text)] hover:underline">
            {m.firma}
          </Link>
          {revenire && <span className="ml-2 rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-bold text-sky-800">{d.revenire}</span>}
          <div className="text-[12.5px] text-[var(--ci-text-muted)]">
            {d.catre} <b className="text-[var(--ci-text)]">{m.catre.nume}</b>
            {m.catre.rol ? ` (${m.catre.rol})` : ""} · <span className="break-all font-mono">{m.catre.email}</span> · {d.deLa} <b className="text-[var(--ci-text)]">{m.de.nume}</b> · {mecanism}
            {m.cazNume ? `: ${m.cazNume}` : ""}
          </div>
          <div className="mt-1 text-[12px] text-[var(--ci-text-muted)]">
            {m.istoric ? (
              <>
                🤝 <b className="text-[var(--ci-text)]">{d.colaborare}</b> {m.istoric}
              </>
            ) : (
              d.primaColaborare
            )}
          </div>
        </div>
        {m.stare === "eroare" && m.eroare && <span className="rounded-full bg-[var(--ci-red-soft)] px-2 py-0.5 text-[11.5px] font-semibold text-[var(--ci-red)]">{d.eroare(m.eroare)}</span>}
        {seTrimiteNeconfirmat && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11.5px] font-semibold text-amber-800">{d.seTrimite}</span>}
      </div>

      {variante.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-[12px]">
          <span className="text-[var(--ci-text-muted)]">{d.variante}</span>
          {variante.map((v, k) => (
            <button key={k} type="button" onClick={() => setSubiect(v)} className={`rounded-full border px-2.5 py-1 text-left ${subiect === v ? "border-[var(--ci-primary)] bg-[var(--ci-primary)] text-white" : "border-[var(--ci-border)] text-[var(--ci-text)]"}`}>
              {k === 0 ? "A" : "B"}: {v}
            </button>
          ))}
        </div>
      )}
      <Input value={subiect} onChange={(e) => setSubiect(e.target.value)} className="font-semibold" aria-label={d.subiect} disabled={seTrimite} />
      {m.salutGhicit && <p className="text-[11.5px] font-semibold text-amber-700">{d.salutGhicit}</p>}
      <Textarea value={mesaj} onChange={(e) => setMesaj(e.target.value)} rows={Math.min(24, Math.max(8, mesaj.split("\n").reduce((a, l) => a + Math.max(1, Math.ceil(l.length / 90)), 0) + 1))} className="leading-relaxed" aria-label={d.mesaj} disabled={seTrimite} />
      {(probleme.length > 0 || expirata) && (
        <ul className="space-y-0.5 rounded-lg bg-[var(--ci-red-soft)] px-3 py-2 text-[12.5px] font-semibold text-[var(--ci-red)]">
          {expirata && <li>⚠ {d.expirata}</li>}
          {probleme.map((p, i) => (
            <li key={i} className={p.gravitate === "atentie" ? "text-amber-700" : ""}>
              ⚠ {textProblema(d, p)}
            </li>
          ))}
        </ul>
      )}
      <p className="text-[11.5px] text-[var(--ci-text-muted)]">{revenire ? d.notaRevenire : d.notaTrimitere}</p>

      {!eMea && !seTrimite && (
        <div className="rounded-lg bg-[var(--ci-surface-2)] px-3 py-2 text-[12.5px] text-[var(--ci-text)]">
          {d.nuEsteExpeditor(m.de.nume)}{" "}
          <Button size="sm" variant="secondary" disabled={ocupat || !date.contulMeu} onClick={() => actiune(() => schimbaExpeditor(orgSlug, m.id, date.eu.id), d.preluata)}>
            {d.preia}
          </Button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="primary" disabled={ocupat || blocat || !eMea} title={blocat ? d.blocat : undefined} onClick={() => setConfirmare(true)}>
          <Send className="h-4 w-4" /> {d.aproba}
        </Button>
        {modificat && !seTrimite && (
          <Button disabled={ocupat} onClick={() => actiune(() => salveazaTextCiorna(orgSlug, m.id, subiect, mesaj), d.salvata)}>
            {d.salveaza}
          </Button>
        )}
        {!seTrimite && !revenire && (
          <span className="inline-flex flex-wrap items-center gap-1.5">
            {date.eu.admin && date.expeditori.length > 1 && (
              <Select value={deNou} onChange={(e) => setDeNou(e.target.value)} aria-label={d.deLa} className="!h-8 !w-auto">
                {date.expeditori.map((e) => (
                  <option key={e.id} value={e.id}>
                    {d.inNumele(e.nume)}
                  </option>
                ))}
              </Select>
            )}
            <Button
              disabled={ocupat}
              title={d.rescrieAjutor}
              onClick={() => {
                if (modificat && !confirm(d.confirmaRescriere)) return;
                actiune(() => rescrieCiorna(orgSlug, m.id, deNou), deNou !== m.de.id ? d.rescrisaLui : d.rescrisa);
              }}
            >
              {ocupat ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />} {deNou !== m.de.id ? d.rescrieLui : d.rescrie}
            </Button>
          </span>
        )}
        {!seTrimite && (
          <Button
            variant="ghost"
            className="ml-auto"
            disabled={ocupat}
            onClick={() => {
              if (!confirm(d.confirmaSterge(m.firma))) return;
              actiune(() => stergeCiorna(orgSlug, m.id));
            }}
          >
            <Trash2 className="h-4 w-4" /> {d.sterge}
          </Button>
        )}
      </div>
      <Previzualizare orgSlug={orgSlug} m={m} subiect={subiect} mesaj={mesaj} />
      {confirmare && <Confirmare orgSlug={orgSlug} m={m} subiect={subiect} mesaj={mesaj} date={date} onInchide={() => setConfirmare(false)} anunta={anunta} />}
    </article>
  );
}

// Emailul complet, cum îl vede destinatarul: antet (de la / către / subiect / atașament) + text + semnătură + subsol.
function Previzualizare({ orgSlug, m, subiect, mesaj }: { orgSlug: string; m: MesajClient; subiect: string; mesaj: string }) {
  const locale = useLocale();
  const d = AGENT_EMAIL_UI_DICT[locale].ciorne;
  const [p, setP] = useState<PrevizualizareMesaj | null | undefined>(undefined);
  useEffect(() => {
    let viu = true;
    getPrevizualizare(orgSlug, m.id)
      .then((x) => viu && setP(x))
      .catch(() => viu && setP(null));
    return () => {
      viu = false;
    };
  }, [orgSlug, m.id]);
  const doc = `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:16px;background:#fff}</style></head><body>${corpEmailHtml(mesaj, p?.semnatura ?? "", { subsol: p ? { text: p.subsolText } : undefined })}</body></html>`;
  return (
    <div className="rounded-xl border border-[var(--ci-border)]">
      <div className="px-3 py-2 text-[12.5px] font-semibold text-[var(--ci-text)]">{d.previzualizare}</div>
      <div className="border-t border-[var(--ci-border)]">
        <div className="space-y-0.5 bg-[var(--ci-surface-2)] px-3 py-2 text-[12.5px] text-[var(--ci-text)]">
          <div>
            <span className="inline-block w-16 text-[var(--ci-text-muted)]">{d.pDeLa}</span> {m.de.nume} &lt;{m.de.email}&gt;
          </div>
          <div>
            <span className="inline-block w-16 text-[var(--ci-text-muted)]">{d.pCatre}</span> {m.catre.nume} &lt;{m.catre.email}&gt;
          </div>
          <div>
            <span className="inline-block w-16 text-[var(--ci-text-muted)]">{d.pSubiect}</span> <b>{subiect}</b>
          </div>
          {m.tip === "prim" && (
            <div>
              <span className="inline-block w-16 text-[var(--ci-text-muted)]">{d.pAtasat}</span>{" "}
              {p === undefined ? (
                "…"
              ) : p?.atasament ? (
                <span>
                  📎 {p.atasament.nume} <span className="text-[var(--ci-text-muted)]">({Math.round(p.atasament.marime / 1024)} KB · {p.atasament.sursa === "firma" ? d.pdfFirma : d.pdfGeneral})</span>
                </span>
              ) : (
                <span className="text-[var(--ci-red)]">{d.faraPdf}</span>
              )}
            </div>
          )}
        </div>
        <iframe title={`${d.previzualizare} ${m.firma}`} srcDoc={doc} sandbox="" className="h-[440px] w-full rounded-b-xl bg-white" />
      </div>
    </div>
  );
}

// Fereastra de confirmare: exact ce pleacă (de la / către / subiect / atașament cu amprentă) + „trimite-mi un test”. Trimiterea pornește doar de la butonul de aici.
function Confirmare({ orgSlug, m, subiect, mesaj, date, onInchide, anunta }: { orgSlug: string; m: MesajClient; subiect: string; mesaj: string; date: DatePaginaAgent; onInchide: () => void; anunta: Anunta }) {
  const locale = useLocale();
  const dict = AGENT_EMAIL_UI_DICT[locale];
  const d = dict.confirmare;
  const router = useRouter();
  const [p, setP] = useState<PrevizualizareMesaj | null | undefined>(undefined);
  const [ocupat, start] = useTransition();
  const [bifat, setBifat] = useState(false);
  useEffect(() => {
    let viu = true;
    getPrevizualizare(orgSlug, m.id)
      .then((x) => viu && setP(x))
      .catch(() => viu && setP(null));
    return () => {
      viu = false;
    };
  }, [orgSlug, m.id]);
  const revenire = m.tip === "revenire";
  const faraAtasament = !revenire && p !== undefined && !p?.atasament;
  const subiectAles = subiect === (m.aiSubiect ?? "") ? "A" : subiect === m.subiectAlt ? "B" : "editat";
  const poate = Boolean(p?.poateTrimite) && m.de.id === date.eu.id;
  return (
    <Dialog open onClose={onInchide} title={d.titlu} width="max-w-xl">
      <div className="space-y-3">
        <div className="space-y-1 rounded-xl bg-[var(--ci-surface-2)] p-3 text-[13px] text-[var(--ci-text)]">
          <div>
            <span className="inline-block w-20 text-[var(--ci-text-muted)]">{d.deLa}</span>{" "}
            <b>{m.de.nume}</b> &lt;{m.de.email}&gt;
          </div>
          <div className="pl-20 text-[11.5px] text-[var(--ci-text-muted)]">{d.deLaAjutor}</div>
          <div>
            <span className="inline-block w-20 text-[var(--ci-text-muted)]">{d.catre}</span> <b>{m.catre.nume}</b> &lt;{m.catre.email}&gt; · {m.firma}
          </div>
          <div>
            <span className="inline-block w-20 text-[var(--ci-text-muted)]">{d.subiect}</span> {subiect}
          </div>
          <div>
            <span className="inline-block w-20 text-[var(--ci-text-muted)]">{d.atasament}</span>{" "}
            {revenire ? (
              d.faraAtasamentRevenire
            ) : p === undefined ? (
              d.seVerifica
            ) : p?.atasament ? (
              <b className={p.atasament.sursa === "general" ? "text-amber-700" : ""}>
                📎 {p.atasament.nume} ({Math.round(p.atasament.marime / 1024)} KB · {p.atasament.sursa === "firma" ? dict.ciorne.pdfFirma : dict.ciorne.pdfGeneral})
              </b>
            ) : (
              <b className="text-[var(--ci-red)]">{d.niciun}</b>
            )}
          </div>
        </div>
        {p?.atasament?.sursa === "general" && <p className="text-[12px] font-semibold text-amber-700">{d.avertismentGeneral}</p>}
        {!revenire && p?.atasament && (
          <label className="flex items-start gap-2 text-[12.5px] text-[var(--ci-text)]">
            <input type="checkbox" checked={bifat} onChange={(e) => setBifat(e.target.checked)} className="mt-0.5" />
            {d.bifa(p.atasament.nume, m.firma)}
          </label>
        )}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button
            variant="primary"
            disabled={ocupat || faraAtasament || p === undefined || !poate || (!revenire && !bifat)}
            onClick={() =>
              start(async () => {
                const r = await trimiteCiorna(orgSlug, { id: m.id, subiect, mesaj, pdfHash: p?.atasament?.hash ?? null, subiectAles });
                if (r.ok) {
                  anunta("ok", r.mesaj ?? "");
                  onInchide();
                } else anunta("eroare", r.error ?? "");
                router.refresh();
              })
            }
          >
            {ocupat ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} {d.trimite}
          </Button>
          <Button
            disabled={ocupat || faraAtasament || p === undefined || !poate}
            onClick={() =>
              start(async () => {
                const r = await trimiteTest(orgSlug, { id: m.id, subiect, mesaj, pdfHash: p?.atasament?.hash ?? null });
                anunta(r.ok ? "ok" : "eroare", r.ok ? (r.mesaj ?? "") : (r.error ?? ""));
              })
            }
          >
            {d.test}
          </Button>
          <Button variant="ghost" className="ml-auto" onClick={onInchide}>
            {d.renunta}
          </Button>
        </div>
        <p className="text-[11.5px] text-[var(--ci-text-muted)]">{d.sub}</p>
      </div>
    </Dialog>
  );
}

