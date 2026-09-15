"use client";

import type { ReactNode } from "react";

import { DomainMotif } from "@/components/domain-motif";
import { CAMPAIGN_TEMPLATES } from "@/lib/campaign-templates";

import { useDomeniu } from "../lib/domeniu-context";

// Bannerul de bun-venit al dashboard-ului CRM — structurat diferit pe familia
// de layout a domeniului de activitate (aceleași 5 familii ca hero-ul paginii
// publice de campanie, vezi lib/campaign-templates.ts), nu doar culoarea
// textului. "Altele"/fără domeniu ales păstrează markup-ul original,
// neschimbat — zero regresie pentru organizațiile fără domeniu.
export function DomainWelcomeBanner({
  salut,
  nume,
  subtitle,
}: {
  salut: string;
  nume: string;
  subtitle: ReactNode;
}) {
  const domeniu = useDomeniu();
  const tpl = domeniu ? CAMPAIGN_TEMPLATES[domeniu] : null;

  const titlu = (
    <h1 className="ci-display text-xl font-bold text-[var(--ci-text)]">
      {salut}, {nume}.
    </h1>
  );
  const sub = <p className="mt-1 text-[13px] text-[var(--ci-text-muted)]">{subtitle}</p>;

  if (!tpl || tpl.familie === "neutru") {
    return (
      <div>
        {titlu}
        {sub}
      </div>
    );
  }

  if (tpl.familie === "cald-protector") {
    return (
      <div className="relative overflow-hidden rounded-3xl border border-[var(--ci-border)] bg-gradient-to-br from-[var(--ci-primary-soft)] to-[var(--ci-surface)] px-6 py-5">
        {titlu}
        {sub}
        <DomainMotif
          motiv={tpl.motiv}
          className="pointer-events-none absolute -right-3 -bottom-3 h-16 w-16 text-[var(--ci-primary)] opacity-15"
        />
      </div>
    );
  }

  if (tpl.familie === "natural-ancorat") {
    return (
      <div className="flex items-center gap-3.5">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--ci-primary-soft)]">
          <DomainMotif motiv={tpl.motiv} className="h-6 w-6 text-[var(--ci-primary)]" />
        </div>
        <div>
          {titlu}
          {sub}
        </div>
      </div>
    );
  }

  if (tpl.familie === "indraznet-dinamic") {
    return (
      <div className="relative overflow-hidden rounded-lg bg-[var(--ci-primary)] px-6 py-5">
        <div
          aria-hidden="true"
          className="absolute inset-y-0 right-0 w-24 bg-white/10"
          style={{ clipPath: "polygon(40% 0, 100% 0, 100% 100%, 0 100%)" }}
        />
        <DomainMotif
          motiv={tpl.motiv}
          className="pointer-events-none absolute right-4 bottom-2 h-20 w-20 text-white opacity-15"
        />
        <h1 className="ci-display relative text-xl font-bold text-white">
          {salut}, {nume}.
        </h1>
        <p className="relative mt-1 text-[13px] text-white/80">{subtitle}</p>
      </div>
    );
  }

  // elegant-editorial
  return (
    <div className="flex items-start justify-between gap-3 border-l-[3px] border-[var(--ci-primary)] py-1 pl-5">
      <div>
        {titlu}
        {sub}
      </div>
      <DomainMotif motiv={tpl.motiv} className="mt-1 h-5 w-5 shrink-0 text-[var(--ci-primary)] opacity-60" />
    </div>
  );
}
