import type { Locale } from "@/lib/i18n/config";
import { RECLAME_UI_DICT } from "@/lib/i18n/dictionaries/reclame-ui";

// Biblioteca src/lib/reclame întoarce unele etichete și mesaje deja formulate în română (note de raport, erori ale
// generatorului de linkuri). Aici se traduc prin potrivire exactă; ce nu e cunoscut rămâne neschimbat.
export function traduLib(locale: Locale, text: string): string {
  const map = RECLAME_UI_DICT[locale].libRo;
  const direct = map[text];
  if (direct) return direct;
  // „Eticheta: mesaj” (generatorul de linkuri compune eticheta și mesajul).
  const i = text.indexOf(": ");
  if (i > 0) {
    const a = map[text.slice(0, i)];
    const b = map[text.slice(i + 2)];
    if (a && b) return `${a}: ${b}`;
  }
  return text;
}
