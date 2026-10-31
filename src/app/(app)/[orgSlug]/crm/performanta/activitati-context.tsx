"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useMemo, useState, useTransition } from "react";
import type { ReactNode } from "react";

import { PERFORMANTA_UI_DICT } from "@/lib/i18n/dictionaries/performanta-ui";
import { PERFORMANTA_UI2_DICT } from "@/lib/i18n/dictionaries/performanta-ui-2";
import { valideazaActivitate, valideazaBlocaj, type ActivitateInput, type Prioritate, type Recurenta, type StatusActivitate } from "@/lib/performanta-activitati-reguli";
import type { ActivitateDto, BlocajDto } from "@/lib/performanta-activitati-tipuri";
import { aziRo } from "@/lib/performanta-masurare";
import type { ObiectivSimplu } from "@/lib/performanta-pagini";
import type { OptiuniPerformanta } from "@/lib/performanta-tipuri";

import { Button } from "../components/ui/button";
import { Dialog } from "../components/ui/dialog";
import { Input, Label, Select, Textarea } from "../components/ui/input";
import { useLocale } from "../lib/locale-context";
import { amanaBlocajAction, aprobaActivitateAction, inchideBlocajAction, raporteazaBlocajAction, salveazaActivitateAction, schimbaStatusActivitateAction, stergeActivitateAction } from "./activitati-actions";

// Acțiunile pe activități și blocaje, împreună cu dialogurile lor, disponibile oricărei vederi (listă, tablă, calendar, Spațiul meu).

export type { ObiectivSimplu } from "@/lib/performanta-pagini";
export type ActiuneActivitate = "start" | "asteptare" | "de_facut" | "finalizeaza" | "redeschide" | "anuleaza" | "aproba" | "sterge";

type Ctx = {
  deschideForm: (a: ActivitateDto | null, implicit?: Partial<ActivitateInput>) => void;
  deschideBlocaj: (t: { activitateId?: string; obiectivId?: string; titlu: string }) => void;
  deschideInchidere: (b: BlocajDto) => void;
  actiune: (a: ActivitateDto, tip: ActiuneActivitate) => void;
  mesaj: { text: string; eroare: boolean } | null;
  ocupat: boolean;
};

const Context = createContext<Ctx | null>(null);
export const useActivitati = () => {
  const c = useContext(Context);
  if (!c) throw new Error("useActivitati în afara ActivitatiProvider");
  return c;
};

const STATUS_PENTRU: Record<Exclude<ActiuneActivitate, "aproba" | "sterge">, StatusActivitate> = { start: "in_lucru", asteptare: "in_asteptare", de_facut: "de_facut", finalizeaza: "finalizat", redeschide: "de_facut", anuleaza: "anulat" };

const cheieDubla = (a: ActivitateDto | null): ActivitateInput | null =>
  a && {
    id: a.id,
    titlu: a.titlu,
    descriere: a.descriere,
    responsabilId: a.responsabilId,
    obiectivId: a.obiectivId,
    rezultatId: a.rezultatId,
    prioritate: a.prioritate,
    termen: a.termen,
    efortOre: a.efortOre,
    aprobareNecesara: a.aprobareNecesara,
    rezultatAsteptat: a.rezultatAsteptat,
    criteriuFinalizare: a.criteriuFinalizare,
    dependeDe: a.dependeDe?.id ?? null,
    recurenta: a.recurenta,
  };

export function ActivitatiProvider({ orgSlug, optiuni, obiective, dependente, children }: { orgSlug: string; optiuni: OptiuniPerformanta; obiective: ObiectivSimplu[]; dependente: { id: string; titlu: string }[]; children: ReactNode }) {
  const router = useRouter();
  const dict = PERFORMANTA_UI2_DICT[useLocale()].ctx;
  const [mesaj, setMesaj] = useState<Ctx["mesaj"]>(null);
  const [ocupat, start] = useTransition();
  const [form, setForm] = useState<{ cheie: number; initial: ActivitateInput } | null>(null);
  const [blocaj, setBlocaj] = useState<{ cheie: number; activitateId?: string; obiectivId?: string; titlu: string } | null>(null);
  const [inchidere, setInchidere] = useState<BlocajDto | null>(null);

  const dupa = useCallback(
    (r: { ok: boolean; eroare?: string }, text: string) => {
      if (r.ok) {
        setMesaj({ text, eroare: false });
        router.refresh();
      } else setMesaj({ text: r.eroare ?? dict.nuSaSalvat, eroare: true });
    },
    [router, dict],
  );

  const ctx = useMemo<Ctx>(
    () => ({
      deschideForm: (a, implicit) =>
        setForm({
          cheie: Date.now(),
          initial: cheieDubla(a) ?? { titlu: "", responsabilId: optiuni.euAngajatId, prioritate: "medie", aprobareNecesara: false, recurenta: "nu", termen: null, efortOre: null, ...implicit },
        }),
      deschideBlocaj: (t) => setBlocaj({ cheie: Date.now(), ...t }),
      deschideInchidere: setInchidere,
      actiune: (a, tip) => {
        if (tip === "sterge" && !window.confirm(dict.confirmaSterge(a.titlu))) return;
        if (tip === "anuleaza" && !window.confirm(dict.confirmaAnuleaza(a.titlu))) return;
        start(async () => {
          if (tip === "aproba") dupa(await aprobaActivitateAction(orgSlug, a.id), dict.aprobata);
          else if (tip === "sterge") dupa(await stergeActivitateAction(orgSlug, a.id), dict.stearsa);
          else {
            const r = await schimbaStatusActivitateAction(orgSlug, a.id, STATUS_PENTRU[tip]);
            dupa(r, tip === "finalizeaza" ? (r.ok && "urmatoareaId" in r && r.urmatoareaId ? dict.finalizataUrmatoare : dict.finalizata) : dict.stareSchimbata);
          }
        });
      },
      mesaj,
      ocupat,
    }),
    [optiuni.euAngajatId, orgSlug, dupa, mesaj, ocupat, dict],
  );

  return (
    <Context.Provider value={ctx}>
      {children}
      {form && <FormularActivitate key={form.cheie} orgSlug={orgSlug} initial={form.initial} optiuni={optiuni} obiective={obiective} dependente={dependente} onClose={() => setForm(null)} onSalvat={(t) => { setForm(null); dupa({ ok: true }, t); }} />}
      {blocaj && <DialogBlocaj key={blocaj.cheie} orgSlug={orgSlug} t={blocaj} optiuni={optiuni} onClose={() => setBlocaj(null)} onSalvat={() => { setBlocaj(null); dupa({ ok: true }, dict.blocajRaportat); }} />}
      {inchidere && <DialogInchidere key={inchidere.id} orgSlug={orgSlug} b={inchidere} onClose={() => setInchidere(null)} onGata={(t) => { setInchidere(null); dupa({ ok: true }, t); }} />}
    </Context.Provider>
  );
}

// Cine poate primi o activitate de la mine: eu și oamenii din echipa mea (managerul vede lanțul de subordonați); adminul pe oricine.
function alocabili(o: OptiuniPerformanta) {
  const activi = o.angajati.filter((a) => a.activ);
  if (o.admin) return activi;
  const subordonati = new Set<string>();
  const coada = o.euAngajatId ? [o.euAngajatId] : [];
  while (coada.length) {
    const m = coada.pop()!;
    for (const a of o.angajati) if (a.managerId === m && !subordonati.has(a.id) && a.id !== o.euAngajatId) {
      subordonati.add(a.id);
      coada.push(a.id);
    }
  }
  return activi.filter((a) => a.id === o.euAngajatId || subordonati.has(a.id));
}

function FormularActivitate({ orgSlug, initial, optiuni, obiective, dependente, onClose, onSalvat }: { orgSlug: string; initial: ActivitateInput; optiuni: OptiuniPerformanta; obiective: ObiectivSimplu[]; dependente: { id: string; titlu: string }[]; onClose: () => void; onSalvat: (t: string) => void }) {
  const dict = PERFORMANTA_UI2_DICT[useLocale()].ctx;
  const comune = PERFORMANTA_UI_DICT[useLocale()].comune;
  const [f, setF] = useState<ActivitateInput>(initial);
  const [eroare, setEroare] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const set = <K extends keyof ActivitateInput>(k: K, v: ActivitateInput[K]) => setF((x) => ({ ...x, [k]: v }));
  const ob = obiective.find((o) => o.id === f.obiectivId);
  const alocabil = alocabili(optiuni);

  function trimite() {
    const input: ActivitateInput = { ...f, titlu: f.titlu.trim(), obiectivId: f.obiectivId || null, rezultatId: f.obiectivId ? f.rezultatId || null : null, dependeDe: f.dependeDe || null, termen: f.termen || null };
    const e = valideazaActivitate(input);
    if (e) return setEroare(e);
    setEroare(null);
    start(async () => {
      const r = await salveazaActivitateAction(orgSlug, input);
      if (!r.ok) return setEroare(r.eroare);
      onSalvat(f.id ? dict.salvata : dict.adaugata);
    });
  }

  return (
    <Dialog open onClose={onClose} title={f.id ? dict.formEdit : dict.formNou} width="max-w-2xl">
      <form
        noValidate
        className="grid gap-3 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          trimite();
        }}
      >
        <div className="sm:col-span-2">
          <Label htmlFor="ac-t">{dict.ceDeFacut}</Label>
          <Input id="ac-t" autoFocus value={f.titlu} maxLength={200} onChange={(e) => set("titlu", e.target.value)} placeholder={dict.ceDeFacutPlaceholder} />
        </div>
        <div>
          <Label htmlFor="ac-r">{dict.cineSeOcupa}</Label>
          <Select id="ac-r" value={f.responsabilId ?? ""} onChange={(e) => set("responsabilId", e.target.value || null)}>
            <option value="">{dict.alege}</option>
            {alocabil.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nume}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="ac-p">{dict.prioritate}</Label>
          <Select id="ac-p" value={f.prioritate} onChange={(e) => set("prioritate", e.target.value as Prioritate)}>
            {Object.keys(comune.prioritate).map((p) => (
              <option key={p} value={p}>
                {comune.prioritate[p]}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="ac-te">{dict.termen}</Label>
          <Input id="ac-te" type="date" value={f.termen ?? ""} onChange={(e) => set("termen", e.target.value || null)} />
        </div>
        <div>
          <Label htmlFor="ac-ef">{dict.efort}</Label>
          <Input id="ac-ef" inputMode="decimal" value={f.efortOre ?? ""} onChange={(e) => set("efortOre", e.target.value.trim() === "" ? null : Number(e.target.value.replace(",", ".")))} placeholder={dict.efortPlaceholder} />
          <p className="mt-1 text-[12px] text-[var(--ci-text-muted)]">{dict.efortNota}</p>
        </div>
        <div>
          <Label htmlFor="ac-ob">{dict.obiectivOpt}</Label>
          <Select id="ac-ob" value={f.obiectivId ?? ""} onChange={(e) => setF((x) => ({ ...x, obiectivId: e.target.value || null, rezultatId: null }))}>
            <option value="">{dict.faraObiectiv}</option>
            {obiective.map((o) => (
              <option key={o.id} value={o.id}>
                {o.titlu}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="ac-kr">{dict.rezultatOpt}</Label>
          <Select id="ac-kr" disabled={!ob} value={f.rezultatId ?? ""} onChange={(e) => set("rezultatId", e.target.value || null)}>
            <option value="">{ob ? dict.faraRezultat : dict.alegeIntaiObiectivul}</option>
            {ob?.rezultate.map((r) => (
              <option key={r.id} value={r.id}>
                {r.titlu}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="ac-dep">{dict.dependeOpt}</Label>
          <Select id="ac-dep" value={f.dependeDe ?? ""} onChange={(e) => set("dependeDe", e.target.value || null)}>
            <option value="">{dict.nuDepinde}</option>
            {dependente
              .filter((d) => d.id !== f.id)
              .map((d) => (
                <option key={d.id} value={d.id}>
                  {d.titlu}
                </option>
              ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="ac-rc">{dict.repetare}</Label>
          <Select id="ac-rc" value={f.recurenta} onChange={(e) => set("recurenta", e.target.value as Recurenta)}>
            {Object.keys(comune.recurenta).map((r) => (
              <option key={r} value={r}>
                {comune.recurenta[r]}
              </option>
            ))}
          </Select>
          {f.recurenta !== "nu" && <p className="mt-1 text-[12px] text-[var(--ci-text-muted)]">{dict.repetareNota}</p>}
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="ac-re">{dict.rezultatAsteptatOpt}</Label>
          <Textarea id="ac-re" rows={2} value={f.rezultatAsteptat ?? ""} onChange={(e) => set("rezultatAsteptat", e.target.value)} placeholder={dict.rezultatAsteptatPlaceholder} />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="ac-cf">{dict.criteriuOpt}</Label>
          <Textarea id="ac-cf" rows={2} value={f.criteriuFinalizare ?? ""} onChange={(e) => set("criteriuFinalizare", e.target.value)} placeholder={dict.criteriuPlaceholder} />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="ac-de">{dict.descriereOpt}</Label>
          <Textarea id="ac-de" rows={2} value={f.descriere ?? ""} onChange={(e) => set("descriere", e.target.value)} />
        </div>
        <label className="flex cursor-pointer items-start gap-2 text-[13px] text-[var(--ci-text)] sm:col-span-2">
          <input type="checkbox" className="mt-0.5 size-4" checked={f.aprobareNecesara} onChange={(e) => set("aprobareNecesara", e.target.checked)} />
          <span>
            {dict.cereAprobare}
            <span className="block text-[12px] text-[var(--ci-text-muted)]">{dict.cereAprobareNota}</span>
          </span>
        </label>
        {eroare && (
          <p role="alert" className="rounded-[var(--ci-radius-btn)] bg-[var(--ci-red-soft)] px-3 py-2 text-[13px] text-[var(--ci-red)] sm:col-span-2">
            {eroare}
          </p>
        )}
        <div className="flex justify-end gap-2 pt-1 sm:col-span-2">
          <Button type="button" onClick={onClose}>
            {dict.renunta}
          </Button>
          <Button type="submit" variant="primary" loading={pending}>
            {f.id ? dict.salveaza : dict.adaugaActivitatea}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

const plus = (zile: number) => new Date(Date.now() + zile * 86400000).toISOString().slice(0, 10);

function DialogBlocaj({ orgSlug, t, optiuni, onClose, onSalvat }: { orgSlug: string; t: { activitateId?: string; obiectivId?: string; titlu: string }; optiuni: OptiuniPerformanta; onClose: () => void; onSalvat: () => void }) {
  const dict = PERFORMANTA_UI2_DICT[useLocale()].ctx;
  const [motiv, setMotiv] = useState("");
  const [rez, setRez] = useState<string>("");
  const [termen, setTermen] = useState(plus(3));
  const [decizie, setDecizie] = useState(false);
  const [eroare, setEroare] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const azi = aziRo();

  function trimite() {
    const input = { activitateId: t.activitateId ?? null, obiectivId: t.obiectivId ?? null, motiv, responsabilRezolvareId: rez || null, termenRevenire: termen, necesitaDecizie: decizie };
    const e = valideazaBlocaj(input, azi);
    if (e) return setEroare(e);
    start(async () => {
      const r = await raporteazaBlocajAction(orgSlug, input);
      if (!r.ok) return setEroare(r.eroare);
      onSalvat();
    });
  }

  return (
    <Dialog open onClose={onClose} title={dict.blocajTitlu} width="max-w-lg">
      <form
        noValidate
        className="space-y-3.5"
        onSubmit={(e) => {
          e.preventDefault();
          trimite();
        }}
      >
        <p className="text-[13px] text-[var(--ci-text-muted)]">
          {dict.pentru} <strong className="text-[var(--ci-text)]">{t.titlu}</strong>
          {dict.blocajIntro}
        </p>
        <div>
          <Label htmlFor="bl-m">{dict.ceTeOpreste}</Label>
          <Textarea id="bl-m" autoFocus rows={3} maxLength={1000} value={motiv} onChange={(e) => setMotiv(e.target.value)} placeholder={dict.ceTeOprestePlaceholder} />
        </div>
        <div>
          <Label htmlFor="bl-r">{dict.cineRezolva}</Label>
          <Select id="bl-r" value={rez} onChange={(e) => setRez(e.target.value)}>
            <option value="">{dict.alege}</option>
            {optiuni.angajati
              .filter((a) => a.activ)
              .map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nume}
                </option>
              ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="bl-t">{dict.candRevii}</Label>
          <Input id="bl-t" type="date" min={azi} value={termen} onChange={(e) => setTermen(e.target.value)} />
        </div>
        <label className="flex cursor-pointer items-start gap-2 text-[13px] text-[var(--ci-text)]">
          <input type="checkbox" className="mt-0.5 size-4" checked={decizie} onChange={(e) => setDecizie(e.target.checked)} />
          <span>
            {dict.areNevoieDecizie}
            <span className="block text-[12px] text-[var(--ci-text-muted)]">{dict.areNevoieDecizieNota}</span>
          </span>
        </label>
        {eroare && (
          <p role="alert" className="rounded-[var(--ci-radius-btn)] bg-[var(--ci-red-soft)] px-3 py-2 text-[13px] text-[var(--ci-red)]">
            {eroare}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" onClick={onClose}>
            {dict.renunta}
          </Button>
          <Button type="submit" variant="primary" loading={pending}>
            {dict.raporteazaBlocajul}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function DialogInchidere({ orgSlug, b, onClose, onGata }: { orgSlug: string; b: BlocajDto; onClose: () => void; onGata: (t: string) => void }) {
  const dict = PERFORMANTA_UI2_DICT[useLocale()].ctx;
  const [text, setText] = useState("");
  const [termen, setTermen] = useState(plus(3));
  const [eroare, setEroare] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const rula = (f: () => Promise<{ ok: boolean; eroare?: string }>, mesaj: string) =>
    start(async () => {
      const r = await f();
      if (!r.ok) return setEroare(r.eroare ?? dict.nuSaSalvat);
      onGata(mesaj);
    });
  return (
    <Dialog open onClose={onClose} title={dict.inchidereTitlu} width="max-w-lg">
      <div className="space-y-3.5">
        <div className="rounded-[var(--ci-radius-btn)] bg-[var(--ci-surface-2)] p-3 text-[13px]">
          <p className="font-medium text-[var(--ci-text)]">{b.activitateTitlu ?? b.obiectivTitlu ?? dict.blocaj}</p>
          <p className="mt-1 text-[var(--ci-text-muted)]">{b.motiv}</p>
          <p className="mt-1.5 text-[12px] text-[var(--ci-text-muted)]">
            {dict.deRezolvat(b.rezolvatorNume ?? "—", dict.dataLegacy(b.termenRevenire))}
            {b.necesitaDecizie && dict.cereDecizie}
          </p>
        </div>
        <div>
          <Label htmlFor="inc-t">{dict.cumSaRezolvat}</Label>
          <Textarea id="inc-t" rows={2} maxLength={1000} value={text} onChange={(e) => setText(e.target.value)} placeholder={dict.cumSaRezolvatPlaceholder} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" loading={pending} onClick={() => rula(() => inchideBlocajAction(orgSlug, b.id, "rezolvat", text), dict.blocajRezolvat)}>
            {dict.marcheazaRezolvat}
          </Button>
          <Button loading={pending} onClick={() => rula(() => inchideBlocajAction(orgSlug, b.id, "anulat", text), dict.blocajAnulat)}>
            {dict.nuMaiE}
          </Button>
        </div>
        <div className="flex flex-wrap items-end gap-2 border-t border-[var(--ci-border)] pt-3">
          <div>
            <Label htmlFor="inc-a">{dict.amanaPanaLa}</Label>
            <Input id="inc-a" type="date" min={aziRo()} value={termen} onChange={(e) => setTermen(e.target.value)} />
          </div>
          <Button loading={pending} onClick={() => rula(() => amanaBlocajAction(orgSlug, b.id, termen), dict.termenMutat)}>
            {dict.amana}
          </Button>
        </div>
        {eroare && (
          <p role="alert" className="rounded-[var(--ci-radius-btn)] bg-[var(--ci-red-soft)] px-3 py-2 text-[13px] text-[var(--ci-red)]">
            {eroare}
          </p>
        )}
      </div>
    </Dialog>
  );
}
