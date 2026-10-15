"use client";

import { useState, useTransition } from "react";

import { CATEGORII_SUGESTIE, STARI_SUGESTIE } from "@/lib/feedback/calcule";

import { raspundeSugestieAction, type FeedbackAdminRand } from "./actions";

const dataRo = (iso: string) => new Date(iso).toLocaleDateString("ro-RO", { day: "numeric", month: "short", year: "numeric" });

const TON: Record<string, string> = {
  neutral: "bg-panel-2 text-body",
  blue: "bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200",
  amber: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  green: "bg-brand-green-soft text-brand-green",
};

function Sugestie({ s, onSalvat }: { s: FeedbackAdminRand; onSalvat: (id: string, stare: string, raspuns: string | null, raspunsLa: string | null) => void }) {
  const [stare, setStare] = useState(s.stare);
  const [raspuns, setRaspuns] = useState(s.raspuns ?? "");
  const [mesaj, setMesaj] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const modificat = stare !== s.stare || raspuns.trim() !== (s.raspuns ?? "");
  const st = STARI_SUGESTIE.find((x) => x.cheie === s.stare) ?? STARI_SUGESTIE[0];

  function salveaza() {
    setMesaj(null);
    startTransition(async () => {
      try {
        const r = await raspundeSugestieAction(s.id, stare, raspuns);
        if (r.ok) {
          onSalvat(s.id, stare, raspuns.trim() || null, r.raspunsLa);
          setMesaj({ ok: true, text: "Salvat. Autorul îl vede în pagina lui." });
        } else setMesaj({ ok: false, text: r.eroare });
      } catch {
        setMesaj({ ok: false, text: "Nu am putut salva acum. Încearcă din nou." });
      }
    });
  }

  return (
    <div className="rounded-xl border border-line bg-panel p-4">
      <div className="flex flex-wrap items-center gap-2 text-[13px]">
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${TON[st.ton]}`}>{st.eticheta}</span>
        <span className="font-semibold text-ink">{s.orgNume}</span>
        <span className="text-muted">
          {CATEGORII_SUGESTIE.find((c) => c.cheie === s.categorie)?.eticheta ?? s.categorie} · {dataRo(s.createdAt)}
        </span>
        {s.contact && (
          <a href={`mailto:${s.contact}`} className="ml-auto text-xs font-semibold text-brand-blue underline">
            {s.contact}
          </a>
        )}
      </div>
      <p className="mt-2 text-sm font-semibold text-ink">{s.titlu}</p>
      <p className="mt-1 text-[13px] whitespace-pre-line text-body">{s.mesaj}</p>

      <div className="mt-3 grid gap-2 border-t border-line pt-3 sm:grid-cols-[170px_1fr]">
        <label className="text-xs font-semibold text-muted">
          Starea
          <select value={stare} onChange={(e) => setStare(e.target.value)} className="mt-1 h-9 w-full rounded-md border border-line bg-panel px-2 text-sm text-ink">
            {STARI_SUGESTIE.map((x) => (
              <option key={x.cheie} value={x.cheie}>
                {x.eticheta}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-muted">
          Răspuns pentru autor {s.raspunsLa && <span className="font-normal">(trimis {dataRo(s.raspunsLa)})</span>}
          <textarea value={raspuns} onChange={(e) => setRaspuns(e.target.value)} maxLength={2000} rows={2} placeholder="Opțional: o propoziție-două despre ce urmează sau de ce nu acum." className="mt-1 w-full rounded-md border border-line bg-panel px-2.5 py-2 text-sm font-normal text-ink" />
        </label>
      </div>
      <div className="mt-2 flex items-center gap-3">
        <button type="button" onClick={salveaza} disabled={pending || !modificat} className="rounded-md bg-brand-blue px-4 py-1.5 text-[13px] font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40">
          {pending ? "Se salvează…" : "Salvează"}
        </button>
        {mesaj && (
          <span role="status" className={`text-xs font-semibold ${mesaj.ok ? "text-brand-green" : "text-red-600"}`}>
            {mesaj.text}
          </span>
        )}
      </div>
    </div>
  );
}

export function SugestiiAdmin({ initial }: { initial: FeedbackAdminRand[] }) {
  const [lista, setLista] = useState(initial);
  const [filtru, setFiltru] = useState<string>("deschise");

  const vizibile = lista.filter((s) => (filtru === "toate" ? true : filtru === "deschise" ? s.stare === "nou" || s.stare === "in-analiza" : s.stare === filtru));
  const numar = (f: string) => lista.filter((s) => (f === "toate" ? true : f === "deschise" ? s.stare === "nou" || s.stare === "in-analiza" : s.stare === f)).length;
  const filtre = [{ cheie: "deschise", eticheta: "De tratat" }, ...STARI_SUGESTIE.map((x) => ({ cheie: x.cheie as string, eticheta: x.eticheta })), { cheie: "toate", eticheta: "Toate" }];

  return (
    <div>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrează după stare">
        {filtre.map((f) => (
          <button
            key={f.cheie}
            type="button"
            aria-pressed={filtru === f.cheie}
            onClick={() => setFiltru(f.cheie)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${filtru === f.cheie ? "border-brand-blue bg-brand-blue text-white" : "border-line bg-panel text-body hover:border-brand-blue"}`}
          >
            {f.eticheta} <span className="tabular-nums opacity-70">{numar(f.cheie)}</span>
          </button>
        ))}
      </div>
      <div className="mt-3 space-y-3">
        {vizibile.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line bg-panel p-6 text-sm text-muted">Nicio sugestie în această categorie.</p>
        ) : (
          vizibile.map((s) => (
            <Sugestie
              key={s.id}
              s={s}
              onSalvat={(id, stare, raspuns, raspunsLa) => setLista((p) => p.map((x) => (x.id === id ? { ...x, stare, raspuns, raspunsLa } : x)))}
            />
          ))
        )}
      </div>
    </div>
  );
}
