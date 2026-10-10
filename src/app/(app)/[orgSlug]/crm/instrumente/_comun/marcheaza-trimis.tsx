"use client";

import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { marcheazaTrimisAction, type TipDoc } from "./documente-actions";

// „Exportat” nu înseamnă „trimis”: o bifă simplă pe document spune echipei ce a plecat deja și ce mai e de trimis.
export function MarcheazaTrimis({ orgSlug, tip, id, trimis }: { orgSlug: string; tip: TipDoc; id: string; trimis: boolean }) {
  const router = useRouter();
  const [ocupat, start] = useTransition();
  const [eroare, setEroare] = useState(false);
  return (
    <button
      type="button"
      disabled={ocupat}
      aria-pressed={trimis}
      onClick={() =>
        start(async () => {
          setEroare(false);
          try {
            if (await marcheazaTrimisAction(orgSlug, tip, id, !trimis)) router.refresh();
            else setEroare(true);
          } catch {
            setEroare(true);
          }
        })
      }
      className={`inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-[var(--ci-radius-btn)] border px-3 py-1.5 text-[12.5px] font-medium focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none ${
        trimis ? "border-[var(--ci-green)] bg-[var(--ci-green-soft)] text-[var(--ci-green)]" : "border-[var(--ci-border)] text-[var(--ci-text)] hover:bg-[var(--ci-surface-2)]"
      }`}
    >
      {trimis && <Check className="size-3.5" aria-hidden />}
      {eroare ? "Nu s-a salvat" : trimis ? "Trimis" : "Marchează trimis"}
    </button>
  );
}
