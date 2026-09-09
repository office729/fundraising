"use client";

import { useState } from "react";

import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardHeader } from "../components/ui/card";
import { EmptyState } from "../components/ui/states";
import {
  aprobaContinutAction,
  genereazaContinutAction,
  genereazaContinutAIAction,
  regenereazaVariantaContinutAction,
  stergeContinutAction,
} from "./continut-actions";

export type ContinutRow = {
  id: string;
  canal: string;
  titlu: string | null;
  textComplet: string;
  status: "draft" | "aprobat" | "publicat";
};

const CANAL_LABEL: Record<string, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
  whatsapp: "WhatsApp",
  grup_local: "Grup local",
  comunicat: "Comunicat presă",
};

export function ContinutCard({ orgSlug, pageId, items }: { orgSlug: string; pageId: string; items: ContinutRow[] }) {
  const [pending, setPending] = useState<null | "sablon" | "ai">(null);
  const [variantaPending, setVariantaPending] = useState<string | null>(null);

  async function genereaza() {
    setPending("sablon");
    await genereazaContinutAction(orgSlug, pageId);
    window.location.reload();
  }

  async function genereazaAI() {
    setPending("ai");
    const res = await genereazaContinutAIAction(orgSlug, pageId);
    if (res?.error) {
      setPending(null);
      window.alert(res.error);
      return;
    }
    window.location.reload();
  }

  async function altaVarianta(id: string) {
    setVariantaPending(id);
    const res = await regenereazaVariantaContinutAction(orgSlug, id);
    if (res?.error) {
      setVariantaPending(null);
      window.alert(res.error);
      return;
    }
    window.location.reload();
  }

  async function aproba(id: string) {
    await aprobaContinutAction(orgSlug, id);
    window.location.reload();
  }

  async function sterge(id: string) {
    if (!window.confirm("Ștergi acest material?")) return;
    await stergeContinutAction(orgSlug, id);
    window.location.reload();
  }

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <CardHeader title="Materiale pe canal" subtitle="Generează cu AI sau din șablon — aprobă-le înainte ca beneficiarul să le vadă" />
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={genereaza} disabled={pending !== null}>
            {pending === "sablon" ? "Se generează…" : items.length ? "Regenerează (șablon)" : "Șablon"}
          </Button>
          <Button onClick={genereazaAI} disabled={pending !== null}>
            {pending === "ai" ? "Se generează…" : "✨ Generează cu AI"}
          </Button>
        </div>
      </div>
      {items.length ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {items.map((it) => (
            <div key={it.id} className="rounded-lg border border-[var(--ci-border)] px-3.5 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[12px] font-semibold text-[var(--ci-text)]">{CANAL_LABEL[it.canal] ?? it.canal}</span>
                <Badge tone={it.status === "aprobat" ? "green" : it.status === "publicat" ? "blue" : "amber"} icon={false}>
                  {it.status === "draft" ? "Draft" : it.status === "aprobat" ? "Aprobat" : "Publicat"}
                </Badge>
              </div>
              <p className="mt-1.5 line-clamp-4 whitespace-pre-wrap text-[12.5px] text-[var(--ci-text-muted)]">{it.textComplet}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {it.status === "draft" && (
                  <button onClick={() => aproba(it.id)} className="text-[12px] font-medium text-[var(--ci-primary)] hover:underline">
                    Aprobă
                  </button>
                )}
                {it.status === "draft" && (
                  <button
                    onClick={() => altaVarianta(it.id)}
                    disabled={variantaPending === it.id}
                    className="text-[12px] font-medium text-[var(--ci-text-muted)] hover:underline disabled:opacity-50"
                  >
                    {variantaPending === it.id ? "Se regenerează…" : "✨ Altă variantă"}
                  </button>
                )}
                <button onClick={() => sterge(it.id)} className="text-[12px] text-red-600 hover:underline">
                  Șterge
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title="Niciun material generat" description="Generează materiale pentru Facebook, Instagram, TikTok, WhatsApp, grupuri și presă." />
      )}
    </Card>
  );
}
