import type { Locale } from "@/lib/i18n/config";
import { ETICHETE_EN } from "@/lib/i18n/dictionaries/instrumente-ui-2";

type Cu = { id: string; eticheta: string; hint?: string };

// Opțiunile și modelele din bibliotecile de documente au etichete în română. În engleză se înlocuiesc după id (nu după text);
// un id necunoscut păstrează eticheta din bibliotecă. Textul documentelor generate nu se atinge.
export function traduElemente<T extends Cu>(items: readonly T[], grup: keyof typeof ETICHETE_EN, locale: Locale): T[] {
  if (locale === "ro") return [...items];
  const m = ETICHETE_EN[grup];
  return items.map((it) => {
    const t = m[it.id];
    if (!t) return it;
    return { ...it, eticheta: t.eticheta, ...(it.hint !== undefined && t.hint ? { hint: t.hint } : {}) };
  });
}
