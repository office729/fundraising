import type { ToolDefinition } from "./types";

// Sursa listei de instrumente afișate în Control Tower. Fiecare instrument
// existent aici va primi propria rută sub `(app)/[orgSlug]/...` pe măsură ce
// se portează din SOI_CRM (Faza 2+) sau se construiește nou (contract-sponsorizare).
export const TOOLS: ToolDefinition[] = [
  {
    id: "crm",
    nume: "CRM",
    descriere: "Donatori, companii, sponsorizări, beneficiari și campanii — totul într-un singur loc.",
    href: "crm",
    icon: "🏢",
    categorie: "crm",
    live: true,
  },
  {
    id: "contract-sponsorizare",
    nume: "Generator contract sponsorizare / D177",
    descriere: "Generează contractul de sponsorizare 20% sau formularul D177.",
    href: "contract-sponsorizare",
    icon: "📝",
    categorie: "documente",
    live: false,
  },
  {
    id: "one-pager",
    nume: "One Pager",
    descriere: "Generator de prezentare de o pagină pentru firme partenere.",
    href: "one-pager",
    icon: "📄",
    categorie: "rapoarte",
    live: false,
  },
  {
    id: "raport-companii",
    nume: "Raport de activitate companii",
    descriere: "Raport de impact personalizat pentru fiecare companie donatoare.",
    href: "raport-companii",
    icon: "📊",
    categorie: "rapoarte",
    live: false,
  },
  {
    id: "newsletter-pf",
    nume: "Șabloane newsletter — persoane fizice",
    descriere: "Șabloane de newsletter pentru donatorii individuali.",
    href: "newsletter-pf",
    icon: "✉️",
    categorie: "comunicare",
    live: false,
  },
  {
    id: "newsletter-pj",
    nume: "Șabloane newsletter — persoane juridice",
    descriere: "Șabloane de newsletter pentru companii partenere.",
    href: "newsletter-pj",
    icon: "✉️",
    categorie: "comunicare",
    live: false,
  },
  {
    id: "program-lucru",
    nume: "Program de lucru",
    descriere: "Planificator de sarcini și program pentru echipă.",
    href: "program-lucru",
    icon: "🗓️",
    categorie: "organizare",
    live: false,
  },
];
