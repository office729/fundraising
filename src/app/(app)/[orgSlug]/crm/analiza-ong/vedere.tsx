"use client";

import { Check, Copy, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { formatUsd } from "@/lib/ai-org/consum";
import { bucatiInline, parseazaRaport, textDeCopiat } from "@/lib/analiza-ong/analiza";
import type { AnalizaOngRand } from "@/lib/analiza-ong/server";
import { ANALIZE_AI_UI_DICT } from "@/lib/i18n/dictionaries/analize-ai-ui";

import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input, Label } from "../components/ui/input";
import { useLocale } from "../lib/locale-context";

import { pornesteAnalizaOng, stergeAnalizaOng } from "./actions";

const TON_STARE = { in_lucru: "blue", gata: "green", eroare: "red" } as const;

function Inline({ text }: { text: string }) {
  return (
    <>
      {bucatiInline(text).map((b, i) =>
        b.bold ? (
          <strong key={i} className="font-semibold text-[var(--ci-text)]">
            {b.text}
          </strong>
        ) : (
          <span key={i}>{b.text}</span>
        ),
      )}
    </>
  );
}

// Raportul (Markdown simplu scris de AI) afișat ca text: titluri, liste, paragrafe. Niciun HTML din raport nu ajunge în pagină.
function Raport({ raport }: { raport: string }) {
  const d = ANALIZE_AI_UI_DICT[useLocale()].ong;
  const { sectiuni, lipsa } = parseazaRaport(raport);
  return (
    <div className="space-y-4">
      {lipsa.length > 0 && lipsa.length < 8 && <p className="text-[12px] text-[var(--ci-amber)]">{d.lipsa(lipsa.join(", "))}</p>}
      {sectiuni.map((s, i) => (
        <section key={i}>
          {s.titlu && <h4 className="text-[14px] font-bold text-[var(--ci-text)]">{s.titlu}</h4>}
          <div className="mt-1 space-y-1.5 text-[13.5px] text-[var(--ci-text)]">
            {s.blocuri.map((b, j) =>
              b.tip === "lista" ? (
                <ul key={j} className="list-disc space-y-1 pl-5">
                  {b.elemente.map((e, k) => (
                    <li key={k}>
                      <Inline text={e} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p key={j}>
                  <Inline text={b.text} />
                </p>
              ),
            )}
          </div>
        </section>
      ))}
    </div>
  );
}

function Rand({ a, orgSlug }: { a: AnalizaOngRand; orgSlug: string }) {
  const locale = useLocale();
  const d = ANALIZE_AI_UI_DICT[locale].ong;
  const router = useRouter();
  const [pending, start] = useTransition();
  const [deschis, setDeschis] = useState(false);
  const [copiat, setCopiat] = useState<"nu" | "da" | "eroare">("nu");
  const data = new Date(a.creatLa).toLocaleString(locale === "ro" ? "ro-RO" : "en-GB", { timeZone: "Europe/Bucharest", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  async function copiaza() {
    if (!a.raport) return;
    try {
      await navigator.clipboard.writeText(textDeCopiat(a.nume, a.raport, a.surse));
      setCopiat("da");
    } catch {
      setCopiat("eroare");
    }
    setTimeout(() => setCopiat("nu"), 2500);
  }

  function sterge() {
    if (!window.confirm(d.confirmaSterge)) return;
    start(async () => {
      await stergeAnalizaOng(orgSlug, a.id).catch(() => null);
      router.refresh();
    });
  }

  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[14.5px] font-semibold text-[var(--ci-text)]">{a.nume}</p>
          <p className="text-[12px] text-[var(--ci-text-muted)]">
            {data}
            {a.stare === "gata" && ` · ${d.infoCost(String(a.cautari), formatUsd(a.costUsd, locale))}`}
          </p>
          {(a.site || a.interes) && (
            <p className="mt-0.5 text-[12px] text-[var(--ci-text-muted)] [overflow-wrap:anywhere]">
              {a.site && `${d.site}: ${a.site}`}
              {a.site && a.interes && " · "}
              {a.interes && `${d.interes}: ${a.interes}`}
            </p>
          )}
        </div>
        <Badge tone={TON_STARE[a.stare]}>{d.stare[a.stare]}</Badge>
      </div>

      {a.stare === "in_lucru" && <p className="text-[13px] text-[var(--ci-text-muted)]">{d.inLucruNota}</p>}
      {a.eroare && <p className={`text-[13px] ${a.stare === "eroare" ? "text-[var(--ci-red)]" : "text-[var(--ci-amber)]"}`}>{a.eroare}</p>}

      {a.stare === "gata" && a.raport && (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => setDeschis((v) => !v)} aria-expanded={deschis}>
            {deschis ? d.inchide : d.deschide}
          </Button>
          <Button size="sm" onClick={copiaza}>
            {copiat === "da" ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
            {copiat === "da" ? d.copiat : copiat === "eroare" ? d.copiereEsuata : d.copiaza}
          </Button>
          <Button size="sm" variant="ghost" onClick={sterge} loading={pending}>
            <Trash2 className="h-3.5 w-3.5" aria-hidden /> {d.sterge}
          </Button>
        </div>
      )}
      {a.stare === "eroare" && (
        <Button size="sm" variant="ghost" onClick={sterge} loading={pending}>
          <Trash2 className="h-3.5 w-3.5" aria-hidden /> {d.sterge}
        </Button>
      )}

      {deschis && a.raport && (
        <div className="space-y-4 border-t border-[var(--ci-border)] pt-3">
          <p className="text-[12px] text-[var(--ci-text-muted)]">{d.avertisment}</p>
          <Raport raport={a.raport} />
          <section>
            <h4 className="text-[14px] font-bold text-[var(--ci-text)]">{d.surse}</h4>
            {a.surse.length === 0 ? (
              <p className="mt-1 text-[13px] text-[var(--ci-text-muted)]">{d.faraSurse}</p>
            ) : (
              <ul className="mt-1 list-disc space-y-1 pl-5 text-[13px]">
                {a.surse.map((s) => (
                  <li key={s.url} className="[overflow-wrap:anywhere]">
                    <a href={s.url} target="_blank" rel="noopener noreferrer nofollow" className="text-[var(--ci-primary)] underline">
                      {s.titlu}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </Card>
  );
}

export function AnalizaOngVedere({ orgSlug, analize, aiConectat }: { orgSlug: string; analize: AnalizaOngRand[]; aiConectat: boolean }) {
  const locale = useLocale();
  const d = ANALIZE_AI_UI_DICT[locale].ong;
  const router = useRouter();
  const [pending, start] = useTransition();
  const [nume, setNume] = useState("");
  const [site, setSite] = useState("");
  const [interes, setInteres] = useState("");
  const [mesaj, setMesaj] = useState<{ ok: boolean; text: string } | null>(null);

  // Cât o analiză e „în lucru”, pagina se reîmprospătează singură la 10 secunde (și se oprește când toate sunt terminate).
  const inLucru = analize.some((a) => a.stare === "in_lucru");
  useEffect(() => {
    if (!inLucru) return;
    const t = setInterval(() => router.refresh(), 10_000);
    return () => clearInterval(t);
  }, [inLucru, router]);

  function porneste(e: React.FormEvent) {
    e.preventDefault();
    setMesaj(null);
    start(async () => {
      try {
        const r = await pornesteAnalizaOng(orgSlug, { nume, site, interes });
        if (r.ok) {
          setMesaj({ ok: true, text: d.pornita });
          setNume("");
          setSite("");
          setInteres("");
        } else {
          setMesaj({ ok: false, text: r.mesaj ?? d.erori[r.cod] ?? d.erori.generala });
        }
      } catch {
        setMesaj({ ok: false, text: d.erori.generala });
      }
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-[900px] space-y-5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--ci-radius-btn)] bg-[var(--ci-primary-soft)] text-[var(--ci-primary)]" aria-hidden>
          <Search className="h-5 w-5" />
        </span>
        <div>
          <h1 className="ci-display text-xl font-bold text-[var(--ci-text)]">{d.titlu}</h1>
          <p className="mt-0.5 text-[13px] text-[var(--ci-text-muted)]">{d.subtitlu}</p>
        </div>
      </div>

      {!aiConectat && (
        <div className="rounded-[var(--ci-radius-card)] bg-[var(--ci-amber-soft)] px-4 py-3 text-[13px] text-[var(--ci-text)]">
          <p>{d.faraCont}</p>
          <Link href={`/${orgSlug}/crm/setari#ai`} className="mt-1 inline-block font-medium underline">
            {d.deschideSetari}
          </Link>
        </div>
      )}

      <Card>
        <form onSubmit={porneste} className="space-y-3">
          <div>
            <Label htmlFor="ong-nume">{d.formular.nume}</Label>
            <Input id="ong-nume" value={nume} onChange={(e) => setNume(e.target.value)} maxLength={120} placeholder={d.formular.numePlaceholder} required />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="ong-site">{d.formular.site}</Label>
              <Input id="ong-site" value={site} onChange={(e) => setSite(e.target.value)} maxLength={200} placeholder={d.formular.sitePlaceholder} inputMode="url" />
            </div>
            <div>
              <Label htmlFor="ong-interes">{d.formular.interes}</Label>
              <Input id="ong-interes" value={interes} onChange={(e) => setInteres(e.target.value)} maxLength={300} placeholder={d.formular.interesPlaceholder} />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" variant="primary" loading={pending} disabled={pending || !aiConectat || !nume.trim()}>
              {pending ? d.formular.sePorneste : d.formular.buton}
            </Button>
            {mesaj && (
              <p role="status" className={`text-[13px] ${mesaj.ok ? "text-[var(--ci-green)]" : "text-[var(--ci-red)]"}`}>
                {mesaj.text}
              </p>
            )}
          </div>
          <p className="text-[12.5px] text-[var(--ci-text-muted)]">{d.nota}</p>
        </form>
      </Card>

      <div>
        <h2 className="text-[15px] font-bold text-[var(--ci-text)]">{d.lista}</h2>
        <p className="text-[12.5px] text-[var(--ci-text-muted)]">{d.listaNota}</p>
      </div>
      {analize.length === 0 ? (
        <p className="text-[13px] text-[var(--ci-text-muted)]">{d.gol}</p>
      ) : (
        <div className="space-y-3">
          {analize.map((a) => (
            <Rand key={a.id} a={a} orgSlug={orgSlug} />
          ))}
        </div>
      )}
    </div>
  );
}
