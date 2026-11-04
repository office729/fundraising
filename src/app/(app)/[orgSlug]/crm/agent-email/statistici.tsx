"use client";

import { FileText, Loader2, Trash2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import type { DatePaginaAgent, MesajClient } from "@/lib/agent-email/tipuri";
import { AGENT_EMAIL_UI_DICT } from "@/lib/i18n/dictionaries/agent-email-ui";

import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input, Label } from "../components/ui/input";
import { useLocale } from "../lib/locale-context";
import { incarcaPdfGeneral, salveazaSetariAgent, stergePdfGeneral } from "./actions";
import { areRaspunsReal, fmtDataAn, type Anunta } from "./comun";

type Rand = { n: number; deschise: number; raspunsuri: number; interes: number };

export function StatisticiTab({ orgSlug, date, anunta }: { orgSlug: string; date: DatePaginaAgent; anunta: Anunta }) {
  const locale = useLocale();
  const d = AGENT_EMAIL_UI_DICT[locale].statistici;
  const prime = date.mesaje.filter((m) => m.stare === "trimis" && m.tip === "prim");
  const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "—");
  const interes = (m: MesajClient) => m.raspunsuri.some((r) => r.eticheta === "interesat" || r.eticheta === "detalii");
  const total: Rand = { n: prime.length, deschise: prime.filter((m) => m.deschis || m.raspunsuri.length).length, raspunsuri: prime.filter(areRaspunsReal).length, interes: prime.filter(interes).length };
  const grupe = (cheie: (m: MesajClient) => string): [string, Rand][] => {
    const harta = new Map<string, Rand>();
    for (const m of prime) {
      const k = cheie(m);
      const v = harta.get(k) ?? { n: 0, deschise: 0, raspunsuri: 0, interes: 0 };
      v.n++;
      if (m.deschis || m.raspunsuri.length) v.deschise++;
      if (areRaspunsReal(m)) v.raspunsuri++;
      if (interes(m)) v.interes++;
      harta.set(k, v);
    }
    return [...harta].sort((a, b) => b[1].n - a[1].n);
  };
  const tabele: [string, [string, Rand][]][] = [
    [d.grupe.mecanism, grupe((m) => d.mecanisme[m.mecanism] ?? m.mecanism)],
    [d.grupe.coleg, grupe((m) => m.de.nume)],
    [d.grupe.subiect, grupe((m) => (m.subiectAles === "A" ? d.subiecte.A : m.subiectAles === "B" ? d.subiecte.B : m.subiectAles === "editat" ? d.subiecte.editat : d.subiecte.niciunul))],
  ];

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <h2 className="ci-display text-[16px] font-bold text-[var(--ci-text)]">
          {d.titlu} <span className="text-[12px] font-normal text-[var(--ci-text-muted)]">({d.nota})</span>
        </h2>
        {prime.length < 3 ? (
          <p className="text-[13px] text-[var(--ci-text-muted)]">{d.prea}</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(
                [
                  [d.totaluri.trimise, String(total.n)],
                  [d.totaluri.deschise, `${total.deschise} (${pct(total.deschise, total.n)})`],
                  [d.totaluri.raspunsuri, `${total.raspunsuri} (${pct(total.raspunsuri, total.n)})`],
                  [d.totaluri.interesati, `${total.interes} (${pct(total.interes, total.n)})`],
                ] as const
              ).map(([e, v]) => (
                <div key={e} className="rounded-xl border border-[var(--ci-border)] p-3">
                  <div className="text-[11.5px] text-[var(--ci-text-muted)]">{e}</div>
                  <div className="text-[18px] font-bold text-[var(--ci-text)]">{v}</div>
                </div>
              ))}
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              {tabele.map(([titlu, randuri]) => (
                <div key={titlu} className="text-[12.5px]">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto_auto] gap-x-2 border-b border-[var(--ci-border)] pb-1 text-[11px] text-[var(--ci-text-muted)]">
                    <span>{titlu}</span>
                    <span className="text-right">{d.cap.trimise}</span>
                    <span className="text-right">{d.cap.deschise}</span>
                    <span className="text-right">{d.cap.raspuns}</span>
                    <span className="text-right">{d.cap.interesati}</span>
                  </div>
                  {randuri.map(([k, v]) => (
                    <div key={k} className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto_auto] gap-x-2 border-b border-[var(--ci-border)] py-1.5 text-[var(--ci-text)] last:border-0">
                      <span className="break-words">{k}</span>
                      <span className="text-right">{v.n}</span>
                      <span className="text-right">{pct(v.deschise, v.n)}</span>
                      <span className="text-right">{pct(v.raspunsuri, v.n)}</span>
                      <span className="text-right font-bold">{v.interes}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </>
        )}
      </Card>
      {date.eu.admin && <PanouAdmin orgSlug={orgSlug} date={date} anunta={anunta} />}
    </div>
  );
}

// Alegerile organizației (doar administratorul): PDF-ul general atașat, limita zilnică pe expeditor, pixelul de deschidere.
function PanouAdmin({ orgSlug, date, anunta }: { orgSlug: string; date: DatePaginaAgent; anunta: Anunta }) {
  const locale = useLocale();
  const d = AGENT_EMAIL_UI_DICT[locale].admin;
  const router = useRouter();
  const [ocupat, start] = useTransition();
  const [limita, setLimita] = useState(String(date.setari.limitaZi));
  const [pixel, setPixel] = useState(date.setari.pixelActiv);
  const pdf = date.pdfGeneral;
  return (
    <Card className="space-y-4">
      <h2 className="ci-display text-[16px] font-bold text-[var(--ci-text)]">{d.titlu}</h2>
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-[13px] font-semibold text-[var(--ci-text)]">
          <FileText className={`h-4 w-4 ${pdf ? "text-[var(--ci-green)]" : "text-[var(--ci-red)]"}`} aria-hidden /> {d.pdf}
        </div>
        <p className="text-[12px] text-[var(--ci-text-muted)]">{d.pdfNota}</p>
        {pdf ? (
          <p className="text-[13px] text-[var(--ci-text)]">
            <b>{pdf.nume}</b> <span className="text-[var(--ci-text-muted)]">({Math.round(pdf.marime / 1024)} KB · {fmtDataAn(pdf.la, locale)}{pdf.de ? ` · ${pdf.de}` : ""})</span>
          </p>
        ) : (
          <p className="text-[13px] font-semibold text-[var(--ci-red)]">{d.faraPdf}</p>
        )}
        {pdf && !/one.?pager|prezentare|prezent/i.test(pdf.nume) && <p className="rounded-lg bg-[var(--ci-red-soft)] px-3 py-2 text-[12.5px] font-semibold text-[var(--ci-red)]">{d.verificaNume(pdf.nume)}</p>}
        <div className="flex flex-wrap gap-2">
          <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] bg-[var(--ci-surface)] px-3.5 text-sm font-medium text-[var(--ci-text)] hover:bg-[var(--ci-surface-2)]">
            {ocupat ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} {pdf ? d.schimba : d.incarca}
            <input
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (!f) return;
                const fd = new FormData();
                fd.set("pdf", f);
                start(async () => {
                  const r = await incarcaPdfGeneral(orgSlug, fd);
                  if (r.ok) anunta("ok", d.pdfSalvat);
                  else anunta("eroare", r.error ?? "");
                  router.refresh();
                });
              }}
            />
          </label>
          {pdf && (
            <Button
              variant="ghost"
              disabled={ocupat}
              onClick={() => {
                if (!confirm(d.confirmaSterge(pdf.nume))) return;
                start(async () => {
                  const r = await stergePdfGeneral(orgSlug);
                  if (r.ok) anunta("ok", d.pdfSters);
                  else anunta("eroare", r.error ?? "");
                  router.refresh();
                });
              }}
            >
              <Trash2 className="h-4 w-4" /> {d.sterge}
            </Button>
          )}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label>{d.limita}</Label>
          <Input type="number" inputMode="numeric" min={1} max={200} value={limita} onChange={(e) => setLimita(e.target.value)} />
          <p className="mt-1 text-[11.5px] text-[var(--ci-text-muted)]">{d.limitaAjutor}</p>
        </div>
        <label className="flex items-start gap-2 text-[13px] text-[var(--ci-text)]">
          <input type="checkbox" checked={pixel} onChange={(e) => setPixel(e.target.checked)} className="mt-1" />
          <span>
            {d.pixel}
            <span className="block text-[11.5px] text-[var(--ci-text-muted)]">{d.pixelAjutor}</span>
          </span>
        </label>
      </div>
      {pixel && (
        <p role="note" className="rounded-[var(--ci-radius-card)] bg-[var(--ci-amber-soft)] px-3 py-2 text-[12.5px] font-semibold text-[var(--ci-text)]">
          {d.pixelAvertisment}
        </p>
      )}
      <Button
        variant="primary"
        disabled={ocupat}
        onClick={() =>
          start(async () => {
            const r = await salveazaSetariAgent(orgSlug, Number(limita), pixel);
            if (r.ok) anunta("ok", r.mesaj ?? "");
            else anunta("eroare", r.error ?? "");
            router.refresh();
          })
        }
      >
        {d.salveaza}
      </Button>
    </Card>
  );
}
