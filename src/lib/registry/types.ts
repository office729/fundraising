import type { ToolId } from "@/lib/billing/packages";

export type ToolCategory = "crm" | "documente" | "rapoarte" | "comunicare" | "organizare";

export type ToolDefinition = {
  id: ToolId;
  nume: string;
  descriere: string;
  href: string;
  icon: string;
  categorie: ToolCategory;
  // Instrumentul are o rută funcțională acum, sau doar figurează în listă
  // (Faza 2+, vezi planul de fazare) — afișat ca „În curând", fără link activ.
  live: boolean;
};

export const CATEGORY_LABELS: Record<ToolCategory, string> = {
  crm: "CRM",
  documente: "Documente & contracte",
  rapoarte: "Rapoarte & prezentare",
  comunicare: "Comunicare",
  organizare: "Organizare",
};
