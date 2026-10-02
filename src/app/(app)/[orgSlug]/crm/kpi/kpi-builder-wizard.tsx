"use client";

import { useState } from "react";

import { Button } from "../components/ui/button";
import { Dialog } from "../components/ui/dialog";
import { Input, Label, Select, Textarea } from "../components/ui/input";
import { creeazaDefinitieAction, actualizeazaDefinitieAction, type CategorieRand, type DefinitieInput, type DefinitieRand, type SursaDate } from "./library-actions";

// Singurele metrici CRM efectiv conectate la motor (vezi METRICI_CRM_DISPONIBILE
// din lib/kpi-engine.ts) — fără alegerea uneia dintre ele, sursaDate.tip="crm"
// nu calculează NICIODATĂ nimic automat (motorul întoarce null fără `metric`).
const METRICI_CRM: { v: string; eticheta: string }[] = [
  { v: "companii", eticheta: "Companii lucrate (actualizate)" },
  { v: "contacte", eticheta: "Contacte adăugate" },
  { v: "apeluri", eticheta: "Apeluri efectuate" },
  { v: "sponsorizari", eticheta: "Sponsorizări înregistrate" },
  { v: "notite", eticheta: "Notițe adăugate" },
  { v: "etape", eticheta: "Mutări în pipeline" },
];

const TIPURI: { v: DefinitieRand["tip"]; eticheta: string; exemplu: string }[] = [
  { v: "numeric", eticheta: "Numeric", exemplu: "ex. 100 contacte" },
  { v: "percentage", eticheta: "Procent", exemplu: "ex. 95% follow-up la termen" },
  { v: "currency", eticheta: "Monetar", exemplu: "ex. 50.000 RON fonduri atrase" },
  { v: "boolean", eticheta: "Da/Nu", exemplu: "ex. raport lunar finalizat" },
  { v: "rating", eticheta: "Scor", exemplu: "ex. satisfacție 4,5/5" },
  { v: "duration", eticheta: "Durată", exemplu: "ex. timp mediu răspuns 12 ore" },
  { v: "ratio", eticheta: "Raport", exemplu: "ex. conversie 10%" },
  { v: "milestone", eticheta: "Etapă", exemplu: "ex. proiect lansat" },
  { v: "custom", eticheta: "Personalizat", exemplu: "" },
];

const DIRECTII: { v: DefinitieRand["directie"]; eticheta: string }[] = [
  { v: "mai_mare_mai_bine", eticheta: "Mai mare e mai bine" },
  { v: "mai_mic_mai_bine", eticheta: "Mai mic e mai bine" },
  { v: "egal_cu_target", eticheta: "Trebuie să fie egal cu targetul" },
  { v: "interval_optim", eticheta: "Interval optim" },
];

const FRECVENTE: { v: DefinitieRand["frecventa"]; eticheta: string }[] = [
  { v: "zilnic", eticheta: "Zilnic" },
  { v: "saptamanal", eticheta: "Săptămânal" },
  { v: "lunar", eticheta: "Lunar" },
  { v: "trimestrial", eticheta: "Trimestrial" },
  { v: "anual", eticheta: "Anual" },
  { v: "custom", eticheta: "Interval personalizat" },
];

// Doar "crm" e conectat la motorul de calcul azi — restul au doar schema
// pregătită (vezi lib/kpi-engine.ts). Etichetele spun asta explicit, ca un
// admin să nu creadă că 10 din 12 surse "vor funcționa automat" — niciuna
// din ele n-are adaptor scris încă, afișarea trebuie să fie onestă, nu doar
// textul tehnic din spatele unui buton "Calculează".
const SURSE: { v: NonNullable<SursaDate>["tip"]; eticheta: string; conectata: boolean }[] = [
  { v: "crm", eticheta: "CRM (contacte/companii/apeluri)", conectata: true },
  { v: "manual", eticheta: "Introducere manuală", conectata: true },
  { v: "task", eticheta: "Taskuri (neconectat încă — manual)", conectata: false },
  { v: "proiect", eticheta: "Proiecte (neconectat încă — manual)", conectata: false },
  { v: "donatori", eticheta: "Donatori (neconectat încă — manual)", conectata: false },
  { v: "companii", eticheta: "Companii / sponsorizări — generic (neconectat încă — manual)", conectata: false },
  { v: "voluntari", eticheta: "Voluntari (neconectat încă — manual)", conectata: false },
  { v: "beneficiari", eticheta: "Beneficiari (neconectat încă — manual)", conectata: false },
  { v: "formular", eticheta: "Formulare (neconectat încă — manual)", conectata: false },
  { v: "financiar", eticheta: "Financiar (neconectat încă — manual)", conectata: false },
  { v: "eveniment", eticheta: "Evenimente (neconectat încă — manual)", conectata: false },
  { v: "api_extern", eticheta: "API extern (neconectat încă — manual)", conectata: false },
];

const PASI = ["Nume", "Categorie", "Ce măsurăm?", "Sursă", "Frecvență", "Preview"];

function golInput(initial?: DefinitieRand): DefinitieInput {
  if (initial) {
    return {
      nume: initial.nume,
      descriere: initial.descriere,
      categorieId: initial.categorieId,
      tip: initial.tip,
      unitate: initial.unitate,
      directie: initial.directie,
      frecventa: initial.frecventa,
      sursaDate: initial.sursaDate,
      esteManual: initial.esteManual,
    };
  }
  return { nume: "", descriere: null, categorieId: null, tip: "numeric", unitate: null, directie: "mai_mare_mai_bine", frecventa: "lunar", sursaDate: { tip: "manual" }, esteManual: true };
}

export function KpiBuilderWizard({
  open,
  onClose,
  orgSlug,
  categorii,
  editId,
  initial,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  orgSlug: string;
  categorii: CategorieRand[];
  editId?: string | null;
  initial?: DefinitieRand;
  onSaved: () => void;
}) {
  const [pas, setPas] = useState(0);
  const [form, setForm] = useState<DefinitieInput>(() => golInput(initial));
  const [eroare, setEroare] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const reseteaza = () => {
    setPas(0);
    setForm(golInput(initial));
    setEroare(null);
  };

  const inchide = () => {
    reseteaza();
    onClose();
  };

  const onSalveaza = async () => {
    setEroare(null);
    setPending(true);
    try {
      if (editId) await actualizeazaDefinitieAction(orgSlug, editId, form);
      else await creeazaDefinitieAction(orgSlug, form);
      inchide();
      onSaved();
    } catch (e) {
      setEroare(e instanceof Error ? e.message : "Eroare.");
    } finally {
      setPending(false);
    }
  };

  const poatInainte =
    (pas === 0 && form.nume.trim().length > 0) ||
    pas === 1 ||
    (pas === 2 && true) ||
    (pas === 3 && true) ||
    pas === 4;

  return (
    <Dialog open={open} onClose={inchide} title={editId ? "Editează KPI" : "KPI nou"} width="max-w-lg">
      <div className="mb-4 flex items-center gap-1.5">
        {PASI.map((p, i) => (
          <div key={p} className={`h-1 flex-1 rounded-full ${i <= pas ? "bg-[var(--ci-primary)]" : "bg-[var(--ci-surface-2)]"}`} title={p} />
        ))}
      </div>
      <p className="mb-3 text-[12px] font-medium text-[var(--ci-text-muted)]">
        Pas {pas + 1} din {PASI.length} · {PASI[pas]}
      </p>

      {pas === 0 && (
        <div className="space-y-3.5">
          <div>
            <Label>Nume KPI</Label>
            <Input value={form.nume} onChange={(e) => setForm({ ...form, nume: e.target.value })} placeholder="ex. Companii contactate" autoFocus />
          </div>
          <div>
            <Label>Descriere (opțional)</Label>
            <Textarea value={form.descriere ?? ""} onChange={(e) => setForm({ ...form, descriere: e.target.value || null })} rows={2} />
          </div>
        </div>
      )}

      {pas === 1 && (
        <div>
          <Label>Categorie (opțional)</Label>
          <Select value={form.categorieId ?? ""} onChange={(e) => setForm({ ...form, categorieId: e.target.value || null })}>
            <option value="">— fără categorie —</option>
            {categorii.map((c) => <option key={c.id} value={c.id}>{c.nume}</option>)}
          </Select>
        </div>
      )}

      {pas === 2 && (
        <div className="space-y-3.5">
          <div>
            <Label>Tip</Label>
            <Select value={form.tip} onChange={(e) => setForm({ ...form, tip: e.target.value as DefinitieInput["tip"] })}>
              {TIPURI.map((t) => <option key={t.v} value={t.v}>{t.eticheta}{t.exemplu ? ` — ${t.exemplu}` : ""}</option>)}
            </Select>
          </div>
          <div>
            <Label>Unitate de măsură (opțional)</Label>
            <Input value={form.unitate ?? ""} onChange={(e) => setForm({ ...form, unitate: e.target.value || null })} placeholder="ex. contacte, RON, ore" />
          </div>
          <div>
            <Label>Direcție</Label>
            <Select value={form.directie} onChange={(e) => setForm({ ...form, directie: e.target.value as DefinitieInput["directie"] })}>
              {DIRECTII.map((d) => <option key={d.v} value={d.v}>{d.eticheta}</option>)}
            </Select>
          </div>
        </div>
      )}

      {pas === 3 && (
        <div className="space-y-3.5">
          <div>
            <Label>De unde vin datele?</Label>
            <Select
              value={form.sursaDate?.tip ?? "manual"}
              onChange={(e) => {
                const tip = e.target.value as NonNullable<SursaDate>["tip"];
                setForm({ ...form, sursaDate: tip === "crm" ? { tip, metric: METRICI_CRM[0].v } : { tip }, esteManual: tip === "manual" });
              }}
            >
              {SURSE.map((s) => <option key={s.v} value={s.v}>{s.eticheta}</option>)}
            </Select>
          </div>

          {form.sursaDate?.tip === "crm" && (
            <div>
              <Label>Ce anume din CRM se numără?</Label>
              <Select value={form.sursaDate.metric ?? METRICI_CRM[0].v} onChange={(e) => setForm({ ...form, sursaDate: { tip: "crm", metric: e.target.value } })}>
                {METRICI_CRM.map((m) => <option key={m.v} value={m.v}>{m.eticheta}</option>)}
              </Select>
              <p className="mt-1 text-[12px] text-[var(--ci-text-muted)]">Numără activitatea reală din CRM a fiecărui angajat (după contul lui de login), pe perioada KPI-ului — fără introducere dublă.</p>
            </div>
          )}

          {form.sursaDate?.tip && form.sursaDate.tip !== "manual" && form.sursaDate.tip !== "crm" && (
            <p className="text-[12px] text-[var(--ci-amber)]">
              Această sursă nu are încă un conector real — KPI-ul se va comporta ca manual (cere introducere de la angajat/admin) până se conectează.
            </p>
          )}

          {form.sursaDate?.tip && form.sursaDate.tip !== "manual" && (
            <label className="flex items-center gap-2 text-[13px] text-[var(--ci-text)]">
              <input type="checkbox" checked={form.esteManual} onChange={(e) => setForm({ ...form, esteManual: e.target.checked })} />
              Permite și completare manuală (pe lângă automatizare)
            </label>
          )}
        </div>
      )}

      {pas === 4 && (
        <div>
          <Label>Frecvență</Label>
          <Select value={form.frecventa} onChange={(e) => setForm({ ...form, frecventa: e.target.value as DefinitieInput["frecventa"] })}>
            {FRECVENTE.map((f) => <option key={f.v} value={f.v}>{f.eticheta}</option>)}
          </Select>
        </div>
      )}

      {pas === 5 && (
        <div className="space-y-3">
          <div className="rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] p-3.5">
            <p className="text-[13px] font-semibold text-[var(--ci-text)]">{form.nume || "—"}</p>
            {form.descriere && <p className="mt-0.5 text-[12px] text-[var(--ci-text-muted)]">{form.descriere}</p>}
            <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
              <span className="rounded-full bg-[var(--ci-surface-2)] px-2 py-0.5 text-[var(--ci-text-muted)]">{categorii.find((c) => c.id === form.categorieId)?.nume ?? "fără categorie"}</span>
              <span className="rounded-full bg-[var(--ci-blue-soft)] px-2 py-0.5 text-[var(--ci-blue)]">{TIPURI.find((t) => t.v === form.tip)?.eticheta}{form.unitate ? ` (${form.unitate})` : ""}</span>
              <span className="rounded-full bg-[var(--ci-surface-2)] px-2 py-0.5 text-[var(--ci-text-muted)]">{FRECVENTE.find((f) => f.v === form.frecventa)?.eticheta}</span>
              <span className="rounded-full bg-[var(--ci-surface-2)] px-2 py-0.5 text-[var(--ci-text-muted)]">sursă: {SURSE.find((s) => s.v === form.sursaDate?.tip)?.eticheta}</span>
            </div>
          </div>
          <p className="text-[12px] text-[var(--ci-text-muted)]">
            După ce salvezi, KPI-ul apare în bibliotecă — targetul, ponderea și cui i se atribuie se setează separat, din „Atribuiri”.
          </p>
        </div>
      )}

      {eroare && <p className="mt-3 text-[13px] text-[var(--ci-red)]">{eroare}</p>}

      <div className="mt-5 flex items-center justify-between">
        <Button variant="ghost" onClick={() => (pas === 0 ? inchide() : setPas(pas - 1))} disabled={pending}>
          {pas === 0 ? "Anulează" : "Înapoi"}
        </Button>
        {pas < PASI.length - 1 ? (
          <Button onClick={() => setPas(pas + 1)} disabled={!poatInainte}>Continuă</Button>
        ) : (
          <Button onClick={onSalveaza} disabled={pending}>{editId ? "Salvează" : "Creează KPI"}</Button>
        )}
      </div>
    </Dialog>
  );
}
