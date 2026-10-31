"use client";

import { Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { useLocale } from "../../lib/locale-context";
import { COMPANII_UI_DICT } from "@/lib/i18n/dictionaries/companii-ui";
import { imbogatesteFirma } from "./prospectare-actions";

// Completează industria și numărul de angajați ale firmei din contul Apollo al organizației, DOAR unde lipsesc. Nu suprascrie date introduse de mână sau din ANAF.
export function ImbogatesteFirma({ orgSlug, companyId }: { orgSlug: string; companyId: string }) {
  const router = useRouter();
  const ui = COMPANII_UI_DICT[useLocale()].imbogatire;
  const [pending, start] = useTransition();
  const [mesaj, setMesaj] = useState<{ ok: boolean; text: string } | null>(null);

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-[var(--ci-radius-card)] border border-dashed border-[var(--ci-border)] bg-[var(--ci-surface)] px-4 py-3">
      <Sparkles className="h-4 w-4 text-[var(--ci-primary)]" aria-hidden />
      <div className="min-w-0 flex-1 text-[12.5px] text-[var(--ci-text-muted)]">
        <p className="font-semibold text-[var(--ci-text)]">{ui.titlu}</p>
        <p>{ui.descriere}</p>
      </div>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setMesaj(null);
            const r = await imbogatesteFirma(orgSlug, companyId);
            setMesaj(r.ok ? { ok: true, text: r.mesaj ?? ui.gata } : { ok: false, text: r.eroare ?? ui.esuat });
            if (r.ok) router.refresh();
          })
        }
        className="rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] px-3 py-1.5 text-[12.5px] font-semibold text-[var(--ci-text)] hover:bg-[var(--ci-surface-2)] disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none"
      >
        {pending ? ui.seCauta : ui.buton}
      </button>
      {mesaj && (
        <p role={mesaj.ok ? "status" : "alert"} className={`w-full text-[12.5px] ${mesaj.ok ? "text-[var(--ci-green)]" : "text-[var(--ci-red)]"}`}>
          {mesaj.text}
        </p>
      )}
    </div>
  );
}
