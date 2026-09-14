// Biblioteca de design-uri pentru pagina publică de strângere fonduri —
// vezi src/app/strangere-fonduri/[orgSlug]/[pageSlug]/page.tsx (randare) și
// src/app/strangere-fonduri/[orgSlug]/creeaza/ (alegere la creare).
//
// Toate cele 3 variante noi reutilizează tokenii de brand deja existenți
// (globals.css) — niciun hex nou, niciun radius nou (evită să adâncească
// inconsistența de rounded-xl/rounded-2xl semnalată în auditul de design).
// Doar culoarea/gradientul wash-ului, eyebrow-ul și fallback-ul hero variază.
// Restul paginii (donație, progress ring, share links, listă donatori) e
// identic pe toate design-urile.

export type DomeniuActivitate =
  | "copii"
  | "animale"
  | "mediu"
  | "educatie"
  | "sanatate"
  | "social_incluziune"
  | "cultura"
  | "altele";

export const TOATE_DOMENIILE: DomeniuActivitate[] = [
  "copii",
  "animale",
  "mediu",
  "educatie",
  "sanatate",
  "social_incluziune",
  "cultura",
  "altele",
];

export type CampaignPageTemplate = "modern" | "cald" | "natural" | "elegant";

export const TOATE_TEMPLATE_URILE: CampaignPageTemplate[] = ["modern", "cald", "natural", "elegant"];

type TemplateDef = {
  nume: string;
  domenii: DomeniuActivitate[];
  clase: {
    // Wash-ul din spatele cardului principal.
    fundal: string;
    // Culoarea textului "Campanie verificată de {org}".
    eyebrow: string;
    // Gradientul hero folosit când pagina nu are imagine de copertă.
    heroFallback: string;
  };
};

// "modern" = EXACT aspectul original al paginii, dinainte de introducerea
// template-urilor — implicit pentru orice pagină existentă sau fără domeniu
// de activitate ales, ca nimic să nu se schimbe vizual din greșeală.
export const CAMPAIGN_TEMPLATES: Record<CampaignPageTemplate, TemplateDef> = {
  modern: {
    nume: "Modern",
    domenii: ["altele"],
    clase: {
      fundal: "from-brand-blue-soft/70 via-panel-2 to-panel-2",
      eyebrow: "text-brand-green",
      heroFallback: "from-brand-blue to-brand-green",
    },
  },
  cald: {
    nume: "Cald & Apropiat",
    domenii: ["copii", "sanatate", "social_incluziune"],
    clase: {
      fundal: "from-brand-amber-soft/70 via-panel-2 to-panel-2",
      eyebrow: "text-brand-amber",
      heroFallback: "from-brand-amber to-brand-green",
    },
  },
  natural: {
    nume: "Natural",
    domenii: ["animale", "mediu"],
    clase: {
      fundal: "from-brand-green-soft/70 via-panel-2 to-panel-2",
      eyebrow: "text-brand-green-hover",
      heroFallback: "from-brand-green to-brand-green-hover",
    },
  },
  elegant: {
    nume: "Elegant",
    domenii: ["educatie", "cultura"],
    clase: {
      fundal: "from-brand-blue-hover/10 via-panel-2 to-brand-blue-soft/60",
      eyebrow: "text-brand-blue-hover",
      heroFallback: "from-brand-blue-hover to-brand-blue",
    },
  },
};

// Template-urile disponibile pentru un org — filtrate după domeniul lui de
// activitate, cu excepția cazului în care are acces la toate (plan
// personalizat, vezi lib/billing/custom-plan.ts) sau nu și-a ales încă un
// domeniu (nu blocăm crearea paginii din lipsa acestei informații).
// "modern" e mereu inclus, ca opțiune universală de fallback.
export function getTemplatesDisponibile(
  domeniu: DomeniuActivitate | null,
  accesDesignToate: boolean,
): CampaignPageTemplate[] {
  if (accesDesignToate || !domeniu) return TOATE_TEMPLATE_URILE;
  const potrivite = TOATE_TEMPLATE_URILE.filter((id) => CAMPAIGN_TEMPLATES[id].domenii.includes(domeniu));
  return Array.from(new Set([...potrivite, "modern" as CampaignPageTemplate]));
}
