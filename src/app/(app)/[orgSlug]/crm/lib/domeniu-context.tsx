"use client";

import { createContext, useContext } from "react";

import type { DomeniuActivitate } from "@/lib/campaign-templates";

// Domeniul de activitate al organizației e citit o singură dată, server-side,
// în crm/layout.tsx — restul paginilor CRM (Client Components, ca dashboard-ul)
// îl citesc prin acest context, nu prin prop-drilling manual pe fiecare
// pagină. La fel ca LocaleProvider/useLocale, vezi locale-context.tsx.
const DomeniuContext = createContext<DomeniuActivitate | null>(null);

export function DomeniuProvider({
  domeniu,
  children,
}: {
  domeniu: DomeniuActivitate | null;
  children: React.ReactNode;
}) {
  return <DomeniuContext.Provider value={domeniu}>{children}</DomeniuContext.Provider>;
}

export function useDomeniu(): DomeniuActivitate | null {
  return useContext(DomeniuContext);
}
