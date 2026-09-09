"use client";

import { useState } from "react";

import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardHeader } from "../components/ui/card";
import { EmptyState } from "../components/ui/states";
import { aprobaComunicatAction, genereazaComunicatAction, genereazaComunicatAIAction, marcheazaOutreachAction } from "./presa-actions";

export type ComunicatRow = { id: string; continut: string; status: "draft" | "aprobat" } | null;
export type MediaContactRow = { id: string; numeRedactie: string; judet: string; email: string | null; telefon: string | null };

export function PresaCard({
  orgSlug,
  pageId,
  comunicat,
  contacte,
  trimisIds,
}: {
  orgSlug: string;
  pageId: string;
  comunicat: ComunicatRow;
  contacte: MediaContactRow[];
  trimisIds: string[];
}) {
  const [pending, setPending] = useState<null | "sablon" | "ai">(null);
  const [trimisLocal, setTrimisLocal] = useState<string[]>(trimisIds);

  async function genereaza() {
    setPending("sablon");
    await genereazaComunicatAction(orgSlug, pageId);
    window.location.reload();
  }

  async function genereazaAI() {
    setPending("ai");
    const res = await genereazaComunicatAIAction(orgSlug, pageId);
    if (res?.error) {
      setPending(null);
      window.alert(res.error);
      return;
    }
    window.location.reload();
  }

  async function aproba() {
    if (!comunicat) return;
    await aprobaComunicatAction(orgSlug, comunicat.id);
    window.location.reload();
  }

  async function marcheazaTrimis(mediaContactId: string) {
    if (!comunicat) return;
    await marcheazaOutreachAction(orgSlug, comunicat.id, mediaContactId);
    setTrimisLocal((prev) => [...prev, mediaContactId]);
  }

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <CardHeader title="Presă locală" subtitle="Comunicat generat cu AI sau din șablon + contacte recomandate pe județ" />
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={genereaza} disabled={pending !== null}>
            {pending === "sablon" ? "Se generează…" : comunicat ? "Regenerează (șablon)" : "Șablon"}
          </Button>
          <Button onClick={genereazaAI} disabled={pending !== null}>
            {pending === "ai" ? "Se generează…" : "✨ Generează cu AI"}
          </Button>
        </div>
      </div>

      {comunicat ? (
        <div className="rounded-lg border border-[var(--ci-border)] px-3.5 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <Badge tone={comunicat.status === "aprobat" ? "green" : "amber"} icon={false}>
              {comunicat.status === "aprobat" ? "Aprobat" : "Draft"}
            </Badge>
            {comunicat.status === "draft" && (
              <button onClick={aproba} className="text-[12px] font-medium text-[var(--ci-primary)] hover:underline">
                Aprobă
              </button>
            )}
          </div>
          <p className="mt-2 max-h-48 overflow-y-auto whitespace-pre-wrap text-[12.5px] text-[var(--ci-text-muted)]">{comunicat.continut}</p>
        </div>
      ) : (
        <EmptyState title="Niciun comunicat generat" description="Generează un comunicat de presă pornind de la datele curente ale campaniei." />
      )}

      <div className="mt-4">
        <p className="mb-2 text-[13px] font-medium text-[var(--ci-text)]">Contacte de presă recomandate ({contacte.length})</p>
        {contacte.length ? (
          <div className="flex flex-col gap-2">
            {contacte.map((c) => {
              const trimis = trimisLocal.includes(c.id);
              return (
                <div key={c.id} className="flex items-center justify-between gap-2 rounded-lg border border-[var(--ci-border)] px-3.5 py-2.5">
                  <div className="min-w-0">
                    <span className="text-[13px] font-medium text-[var(--ci-text)]">{c.numeRedactie}</span>
                    <p className="truncate text-[12px] text-[var(--ci-text-muted)]">{c.email || c.telefon || c.judet}</p>
                  </div>
                  {trimis ? (
                    <Badge tone="green" icon={false}>
                      Trimis
                    </Badge>
                  ) : (
                    <button
                      onClick={() => marcheazaTrimis(c.id)}
                      disabled={!comunicat}
                      className="shrink-0 text-[12px] font-medium text-[var(--ci-primary)] hover:underline disabled:opacity-50"
                    >
                      Marchează trimis
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-[13px] text-[var(--ci-text-muted)]">
            Nu există încă niciun contact de presă pentru județul acestei campanii — adaugă unul din{" "}
            <a href={`/${orgSlug}/crm/presa-grupuri`} className="text-[var(--ci-primary)] hover:underline">
              Presă & grupuri locale
            </a>
            .
          </p>
        )}
      </div>
    </Card>
  );
}
