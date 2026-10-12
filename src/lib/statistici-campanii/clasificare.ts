// Clasificări pure pentru statisticile de trafic ale campaniilor (fără acces la bază sau la cerere), ca să se poată testa.
// Nu se stochează IP, user-agent sau adrese complete: doar categorii și, pentru sursă, numele gazdei.

export type SursaTrafic = "direct" | "social" | "cautare" | "email" | "site" | "trimitere";
export type Dispozitiv = "mobil" | "tableta" | "desktop";

const SOCIAL = [
  "facebook.com", "fb.com", "fb.me", "instagram.com", "l.instagram.com", "t.co", "twitter.com", "x.com", "linkedin.com", "lnkd.in",
  "tiktok.com", "youtube.com", "youtu.be", "wa.me", "whatsapp.com", "t.me", "telegram.org", "pinterest.com", "reddit.com", "messenger.com",
];
const CAUTARE = ["google.", "bing.com", "duckduckgo.com", "yahoo.com", "ecosia.org", "yandex.", "brave.com", "startpage.com"];

const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|headless|lighthouse|pagespeed|curl|wget|python|java\/|go-http|monitor|uptime|axios|node-fetch|scrapy|httpclient|okhttp/i;

export function esteBot(userAgent: string | null | undefined): boolean {
  if (!userAgent || userAgent.length < 10) return true;
  return BOT.test(userAgent);
}

export function clasificaDispozitiv(userAgent: string | null | undefined): Dispozitiv {
  const ua = (userAgent ?? "").toLowerCase();
  if (/ipad|tablet|kindle|silk/.test(ua) || (/android/.test(ua) && !/mobile/.test(ua))) return "tableta";
  if (/mobi|iphone|ipod|android|windows phone/.test(ua)) return "mobil";
  return "desktop";
}

// Doar gazda, fără www și fără cale sau parametri; null dacă nu e o adresă validă.
export function gazdaDinReferrer(referrer: string | null | undefined): string | null {
  if (!referrer) return null;
  try {
    const h = new URL(referrer).hostname.toLowerCase().replace(/^www\./, "");
    return h && h.length <= 100 ? h : null;
  } catch {
    return null;
  }
}

// Etichetă simplă din utm_*: litere mici, cifre și separatori obișnuiți, cel mult 60 de caractere.
export function curataEticheta(v: string | null | undefined): string | null {
  const t = (v ?? "").trim().toLowerCase().slice(0, 60);
  return /^[a-z0-9_.:|+ -]+$/.test(t) ? t : null;
}

const potrivesteGazda = (gazda: string, lista: string[]) => lista.some((d) => (d.endsWith(".") ? gazda.includes(d) : gazda === d || gazda.endsWith(`.${d}`)));

export function clasificaSursa(input: { referrerHost: string | null; utmSource: string | null; utmMedium: string | null; gazdeProprii: string[] }): {
  sursa: SursaTrafic;
  detaliu: string | null;
} {
  const medium = input.utmMedium ?? "";
  const utm = input.utmSource ?? "";
  // Eticheta din link are prioritate: ea spune exact de unde ai trimis tu oamenii.
  if (/^(e-?mail|mail|newsletter)$/.test(medium) || /^(e-?mail|mail|newsletter)/.test(utm)) return { sursa: "email", detaliu: utm || "email" };
  if (/^(social|social-?media|paid-?social)$/.test(medium) || potrivesteGazda(`${utm}.com`, SOCIAL) || ["facebook", "instagram", "tiktok", "linkedin", "whatsapp", "youtube", "telegram"].includes(utm)) {
    return { sursa: "social", detaliu: utm || input.referrerHost };
  }
  const h = input.referrerHost;
  if (!h) return utm ? { sursa: "trimitere", detaliu: utm } : { sursa: "direct", detaliu: null };
  if (input.gazdeProprii.some((p) => h === p || h.endsWith(`.${p}`))) return { sursa: "site", detaliu: h };
  if (potrivesteGazda(h, SOCIAL)) return { sursa: "social", detaliu: h };
  if (potrivesteGazda(h, CAUTARE)) return { sursa: "cautare", detaliu: h };
  return { sursa: "trimitere", detaliu: h };
}
