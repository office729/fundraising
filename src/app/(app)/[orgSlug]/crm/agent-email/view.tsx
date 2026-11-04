"use client";

import Link from "next/link";
import { useState } from "react";

import type { DatePaginaAgent } from "@/lib/agent-email/tipuri";
import { AGENT_EMAIL_UI_DICT } from "@/lib/i18n/dictionaries/agent-email-ui";

import { Card } from "../components/ui/card";
import { useLocale } from "../lib/locale-context";
import { AziTab } from "./azi";
import { CiorneTab } from "./ciorne";
import { Notificare, type Anunta, type Notif } from "./comun";
import { ScrieTab } from "./scrie";
import { StatisticiTab } from "./statistici";
import { TrimiseTab } from "./trimise";

type Tab = "azi" | "scrie" | "ciorne" | "trimise" | "statistici";

export function AgentEmailView({ orgSlug, date }: { orgSlug: string; date: DatePaginaAgent }) {
  const locale = useLocale();
  const d = AGENT_EMAIL_UI_DICT[locale];
  const [tab, setTab] = useState<Tab>(date.mesaje.some((m) => m.stare === "ciorna" || m.stare === "eroare") ? "ciorne" : date.mesaje.some((m) => m.stare === "trimis") ? "azi" : "scrie");
  const [notif, setNotif] = useState<Notif>(null);
  const anunta: Anunta = (tip, text) => setNotif({ tip, text });
  const nrCiorne = date.mesaje.filter((m) => m.stare === "ciorna" || m.stare === "eroare" || m.stare === "se_trimite").length;
  const nrTrimise = date.mesaje.filter((m) => m.stare === "trimis").length;
  const cont = date.contulMeu;
  const taburi: [Tab, string][] = [
    ["azi", d.taburi.azi],
    ["scrie", d.taburi.scrie],
    ["ciorne", `${d.taburi.ciorne} (${nrCiorne})`],
    ["trimise", `${d.taburi.trimise} (${nrTrimise})`],
    ["statistici", d.taburi.statistici],
  ];

  return (
    <div className="space-y-4">
      {(!date.aiConectat || !cont) && (
        <Card className="space-y-2 text-[13px] text-[var(--ci-text)]">
          {!date.aiConectat && (
            <p>
              {d.faraAi}{" "}
              <Link href={`/${orgSlug}/crm/setari#ai`} className="font-semibold underline">
                Setări → Integrări &amp; AI
              </Link>
            </p>
          )}
          {!cont && (
            <p>
              {d.faraCont}{" "}
              <Link href={`/${orgSlug}/crm/setari#cont-email`} className="font-semibold underline">
                {d.conecteazaCont}
              </Link>
            </p>
          )}
        </Card>
      )}
      {cont && (
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-[var(--ci-text-muted)]">
          <span>{d.contConectat(cont.adresa)}</span>
          <span>{d.trimiseAzi(date.trimiseAziEu, date.setari.limitaZi)}</span>
          {!cont.smtpTestatLa && (
            <Link href={`/${orgSlug}/crm/setari#cont-email`} className="font-semibold text-[var(--ci-red)] underline">
              {d.smtpNetestat}
            </Link>
          )}
          {cont.smtpTestatLa && !cont.imapTestatLa && (
            <Link href={`/${orgSlug}/crm/setari#cont-email`} className="underline">
              {d.imapNetestat}
            </Link>
          )}
        </p>
      )}

      <div role="tablist" aria-label={d.titlu} className="flex flex-wrap gap-1 border-b border-[var(--ci-border)]">
        {taburi.map(([k, text]) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={tab === k}
            onClick={() => setTab(k)}
            className={`shrink-0 border-b-2 px-3 py-2 text-[13px] font-semibold transition-colors ${tab === k ? "border-[var(--ci-primary)] text-[var(--ci-text)]" : "border-transparent text-[var(--ci-text-muted)] hover:text-[var(--ci-text)]"}`}
          >
            {text}
          </button>
        ))}
      </div>

      <Notificare n={notif} onInchide={() => setNotif(null)} />

      {tab === "azi" && <AziTab orgSlug={orgSlug} date={date} anunta={anunta} deschide={setTab} />}
      {tab === "scrie" && <ScrieTab orgSlug={orgSlug} date={date} anunta={anunta} deschide={setTab} />}
      {tab === "ciorne" && <CiorneTab orgSlug={orgSlug} date={date} anunta={anunta} />}
      {tab === "trimise" && <TrimiseTab orgSlug={orgSlug} date={date} anunta={anunta} />}
      {tab === "statistici" && <StatisticiTab orgSlug={orgSlug} date={date} anunta={anunta} />}
    </div>
  );
}
