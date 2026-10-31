"use client";

import { Heart } from "lucide-react";

import { COMPONENTE_UI_DICT } from "@/lib/i18n/dictionaries/componente-ui";

import { useLocale } from "../lib/locale-context";
import { getWorked, setWorked, useLocalStoreValue } from "../lib/local-store";

export function HeartToggle({ id, size = "md" }: { id: string; size?: "sm" | "md" }) {
  const worked = useLocalStoreValue(() => getWorked(id), false);
  const t = COMPONENTE_UI_DICT[useLocale()].heart;
  const dim = size === "sm" ? "h-4 w-4" : "h-5 w-5";

  return (
    <button
      type="button"
      aria-pressed={worked}
      aria-label={worked ? t.nelucrat : t.lucrat}
      title={worked ? t.lucratTitlu : t.lucrat}
      onClick={(e) => {
        e.stopPropagation();
        setWorked(id, !worked);
      }}
      className="inline-flex shrink-0 items-center justify-center rounded-full p-1 transition-colors hover:bg-[var(--ci-primary-soft)]"
    >
      <Heart
        className={dim}
        fill={worked ? "var(--ci-primary)" : "none"}
        stroke={worked ? "var(--ci-primary)" : "var(--ci-text-faint)"}
      />
    </button>
  );
}
