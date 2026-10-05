"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import type { Locale } from "@/lib/i18n/config";

import { anuleazaInvitatieAction, parasesteOrganizatiaAction, scoateMembruAction, type RezultatSimplu } from "./actions";

const T = {
  ro: {
    scoate: "Scoate",
    anuleaza: "Anulează",
    paraseste: "Părăsește organizația",
    confirmaScoate: (nume: string) => `Scoți pe ${nume} din organizație? Pierde imediat accesul; datele create de el rămân în organizație.`,
    confirmaAnuleaza: (email: string) => `Anulezi invitația pentru ${email}?`,
    confirmaParaseste: "Părăsești organizația? Vei pierde imediat accesul la datele ei.",
  },
  en: {
    scoate: "Remove",
    anuleaza: "Cancel",
    paraseste: "Leave organization",
    confirmaScoate: (nume: string) => `Remove ${nume} from the organization? They lose access immediately; the data they created stays in the organization.`,
    confirmaAnuleaza: (email: string) => `Cancel the invitation for ${email}?`,
    confirmaParaseste: "Leave the organization? You will immediately lose access to its data.",
  },
} as const;

function Buton({ eticheta, confirmare, ruleaza, locale, dupa }: {
  eticheta: string;
  confirmare: string;
  ruleaza: () => Promise<RezultatSimplu>;
  locale: Locale;
  dupa?: () => void;
}) {
  void locale;
  const router = useRouter();
  const [eroare, setEroare] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <span className="inline-flex flex-col items-end">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!window.confirm(confirmare)) return;
          setEroare(null);
          startTransition(async () => {
            const r = await ruleaza();
            if (r.error) setEroare(r.error);
            else if (dupa) dupa();
            else router.refresh();
          });
        }}
        className="rounded-md border border-line px-2.5 py-1 text-xs font-medium text-red-600 transition hover:bg-panel-2 disabled:opacity-60"
      >
        {eticheta}
      </button>
      {eroare && <span className="mt-1 max-w-[220px] text-right text-[11px] text-red-600">{eroare}</span>}
    </span>
  );
}

export function ScoateMembruButton({ orgSlug, userId, nume, locale }: { orgSlug: string; userId: string; nume: string; locale: Locale }) {
  const t = T[locale];
  return <Buton eticheta={t.scoate} confirmare={t.confirmaScoate(nume)} ruleaza={() => scoateMembruAction(orgSlug, userId)} locale={locale} />;
}

export function AnuleazaInvitatieButton({ orgSlug, inviteId, email, locale }: { orgSlug: string; inviteId: string; email: string; locale: Locale }) {
  const t = T[locale];
  return <Buton eticheta={t.anuleaza} confirmare={t.confirmaAnuleaza(email)} ruleaza={() => anuleazaInvitatieAction(orgSlug, inviteId)} locale={locale} />;
}

export function ParasesteOrganizatiaButton({ orgSlug, locale }: { orgSlug: string; locale: Locale }) {
  const t = T[locale];
  return (
    <Buton
      eticheta={t.paraseste}
      confirmare={t.confirmaParaseste}
      ruleaza={() => parasesteOrganizatiaAction(orgSlug)}
      locale={locale}
      dupa={() => {
        window.location.href = "/";
      }}
    />
  );
}
