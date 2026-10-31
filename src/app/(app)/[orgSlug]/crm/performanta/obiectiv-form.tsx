"use client";

import { ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";

import { PERFORMANTA_UI_DICT } from "@/lib/i18n/dictionaries/performanta-ui";
import { PERFORMANTA_UI3_DICT } from "@/lib/i18n/dictionaries/performanta-ui-3";
import { type FrecventaActualizare, type Metoda, type TipTinta } from "@/lib/performanta-masurare";
import { METRICI_CRM, METRICA_PE_ID } from "@/lib/performanta-metrici";
import { type NivelObiectiv, type ObiectivDto, type OptiuniPerformanta, type SursaRezultat, type Vizibilitate } from "@/lib/performanta-tipuri";
import { MAX_REZULTATE, valideazaObiectiv, type ObiectivInput, type RezultatInput } from "@/lib/performanta-validare";

import { Button } from "../components/ui/button";
import { Input, Label, Select, Textarea } from "../components/ui/input";
import { SidePanel } from "../components/ui/side-panel";
import { useLocale } from "../lib/locale-context";
import { obiectiveAlegereAction, salveazaObiectivAction } from "./obiective-actions";

type KrForm = RezultatInput & { cheie: string; deschis: boolean };

const cheieNoua = () => Math.random().toString(36).slice(2, 10);

const krGol = (): KrForm => ({
  cheie: cheieNoua(),
  deschis: true,
  titlu: "",
  metoda: "crescator",
  tipTinta: "cumulativ",
  unitate: "",
  nivelInitial: 0,
  tinta: null,
  tintaMax: null,
  pondere: 1,
  sursa: "manual",
  kpiDefinitieId: null,
  kpiAngajatId: null,
  metrica: null,
  agregare: null,
  frecventaActualizare: "lunar",
  termen: null,
  responsabilId: null,
  formula: "",
  reguli: "",
  atribuire: "",
});

const num = (v: string): number | null => {
  if (v.trim() === "") return null;
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

function dinObiectiv(o: ObiectivDto): { form: ObiectivInput; kr: KrForm[] } {
  return {
    form: {
      id: o.id,
      nivel: o.nivel,
      titlu: o.titlu,
      descriere: o.descriere,
      responsabilId: o.responsabilId,
      departmentId: o.departmentId,
      parentId: o.parentId,
      perioadaStart: o.perioadaStart,
      perioadaEnd: o.perioadaEnd,
      vizibilitate: o.vizibilitate,
      colaboratori: o.colaboratori.map((c) => c.id),
      legaturi: o.legaturi.map((l) => ({ id: l.id, tip: l.tip as "sprijina" | "depinde_de" | "legat" })),
      rezultate: [],
    },
    kr: o.rezultate
      .filter((r) => r.status === "activ")
      .map((r) => ({
        cheie: r.id,
        deschis: false,
        id: r.id,
        titlu: r.titlu,
        descriere: r.descriere,
        metoda: r.metoda,
        tipTinta: r.tipTinta,
        unitate: r.unitate ?? "",
        nivelInitial: r.nivelInitial,
        tinta: r.tinta,
        tintaMax: r.tintaMax,
        pondere: r.pondere,
        sursa: r.sursa,
        kpiDefinitieId: r.kpiDefinitieId,
        kpiAngajatId: r.kpiAngajatId,
        metrica: (r.sursaConfig as { metrica?: string } | null)?.metrica ?? null,
        agregare: ((r.sursaConfig as { agregare?: string } | null)?.agregare as RezultatInput["agregare"]) ?? null,
        frecventaActualizare: r.frecventaActualizare,
        termen: r.termen,
        responsabilId: r.responsabilId,
        formula: r.formula ?? "",
        reguli: r.reguli ?? "",
        atribuire: r.atribuire ?? "",
      })),
  };
}

const LEGATURI = ["sprijina", "depinde_de", "legat"] as const;

export function ObiectivForm(p: {
  orgSlug: string;
  open: boolean;
  onClose: () => void;
  editat: ObiectivDto | null;
  optiuni: OptiuniPerformanta;
  perioada: { start: string; end: string };
  parentImplicit?: string | null;
  onSalvat: (id: string) => void;
}) {
  const dict = PERFORMANTA_UI3_DICT[useLocale()].form;
  return (
    <SidePanel open={p.open} onClose={p.onClose} lat title={p.editat ? dict.editeaza : dict.nou} subtitle={dict.subtitlu(MAX_REZULTATE)}>
      {/* Conținutul se montează la fiecare deschidere, deci formularul pornește mereu curat (sau din obiectivul editat). */}
      {p.open && <FormularObiectiv {...p} />}
    </SidePanel>
  );
}

function FormularObiectiv({ orgSlug, onClose, editat, optiuni, perioada, parentImplicit, onSalvat }: { orgSlug: string; onClose: () => void; editat: ObiectivDto | null; optiuni: OptiuniPerformanta; perioada: { start: string; end: string }; parentImplicit?: string | null; onSalvat: (id: string) => void }) {
  const locale = useLocale();
  const dict = PERFORMANTA_UI3_DICT[locale].form;
  const comune = PERFORMANTA_UI_DICT[locale].comune;
  const [initial] = useState(() => (editat ? dinObiectiv(editat) : { form: golForm(optiuni, perioada, parentImplicit), kr: [] as KrForm[] }));
  const [form, setForm] = useState<ObiectivInput>(initial.form);
  const [kr, setKr] = useState<KrForm[]>(initial.kr);
  const [eroare, setEroare] = useState<string | null>(null);
  const [alegere, setAlegere] = useState<{ id: string; titlu: string; nivel: string }[]>([]);
  const [pending, start] = useTransition();

  // Obiectivele care pot fi părinte / legături: cele din perioada aleasă.
  useEffect(() => {
    let anulat = false;
    obiectiveAlegereAction(orgSlug, form.perioadaStart, form.perioadaEnd).then((r) => {
      if (!anulat) setAlegere(Array.isArray(r) ? r.filter((x) => x.id !== form.id) : []);
    });
    return () => {
      anulat = true;
    };
  }, [orgSlug, form.perioadaStart, form.perioadaEnd, form.id]);

  const angajatiActivi = useMemo(() => optiuni.angajati.filter((a) => a.activ), [optiuni.angajati]);
  const set = <K extends keyof ObiectivInput>(k: K, v: ObiectivInput[K]) => setForm((f) => ({ ...f, [k]: v }));
  const setKr1 = (cheie: string, patch: Partial<KrForm>) => setKr((l) => l.map((x) => (x.cheie === cheie ? { ...x, ...patch } : x)));
  const sumaPonderi = kr.reduce((s, r) => s + (Number.isFinite(r.pondere) ? r.pondere : 0), 0);

  function trimite() {
    const input: ObiectivInput = {
      ...form,
      titlu: form.titlu.trim(),
      rezultate: kr.map((x) => {
        const { cheie, deschis, ...r } = x;
        void cheie;
        void deschis;
        return {
        ...r,
        unitate: r.unitate?.trim() || null,
        formula: r.formula?.trim() || null,
        reguli: r.reguli?.trim() || null,
        atribuire: r.atribuire?.trim() || null,
        termen: r.termen || null,
        responsabilId: r.responsabilId || null,
        metrica: r.sursa === "crm" ? r.metrica : null,
        kpiDefinitieId: r.sursa === "kpi" ? r.kpiDefinitieId : null,
        kpiAngajatId: r.sursa === "kpi" ? r.kpiAngajatId : null,
        agregare: r.sursa === "manual" ? null : r.agregare,
        tinta: r.metoda === "binar" ? 1 : r.tinta,
        tintaMax: r.metoda === "interval" ? r.tintaMax : null,
        nivelInitial: r.metoda === "binar" || r.metoda === "interval" ? null : r.nivelInitial,
        };
      }),
    };
    const e = valideazaObiectiv(input);
    if (e) {
      setEroare(e);
      return;
    }
    setEroare(null);
    start(async () => {
      const r = await salveazaObiectivAction(orgSlug, input);
      if (!r.ok) {
        setEroare(r.eroare);
        return;
      }
      onSalvat(r.id);
    });
  }

  return (
    <>
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          trimite();
        }}
        noValidate
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="ob-titlu">{dict.titlul}</Label>
            <Input id="ob-titlu" value={form.titlu} maxLength={200} onChange={(e) => set("titlu", e.target.value)} placeholder={dict.titluPlaceholder} required />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="ob-desc">{dict.descriere}</Label>
            <Textarea id="ob-desc" value={form.descriere ?? ""} onChange={(e) => set("descriere", e.target.value)} rows={2} placeholder={dict.descrierePlaceholder} />
          </div>
          <div>
            <Label htmlFor="ob-nivel">{dict.nivel}</Label>
            <Select id="ob-nivel" value={form.nivel} onChange={(e) => set("nivel", e.target.value as NivelObiectiv)}>
              {Object.keys(comune.nivel).map((n) => (
                <option key={n} value={n}>
                  {comune.nivel[n]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="ob-resp">{dict.responsabilPrincipal}</Label>
            <Select id="ob-resp" value={form.responsabilId ?? ""} onChange={(e) => set("responsabilId", e.target.value || null)} required>
              <option value="">{dict.alege}</option>
              {angajatiActivi.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nume}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="ob-dep">{dict.departament}</Label>
            <Select id="ob-dep" value={form.departmentId ?? ""} onChange={(e) => set("departmentId", e.target.value || null)}>
              <option value="">{dict.faraDepartament}</option>
              {optiuni.departamente.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nume}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="ob-viz">{dict.cineVede}</Label>
            <Select id="ob-viz" value={form.vizibilitate} onChange={(e) => set("vizibilitate", e.target.value as Vizibilitate)}>
              {Object.keys(comune.vizibilitate).map((v) => (
                <option key={v} value={v}>
                  {comune.vizibilitate[v]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="ob-start">{dict.inceput}</Label>
            <Input id="ob-start" type="date" value={form.perioadaStart} onChange={(e) => set("perioadaStart", e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="ob-end">{dict.sfarsit}</Label>
            <Input id="ob-end" type="date" value={form.perioadaEnd} min={form.perioadaStart} onChange={(e) => set("perioadaEnd", e.target.value)} required />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="ob-parent">{dict.sprijina}</Label>
            <Select id="ob-parent" value={form.parentId ?? ""} onChange={(e) => set("parentId", e.target.value || null)}>
              <option value="">{dict.niciunSuperior}</option>
              {alegere.map((o) => (
                <option key={o.id} value={o.id}>
                  {comune.nivel[o.nivel] ?? o.nivel}: {o.titlu}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <fieldset>
          <legend className="mb-1.5 text-[13px] font-medium text-[var(--ci-text)]">{dict.colaboratori}</legend>
          <div className="ci-scrollbar flex max-h-32 flex-wrap gap-1.5 overflow-y-auto">
            {angajatiActivi
              .filter((a) => a.id !== form.responsabilId)
              .map((a) => {
                const pe = form.colaboratori.includes(a.id);
                return (
                  <label key={a.id} className={`cursor-pointer rounded-full border px-2.5 py-1 text-[12.5px] transition-colors focus-within:ring-2 focus-within:ring-[var(--ci-primary)] ${pe ? "border-[var(--ci-primary)] bg-[var(--ci-primary)]/10 font-medium text-[var(--ci-text)]" : "border-[var(--ci-border)] text-[var(--ci-text-muted)] hover:bg-[var(--ci-surface-2)]"}`}>
                    <input type="checkbox" className="sr-only" checked={pe} onChange={() => set("colaboratori", pe ? form.colaboratori.filter((x) => x !== a.id) : [...form.colaboratori, a.id])} />
                    {a.nume}
                  </label>
                );
              })}
            {angajatiActivi.length <= 1 && <p className="text-[12.5px] text-[var(--ci-text-muted)]">{dict.adaugaMembri}</p>}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-1.5 text-[13px] font-medium text-[var(--ci-text)]">{dict.legaturiCu}</legend>
          <div className="space-y-2">
            {form.legaturi.map((l, i) => (
              <div key={l.id} className="flex items-center gap-2">
                <Select aria-label={dict.tipLegatura} className="max-w-36" value={l.tip} onChange={(e) => set("legaturi", form.legaturi.map((x, j) => (j === i ? { ...x, tip: e.target.value as typeof l.tip } : x)))}>
                  {LEGATURI.map((t) => (
                    <option key={t} value={t}>
                      {dict.tipuriLeg[t]}
                    </option>
                  ))}
                </Select>
                <span className="min-w-0 flex-1 truncate text-[13px] text-[var(--ci-text)]">{alegere.find((o) => o.id === l.id)?.titlu ?? dict.altaPerioada}</span>
                <Button type="button" variant="ghost" size="icon" aria-label={dict.scoateLegatura} onClick={() => set("legaturi", form.legaturi.filter((_, j) => j !== i))}>
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              </div>
            ))}
            <Select
              aria-label={dict.adaugaLegatura}
              value=""
              onChange={(e) => {
                if (e.target.value) set("legaturi", [...form.legaturi, { id: e.target.value, tip: "legat" }]);
              }}
            >
              <option value="">{dict.adaugaLegaturaOpt}</option>
              {alegere
                .filter((o) => !form.legaturi.some((l) => l.id === o.id))
                .map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.titlu}
                  </option>
                ))}
            </Select>
          </div>
        </fieldset>

        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="ci-display text-[14px] font-semibold text-[var(--ci-text)]">{dict.rezultateCheie(kr.length, MAX_REZULTATE)}</h3>
            <Button type="button" size="sm" disabled={kr.length >= MAX_REZULTATE} onClick={() => setKr((l) => [...l, krGol()])}>
              <Plus className="size-4" aria-hidden /> {dict.rezultatCheie}
            </Button>
          </div>
          <p className="mb-3 text-[12.5px] text-[var(--ci-text-muted)]">
            {dict.explicatieStart}
            <strong>{dict.cat}</strong>
            {dict.explicatieMijloc}
            <strong>{dict.cum}</strong>
            {dict.explicatieFinal}
            {kr.length > 1 && dict.ponderi(sumaPonderi)}
          </p>
          {kr.length === 0 && <p className="rounded-[var(--ci-radius-card)] border border-dashed border-[var(--ci-border)] p-4 text-center text-[13px] text-[var(--ci-text-muted)]">{dict.faraRk}</p>}
          <div className="space-y-2">
            {kr.map((r, i) => (
              <EditorRezultat key={r.cheie} r={r} index={i} optiuni={optiuni} angajati={angajatiActivi} perioada={{ start: form.perioadaStart, end: form.perioadaEnd }} onChange={(p) => setKr1(r.cheie, p)} onSterge={() => setKr((l) => l.filter((x) => x.cheie !== r.cheie))} />
            ))}
          </div>
        </div>

        {eroare && (
          <p role="alert" className="rounded-[var(--ci-radius-btn)] bg-[var(--ci-red-soft)] px-3 py-2 text-[13px] text-[var(--ci-red)]">
            {eroare}
          </p>
        )}
        <div className="sticky bottom-0 -mx-5 -mb-5 flex justify-end gap-2 border-t border-[var(--ci-border)] bg-[var(--ci-surface)] px-5 py-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            {dict.renunta}
          </Button>
          <Button type="submit" variant="primary" loading={pending}>
            {editat ? dict.salveazaModificarile : dict.creeaza}
          </Button>
        </div>
      </form>
    </>
  );
}

function golForm(optiuni: OptiuniPerformanta, perioada: { start: string; end: string }, parentId?: string | null): ObiectivInput {
  const eu = optiuni.euAngajatId;
  return {
    nivel: optiuni.admin ? "echipa" : "individual",
    titlu: "",
    descriere: "",
    responsabilId: eu,
    departmentId: optiuni.angajati.find((a) => a.id === eu)?.departmentId ?? null,
    parentId: parentId ?? null,
    perioadaStart: perioada.start,
    perioadaEnd: perioada.end,
    vizibilitate: "organizatie",
    colaboratori: [],
    legaturi: [],
    rezultate: [],
  };
}

function EditorRezultat({
  r,
  index,
  optiuni,
  angajati,
  perioada,
  onChange,
  onSterge,
}: {
  r: KrForm;
  index: number;
  optiuni: OptiuniPerformanta;
  angajati: { id: string; nume: string }[];
  perioada: { start: string; end: string };
  onChange: (p: Partial<KrForm>) => void;
  onSterge: () => void;
}) {
  const locale = useLocale();
  const dict = PERFORMANTA_UI3_DICT[locale].form;
  const comune = PERFORMANTA_UI_DICT[locale].comune;
  const metriciEn = PERFORMANTA_UI3_DICT[locale].metrici;
  const pref = `kr-${r.cheie}`;
  const metricaLib = r.metrica ? METRICA_PE_ID.get(r.metrica) : null;
  const metrica = metricaLib ? { ...metricaLib, ...(metriciEn[metricaLib.id] ?? {}) } : null;
  const unitateAfisata = r.unitate || metrica?.unitate || "";
  return (
    <div className="rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] bg-[var(--ci-surface)]">
      <div className="flex items-center gap-2 px-3 py-2">
        <button type="button" aria-expanded={r.deschis} aria-controls={`${pref}-corp`} onClick={() => onChange({ deschis: !r.deschis })} className="flex min-w-0 flex-1 items-center gap-2 text-left focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none">
          {r.deschis ? <ChevronDown className="size-4 shrink-0 text-[var(--ci-text-muted)]" aria-hidden /> : <ChevronRight className="size-4 shrink-0 text-[var(--ci-text-muted)]" aria-hidden />}
          <span className="truncate text-[13.5px] font-medium text-[var(--ci-text)]">{r.titlu.trim() || dict.rkN(index + 1)}</span>
          {!r.deschis && <span className="ci-tabular ml-auto shrink-0 text-[12px] text-[var(--ci-text-muted)]">{rezumatTinta(r, unitateAfisata, dict)}</span>}
        </button>
        <Button type="button" variant="ghost" size="icon" aria-label={dict.stergeRk(index + 1)} onClick={onSterge}>
          <Trash2 className="size-4" aria-hidden />
        </Button>
      </div>
      {r.deschis && (
        <div id={`${pref}-corp`} className="grid gap-3 border-t border-[var(--ci-border)] p-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor={`${pref}-t`}>{dict.ceVremSaObtinem}</Label>
            <Input id={`${pref}-t`} value={r.titlu} maxLength={200} onChange={(e) => onChange({ titlu: e.target.value })} placeholder={dict.ceVremPlaceholder} />
          </div>
          <div>
            <Label htmlFor={`${pref}-m`}>{dict.cumSeMasoara}</Label>
            <Select id={`${pref}-m`} value={r.metoda} onChange={(e) => onChange({ metoda: e.target.value as Metoda })}>
              {Object.keys(comune.metoda).map((m) => (
                <option key={m} value={m}>
                  {comune.metoda[m].eticheta}
                </option>
              ))}
            </Select>
            <p className="mt-1 text-[12px] text-[var(--ci-text-muted)]">{comune.metoda[r.metoda]?.explicatie}</p>
          </div>
          <div>
            <Label htmlFor={`${pref}-tt`}>{dict.tipulTintei}</Label>
            <Select id={`${pref}-tt`} value={r.tipTinta} onChange={(e) => onChange({ tipTinta: e.target.value as TipTinta })}>
              <option value="cumulativ">{dict.cumulativa}</option>
              <option value="periodic">{dict.periodica}</option>
            </Select>
          </div>
          {r.metoda !== "binar" && (
            <>
              {r.metoda !== "interval" && (
                <div>
                  <Label htmlFor={`${pref}-ni`}>{dict.nivelPornire}</Label>
                  <Input id={`${pref}-ni`} inputMode="decimal" value={r.nivelInitial ?? ""} onChange={(e) => onChange({ nivelInitial: num(e.target.value) })} placeholder="0" />
                </div>
              )}
              <div>
                <Label htmlFor={`${pref}-ti`}>{r.metoda === "interval" ? dict.limitaJos : dict.tinta}</Label>
                <Input id={`${pref}-ti`} inputMode="decimal" value={r.tinta ?? ""} onChange={(e) => onChange({ tinta: num(e.target.value) })} />
              </div>
              {r.metoda === "interval" && (
                <div>
                  <Label htmlFor={`${pref}-tx`}>{dict.limitaSus}</Label>
                  <Input id={`${pref}-tx`} inputMode="decimal" value={r.tintaMax ?? ""} onChange={(e) => onChange({ tintaMax: num(e.target.value) })} />
                </div>
              )}
              <div>
                <Label htmlFor={`${pref}-u`}>{dict.unitate}</Label>
                <Input id={`${pref}-u`} value={r.unitate ?? ""} maxLength={20} onChange={(e) => onChange({ unitate: e.target.value })} placeholder={metrica?.unitate ?? dict.unitatePlaceholder} />
              </div>
            </>
          )}
          <div>
            <Label htmlFor={`${pref}-p`}>{dict.pondere}</Label>
            <Input id={`${pref}-p`} type="number" min={1} max={100} value={Number.isFinite(r.pondere) ? r.pondere : ""} onChange={(e) => onChange({ pondere: Number(e.target.value) })} />
          </div>
          <div>
            <Label htmlFor={`${pref}-s`}>{dict.deUndeVine}</Label>
            <Select id={`${pref}-s`} value={r.sursa} onChange={(e) => onChange({ sursa: e.target.value as SursaRezultat })}>
              <option value="manual">{dict.manual}</option>
              <option value="crm">{dict.dinCrm}</option>
              {r.sursa === "kpi" && <option value="kpi">{dict.dinKpi}</option>}
            </Select>
          </div>
          {r.sursa === "manual" && (
            <div>
              <Label htmlFor={`${pref}-f`}>{dict.catDesActualizeaza}</Label>
              <Select id={`${pref}-f`} value={r.frecventaActualizare} onChange={(e) => onChange({ frecventaActualizare: e.target.value as FrecventaActualizare })}>
                {Object.keys(comune.frecventa).map((f) => (
                  <option key={f} value={f}>
                    {comune.frecventa[f]}
                  </option>
                ))}
              </Select>
            </div>
          )}
          {r.sursa === "crm" && (
            <div className="sm:col-span-2">
              <Label htmlFor={`${pref}-mc`}>{dict.metricaCrm}</Label>
              <Select id={`${pref}-mc`} value={r.metrica ?? ""} onChange={(e) => onChange({ metrica: e.target.value || null, unitate: METRICA_PE_ID.get(e.target.value)?.unitate ?? r.unitate })}>
                <option value="">{dict.alegeMetrica}</option>
                {METRICI_CRM.map((m) => (
                  <option key={m.id} value={m.id}>
                    {metriciEn[m.id]?.eticheta ?? m.eticheta}
                  </option>
                ))}
              </Select>
              {metrica && (
                <div className="mt-1.5 space-y-1 rounded-[var(--ci-radius-btn)] bg-[var(--ci-surface-2)] p-2.5 text-[12px] text-[var(--ci-text-muted)]">
                  <p>
                    <strong className="text-[var(--ci-text)]">{dict.cumSeCalculeaza}</strong> {metrica.formula}
                  </p>
                  <p>
                    <strong className="text-[var(--ci-text)]">{dict.limite}</strong> {metrica.limite}
                  </p>
                </div>
              )}
            </div>
          )}
          {r.sursa === "kpi" && (
            <>
              <div>
                <Label htmlFor={`${pref}-k`}>{dict.kpi}</Label>
                <Select id={`${pref}-k`} value={r.kpiDefinitieId ?? ""} onChange={(e) => onChange({ kpiDefinitieId: e.target.value || null })}>
                  <option value="">{dict.alegeKpi}</option>
                  {optiuni.kpiuri.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.nume}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor={`${pref}-ka`}>{dict.valorileCui}</Label>
                <Select id={`${pref}-ka`} value={r.kpiAngajatId ?? ""} onChange={(e) => onChange({ kpiAngajatId: e.target.value || null })}>
                  <option value="">{dict.alegeAngajatul}</option>
                  {angajati.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nume}
                    </option>
                  ))}
                </Select>
              </div>
            </>
          )}
          {r.sursa !== "manual" && (
            <div>
              <Label htmlFor={`${pref}-ag`}>{dict.cumSeAduna}</Label>
              <Select id={`${pref}-ag`} value={r.agregare ?? ""} onChange={(e) => onChange({ agregare: (e.target.value || null) as RezultatInput["agregare"] })}>
                <option value="">{dict.implicit(r.tipTinta === "periodic")}</option>
                <option value="suma">{dict.suma}</option>
                <option value="ultima">{dict.ultima}</option>
                <option value="medie">{dict.media}</option>
              </Select>
            </div>
          )}
          <div>
            <Label htmlFor={`${pref}-te`}>{dict.termenOpt}</Label>
            <Input id={`${pref}-te`} type="date" min={perioada.start} max={perioada.end} value={r.termen ?? ""} onChange={(e) => onChange({ termen: e.target.value || null })} />
          </div>
          <div>
            <Label htmlFor={`${pref}-r`}>{dict.cineActualizeaza}</Label>
            <Select id={`${pref}-r`} value={r.responsabilId ?? ""} onChange={(e) => onChange({ responsabilId: e.target.value || null })}>
              <option value="">{dict.responsabilulObiectivului}</option>
              {angajati.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nume}
                </option>
              ))}
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor={`${pref}-fo`}>{dict.formulaOpt}</Label>
            <Textarea id={`${pref}-fo`} rows={2} value={r.formula ?? ""} onChange={(e) => onChange({ formula: e.target.value })} placeholder={dict.formulaPlaceholder} />
          </div>
          <div>
            <Label htmlFor={`${pref}-re`}>{dict.includeExcludeLabel}</Label>
            <Textarea id={`${pref}-re`} rows={2} value={r.reguli ?? ""} onChange={(e) => onChange({ reguli: e.target.value })} placeholder={dict.includeExcludePlaceholder} />
          </div>
          <div>
            <Label htmlFor={`${pref}-at`}>{dict.limiteAtribuire}</Label>
            <Textarea id={`${pref}-at`} rows={2} value={r.atribuire ?? ""} onChange={(e) => onChange({ atribuire: e.target.value })} placeholder={dict.limiteAtribuirePlaceholder} />
          </div>
        </div>
      )}
    </div>
  );
}

function rezumatTinta(r: RezultatInput, unitate: string, dict: { binarRezumat: string; faraTintaRezumat: string }): string {
  if (r.metoda === "binar") return dict.binarRezumat;
  if (r.tinta === null || r.tinta === undefined) return dict.faraTintaRezumat;
  const u = unitate ? ` ${unitate}` : "";
  if (r.metoda === "interval") return `${r.tinta}–${r.tintaMax ?? r.tinta}${u}`;
  return `${r.metoda === "descrescator" ? "≤" : "≥"} ${r.tinta}${u}`;
}
