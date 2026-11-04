// Prețurile Claude (USD la 1 milion de tokeni) și calculul costului unui apel. Pur: fără server-only, ca să poată fi testat și folosit în pagini.
// Costul e o ESTIMARE pentru reperul organizației; factura reală e în consola Anthropic a organizației.

export type PretModel = { intrare: number; iesire: number; cacheCitire: number; cacheScriere: number };

// Cache: citirea costă ~0,1× intrarea, scrierea (5 minute) ~1,25×.
const p = (intrare: number, iesire: number, cacheCitire = intrare * 0.1): PretModel => ({ intrare, iesire, cacheCitire, cacheScriere: intrare * 1.25 });

export const PRETURI: Record<string, PretModel> = {
  "claude-opus-5-5": p(4, 20, 0.2),
  "claude-opus-5": p(5, 25, 0.5),
  "claude-opus-4-8": p(5, 25, 0.5),
  "claude-sonnet-5-5": p(2, 10, 0.2),
  "claude-sonnet-5": p(2, 10, 0.2),
  "claude-haiku-5-5": p(0.1, 0.5, 0.01),
  "claude-fable-5-1": p(10, 50, 0.25),
};

// Căutarea web (instrument server): 10 USD la 1000 de căutări.
export const USD_PE_CAUTARE_WEB = 10 / 1000;

// Modelele pe care organizația le poate alege; primul e cel implicit.
export const MODELE_ALESE = ["claude-opus-5-5", "claude-sonnet-5-5", "claude-haiku-5-5"] as const;
export type ModelAles = (typeof MODELE_ALESE)[number];
export const MODEL_IMPLICIT: ModelAles = "claude-opus-5-5";

export const eModelAles = (v: unknown): v is ModelAles => typeof v === "string" && (MODELE_ALESE as readonly string[]).includes(v);

export type Utilizare = { tokeniIn: number; tokeniOut: number; tokeniCacheCitire: number; tokeniCacheScriere: number; cautariWeb: number };

export const UTILIZARE_GOALA: Utilizare = { tokeniIn: 0, tokeniOut: 0, tokeniCacheCitire: 0, tokeniCacheScriere: 0, cautariWeb: 0 };

export function adunaUtilizare(a: Utilizare, b: Utilizare): Utilizare {
  return {
    tokeniIn: a.tokeniIn + b.tokeniIn,
    tokeniOut: a.tokeniOut + b.tokeniOut,
    tokeniCacheCitire: a.tokeniCacheCitire + b.tokeniCacheCitire,
    tokeniCacheScriere: a.tokeniCacheScriere + b.tokeniCacheScriere,
    cautariWeb: a.cautariWeb + b.cautariWeb,
  };
}

// Modelul care a răspuns poate diferi de cel cerut (fallback la refuz): prețul se ia după cel care a răspuns; un model necunoscut cade pe prețul celui cerut,
// iar dacă nici acela nu e cunoscut, pe cel mai scump dintre cele alese (mai bine o estimare prudentă decât una prea mică).
export function pretPentru(model: string, modelCerut?: string): PretModel {
  return PRETURI[model] ?? (modelCerut ? PRETURI[modelCerut] : undefined) ?? PRETURI[MODEL_IMPLICIT];
}

// Costul în USD, rotunjit la a șasea zecimală (cât păstrează baza de date).
export function costUsd(model: string, u: Utilizare, modelCerut?: string): number {
  const pret = pretPentru(model, modelCerut);
  const total =
    (u.tokeniIn * pret.intrare + u.tokeniOut * pret.iesire + u.tokeniCacheCitire * pret.cacheCitire + u.tokeniCacheScriere * pret.cacheScriere) / 1_000_000 +
    u.cautariWeb * USD_PE_CAUTARE_WEB;
  return Math.round(total * 1e6) / 1e6;
}
