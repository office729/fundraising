// Date structurate (schema.org, JSON-LD) pentru site-ul public. Funcții pure, fără importuri: se pot testa direct.
// Doar fapte verificabile din site (nume, prețuri din pachete, firma, e-mail); fără evaluări sau recenzii inventate.

export const SITE_URL = "https://alexandrit.ro";
export const NUME_SITE = "Alexandrit";
export const EMAIL_CONTACT = "vlad.placinta@alexandrit.ro";

export type Oferta = { nume: string; pretLunar: number };

export function schemaOrganizatie() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organizatie`,
    name: NUME_SITE,
    legalName: "MEDIGROUPPLUS SRL",
    taxID: "38103518",
    url: SITE_URL,
    logo: `${SITE_URL}/alexandrit-logo.webp`,
    email: EMAIL_CONTACT,
    founder: { "@type": "Person", name: "Vlad Plăcintă", url: `${SITE_URL}/vlad-placinta` },
    areaServed: { "@type": "Country", name: "România" },
  };
}

export function schemaSite(limba: "ro" | "en" = "ro") {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#site`,
    name: NUME_SITE,
    url: SITE_URL,
    inLanguage: limba === "ro" ? "ro-RO" : "en",
    publisher: { "@id": `${SITE_URL}/#organizatie` },
  };
}

// Aplicația, cu pachetele ca oferte lunare în lei și proba gratuită de 30 de zile.
export function schemaAplicatie(oferte: readonly Oferta[], descriere: string) {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: NUME_SITE,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: SITE_URL,
    description: descriere,
    publisher: { "@id": `${SITE_URL}/#organizatie` },
    offers: oferte.map((o) => ({
      "@type": "Offer",
      name: o.nume,
      price: String(o.pretLunar),
      priceCurrency: "RON",
      priceSpecification: { "@type": "UnitPriceSpecification", price: String(o.pretLunar), priceCurrency: "RON", unitText: "MONTH" },
      url: `${SITE_URL}/hub`,
      availability: "https://schema.org/InStock",
    })),
  };
}

export type Firimitura = { nume: string; cale: string };

// Firimituri de navigare: Acasă + pagina curentă. Căile sunt relative la site.
export function schemaFiriturie(pagina: Firimitura) {
  const cale = pagina.cale.startsWith("/") ? pagina.cale : `/${pagina.cale}`;
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: NUME_SITE, item: SITE_URL },
      { "@type": "ListItem", position: 2, name: pagina.nume, item: `${SITE_URL}${cale}` },
    ],
  };
}

// JSON pentru <script type="application/ld+json">: „<” devine <, ca un text cu „</script>” să nu poată închide eticheta.
export function serializeazaJsonLd(date: unknown): string {
  return JSON.stringify(date).replace(/</g, "\\u003c");
}
