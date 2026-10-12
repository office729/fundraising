// Unde are voie Pixelul Meta și cum se traduc evenimentele noastre în evenimente standard Meta. Funcții pure, fără importuri (testabile).
// Pixelul se încarcă DOAR pe paginile publice de prezentare ale site-ului (și pe înscriere), niciodată pe aplicație,
// paginile de campanie, formularul 230 sau alte pagini cu date personale.

const PAGINI_SITE = new Set([
  "/", "/hub", "/cine-suntem", "/intrebari-frecvente", "/ce-facem", "/portofoliu", "/portofoliu-clienti", "/premii", "/vlad-placinta",
  "/contact", "/automatizari", "/cum-functioneaza", "/studii-de-caz", "/signup", "/login",
]);

export function esteCaleCuPixel(pathname: string): boolean {
  const cale = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  return PAGINI_SITE.has(cale) || cale === "/blog" || cale.startsWith("/blog/");
}

export type EvenimentMeta = { nume: string; standard: boolean; params?: Record<string, unknown> };

// Evenimentele noastre (lib/analytics.ts → trackEvent) → Meta. Fără ele, nu se trimite nimic. Nu trimitem date personale, doar tipul acțiunii.
export function evenimentMeta(nume: string): EvenimentMeta | null {
  switch (nume) {
    case "sign_up":
      return { nume: "CompleteRegistration", standard: true };
    case "generate_lead":
      return { nume: "Lead", standard: true };
    case "cta_trial_click":
      return { nume: "CtaTrialClick", standard: false };
    default:
      return null;
  }
}
