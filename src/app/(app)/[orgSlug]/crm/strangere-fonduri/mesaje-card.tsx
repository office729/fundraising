"use client";

import { useActionState, useEffect } from "react";

import { Button } from "../components/ui/button";
import { Card, CardHeader } from "../components/ui/card";
import { EmptyState } from "../components/ui/states";
import { trimiteMesajStaffAction, type TrimiteMesajState } from "./agent-actions";

export type MesajRow = { id: string; continut: string; createdAt: string; senderNume: string | null; senderEmail: string };

const INITIAL: TrimiteMesajState = { error: null, ok: false };

export function MesajeCard({ orgSlug, pageId, mesaje }: { orgSlug: string; pageId: string; mesaje: MesajRow[] }) {
  const [state, formAction, pending] = useActionState(trimiteMesajStaffAction.bind(null, orgSlug, pageId), INITIAL);

  useEffect(() => {
    if (state.ok) window.location.reload();
  }, [state.ok]);

  return (
    <Card>
      <CardHeader title="Mesaje cu beneficiarul" subtitle="Fir de mesaje vizibil beneficiarului și echipei" />
      {mesaje.length ? (
        <div className="mb-3 flex max-h-72 flex-col gap-2 overflow-y-auto">
          {[...mesaje].reverse().map((m) => (
            <div key={m.id} className="rounded-lg border border-[var(--ci-border)] px-3.5 py-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-semibold text-[var(--ci-text)]">{m.senderNume || m.senderEmail}</span>
                <span className="text-[11px] text-[var(--ci-text-faint)]">{new Date(m.createdAt).toLocaleString("ro-RO")}</span>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-[13px] text-[var(--ci-text)]">{m.continut}</p>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title="Niciun mesaj încă" description="Scrie primul mesaj către beneficiar mai jos." />
      )}
      <form action={formAction} className="mt-2 flex items-end gap-2">
        <textarea
          name="continut"
          required
          rows={2}
          className="flex-1 rounded-lg border border-[var(--ci-border)] bg-[var(--ci-surface)] px-3 py-2 text-sm"
          placeholder="Scrie un mesaj..."
        />
        <Button type="submit" disabled={pending}>
          {pending ? "Se trimite..." : "Trimite"}
        </Button>
      </form>
      {state.error && <p className="mt-2 text-[13px] text-red-600">{state.error}</p>}
    </Card>
  );
}
