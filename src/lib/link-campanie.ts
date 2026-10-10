// Link scurt al unei campanii de strângere de fonduri: /<organizatie>/<campanie> în loc de /strangere-fonduri/<organizatie>/<campanie>.
// Linkurile lungi deja distribuite rămân valide; proxy-ul le rescrie pe cele scurte spre ruta reală (vezi src/proxy.ts).
//
// Sub /<organizatie>/ trăiesc și rutele aplicației (crm, setari…): un slug de campanie care le-ar coincide ar rămâne
// accesibil doar pe linkul lung. De aceea lista de mai jos trebuie să acopere toate directoarele din src/app/(app)/[orgSlug]
// (verificat într-un test) și slugurile noi de campanie le ocolesc.

export const RUTE_ORGANIZATIE = [
  "comunicate",
  "crm",
  "crm-pj",
  "crm-voluntari",
  "echipa",
  "grupuri-facebook",
  "newsletter-pf",
  "newsletter-pj",
  "one-pager-generator",
  "program-lucru",
  "prospectare",
  "setari",
] as const;

const RUTE = new Set<string>(RUTE_ORGANIZATIE);

export const esteRutaOrganizatie = (segment: string) => RUTE.has(segment);

// Calea scurtă: /<org>/<campanie>. Dacă slugul campaniei coincide cu o rută a aplicației, rămâne calea lungă.
export function caleCampanie(orgSlug: string, pageSlug: string): string {
  return esteRutaOrganizatie(pageSlug) ? `/strangere-fonduri/${orgSlug}/${pageSlug}` : `/${orgSlug}/${pageSlug}`;
}

// Sub-paginile publice ale unei campanii care pot fi accesate și pe calea scurtă.
const SUBPAGINI = new Set(["promovare", "multumim"]);

// Dacă `pathname` e o cale scurtă de campanie (/<org>/<campanie>[/promovare|/multumim]), întoarce calea reală, altfel null.
// `esteRezervat` decide dacă primul segment e o rută a platformei (nu o organizație).
export function caleReala(pathname: string, esteRezervat: (segment: string) => boolean): string | null {
  const segmente = pathname.split("/").filter(Boolean);
  if (segmente.length < 2 || segmente.length > 3) return null;
  const [org, campanie, sub] = segmente;
  if (esteRezervat(org) || esteRutaOrganizatie(campanie)) return null;
  if (segmente.length === 3 && !SUBPAGINI.has(sub)) return null;
  return `/strangere-fonduri/${segmente.join("/")}`;
}
