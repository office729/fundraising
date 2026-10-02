"use client";

import { useState, useTransition } from "react";

import { ajusteazaOrgAction, type OrgRand } from "./actions";

const PACHETE = ["trial", "start", "crestere", "impact", "custom"];
const STATUSURI = ["trialing", "active", "past_due", "canceled", "incomplete"];
const TRIAL_DAYS = 14;

function zileRamaseProba(createdAt: Date): number {
  const sfarsit = new Date(createdAt.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
  return Math.max(0, Math.ceil((sfarsit.getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
}

function formatData(d: Date | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("ro-RO", { day: "2-digit", month: "short", year: "numeric" });
}

export function OrgAdminTable({ initial }: { initial: OrgRand[] }) {
  const [orgs, setOrgs] = useState(initial);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<{ package: string; subscriptionStatus: string; currentPeriodEnd: string }>({
    package: "trial",
    subscriptionStatus: "trialing",
    currentPeriodEnd: "",
  });
  const [eroare, setEroare] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const deschideEdit = (o: OrgRand) => {
    setForm({
      package: o.package,
      subscriptionStatus: o.subscriptionStatus,
      currentPeriodEnd: o.currentPeriodEnd ? new Date(o.currentPeriodEnd).toISOString().slice(0, 10) : "",
    });
    setEditId(o.id);
    setEroare(null);
  };

  const onSalveaza = (id: string) => {
    start(async () => {
      try {
        await ajusteazaOrgAction(id, { ...form, currentPeriodEnd: form.currentPeriodEnd || null });
        setOrgs((prev) =>
          prev.map((o) =>
            o.id === id
              ? { ...o, package: form.package, subscriptionStatus: form.subscriptionStatus, currentPeriodEnd: form.currentPeriodEnd ? new Date(form.currentPeriodEnd) : null }
              : o,
          ),
        );
        setEditId(null);
      } catch (e) {
        setEroare(e instanceof Error ? e.message : "Eroare.");
      }
    });
  };

  return (
    <div>
      {eroare && <p className="mb-2 text-xs text-red-600">{eroare}</p>}
      <div className="divide-y divide-line rounded-xl border border-line bg-panel">
        {orgs.map((o) => {
          const inProba = o.package === "trial";
          const zileRamase = inProba ? zileRamaseProba(o.createdAt) : null;
          return (
            <div key={o.id} className="px-4 py-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium text-ink">
                    {o.nume} <span className="font-mono text-xs text-muted-2">/{o.slug}</span>
                  </p>
                  <p className="text-xs text-muted">
                    {o.proprietarEmail ?? "fără proprietar"} · ultima autentificare: {formatData(o.proprietarUltimaAutentificare)} · creat {formatData(o.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-panel-2 px-2.5 py-0.5 text-xs font-semibold text-ink">{o.package}</span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      o.subscriptionStatus === "active"
                        ? "bg-brand-green-soft text-brand-green"
                        : o.subscriptionStatus === "past_due" || o.subscriptionStatus === "canceled"
                          ? "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200"
                          : "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200"
                    }`}
                  >
                    {o.subscriptionStatus}
                  </span>
                  {inProba && (
                    <span className={`text-xs font-medium ${zileRamase === 0 ? "text-red-600" : "text-muted"}`}>
                      {zileRamase === 0 ? "probă expirată" : `${zileRamase} zile probă`}
                    </span>
                  )}
                  <button type="button" onClick={() => deschideEdit(o)} className="rounded-lg border border-line px-2.5 py-1 text-xs font-medium text-ink hover:bg-panel-2">
                    Ajustează
                  </button>
                </div>
              </div>

              {editId === o.id && (
                <div className="mt-3 flex flex-wrap items-end gap-2.5 rounded-lg border border-line bg-panel-2 p-3">
                  <div>
                    <label className="mb-1 block text-xs text-muted">Pachet</label>
                    <select value={form.package} onChange={(e) => setForm({ ...form, package: e.target.value })} className="h-8 rounded-md border border-line bg-panel px-2 text-xs text-ink">
                      {PACHETE.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-muted">Status abonament</label>
                    <select value={form.subscriptionStatus} onChange={(e) => setForm({ ...form, subscriptionStatus: e.target.value })} className="h-8 rounded-md border border-line bg-panel px-2 text-xs text-ink">
                      {STATUSURI.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-muted">Acces plătit până la</label>
                    <input
                      type="date"
                      value={form.currentPeriodEnd}
                      onChange={(e) => setForm({ ...form, currentPeriodEnd: e.target.value })}
                      className="h-8 rounded-md border border-line bg-panel px-2 text-xs text-ink"
                    />
                  </div>
                  <button type="button" onClick={() => onSalveaza(o.id)} disabled={pending} className="h-8 rounded-md bg-brand-blue px-3 text-xs font-semibold text-white disabled:opacity-50">
                    Salvează
                  </button>
                  <button type="button" onClick={() => setEditId(null)} className="h-8 rounded-md px-2 text-xs text-muted hover:text-ink">
                    Anulează
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
