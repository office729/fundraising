// Validare + normalizare pentru linkurile de LinkedIn / Facebook ale FIRMELOR (nu ale persoanelor).
// Funcții pure — folosite și pe server (acțiunea de salvare) și în interfață (căutare / „Vezi angajații”).

export type RezultatLink = { ok: true; url: string } | { ok: false; eroare: string };

function parseUrl(brut: string): URL | null {
  const t = brut.trim();
  if (!t) return null;
  try {
    return new URL(/^https?:\/\//i.test(t) ? t : `https://${t}`);
  } catch {
    return null;
  }
}

function gazda(u: URL): string {
  return u.hostname.toLowerCase().replace(/^(www|m|mobile|ro)\./, "");
}

export function valideazaLinkedin(brut: string): RezultatLink {
  const u = parseUrl(brut);
  if (!u || gazda(u) !== "linkedin.com") return { ok: false, eroare: "Linkul trebuie să fie de pe linkedin.com." };
  const [tip, slug] = u.pathname.split("/").filter(Boolean);
  if (!tip || !slug || !["company", "showcase", "school"].includes(tip.toLowerCase())) {
    return { ok: false, eroare: "Pune linkul paginii firmei (linkedin.com/company/…), nu al unei persoane." };
  }
  return { ok: true, url: `https://www.linkedin.com/${tip.toLowerCase()}/${slug}` };
}

const FB_REZERVATE = new Set([
  "groups", "events", "share", "sharer", "sharer.php", "login", "login.php", "dialog", "plugins", "watch", "reel", "reels",
  "stories", "marketplace", "photo", "photo.php", "photos", "video", "videos", "permalink.php", "story.php", "hashtag",
  "gaming", "policies", "help", "privacy", "settings", "friends", "messages", "notifications", "search", "public",
]);

export function valideazaFacebook(brut: string): RezultatLink {
  const u = parseUrl(brut);
  const g = u ? gazda(u) : "";
  if (!u || (g !== "facebook.com" && g !== "fb.com")) return { ok: false, eroare: "Linkul trebuie să fie de pe facebook.com." };
  const segmente = u.pathname.split("/").filter(Boolean);
  const primul = segmente[0]?.toLowerCase();
  if (!primul) return { ok: false, eroare: "Pune linkul paginii firmei." };
  if (primul === "profile.php") {
    const id = u.searchParams.get("id");
    if (id && /^\d+$/.test(id)) return { ok: true, url: `https://www.facebook.com/profile.php?id=${id}` };
    return { ok: false, eroare: "Link de pagină invalid." };
  }
  if (FB_REZERVATE.has(primul)) return { ok: false, eroare: "Acesta nu e o pagină de firmă (grup, eveniment, distribuire sau autentificare)." };
  if (primul === "pages" && segmente.length >= 3) return { ok: true, url: `https://www.facebook.com/pages/${segmente[1]}/${segmente[2]}` };
  if (primul === "p" && segmente[1]) return { ok: true, url: `https://www.facebook.com/p/${segmente[1]}` };
  if (primul === "pages" || primul === "p") return { ok: false, eroare: "Link de pagină incomplet." };
  return { ok: true, url: `https://www.facebook.com/${segmente[0]}` };
}

// Doar pentru pagini de firmă (nu profiluri personale) — linkul „Vezi angajații”.
export function linkAngajatiLinkedin(url: string | null | undefined): string | null {
  if (!url) return null;
  const r = valideazaLinkedin(url);
  if (!r.ok) return null;
  const tip = r.url.split("/")[3];
  return tip === "company" || tip === "school" ? `${r.url}/people/` : null;
}

// Numele firmei fără forma juridică, pentru căutări gratuite pe platforme.
export function numeFaraForma(nume: string): string {
  return nume
    .replace(/\b(S\.?\s?C\.?|S\.?\s?R\.?\s?L\.?(-D)?|S\.?\s?A\.?|S\.?\s?C\.?\s?S\.?|P\.?\s?F\.?\s?A\.?|I\.?\s?I\.?|O\.?\s?N\.?\s?G\.?)(?=[\s,.]|$)/gi, " ")
    .replace(/[,.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function cautaLinkedinFirma(nume: string): string {
  return `https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(numeFaraForma(nume))}`;
}

export function cautaFacebookFirma(nume: string): string {
  return `https://www.facebook.com/search/pages?q=${encodeURIComponent(numeFaraForma(nume))}`;
}

export function cautaLinkedinPersoane(nume: string, cuvant = "director"): string {
  return `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(`${numeFaraForma(nume)} ${cuvant}`)}`;
}
