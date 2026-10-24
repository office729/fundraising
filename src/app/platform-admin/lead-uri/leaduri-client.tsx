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

const FOCUS = "focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:outline-none";

function Lead({ l, onSchimbat, onSters }: { l: LeadRand; onSchimbat: (id: string, parte: Partial<LeadRand>) => void; onSters: (id: string) => void }) {
  const [deschis, setDeschis] = useState(false);
  const [notita, setNotita] = useState(l.notita ?? "");
  const [mesaj, setMesaj] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirmaStergere, setConfirmaStergere] = useState(false);
  const [copiat, setCopiat] = useState(false);
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

  const copiaza = async () => {
    try {
      await navigator.clipboard.writeText(l.email);
      setCopiat(true);
      setTimeout(() => setCopiat(false), 2000);
    } catch {
      setCopiat(false);
    }
  };

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
        <span className="ml-auto flex items-center gap-2">
          <a href={`mailto:${encodeURIComponent(l.email).replace(/%40/g, "@")}`} className={`break-all text-xs font-semibold text-brand-blue underline ${FOCUS}`}>
            {l.email}
          </a>
          <button type="button" onClick={copiaza} className={`min-h-9 rounded-md border border-line px-2.5 text-xs font-semibold text-body ${FOCUS}`}>
            {copiat ? "Copiat" : "Copiază"}
          </button>
        </span>
      </div>
      <p className="mt-1.5 text-xs text-muted">
        {l.telefon ? (
          <>
            Telefon:{" "}
            <a href={`tel:${l.telefon.replace(/[^+\d]/g, "")}`} className={`inline-flex min-h-9 items-center font-semibold text-brand-blue underline ${FOCUS}`}>
              {l.telefon}
            </a>
          </>
        ) : (
          "Fără telefon"
        )}
        {l.cale ? ` · de pe ${l.cale}` : ""}
        {l.campanie ? ` · ${l.campanie}` : ""}
      </p>
      {l.notita && !deschis && <p className="mt-1.5 text-[13px] whitespace-pre-line text-body">{l.notita.length > 140 ? `${l.notita.slice(0, 140)}…` : l.notita}</p>}
      {l.actualizatLa && (
        <p className="mt-1 text-xs text-muted">
          Ultima schimbare: {l.actualizatDe ? `${l.actualizatDe.split("@")[0]}, ` : ""}
          {dataRo(l.actualizatLa)}
        </p>
      )}

      <div className="mt-3 grid gap-2 border-t border-line pt-3 sm:grid-cols-[170px_1fr]">
        <label className="text-xs font-semibold text-muted">
          Starea
          <select
            value={l.stare}
            disabled={pending}
            onChange={(e) => {
              const stare = e.target.value as StareLead;
              ruleaza(() => schimbaStareLeadAction(l.id, stare), () => onSchimbat(l.id, { stare, actualizatLa: new Date().toISOString() }), "Stare salvată.");
            }}
            className={`mt-1 h-11 w-full rounded-md border border-line bg-panel px-2 text-sm text-ink ${FOCUS}`}
          >
            {STARI_LEAD.map((s) => (
              <option key={s} value={s}>
                {ETICHETE_STARE[s]}
              </option>
            ))}
          </select>
          <span role="status" aria-live="polite" className={`mt-1 block min-h-4 text-xs font-semibold ${mesaj?.ok ? "text-brand-green" : "text-red-600"}`}>
            {mesaj?.text ?? ""}
          </span>
        </label>
        <div>
          <button type="button" onClick={() => setDeschis(!deschis)} aria-expanded={deschis} className={`min-h-9 text-xs font-semibold text-brand-blue underline ${FOCUS}`}>
            {deschis ? "Ascunde notița" : l.notita ? "Editează notița" : "Adaugă o notiță"}
          </button>
          {deschis && (
            <div className="mt-1">
              <textarea value={notita} onChange={(e) => setNotita(e.target.value)} maxLength={MAX_NOTITA} rows={3} aria-label={`Notiță pentru ${l.organizatie}`} aria-describedby={`notita-ajutor-${l.id}`} placeholder="Ce ați discutat, ce urmează." className={`w-full rounded-md border border-line bg-panel px-2.5 py-2 text-sm text-ink ${FOCUS}`} />
              <p id={`notita-ajutor-${l.id}`} className="mt-1 text-xs text-muted">
                Scrie doar fapte: ce ați discutat și ce urmează. Fără păreri despre persoană și fără date sensibile (sănătate, convingeri). Persoana poate cere să vadă ce am notat despre ea.
              </p>
              <button
                type="button"
                disabled={pending || notita.trim() === (l.notita ?? "")}
                onClick={() => ruleaza(() => salveazaNotitaLeadAction(l.id, notita), () => onSchimbat(l.id, { notita: notita.trim() || null, actualizatLa: new Date().toISOString() }), "Notiță salvată.")}
                className={`mt-1 min-h-10 rounded-md bg-brand-blue px-4 py-1.5 text-[13px] font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS}`}
              >
                Salvează notița
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-3 border-t border-line pt-2">
        {!confirmaStergere ? (
          <button type="button" onClick={() => setConfirmaStergere(true)} className={`min-h-9 text-xs font-semibold text-muted underline ${FOCUS}`}>
            Șterge definitiv (cerere GDPR)
          </button>
        ) : (
          <span className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold text-ink">Ștergere definitivă, fără anulare. Dacă doar nu a mai răspuns, marchează-l „Pierdut”.</span>
            <button type="button" disabled={pending} onClick={() => ruleaza(() => stergeLeadAction(l.id), () => onSters(l.id), "Șters.")} className={`min-h-10 rounded-md bg-red-600 px-3 py-1 font-bold text-white disabled:opacity-40 ${FOCUS}`}>
              Confirmă ștergerea
            </button>
            <button type="button" onClick={() => setConfirmaStergere(false)} className={`min-h-9 font-semibold text-muted underline ${FOCUS}`}>
              Renunță
            </button>
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
  const [vechi, setVechi] = useState(false);
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
  const vizibile = useMemo(() => {
    const lista = leaduri.filter((l) => (filtru === "toate" || l.stare === filtru) && potriveste(l, cautare));
    return vechi ? [...lista].reverse() : lista;
  }, [leaduri, filtru, cautare, vechi]);
  const filtrat = filtru !== "toate" || cautare.trim() !== "";

  function descarca() {
    const csv = leaduriCaCsv(vizibile.map((l) => ({ creatLa: l.creatLa, nume: l.nume, organizatie: l.organizatie, email: l.email, telefon: l.telefon, stare: l.stare, campanie: l.campanie, cale: l.cale, nrTrimiteri: l.nrTrimiteri, notita: l.notita })));
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `lead-uri-alexandrit-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const card = "rounded-xl border border-line bg-panel p-5 text-left";
  return (
    <div className="mt-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <button type="button" onClick={() => setFiltru("toate")} className={`${card} transition hover:border-brand-blue ${FOCUS}`}>
          <p className="text-xs font-semibold tracking-wide text-muted-2 uppercase">Total cereri</p>
          <p className="font-display mt-1 text-4xl font-extrabold text-ink tabular-nums">{numaratori.toate}</p>
        </button>
        <button type="button" onClick={() => setFiltru("nou")} className={`${card} transition hover:border-brand-blue ${FOCUS}`}>
          <p className="text-xs font-semibold tracking-wide text-muted-2 uppercase">De contactat (noi)</p>
          <p className="font-display mt-1 text-4xl font-extrabold text-ink tabular-nums">{numaratori.nou}</p>
        </button>
        <div className={card}>
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
            className={`min-h-10 rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition ${FOCUS} ${filtru === s ? "border-brand-blue bg-brand-blue text-white" : "border-line bg-panel text-body hover:border-brand-blue"}`}
          >
            {s === "toate" ? "Toate" : ETICHETE_STARE[s]} <span className="tabular-nums opacity-80">{numaratori[s]}</span>
          </button>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <input value={cautare} onChange={(e) => setCautare(e.target.value)} type="search" aria-label="Caută în cereri" placeholder="Caută după nume, organizație, e-mail sau telefon" className={`h-11 w-full max-w-md rounded-md border border-line bg-panel px-3 text-sm text-ink ${FOCUS}`} />
        <label className="flex items-center gap-2 text-[13px] text-body">
          Ordine
          <select value={vechi ? "vechi" : "noi"} onChange={(e) => setVechi(e.target.value === "vechi")} className={`h-11 rounded-md border border-line bg-panel px-2 text-sm text-ink ${FOCUS}`}>
            <option value="noi">Cele mai noi întâi</option>
            <option value="vechi">Cele mai vechi întâi</option>
          </select>
        </label>
        <button type="button" onClick={descarca} disabled={vizibile.length === 0} className={`min-h-11 rounded-md border border-line bg-panel px-4 py-2 text-[13px] font-bold text-brand-blue transition hover:border-brand-blue disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS}`}>
          Descarcă CSV ({vizibile.length})
        </button>
      </div>

      {vizibile.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-line bg-panel p-6 text-sm text-muted">
          <p>{leaduri.length === 0 ? "Nicio cerere încă. Apar aici când cineva completează formularul „Descoperă Alexandrit”." : "Nicio cerere nu se potrivește cu filtrul."}</p>
          {filtrat && (
            <button
              type="button"
              onClick={() => {
                setFiltru("toate");
                setCautare("");
              }}
              className={`mt-2 min-h-10 font-semibold text-brand-blue underline ${FOCUS}`}
            >
              Șterge filtrele
            </button>
          )}
        </div>
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
