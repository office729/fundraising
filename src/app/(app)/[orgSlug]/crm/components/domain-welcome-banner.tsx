"use client";

import type { ReactNode } from "react";

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
      </div>
    );
  }

  if (tpl.familie === "natural-ancorat") {
    return (
      <div className="flex items-center gap-3.5">
        <div className="h-12 w-12 shrink-0 rounded-[var(--ci-radius-btn)] bg-[var(--ci-primary-soft)]" />
        <div>
          {titlu}
          {sub}
        </div>
      </div>
    );
  }

  if (tpl.familie === "indraznet-dinamic") {
    return (
      // [--ci-text:#fff]: fundal solid închis — subtitle-ul vine din dicționar
      // (dashboard-home.tsx) cu <strong> colorat cu text-[var(--ci-text)],
      // gândit pentru fundaluri deschise (navy închis pe alb). Suprascriem
      // AICI variabila, nu în dicționar — restul familiilor (fundal deschis)
      // au nevoie de --ci-text neschimbat (navy), doar aici fundalul e închis.
      <div className="relative overflow-hidden rounded-[var(--ci-radius-card)] bg-[var(--ci-primary)] px-6 py-5 [--ci-text:#fff]">
        <div
          aria-hidden="true"
          className="absolute inset-y-0 right-0 w-24 bg-white/10"
          style={{ clipPath: "polygon(40% 0, 100% 0, 100% 100%, 0 100%)" }}
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
    <div className="border-l-[3px] border-[var(--ci-primary)] py-1 pl-5">
      {titlu}
      {sub}
    </div>
  );
}
