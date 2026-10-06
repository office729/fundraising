"use client";

import { CalendarRange, Plus, Trash2, X } from "lucide-react";
import { useState, useTransition } from "react";

import { Badge } from "../components/ui/badge";
import { Breadcrumb } from "../components/ui/breadcrumb";
import { Button } from "../components/ui/button";
import { Card, CardHeader } from "../components/ui/card";
import { Dialog } from "../components/ui/dialog";
import { Input, Label, Select } from "../components/ui/input";
import { EmptyState } from "../components/ui/states";
import type { DefinitieRand } from "./library-actions";
import {
  creeazaProfilSezonierAction,
  listeazaProfiluriSezoniereAction,
  stergeProfilSezonierAction,
  type ProfilSezonierInput,
  type ProfilSezonierRand,
} from "./sezoniere-actions";

const GOL: ProfilSezonierInput = { nume: "", dataStart: "", dataSfarsit: "", recurent: true, itemi: [] };

export function SezoniereClient({
  orgSlug,
  initialProfiluri,
  definitii,
  esteAdmin,
}: {
  orgSlug: string;
  initialProfiluri: ProfilSezonierRand[];
  definitii: DefinitieRand[];
  esteAdmin: boolean;
}) {
  const [profiluri, setProfiluri] = useState(initialProfiluri);
  const [dialogDeschis, setDialogDeschis] = useState(false);
  const [form, setForm] = useState<ProfilSezonierInput>(GOL);
  const [kpiDeAdaugat, setKpiDeAdaugat] = useState("");
  const [eroare, setEroare] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const reincarca = async () => setProfiluri(await listeazaProfiluriSezoniereAction(orgSlug));

  const onAdaugaItem = () => {
    if (!kpiDeAdaugat || form.itemi.some((i) => i.kpiDefinitieId === kpiDeAdaugat)) return;
    setForm({ ...form, itemi: [...form.itemi, { kpiDefinitieId: kpiDeAdaugat, targetOverride: null, pondereOverride: null }] });
    setKpiDeAdaugat("");
  };

  const onCreeaza = () => {
    setEroare(null);
    start(async () => {
      try {
        await creeazaProfilSezonierAction(orgSlug, form);
        setDialogDeschis(false);
        setForm(GOL);
        await reincarca();
      } catch (e) {
        setEroare(e instanceof Error ? e.message : "Eroare.");
      }
    });
  };

  const onSterge = (id: string) => {
    if (!window.confirm("Ștergi acest profil sezonier? Atribuirile normale rămân neschimbate, doar override-urile din această perioadă se șterg.")) return;
    start(async () => {
      await stergeProfilSezonierAction(orgSlug, id);
      await reincarca();
    });
  };

  const numeKpi = (id: string) => definitii.find((d) => d.id === id)?.nume ?? id;
  const kpiDisponibile = definitii.filter((d) => !form.itemi.some((i) => i.kpiDefinitieId === d.id));

  return (
    <div className="mx-auto max-w-[900px] space-y-5">
      <Breadcrumb items={[{ label: "Instrumente", href: `/${orgSlug}/crm/instrumente` }, { label: "KPI Library", href: `/${orgSlug}/crm/kpi` }, { label: "Profiluri sezoniere" }]} />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">Profiluri KPI sezoniere</h1>
          <p className="mt-0.5 text-[13px] text-[var(--ci-text-muted)]">
            Pentru perioade cu activitate diferită (ex. sezon de Crăciun, campanii de 1 Iunie) — targeturi/ponderi temporare pentru anumite KPI, valabile doar în intervalul ales. După perioadă, revine automat la normal.
          </p>
        </div>
        {esteAdmin && <Button onClick={() => { setForm(GOL); setDialogDeschis(true); }}><Plus className="h-3.5 w-3.5" /> Profil nou</Button>}
      </div>

      {profiluri.length === 0 ? (
        <EmptyState icon={CalendarRange} title="Niciun profil sezonier încă" description="Majoritatea ONG-urilor nu au nevoie de asta — folosește-l doar dacă ai perioade cu targeturi clar diferite." />
      ) : (
        <div className="space-y-3">
          {profiluri.map((p) => (
            <Card key={p.id}>
              <CardHeader
                title={p.nume}
                subtitle={`${p.dataStart} → ${p.dataSfarsit}${p.recurent ? " · recurent în fiecare an" : ""}`}
                action={esteAdmin && <Button variant="ghost" size="icon" title="Șterge" onClick={() => onSterge(p.id)} disabled={pending}><Trash2 className="h-3.5 w-3.5" /></Button>}
              />
              {p.itemi.length === 0 ? (
                <p className="text-[13px] text-[var(--ci-text-muted)]">Niciun KPI inclus în acest profil.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {p.itemi.map((i) => (
                    <Badge key={i.kpiDefinitieId} tone="blue">
                      {i.kpiNume}
                      {i.targetOverride != null && ` · target ${i.targetOverride}`}
                      {i.pondereOverride != null && ` · ${i.pondereOverride}%`}
                    </Badge>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogDeschis} onClose={() => setDialogDeschis(false)} title="Profil sezonier nou">
        <div className="space-y-3.5">
          <div>
            <Label>Nume</Label>
            <Input value={form.nume} onChange={(e) => setForm({ ...form, nume: e.target.value })} placeholder="ex. Sezon de Crăciun" />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label>Dată start</Label>
              <Input type="date" value={form.dataStart} onChange={(e) => setForm({ ...form, dataStart: e.target.value })} />
            </div>
            <div>
              <Label>Dată sfârșit</Label>
              <Input type="date" value={form.dataSfarsit} onChange={(e) => setForm({ ...form, dataSfarsit: e.target.value })} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-[13px] text-[var(--ci-text)]">
            <input type="checkbox" checked={form.recurent} onChange={(e) => setForm({ ...form, recurent: e.target.checked })} />
            Recurent în fiecare an (ignoră anul, doar luna/ziua contează)
          </label>

          <div>
            <Label>KPI-uri incluse</Label>
            <div className="space-y-2">
              {form.itemi.map((i) => (
                <div key={i.kpiDefinitieId} className="flex items-center gap-2 rounded-lg border border-[var(--ci-border)] p-2">
                  <p className="flex-1 text-[13px] text-[var(--ci-text)]">{numeKpi(i.kpiDefinitieId)}</p>
                  <Input
                    type="number"
                    placeholder="target"
                    className="w-24"
                    value={i.targetOverride ?? ""}
                    onChange={(e) => setForm({ ...form, itemi: form.itemi.map((x) => (x.kpiDefinitieId === i.kpiDefinitieId ? { ...x, targetOverride: e.target.value === "" ? null : Number(e.target.value) } : x)) })}
                  />
                  <Input
                    type="number"
                    placeholder="pondere %"
                    className="w-24"
                    value={i.pondereOverride ?? ""}
                    onChange={(e) => setForm({ ...form, itemi: form.itemi.map((x) => (x.kpiDefinitieId === i.kpiDefinitieId ? { ...x, pondereOverride: e.target.value === "" ? null : Number(e.target.value) } : x)) })}
                  />
                  <Button variant="ghost" size="icon" onClick={() => setForm({ ...form, itemi: form.itemi.filter((x) => x.kpiDefinitieId !== i.kpiDefinitieId) })}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              {kpiDisponibile.length > 0 && (
                <div className="flex items-center gap-2">
                  <Select value={kpiDeAdaugat} onChange={(e) => setKpiDeAdaugat(e.target.value)} className="flex-1">
                    <option value="">— alege un KPI de adăugat —</option>
                    {kpiDisponibile.map((d) => <option key={d.id} value={d.id}>{d.nume}</option>)}
                  </Select>
                  <Button variant="secondary" size="sm" onClick={onAdaugaItem} disabled={!kpiDeAdaugat}>Adaugă</Button>
                </div>
              )}
            </div>
          </div>

          {eroare && <p className="text-[13px] text-[var(--ci-red)]">{eroare}</p>}
          <Button onClick={onCreeaza} disabled={pending || !form.nume.trim() || !form.dataStart || !form.dataSfarsit}>Creează profilul</Button>
        </div>
      </Dialog>
    </div>
  );
}
