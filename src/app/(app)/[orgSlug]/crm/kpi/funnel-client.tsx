"use client";

import { ArrowDown, ArrowUp, GitBranch, Plus, Trash2, X } from "lucide-react";
import { useState, useTransition } from "react";

import { Breadcrumb } from "../components/ui/breadcrumb";
import { Button } from "../components/ui/button";
import { Card, CardHeader } from "../components/ui/card";
import { Dialog } from "../components/ui/dialog";
import { Input, Label } from "../components/ui/input";
import { EmptyState } from "../components/ui/states";
import {
  adaugaEtapaAction,
  creeazaFunnelAction,
  listeazaFunnelsAction,
  reordoneazaEtapaAction,
  stergeEtapaAction,
  stergeFunnelAction,
  type FunnelRand,
} from "./funnel-actions";

const CULORI = ["#6366f1", "#06b6d4", "#22c55e", "#f59e0b", "#ef4444", "#a855f7"];

export function FunnelClient({ orgSlug, initialFunnels, esteAdmin }: { orgSlug: string; initialFunnels: FunnelRand[]; esteAdmin: boolean }) {
  const [funnels, setFunnels] = useState(initialFunnels);
  const [dialogDeschis, setDialogDeschis] = useState(false);
  const [numeNou, setNumeNou] = useState("");
  const [aplicaPeNou, setAplicaPeNou] = useState("");
  const [etapaNoua, setEtapaNoua] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();

  const reincarca = async () => setFunnels(await listeazaFunnelsAction(orgSlug));

  const onCreeaza = () => {
    if (!numeNou.trim()) return;
    start(async () => {
      await creeazaFunnelAction(orgSlug, numeNou, aplicaPeNou.trim() || null);
      setDialogDeschis(false);
      setNumeNou("");
      setAplicaPeNou("");
      await reincarca();
    });
  };

  const onStergeFunnel = (id: string) => {
    if (!window.confirm("Ștergi acest funnel și toate etapele lui?")) return;
    start(async () => {
      await stergeFunnelAction(orgSlug, id);
      await reincarca();
    });
  };

  const onAdaugaEtapa = (funnelId: string) => {
    const nume = etapaNoua[funnelId]?.trim();
    if (!nume) return;
    const culoare = CULORI[(funnels.find((f) => f.id === funnelId)?.etape.length ?? 0) % CULORI.length];
    start(async () => {
      await adaugaEtapaAction(orgSlug, funnelId, nume, culoare);
      setEtapaNoua((prev) => ({ ...prev, [funnelId]: "" }));
      await reincarca();
    });
  };

  const onStergeEtapa = (id: string) => {
    start(async () => {
      await stergeEtapaAction(orgSlug, id);
      await reincarca();
    });
  };

  const onMuta = (funnelId: string, id: string, directie: "sus" | "jos") => {
    start(async () => {
      await reordoneazaEtapaAction(orgSlug, funnelId, id, directie);
      await reincarca();
    });
  };

  return (
    <div className="mx-auto max-w-[900px] space-y-5">
      <Breadcrumb items={[{ label: "Instrumente", href: `/${orgSlug}/crm/instrumente` }, { label: "KPI Library", href: `/${orgSlug}/crm/kpi` }, { label: "Funnel-uri" }]} />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">Funnel-uri</h1>
          <p className="mt-0.5 text-[13px] text-[var(--ci-text-muted)]">Definește etapele propriului tău flux (ex. Lead → Contactat → Întâlnire → Sponsorizare) — doar configurare, fără date live conectate încă.</p>
        </div>
        {esteAdmin && <Button onClick={() => setDialogDeschis(true)}><Plus className="h-3.5 w-3.5" /> Funnel nou</Button>}
      </div>

      {funnels.length === 0 ? (
        <EmptyState icon={GitBranch} title="Niciun funnel definit încă" description="Creează primul funnel și adaugă-i etapele, în ordinea firească a procesului." />
      ) : (
        <div className="space-y-3">
          {funnels.map((f) => (
            <Card key={f.id}>
              <CardHeader title={f.nume} subtitle={f.aplicaPe ?? undefined} action={esteAdmin && <Button variant="ghost" size="icon" title="Șterge funnel" onClick={() => onStergeFunnel(f.id)} disabled={pending}><Trash2 className="h-3.5 w-3.5" /></Button>} />
              <div className="space-y-1.5">
                {f.etape.map((e, i) => (
                  <div key={e.id} className="flex items-center gap-2 rounded-lg border border-[var(--ci-border)] px-3 py-2">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: e.culoare ?? "var(--ci-primary)" }} />
                    <p className="flex-1 text-[13px] text-[var(--ci-text)]">{e.nume}</p>
                    {esteAdmin && (
                      <div className="flex items-center gap-0.5">
                        <Button variant="ghost" size="icon" title="Mută sus" onClick={() => onMuta(f.id, e.id, "sus")} disabled={pending || i === 0}><ArrowUp className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" title="Mută jos" onClick={() => onMuta(f.id, e.id, "jos")} disabled={pending || i === f.etape.length - 1}><ArrowDown className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" title="Șterge etapa" onClick={() => onStergeEtapa(e.id)} disabled={pending}><X className="h-3.5 w-3.5" /></Button>
                      </div>
                    )}
                  </div>
                ))}
                {esteAdmin && (
                  <div className="flex items-center gap-2 pt-1">
                    <Input placeholder="Etapă nouă..." value={etapaNoua[f.id] ?? ""} onChange={(e) => setEtapaNoua((prev) => ({ ...prev, [f.id]: e.target.value }))} className="flex-1" />
                    <Button variant="secondary" size="sm" onClick={() => onAdaugaEtapa(f.id)} disabled={pending || !etapaNoua[f.id]?.trim()}>Adaugă etapă</Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogDeschis} onClose={() => setDialogDeschis(false)} title="Funnel nou">
        <div className="space-y-3.5">
          <div>
            <Label>Nume</Label>
            <Input value={numeNou} onChange={(e) => setNumeNou(e.target.value)} placeholder="ex. Pipeline corporate" />
          </div>
          <div>
            <Label>Se aplică pe (opțional, descriptiv)</Label>
            <Input value={aplicaPeNou} onChange={(e) => setAplicaPeNou(e.target.value)} placeholder="ex. companii, voluntari, cazuri" />
          </div>
          <Button onClick={onCreeaza} disabled={pending || !numeNou.trim()}>Creează funnel-ul</Button>
        </div>
      </Dialog>
    </div>
  );
}
