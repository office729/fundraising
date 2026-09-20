// Personalizări per organizație, la cerere și cu acordul ONG-ului. Structura de
// bază a platformei rămâne NEATINSĂ pentru toate celelalte conturi: o organizație
// apare aici doar dacă s-a convenit o modificare, iar orice câmp lipsă înseamnă
// comportamentul standard. Cheia este slug-ul organizației (ex. „salveaza-o-inima").
//
// Ce se poate personaliza azi:
//  - hiddenNav: itemi din meniul lateral ascunși (după href-ul din shell.tsx)
//  - navLabels: redenumiri ale itemilor din meniu (după href)
//  - extraNav: itemi noi în meniu, cu link către o pagină/URL agreat
//  - toolHtml: variantă proprie a unui instrument HTML (după slug-ul instrumentului,
//    ex. „program-lucru"), înlocuind HTML-ul standard doar pentru acea organizație
export type OrgCustomization = {
  hiddenNav?: string[];
  navLabels?: Record<string, string>;
  extraNav?: { section: string; href: string; label: string }[];
  toolHtml?: Record<string, string>;
};

export const ORG_CUSTOMIZATIONS: Record<string, OrgCustomization> = {
  // exemplu:
  // "numele-ong": {
  //   hiddenNav: ["rfm"],
  //   navLabels: { donatori: "Donatorii noștri" },
  // },
};

export function getOrgCustomization(orgSlug: string): OrgCustomization {
  return ORG_CUSTOMIZATIONS[orgSlug] ?? {};
}
