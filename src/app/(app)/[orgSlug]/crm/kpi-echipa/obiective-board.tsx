"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  campAplicabil,
  culoarePctObi,
  fmtRon,
  OBI_CAMPURI,
  OBI_MECANISME,
  type ObiCamp,
  type ObiLunar,
  type ObiMecanism,
  type ObiectiveOrg,
  pctDelta,
  realizatManual,
} from "@/lib/kpi-obiective";

import { salveazaObiective, setObiectivAnual } from "./obiective-actions";

type Grid = Record<ObiMecanism, Partial<Record<ObiCamp, string>>>;
const gridGol = (): Grid => ({ d177: {}, mec20: {}, f230: {} });

const BTN = "rounded-lg border border-[var(--ci-border)] px-3 py-1.5 text-[13px] font-semibold text-[var(--ci-text)] hover:bg-[var(--ci-surface-2)]";

export function ObiectiveBoard({ obi }: { obi: ObiectiveOrg }) {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const router = useRouter();
  const [busy, start] = useTransition();
  const [eroare, setEroare] = useState("");
  const [editare, setEditare] = useState(false);
  const [obiL, setObiL] = useState<Grid>(gridGol());
  const [realL, setRealL] = useState<Grid>(gridGol());

  const realizat = (mec: ObiMecanism, camp: ObiCamp): number => obi.realizat[mec]?.[camp] ?? 0;
  const realizatPrev = (mec: ObiMecanism, camp: ObiCamp): number => obi.realizatPrev[mec]?.[camp] ?? 0;

  function porneste() {
    const g = (src: ObiLunar): Grid => {
      const out = gridGol();
      for (const m of OBI_MECANISME) for (const c of OBI_CAMPURI) out[m.key][c.key] = src[m.key]?.[c.key] ? String(src[m.key][c.key]) : "";
      return out;
    };
    setObiL(g(obi.obiLunar));
    setRealL(g(obi.realManual));
    setEroare("");
    setEditare(true);
  }

  function salveaza() {
    const toObi = (g: Grid, doarManual: boolean): ObiLunar => {
      const out: ObiLunar = { d177: {}, mec20: {}, f230: {} };
      for (const m of OBI_MECANISME)
        for (const c of OBI_CAMPURI) {
          if (doarManual && !realizatManual(m.key, c.key)) continue;
          const v = Math.round(Number(g[m.key]?.[c.key]));
          if (Number.isFinite(v) && v > 0) out[m.key][c.key] = v;
        }
      return out;
    };
    start(async () => {
      try {
        await salveazaObiective(orgSlug, { luna: obi.luna, obiLunar: toObi(obiL, false), realManualLuna: toObi(realL, true) });
        setEditare(false);
        router.refresh();
      } catch {
        setEroare("Nu s-au putut salva obiectivele.");
      }
    });
  }

  const inp = "ci-tabular w-full rounded-md border border-[var(--ci-border)] bg-[var(--ci-surface)] px-2 py-1 text-right text-[13px] text-[var(--ci-text)]";

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="ci-display text-lg font-bold text-[var(--ci-text)]">
          Obiective <span className="text-[13px] font-normal text-[var(--ci-text-muted)]">(organizație · {obi.lunaLabel})</span>
        </h2>
        {editare ? (
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setEditare(false)} className="rounded-lg border border-[var(--ci-border)] px-3 py-1.5 text-[13px] font-medium text-[var(--ci-text-muted)] hover:bg-[var(--ci-surface-2)]">
              Renunță
            </button>
            <button type="button" onClick={salveaza} disabled={busy} className="rounded-lg bg-[var(--ci-primary)] px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-[var(--ci-primary-hover)] disabled:opacity-50">
              {busy ? "Se salvează…" : "Salvează obiectivele"}
            </button>
          </div>
        ) : (
          <button type="button" onClick={porneste} className={BTN}>
            Editează obiectivele
          </button>
        )}
      </div>
      {eroare && <p className="mt-1 text-[12px] text-[var(--ci-red)]">{eroare}</p>}

      <div className="mt-2 rounded-xl border border-[var(--ci-border)] bg-[var(--ci-surface)] p-4">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-[13px]">
            <thead>
              <tr className="border-b border-[var(--ci-border)] text-right text-[12px] text-[var(--ci-text-muted)]">
                <th className="py-1.5 pr-3 text-left">Mecanism</th>
                {OBI_CAMPURI.map((c) => (
                  <th key={c.key} className="px-3 py-1.5">{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {OBI_MECANISME.map((m) => (
                <tr key={m.key} className="border-b border-dashed border-[var(--ci-border)] text-right align-top">
                  <td className="py-2 pr-3 text-left font-semibold text-[var(--ci-text)]">{m.label}</td>
                  {OBI_CAMPURI.map((c) => {
                    if (!campAplicabil(m.key, c.key)) {
                      return (
                        <td key={c.key} className="px-3 py-2 text-[11px] text-[var(--ci-text-faint)]">
                          —
                        </td>
                      );
                    }
                    const real = realizat(m.key, c.key);
                    const obiectiv = obi.obiLunar[m.key]?.[c.key];
                    const manual = realizatManual(m.key, c.key);
                    if (editare) {
                      return (
                        <td key={c.key} className="px-2 py-2">
                          <div className="flex flex-col items-end gap-1">
                            {manual ? (
                              <input type="number" min={0} value={realL[m.key]?.[c.key] ?? ""} onChange={(e) => setRealL((s) => ({ ...s, [m.key]: { ...s[m.key], [c.key]: e.target.value } }))} placeholder="realizat" className={inp} />
                            ) : (
                              <span className="ci-tabular text-[12px] text-[var(--ci-text-muted)]">
                                {c.bani ? fmtRon(real) : real} <span className="text-[10px]">(auto)</span>
                              </span>
                            )}
                            <input type="number" min={0} value={obiL[m.key]?.[c.key] ?? ""} onChange={(e) => setObiL((s) => ({ ...s, [m.key]: { ...s[m.key], [c.key]: e.target.value } }))} placeholder="obiectiv" className={inp} />
                          </div>
                        </td>
                      );
                    }
                    const delta = pctDelta(real, realizatPrev(m.key, c.key));
                    const mom =
                      delta === null ? null : (
                        <span className="text-[10px] font-semibold" style={{ color: delta >= 0 ? "var(--ci-green)" : "var(--ci-red)" }} title="față de luna precedentă">
                          {delta >= 0 ? "▲" : "▼"} {Math.abs(delta)}%
                        </span>
                      );
                    if (!obiectiv) {
                      return (
                        <td key={c.key} className="ci-tabular px-3 py-2 font-semibold text-[var(--ci-text)]">
                          {c.bani ? fmtRon(real) : real}
                          <div className="text-[10.5px] font-normal text-[var(--ci-text-faint)]">fără obiectiv {mom}</div>
                        </td>
                      );
                    }
                    const pct = obiectiv > 0 ? Math.round((real / obiectiv) * 100) : 0;
                    return (
                      <td key={c.key} className="px-3 py-2">
                        <span className="ci-tabular font-bold" style={{ color: culoarePctObi(pct) }}>
                          {c.bani ? fmtRon(real) : real}
                        </span>
                        <div className="ci-tabular text-[11px] text-[var(--ci-text-muted)]">din {c.bani ? fmtRon(obiectiv) : obiectiv}</div>
                        <div className="text-[10.5px] font-semibold" style={{ color: culoarePctObi(pct) }}>
                          {pct}% <span className="font-normal text-[var(--ci-text-faint)]">· ritm {obi.pace.lunarPct}%</span> {mom}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[12px] leading-relaxed text-[var(--ci-text-muted)]">
          Sumele și numărul de sponsorizări <b className="text-[var(--ci-text)]">D177</b>/<b className="text-[var(--ci-text)]">20%</b> se calculează automat din sponsorizările înregistrate pe firmele marcate cu mecanismul respectiv; <b className="text-[var(--ci-text)]">apelurile</b> — din apelurile către acele firme; <b className="text-[var(--ci-text)]">formularele 230</b> — din formularele primite. Manual rămâne doar <b className="text-[var(--ci-text)]">suma 230</b> (estimare — banii merg de la ANAF direct la ONG). „Ritm” = cât din lună a trecut ({obi.pace.zileScurse}/{obi.pace.zileTotal} zile lucrătoare). ▲/▼ = față de luna trecută.
        </p>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <CardAnual cheie="financiar" titlu="Obiectiv financiar anual" real={obi.autoAnual.financiar} obiectiv={obi.obiAnual.financiar} bani sub={`sponsorizări înregistrate · ritm an ${obi.pace.anualPct}%`} paceAnual={obi.pace.anualPct} />
        <CardAnual cheie="firme" titlu="Firme sponsorizate pe an" real={obi.autoAnual.firme} obiectiv={obi.obiAnual.firme} sub={`firme distincte · ritm an ${obi.pace.anualPct}%`} paceAnual={obi.pace.anualPct} />
        <CardAnual cheie="formulare230" titlu="Formulare 230 pe an" real={obi.autoAnual.formulare230} obiectiv={obi.obiAnual.formulare230} sub={`anul ${obi.an} · ritm an ${obi.pace.anualPct}%`} paceAnual={obi.pace.anualPct} />
      </div>
    </div>
  );
}

function CardAnual({
  cheie,
  titlu,
  real,
  obiectiv,
  bani,
  sub,
  paceAnual,
}: {
  cheie: "financiar" | "firme" | "formulare230";
  titlu: string;
  real: number;
  obiectiv?: number;
  bani?: boolean;
  sub: string;
  paceAnual?: number;
}) {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const router = useRouter();
  const [busy, start] = useTransition();
  const [editare, setEditare] = useState(false);
  const [valoare, setValoare] = useState("");
  // La obiectiv anual, „pe grafic" = procentul realizat ≥ ritmul anului (cât din an a trecut).
  const pctRaw = obiectiv && obiectiv > 0 ? (real / obiectiv) * 100 : 0;
  const pct = Math.round(pctRaw);
  const peGrafic = paceAnual == null || pctRaw >= paceAnual;
  const fmtVal = (n: number) => (bani ? fmtRon(n) : n.toLocaleString("ro-RO"));
  const culoare = peGrafic ? "var(--ci-green)" : "var(--ci-red)";

  function salveaza() {
    start(async () => {
      await setObiectivAnual(orgSlug, cheie, Math.round(Number(valoare)) || 0);
      setEditare(false);
      router.refresh();
    });
  }

  return (
    <div className="rounded-xl border border-[var(--ci-border)] bg-[var(--ci-surface)] p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[12px] text-[var(--ci-text-muted)]">{titlu}</p>
        {!editare && (
          <button
            type="button"
            onClick={() => {
              setValoare(obiectiv ? String(obiectiv) : "");
              setEditare(true);
            }}
            className="shrink-0 text-[12px] font-medium text-[var(--ci-primary)] hover:underline"
            title="Editează obiectivul anual"
          >
            {obiectiv ? "editează" : "adaugă obiectiv"}
          </button>
        )}
      </div>
      <p className="ci-tabular mt-1 text-[20px] font-bold" style={{ color: obiectiv ? culoare : "var(--ci-text)" }}>
        {fmtVal(real)}
      </p>
      {editare ? (
        <div className="mt-1 flex items-center gap-1.5">
          <input
            type="number"
            min={0}
            autoFocus
            value={valoare}
            onChange={(e) => setValoare(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") salveaza();
              if (e.key === "Escape") setEditare(false);
            }}
            placeholder="obiectiv anual"
            className="ci-tabular w-full rounded-md border border-[var(--ci-border)] bg-[var(--ci-surface)] px-2 py-1 text-right text-[13px] text-[var(--ci-text)]"
          />
          <button type="button" onClick={salveaza} disabled={busy} className="shrink-0 rounded-md bg-[var(--ci-primary)] px-2.5 py-1 text-[12px] font-semibold text-white disabled:opacity-50">
            {busy ? "…" : "OK"}
          </button>
          <button type="button" onClick={() => setEditare(false)} className="shrink-0 rounded-md border border-[var(--ci-border)] px-2 py-1 text-[12px] text-[var(--ci-text-muted)]">
            ×
          </button>
        </div>
      ) : obiectiv ? (
        <p className="ci-tabular text-[12px] text-[var(--ci-text-muted)]">
          din {fmtVal(obiectiv)} · <span className="font-semibold" style={{ color: culoare }}>{pct}%</span>{" "}
          <span className="font-normal text-[var(--ci-text-faint)]">{peGrafic ? "pe grafic" : "sub ritm"}</span>
        </p>
      ) : (
        <p className="text-[11px] text-[var(--ci-text-faint)]">fără obiectiv</p>
      )}
      <p className="mt-1 text-[11px] text-[var(--ci-text-faint)]">{sub}</p>
    </div>
  );
}
