// Tema completă per domeniu de activitate — nu doar o culoare de accent.
// Domeniul ȘI template-ul paginii de campanie sunt același set de valori
// (vezi CampaignPageTemplate mai jos): alegerea domeniului organizației
// determină automat aspectul întregii platforme (public + CRM), iar pagina
// de campanie poate opta pentru altă temă doar dacă org-ul are acces total
// (plan personalizat, vezi lib/billing/custom-plan.ts).
//
// Paleta reală (--brand-*) e definită în src/app/globals.css, sub blocuri
// `[data-domeniu="x"]` / `.dark[data-domeniu="x"]` — acest fișier NU repetă
// culorile, doar identifică tema (nume, familie de layout) ca `data-domeniu`
// să ajungă pe elementul corect din arbore (vezi [orgSlug]/layout.tsx,
// crm/shell.tsx, pagina publică de campanie).

export type DomeniuActivitate =
  | "copii"
  | "animale"
  | "mediu"
  | "educatie"
  | "sanatate"
  | "social_incluziune"
  | "cultura"
  | "sport"
  | "altele";

export const TOATE_DOMENIILE: DomeniuActivitate[] = [
  "copii",
  "animale",
  "mediu",
  "educatie",
  "sanatate",
  "social_incluziune",
  "cultura",
  "sport",
  "altele",
];

// Template-ul paginii de campanie = domeniul de activitate (același set de 9
// valori) — nu mai există o listă separată, grupată many-to-one, ca înainte.
// "altele" e neutru (aspectul original, dinaintea acestei funcționalități).
export type CampaignPageTemplate = DomeniuActivitate;
export const TOATE_TEMPLATE_URILE: CampaignPageTemplate[] = TOATE_DOMENIILE;

// Familia de layout — dă FORMA structurală (așezarea hero-ului, radius-ul),
// nu culoarea. Două domenii din aceeași familie tot arată clar diferit (au
// paletă proprie), familia doar le dă un "aer" comun de personalitate.
export type LayoutFamily = "cald-protector" | "natural-ancorat" | "indraznet-dinamic" | "elegant-editorial" | "neutru";

type TemplateDef = {
  nume: string;
  familie: LayoutFamily;
  // Eticheta secțiunii de "proiecte active" pe panoul CRM (dashboard) — dă
  // textului, nu doar formei, un aer specific domeniului. Fără valoare =
  // rămâne titlul generic din dicționarul de traduceri (cazul "altele").
  itemLabel?: string;
};

export const CAMPAIGN_TEMPLATES: Record<CampaignPageTemplate, TemplateDef> = {
  copii: { nume: "Copii", familie: "cald-protector", itemLabel: "Copii sprijiniți" },
  sanatate: { nume: "Sănătate", familie: "cald-protector", itemLabel: "Cazuri active" },
  social_incluziune: { nume: "Social / Incluziune", familie: "cald-protector", itemLabel: "Persoane sprijinite" },
  animale: { nume: "Animale", familie: "natural-ancorat", itemLabel: "Cazuri de salvare active" },
  mediu: { nume: "Mediu", familie: "natural-ancorat", itemLabel: "Proiecte de mediu active" },
  sport: { nume: "Sport", familie: "indraznet-dinamic", itemLabel: "Provocări active" },
  educatie: { nume: "Educație", familie: "indraznet-dinamic", itemLabel: "Burse și proiecte active" },
  cultura: { nume: "Cultură", familie: "elegant-editorial", itemLabel: "Proiecte culturale" },
  altele: { nume: "Modern", familie: "neutru" },
};

// Template-urile disponibile pentru un org — implicit doar tema propriului
// domeniu (+ "altele", mereu disponibil ca opțiune neutră), decât dacă are
// acces total (plan personalizat) sau nu și-a ales încă un domeniu (nu
// blocăm crearea paginii din lipsa acestei informații).
export function getTemplatesDisponibile(
  domeniu: DomeniuActivitate | null,
  accesDesignToate: boolean,
): CampaignPageTemplate[] {
  if (accesDesignToate || !domeniu) return TOATE_TEMPLATE_URILE;
  return Array.from(new Set([domeniu, "altele" as CampaignPageTemplate]));
}
