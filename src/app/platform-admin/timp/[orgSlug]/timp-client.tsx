"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";

import {
  CATEGORII,
  EXECUTANTI,
  formateazaMinute,
  sumaPentru,
  totaluri,
  type Categorie,
  type Executant,
  type Tarife,
} from "@/lib/timp-custom";

import { adaugaIntrareAction, opresteTimerAction, pornesteTimerAction, salveazaTarifeAction, stergeIntrareAction } from "../../timp-actions";

export type RandTimpClient = {
  id: string;
  executant: Executant;
  categorie: Categorie;
  descriere: string;
  minute: number | null;
  data: string;
  pornitLa: string | null;
  opritLa: string | null;
  creatDe: string | null;
};
export type DateTimpClient = { intrari: RandTimpClient[]; tarife: Tarife | null; actorId: string | null };

type Mesaj = { tip: "ok" | "eroare"; text: string } | null;

const clasaCamp = "w-full rounded-lg border border-line bg-panel px-2.5 py-1.5 text-sm";
const azi = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Bucharest" });

// Timer scurs: „1:05:09” sau „5:09”.
function cronometru(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const dd = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${dd(m)}:${dd(r)}` : `${m}:${dd(r)}`;
}

// CSV pentru facturare. Celulele care ar putea fi interpretate ca formule de Excel (încep cu = + - @) sunt prefixate cu apostrof.
function celula(x: string | number): string {
  const t = String(x);
  const sigur = /^[=+\-@]/.test(t) ? `'${t}` : t;
  return `"${sigur.replace(/"/g, '""')}"`;
}

export function TimpClient({ org, date, arataClientului }: { org: { id: string; slug: string; nume: string }; date: DateTimpClient; arataClientului: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [mesaj, setMesaj] = useState<Mesaj>(null);

  const terminate = useMemo(() => date.intrari.filter((i) => i.minute !== null) as (RandTimpClient & { minute: number })[], [date.intrari]);
  const pornit = date.intrari.find((i) => i.pornitLa && !i.opritLa && i.creatDe === date.actorId) ?? null;
  const tarifeActive = date.tarife && (date.tarife.claude > 0 || date.tarife.echipa > 0) ? date.tarife : null;
  const tot = useMemo(() => totaluri(terminate, tarifeActive), [terminate, tarifeActive]);

  // Cronometrul afișat cât rulează timerul.
  const [acum, setAcum] = useState(() => Date.now());
  useEffect(() => {
    if (!pornit) return;
    const t = setInterval(() => setAcum(Date.now()), 1000);
    return () => clearInterval(t);
  }, [pornit]);

  const [timer, setTimer] = useState<{ executant: Executant; categorie: Categorie; descriere: string }>({ executant: "claude", categorie: "custom", descriere: "" });
  const [manual, setManual] = useState<{ executant: Executant; categorie: Categorie; descriere: string; minute: string; data: string }>({
    executant: "echipa",
    categorie: "custom",
    descriere: "",
    minute: "",
    data: azi(),
  });
  const [tarife, setTarife] = useState({ claude: String(date.tarife?.claude ?? 0), echipa: String(date.tarife?.echipa ?? 0), moneda: date.tarife?.moneda ?? "RON" });

  function ruleaza(actiune: () => Promise<{ ok: true; minute?: number } | { ok: false; eroare: string }>, textOk: string, dupa?: () => void) {
    setMesaj(null);
    start(async () => {
      const r = await actiune();
      if (r.ok) {
        setMesaj({ tip: "ok", text: r.minute ? `${textOk} (${formateazaMinute(r.minute)}).` : textOk });
        dupa?.();
        router.refresh();
      } else setMesaj({ tip: "eroare", text: r.eroare });
    });
  }

  function exportaCsv() {
    const rd = (i: RandTimpClient & { minute: number }) => {
      const tarif = date.tarife ? (i.executant === "claude" ? date.tarife.claude : date.tarife.echipa) : 0;
      return [i.data, EXECUTANTI[i.executant], CATEGORII[i.categorie], i.descriere, i.minute, (i.minute / 60).toFixed(2), tarif ? sumaPentru(i.minute, tarif).toFixed(2) : ""];
    };
    const linii = [["Data", "Cine", "Categorie", "Descriere", "Minute", "Ore", `Suma (${date.tarife?.moneda ?? "RON"})`], ...[...terminate].reverse().map(rd)];
    const text = "﻿" + linii.map((l) => l.map(celula).join(";")).join("\r\n");
    const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `timp-${org.slug}-${azi()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const moneda = date.tarife?.moneda ?? "RON";
  const bani = (n: number) => `${n.toLocaleString("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${moneda}`;

  return (
    <div className="mt-6 space-y-6">
      {mesaj && (
        <p role="status" className={`rounded-lg px-3 py-2 text-sm ${mesaj.tip === "ok" ? "bg-brand-green-soft text-brand-green" : "bg-red-100 text-red-900"}`}>
          {mesaj.text}
        </p>
      )}

      <section aria-label="Totaluri" className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-line bg-panel p-4">
          <p className="text-xs text-muted">Total timp</p>
          <p className="mt-1 text-2xl font-bold text-ink tabular-nums">{formateazaMinute(tot.minute)}</p>
          {tot.suma && <p className="mt-1 text-sm text-ink">De facturat: <strong>{bani(tot.suma.total)}</strong></p>}
        </div>
        {(Object.keys(EXECUTANTI) as Executant[]).map((e) => (
          <div key={e} className="rounded-xl border border-line bg-panel p-4">
            <p className="text-xs text-muted">{EXECUTANTI[e]}</p>
            <p className="mt-1 text-2xl font-bold text-ink tabular-nums">{formateazaMinute(tot.peExecutant[e])}</p>
            {tot.suma && <p className="mt-1 text-sm text-muted">{bani(tot.suma[e])}</p>}
          </div>
        ))}
      </section>
      <p className="-mt-3 text-xs text-muted">
        {(Object.keys(CATEGORII) as Categorie[]).map((c) => `${CATEGORII[c]}: ${formateazaMinute(tot.peCategorie[c])}`).join(" · ")}
        {!tarifeActive && " · Setează tarifele mai jos ca să vezi suma de facturat."}
      </p>

      <section aria-labelledby="titlu-timer" className="rounded-xl border border-line bg-panel p-4">
        <h2 id="titlu-timer" className="text-sm font-semibold text-ink">
          Timer
        </h2>
        {pornit ? (
          <div className="mt-3 flex flex-wrap items-center gap-4">
            <p className="text-3xl font-bold text-ink tabular-nums" aria-live="off">
              {cronometru(acum - new Date(pornit.pornitLa as string).getTime())}
            </p>
            <p className="min-w-0 flex-1 text-sm text-muted">
              {EXECUTANTI[pornit.executant]} · {CATEGORII[pornit.categorie]} · {pornit.descriere}
            </p>
            <button
              type="button"
              disabled={pending}
              onClick={() => ruleaza(() => opresteTimerAction(org.id, pornit.id), "Timer oprit și salvat")}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Oprește
            </button>
          </div>
        ) : (
          <form
            className="mt-3 grid gap-2 sm:grid-cols-[10rem_14rem_1fr_auto]"
            onSubmit={(e) => {
              e.preventDefault();
              ruleaza(() => pornesteTimerAction(org.id, timer), "Timer pornit", () => setTimer((t) => ({ ...t, descriere: "" })));
            }}
          >
            <select aria-label="Cine lucrează" value={timer.executant} onChange={(e) => setTimer((t) => ({ ...t, executant: e.target.value as Executant }))} className={clasaCamp}>
              {(Object.keys(EXECUTANTI) as Executant[]).map((k) => (
                <option key={k} value={k}>
                  {EXECUTANTI[k]}
                </option>
              ))}
            </select>
            <select aria-label="Categoria" value={timer.categorie} onChange={(e) => setTimer((t) => ({ ...t, categorie: e.target.value as Categorie }))} className={clasaCamp}>
              {(Object.keys(CATEGORII) as Categorie[]).map((k) => (
                <option key={k} value={k}>
                  {CATEGORII[k]}
                </option>
              ))}
            </select>
            <input aria-label="La ce lucrezi" placeholder="La ce lucrezi (vizibil clientului)" maxLength={300} value={timer.descriere} onChange={(e) => setTimer((t) => ({ ...t, descriere: e.target.value }))} className={clasaCamp} />
            <button type="submit" disabled={pending} className="rounded-lg bg-brand-green px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
              Pornește
            </button>
          </form>
        )}
      </section>

      <section aria-labelledby="titlu-manual" className="rounded-xl border border-line bg-panel p-4">
        <h2 id="titlu-manual" className="text-sm font-semibold text-ink">
          Adaugă timp manual
        </h2>
        <p className="text-xs text-muted">Pentru timp deja lucrat (de exemplu Claude: 45 de minute la o variantă nouă). Durată: 90, 1h30, 1:30 sau 2h.</p>
        <form
          className="mt-3 grid gap-2 sm:grid-cols-[8rem_10rem_12rem_1fr_7rem_auto]"
          onSubmit={(e) => {
            e.preventDefault();
            ruleaza(() => adaugaIntrareAction(org.id, manual), "Intrare adăugată", () => setManual((m) => ({ ...m, descriere: "", minute: "" })));
          }}
        >
          <input aria-label="Data" type="date" value={manual.data} onChange={(e) => setManual((m) => ({ ...m, data: e.target.value }))} className={clasaCamp} />
          <select aria-label="Cine a lucrat" value={manual.executant} onChange={(e) => setManual((m) => ({ ...m, executant: e.target.value as Executant }))} className={clasaCamp}>
            {(Object.keys(EXECUTANTI) as Executant[]).map((k) => (
              <option key={k} value={k}>
                {EXECUTANTI[k]}
              </option>
            ))}
          </select>
          <select aria-label="Categoria" value={manual.categorie} onChange={(e) => setManual((m) => ({ ...m, categorie: e.target.value as Categorie }))} className={clasaCamp}>
            {(Object.keys(CATEGORII) as Categorie[]).map((k) => (
              <option key={k} value={k}>
                {CATEGORII[k]}
              </option>
            ))}
          </select>
          <input aria-label="Descriere" placeholder="Ce s-a făcut (vizibil clientului)" maxLength={300} value={manual.descriere} onChange={(e) => setManual((m) => ({ ...m, descriere: e.target.value }))} className={clasaCamp} />
          <input aria-label="Durata" placeholder="1h30" value={manual.minute} onChange={(e) => setManual((m) => ({ ...m, minute: e.target.value }))} className={clasaCamp} />
          <button type="submit" disabled={pending} className="rounded-lg border border-line px-4 py-2 text-sm font-semibold text-ink disabled:opacity-50">
            Adaugă
          </button>
        </form>
      </section>

      <section aria-labelledby="titlu-tarife" className="rounded-xl border border-line bg-panel p-4">
        <h2 id="titlu-tarife" className="text-sm font-semibold text-ink">
          Tarife pe oră <span className="font-normal text-muted">(doar tu le vezi)</span>
        </h2>
        <form
          className="mt-3 flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            ruleaza(() => salveazaTarifeAction(org.id, tarife), "Tarife salvate");
          }}
        >
          <label className="text-xs text-muted">
            Claude
            <input inputMode="decimal" value={tarife.claude} onChange={(e) => setTarife((t) => ({ ...t, claude: e.target.value }))} className={`${clasaCamp} mt-1 w-28`} />
          </label>
          <label className="text-xs text-muted">
            Echipa noastră
            <input inputMode="decimal" value={tarife.echipa} onChange={(e) => setTarife((t) => ({ ...t, echipa: e.target.value }))} className={`${clasaCamp} mt-1 w-28`} />
          </label>
          <label className="text-xs text-muted">
            Moneda
            <select value={tarife.moneda} onChange={(e) => setTarife((t) => ({ ...t, moneda: e.target.value as "RON" | "EUR" }))} className={`${clasaCamp} mt-1 w-24`}>
              <option value="RON">RON</option>
              <option value="EUR">EUR</option>
            </select>
          </label>
          <button type="submit" disabled={pending} className="rounded-lg border border-line px-4 py-2 text-sm font-semibold text-ink disabled:opacity-50">
            Salvează tarifele
          </button>
        </form>
      </section>

      <section aria-labelledby="titlu-intrari">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="titlu-intrari" className="text-sm font-semibold text-ink">
            Intrări ({terminate.length})
          </h2>
          <div className="flex items-center gap-3 text-xs">
            <span className={arataClientului ? "font-medium text-brand-green" : "text-muted"}>
              {arataClientului ? "Clientul vede această listă (fără tarife)" : "Clientul NU vede încă pagina „Timp alocat”"}
            </span>
            <button type="button" onClick={exportaCsv} disabled={terminate.length === 0} className="rounded-lg border border-line px-3 py-1.5 font-medium text-ink disabled:opacity-50">
              Descarcă CSV
            </button>
          </div>
        </div>
        {terminate.length === 0 ? (
          <p className="mt-3 rounded-xl border border-line bg-panel p-4 text-sm text-muted">Nicio intrare încă. Pornește timerul sau adaugă timp manual.</p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-xl border border-line bg-panel">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line text-xs text-muted">
                <tr>
                  <th className="px-3 py-2 font-medium">Data</th>
                  <th className="px-3 py-2 font-medium">Cine</th>
                  <th className="px-3 py-2 font-medium">Categorie</th>
                  <th className="px-3 py-2 font-medium">Descriere</th>
                  <th className="px-3 py-2 text-right font-medium">Durată</th>
                  {date.tarife && <th className="px-3 py-2 text-right font-medium">Sumă</th>}
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {terminate.map((i) => (
                  <tr key={i.id} className="border-b border-line last:border-0">
                    <td className="px-3 py-2 whitespace-nowrap tabular-nums">{new Date(`${i.data}T00:00:00`).toLocaleDateString("ro-RO", { day: "2-digit", month: "short", year: "numeric" })}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{EXECUTANTI[i.executant]}</td>
                    <td className="px-3 py-2">{CATEGORII[i.categorie]}</td>
                    <td className="px-3 py-2">{i.descriere}</td>
                    <td className="px-3 py-2 text-right whitespace-nowrap tabular-nums">{formateazaMinute(i.minute)}</td>
                    {date.tarife && (
                      <td className="px-3 py-2 text-right whitespace-nowrap tabular-nums">{bani(sumaPentru(i.minute, i.executant === "claude" ? date.tarife.claude : date.tarife.echipa))}</td>
                    )}
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        disabled={pending}
                        aria-label={`Șterge intrarea „${i.descriere}”`}
                        onClick={() => window.confirm("Ștergi această intrare?") && ruleaza(() => stergeIntrareAction(org.id, i.id), "Intrare ștearsă")}
                        className="text-xs font-medium text-red-700 hover:underline disabled:opacity-50"
                      >
                        Șterge
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
