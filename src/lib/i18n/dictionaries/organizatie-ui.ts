import type { Locale } from "../config";

// Organizație & Echipă (crm/organizatie): etichetele statusului și ale nivelului de acces. Restul textelor din pagină stau în organizatie-client.tsx, perechi RO/EN.
export const ORGANIZATIE_UI_DICT = {
  ro: {
    eroare: "Eroare.",
    status: { activ: "Activ", concediu: "Concediu", suspendat: "Suspendat", inactiv: "Inactiv" } as Record<string, string>,
    nivel: { membru: "Membru", manager: "Manager", admin_departament: "Admin departament" } as Record<string, string>,
  },
  en: {
    eroare: "Error.",
    status: { activ: "Active", concediu: "On leave", suspendat: "Suspended", inactiv: "Inactive" } as Record<string, string>,
    nivel: { membru: "Member", manager: "Manager", admin_departament: "Department admin" } as Record<string, string>,
  },
} satisfies Record<Locale, unknown>;
