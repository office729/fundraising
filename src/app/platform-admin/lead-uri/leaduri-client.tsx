"use client";

import { useMemo, useState, useTransition } from "react";

import { ETICHETE_STARE, leaduriCaCsv, MAX_NOTITA, potriveste, STARI_LEAD, type StareLead } from "@/lib/lead-uri";

import { salveazaNotitaLeadAction, schimbaStareLeadAction, stergeLeadAction, type LeadRand } from "./actions";

const dataRo = (iso: string) => new Date(iso).toLocaleDateString("ro-RO", { timeZone: "Europe/Bucharest", day: "numeric", month: "short", year: "numeric" });
const ZI_MS = 86_400_000;

const TON: Record<StareLead, string> = {
  nou: "bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200",
  contactat: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  in_discutie: "bg-purple-100 text-purple-900 dark:bg-purple-950 dark:text-purple-200",
  inscris: "bg-brand-green-soft text-brand-green",
  pierdut: "bg-panel-2 text-body",
};

function Lead({ l, onSchimbat, onSters }: { l: LeadRand; onSchimbat: (id: string, parte: Partial<LeadRand>) => void; onSters: (id: string) => void }) {
  const [deschis, setDeschis] = useState(false);
  const [notita, setNotita] = useState(l.notita ?? "");
  const [mesaj, setMesaj] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirmaStergere, setConfirmaStergere] = useState(false);
  const [pending, startTransition] = useTransition();

  const ruleaza = (f: () => Promise<{ ok: boolean; eroare?: string }>, ok: () => void, text: string) =>
    startTransition(async () => {
      setMesaj(null);
      try {
        const r = await f();
        if (r.ok) {
          ok();
          setMesaj({ ok: true, text });
        } else setMesaj({ ok: false, text: r.eroare ?? "Nu am putut salva." });
      } catch {
        setMesaj({ ok: false, text: "Nu am putut salva acum. Încearcă din nou." });
      }
    });

  return (
    <li className="rounded-xl border border-line bg-panel p-4">
      <div className="flex flex-wrap items-center gap-2 text-[13px]">
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${TON[l.stare]}`}>{ETICHETE_STARE[l.stare]}</span>
        <span className="font-semibold text-ink">{l.organizatie}</span>
        <span className="text-muted">
          {l.nume} · {dataRo(l.creatLa)}
        </span>
        {l.areCont && <span className="rounded-full bg-brand-green-soft px-2.5 py-0.5 text-xs font-bold text-brand-green">Are cont în platformă</span>}
        {l.nrTrimiteri > 1 && <span className="rounded-full bg-panel-2 px-2.5 py-0.5 text-xs font-semibold text-body">a completat de {l.nrTrimiteri} ori</span>}
        <a href={`mailto:${l.email}`} className="ml-auto break-all text-xs font-semibold text-brand-blue underline">
          {l.email}
        </a>
      </div>
      <p className="mt-1.5 text-xs text-muted">
        {l.telefon ? `Telefon: ${l.telefon}` : "Fără telefon"}
        {l.cale ? ` · de pe ${l.cale}` : ""}
        {l.campanie ? ` · ${l.campanie}` : ""}
      </p>

      <div className="mt-3 grid gap-2 border-t border-line pt-3 sm:grid-cols-[170px_1fr]">
        <label className="text-xs font-semibold text-muted">
          Starea
          <select
            value={l.stare}
            disabled={pending}
            onChange={(e) => {
              const stare = e.target.value as StareLead;
              ruleaza(() => schimbaStareLeadAction(l.id, stare), () => onSchimbat(l.id, { stare }), "Stare salvată.");
            }}
            className="mt-1 h-9 w-full rounded-md border border-line bg-panel px-2 text-sm text-ink"
          >
            {STARI_LEAD.map((s) => (
              <option key={s} value={s}>
                {ETICHETE_STARE[s]}
              </option>
            ))}
          </select>
        </label>
        <div>
          <button type="button" onClick={() => setDeschis(!deschis)} aria-expanded={deschis} className="text-xs font-semibold text-brand-blue underline">
            {deschis ? "Ascunde notița" : l.notita ? "Notiță (are text)" : "Adaugă o notiță"}
          </button>
          {deschis && (
            <div className="mt-1">
              <textarea value={notita} onChange={(e) => setNotita(e.target.value)} maxLength={MAX_NOTITA} rows={3} aria-label={`Notiță pentru ${l.organizatie}`} placeholder="Ce ați discutat, ce urmează." className="w-full rounded-md border border-line bg-panel px-2.5 py-2 text-sm text-ink" />
              <button
                type="button"
                disabled={pending || notita.trim() === (l.notita ?? "")}
                onClick={() => ruleaza(() => salveazaNotitaLeadAction(l.id, notita), () => onSchimbat(l.id, { notita: notita.trim() || null }), "Notiță salvată.")}
                className="mt-1 rounded-md bg-brand-blue px-4 py-1.5 text-[13px] font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Salvează notița
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-3">
        {!confirmaStergere ? (
          <button type="button" onClick={() => setConfirmaStergere(true)} className="text-xs font-semibold text-red-600 underline">
            Șterge lead-ul
          </button>
        ) : (
          <span className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold text-ink">Ștergere definitivă, fără anulare.</span>
            <button type="button" disabled={pending} onClick={() => ruleaza(() => stergeLeadAction(l.id), () => onSters(l.id), "Șters.")} className="rounded-md bg-red-600 px-3 py-1 font-bold text-white disabled:opacity-40">
              Confirmă ștergerea
            </button>
            <button type="button" onClick={() => setConfirmaStergere(false)} className="font-semibold text-muted underline">
              Renunță
            </button>
          </span>
        )}
        {mesaj && (
          <span role="status" className={`text-xs font-semibold ${mesaj.ok ? "text-brand-green" : "text-red-600"}`}>
            {mesaj.text}
          </span>
        )}
      </div>
    </li>
  );
}

export function LeaduriClient({ initial }: { initial: LeadRand[] }) {
  const [leaduri, setLeaduri] = useState(initial);
  const [filtru, setFiltru] = useState<StareLead | "toate">("toate");
  const [cautare, setCautare] = useState("");
  const [acum] = useState(() => Date.now());

  const numaratori = useMemo(() => {
    const n: Record<string, number> = { toate: leaduri.length };
    for (const s of STARI_LEAD) n[s] = leaduri.filter((l) => l.stare === s).length;
    return n;
  }, [leaduri]);
  const ultimele7Zile = useMemo(() => {
    const prag = acum - 7 * ZI_MS;
    return leaduri.filter((l) => new Date(l.creatLa).getTime() >= prag).length;
  }, [leaduri, acum]);
  const vizibile = useMemo(() => leaduri.filter((l) => (filtru === "toate" || l.stare === filtru) && potriveste(l, cautare)), [leaduri, filtru, cautare]);

  function descarca() {
    const csv = leaduriCaCsv(vizibile.map((l) => ({ creatLa: l.creatLa, nume: l.nume, organizatie: l.organizatie, email: l.email, telefon: l.telefon, stare: l.stare, campanie: l.campanie, cale: l.cale, nrTrimiteri: l.nrTrimiteri, notita: l.notita })));
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `lead-uri-alexandrit-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mt-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-line bg-panel p-5">
          <p className="text-xs font-semibold tracking-wide text-muted-2 uppercase">Total lead-uri</p>
          <p className="font-display mt-1 text-4xl font-extrabold text-ink tabular-nums">{numaratori.toate}</p>
        </div>
        <div className="rounded-xl border border-line bg-panel p-5">
          <p className="text-xs font-semibold tracking-wide text-muted-2 uppercase">De contactat (noi)</p>
          <p className="font-display mt-1 text-4xl font-extrabold text-ink tabular-nums">{numaratori.nou}</p>
        </div>
        <div className="rounded-xl border border-line bg-panel p-5">
          <p className="text-xs font-semibold tracking-wide text-muted-2 uppercase">În ultimele 7 zile</p>
          <p className="font-display mt-1 text-4xl font-extrabold text-ink tabular-nums">{ultimele7Zile}</p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {(["toate", ...STARI_LEAD] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFiltru(s)}
            aria-pressed={filtru === s}
            className={`rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition ${filtru === s ? "border-brand-blue bg-brand-blue text-white" : "border-line bg-panel text-body hover:border-brand-blue"}`}
          >
            {s === "toate" ? "Toate" : ETICHETE_STARE[s]} <span className="tabular-nums opacity-80">{numaratori[s]}</span>
          </button>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <input value={cautare} onChange={(e) => setCautare(e.target.value)} type="search" aria-label="Caută în lead-uri" placeholder="Caută după nume, organizație, e-mail sau telefon" className="h-10 w-full max-w-md rounded-md border border-line bg-panel px-3 text-sm text-ink" />
        <button type="button" onClick={descarca} disabled={vizibile.length === 0} className="rounded-md border border-line bg-panel px-4 py-2 text-[13px] font-bold text-brand-blue transition hover:border-brand-blue disabled:cursor-not-allowed disabled:opacity-40">
          Descarcă CSV ({vizibile.length})
        </button>
      </div>

      {vizibile.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-line bg-panel p-6 text-sm text-muted">
          {leaduri.length === 0 ? "Niciun lead încă. Apar aici când cineva completează formularul din pop-up sau de pe /descopera (după lansare)." : "Niciun lead nu se potrivește cu filtrul."}
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {vizibile.map((l) => (
            <Lead key={l.id} l={l} onSchimbat={(id, parte) => setLeaduri((v) => v.map((x) => (x.id === id ? { ...x, ...parte } : x)))} onSters={(id) => setLeaduri((v) => v.filter((x) => x.id !== id))} />
          ))}
        </ul>
      )}
    </div>
  );
}
