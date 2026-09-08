"use client";

import { useState } from "react";

import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardHeader } from "../components/ui/card";
import { EmptyState } from "../components/ui/states";
import { aprobaContinutAction, genereazaContinutAction, stergeContinutAction } from "./continut-actions";

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
  const [pending, setPending] = useState(false);

  async function genereaza() {
    setPending(true);
    await genereazaContinutAction(orgSlug, pageId);
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
        <CardHeader title="Materiale pe canal" subtitle="Generate din șablon — aprobă-le înainte ca beneficiarul să le vadă" />
        <Button variant="secondary" onClick={genereaza} disabled={pending}>
          {items.length ? "Regenerează" : "Generează materialele"}
        </Button>
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
              <div className="mt-2 flex gap-2">
                {it.status === "draft" && (
                  <button onClick={() => aproba(it.id)} className="text-[12px] font-medium text-[var(--ci-primary)] hover:underline">
                    Aprobă
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
