import "server-only";

import { cookies } from "next/headers";

import { DEFAULT_LOCALE, esteLocaleValid, LOCALE_COOKIE, type Locale } from "./config";

// Citește limba curentă dintr-un cookie simplu (nu prefix de URL) — platforma
// e deja multi-tenant pe [orgSlug] și are propria rescriere de domenii
// (vezi proxy.ts); a mai adăuga [locale] ca segment de rută ar însemna
// restructurat fiecare rută existentă. Un cookie e neintruziv, per-vizitator,
// și suficient pentru cerința actuală (selector RO/EN, nu URL-uri separate).
export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const raw = store.get(LOCALE_COOKIE)?.value;
  return esteLocaleValid(raw) ? raw : DEFAULT_LOCALE;
}
