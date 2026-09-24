// Segmente de top-level care există deja ca rute statice ale aplicației
// (vezi src/app/**) — dacă un slug de organizație le-ar coincide, ruta
// [orgSlug] ar fi umbrită de ruta statică și organizația ar deveni
// inaccesibilă. Verificat manual la fiecare rută nouă adăugată la rădăcină.
const RESERVED_SLUGS = new Set([
  "abonament",
  "api",
  "auth",
  "automatizare",
  "automatizari",
  "beneficiar",
  "blog",
  "ce-facem",
  "cine-suntem",
  "contact",
  "cookies",
  "dezabonare",
  ".well-known",
  "f230",
  "favicon.ico",
  "forgot-password",
  "gdpr",
  "hub",
  "invite",
  "invite-beneficiar",
  "login",
  "platform-admin",
  "portofoliu",
  "portofoliu-clienti",
  "premii",
  "reset-local-data",
  "reset-password",
  "s",
  "signup",
  "strangere-fonduri",
  "studii-de-caz",
  "termeni",
  "vlad-placinta",
]);

export function esteSlugRezervat(slug: string): boolean {
  return RESERVED_SLUGS.has(slug);
}
