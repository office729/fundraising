"use client";

import { Badge } from "../components/ui/badge";
import { Card, CardHeader } from "../components/ui/card";
import { Tooltip } from "../components/ui/tooltip";
import { useLocale } from "../lib/locale-context";
import { SETARI_ECHIPA_DICT } from "@/lib/i18n/dictionaries/setari-echipa";

export default function CrmSetariPage() {
  const locale = useLocale();
  const dict = SETARI_ECHIPA_DICT[locale].crmSetari;
  const INTEGRARI = [dict.integrariList.stripe, dict.integrariList.euplatesc, dict.integrariList.smartfintech, dict.integrariList.mailchimp, dict.integrariList.newsman, dict.integrariList.theMarketer, dict.integrariList.brevo, dict.integrariList.googleCalendar, dict.integrariList.make, dict.integrariList.canva, dict.integrariList.boldsign, dict.integrariList.website];

  return (
    <div className="mx-auto max-w-[900px] space-y-5">
      <div>
        <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">{dict.title}</h1>
        <p className="mt-0.5 text-[13px] text-[var(--ci-text-muted)]">{dict.subtitle}</p>
      </div>

      <Card>
        <CardHeader title={dict.roluri.title} subtitle={dict.roluri.subtitle} />
        <div className="space-y-2">
          <RoleRow rol={dict.ownerAdmin.rol} poate={dict.ownerAdmin.poate} />
          <RoleRow rol={dict.membru.rol} poate={dict.membru.poate} />
        </div>
      </Card>

      <Card>
        <CardHeader title={dict.integrari.title} subtitle={dict.integrari.subtitle} />
        <p className="mb-3 rounded-[var(--ci-radius-card)] bg-[var(--ci-amber-soft)] px-3.5 py-2.5 text-[12px] text-[var(--ci-text)]">{dict.integrari.nota}</p>
        <div className="space-y-2">
          {INTEGRARI.map((i) => (
            <div key={i.nume} className="flex items-center justify-between rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] px-3.5 py-3">
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

function RoleRow({ rol, poate }: { rol: string; poate: string }) {
  return (
    <div className="rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] px-3.5 py-2.5">
      <p className="text-[13px] font-medium text-[var(--ci-text)]">{rol}</p>
      <p className="mt-0.5 text-[12px] text-[var(--ci-text-muted)]">{poate}</p>
    </div>
  );
}
