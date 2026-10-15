// Ce pagini sunt excluse din Google Analytics. Funcție pură, fără importuri (dependențele se primesc ca parametri), ca să poată fi testată.

// Pagini cu date personale sau cu tokenuri în URL (adresa de email din linkul de dezabonare, formularul 230, donațiile,
// invitațiile, rezultatul plății): analiza NU rulează deloc aici, chiar dacă vizitatorul a acceptat statisticile —
// notele de informare ale donatorilor nu menționează Google și URL-ul ar ajunge la Google ca `page_location`.
const PRIMUL_SEGMENT_EXCLUS = new Set(["f230", "strangere-fonduri", "dezabonare", "dezabonare-notificare", "invite", "invite-beneficiar", "auth", "reset-password", "beneficiar", "s"]);

export function esteCaleExclusa(
  pathname: string,
  // lib/link-campanie.ts → caleReala și lib/reserved-slugs.ts → esteSlugRezervat
  caleReala: (pathname: string, esteRezervat: (segment: string) => boolean) => string | null,
  esteSlugRezervat: (segment: string) => boolean,
): boolean {
  if (PRIMUL_SEGMENT_EXCLUS.has(pathname.split("/")[1] ?? "")) return true;
  // Linkul scurt al unei campanii (/<organizatie>/<campanie>[/multumim|/promovare]) are aceeași pagină cu /strangere-fonduri/…:
  // browserul păstrează adresa scurtă, deci trebuie recunoscută și ea, altfel Google Analytics s-ar încărca pe paginile de donații.
  return caleReala(pathname, esteSlugRezervat) !== null;
}
