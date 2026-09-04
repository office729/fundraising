"use client";

import { useState } from "react";

import { Badge } from "../components/ui/badge";
import { Card, CardHeader } from "../components/ui/card";
import { Tooltip } from "../components/ui/tooltip";
import { useLocale } from "../lib/locale-context";
import { SETARI_ECHIPA_DICT } from "@/lib/i18n/dictionaries/setari-echipa";

export default function CrmSetariPage() {
  const locale = useLocale();
  const dict = SETARI_ECHIPA_DICT[locale].crmSetari;
  const [coloaneD, setColoaneD] = useState(dict.coloane.donatori);
  const [coloaneC, setColoaneC] = useState(dict.coloane.companii);
  const INTEGRARI = [dict.integrariList.stripe, dict.integrariList.mailchimp, dict.integrariList.googleCalendar];

  function toggle(list: string[], setList: (v: string[]) => void, item: string) {
    setList(list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);
  }

  return (
    <div className="mx-auto max-w-[900px] space-y-5">
      <div>
        <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">{dict.title}</h1>
        <p className="mt-0.5 text-[13px] text-[var(--ci-text-muted)]">{dict.subtitle}</p>
      </div>

      <Card>
        <CardHeader title={dict.coloaneDonatori.title} subtitle={dict.coloaneDonatori.subtitle} />
        <div className="flex flex-wrap gap-2">
          {dict.coloane.donatori.map((c) => (
            <ColumnChip key={c} label={c} active={coloaneD.includes(c)} onClick={() => toggle(coloaneD, setColoaneD, c)} />
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader title={dict.coloaneCompanii.title} subtitle={dict.coloaneCompanii.subtitle} />
        <div className="flex flex-wrap gap-2">
          {dict.coloane.companii.map((c) => (
            <ColumnChip key={c} label={c} active={coloaneC.includes(c)} onClick={() => toggle(coloaneC, setColoaneC, c)} />
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader title={dict.roluri.title} subtitle={dict.roluri.subtitle} />
        <div className="space-y-2">
          <RoleRow rol={dict.ownerAdmin.rol} poate={dict.ownerAdmin.poate} />
          <RoleRow rol={dict.membru.rol} poate={dict.membru.poate} />
        </div>
      </Card>

      <Card>
        <CardHeader title={dict.integrari.title} subtitle={dict.integrari.subtitle} />
        <div className="space-y-2">
          {INTEGRARI.map((i) => (
            <div key={i.nume} className="flex items-center justify-between rounded-lg border border-[var(--ci-border)] px-3.5 py-3">
              <div>
                <p className="text-[13px] font-medium text-[var(--ci-text)]">{i.nume}</p>
                <p className="text-[12px] text-[var(--ci-text-muted)]">{i.descriere}</p>
              </div>
              <Tooltip label={dict.neconectatTooltip}>
                <span>
                  <Badge tone="neutral">{dict.neconectat}</Badge>
                </span>
              </Tooltip>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function ColumnChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors ${
        active
          ? "border-[var(--ci-primary)] bg-[var(--ci-primary-soft)] text-[var(--ci-primary)]"
          : "border-[var(--ci-border)] text-[var(--ci-text-muted)] hover:border-[var(--ci-border-strong)]"
      }`}
    >
      {label}
    </button>
  );
}

function RoleRow({ rol, poate }: { rol: string; poate: string }) {
  return (
    <div className="rounded-lg border border-[var(--ci-border)] px-3.5 py-2.5">
      <p className="text-[13px] font-medium text-[var(--ci-text)]">{rol}</p>
      <p className="mt-0.5 text-[12px] text-[var(--ci-text-muted)]">{poate}</p>
    </div>
  );
}
