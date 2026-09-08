"use client";

import { useActionState, useEffect, useState } from "react";

import { Button } from "../components/ui/button";
import { Card, CardHeader } from "../components/ui/card";
import { atribuieAgentAction, elibereazaAgentAction, type AtribuieAgentState } from "./agent-actions";

export type MembruEchipa = { userId: string; email: string; name: string | null };
export type AgentActiv = {
  id: string;
  agentUserId: string;
  nume: string | null;
  email: string;
  bio: string | null;
  programDisponibilitate: string | null;
  contactAprobat: string | null;
};

const INITIAL: AtribuieAgentState = { error: null, ok: false };

export function AgentCard({
  orgSlug,
  pageId,
  agent,
  membri,
}: {
  orgSlug: string;
  pageId: string;
  agent: AgentActiv | null;
  membri: MembruEchipa[];
}) {
  const [schimba, setSchimba] = useState(false);
  const [state, formAction, pending] = useActionState(atribuieAgentAction.bind(null, orgSlug, pageId), INITIAL);

  useEffect(() => {
    if (state.ok) window.location.reload();
  }, [state.ok]);

  async function elibereaza() {
    if (!agent) return;
    if (!window.confirm("Eliberezi campania de agentul curent?")) return;
    await elibereazaAgentAction(orgSlug, agent.id);
    window.location.reload();
  }

  if (agent && !schimba) {
    return (
      <Card>
        <CardHeader title="Agent dedicat" subtitle="Colegul care coordonează campania cu beneficiarul" />
        <div className="rounded-lg border border-[var(--ci-border)] px-3.5 py-2.5">
          <p className="text-[13px] font-medium text-[var(--ci-text)]">{agent.nume || agent.email}</p>
          <p className="text-[12px] text-[var(--ci-text-muted)]">{agent.email}</p>
          {agent.bio && <p className="mt-1.5 text-[12.5px] text-[var(--ci-text-muted)]">{agent.bio}</p>}
          {agent.programDisponibilitate && (
            <p className="mt-1 text-[12px] text-[var(--ci-text-muted)]">Disponibilitate: {agent.programDisponibilitate}</p>
          )}
          <div className="mt-2 flex gap-2">
            <Button variant="secondary" onClick={() => setSchimba(true)}>
              Schimbă agentul
            </Button>
            <Button variant="secondary" onClick={elibereaza}>
              Eliberează
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader title="Agent dedicat" subtitle={agent ? "Alege noul agent" : "Atribuie un coleg din echipă"} />
      <form action={formAction} className="flex flex-col gap-2.5">
        <label className="text-[13px] font-medium text-[var(--ci-text)]">
          Coleg
          <select
            name="agentUserId"
            required
            defaultValue=""
            className="mt-1 w-full rounded-lg border border-[var(--ci-border)] bg-[var(--ci-surface)] px-3 py-2 text-sm"
          >
            <option value="" disabled>
              Alege...
            </option>
            {membri.map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.name || m.email}
              </option>
            ))}
          </select>
        </label>
        <label className="text-[13px] font-medium text-[var(--ci-text)]">
          Prezentare scurtă (opțional)
          <input name="bio" className="mt-1 w-full rounded-lg border border-[var(--ci-border)] bg-[var(--ci-surface)] px-3 py-2 text-sm" />
        </label>
        <label className="text-[13px] font-medium text-[var(--ci-text)]">
          Program de disponibilitate (opțional)
          <input
            name="programDisponibilitate"
            className="mt-1 w-full rounded-lg border border-[var(--ci-border)] bg-[var(--ci-surface)] px-3 py-2 text-sm"
            placeholder="ex. Luni-Vineri, 9:00-17:00"
          />
        </label>
        <label className="text-[13px] font-medium text-[var(--ci-text)]">
          Contact aprobat (opțional)
          <input name="contactAprobat" className="mt-1 w-full rounded-lg border border-[var(--ci-border)] bg-[var(--ci-surface)] px-3 py-2 text-sm" />
        </label>
        <div className="flex gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Se salvează..." : "Atribuie"}
          </Button>
          {agent && (
            <Button type="button" variant="secondary" onClick={() => setSchimba(false)}>
              Anulează
            </Button>
          )}
        </div>
      </form>
      {state.error && <p className="mt-2 text-[13px] text-red-600">{state.error}</p>}
    </Card>
  );
}
