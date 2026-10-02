"use client";

import { AlertTriangle, History, Plus, RefreshCw, Save, Trash2 } from "lucide-react";
import { useMemo, useState, useTransition } from "react";

import { Badge } from "../components/ui/badge";
import { Breadcrumb } from "../components/ui/breadcrumb";
import { Button } from "../components/ui/button";
import { Card, CardHeader } from "../components/ui/card";
import { Dialog } from "../components/ui/dialog";
import { Input, Label, Select, Textarea } from "../components/ui/input";
import { EmptyState } from "../components/ui/states";
import {
  creeazaAtribuireAction,
  inregistreazaValoareManualaAction,
  listeazaAtribuiriAction,
  listeazaIstoricValoareAction,
  obtineValoareCurentaAction,
  stergeAtribuireAction,
  type AtribuireInput,
  type AtribuireRand,
  type IstoricValoare,
  type ValoarePerioada,
} from "./atribuiri-actions";
import type { DefinitieRand } from "./library-actions";

type AngajatOptiune = { id: string; nume: string; prenume: string | null };

const GOL_ATRIBUIRE: AtribuireInput = { kpiDefinitieId: "", pondere: null, targetMinim: null, targetNormal: null, targetStretch: null, proRata: true };

export function AtribuiriClient({
  orgSlug,
  angajati,
  definitii,
  initialAngajatId,
  initialAtribuiri,
  esteAdmin,
}: {
  orgSlug: string;
  angajati: AngajatOptiune[];
  definitii: DefinitieRand[];
  initialAngajatId: string | null;
  initialAtribuiri: AtribuireRand[];
  esteAdmin: boolean;
}) {
  const [angajatId, setAngajatId] = useState(initialAngajatId ?? "");
  const [atribuiri, setAtribuiri] = useState(initialAtribuiri);
  const [valori, setValori] = useState<Record<string, ValoarePerioada>>({});
  const [dialogDeschis, setDialogDeschis] = useState(false);
  const [form, setForm] = useState<AtribuireInput>(GOL_ATRIBUIRE);
  const [istoricDeschis, setIstoricDeschis] = useState<{ kpiDefinitieId: string; nume: string } | null>(null);
  const [istoric, setIstoric] = useState<IstoricValoare[]>([]);
  const [eroare, setEroare] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const totalPondere = useMemo(() => atribuiri.filter((a) => a.status === "activ").reduce((s, a) => s + (a.pondere ?? 0), 0), [atribuiri]);
  const definitiiDisponibile = useMemo(() => definitii.filter((d) => d.esteActiv && !atribuiri.some((a) => a.kpiDefinitieId === d.id)), [definitii, atribuiri]);

  const schimbaAngajat = (id: string) => {
    setAngajatId(id);
    setValori({});
    setEroare(null);
    start(async () => setAtribuiri(await listeazaAtribuiriAction(orgSlug, id)));
  };

  const incarcaValoare = (kpiDefinitieId: string) => {
    start(async () => {
      try {
        const v = await obtineValoareCurentaAction(orgSlug, angajatId, kpiDefinitieId);
        setValori((prev) => ({ ...prev, [kpiDefinitieId]: v }));
      } catch (e) {
        setEroare(e instanceof Error ? e.message : "Eroare.");
      }
    });
  };

  const onAtribuie = () => {
    setEroare(null);
    start(async () => {
      try {
        await creeazaAtribuireAction(orgSlug, angajatId, form);
        setDialogDeschis(false);
        setForm(GOL_ATRIBUIRE);
        setAtribuiri(await listeazaAtribuiriAction(orgSlug, angajatId));
      } catch (e) {
        setEroare(e instanceof Error ? e.message : "Eroare.");
      }
    });
  };

  const onSterge = (id: string) => {
    start(async () => {
      try {
        await stergeAtribuireAction(orgSlug, id);
        setAtribuiri(await listeazaAtribuiriAction(orgSlug, angajatId));
      } catch (e) {
        setEroare(e instanceof Error ? e.message : "Eroare.");
      }
    });
  };

  const onVeziIstoric = (kpiDefinitieId: string, nume: string) => {
    setIstoricDeschis({ kpiDefinitieId, nume });
    start(async () => setIstoric(await listeazaIstoricValoareAction(orgSlug, angajatId, kpiDefinitieId)));
  };

  const angajatulCurent = angajati.find((a) => a.id === angajatId);

  return (
    <div className="mx-auto max-w-[1000px] space-y-5">
      <Breadcrumb items={[{ label: "Instrumente", href: `/${orgSlug}/crm/instrumente` }, { label: "KPI Library", href: `/${orgSlug}/crm/kpi` }, { label: "Atribuiri" }]} />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">Atribuiri & Targeturi</h1>
          <p className="mt-0.5 text-[13px] text-[var(--ci-text-muted)]">Alege un membru al echipei și atribuie-i KPI din bibliotecă, cu target și pondere proprii.</p>
        </div>
        <Select value={angajatId} onChange={(e) => schimbaAngajat(e.target.value)} className="w-56">
          <option value="">— alege un membru —</option>
          {angajati.map((a) => <option key={a.id} value={a.id}>{a.nume} {a.prenume}</option>)}
        </Select>
      </div>

      {eroare && (
        <p className="flex items-center gap-1.5 text-[13px] text-[var(--ci-red)]">
          <AlertTriangle className="h-3.5 w-3.5" /> {eroare}
        </p>
      )}

      {!angajatId ? (
        <EmptyState title="Alege un membru al echipei" description="Selectează de sus pentru a vedea și atribui KPI." />
      ) : (
        <Card>
          <CardHeader
            title={`KPI-urile lui ${angajatulCurent?.nume ?? ""}`}
            subtitle={`Pondere totală activă: ${totalPondere}%${totalPondere !== 100 && atribuiri.some((a) => a.status === "activ") ? " — nu însumează 100%, dar nu e obligatoriu" : ""}`}
            action={esteAdmin && <Button size="sm" onClick={() => setDialogDeschis(true)} disabled={definitiiDisponibile.length === 0}><Plus className="h-3.5 w-3.5" /> Atribuie KPI</Button>}
          />
          {atribuiri.length === 0 ? (
            <EmptyState title="Niciun KPI atribuit încă" description="Atribuie primul KPI din bibliotecă acestui membru." action={esteAdmin && <Button size="sm" onClick={() => setDialogDeschis(true)}>Atribuie KPI</Button>} />
          ) : (
            <div className="space-y-2">
              {atribuiri.map((a) => {
                const v = valori[a.kpiDefinitieId];
                // "Conectată" = are un adaptor REAL (azi doar tip 'crm' cu metric
                // setat — vezi lib/kpi-engine.ts). Un KPI cu tip automat dar fără
                // adaptor scris încă (ex. 'donatori') se comportă ca manual — nu
                // arătăm un verde fals-pozitiv doar pentru că tipul nu e "manual".
                const sursaConectata = a.kpiSursaDate?.tip === "crm" && Boolean(a.kpiSursaDate.metric);
                const esteAutomatNeconectat = Boolean(a.kpiSursaDate && a.kpiSursaDate.tip !== "manual" && !sursaConectata);
                return (
                  <div key={a.id} className="rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] p-3.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-[13px] font-medium text-[var(--ci-text)]">{a.kpiNume}</p>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {a.pondere != null && <Badge tone="blue">{a.pondere}% pondere</Badge>}
                          {a.targetNormal != null && <Badge tone="neutral">target {a.targetNormal}{a.kpiUnitate ? ` ${a.kpiUnitate}` : ""}</Badge>}
                          {a.proRata && <Badge tone="neutral">pro-rata</Badge>}
                          <Badge tone={sursaConectata ? "green" : esteAutomatNeconectat ? "neutral" : "amber"}>
                            {sursaConectata ? "sursă automată" : esteAutomatNeconectat ? "automat — neconectat încă" : "manual"}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" title="Istoric" onClick={() => onVeziIstoric(a.kpiDefinitieId, a.kpiNume)}><History className="h-3.5 w-3.5" /></Button>
                        {esteAdmin && <Button variant="ghost" size="icon" title="Șterge atribuirea" onClick={() => onSterge(a.id)} disabled={pending}><Trash2 className="h-3.5 w-3.5" /></Button>}
                      </div>
                    </div>

                    <div className="mt-3 rounded-lg bg-[var(--ci-surface-2)] p-2.5">
                      {!v ? (
                        <Button variant="secondary" size="sm" onClick={() => incarcaValoare(a.kpiDefinitieId)} disabled={pending}>
                          <RefreshCw className="h-3.5 w-3.5" /> {sursaConectata ? "Calculează valoarea perioadei curente" : "Vezi valoarea perioadei curente"}
                        </Button>
                      ) : sursaConectata ? (
                        <div className="flex items-center justify-between">
                          <p className="text-[13px] text-[var(--ci-text)]">
                            Perioada curentă: <span className="ci-tabular font-semibold">{v.valoare ?? "—"}</span>{a.kpiUnitate ? ` ${a.kpiUnitate}` : ""}
                            {v.valoare === null && <span className="text-[var(--ci-text-muted)]"> — acest angajat nu are cont de login legat, nu poate fi calculat automat</span>}
                          </p>
                          <Button variant="ghost" size="icon" title="Recalculează" onClick={() => incarcaValoare(a.kpiDefinitieId)} disabled={pending}><RefreshCw className="h-3.5 w-3.5" /></Button>
                        </div>
                      ) : (
                        <ManualEntry orgSlug={orgSlug} angajatId={angajatId} kpiDefinitieId={a.kpiDefinitieId} unitate={a.kpiUnitate} valoare={v} onSalvat={() => incarcaValoare(a.kpiDefinitieId)} />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      <Dialog open={dialogDeschis} onClose={() => setDialogDeschis(false)} title="Atribuie KPI">
        <div className="space-y-3.5">
          <div>
            <Label>KPI</Label>
            <Select value={form.kpiDefinitieId} onChange={(e) => setForm({ ...form, kpiDefinitieId: e.target.value })}>
              <option value="">— alege —</option>
              {definitiiDisponibile.map((d) => <option key={d.id} value={d.id}>{d.nume}</option>)}
            </Select>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label>Pondere (%, opțional)</Label>
              <Input type="number" min={0} max={100} value={form.pondere ?? ""} onChange={(e) => setForm({ ...form, pondere: e.target.value === "" ? null : Number(e.target.value) })} />
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 text-[13px] text-[var(--ci-text)]">
                <input type="checkbox" checked={form.proRata} onChange={(e) => setForm({ ...form, proRata: e.target.checked })} />
                Pro-rata (ajustat la normă/zile lucrate)
              </label>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <Label>Target minim</Label>
              <Input type="number" value={form.targetMinim ?? ""} onChange={(e) => setForm({ ...form, targetMinim: e.target.value === "" ? null : Number(e.target.value) })} />
            </div>
            <div>
              <Label>Target normal</Label>
              <Input type="number" value={form.targetNormal ?? ""} onChange={(e) => setForm({ ...form, targetNormal: e.target.value === "" ? null : Number(e.target.value) })} />
            </div>
            <div>
              <Label>Target stretch</Label>
              <Input type="number" value={form.targetStretch ?? ""} onChange={(e) => setForm({ ...form, targetStretch: e.target.value === "" ? null : Number(e.target.value) })} />
            </div>
          </div>
          <Button onClick={onAtribuie} disabled={pending || !form.kpiDefinitieId}>Atribuie</Button>
        </div>
      </Dialog>

      <Dialog open={istoricDeschis !== null} onClose={() => setIstoricDeschis(null)} title={`Istoric — ${istoricDeschis?.nume ?? ""}`}>
        {istoric.length === 0 ? (
          <p className="text-[13px] text-[var(--ci-text-muted)]">Nicio modificare manuală înregistrată încă.</p>
        ) : (
          <div className="space-y-2">
            {istoric.map((h, i) => (
              <div key={i} className="rounded-lg border border-[var(--ci-border)] px-3 py-2 text-[13px]">
                <p className="text-[var(--ci-text)]">
                  {h.valoareVeche ?? "—"} → <span className="font-semibold">{h.valoareNoua}</span>
                </p>
                {h.comentariu && <p className="mt-0.5 text-[12px] text-[var(--ci-text-muted)]">{h.comentariu}</p>}
                <p className="mt-0.5 text-[11px] text-[var(--ci-text-faint)]">{new Date(h.la).toLocaleString("ro-RO")}</p>
              </div>
            ))}
          </div>
        )}
      </Dialog>
    </div>
  );
}

function ManualEntry({
  orgSlug,
  angajatId,
  kpiDefinitieId,
  unitate,
  valoare,
  onSalvat,
}: {
  orgSlug: string;
  angajatId: string;
  kpiDefinitieId: string;
  unitate: string | null;
  valoare: ValoarePerioada;
  onSalvat: () => void;
}) {
  const [val, setVal] = useState(valoare.valoare != null ? String(valoare.valoare) : "");
  const [comentariu, setComentariu] = useState(valoare.comentariu ?? "");
  const [pending, start] = useTransition();
  const [eroare, setEroare] = useState<string | null>(null);

  const onSalveaza = () => {
    const nr = Number(val);
    if (Number.isNaN(nr)) {
      setEroare("Introdu un număr valid.");
      return;
    }
    setEroare(null);
    start(async () => {
      try {
        await inregistreazaValoareManualaAction(orgSlug, angajatId, kpiDefinitieId, nr, comentariu || null, null);
        onSalvat();
      } catch (e) {
        setEroare(e instanceof Error ? e.message : "Eroare.");
      }
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Label>Valoare perioada curentă{unitate ? ` (${unitate})` : ""}</Label>
          <Input type="number" value={val} onChange={(e) => setVal(e.target.value)} />
        </div>
        <Button size="sm" onClick={onSalveaza} disabled={pending}>
          <Save className="h-3.5 w-3.5" /> Salvează
        </Button>
      </div>
      <Textarea placeholder="Comentariu (opțional)" value={comentariu} onChange={(e) => setComentariu(e.target.value)} rows={1} />
      {eroare && <p className="text-[12px] text-[var(--ci-red)]">{eroare}</p>}
    </div>
  );
}
