"use client";

import { useActionState, useEffect, useRef } from "react";

import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardHeader } from "../components/ui/card";
import { EmptyState } from "../components/ui/states";
import { adaugaMediaContactAction, stergeMediaContactAction, type FormState } from "./actions";

export type MediaContactRow = {
  id: string;
  judet: string;
  tip: "publicatie" | "tv" | "radio" | "site";
  numeRedactie: string;
  email: string | null;
  telefon: string | null;
  website: string | null;
  persoanaContact: string | null;
};

const TIP_LABEL: Record<MediaContactRow["tip"], string> = {
  publicatie: "Publicație",
  tv: "TV",
  radio: "Radio",
  site: "Site",
};

const INITIAL: FormState = { error: null };

export function MediaContactsCard({ orgSlug, contacte }: { orgSlug: string; contacte: MediaContactRow[] }) {
  const [state, formAction, pending] = useActionState(adaugaMediaContactAction.bind(null, orgSlug), INITIAL);
  const submitted = useRef(false);
  useEffect(() => {
    if (submitted.current && !pending && !state.error) window.location.reload();
    if (pending) submitted.current = true;
  }, [pending, state]);

  async function sterge(id: string) {
    if (!window.confirm("Ștergi acest contact de presă?")) return;
    await stergeMediaContactAction(orgSlug, id);
    window.location.reload();
  }

  return (
    <Card>
      <CardHeader title="Contacte de presă locală" subtitle="Bază globală de organizație, filtrată pe județ pentru fiecare campanie" />
      <form action={formAction} className="grid grid-cols-2 gap-2 rounded-lg border border-[var(--ci-border)] p-3 sm:grid-cols-3">
        <input name="judet" required placeholder="Județ (ex. Cluj)" className="rounded-lg border border-[var(--ci-border)] bg-[var(--ci-surface)] px-3 py-2 text-sm" />
        <select name="tip" defaultValue="publicatie" className="rounded-lg border border-[var(--ci-border)] bg-[var(--ci-surface)] px-3 py-2 text-sm">
          {Object.entries(TIP_LABEL).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <input name="numeRedactie" required placeholder="Nume redacție" className="rounded-lg border border-[var(--ci-border)] bg-[var(--ci-surface)] px-3 py-2 text-sm" />
        <input name="email" type="email" placeholder="Email (opțional)" className="rounded-lg border border-[var(--ci-border)] bg-[var(--ci-surface)] px-3 py-2 text-sm" />
        <input name="telefon" placeholder="Telefon (opțional)" className="rounded-lg border border-[var(--ci-border)] bg-[var(--ci-surface)] px-3 py-2 text-sm" />
        <input name="persoanaContact" placeholder="Persoană de contact (opțional)" className="rounded-lg border border-[var(--ci-border)] bg-[var(--ci-surface)] px-3 py-2 text-sm" />
        <input name="website" placeholder="Website (opțional)" className="col-span-2 rounded-lg border border-[var(--ci-border)] bg-[var(--ci-surface)] px-3 py-2 text-sm sm:col-span-2" />
        <Button type="submit" disabled={pending} className="justify-self-start">
          {pending ? "Se adaugă..." : "Adaugă contact"}
        </Button>
      </form>
      {state.error && <p className="mt-2 text-[13px] text-red-600">{state.error}</p>}

      <div className="mt-4">
        {contacte.length ? (
          <div className="flex flex-col gap-2">
            {contacte.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-2 rounded-lg border border-[var(--ci-border)] px-3.5 py-2.5">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium text-[var(--ci-text)]">{c.numeRedactie}</span>
                    <Badge tone="neutral" icon={false}>
                      {TIP_LABEL[c.tip]}
                    </Badge>
                  </div>
                  <p className="truncate text-[12px] text-[var(--ci-text-muted)]">
                    {c.judet} {c.email ? `· ${c.email}` : ""} {c.telefon ? `· ${c.telefon}` : ""}
                  </p>
                </div>
                <button onClick={() => sterge(c.id)} className="shrink-0 text-[12px] text-red-600 hover:underline">
                  Șterge
                </button>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="Niciun contact de presă" description="Adaugă contacte de presă pe județ, pentru distribuirea comunicatelor de campanie." />
        )}
      </div>
    </Card>
  );
}
