"use client";

import { useState, useTransition } from "react";

import type { DateAdmin, RandProgramare } from "@/lib/programari/server";
import type { SetariProgramari } from "@/lib/programari/sloturi";

import { salveazaExceptiiAction, salveazaProgramAction, salveazaSetariAction, salveazaTipuriAction, schimbaStareProgramareAction, type Rezultat } from "./actions";

const ZILE = ["Luni", "Marți", "Miercuri", "Joi", "Vineri", "Sâmbătă", "Duminică"];
const camp = "h-9 rounded-lg border border-line bg-panel px-2.5 text-sm text-ink";
const buton = "h-9 rounded-lg border border-line bg-panel px-3 text-sm font-semibold text-ink hover:bg-panel-2 disabled:opacity-50";
const butonPrimar = "h-9 rounded-lg bg-brand-blue px-4 text-sm font-semibold text-white disabled:opacity-50";
const dataOra = (iso: string) => new Intl.DateTimeFormat("ro-RO", { weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Bucharest" }).format(new Date(iso));
const STARE: Record<string, { eticheta: string; clasa: string }> = {
  confirmata: { eticheta: "Confirmată", clasa: "bg-brand-green-soft text-brand-green" },
  efectuata: { eticheta: "Efectuată", clasa: "bg-panel-2 text-body" },
  anulata: { eticheta: "Anulată", clasa: "bg-red-100 text-red-900" },
};

type Tab = "programari" | "program" | "exceptii" | "tipuri" | "setari";
const TABURI: { cheie: Tab; eticheta: string }[] = [
  { cheie: "programari", eticheta: "Programări" },
  { cheie: "program", eticheta: "Program disponibil" },
  { cheie: "exceptii", eticheta: "Zile libere și program special" },
  { cheie: "tipuri", eticheta: "Tipuri de întâlniri" },
  { cheie: "setari", eticheta: "Setări și texte" },
];

export function ProgramariClient({ randuri: initiale, date }: { randuri: RandProgramare[]; date: DateAdmin }) {
  const [tab, setTab] = useState<Tab>("programari");
  return (
    <div className="mt-6">
      <nav aria-label="Secțiuni" className="flex flex-wrap gap-1.5 border-b border-line pb-3">
        {TABURI.map((t) => (
          <button key={t.cheie} type="button" aria-current={tab === t.cheie ? "page" : undefined} onClick={() => setTab(t.cheie)} className={`h-9 rounded-lg px-3.5 text-sm font-semibold ${tab === t.cheie ? "bg-brand-blue text-white" : "text-muted hover:bg-panel-2"}`}>
            {t.eticheta}
          </button>
        ))}
      </nav>
      <div className="mt-5">
        {tab === "programari" && <Lista initiale={initiale} />}
        {tab === "program" && <Program initial={date.saptamanal} />}
        {tab === "exceptii" && <Exceptii initial={date.exceptii} />}
        {tab === "tipuri" && <Tipuri initial={date.tipuri} />}
        {tab === "setari" && <Setari initial={date.setari} />}
      </div>
    </div>
  );
}

function useSalvare() {
  const [pending, start] = useTransition();
  const [mesaj, setMesaj] = useState<{ ok: boolean; text: string } | null>(null);
  const ruleaza = (f: () => Promise<Rezultat>, textOk = "Salvat.") =>
    start(async () => {
      setMesaj(null);
      try {
        const r = await f();
        setMesaj(r.ok ? { ok: true, text: textOk } : { ok: false, text: r.eroare });
      } catch (e) {
        setMesaj({ ok: false, text: e instanceof Error ? e.message : "Nu am putut salva." });
      }
    });
  return { pending, mesaj, ruleaza };
}

function Mesaj({ m }: { m: { ok: boolean; text: string } | null }) {
  if (!m) return null;
  return (
    <p role={m.ok ? "status" : "alert"} className={`text-sm ${m.ok ? "text-brand-green" : "text-red-700"}`}>
      {m.text}
    </p>
  );
}

// ---------- programări primite ----------

function Lista({ initiale }: { initiale: RandProgramare[] }) {
  const [randuri, setRanduri] = useState(initiale);
  const [filtru, setFiltru] = useState<"viitoare" | "trecute" | "anulate" | "toate">("viitoare");
  const { pending, mesaj, ruleaza } = useSalvare();
  const [acum] = useState(() => Date.now());
  const lista = randuri
    .filter((r) => (filtru === "toate" ? true : filtru === "anulate" ? r.stare === "anulata" : filtru === "viitoare" ? r.stare === "confirmata" && new Date(r.startLa).getTime() >= acum : r.stare !== "anulata" && new Date(r.startLa).getTime() < acum))
    .sort((a, b) => (filtru === "viitoare" ? a.startLa.localeCompare(b.startLa) : b.startLa.localeCompare(a.startLa)));

  const schimba = (id: string, stare: string) =>
    ruleaza(async () => {
      const r = await schimbaStareProgramareAction(id, stare);
      if (r.ok) setRanduri((rs) => rs.map((x) => (x.id === id ? { ...x, stare } : x)));
      return r;
    }, "Stare salvată.");

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {(["viitoare", "trecute", "anulate", "toate"] as const).map((f) => (
          <button key={f} type="button" onClick={() => setFiltru(f)} aria-pressed={filtru === f} className={`h-8 rounded-full px-3.5 text-xs font-semibold ${filtru === f ? "bg-brand-blue text-white" : "border border-line text-muted hover:bg-panel-2"}`}>
            {f === "viitoare" ? "Viitoare" : f === "trecute" ? "Trecute" : f === "anulate" ? "Anulate" : "Toate"}
          </button>
        ))}
        <Mesaj m={mesaj} />
      </div>
      {lista.length === 0 ? (
        <p className="mt-4 rounded-xl border border-line bg-panel p-5 text-sm text-muted">Nicio programare în această listă.</p>
      ) : (
        <ul className="mt-4 space-y-2.5">
          {lista.map((r) => (
            <li key={r.id} className="rounded-xl border border-line bg-panel p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[15px] font-bold text-ink first-letter:uppercase">{dataOra(r.startLa)}</p>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${STARE[r.stare]?.clasa ?? ""}`}>{STARE[r.stare]?.eticheta ?? r.stare}</span>
              </div>
              <p className="mt-0.5 text-sm text-muted">
                {r.tipTitlu} · {r.durataMin} min{r.locatie ? ` · ${r.locatie}` : ""}
              </p>
              <p className="mt-2 text-sm text-ink">
                <strong>{r.nume}</strong>
                {r.organizatie ? ` · ${r.organizatie}` : ""} ·{" "}
                <a href={`mailto:${r.email}`} className="font-medium text-brand-blue underline">
                  {r.email}
                </a>
                {r.telefon ? (
                  <>
                    {" · "}
                    <a href={`tel:${r.telefon.replace(/[^+\d]/g, "")}`} className="font-medium text-brand-blue underline">
                      {r.telefon}
                    </a>
                  </>
                ) : null}
              </p>
              {r.mesaj && <p className="mt-1.5 text-sm whitespace-pre-line text-body">{r.mesaj}</p>}
              <p className="mt-1.5 text-xs text-muted">Primită {dataOra(r.creatLa)}{r.sursa ? ` · din ${r.sursa}` : ""}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {r.stare === "confirmata" && (
                  <>
                    <button type="button" disabled={pending} onClick={() => schimba(r.id, "efectuata")} className={buton}>
                      Marchează efectuată
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => {
                        if (window.confirm(`Anulezi programarea lui ${r.nume}? Persoana primește un email.`)) schimba(r.id, "anulata");
                      }}
                      className={`${buton} text-red-800`}
                    >
                      Anulează
                    </button>
                  </>
                )}
                {r.stare !== "confirmata" && (
                  <button type="button" disabled={pending} onClick={() => schimba(r.id, "confirmata")} className={buton}>
                    Repune ca „Confirmată”
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------- program săptămânal ----------

type Iv = { zi: number; de: string; pana: string };

function Program({ initial }: { initial: Iv[] }) {
  const [iv, setIv] = useState<Iv[]>(initial);
  const { pending, mesaj, ruleaza } = useSalvare();
  const schimba = (idx: number, c: Partial<Iv>) => setIv((l) => l.map((x, i) => (i === idx ? { ...x, ...c } : x)));
  const adauga = (zi: number) => setIv((l) => [...l, { zi, de: "10:00", pana: "13:00" }]);
  const copiazaLuni = () => {
    const luni = iv.filter((x) => x.zi === 1);
    setIv((l) => [...l.filter((x) => x.zi === 1), ...[2, 3, 4, 5].flatMap((zi) => luni.map((x) => ({ ...x, zi })))]);
  };
  return (
    <div>
      <p className="text-sm text-muted">Orele în ora României. O zi poate avea mai multe intervale (de exemplu dimineața și după-amiaza). O zi fără interval nu primește programări.</p>
      <div className="mt-4 space-y-3">
        {ZILE.map((nume, k) => {
          const zi = k + 1;
          const dinZi = iv.map((x, idx) => ({ x, idx })).filter((e) => e.x.zi === zi);
          return (
            <div key={zi} className="flex flex-wrap items-start gap-3 rounded-xl border border-line bg-panel p-3.5">
              <p className="w-24 pt-1.5 text-sm font-bold text-ink">{nume}</p>
              <div className="flex-1 space-y-2">
                {dinZi.length === 0 && <p className="pt-1.5 text-sm text-muted">Închis</p>}
                {dinZi.map(({ x, idx }) => (
                  <div key={idx} className="flex flex-wrap items-center gap-2">
                    <input type="time" value={x.de} onChange={(e) => schimba(idx, { de: e.target.value })} aria-label={`${nume}: de la`} className={camp} />
                    <span className="text-muted">–</span>
                    <input type="time" value={x.pana} onChange={(e) => schimba(idx, { pana: e.target.value })} aria-label={`${nume}: până la`} className={camp} />
                    <button type="button" onClick={() => setIv((l) => l.filter((_, i) => i !== idx))} className={buton} aria-label={`Șterge intervalul de ${nume}`}>
                      Șterge
                    </button>
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => adauga(zi)} className={buton}>
                + Interval
              </button>
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" onClick={copiazaLuni} className={buton}>
          Copiază programul de luni în marți–vineri
        </button>
        <button type="button" disabled={pending} onClick={() => ruleaza(() => salveazaProgramAction(iv))} className={butonPrimar}>
          {pending ? "Se salvează…" : "Salvează programul"}
        </button>
        <Mesaj m={mesaj} />
      </div>
    </div>
  );
}

// ---------- excepții ----------

type Ex = DateAdmin["exceptii"][number];

function Exceptii({ initial }: { initial: Ex[] }) {
  const [ex, setEx] = useState<Ex[]>(initial);
  const { pending, mesaj, ruleaza } = useSalvare();
  const schimba = (idx: number, c: Partial<Ex>) => setEx((l) => l.map((x, i) => (i === idx ? { ...x, ...c } : x)));
  return (
    <div>
      <p className="text-sm text-muted">„Liber” închide ziua (concediu, sărbătoare). „Program special” înlocuiește programul săptămânal doar pentru acea zi (poți deschide și o zi care în mod normal e închisă).</p>
      <div className="mt-4 space-y-2.5">
        {ex.length === 0 && <p className="rounded-xl border border-line bg-panel p-4 text-sm text-muted">Nicio excepție. Programul săptămânal se aplică în fiecare zi.</p>}
        {ex.map((x, idx) => (
          <div key={idx} className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-panel p-3">
            <input type="date" value={x.data} onChange={(e) => schimba(idx, { data: e.target.value })} aria-label="Data" className={camp} />
            <select value={x.tip} onChange={(e) => schimba(idx, { tip: e.target.value === "liber" ? "liber" : "program" })} aria-label="Tip" className={camp}>
              <option value="liber">Liber (închis)</option>
              <option value="program">Program special</option>
            </select>
            {x.tip === "program" && (
              <>
                <input type="time" value={x.de} onChange={(e) => schimba(idx, { de: e.target.value })} aria-label="De la" className={camp} />
                <span className="text-muted">–</span>
                <input type="time" value={x.pana} onChange={(e) => schimba(idx, { pana: e.target.value })} aria-label="Până la" className={camp} />
              </>
            )}
            <input value={x.nota} onChange={(e) => schimba(idx, { nota: e.target.value })} placeholder="Notă (opțional)" aria-label="Notă" className={`${camp} min-w-40 flex-1`} />
            <button type="button" onClick={() => setEx((l) => l.filter((_, i) => i !== idx))} className={buton}>
              Șterge
            </button>
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => setEx((l) => [...l, { data: "", tip: "liber", de: "", pana: "", nota: "" }])} className={buton}>
          + Adaugă o zi
        </button>
        <button type="button" disabled={pending} onClick={() => ruleaza(() => salveazaExceptiiAction(ex))} className={butonPrimar}>
          {pending ? "Se salvează…" : "Salvează excepțiile"}
        </button>
        <Mesaj m={mesaj} />
      </div>
    </div>
  );
}

// ---------- tipuri de întâlniri ----------

type Tip = DateAdmin["tipuri"][number];

function Tipuri({ initial }: { initial: Tip[] }) {
  const [tipuri, setTipuri] = useState<Tip[]>(initial);
  const { pending, mesaj, ruleaza } = useSalvare();
  const schimba = (idx: number, c: Partial<Tip>) => setTipuri((l) => l.map((x, i) => (i === idx ? { ...x, ...c } : x)));
  const muta = (idx: number, d: number) =>
    setTipuri((l) => {
      const j = idx + d;
      if (j < 0 || j >= l.length) return l;
      const n = [...l];
      [n[idx], n[j]] = [n[j]!, n[idx]!];
      return n;
    });
  return (
    <div>
      <p className="text-sm text-muted">Ce poate alege cine se programează. Cu un singur tip activ, pasul de alegere nu mai apare. Un tip șters nu dispare din istoric: programările lui își păstrează titlul și durata.</p>
      <div className="mt-4 space-y-3">
        {tipuri.map((t, idx) => (
          <div key={t.id || `nou${idx}`} className="rounded-xl border border-line bg-panel p-4">
            <div className="grid gap-3 sm:grid-cols-[1fr_130px]">
              <label className="text-xs font-medium text-muted">
                Titlu
                <input value={t.titlu} onChange={(e) => schimba(idx, { titlu: e.target.value })} className={`${camp} mt-1 w-full`} />
              </label>
              <label className="text-xs font-medium text-muted">
                Durată (minute)
                <input type="number" min={10} max={480} step={5} value={t.durataMin} onChange={(e) => schimba(idx, { durataMin: Number(e.target.value) })} className={`${camp} mt-1 w-full`} />
              </label>
            </div>
            <label className="mt-3 block text-xs font-medium text-muted">
              Descriere (apare sub titlu)
              <input value={t.descriere} onChange={(e) => schimba(idx, { descriere: e.target.value })} className={`${camp} mt-1 w-full`} />
            </label>
            <label className="mt-3 block text-xs font-medium text-muted">
              Unde are loc (link Google Meet / Zoom, telefon sau adresă; apare în confirmare)
              <input value={t.locatie} onChange={(e) => schimba(idx, { locatie: e.target.value })} placeholder="ex. https://meet.google.com/…" className={`${camp} mt-1 w-full`} />
            </label>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2 text-sm text-ink">
                <input type="checkbox" checked={t.activ} onChange={(e) => schimba(idx, { activ: e.target.checked })} className="h-4 w-4" />
                Activ (apare în pagină)
              </label>
              <span className="flex-1" />
              <button type="button" onClick={() => muta(idx, -1)} disabled={idx === 0} className={buton} aria-label="Mută mai sus">
                ↑
              </button>
              <button type="button" onClick={() => muta(idx, 1)} disabled={idx === tipuri.length - 1} className={buton} aria-label="Mută mai jos">
                ↓
              </button>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`Ștergi tipul „${t.titlu || "fără titlu"}”?`)) setTipuri((l) => l.filter((_, i) => i !== idx));
                }}
                className={`${buton} text-red-800`}
              >
                Șterge
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => setTipuri((l) => [...l, { id: "", titlu: "", descriere: "", durataMin: 30, locatie: "", activ: true }])} className={buton}>
          + Adaugă un tip
        </button>
        <button type="button" disabled={pending} onClick={() => ruleaza(() => salveazaTipuriAction(tipuri))} className={butonPrimar}>
          {pending ? "Se salvează…" : "Salvează tipurile"}
        </button>
        <Mesaj m={mesaj} />
      </div>
    </div>
  );
}

// ---------- setări și texte ----------

function Setari({ initial }: { initial: SetariProgramari }) {
  const [s, setS] = useState<SetariProgramari>(initial);
  const { pending, mesaj, ruleaza } = useSalvare();
  const nr = (k: keyof SetariProgramari, eticheta: string, ajutor: string, min = 0) => (
    <label className="text-xs font-medium text-muted">
      {eticheta}
      <input type="number" min={min} value={Number(s[k])} onChange={(e) => setS({ ...s, [k]: Number(e.target.value) })} className={`${camp} mt-1 w-full`} />
      <span className="mt-0.5 block font-normal">{ajutor}</span>
    </label>
  );
  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {nr("pasMin", "Din câte în câte minute începe o întâlnire", "ex. 30 → 10:00, 10:30, 11:00", 5)}
        {nr("pauzaMin", "Pauză între întâlniri (minute)", "Timp liber după fiecare întâlnire")}
        {nr("preavizOre", "Preaviz minim (ore)", "Cât de aproape de acum se poate programa cineva")}
        {nr("orizontZile", "Cât de departe se poate programa (zile)", "ex. 45 → până peste 45 de zile", 1)}
        {nr("maxPePezi", "Maximum de întâlniri pe zi", "0 = fără limită")}
      </div>
      <div className="mt-5 grid gap-4">
        <label className="text-xs font-medium text-muted">
          Titlul paginii de programare
          <input value={s.titlu} onChange={(e) => setS({ ...s, titlu: e.target.value })} className={`${camp} mt-1 w-full`} />
        </label>
        <label className="text-xs font-medium text-muted">
          Textul de sub titlu
          <textarea value={s.intro} onChange={(e) => setS({ ...s, intro: e.target.value })} rows={2} className={`${camp} mt-1 h-auto w-full py-2`} />
        </label>
        <label className="text-xs font-medium text-muted">
          Mesajul după programare (apare pe ecran și în emailul de confirmare)
          <textarea value={s.mesajConfirmare} onChange={(e) => setS({ ...s, mesajConfirmare: e.target.value })} rows={2} className={`${camp} mt-1 h-auto w-full py-2`} />
        </label>
        <label className="text-xs font-medium text-muted">
          Unde primești vestea unei programări noi (gol = adresa implicită)
          <input type="email" value={s.emailNotificare} onChange={(e) => setS({ ...s, emailNotificare: e.target.value })} placeholder="vlad.placinta@alexandrit.ro" className={`${camp} mt-1 w-full`} />
        </label>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" checked={s.cereTelefon} onChange={(e) => setS({ ...s, cereTelefon: e.target.checked })} className="h-4 w-4" />
          Telefonul e obligatoriu
        </label>
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button type="button" disabled={pending} onClick={() => ruleaza(() => salveazaSetariAction(s))} className={butonPrimar}>
          {pending ? "Se salvează…" : "Salvează setările"}
        </button>
        <Mesaj m={mesaj} />
      </div>
    </div>
  );
}
