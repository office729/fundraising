"use client";

import { createContext, useContext } from "react";

import type { Locale } from "@/lib/i18n/config";

// Locale-ul e citit o singură dată, server-side, în crm/layout.tsx (din
// cookie) — restul paginilor CRM (Client Components, ca acest dashboard)
// îl citesc prin acest context, nu prin prop-drilling manual pe fiecare
// pagină. Fiecare modul CRM își aduce propriul dicționar și face
// DICT[useLocale()] — vezi lib/i18n/dictionaries/*.
const LocaleContext = createContext<Locale>("ro");

export function LocaleProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}
