"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

import { RECLAME_UI_DICT } from "@/lib/i18n/dictionaries/reclame-ui";
import { DICTIONAR_METRICI } from "@/lib/reclame/dictionar";
import { PARAMETRI_META } from "@/lib/reclame/utm";

import { Card } from "../components/ui/card";
import { useLocale } from "../lib/locale-context";
import { Rich } from "./rich";

// Ghidul de pornire, pentru ONG-ul care își măsoară propriile reclame. Fără termeni tehnici: ce faci, unde dai clic, ce ar trebui să vezi.
// Detaliile pentru dezvoltatori (tabele, comenzi, variabile de server) sunt în documentation/reclame-implementare.md, nu aici.

function Cod({ text }: { text: string }) {
  const dict = RECLAME_UI_DICT[useLocale()].ghid;
  const [copiat, setCopiat] = useState(false);
  return (
    <div className="relative">
      <pre className="overflow-x-auto rounded-lg bg-[var(--ci-surface-2)] p-3 pr-24 font-mono text-[12px] leading-relaxed whitespace-pre-wrap text-[var(--ci-text)] [overflow-wrap:anywhere]">{text}</pre>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(text);
            setCopiat(true);
            setTimeout(() => setCopiat(false), 1800);
          } catch {
            // clipboard indisponibil: textul rămâne selectabil
          }
        }}
        className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-md border border-[var(--ci-border)] bg-[var(--ci-surface)] px-2 py-1 text-[11.5px] font-medium text-[var(--ci-text)] hover:bg-[var(--ci-surface-2)]"
      >
        {copiat ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        {copiat ? dict.copiat : dict.copiaza}
      </button>
    </div>
  );
}

function Pas({ n, titlu, timp, children }: { n: number; titlu: string; timp?: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--ci-primary)] text-[13px] font-bold text-white" aria-hidden>
        {n}
      </span>
      <div className="min-w-0 flex-1 space-y-2">
        <p className="text-[15px] font-semibold text-[var(--ci-text)]">
          {titlu}
          {timp && <span className="ml-2 text-[12px] font-normal text-[var(--ci-text-muted)]">{timp}</span>}
        </p>
        <div className="space-y-2 text-[13.5px] leading-relaxed text-[var(--ci-text-muted)]">{children}</div>
      </div>
    </li>
  );
}

function Intrebare({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <details className="rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] px-3.5 py-2.5">
      <summary className="cursor-pointer text-[13.5px] font-semibold text-[var(--ci-text)]">{q}</summary>
      <div className="mt-2 space-y-1.5 text-[13px] leading-relaxed text-[var(--ci-text-muted)]">{children}</div>
    </details>
  );
}

const SABLON_LINK_PARAMETRI = PARAMETRI_META("cmp_001", "cr_001");

export function TabGhid() {
  const dict = RECLAME_UI_DICT[useLocale()].ghid;
  return (
    <div className="space-y-5">
      <Card className="space-y-2">
        <h2 className="text-[17px] font-bold text-[var(--ci-text)]">{dict.title}</h2>
        <p className="text-[13.5px] leading-relaxed text-[var(--ci-text-muted)]">{dict.intro}</p>
      </Card>

      <Card className="space-y-5">
        <ol className="space-y-6">
          <Pas n={1} titlu={dict.p1Titlu} timp={dict.p1Timp}>
            <p>
              <Rich text={dict.p1a} />
            </p>
            <p>{dict.p1b}</p>
            <p className="rounded-[var(--ci-radius-btn)] bg-[var(--ci-amber-soft)] px-3 py-2 text-[var(--ci-text)]">
              <Rich text={dict.p1c} />
            </p>
          </Pas>

          <Pas n={2} titlu={dict.p2Titlu} timp={dict.p2Timp}>
            <p>
              <Rich text={dict.p2a} />
            </p>
            <p>
              <Rich text={dict.p2b} />
            </p>
            <Cod text={SABLON_LINK_PARAMETRI} />
          </Pas>

          <Pas n={3} titlu={dict.p3Titlu} timp={dict.p3Timp}>
            <p>{dict.p3intro}</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <Rich text={dict.p3auto} />
              </li>
              <li>
                <Rich text={dict.p3manual} />
              </li>
            </ul>
            <p>{dict.p3final}</p>
          </Pas>

          <Pas n={4} titlu={dict.p4Titlu} timp={dict.p4Timp}>
            <p>
              <Rich text={dict.p4a} />
            </p>
            <p>{dict.p4b}</p>
          </Pas>
        </ol>
      </Card>

      <Card className="space-y-3">
        <h2 className="text-[16px] font-bold text-[var(--ci-text)]">{dict.citire}</h2>
        <ul className="list-disc space-y-1.5 pl-5 text-[13.5px] leading-relaxed text-[var(--ci-text-muted)]">
          {[dict.c1, dict.c2, dict.c3, dict.c4].map((c) => (
            <li key={c}>
              <Rich text={c} />
            </li>
          ))}
        </ul>
      </Card>

      <Card className="space-y-2.5">
        <h2 className="text-[16px] font-bold text-[var(--ci-text)]">{dict.problemeTitlu}</h2>
        <Intrebare q={dict.q1}>
          <p>{dict.q1a}</p>
          <p>{dict.q1b}</p>
        </Intrebare>
        <Intrebare q={dict.q2}>
          <p>{dict.q2a}</p>
        </Intrebare>
        <Intrebare q={dict.q3}>
          <p>{dict.q3a}</p>
        </Intrebare>
        <Intrebare q={dict.q4}>
          <p>{dict.q4a}</p>
        </Intrebare>
        <Intrebare q={dict.q5}>
          <p>{dict.q5a}</p>
        </Intrebare>
      </Card>

      <Card className="space-y-2.5">
        <h2 className="text-[16px] font-bold text-[var(--ci-text)]">{dict.bineDeStiut}</h2>
        <ul className="list-disc space-y-1.5 pl-5 text-[13px] leading-relaxed text-[var(--ci-text-muted)]">
          {dict.noteLimite.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
        <details className="pt-1">
          <summary className="cursor-pointer text-[13.5px] font-semibold text-[var(--ci-text)]">{dict.cumSeCalculeazaFiecare}</summary>
          <dl className="mt-2 divide-y divide-[var(--ci-border)]">
            {DICTIONAR_METRICI.map((m) => {
              const d = dict.metrici[m.cheie] ?? m;
              return (
                <div key={m.cheie} className="py-2.5">
                  <dt className="text-[13.5px] font-semibold text-[var(--ci-text)]">{d.nume}</dt>
                  <dd className="mt-0.5 text-[13px] text-[var(--ci-text-muted)]">
                    {d.formula}
                    {d.nota && <span className="mt-0.5 block text-[12.5px]">{d.nota}</span>}
                  </dd>
                </div>
              );
            })}
          </dl>
        </details>
      </Card>
    </div>
  );
}
