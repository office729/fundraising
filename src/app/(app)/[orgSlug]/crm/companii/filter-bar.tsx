"use client";

import { ChevronDown, Settings } from "lucide-react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Input, Select } from "../components/ui/input";
import { useLocale } from "../lib/locale-context";
import { COMPANII_DICT } from "@/lib/i18n/dictionaries/companii";
import { COMPANII_FILTRE_DICT } from "@/lib/i18n/dictionaries/companii-filtre-ui";
import { COMPANII_UI_DICT, intlLocale } from "@/lib/i18n/dictionaries/companii-ui";
import { CHEI_FUNCTII, FUNCTIE_NESPECIFICATA } from "@/lib/functii-contact";
import { BENZI, type Banda } from "@/lib/prioritizare-firme";
import { recalculeazaCaiCaldeAction } from "./cai-calde-actions";
import { salveazaUltimaLista } from "./lista-actions";
import { curataQsLista, filtreActive, parametriSponsor, type FiltruActiv, type NumereFiltre } from "./lib/filtre-extra";
import { JUDETE, numarFiltreActive, parseFiltru, type PerioadaTip } from "./lib/filters";

const PERIOADA_KEYS = ["toate", "q1", "q2", "q3", "q4", "an", "luna", "saptamana"] as const satisfies readonly PerioadaTip[];

const ANI = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - 2 + i);

function pill(activ: boolean) {
  return `rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-colors ${
    activ
      ? "border-[var(--ci-primary)] bg-[var(--ci-primary-soft)] text-[var(--ci-primary)]"
      : "border-[var(--ci-border)] text-[var(--ci-text-muted)] hover:bg-[var(--ci-surface-2)]"
  }`;
}

// Butoanele de pe rândul principal (înalte de 36 px, ca să se apese ușor și pe telefon).
function buton(activ: boolean) {
  return `inline-flex h-9 shrink-0 items-center gap-1.5 rounded-[var(--ci-radius-btn)] border px-3 text-[13px] font-medium transition-colors ${
    activ
      ? "border-[var(--ci-primary)] bg-[var(--ci-primary)] text-white"
      : "border-[var(--ci-border)] bg-[var(--ci-surface)] text-[var(--ci-text)] hover:bg-[var(--ci-surface-2)]"
  }`;
}

function selectPrincipal(activ: boolean) {
  return `h-9 max-w-full shrink-0 rounded-[var(--ci-radius-btn)] border px-2.5 text-[13px] font-medium ${
    activ ? "border-[var(--ci-primary)] bg-[var(--ci-primary)] text-white" : "border-[var(--ci-border)] bg-[var(--ci-surface)] text-[var(--ci-text)]"
  }`;
}

export function FilterBar({
  responsabili,
  functiiNr,
  prioritizare,
  benziNr,
  caiCalde,
  numere,
  esteAdmin,
}: {
  responsabili: { id: string; name: string | null }[];
  functiiNr: Record<string, number>;
  prioritizare: boolean; // pachetul include prioritizarea pe benzi A/B/C
  benziNr: Record<Banda, number> & { eligibile: number; sprint: number };
  caiCalde: { n: number; la: string } | null; // câte firme au o cale caldă la ultima recalculare
  numere: NumereFiltre | null; // numerele din selectele Contact și Waalaxy (null = interogare lentă: etichetele apar fără număr)
  esteAdmin: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const dict = COMPANII_DICT[locale].filterBar;
  const df = COMPANII_FILTRE_DICT[locale];
  const ui = COMPANII_UI_DICT[locale].lista;
  const nf = intlLocale(locale);
  const f = parseFiltru(searchParams);
  const [q, setQ] = useState(f.q);
  const [dataStart, setDataStart] = useState(f.dataStart);
  const [dataSfarsit, setDataSfarsit] = useState(f.dataSfarsit);
  const [functieText, setFunctieText] = useState(f.functieText);

  // Rândurile de filtre detaliate ocupă mult spațiu pe verticală — se restrâng
  // implicit, în spatele rotiței (doar căutarea rapidă rămâne vizibilă); numărul
  // de filtre active apare lângă rotiță, ca să se vadă că sunt aplicate.
  const filtreActiveNr = numarFiltreActive(f);
  const [extins, setExtins] = useState(false);
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const [recalculeaza, setRecalculeaza] = useState(false);
  async function recalculeazaCai() {
    setRecalculeaza(true);
    try {
      await recalculeazaCaiCaldeAction(orgSlug);
      router.refresh();
    } finally {
      setRecalculeaza(false);
    }
  }

  // Fiecare coleg revine, la intrarea din meniu, la ultima lui listă (inclusiv „Doar firme lucrate”): după o scurtă pauză, parametrii curenți se memorează.
  const ultimulSalvat = useRef<string | null>(null);
  const qsCurent = searchParams.toString();
  useEffect(() => {
    const qs = curataQsLista(qsCurent);
    if (qs === ultimulSalvat.current) return;
    const t = setTimeout(() => {
      ultimulSalvat.current = qs;
      salveazaUltimaLista(orgSlug, qs).catch(() => {
        ultimulSalvat.current = null; // se reîncearcă la următoarea schimbare
      });
    }, 800);
    return () => clearTimeout(t);
  }, [qsCurent, orgSlug]);

  function push(next: Record<string, string | string[] | null>) {
    const sp = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(next)) {
      sp.delete(k);
      if (v == null) continue;
      if (Array.isArray(v)) v.forEach((val) => sp.append(k, val));
      else sp.set(k, v);
    }
    sp.delete("pagina"); // orice schimbare de filtru reîncepe de la pagina 1
    sp.delete("r");
    router.push(`${pathname}?${sp.toString()}`);
  }

  function setaPerioada(tip: PerioadaTip) {
    push({ perioada: tip === "toate" ? null : tip });
  }

  function toggleMarcaj(m: string) {
    const set = new Set(f.marcaje);
    if (set.has(m)) set.delete(m);
    else set.add(m);
    push({ marcaj: [...set] });
  }

  function toggleFunctie(cheie: string) {
    const set = new Set(f.functie);
    if (set.has(cheie)) set.delete(cheie);
    else set.add(cheie);
    push({ functie: [...set] });
  }

  // „r=1” = pornește de la zero: fără el, intrarea următoare din meniu ar relua lista memorată.
  const curataTot = () => router.push(`${pathname}?r=1`);

  const etichetaActiva = (a: FiltruActiv): string => {
    const e = df.etichete;
    switch (a.id) {
      case "lucrate":
        return e.lucrate;
      case "perioada":
        return e.perioada(dict.perioade[a.valoare as keyof typeof dict.perioade] ?? a.valoare ?? "");
      case "judet":
        return e.judet(a.valoare ?? "");
      case "contact":
        return e.contact(a.valoare ?? "");
      case "functie":
        return e.functie(
          (a.valoare ?? "")
            .split(", ")
            .map((x) => dict.functii[x as keyof typeof dict.functii] ?? x)
            .join(", "),
        );
      case "banda":
        return e.banda(a.valoare ?? "");
      case "ordine":
        return e.ordine;
      case "eligibil":
        return e.eligibil;
      case "sprint":
        return e.sprint;
      case "cald":
        return e.cald;
      default:
        return e.imbogatit;
    }
  };
  const active = filtreActive(f);

  return (
    <div className="space-y-3 rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] bg-[var(--ci-surface)] p-3.5">
      <form
        className="flex flex-wrap items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          push({ q: q.trim() || null });
        }}
      >
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={f.deep ? df.deepPlaceholder : dict.cautaPlaceholder}
          className="h-9 w-full sm:w-72 lg:w-96"
        />
        <button type="submit" className="h-9 rounded-[var(--ci-radius-btn)] bg-[var(--ci-primary)] px-4 text-[13px] font-semibold text-white hover:opacity-90">
          {dict.cauta}
        </button>
        <button type="button" onClick={() => push({ deep: f.deep ? null : "1", q: q.trim() || null })} aria-pressed={f.deep} title={df.deepTitle} className={buton(f.deep)}>
          🔎 {df.deep}
          {f.deep && <span aria-hidden> ✓</span>}
        </button>
        <button
          type="button"
          onClick={() => push({ vezi: f.vezi === "recente" ? null : "recente" })}
          title={dict.lucrateRecentHint}
          className={pill(f.vezi === "recente")}
        >
          {dict.lucrateRecent}
        </button>
        <button
          type="button"
          onClick={() => setExtins((v) => !v)}
          aria-expanded={extins}
          className="ml-auto flex items-center gap-1.5 rounded-[var(--ci-radius-btn)] px-2.5 py-1.5 text-[12.5px] font-medium text-[var(--ci-text-muted)] transition-colors hover:bg-[var(--ci-surface-2)] hover:text-[var(--ci-text)]"
        >
          <Settings className={`h-4 w-4 transition-transform duration-300 ${extins ? "rotate-90" : ""}`} />
          {dict.filtre}
          {filtreActiveNr > 0 && (
            <span className="ci-tabular rounded-full bg-[var(--ci-primary-soft)] px-1.5 py-0.5 text-[11px] font-semibold text-[var(--ci-primary)]">
              {filtreActiveNr}
            </span>
          )}
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${extins ? "rotate-180" : ""}`} />
        </button>
      </form>

      {/* Filtrele folosite zilnic, mereu la vedere: sponsori / nu sunt sponsori, responsabil, D177 / Decembrie / Caz, Contact și (administrator) Waalaxy. */}
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => push(parametriSponsor(f.sponsor === "da" ? "" : "da"))} aria-pressed={f.sponsor === "da"} title={f.sponsor === "da" ? df.scoateFiltrul : df.sponsoriHint} className={buton(f.sponsor === "da")}>
          {df.sponsori}
          {f.sponsor === "da" && <span aria-hidden>✕</span>}
        </button>
        <button type="button" onClick={() => push(parametriSponsor(f.sponsor === "nu" ? "" : "nu"))} aria-pressed={f.sponsor === "nu"} title={f.sponsor === "nu" ? df.scoateFiltrul : df.nesponsoriHint} className={buton(f.sponsor === "nu")}>
          {df.nesponsori}
          {f.sponsor === "nu" && <span aria-hidden>✕</span>}
        </button>
        <select
          value={f.responsabil === "toti" ? "" : f.responsabil}
          onChange={(e) => push({ responsabil: e.target.value || null })}
          className={selectPrincipal(f.responsabil !== "toti")}
          title={df.responsabilTitle}
          aria-label={df.responsabilAria}
        >
          <option value="">{df.responsabilToti}</option>
          {responsabili.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name || dict.faraNume}
            </option>
          ))}
        </select>
        <button type="button" onClick={() => toggleMarcaj("d177")} aria-pressed={f.marcaje.includes("d177")} title={f.marcaje.includes("d177") ? df.scoateFiltrul : df.d177Hint} className={buton(f.marcaje.includes("d177"))}>
          D177
          {f.marcaje.includes("d177") && <span aria-hidden>✕</span>}
        </button>
        <button type="button" onClick={() => toggleMarcaj("decembrie")} aria-pressed={f.marcaje.includes("decembrie")} title={f.marcaje.includes("decembrie") ? df.scoateFiltrul : df.decembrieHint} className={buton(f.marcaje.includes("decembrie"))}>
          {dict.decembrie}
          {f.marcaje.includes("decembrie") && <span aria-hidden>✕</span>}
        </button>
        <button type="button" onClick={() => toggleMarcaj("caz")} aria-pressed={f.marcaje.includes("caz")} title={f.marcaje.includes("caz") ? df.scoateFiltrul : df.cazHint} className={buton(f.marcaje.includes("caz"))}>
          {df.caz}
          {f.marcaje.includes("caz") && <span aria-hidden>✕</span>}
        </button>
        <select
          value={f.contact === "toate" ? "" : f.contact}
          onChange={(e) => push({ contact: e.target.value || null })}
          className={selectPrincipal(f.contact !== "toate")}
          title={df.contactTitle}
          aria-label={df.contactAria}
        >
          <option value="">{df.contactToate(numere?.cu ?? null, numere?.fara ?? null)}</option>
          <option value="cu">{df.contactCu(numere?.cu ?? null)}</option>
          <option value="fara">{df.contactFara(numere?.fara ?? null)}</option>
          <option value="ai">{df.contactAi(numere?.ai ?? null)}</option>
        </select>
        {esteAdmin && (
          <select
            value={f.waalaxy}
            onChange={(e) => push({ waalaxy: e.target.value || null })}
            className={selectPrincipal(f.waalaxy !== "")}
            title={df.waalaxyTitle}
            aria-label={df.waalaxyAria}
          >
            <option value="">{df.waalaxyToate(numere?.netrimise ?? null, numere?.trimise ?? null)}</option>
            <option value="netrimise">{df.waalaxyNetrimise(numere?.netrimise ?? null)}</option>
            <option value="trimise">{df.waalaxyTrimise(numere?.trimise ?? null)}</option>
          </select>
        )}
      </div>

      {/* Filtrele active, ca etichete cu ✕: se văd și cu panoul „Filtre” închis, ca să nu pară că lipsesc firme fără motiv. */}
      {active.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-[var(--ci-radius-btn)] bg-[var(--ci-amber-soft)] px-3 py-2 text-[12.5px]">
          <span className="font-semibold text-[var(--ci-text)]">{df.activeTitlu}</span>
          {active.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => push(a.scoate)}
              title={df.scoate}
              className="inline-flex min-h-8 items-center gap-1 rounded-full border border-[var(--ci-border)] bg-[var(--ci-surface)] px-2.5 py-0.5 font-medium text-[var(--ci-text)] hover:bg-[var(--ci-surface-2)]"
            >
              {etichetaActiva(a)} <span aria-hidden>✕</span>
            </button>
          ))}
          <button type="button" onClick={curataTot} className="min-h-8 px-1 font-medium text-[var(--ci-text-muted)] underline underline-offset-2 hover:text-[var(--ci-text)]">
            {df.curataTot}
          </button>
        </div>
      )}

      {extins && (
      <>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[12px] font-semibold text-[var(--ci-text-muted)]">{dict.perioada}</span>
        {PERIOADA_KEYS.map((key) => (
          <button key={key} type="button" onClick={() => setaPerioada(key)} className={pill(f.perioadaTip === key)}>
            {dict.perioade[key]}
          </button>
        ))}
        <Select value={String(f.an)} onChange={(e) => push({ an: e.target.value })} className="h-8 w-24 text-[12px]">
          {ANI.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </Select>
        {f.perioadaTip === "luna" && (
          <input
            type="month"
            defaultValue={f.luna}
            onChange={(e) => push({ luna: e.target.value })}
            className="h-8 rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] bg-[var(--ci-surface)] px-2 text-[12px] text-[var(--ci-text)]"
          />
        )}
        {f.perioadaTip === "saptamana" && (
          <input
            type="week"
            defaultValue={f.saptamana}
            onChange={(e) => push({ saptamana: e.target.value })}
            className="h-8 rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] bg-[var(--ci-surface)] px-2 text-[12px] text-[var(--ci-text)]"
          />
        )}
        <span className="mx-1 text-[var(--ci-border)]">|</span>
        <input
          type="date"
          value={dataStart}
          onChange={(e) => setDataStart(e.target.value)}
          className="h-8 rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] bg-[var(--ci-surface)] px-2 text-[12px] text-[var(--ci-text)]"
        />
        <span className="text-[12px] text-[var(--ci-text-faint)]">–</span>
        <input
          type="date"
          value={dataSfarsit}
          onChange={(e) => setDataSfarsit(e.target.value)}
          className="h-8 rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] bg-[var(--ci-surface)] px-2 text-[12px] text-[var(--ci-text)]"
        />
        <button
          type="button"
          disabled={!dataStart || !dataSfarsit}
          onClick={() => push({ perioada: "interval", dataStart, dataSfarsit })}
          className="h-8 rounded-[var(--ci-radius-btn)] bg-[var(--ci-primary)] px-3 text-[12px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {dict.aplica}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[12px] font-semibold text-[var(--ci-text-muted)]">{dict.judet}</span>
        <Select value={f.judet} onChange={(e) => push({ judet: e.target.value === "toate" ? null : e.target.value })} className="h-8 w-full text-[12px] sm:w-40">
          <option value="toate">{dict.toateJudetele}</option>
          {JUDETE.map((j) => (
            <option key={j} value={j}>
              {j}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[12px] font-semibold text-[var(--ci-text-muted)]" title={dict.functieHint}>
          {dict.functie}
        </span>
        {[...CHEI_FUNCTII, FUNCTIE_NESPECIFICATA].map((cheie) => {
          const nr = functiiNr[cheie] ?? 0;
          const activ = f.functie.includes(cheie);
          return (
            <button key={cheie} type="button" onClick={() => toggleFunctie(cheie)} aria-pressed={activ} title={dict.functieHint} className={pill(activ)}>
              {dict.functii[cheie as keyof typeof dict.functii]}
              <span className="ci-tabular ml-1.5 font-normal opacity-70">{nr.toLocaleString(nf)}</span>
            </button>
          );
        })}
        <form
          className="flex items-center gap-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            push({ functieq: functieText.trim() || null });
          }}
        >
          <Input value={functieText} onChange={(e) => setFunctieText(e.target.value)} placeholder={dict.altaFunctie} maxLength={60} className="h-8 w-full text-[12px] sm:w-48" />
          <button type="submit" className="h-8 rounded-[var(--ci-radius-btn)] bg-[var(--ci-primary)] px-3 text-[12px] font-semibold text-white hover:opacity-90">
            {dict.aplicaFunctie}
          </button>
        </form>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {prioritizare ? (
          <>
            <span className="text-[12px] font-semibold text-[var(--ci-text-muted)]" title={dict.prioritateHint}>
              {dict.prioritate}
            </span>
            {BENZI.map((b) => (
              <button key={b} type="button" onClick={() => push({ banda: f.banda === b ? null : b })} aria-pressed={f.banda === b} title={dict.prioritateHint} className={pill(f.banda === b)}>
                {dict.benzi[b]}
                <span className="ci-tabular ml-1.5 font-normal opacity-70">{(benziNr[b] ?? 0).toLocaleString(nf)}</span>
              </button>
            ))}
            <button type="button" onClick={() => push({ elig: f.eligibil ? null : "1" })} aria-pressed={f.eligibil} title={dict.eligibilHint} className={pill(f.eligibil)}>
              {dict.eligibil}
              <span className="ci-tabular ml-1.5 font-normal opacity-70">{(benziNr.eligibile ?? 0).toLocaleString(nf)}</span>
            </button>
            <button type="button" onClick={() => push({ sprint: f.sprint ? null : "1" })} aria-pressed={f.sprint} title={dict.sprintHint} className={pill(f.sprint)}>
              {dict.sprint}
              <span className="ci-tabular ml-1.5 font-normal opacity-70">{(benziNr.sprint ?? 0).toLocaleString(nf)}</span>
            </button>
            <button type="button" onClick={() => push({ cald: f.cald ? null : "1" })} aria-pressed={f.cald} title={dict.caldHint} className={pill(f.cald)}>
              {dict.cald}
              <span className="ci-tabular ml-1.5 font-normal opacity-70">{caiCalde ? caiCalde.n.toLocaleString(nf) : "?"}</span>
            </button>
            <button type="button" disabled={recalculeaza} onClick={recalculeazaCai} title={caiCalde ? ui.ultimaRecalculare(new Date(caiCalde.la).toLocaleDateString(nf)) : dict.caldNecalculat} className={`${pill(false)} disabled:opacity-60`}>
              ↻ {recalculeaza ? "…" : dict.recalculeaza}
            </button>
            <button type="button" onClick={() => push({ imbogatit: f.imbogatit ? null : "1" })} aria-pressed={f.imbogatit} title={dict.imbogatitHint} className={pill(f.imbogatit)}>
              {dict.imbogatit}
            </button>
            <button type="button" onClick={() => push({ ordine: f.ordine === "contactabilitate" ? null : "contactabilitate" })} aria-pressed={f.ordine === "contactabilitate"} className={pill(f.ordine === "contactabilitate")}>
              {dict.ordineContactabilitate}
            </button>
          </>
        ) : (
          <span className="text-[12px] text-[var(--ci-text-muted)]">🔒 {dict.prioritizareBlocata}</span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[12px] font-semibold text-[var(--ci-text-muted)]">{dict.vezi}</span>
        <button type="button" onClick={() => push({ vezi: null })} className={pill(f.vezi === "toata")}>
          {dict.toataBaza}
        </button>
        <button type="button" onClick={() => push({ vezi: f.vezi === "lucrate" ? null : "lucrate" })} className={pill(f.vezi === "lucrate")}>
          {dict.doarLucrate}
        </button>
      </div>
      </>
      )}
    </div>
  );
}
