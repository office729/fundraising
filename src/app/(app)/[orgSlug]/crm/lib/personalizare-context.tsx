"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { PersonalizareOrg } from "@/lib/personalizare-org";

// Aspectul personalizat al organizației (lib/personalizare-org.ts), pus la dispoziția meniului și a prime pagini. null = aspect standard.
const PersonalizareContext = createContext<PersonalizareOrg | null>(null);

export function PersonalizareProvider({ personalizare, children }: { personalizare: PersonalizareOrg | null; children: ReactNode }) {
  return <PersonalizareContext.Provider value={personalizare}>{children}</PersonalizareContext.Provider>;
}

export function usePersonalizare(): PersonalizareOrg | null {
  return useContext(PersonalizareContext);
}
