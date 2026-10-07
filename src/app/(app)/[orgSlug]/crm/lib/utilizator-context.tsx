"use client";

import { createContext, useContext } from "react";

// Prenumele utilizatorului curent (citit server-side în crm/layout.tsx), pentru salutul din pagini. Gol dacă
// contul n-are un nume (doar email) — mai bine un salut fără nume decât unul cu o adresă de email.
const UtilizatorContext = createContext<string>("");

export function UtilizatorProvider({ prenume, children }: { prenume: string; children: React.ReactNode }) {
  return <UtilizatorContext.Provider value={prenume}>{children}</UtilizatorContext.Provider>;
}

export function useUtilizatorPrenume(): string {
  return useContext(UtilizatorContext);
}
