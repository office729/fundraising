"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import type { Locale } from "@/lib/i18n/config";

import { anuleazaInvitatieAction, parasesteOrganizatiaAction, scoateMembruAction, type RezultatSimplu } from "./actions";

const T = {
  ro: {
    da: "Da, confirm",
    nu: "Nu",
    scoate: "Scoate",
    anuleaza: "Anulează",
    paraseste: "Părăsește organizația",
    confirmaScoate: (nume: string) => `Scoți pe ${nume} din organizație? Pierde imediat accesul; datele create de el rămân în organizație.`,
    confirmaAnuleaza: (email: string) => `Anulezi invitația pentru ${email}?`,
    confirmaParaseste: "Părăsești organizația? Vei pierde imediat accesul la datele ei.",
  },
  en: {
    da: "Yes, confirm",
    nu: "No",
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
  const t = T[locale];
  const router = useRouter();
  const [eroare, setEroare] = useState<string | null>(null);
  const [seIntreaba, setSeIntreaba] = useState(false);
  const [pending, startTransition] = useTransition();

  function executa() {
    setSeIntreaba(false);
    setEroare(null);
    startTransition(async () => {
      const r = await ruleaza();
      if (r.error) setEroare(r.error);
      else if (dupa) dupa();
      else router.refresh();
    });
  }

  // Confirmare în pagină, nu fereastra nativă window.confirm(): aceea e blocată în unele browsere/panouri și arată ciudat pe telefon.
  if (seIntreaba) {
    return (
      <span role="alertdialog" aria-label={confirmare} className="inline-flex max-w-[260px] flex-col items-end gap-1.5 text-right">
        <span className="text-xs leading-snug text-body">{confirmare}</span>
        <span className="inline-flex gap-1.5">
          <button type="button" onClick={() => setSeIntreaba(false)} className="rounded-md border border-line px-2.5 py-1 text-xs font-medium text-ink transition hover:bg-panel-2">
            {t.nu}
          </button>
          <button type="button" onClick={executa} className="rounded-md bg-red-600 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-red-700">
            {t.da}
          </button>
        </span>
      </span>
    );
  }

  return (
    <span className="inline-flex flex-col items-end">
      <button
        type="button"
        disabled={pending}
        onClick={() => setSeIntreaba(true)}
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
