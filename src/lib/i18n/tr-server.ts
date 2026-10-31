import "server-only";

import { getLocale } from "./get-locale";

// Pentru server actions și rute: `const t = await getTr(); t("text în română", "text in English")`.
// Folosit la mesajele scurte de eroare/succes întoarse de acțiuni; textele din interfață stau în dicționare (./dictionaries).
export async function getTr(): Promise<(ro: string, en: string) => string> {
  const locale = await getLocale();
  return (ro, en) => (locale === "ro" ? ro : en);
}
