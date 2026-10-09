"use client";

import { Download, ExternalLink, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { AnalizePf } from "@/lib/donatori-pf-analiza";
import { PRAGURI, SEGMENTE_META } from "@/lib/donatori-pf-filtre";

import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardHeader } from "../../components/ui/card";
import { Select } from "../../components/ui/input";
import { seteazaStareDonator, type StarePatch } from "../pf-actions";
import { dataRo, leiRo, nrRo, procentRo } from "../pf-format";

const R_ETICHETE = ["0–6 luni", "6–12 luni", "12–24 luni", "peste 24 luni"];
const F_ETICHETE = ["1 donație", "2 donații", "3–4 donații", "5+ donații"];
const LUNI = ["ian", "feb", "mar", "apr", "mai", "iun", "iul", "aug", "sep", "oct", "nov", "dec"];

export function AnalizeClient({ orgSlug, date }: { orgSlug: string; date: AnalizePf }) {
  const router = useRouter();
  const [eroare, setEroare] = useState("");
  const baza = `/${orgSlug}/crm/donatori`;

  async function seteazaEtapa(id: string, etapa: string) {
    setEroare("");
    const r = await seteazaStareDonator(orgSlug, id, { wbStage: (etapa || null) as StarePatch["wbStage"] });
    if (!r.ok) setEroare(r.eroare);
    else router.refresh();
  }
  const exporta = (qs: string) => {
    const a = document.createElement("a");
    a.href = `/api/${orgSlug}/donatori-export?${qs}&canal=toate`;
    a.download = "";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const { churn, winback } = date;
  const maxLuna = Math.max(1, ...churn.lunar.map((l) => l.n));
  const maxRfm = Math.max(1, ...date.rfm.map((x) => x.n));
  const rfm = (r: number, f: number) => date.rfm.find((x) => x.r === r && x.f === f);
  const ani = date.cohorte.length ? Array.from({ length: Math.max(...date.cohorte.map((c) => c.an), ...date.cohorte.flatMap((c) => Object.keys(c.pe).map(Number))) - Math.min(...date.cohorte.map((c) => c.an)) + 1 }, (_, i) => Math.min(...date.cohorte.map((c) => c.an)) + i) : [];

  return (
    <div className="space-y-5">
      {eroare && (
        <p role="alert" className="rounded-lg bg-[var(--ci-red-soft)] px-3 py-2 text-[13px] text-[var(--ci-red)]">
          {eroare}
        </p>
      )}

      {/* Churn newsletter */}
      <Card>
        <CardHeader title="Churn la newsletter" subtitle="Câți donatori s-au dezabonat de la emailurile de campanie și cât au donat până atunci." action={<Link href={`${baza}?seg=dezabonati`} prefetch={false} className="text-[12.5px] font-medium text-[var(--ci-primary)] hover:underline">Vezi dezabonații</Link>} />
        <div className="grid gap-4 lg:grid-cols-[auto_1fr]">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:w-[480px]">
            <Cifra eticheta="Rata de churn" valoare={procentRo(churn.rata, 1)} tona={churn.rata > 0.1 ? "amber" : undefined} hint="Dezabonați din cei care au fost abonați" />
            <Cifra eticheta="Abonați acum" valoare={nrRo(churn.abonati)} />
            <Cifra eticheta="Dezabonați" valoare={nrRo(churn.dezabonati)} />
            <Cifra eticheta="Donat de dezabonați" valoare={leiRo(churn.sumaPierduta)} hint="Suma totală donată de cei care s-au dezabonat" />
            <Cifra eticheta="Dezabonați recurenți" valoare={nrRo(churn.dezabonatiRecurenti)} />
            <Cifra eticheta="Fără consimțământ" valoare={nrRo(churn.faraConsimtamant)} />
          </div>
          <div>
            <p className="text-[12px] font-semibold tracking-wide text-[var(--ci-text-faint)] uppercase">Dezabonări pe lună (ultimele 12)</p>
            {churn.lunar.length === 0 ? (
              <p className="mt-2 text-[13px] text-[var(--ci-text-muted)]">Nicio dezabonare în ultimele 12 luni.</p>
            ) : (
              <div className="mt-3 flex h-28 items-end gap-2" role="img" aria-label="Dezabonări pe lună">
                {churn.lunar.map((l) => (
                  <div key={l.luna} className="flex flex-1 flex-col items-center gap-1">
                    <span className="ci-tabular text-[11px] text-[var(--ci-text-muted)]">{l.n}</span>
                    <div className="w-full rounded-t bg-[var(--ci-amber)]" style={{ height: `${Math.max(6, (l.n / maxLuna) * 72)}px` }} />
                    <span className="text-[11px] text-[var(--ci-text-muted)]">{LUNI[Number(l.luna.slice(5, 7)) - 1]}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <p className="mt-3 flex items-start gap-2 text-[12.5px] text-[var(--ci-text-muted)]">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[var(--ci-green)]" aria-hidden />
          Dezabonații, cei fără consimțământ și cei marcați „nu contactat” sunt excluși automat de la exporturile pe canal și de la emailurile de campanie, indiferent de segmentul ales.
        </p>
      </Card>

      {/* Risc de abandon și win-back */}
      <Card>
        <CardHeader
          title="Risc de abandon și win-back"
          subtitle={`Donatori recurenți (nu lunari) care au depășit de cel puțin 1,5 ori intervalul lor obișnuit între donații. Scorul crește cu cât întârzie mai mult. Segmentul „Risc de abandon” din listă îi prinde pe cei opriți de ${PRAGURI.riscDeLuni}–${PRAGURI.riscPanaLuni} luni.`}
          action={<Link href={`${baza}?seg=risc`} prefetch={false} className="text-[12.5px] font-medium text-[var(--ci-primary)] hover:underline">Vezi în listă</Link>}
        />
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Cifra eticheta="În reactivare" valoare={nrRo(winback.reactivare)} />
          <Cifra eticheta="Reactivați" valoare={nrRo(winback.reactivat)} tona="green" />
          <Cifra eticheta="Pierduți" valoare={nrRo(winback.pierdut)} />
          <Cifra eticheta="Rata de reactivare" valoare={winback.rata === null ? "—" : procentRo(winback.rata, 0)} hint="Reactivați din (reactivați + pierduți)" />
        </div>
        {date.lapse.length === 0 ? (
          <p className="text-[13px] text-[var(--ci-text-muted)]">Niciun donator recurent nu pare să se fi oprit acum.</p>
        ) : (
          <div className="overflow-x-auto rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)]">
            <table className="w-full min-w-[820px] text-[13px]">
              <thead>
                <tr className="border-b border-[var(--ci-border)] bg-[var(--ci-surface-2)] text-left text-[12px] text-[var(--ci-text-muted)]">
                  <th className="px-3 py-2 font-semibold">Donator</th>
                  <th className="px-3 py-2 text-right font-semibold">Donații</th>
                  <th className="px-3 py-2 text-right font-semibold">Total</th>
                  <th className="px-3 py-2 font-semibold">Ultima donație</th>
                  <th className="px-3 py-2 text-right font-semibold">Interval obișnuit</th>
                  <th className="px-3 py-2 text-right font-semibold">De la ultima</th>
                  <th className="px-3 py-2 font-semibold">Risc</th>
                  <th className="px-3 py-2 font-semibold">Win-back</th>
                </tr>
              </thead>
              <tbody>
                {date.lapse.map((l) => (
                  <tr key={l.id} className="border-b border-[var(--ci-border)] last:border-0">
                    <td className="px-3 py-2">
                      <Link href={`${baza}/reali/${l.id}`} prefetch={false} className="font-medium text-[var(--ci-text)] hover:text-[var(--ci-primary)]">
                        {l.nume}
                      </Link>
                      <span className="block text-[11.5px] text-[var(--ci-text-muted)]">{l.email}</span>
                    </td>
                    <td className="ci-tabular px-3 py-2 text-right">{l.nr}</td>
                    <td className="ci-tabular px-3 py-2 text-right whitespace-nowrap">{leiRo(l.total)}</td>
                    <td className="ci-tabular px-3 py-2 whitespace-nowrap text-[var(--ci-text-muted)]">{dataRo(l.ultima)}</td>
                    <td className="ci-tabular px-3 py-2 text-right whitespace-nowrap">{l.intervalMediu} zile</td>
                    <td className="ci-tabular px-3 py-2 text-right whitespace-nowrap">{l.zileDeLaUltima} zile</td>
                    <td className="px-3 py-2">
                      <Badge tone={l.scor >= 70 ? "red" : l.scor >= 45 ? "amber" : "neutral"} icon={false}>
                        {l.scor}/100
                      </Badge>
                    </td>
                    <td className="px-3 py-2">
                      <Select value={l.wbStage ?? ""} onChange={(e) => seteazaEtapa(l.id, e.target.value)} aria-label={`Etapă win-back pentru ${l.nume}`} className="h-8 text-[12.5px]">
                        <option value="">—</option>
                        <option value="reactivare">În reactivare</option>
                        <option value="reactivat">Reactivat</option>
                        <option value="pierdut">Pierdut</option>
                      </Select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Radar */}
      <Card>
        <CardHeader title="Radar: segmente ascunse" subtitle="Grupuri pe care o listă obișnuită nu le arată, bune pentru campanii țintite. Fiecare se poate deschide în listă sau exporta în Excel." />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {date.radar.map((r) => {
            const meta = SEGMENTE_META.find((s) => s.key === r.key)!;
            return (
              <div key={r.key} className="flex flex-col rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] p-4">
                <p className="text-[14px] font-semibold text-[var(--ci-text)]">{meta.label}</p>
                <p className="mt-0.5 flex-1 text-[12.5px] text-[var(--ci-text-muted)]">{meta.hint}</p>
                <p className="ci-tabular mt-3 text-[22px] font-bold text-[var(--ci-text)]">{nrRo(r.count)}</p>
                <p className="ci-tabular text-[12px] text-[var(--ci-text-muted)]">{leiRo(r.valoare)} donați în total</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link href={`${baza}?seg=${r.key}`} prefetch={false} className="inline-flex h-8 items-center gap-1.5 rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] px-3 text-[13px] font-medium text-[var(--ci-text)] hover:bg-[var(--ci-surface-2)]">
                    <ExternalLink className="size-4" aria-hidden /> Vezi lista
                  </Link>
                  <Button size="sm" disabled={r.count === 0} onClick={() => exporta(`seg=${r.key}`)}>
                    <Download className="size-4" aria-hidden /> Excel
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* RFM */}
      <Card>
        <CardHeader title="RFM: recență × frecvență" subtitle="Câți donatori sunt în fiecare combinație între cât de recent au donat și de câte ori au donat. Mai închis = mai mulți." />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-separate border-spacing-1 text-[13px]">
            <thead>
              <tr>
                <th className="px-2 py-1 text-left text-[12px] font-semibold text-[var(--ci-text-muted)]">Ultima donație ↓ / Frecvență →</th>
                {F_ETICHETE.map((f) => (
                  <th key={f} className="px-2 py-1 text-center text-[12px] font-semibold text-[var(--ci-text-muted)]">
                    {f}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {R_ETICHETE.map((re, ri) => (
                <tr key={re}>
                  <th scope="row" className="px-2 py-1 text-left text-[12.5px] font-medium text-[var(--ci-text)]">
                    {re}
                  </th>
                  {F_ETICHETE.map((_, fi) => {
                    const c = rfm(ri + 1, fi + 1);
                    const intens = c ? 0.12 + 0.7 * (c.n / maxRfm) : 0;
                    return (
                      <td key={fi} className="rounded-md px-2 py-2.5 text-center" style={{ background: c ? `color-mix(in oklab, var(--ci-primary) ${Math.round(intens * 100)}%, var(--ci-surface))` : "var(--ci-surface-2)" }}>
                        <span className={`ci-tabular block text-[14px] font-bold ${intens > 0.5 ? "text-white" : "text-[var(--ci-text)]"}`}>{c ? nrRo(c.n) : "—"}</span>
                        {c && <span className={`ci-tabular block text-[11px] ${intens > 0.5 ? "text-white/85" : "text-[var(--ci-text-muted)]"}`}>{leiRo(c.suma)}</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Cohorte */}
      <Card>
        <CardHeader title="Cohorte: câți mai donează" subtitle="Pe rânduri: anul primei donații. Pe coloane: ce procent din cohortă a donat în fiecare an." />
        {date.cohorte.length === 0 ? (
          <p className="text-[13px] text-[var(--ci-text-muted)]">Nu există încă destule date.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] border-separate border-spacing-1 text-[13px]">
              <thead>
                <tr>
                  <th className="px-2 py-1 text-left text-[12px] font-semibold text-[var(--ci-text-muted)]">Cohorta</th>
                  <th className="px-2 py-1 text-right text-[12px] font-semibold text-[var(--ci-text-muted)]">Donatori</th>
                  {ani.map((a) => (
                    <th key={a} className="px-2 py-1 text-center text-[12px] font-semibold text-[var(--ci-text-muted)]">
                      {a}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {date.cohorte.map((c) => (
                  <tr key={c.an}>
                    <th scope="row" className="px-2 py-1 text-left font-semibold text-[var(--ci-text)]">
                      {c.an}
                    </th>
                    <td className="ci-tabular px-2 py-1 text-right">{nrRo(c.donatori)}</td>
                    {ani.map((a) => {
                      if (a < c.an) return <td key={a} />;
                      const p = c.donatori > 0 ? (c.pe[a] ?? 0) / c.donatori : 0;
                      return (
                        <td key={a} className="rounded-md px-2 py-1.5 text-center" style={{ background: `color-mix(in oklab, var(--ci-green) ${Math.round(Math.min(1, p) * 70)}%, var(--ci-surface))` }}>
                          <span className={`ci-tabular text-[12.5px] font-semibold ${p > 0.6 ? "text-white" : "text-[var(--ci-text)]"}`}>{procentRo(p)}</span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function Cifra({ eticheta, valoare, tona, hint }: { eticheta: string; valoare: string; tona?: "green" | "amber"; hint?: string }) {
  return (
    <div className="rounded-[var(--ci-radius-btn)] bg-[var(--ci-surface-2)] px-3 py-2.5" title={hint}>
      <p className="text-[11.5px] text-[var(--ci-text-muted)]">{eticheta}</p>
      <p className={`ci-tabular mt-0.5 text-[16px] font-bold ${tona === "green" ? "text-[var(--ci-green)]" : tona === "amber" ? "text-[var(--ci-amber)]" : "text-[var(--ci-text)]"}`}>{valoare}</p>
    </div>
  );
}
