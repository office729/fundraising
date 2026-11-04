"use client";

import { Check, Copy, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { formatUsd } from "@/lib/ai-org/consum";
import { ANALIZE_AI_UI_DICT } from "@/lib/i18n/dictionaries/analize-ai-ui";
import type { AnalizaSalvata } from "@/lib/reclame/analiza-ai-server";

import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { useLocale } from "../lib/locale-context";

import { pornesteAnalizaReclame } from "./analiza-actions";
import { formatariReclame } from "./format";

// Tabul „Analiză AI” din Reclame: ultimele analize (cea săptămânală de luni și cele la cerere) + butonul „Analizează acum”. Doar citire/propuneri: nimic nu se schimbă în conturile de reclame.
function CopiazaText({ text }: { text: string }) {
  const d = ANALIZE_AI_UI_DICT[useLocale()].reclame;
  const [stare, setStare] = useState<"nu" | "da" | "eroare">("nu");
  return (
    <Button
      size="sm"
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setStare("da");
        } catch {
          setStare("eroare");
        }
        setTimeout(() => setStare("nu"), 2500);
      }}
    >
      {stare === "da" ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
      {stare === "da" ? d.copiat : stare === "eroare" ? d.copiereEsuata : d.copiaza}
    </Button>
  );
}

function Lista({ titlu, randuri, ton }: { titlu: string; randuri: { campanie: string; motiv: string }[]; ton: "green" | "red" }) {
  if (randuri.length === 0) return null;
  return (
    <div>
      <h4 className="text-[13px] font-bold text-[var(--ci-text)]">{titlu}</h4>
      <ul className="mt-1.5 space-y-1.5">
        {randuri.map((r, i) => (
          <li key={i} className="rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] px-3 py-2 text-[13px]">
            <Badge tone={ton}>{r.campanie}</Badge>
            <p className="mt-1 text-[var(--ci-text)]">{r.motiv}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Analiza({ a, deschisa }: { a: AnalizaSalvata; deschisa: boolean }) {
  const locale = useLocale();
  const d = ANALIZE_AI_UI_DICT[locale].reclame;
  const f = formatariReclame(locale);
  const [deschis, setDeschis] = useState(deschisa);
  const titlu = d.perioada(f.zi(a.perioadaDe), f.zi(a.perioadaPana));
  const stare = a.stare === "gata" ? null : a.stare === "in_lucru" ? <Badge tone="blue">{d.inLucru}</Badge> : <Badge tone="red">{d.eroare}</Badge>;

  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[14px] font-semibold text-[var(--ci-text)]">{titlu}</p>
          <p className="text-[12px] text-[var(--ci-text-muted)]">
            {f.dataOra(a.creatLa)} · {a.sursa === "cron" ? d.automata : d.manuala}
            {a.costUsd > 0 && ` · ${d.cost(formatUsd(a.costUsd, locale))}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {stare}
          {a.stare === "gata" && (
            <Button size="sm" onClick={() => setDeschis((v) => !v)} aria-expanded={deschis}>
              {deschis ? "−" : "+"}
            </Button>
          )}
        </div>
      </div>
      {a.stare === "in_lucru" && <p className="text-[13px] text-[var(--ci-text-muted)]">{d.inLucruNota}</p>}
      {a.stare === "eroare" && a.eroare && <p className="text-[13px] text-[var(--ci-red)]">{a.eroare}</p>}

      {a.analiza && deschis && (
        <div className="space-y-4">
          {a.totaluri && (
            <p className="text-[12.5px] text-[var(--ci-text-muted)]">{d.totaluri(f.lei(Math.round(a.totaluri.cheltuialaLei * 100), 0), f.lei(Math.round(a.totaluri.donatiiNeteLei * 100), 0), f.numar(a.totaluri.donatii))}</p>
          )}
          <div>
            <h4 className="text-[13px] font-bold text-[var(--ci-text)]">{d.rezumat}</h4>
            <p className="mt-1 text-[14px] text-[var(--ci-text)]">{a.analiza.rezumat}</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Lista titlu={d.castigatoare} randuri={a.analiza.castigatoare} ton="green" />
            <Lista titlu={d.pierderi} randuri={a.analiza.pierderi} ton="red" />
          </div>
          {a.analiza.propuneri.length > 0 && (
            <div>
              <h4 className="text-[13px] font-bold text-[var(--ci-text)]">{d.propuneri}</h4>
              <ul className="mt-1.5 space-y-2">
                {a.analiza.propuneri.map((p, i) => (
                  <li key={i} className="rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="blue">{d.tip[p.tip] ?? p.tip}</Badge>
                      {p.campanie && (
                        <span className="text-[12px] text-[var(--ci-text-muted)]">
                          {d.campanie}: {p.campanie}
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 text-[14px] font-semibold text-[var(--ci-text)]">{p.titlu}</p>
                    <p className="mt-0.5 text-[13px] text-[var(--ci-text)]">{p.detalii}</p>
                    {p.textNou && (
                      <div className="mt-2 rounded-[var(--ci-radius-btn)] bg-[var(--ci-surface-2)] p-2.5">
                        <p className="text-[11.5px] font-bold tracking-wide text-[var(--ci-text-muted)] uppercase">{d.textNou}</p>
                        <p className="mt-1 text-[13px] whitespace-pre-line text-[var(--ci-text)]">{p.textNou}</p>
                        <div className="mt-2">
                          <CopiazaText text={p.textNou} />
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
              {a.analiza.taiate > 0 && <p className="mt-1.5 text-[12px] text-[var(--ci-text-muted)]">{d.taiate}</p>}
            </div>
          )}
          {a.analiza.deVerificat.length > 0 && (
            <div>
              <h4 className="text-[13px] font-bold text-[var(--ci-text)]">{d.deVerificat}</h4>
              <ul className="mt-1.5 list-disc space-y-1 pl-5 text-[13px] text-[var(--ci-text)]">
                {a.analiza.deVerificat.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </div>
          )}
          <p className="text-[12px] text-[var(--ci-text-muted)]">{d.nota}</p>
        </div>
      )}
    </Card>
  );
}

export function TabAnaliza({ orgSlug, analize, aiConectat }: { orgSlug: string; analize: AnalizaSalvata[]; aiConectat: boolean }) {
  const locale = useLocale();
  const d = ANALIZE_AI_UI_DICT[locale].reclame;
  const router = useRouter();
  const [pending, start] = useTransition();
  const [mesaj, setMesaj] = useState<{ ok: boolean; text: string } | null>(null);

  function porneste() {
    setMesaj(null);
    start(async () => {
      try {
        const r = await pornesteAnalizaReclame(orgSlug);
        setMesaj(r.ok ? { ok: true, text: d.pornita } : { ok: false, text: r.mesaj });
      } catch {
        setMesaj({ ok: false, text: d.nuReusit });
      }
      router.refresh();
    });
  }

  const [ultima, ...restul] = analize;
  return (
    <div className="space-y-5">
      <Card className="space-y-3">
        <div>
          <h2 className="flex items-center gap-2 text-[16px] font-bold text-[var(--ci-text)]">
            <Sparkles className="h-4 w-4 text-[var(--ci-primary)]" aria-hidden /> {d.titlu}
          </h2>
          <p className="mt-0.5 text-[13px] text-[var(--ci-text-muted)]">{d.descriere}</p>
        </div>
        {!aiConectat && (
          <div className="rounded-[var(--ci-radius-btn)] bg-[var(--ci-amber-soft)] px-3 py-2 text-[13px] text-[var(--ci-text)]">
            <p>{d.faraCont}</p>
            <Link href={`/${orgSlug}/crm/setari#ai`} className="mt-1 inline-block font-medium underline">
              {d.deschideSetari}
            </Link>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary" onClick={porneste} loading={pending} disabled={pending || !aiConectat}>
            {pending ? d.seAnalizeaza : d.buton}
          </Button>
          {mesaj && (
            <p role="status" className={`text-[13px] ${mesaj.ok ? "text-[var(--ci-green)]" : "text-[var(--ci-red)]"}`}>
              {mesaj.text}
            </p>
          )}
        </div>
      </Card>

      {analize.length === 0 ? (
        <p className="text-[13px] text-[var(--ci-text-muted)]">{d.nuExista}</p>
      ) : (
        <>
          <Analiza a={ultima} deschisa />
          {restul.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-[13px] font-bold text-[var(--ci-text-muted)]">{d.anterioare}</h3>
              {restul.map((a) => (
                <Analiza key={a.id} a={a} deschisa={false} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
