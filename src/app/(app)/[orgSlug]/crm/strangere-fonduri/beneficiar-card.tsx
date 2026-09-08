"use client";

import { useActionState, useState } from "react";

import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardHeader } from "../components/ui/card";
import { dezactiveazaBeneficiarAction, invitaBeneficiarAction, type InvitaBeneficiarState } from "./beneficiar-actions";

type BeneficiarActiv = { id: string; email: string; createdAt: string };
type InviteActiv = { id: string; email: string; token: string; expiresAt: string };

export function BeneficiarCard({
  orgSlug,
  pageId,
  beneficiar,
  invite,
}: {
  orgSlug: string;
  pageId: string;
  beneficiar: BeneficiarActiv | null;
  invite: InviteActiv | null;
}) {
  if (beneficiar) return <BeneficiarActivView orgSlug={orgSlug} beneficiar={beneficiar} />;
  if (invite) return <InviteInAsteptareView invite={invite} />;
  return <InvitaBeneficiarForm orgSlug={orgSlug} pageId={pageId} />;
}

function BeneficiarActivView({ orgSlug, beneficiar }: { orgSlug: string; beneficiar: BeneficiarActiv }) {
  const [pending, setPending] = useState(false);

  async function dezactiveaza() {
    if (!window.confirm(`Dezactivezi contul de beneficiar (${beneficiar.email})? Poți invita din nou mai târziu.`)) return;
    setPending(true);
    await dezactiveazaBeneficiarAction(orgSlug, beneficiar.id);
    window.location.reload();
  }

  return (
    <Card>
      <CardHeader title="Beneficiar" subtitle="Contul dedicat campaniei" />
      <div className="flex items-center justify-between rounded-lg border border-[var(--ci-border)] px-3.5 py-2.5">
        <div>
          <p className="text-[13px] font-medium text-[var(--ci-text)]">{beneficiar.email}</p>
          <p className="text-[12px] text-[var(--ci-text-muted)]">Cont activ</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone="green" icon={false}>
            Activ
          </Badge>
          <Button variant="secondary" onClick={dezactiveaza} disabled={pending}>
            Dezactivează
          </Button>
        </div>
      </div>
    </Card>
  );
}

function InviteInAsteptareView({ invite }: { invite: InviteActiv }) {
  const [copiat, setCopiat] = useState(false);
  const url = typeof window !== "undefined" ? `${window.location.origin}/invite-beneficiar/${invite.token}` : "";

  async function copiaza() {
    await navigator.clipboard.writeText(url);
    setCopiat(true);
    setTimeout(() => setCopiat(false), 2000);
  }

  return (
    <Card>
      <CardHeader title="Beneficiar" subtitle="Invitație trimisă, în așteptare" />
      <div className="rounded-lg border border-[var(--ci-border)] px-3.5 py-2.5">
        <p className="text-[13px] font-medium text-[var(--ci-text)]">{invite.email}</p>
        <p className="mt-1 text-[12px] text-[var(--ci-text-muted)]">
          Expiră la {new Date(invite.expiresAt).toLocaleDateString("ro-RO")}
        </p>
        <div className="mt-2 flex items-center gap-2">
          <input readOnly value={url} className="min-w-0 flex-1 truncate rounded border border-[var(--ci-border)] bg-[var(--ci-surface-2)] px-2 py-1 text-[12px] text-[var(--ci-text-muted)]" />
          <Button variant="secondary" onClick={copiaza}>
            {copiat ? "Copiat!" : "Copiază link"}
          </Button>
        </div>
      </div>
    </Card>
  );
}

const INITIAL: InvitaBeneficiarState = { error: null, token: null };

function InvitaBeneficiarForm({ orgSlug, pageId }: { orgSlug: string; pageId: string }) {
  const [state, formAction, pending] = useActionState(invitaBeneficiarAction.bind(null, orgSlug, pageId), INITIAL);
  const [copiat, setCopiat] = useState(false);
  const url = state.token && typeof window !== "undefined" ? `${window.location.origin}/invite-beneficiar/${state.token}` : null;

  async function copiaza() {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopiat(true);
    setTimeout(() => setCopiat(false), 2000);
  }

  return (
    <Card>
      <CardHeader title="Beneficiar" subtitle="Invită beneficiarul (sau reprezentantul familiei) în panoul lui dedicat" />
      {url ? (
        <div className="rounded-lg border border-[var(--ci-border)] bg-[var(--ci-green-soft)] px-3.5 py-2.5">
          <p className="text-[13px] font-medium text-[var(--ci-text)]">Invitație creată — trimite-i link-ul:</p>
          <div className="mt-2 flex items-center gap-2">
            <input readOnly value={url} className="min-w-0 flex-1 truncate rounded border border-[var(--ci-border)] bg-[var(--ci-surface)] px-2 py-1 text-[12px] text-[var(--ci-text-muted)]" />
            <Button variant="secondary" onClick={copiaza}>
              {copiat ? "Copiat!" : "Copiază link"}
            </Button>
          </div>
        </div>
      ) : (
        <form action={formAction} className="flex items-end gap-2">
          <label className="flex-1 text-[13px] font-medium text-[var(--ci-text)]">
            Email beneficiar
            <input
              type="email"
              name="email"
              required
              className="mt-1 w-full rounded-lg border border-[var(--ci-border)] bg-[var(--ci-surface)] px-3 py-2 text-sm"
              placeholder="familia@example.com"
            />
          </label>
          <Button type="submit" disabled={pending}>
            {pending ? "Se trimite..." : "Invită"}
          </Button>
        </form>
      )}
      {state.error && <p className="mt-2 text-[13px] text-red-600">{state.error}</p>}
    </Card>
  );
}
