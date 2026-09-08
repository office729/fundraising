"use client";

import { useState } from "react";

import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardHeader } from "../components/ui/card";
import { EmptyState } from "../components/ui/states";
import { actualizeazaStatusCalendarAction, genereazaCalendarAction, stergeCalendarItemAction } from "./continut-actions";

export type CalendarItemRow = { id: string; ziua: string; obiectiv: string; textPregatit: string; status: "de_facut" | "in_lucru" | "publicat" | "finalizat" };

const STATUS_LABEL: Record<CalendarItemRow["status"], string> = {
  de_facut: "De făcut",
  in_lucru: "În lucru",
  publicat: "Publicat",
  finalizat: "Finalizat",
};
const STATUS_TONE: Record<CalendarItemRow["status"], "amber" | "blue" | "green" | "neutral"> = {
  de_facut: "amber",
  in_lucru: "blue",
  publicat: "green",
  finalizat: "neutral",
};

export function CalendarCard({ orgSlug, pageId, items }: { orgSlug: string; pageId: string; items: CalendarItemRow[] }) {
  const [pending, setPending] = useState(false);

  async function genereaza() {
    setPending(true);
    await genereazaCalendarAction(orgSlug, pageId);
    window.location.reload();
  }

  async function schimbaStatus(itemId: string, status: CalendarItemRow["status"]) {
    await actualizeazaStatusCalendarAction(orgSlug, itemId, status);
    window.location.reload();
  }

  async function sterge(itemId: string) {
    if (!window.confirm("Ștergi această zi din calendar?")) return;
    await stergeCalendarItemAction(orgSlug, itemId);
    window.location.reload();
  }

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <CardHeader title="Calendar campanie" subtitle="7 zile de promovare, text pregătit din șablon" />
        <Button variant="secondary" onClick={genereaza} disabled={pending}>
          {items.length ? "Regenerează" : "Generează calendarul"}
        </Button>
      </div>
      {items.length ? (
        <div className="flex flex-col gap-2">
          {items.map((it) => (
            <div key={it.id} className="rounded-lg border border-[var(--ci-border)] px-3.5 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[12px] font-semibold text-[var(--ci-text)]">
                  {new Date(it.ziua).toLocaleDateString("ro-RO", { day: "numeric", month: "short" })} · {it.obiectiv}
                </span>
                <div className="flex items-center gap-1.5">
                  <select
                    value={it.status}
                    onChange={(e) => schimbaStatus(it.id, e.target.value as CalendarItemRow["status"])}
                    className="rounded border border-[var(--ci-border)] bg-[var(--ci-surface)] px-1.5 py-0.5 text-[11px]"
                  >
                    {Object.entries(STATUS_LABEL).map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                  <Badge tone={STATUS_TONE[it.status]} icon={false}>
                    {STATUS_LABEL[it.status]}
                  </Badge>
                  <button onClick={() => sterge(it.id)} className="text-[11px] text-red-600 hover:underline">
                    Șterge
                  </button>
                </div>
              </div>
              <p className="mt-1.5 whitespace-pre-wrap text-[12.5px] text-[var(--ci-text-muted)]">{it.textPregatit}</p>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title="Niciun calendar generat" description="Generează un calendar de 7 zile din datele curente ale campaniei." />
      )}
    </Card>
  );
}
