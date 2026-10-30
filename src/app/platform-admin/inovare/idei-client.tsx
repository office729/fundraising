"use client";

import { useState, useTransition } from "react";

import type { IdeeAdmin } from "@/lib/inovare/admin";
import { CATEGORII, ETICHETE_EFORT, ETICHETE_STARE, STARI, type StareIdee } from "@/lib/inovare/model";

import { actualizeazaIdeeAction, unesteIdeiAction } from "./actions";

const camp = "h-9 w-full rounded-lg border border-line bg-panel px-2.5 text-sm text-ink";
const buton = "h-9 rounded-lg border border-line bg-panel px-3 text-sm font-semibold text-ink hover:bg-panel-2 disabled:opacity-50";
const dataRo = (iso: string) => new Intl.DateTimeFormat("ro-RO", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Bucharest" }).format(new Date(iso));
const CLASA_STARE: Record<StareIdee, string> = {
  propus: "bg-panel-2 text-body",
  in_planificare: "bg-blue-100 text-blue-900",
  in_dezvoltare: "bg-amber-100 text-amber-900",
  finalizat: "bg-brand-green-soft text-brand-green",
  nu_acum: "bg-panel-2 text-muted",
};

export function IdeiClient({ initiale }: { initiale: IdeeAdmin[] }) {
  const [idei, setIdei] = useState(initiale);
  const [filtru, setFiltru] = useState<StareIdee | "toate" | "ascunse">("toate");
  const lista = idei.filter((i) => (filtru === "toate" ? !i.ascunsa : filtru === "ascunse" ? i.ascunsa : !i.ascunsa && i.stare === filtru)).sort((a, b) => b.voturi - a.voturi || b.creatLa.localeCompare(a.creatLa));
  const numara = (f: typeof filtru) => idei.filter((i) => (f === "toate" ? !i.ascunsa : f === "ascunse" ? i.ascunsa : !i.ascunsa && i.stare === f)).length;
  return (
    <div className="mt-6">
      <div className="flex flex-wrap gap-1.5">
        {([{ c: "toate" as const, e: "Toate" }, ...STARI.map((s) => ({ c: s.cheie, e: s.eticheta })), { c: "ascunse" as const, e: "Ascunse" }]).map((f) => (
          <button key={f.c} type="button" onClick={() => setFiltru(f.c)} aria-pressed={filtru === f.c} className={`h-8 rounded-full px-3.5 text-xs font-semibold ${filtru === f.c ? "bg-brand-blue text-white" : "border border-line text-muted hover:bg-panel-2"}`}>
            {f.e} ({numara(f.c)})
          </button>
        ))}
      </div>
      {lista.length === 0 ? (
        <p className="mt-4 rounded-xl border border-line bg-panel p-5 text-sm text-muted">Nicio idee în această listă.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {lista.map((i) => (
            <Idee key={i.id} idee={i} toate={idei} laSchimbat={(nou) => setIdei((l) => l.map((x) => (x.id === nou.id ? nou : x)))} laUnit={(id) => setIdei((l) => l.map((x) => (x.id === id ? { ...x, ascunsa: true } : x)))} />
          ))}
        </ul>
      )}
    </div>
  );
}

function Idee({ idee, toate, laSchimbat, laUnit }: { idee: IdeeAdmin; toate: IdeeAdmin[]; laSchimbat: (i: IdeeAdmin) => void; laUnit: (id: string) => void }) {
  const [d, setD] = useState(idee);
  const [deschisa, setDeschisa] = useState(false);
  const [anunta, setAnunta] = useState(true);
  const [uneste, setUneste] = useState("");
  const [mesaj, setMesaj] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const modificata = d.stare !== idee.stare || d.efort !== idee.efort || d.categorie !== idee.categorie || d.raspunsEchipa !== idee.raspunsEchipa || d.titlu !== idee.titlu || d.descriere !== idee.descriere || d.ascunsa !== idee.ascunsa;

  const salveaza = () =>
    start(async () => {
      setMesaj(null);
      const r = await actualizeazaIdeeAction(idee.id, { titlu: d.titlu, descriere: d.descriere, categorie: d.categorie, stare: d.stare, efort: d.efort, raspunsEchipa: d.raspunsEchipa, ascunsa: d.ascunsa, anunta }).catch(() => ({ ok: false as const, eroare: "Nu am putut salva." }));
      if (r.ok) {
        laSchimbat(d);
        setMesaj({ ok: true, text: d.stare !== idee.stare && anunta && d.email ? "Salvat. Autorul a fost anunțat pe email." : "Salvat." });
      } else setMesaj({ ok: false, text: r.eroare });
    });

  return (
    <li id={idee.id} className="rounded-xl border border-line bg-panel p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <button type="button" onClick={() => setDeschisa((v) => !v)} aria-expanded={deschisa} className="text-left text-[15px] font-bold text-ink hover:underline">
            {idee.titlu}
          </button>
          <p className="mt-0.5 text-xs text-muted">
            {idee.organizatie || "Organizație necunoscută"}
            {idee.autor ? ` · ${idee.autor}` : ""} · {idee.categorie} · {dataRo(idee.creatLa)}
            {idee.efort ? ` · ${ETICHETE_EFORT[idee.efort as "scazut" | "mediu" | "mare"]}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-panel-2 px-2.5 py-0.5 text-xs font-bold text-ink">{idee.voturi} voturi</span>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${CLASA_STARE[idee.stare]}`}>{ETICHETE_STARE[idee.stare]}</span>
        </div>
      </div>
      {deschisa && (
        <div className="mt-4 space-y-3 border-t border-line pt-4">
          <label className="block text-xs font-medium text-muted">
            Titlu
            <input value={d.titlu} onChange={(e) => setD({ ...d, titlu: e.target.value })} className={`${camp} mt-1`} />
          </label>
          <label className="block text-xs font-medium text-muted">
            Descriere
            <textarea value={d.descriere} onChange={(e) => setD({ ...d, descriere: e.target.value })} rows={4} className={`${camp} mt-1 h-auto py-2`} />
          </label>
          {idee.cumFaciAcum && (
            <p className="text-xs text-muted">
              <strong className="text-ink">Cum rezolvă acum:</strong> {idee.cumFaciAcum}
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-xs font-medium text-muted">
              Stare
              <select value={d.stare} onChange={(e) => setD({ ...d, stare: e.target.value as StareIdee })} className={`${camp} mt-1`}>
                {STARI.map((s) => (
                  <option key={s.cheie} value={s.cheie}>
                    {s.eticheta}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-medium text-muted">
              Efort (apare lângă idee)
              <select value={d.efort} onChange={(e) => setD({ ...d, efort: e.target.value as IdeeAdmin["efort"] })} className={`${camp} mt-1`}>
                <option value="">Neevaluat</option>
                <option value="scazut">Efort mic</option>
                <option value="mediu">Efort mediu</option>
                <option value="mare">Efort mare</option>
              </select>
            </label>
            <label className="text-xs font-medium text-muted">
              Categorie
              <select value={d.categorie} onChange={(e) => setD({ ...d, categorie: e.target.value })} className={`${camp} mt-1`}>
                {CATEGORII.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="block text-xs font-medium text-muted">
            Răspunsul echipei (se vede în platformă, în fereastra ideii)
            <textarea value={d.raspunsEchipa} onChange={(e) => setD({ ...d, raspunsEchipa: e.target.value })} rows={3} className={`${camp} mt-1 h-auto py-2`} />
          </label>
          <div className="flex flex-wrap items-center gap-4 text-sm text-ink">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={anunta} onChange={(e) => setAnunta(e.target.checked)} className="h-4 w-4" />
              Anunță autorul pe email la schimbarea stării{idee.email ? ` (${idee.email})` : " (nu are email salvat)"}
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={d.ascunsa} onChange={(e) => setD({ ...d, ascunsa: e.target.checked })} className="h-4 w-4" />
              Ascunsă (nu se mai vede în platformă)
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" disabled={pending || !modificata} onClick={salveaza} className="h-9 rounded-lg bg-brand-blue px-4 text-sm font-semibold text-white disabled:opacity-50">
              {pending ? "Se salvează…" : "Salvează"}
            </button>
            {mesaj && (
              <p role={mesaj.ok ? "status" : "alert"} className={`text-sm ${mesaj.ok ? "text-brand-green" : "text-red-700"}`}>
                {mesaj.text}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
            <label className="text-xs font-medium text-muted">
              Este duplicat al…
              <select value={uneste} onChange={(e) => setUneste(e.target.value)} className={`${camp} mt-1 min-w-64`}>
                <option value="">Alege ideea principală</option>
                {toate
                  .filter((x) => x.id !== idee.id && !x.ascunsa)
                  .map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.titlu.slice(0, 70)} ({x.voturi})
                    </option>
                  ))}
              </select>
            </label>
            <button
              type="button"
              disabled={!uneste || pending}
              onClick={() => {
                if (!window.confirm("Unești ideile? Voturile trec la ideea principală, iar aceasta se ascunde.")) return;
                start(async () => {
                  const r = await unesteIdeiAction(idee.id, uneste).catch(() => ({ ok: false as const, eroare: "Nu am putut uni ideile." }));
                  if (r.ok) laUnit(idee.id);
                  else setMesaj({ ok: false, text: r.eroare });
                });
              }}
              className={`${buton} mt-5`}
            >
              Unește
            </button>
          </div>
        </div>
      )}
    </li>
  );
}
