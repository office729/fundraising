import { codeazaPentruAdresa, decodeazaDinAdresa, type PersonalizareOrg } from "./personalizare-org";

// Previzualizarea navigabilă de suport: echipa platformei deschide paginile REALE ale CRM-ului, dar pe organizația demo (cu date de test), cu aspectul unui client
// aplicat peste ele (nume, siglă, pachet, meniu, blocuri). Datele clientului nu sunt atinse niciodată. Starea stă într-un cookie httpOnly, care e luat în
// seamă doar pentru un administrator al platformei și doar pe organizația demo (vezi crm/layout.tsx).

export const ORG_DEMO_SLUG = "calm-impact-demo";
export const COOKIE_PREVIZUALIZARE = "fa_prev";
export const DURATA_PREVIZUALIZARE_SECUNDE = 2 * 60 * 60;

const SLUG_VALID = /^[a-z0-9][a-z0-9-]{0,80}$/;

export type StarePrevizualizare = {
  // Organizația al cărei aspect se arată.
  slug: string;
  // Configurarea nesalvată din editor; null = cea salvată a organizației.
  config: PersonalizareOrg | null;
};

export const slugValid = (s: unknown): s is string => typeof s === "string" && SLUG_VALID.test(s);

// „slug.cod”: slug-ul nu poate conține punct, deci primul punct desparte cele două părți.
export function codeazaStare(slug: string, config: PersonalizareOrg | null): string {
  return `${slug}.${config ? codeazaPentruAdresa(config) : ""}`;
}

export function decodeazaStare(cod: string): StarePrevizualizare | null {
  const i = cod.indexOf(".");
  if (i <= 0) return null;
  const slug = cod.slice(0, i);
  if (!SLUG_VALID.test(slug)) return null;
  const rest = cod.slice(i + 1);
  if (!rest) return { slug, config: null };
  const r = decodeazaDinAdresa(rest);
  return r.ok ? { slug, config: r.valoare } : null;
}
