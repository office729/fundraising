"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useMemo, useState, useTransition } from "react";
import type { ReactNode } from "react";

import { ETICHETE_PRIORITATE, ETICHETE_RECURENTA, valideazaActivitate, valideazaBlocaj, type ActivitateInput, type Prioritate, type Recurenta, type StatusActivitate } from "@/lib/performanta-activitati-reguli";
import type { ActivitateDto, BlocajDto } from "@/lib/performanta-activitati-tipuri";
import { aziRo } from "@/lib/performanta-masurare";
import type { ObiectivSimplu } from "@/lib/performanta-pagini";
import type { OptiuniPerformanta } from "@/lib/performanta-tipuri";

import { Button } from "../components/ui/button";
import { Dialog } from "../components/ui/dialog";
import { Input, Label, Select, Textarea } from "../components/ui/input";
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
      } else setMesaj({ text: r.eroare ?? "Nu s-a putut salva.", eroare: true });
    },
    [router],
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
        if (tip === "sterge" && !window.confirm(`Ștergi activitatea „${a.titlu}”? Nu se poate anula.`)) return;
        if (tip === "anuleaza" && !window.confirm(`Anulezi activitatea „${a.titlu}”?`)) return;
        start(async () => {
          if (tip === "aproba") dupa(await aprobaActivitateAction(orgSlug, a.id), "Activitatea a fost aprobată.");
          else if (tip === "sterge") dupa(await stergeActivitateAction(orgSlug, a.id), "Activitatea a fost ștearsă.");
          else {
            const r = await schimbaStatusActivitateAction(orgSlug, a.id, STATUS_PENTRU[tip]);
            dupa(r, tip === "finalizeaza" ? (r.ok && "urmatoareaId" in r && r.urmatoareaId ? "Finalizată. Următoarea ocurență a fost creată." : "Activitatea e finalizată.") : "Starea a fost schimbată.");
          }
        });
      },
      mesaj,
      ocupat,
    }),
    [optiuni.euAngajatId, orgSlug, dupa, mesaj, ocupat],
  );

  return (
    <Context.Provider value={ctx}>
      {children}
      {form && <FormularActivitate key={form.cheie} orgSlug={orgSlug} initial={form.initial} optiuni={optiuni} obiective={obiective} dependente={dependente} onClose={() => setForm(null)} onSalvat={(t) => { setForm(null); dupa({ ok: true }, t); }} />}
      {blocaj && <DialogBlocaj key={blocaj.cheie} orgSlug={orgSlug} t={blocaj} optiuni={optiuni} onClose={() => setBlocaj(null)} onSalvat={() => { setBlocaj(null); dupa({ ok: true }, "Blocajul a fost raportat."); }} />}
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
      onSalvat(f.id ? "Activitatea a fost salvată." : "Activitatea a fost adăugată.");
    });
  }

  return (
    <Dialog open onClose={onClose} title={f.id ? "Editează activitatea" : "Activitate nouă"} width="max-w-2xl">
      <form
        noValidate
        className="grid gap-3 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          trimite();
        }}
      >
        <div className="sm:col-span-2">
          <Label htmlFor="ac-t">Ce trebuie făcut</Label>
          <Input id="ac-t" autoFocus value={f.titlu} maxLength={200} onChange={(e) => set("titlu", e.target.value)} placeholder="ex. Trimite raportul către sponsor" />
        </div>
        <div>
          <Label htmlFor="ac-r">Cine se ocupă</Label>
          <Select id="ac-r" value={f.responsabilId ?? ""} onChange={(e) => set("responsabilId", e.target.value || null)}>
            <option value="">Alege…</option>
            {alocabil.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nume}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="ac-p">Prioritate</Label>
          <Select id="ac-p" value={f.prioritate} onChange={(e) => set("prioritate", e.target.value as Prioritate)}>
            {(Object.keys(ETICHETE_PRIORITATE) as Prioritate[]).map((p) => (
              <option key={p} value={p}>
                {ETICHETE_PRIORITATE[p]}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="ac-te">Termen</Label>
          <Input id="ac-te" type="date" value={f.termen ?? ""} onChange={(e) => set("termen", e.target.value || null)} />
        </div>
        <div>
          <Label htmlFor="ac-ef">Efort estimat (ore)</Label>
          <Input id="ac-ef" inputMode="decimal" value={f.efortOre ?? ""} onChange={(e) => set("efortOre", e.target.value.trim() === "" ? null : Number(e.target.value.replace(",", ".")))} placeholder="ex. 2,5" />
          <p className="mt-1 text-[12px] text-[var(--ci-text-muted)]">Din el se calculează încărcarea săptămânii.</p>
        </div>
        <div>
          <Label htmlFor="ac-ob">Obiectiv (opțional)</Label>
          <Select id="ac-ob" value={f.obiectivId ?? ""} onChange={(e) => setF((x) => ({ ...x, obiectivId: e.target.value || null, rezultatId: null }))}>
            <option value="">Fără obiectiv</option>
            {obiective.map((o) => (
              <option key={o.id} value={o.id}>
                {o.titlu}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="ac-kr">Rezultat-cheie (opțional)</Label>
          <Select id="ac-kr" disabled={!ob} value={f.rezultatId ?? ""} onChange={(e) => set("rezultatId", e.target.value || null)}>
            <option value="">{ob ? "Fără rezultat-cheie" : "Alege întâi obiectivul"}</option>
            {ob?.rezultate.map((r) => (
              <option key={r.id} value={r.id}>
                {r.titlu}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="ac-dep">Depinde de (opțional)</Label>
          <Select id="ac-dep" value={f.dependeDe ?? ""} onChange={(e) => set("dependeDe", e.target.value || null)}>
            <option value="">Nu depinde de altă activitate</option>
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
          <Label htmlFor="ac-rc">Repetare</Label>
          <Select id="ac-rc" value={f.recurenta} onChange={(e) => set("recurenta", e.target.value as Recurenta)}>
            {(Object.keys(ETICHETE_RECURENTA) as Recurenta[]).map((r) => (
              <option key={r} value={r}>
                {ETICHETE_RECURENTA[r]}
              </option>
            ))}
          </Select>
          {f.recurenta !== "nu" && <p className="mt-1 text-[12px] text-[var(--ci-text-muted)]">La finalizare se creează automat următoarea, cu termenul mutat.</p>}
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="ac-re">Rezultat așteptat (opțional)</Label>
          <Textarea id="ac-re" rows={2} value={f.rezultatAsteptat ?? ""} onChange={(e) => set("rezultatAsteptat", e.target.value)} placeholder="Ce ar trebui să existe după ce activitatea e gata." />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="ac-cf">Criteriu de finalizare (opțional)</Label>
          <Textarea id="ac-cf" rows={2} value={f.criteriuFinalizare ?? ""} onChange={(e) => set("criteriuFinalizare", e.target.value)} placeholder="Cum știm că e gata, fără discuții." />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="ac-de">Descriere (opțional)</Label>
          <Textarea id="ac-de" rows={2} value={f.descriere ?? ""} onChange={(e) => set("descriere", e.target.value)} />
        </div>
        <label className="flex cursor-pointer items-start gap-2 text-[13px] text-[var(--ci-text)] sm:col-span-2">
          <input type="checkbox" className="mt-0.5 size-4" checked={f.aprobareNecesara} onChange={(e) => set("aprobareNecesara", e.target.checked)} />
          <span>
            Cere aprobarea managerului înainte de finalizare
            <span className="block text-[12px] text-[var(--ci-text-muted)]">Utilă pentru ce iese în exterior: rapoarte, mesaje către sponsori, comunicate.</span>
          </span>
        </label>
        {eroare && (
          <p role="alert" className="rounded-[var(--ci-radius-btn)] bg-[var(--ci-red-soft)] px-3 py-2 text-[13px] text-[var(--ci-red)] sm:col-span-2">
            {eroare}
          </p>
        )}
        <div className="flex justify-end gap-2 pt-1 sm:col-span-2">
          <Button type="button" onClick={onClose}>
            Renunță
          </Button>
          <Button type="submit" variant="primary" loading={pending}>
            {f.id ? "Salvează" : "Adaugă activitatea"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

const plus = (zile: number) => new Date(Date.now() + zile * 86400000).toISOString().slice(0, 10);

function DialogBlocaj({ orgSlug, t, optiuni, onClose, onSalvat }: { orgSlug: string; t: { activitateId?: string; obiectivId?: string; titlu: string }; optiuni: OptiuniPerformanta; onClose: () => void; onSalvat: () => void }) {
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
    <Dialog open onClose={onClose} title="Raportează un blocaj" width="max-w-lg">
      <form
        noValidate
        className="space-y-3.5"
        onSubmit={(e) => {
          e.preventDefault();
          trimite();
        }}
      >
        <p className="text-[13px] text-[var(--ci-text-muted)]">
          Pentru: <strong className="text-[var(--ci-text)]">{t.titlu}</strong>. Un blocaj nu e o vină: îl vede cine îl poate rezolva, iar activitatea își schimbă starea singură când îl închizi.
        </p>
        <div>
          <Label htmlFor="bl-m">Ce te oprește</Label>
          <Textarea id="bl-m" autoFocus rows={3} maxLength={1000} value={motiv} onChange={(e) => setMotiv(e.target.value)} placeholder="ex. Așteptăm aprobarea juridică a contractului." />
        </div>
        <div>
          <Label htmlFor="bl-r">Cine îl poate rezolva</Label>
          <Select id="bl-r" value={rez} onChange={(e) => setRez(e.target.value)}>
            <option value="">Alege…</option>
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
          <Label htmlFor="bl-t">Când revii asupra lui</Label>
          <Input id="bl-t" type="date" min={azi} value={termen} onChange={(e) => setTermen(e.target.value)} />
        </div>
        <label className="flex cursor-pointer items-start gap-2 text-[13px] text-[var(--ci-text)]">
          <input type="checkbox" className="mt-0.5 size-4" checked={decizie} onChange={(e) => setDecizie(e.target.checked)} />
          <span>
            Are nevoie de o decizie
            <span className="block text-[12px] text-[var(--ci-text-muted)]">Apare pe pagina de prezentare, ca să nu rămână uitat.</span>
          </span>
        </label>
        {eroare && (
          <p role="alert" className="rounded-[var(--ci-radius-btn)] bg-[var(--ci-red-soft)] px-3 py-2 text-[13px] text-[var(--ci-red)]">
            {eroare}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" onClick={onClose}>
            Renunță
          </Button>
          <Button type="submit" variant="primary" loading={pending}>
            Raportează blocajul
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function DialogInchidere({ orgSlug, b, onClose, onGata }: { orgSlug: string; b: BlocajDto; onClose: () => void; onGata: (t: string) => void }) {
  const [text, setText] = useState("");
  const [termen, setTermen] = useState(plus(3));
  const [eroare, setEroare] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const rula = (f: () => Promise<{ ok: boolean; eroare?: string }>, mesaj: string) =>
    start(async () => {
      const r = await f();
      if (!r.ok) return setEroare(r.eroare ?? "Nu s-a putut salva.");
      onGata(mesaj);
    });
  return (
    <Dialog open onClose={onClose} title="Blocaj" width="max-w-lg">
      <div className="space-y-3.5">
        <div className="rounded-[var(--ci-radius-btn)] bg-[var(--ci-surface-2)] p-3 text-[13px]">
          <p className="font-medium text-[var(--ci-text)]">{b.activitateTitlu ?? b.obiectivTitlu ?? "Blocaj"}</p>
          <p className="mt-1 text-[var(--ci-text-muted)]">{b.motiv}</p>
          <p className="mt-1.5 text-[12px] text-[var(--ci-text-muted)]">
            De rezolvat de {b.rezolvatorNume ?? "—"} · revenire până la {b.termenRevenire.split("-").reverse().join(".")}
            {b.necesitaDecizie && " · cere o decizie"}
          </p>
        </div>
        <div>
          <Label htmlFor="inc-t">Cum s-a rezolvat</Label>
          <Textarea id="inc-t" rows={2} maxLength={1000} value={text} onChange={(e) => setText(e.target.value)} placeholder="Pe scurt, ca să rămână în istoric." />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" loading={pending} onClick={() => rula(() => inchideBlocajAction(orgSlug, b.id, "rezolvat", text), "Blocajul a fost rezolvat.")}>
            Marchează rezolvat
          </Button>
          <Button loading={pending} onClick={() => rula(() => inchideBlocajAction(orgSlug, b.id, "anulat", text), "Blocajul a fost anulat.")}>
            Nu mai e valabil
          </Button>
        </div>
        <div className="flex flex-wrap items-end gap-2 border-t border-[var(--ci-border)] pt-3">
          <div>
            <Label htmlFor="inc-a">Amână revenirea până la</Label>
            <Input id="inc-a" type="date" min={aziRo()} value={termen} onChange={(e) => setTermen(e.target.value)} />
          </div>
          <Button loading={pending} onClick={() => rula(() => amanaBlocajAction(orgSlug, b.id, termen), "Termenul de revenire a fost mutat.")}>
            Amână
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
