"use client";

import { useActionState, useEffect, useRef } from "react";

import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardHeader } from "../components/ui/card";
import { EmptyState } from "../components/ui/states";
import { adaugaLocalGroupAction, stergeLocalGroupAction, actualizeazaStatusGrupAction, type FormState } from "./actions";

export type LocalGroupRow = {
  id: string;
  judet: string;
  localitate: string | null;
  platforma: "facebook" | "whatsapp" | "altul";
  nume: string;
  link: string;
  categorie: string | null;
  status: "activ" | "inactiv";
};

const PLATFORMA_LABEL: Record<LocalGroupRow["platforma"], string> = {
  facebook: "Facebook",
  whatsapp: "WhatsApp",
  altul: "Altul",
};

const INITIAL: FormState = { error: null };

export function LocalGroupsCard({ orgSlug, grupuri }: { orgSlug: string; grupuri: LocalGroupRow[] }) {
  const [state, formAction, pending] = useActionState(adaugaLocalGroupAction.bind(null, orgSlug), INITIAL);
  const submitted = useRef(false);
  useEffect(() => {
    if (submitted.current && !pending && !state.error) window.location.reload();
    if (pending) submitted.current = true;
  }, [pending, state]);

  async function sterge(id: string) {
    if (!window.confirm("Ștergi acest grup local?")) return;
    await stergeLocalGroupAction(orgSlug, id);
    window.location.reload();
  }

  async function comutaStatus(id: string, status: LocalGroupRow["status"]) {
    await actualizeazaStatusGrupAction(orgSlug, id, status === "activ" ? "inactiv" : "activ");
    window.location.reload();
  }

  return (
    <Card>
      <CardHeader title="Grupuri locale" subtitle="Facebook / WhatsApp — bază globală de organizație, filtrată pe județ pentru fiecare campanie" />
      <form action={formAction} className="grid grid-cols-2 gap-2 rounded-lg border border-[var(--ci-border)] p-3 sm:grid-cols-3">
        <input name="judet" required placeholder="Județ (ex. Cluj)" className="rounded-lg border border-[var(--ci-border)] bg-[var(--ci-surface)] px-3 py-2 text-sm" />
        <input name="localitate" placeholder="Localitate (opțional)" className="rounded-lg border border-[var(--ci-border)] bg-[var(--ci-surface)] px-3 py-2 text-sm" />
        <select name="platforma" defaultValue="facebook" className="rounded-lg border border-[var(--ci-border)] bg-[var(--ci-surface)] px-3 py-2 text-sm">
          {Object.entries(PLATFORMA_LABEL).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <input name="nume" required placeholder="Nume grup" className="rounded-lg border border-[var(--ci-border)] bg-[var(--ci-surface)] px-3 py-2 text-sm" />
        <input name="link" required placeholder="Link grup" className="rounded-lg border border-[var(--ci-border)] bg-[var(--ci-surface)] px-3 py-2 text-sm" />
        <input name="categorie" placeholder="Categorie (opțional)" className="rounded-lg border border-[var(--ci-border)] bg-[var(--ci-surface)] px-3 py-2 text-sm" />
        <Button type="submit" disabled={pending} className="justify-self-start">
          {pending ? "Se adaugă..." : "Adaugă grup"}
        </Button>
      </form>
      {state.error && <p className="mt-2 text-[13px] text-red-600">{state.error}</p>}

      <div className="mt-4">
        {grupuri.length ? (
          <div className="flex flex-col gap-2">
            {grupuri.map((g) => (
              <div key={g.id} className="flex items-center justify-between gap-2 rounded-lg border border-[var(--ci-border)] px-3.5 py-2.5">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <a href={g.link} target="_blank" rel="noreferrer" className="truncate text-[13px] font-medium text-[var(--ci-text)] hover:underline">
                      {g.nume}
                    </a>
                    <Badge tone="neutral" icon={false}>
                      {PLATFORMA_LABEL[g.platforma]}
                    </Badge>
                  </div>
                  <p className="truncate text-[12px] text-[var(--ci-text-muted)]">
                    {g.judet}
                    {g.localitate ? `, ${g.localitate}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge tone={g.status === "activ" ? "green" : "neutral"} icon={false}>
                    {g.status === "activ" ? "Activ" : "Inactiv"}
                  </Badge>
                  <button onClick={() => comutaStatus(g.id, g.status)} className="text-[12px] font-medium text-[var(--ci-primary)] hover:underline">
                    {g.status === "activ" ? "Dezactivează" : "Activează"}
                  </button>
                  <button onClick={() => sterge(g.id)} className="text-[12px] text-red-600 hover:underline">
                    Șterge
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="Niciun grup local" description="Adaugă grupuri Facebook sau WhatsApp relevante pe județ, pentru distribuirea campaniilor." />
        )}
      </div>
    </Card>
  );
}
