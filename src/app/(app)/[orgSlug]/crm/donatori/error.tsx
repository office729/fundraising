"use client";

import { DONATORI_UI_DICT } from "@/lib/i18n/dictionaries/donatori-ui";

import { ErrorState } from "../components/ui/states";
import { useLocale } from "../lib/locale-context";

// Eroare la încărcarea unei pagini din zona Donatori (listă, importuri, dubluri, parcursuri): mesaj clar și „Încearcă din nou”, în loc de ecranul generic al aplicației.
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const dict = DONATORI_UI_DICT[useLocale()].eroare;
  return (
    <div className="mx-auto max-w-[1100px]">
      <ErrorState title={dict.titlu} description={dict.descriere} retry={reset} />
    </div>
  );
}
