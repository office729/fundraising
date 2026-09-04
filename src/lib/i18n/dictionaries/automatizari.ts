import type { Locale } from "../config";

export const AUTOMATIZARI_DICT = {
  ro: {
    pasLabel: { declansator: "Declanșator", conditie: "Condiție", asteptare: "Așteptare", actiune: "Acțiune", ramificatie: "Ramificație" },
    title: "Automatizări",
    subtitle: (active: number, total: number) => `${active} active din ${total} șabloane`,
    pasiDeclansari: (pasi: number, declansari: number) => `${pasi} pași · ~${declansari} declanșări/lună`,
    automatizareActiva: "Automatizare activă",
  },
  en: {
    pasLabel: { declansator: "Trigger", conditie: "Condition", asteptare: "Wait", actiune: "Action", ramificatie: "Branch" },
    title: "Automations",
    subtitle: (active: number, total: number) => `${active} active out of ${total} templates`,
    pasiDeclansari: (pasi: number, declansari: number) => `${pasi} steps · ~${declansari} triggers/month`,
    automatizareActiva: "Automation active",
  },
} satisfies Record<Locale, unknown>;
