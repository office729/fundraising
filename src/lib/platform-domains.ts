// Domeniul propriu al platformei — nicio organizație nu-l poate revendica drept
// `custom_domain` (altfel proxy.ts ar rescrie tot site-ul spre organizația ei).
export const DOMENIU_PLATFORMA = "alexandrit.ro";

function faraPort(host: string): string {
  return host.split(":")[0]!.toLowerCase();
}

// Host-uri deservite direct de aplicație, niciodată prin lookup de domeniu propriu.
export function esteHostPlatforma(host: string): boolean {
  const h = faraPort(host);
  return (
    h === "localhost" ||
    h.endsWith(".local") ||
    h.endsWith(".vercel.app") ||
    h === DOMENIU_PLATFORMA ||
    h === `www.${DOMENIU_PLATFORMA}`
  );
}

// Mai strict decât esteHostPlatforma: la SALVAREA unui domeniu propriu respingem
// și orice subdomeniu al platformei (nu afectează domenii deja salvate).
export function domeniuRezervatPlatformei(domain: string): boolean {
  const d = faraPort(domain);
  return esteHostPlatforma(d) || d.endsWith(`.${DOMENIU_PLATFORMA}`);
}
