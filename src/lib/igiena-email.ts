// Igiena adreselor de e-mail ale donatorilor: ce înseamnă o respingere de la serverul de e-mail și cum se marchează o adresă. Fără importuri, ca să se poată testa direct.
//
// Regula de aur: o adresă se marchează „respinsă” doar la dovadă clară că NU există (cod 5.1.x sau text de tip „user unknown”). O respingere din cauza reputației noastre
// de trimitere (spam, listă neagră, politică, 5.7.x) sau una temporară (cutie plină, 4xx) nu spune nimic despre donator și nu trebuie să-l scoată din liste.

export type FelEroareTrimitere = "adresa_inexistenta" | "temporara" | "politica";

// Starea unei adrese la donator: ok | respins (nu există) | reclamat (a marcat mesajul ca spam: nu mai primește nimic).
export const STARI_ADRESA = ["ok", "respins", "reclamat"] as const;
export type StareAdresa = (typeof STARI_ADRESA)[number];
export const ETICHETE_STARE_ADRESA: Record<StareAdresa, string> = { ok: "Adresă în regulă", respins: "Adresă respinsă", reclamat: "A marcat mesajul ca spam" };

export function esteStareAdresa(x: unknown): x is StareAdresa {
  return typeof x === "string" && (STARI_ADRESA as readonly string[]).includes(x);
}

// Cât de des vrea persoana mesaje: „normala” (cum e setat în parcursuri) sau „rara” (cel mult un mesaj de parcurs la 30 de zile).
export const FRECVENTE_EMAIL = ["normala", "rara"] as const;
export type FrecventaEmail = (typeof FRECVENTE_EMAIL)[number];
export function esteFrecventaEmail(x: unknown): x is FrecventaEmail {
  return typeof x === "string" && (FRECVENTE_EMAIL as readonly string[]).includes(x);
}

const RE_POLITICA = /spam|block(ed|list)?|black\s?list|denied|policy|reputation|not authori[sz]ed|relay|dmarc|spf|dkim|rate.?limit|too many|greylist|poor|listed at|abuse|refused by/;
const RE_INEXISTENTA = /user unknown|unknown user|no such user|no such (mailbox|recipient|address)|does not exist|doesn'?t exist|invalid (recipient|mailbox|address)|recipient (address )?rejected|mailbox (not found|unavailable|does not exist|unknown)|address rejected|unrouteable|not a valid (mailbox|recipient)|undeliverable|bad destination|account.*(disabled|inactive|closed)|user not found/;

// Clasifică o eroare de trimitere (nodemailer: responseCode = codul SMTP, response = ultima linie a serverului). null = nu e o respingere SMTP (rețea, timeout): nu știm nimic despre adresă.
export function clasificaEroareTrimitere(e: unknown): FelEroareTrimitere | null {
  const eroare = e as { responseCode?: unknown; response?: unknown } | null;
  const cod = typeof eroare?.responseCode === "number" ? eroare.responseCode : null;
  if (cod === null || cod < 400 || cod >= 600) return null;
  if (cod < 500) return "temporara";
  const text = typeof eroare?.response === "string" ? eroare.response.toLowerCase().slice(0, 500) : "";
  const avansat = text.match(/\b5\.(\d)\.(\d{1,3})\b/);
  const clasa = avansat ? Number(avansat[1]) : null;
  if (clasa === 7) return "politica";
  if (clasa === 2) return "temporara"; // cutie plină, mesaj prea mare, cutie dezactivată temporar
  if (clasa === 1) return "adresa_inexistenta"; // 5.1.1 cutie inexistentă, 5.1.2 domeniu inexistent, 5.1.3 adresă greșită
  if (cod === 552) return "temporara";
  if (RE_POLITICA.test(text)) return "politica";
  if ((cod === 550 || cod === 551 || cod === 553 || cod === 554) && RE_INEXISTENTA.test(text)) return "adresa_inexistenta";
  return "politica"; // fără dovadă clară că adresa nu există, nu o marcăm
}

// Motivul scurt păstrat la donator (fără textul serverului: poate conține adresa sau date tehnice).
export function motivRespingere(fel: FelEroareTrimitere): string {
  return fel === "adresa_inexistenta" ? "Serverul de e-mail a răspuns că adresa nu există" : fel === "temporara" ? "Respingere temporară" : "Respingere din motive de politică a serverului";
}

// Poate primi mesaje automate: adresa e în regulă (nu e respinsă și nu a reclamat).
export function adresaFolosibila(stare: string | null | undefined): boolean {
  return (stare ?? "ok") === "ok";
}
