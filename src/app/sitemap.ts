import type { MetadataRoute } from "next";

const BAZA = "https://alexandrit.ro";

// Paginile de prezentare cu conținut. /blog și /studii-de-caz lipsesc intenționat (încă „în curând”).
const PAGINI = ["/", "/hub", "/ce-facem", "/cine-suntem", "/intrebari-frecvente", "/portofoliu", "/portofoliu-clienti", "/premii", "/vlad-placinta", "/contact", "/automatizari", "/termeni", "/gdpr", "/dpa", "/cookies"];

export default function sitemap(): MetadataRoute.Sitemap {
  return PAGINI.map((p) => ({ url: `${BAZA}${p === "/" ? "" : p}` }));
}
