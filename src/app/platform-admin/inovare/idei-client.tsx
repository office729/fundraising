"use client";

import { useState, useTransition } from "react";

import type { IdeeAdmin } from "@/lib/inovare/admin";
import { CATEGORII, ETICHETE_EFORT, ETICHETE_FRECVENTA, ETICHETE_OBIECTIV, ETICHETE_STARE, esteVictorieRapida, STARI, TERMENE, type Indicatori, type StareIdee } from "@/lib/inovare/model";

import { actualizeazaIdeeAction, unesteIdeiAction } from "./actions";

const camp = "h-9 w-full rounded-lg border border-line bg-panel px-2.5 text-sm text-ink";
const buton = "h-9 rounded-lg border border-line bg-panel px-3 text-sm font-semibold text-ink hover:bg-panel-2 disabled:opacity-50";
const dataRo = (iso: string) => new Intl.DateTimeFormat("ro-RO", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Bucharest" }).format(new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso));
const CLASA_STARE: Record<StareIdee, string> = {
  propus: "bg-panel-2 text-body",
  vazuta: "bg-teal-100 text-teal-900",
  in_planificare: "bg-blue-100 text-blue-900",
  in_dezvoltare: "bg-amber-100 text-amber-900",
  finalizat: "bg-brand-green-soft text-brand-green",
  nu_acum: "bg-panel-2 text-muted",
};

type Filtru = StareIdee | "toate" | "ascunse" | "fara_raspuns" | "raportate";
type Ordine = "scor" | "voturi" | "noi";

export function IdeiClient({ initiale, indicatori }: { initiale: IdeeAdmin[]; indicatori: Indicatori }) {
  const [idei, setIdei] = useState(initiale);
  const [filtru, setFiltru] = useState<Filtru>("toate");
  const [ordine, setOrdine] = useState<Ordine>("scor");
  const potrivesc = (i: IdeeAdmin, f: Filtru) => {
    if (f === "ascunse") return i.ascunsa;
    if (f === "raportate") return i.ascunsa && i.motivAscundere === "raportata";
    if (i.ascunsa) return false;
    if (f === "toate") return true;
    if (f === "fara_raspuns") return i.stare === "propus" && !i.primulRaspunsLa;
    return i.stare === f;
  };
  const lista = idei
    .filter((i) => potrivesc(i, filtru))
    .sort((a, b) => (ordine === "scor" ? b.scor - a.scor || b.voturi - a.voturi : ordine === "voturi" ? b.voturi - a.voturi : 0) || b.creatLa.localeCompare(a.creatLa));
  const numara = (f: Filtru) => idei.filter((i) => potrivesc(i, f)).length;
  const filtre: { c: Filtru; e: string }[] = [{ c: "toate", e: "Toate" }, { c: "fara_raspuns", e: "Fără răspuns" }, ...STARI.map((s) => ({ c: s.cheie as Filtru, e: s.eticheta })), { c: "raportate", e: "Raportate" }, { c: "ascunse", e: "Ascunse" }];

  return (
    <div className="mt-6">
      <Indicatoare i={indicatori} />
      <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {filtre.map((f) => (
            <button key={f.c} type="button" onClick={() => setFiltru(f.c)} aria-pressed={filtru === f.c} className={`h-8 rounded-full px-3.5 text-xs font-semibold ${filtru === f.c ? "bg-brand-blue text-white" : "border border-line text-muted hover:bg-panel-2"}`}>
              {f.e} ({numara(f.c)})
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-xs font-medium text-muted">
          Ordine
          <select value={ordine} onChange={(e) => setOrdine(e.target.value as Ordine)} className="h-8 rounded-lg border border-line bg-panel px-2 text-xs text-ink">
            <option value="scor">Scor de prioritate</option>
            <option value="voturi">Voturi</option>
            <option value="noi">Cele mai noi</option>
          </select>
        </label>
      </div>
      {lista.length === 0 ? (
        <p className="mt-4 rounded-xl border border-line bg-panel p-5 text-sm text-muted">Nicio idee în această listă.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {lista.map((i) => (
            <Idee key={i.id} idee={i} toate={idei} laSchimbat={(nou) => setIdei((l) => l.map((x) => (x.id === nou.id ? nou : x)))} laUnit={(id) => setIdei((l) => l.map((x) => (x.id === id ? { ...x, ascunsa: true, motivAscundere: "unita" } : x)))} />
          ))}
        </ul>
      )}
    </div>
  );
}

function Indicatoare({ i }: { i: Indicatori }) {
  const celule: { e: string; v: string; avertisment?: boolean; nota?: string }[] = [
    { e: "Fără răspuns", v: String(i.faraRaspuns), avertisment: i.faraRaspunsDepasit > 0, nota: i.faraRaspunsDepasit > 0 ? `${i.faraRaspunsDepasit} peste ${TERMENE.primulRaspunsZileLucratoare} zile lucrătoare` : "în termen" },
    { e: "Primul răspuns (mediană)", v: i.medianaPrimRaspuns === null ? "—" : `${i.medianaPrimRaspuns} zile`, nota: `țintă ≤ ${TERMENE.primulRaspunsZileLucratoare} zile lucrătoare${i.inTermenPrimRaspuns === null ? "" : ` · ${i.inTermenPrimRaspuns}% în termen`}` },
    { e: `Decizie întârziată (≥${TERMENE.voturiPentruDecizie} voturi)`, v: String(i.deciziePeste30), avertisment: i.deciziePeste30 > 0, nota: `peste ${TERMENE.decizieZile} de zile fără decizie` },
    { e: "De revizuit", v: String(i.deRevizuit + i.deReevaluat), avertisment: i.deRevizuit + i.deReevaluat > 0, nota: `${i.deRevizuit} „În planificare” de peste ${TERMENE.revizuireZile} zile · ${i.deReevaluat} „Nu acum” cu data trecută` },
    { e: "Rata de livrare (6 luni)", v: i.rataLivrare === null ? "—" : `${i.rataLivrare}%`, nota: `idei cu ≥${TERMENE.voturiPentruDecizie} voturi, finalizate` },
  ];
  return (
    <div>
      <h2 className="sr-only">Indicatori</h2>
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {celule.map((c) => (
          <div key={c.e} className={`rounded-xl border p-3 ${c.avertisment ? "border-amber-300 bg-amber-50" : "border-line bg-panel"}`}>
            <dt className="text-xs font-medium text-muted">{c.e}</dt>
            <dd className="mt-1 text-xl font-extrabold text-ink tabular-nums">{c.v}</dd>
            {c.nota && <dd className="mt-0.5 text-[11.5px] leading-snug text-muted">{c.nota}</dd>}
          </div>
        ))}
      </dl>
      <p className="mt-2 text-xs text-muted">
        Scor de prioritate = voturi × potrivirea cu fundraising-ul (D177, 20%, Formular 230 și recurență = 3; retenție și campanii de caz = 2; restul = 1) ÷ efort (mic 1, mediu 2, mare 4). Rezervă ~20% din capacitate pentru victoriile rapide (efort mic, ≥3 voturi). Voturile sunt un semnal, nu un verdict.
      </p>
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
  const modificata = d.stare !== idee.stare || d.efort !== idee.efort || d.categorie !== idee.categorie || d.raspunsEchipa !== idee.raspunsEchipa || d.titlu !== idee.titlu || d.descriere !== idee.descriere || d.ascunsa !== idee.ascunsa || d.reevaluareLa !== idee.reevaluareLa;
  const schimbaStarea = d.stare !== idee.stare;
  const faraRaspuns = idee.stare === "propus" && !idee.primulRaspunsLa;
  const raportata = idee.ascunsa && idee.motivAscundere === "raportata";
  const scorNou = idee.scor;

  const salveaza = () =>
    start(async () => {
      setMesaj(null);
      const r = await actualizeazaIdeeAction(idee.id, { titlu: d.titlu, descriere: d.descriere, categorie: d.categorie, stare: d.stare, efort: d.efort, raspunsEchipa: d.raspunsEchipa, reevaluareLa: d.reevaluareLa, ascunsa: d.ascunsa, anunta }).catch(() => ({ ok: false as const, eroare: "Nu am putut salva." }));
      if (r.ok) {
        const acum = new Date().toISOString();
        laSchimbat({ ...d, primulRaspunsLa: d.primulRaspunsLa ?? (d.stare !== "propus" || d.raspunsEchipa ? acum : null), motivAscundere: d.ascunsa ? d.motivAscundere || "echipa" : "", raportari: d.ascunsa ? d.raportari : [] });
        const votanti = "anuntati" in r && r.anuntati ? ` ${r.anuntati} organizații care au votat au fost anunțate.` : "";
        setMesaj({ ok: true, text: schimbaStarea && anunta && d.email ? `Salvat. Autorul a fost anunțat pe email.${votanti}` : "Salvat." });
      } else setMesaj({ ok: false, text: r.eroare });
    });

  const principal = toate.find((x) => x.id === uneste);

  return (
    <li id={idee.id} className={`rounded-xl border bg-panel p-4 ${raportata ? "border-red-300" : "border-line"}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <button type="button" onClick={() => setDeschisa((v) => !v)} aria-expanded={deschisa} className="text-left text-[15px] font-bold text-ink hover:underline">
            {idee.titlu}
          </button>
          <p className="mt-0.5 text-xs text-muted">
            {idee.organizatie || "Organizație necunoscută"}
            {idee.autor ? ` · ${idee.autor}` : ""} · {idee.categorie} · {dataRo(idee.creatLa)}
            {idee.efort ? ` · ${ETICHETE_EFORT[idee.efort as "scazut" | "mediu" | "mare"]}` : " · efort neevaluat"}
          </p>
          <p className="mt-0.5 text-xs text-muted">
            {idee.obiectiv ? `Vrea să crească: ${ETICHETE_OBIECTIV[idee.obiectiv] ?? idee.obiectiv}` : "Obiectiv necompletat (idee veche)"}
            {idee.frecventa ? ` · apare ${(ETICHETE_FRECVENTA[idee.frecventa] ?? idee.frecventa).toLowerCase()}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {faraRaspuns && <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-900">Fără răspuns</span>}
          {raportata && <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-900">Raportată</span>}
          {esteVictorieRapida(idee) && <span className="rounded-full bg-brand-green-soft px-2.5 py-0.5 text-xs font-bold text-brand-green">Victorie rapidă</span>}
          <span className="rounded-full bg-panel-2 px-2.5 py-0.5 text-xs font-bold text-ink" title="Scor de prioritate">
            scor {scorNou}
          </span>
          <span className="rounded-full bg-panel-2 px-2.5 py-0.5 text-xs font-bold text-ink">{idee.voturi} voturi</span>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${CLASA_STARE[idee.stare]}`}>{ETICHETE_STARE[idee.stare]}</span>
        </div>
      </div>
      {deschisa && (
        <div className="mt-4 space-y-3 border-t border-line pt-4">
          {idee.raportari.length > 0 && (
            <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-900">
              <p className="font-semibold">Raportări ({idee.raportari.length})</p>
              <ul className="mt-1 list-disc pl-5">
                {idee.raportari.map((r, k) => (
                  <li key={k}>
                    {r.organizatie}: {r.motiv || "fără motiv scris"}
                  </li>
                ))}
              </ul>
              <p className="mt-1 text-xs">Ideea e ascunsă până o analizezi (termen intern: 48 de ore). Debifează „Ascunsă” și salvează ca s-o restabilești; editează titlul sau descrierea dacă trebuie scoase date personale.</p>
            </div>
          )}
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
                {[...new Set([...CATEGORII, d.categorie])].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="block text-xs font-medium text-muted">
            Răspunsul echipei (se vede în platformă, în fereastra ideii){d.stare === "nu_acum" ? ". La „Nu acum” explică motivul." : ""}
            <textarea value={d.raspunsEchipa} onChange={(e) => setD({ ...d, raspunsEchipa: e.target.value })} rows={3} className={`${camp} mt-1 h-auto py-2`} />
          </label>
          {d.stare === "nu_acum" && (
            <label className="block max-w-xs text-xs font-medium text-muted">
              Ne uităm din nou la ea după (opțional)
              <input type="date" value={d.reevaluareLa} onChange={(e) => setD({ ...d, reevaluareLa: e.target.value })} className={`${camp} mt-1`} />
            </label>
          )}
          {schimbaStarea && !d.raspunsEchipa.trim() && d.stare !== "propus" && (
            <p className="text-xs text-amber-800">Schimbi starea fără un răspuns scris. Autorul primește emailul, dar un rând de explicație face ideea mai credibilă.</p>
          )}
          <div className="flex flex-wrap items-center gap-4 text-sm text-ink">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={anunta} onChange={(e) => setAnunta(e.target.checked)} className="h-4 w-4" />
              Anunță autorul pe email la schimbarea stării{idee.email ? ` (${idee.email})` : " (nu are email salvat)"}
              {(d.stare === "in_dezvoltare" || d.stare === "finalizat") && " și organizațiile care au votat"}
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
                if (!window.confirm(`Unești „${idee.titlu}” cu „${principal?.titlu ?? "ideea aleasă"}”?\n\nVoturile trec la ideea principală, iar aceasta se ascunde. Autorul ei primește un email.`)) return;
                start(async () => {
                  const r = await unesteIdeiAction(idee.id, uneste).catch(() => ({ ok: false as const, eroare: "Nu am putut uni ideile." }));
                  if (r.ok) laUnit(idee.id);
                  else setMesaj({ ok: false, text: r.eroare });
                });
              }}
              className={`${buton} mt-5`}
            >
              Unește cu ideea principală
            </button>
          </div>
        </div>
      )}
    </li>
  );
}
