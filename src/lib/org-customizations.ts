// Personalizări per organizație, la cerere. Sunt DOAR de configurare (nu de cod):
// structura de bază a platformei rămâne aceeași pentru toate conturile, iar o
// organizație apare aici doar dacă s-a convenit o modificare. Ce cere logică sau
// design nou devine funcționalitate standard sau serviciu separat, nu ramură de cod.
// Cheia este slug-ul organizației.
//
//  - hiddenNav: itemi din meniul lateral ascunși (după href-ul din shell.tsx)
//  - navLabels: redenumiri ale itemilor din meniu (după href)
export type OrgCustomization = {
  hiddenNav?: string[];
  navLabels?: Record<string, string>;
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
