// Partea pură (fără importuri, fără DB) a filtrelor din lista Companii care țin de rândul principal: Sponsorii noștri / Nu sunt sponsori, Contact (cu / fără / găsit cu AI),
// Waalaxy (netrimise / trimise, doar administrator), Deep Search, etichetele filtrelor active, memorarea ultimei liste și memoria de 2 minute a numerelor.
// Se citește din filters.ts (parseFiltru) și se testează direct în tests/companii-filtre.test.mjs.

export type ContactFiltru = "toate" | "cu" | "fara" | "ai";
export type SponsorFiltru = "" | "da" | "nu";
export type WaalaxyFiltru = "" | "netrimise" | "trimise";
export type FiltreExtra = { contact: ContactFiltru; sponsor: SponsorFiltru; waalaxy: WaalaxyFiltru; deep: boolean };

type Citire = { get(cheie: string): string | null };

// Parametri din adresă: ?contact=cu|fara|ai · ?sponsori=1 · ?nesponsori=1 (dacă sunt ambii, „sponsorii noștri” câștigă) · ?waalaxy=netrimise|trimise · ?deep=1.
export function parseFiltreExtra(sp: Citire): FiltreExtra {
  const contact = sp.get("contact");
  const waalaxy = sp.get("waalaxy");
  return {
    contact: contact === "cu" || contact === "fara" || contact === "ai" ? contact : "toate",
    sponsor: sp.get("sponsori") === "1" ? "da" : sp.get("nesponsori") === "1" ? "nu" : "",
    waalaxy: waalaxy === "netrimise" || waalaxy === "trimise" ? waalaxy : "",
    deep: sp.get("deep") === "1",
  };
}

// Parametrii URL pentru „sponsor”: unul îl exclude pe celălalt.
export function parametriSponsor(valoare: SponsorFiltru): { sponsori: string | null; nesponsori: string | null } {
  return { sponsori: valoare === "da" ? "1" : null, nesponsori: valoare === "nu" ? "1" : null };
}

// Waalaxy e doar pentru administratori: pentru ceilalți parametrul din adresă se ignoră (și în pagină, și în interogări).
export function waalaxyPermis(valoare: WaalaxyFiltru, esteAdmin: boolean): WaalaxyFiltru {
  return esteAdmin ? valoare : "";
}

// ===== Filtrele active, ca etichete cu ✕ =====
export type FiltruActivabil = {
  perioadaTip: string;
  judet: string;
  contact: string;
  functie: readonly string[];
  functieText: string;
  banda: string;
  ordine: string;
  eligibil: boolean;
  sprint: boolean;
  cald: boolean;
  imbogatit: boolean;
  vezi: string;
};

export type FiltruActiv = { id: string; valoare?: string; scoate: Record<string, string | string[] | null> };

// Filtrele care pot ascunde firme și nu au un buton propriu pe rândul principal (acelea se văd singure). Fiecare are `scoate`: parametrii care se șterg din adresă.
export function filtreActive(f: FiltruActivabil): FiltruActiv[] {
  const l: FiltruActiv[] = [];
  if (f.vezi === "lucrate") l.push({ id: "lucrate", scoate: { vezi: null } });
  if (f.perioadaTip !== "toate") l.push({ id: "perioada", valoare: f.perioadaTip, scoate: { perioada: null, luna: null, saptamana: null, dataStart: null, dataSfarsit: null } });
  if (f.judet !== "toate") l.push({ id: "judet", valoare: f.judet, scoate: { judet: null } });
  if (f.contact !== "toate") l.push({ id: "contact", valoare: f.contact, scoate: { contact: null } });
  if (f.functie.length > 0 || f.functieText.trim()) l.push({ id: "functie", valoare: [...f.functie, f.functieText.trim()].filter(Boolean).join(", "), scoate: { functie: [], functieq: null } });
  if (f.banda) l.push({ id: "banda", valoare: f.banda, scoate: { banda: null } });
  if (f.ordine) l.push({ id: "ordine", valoare: f.ordine, scoate: { ordine: null } });
  if (f.eligibil) l.push({ id: "eligibil", scoate: { elig: null } });
  if (f.sprint) l.push({ id: "sprint", scoate: { sprint: null } });
  if (f.cald) l.push({ id: "cald", scoate: { cald: null } });
  if (f.imbogatit) l.push({ id: "imbogatit", scoate: { imbogatit: null } });
  return l;
}

// ===== Ultima listă a fiecărui coleg =====
// Doar parametrii cunoscuți ai listei se păstrează (nimic altceva nu ajunge într-un redirect) și `r=1` („pornește de la zero”) nu se memorează.
const PARAMETRI_LISTA = new Set([
  "perioada", "an", "luna", "saptamana", "dataStart", "dataSfarsit", "responsabil", "judet", "contact", "functie", "functieq", "banda", "ordine", "elig", "sprint", "cald",
  "imbogatit", "marcaj", "vezi", "q", "pagina", "top", "sponsori", "nesponsori", "waalaxy", "deep",
]);
export const LUNGIME_MAX_QS = 500;

export function curataQsLista(qs: string): string {
  let sp: URLSearchParams;
  try {
    sp = new URLSearchParams(String(qs ?? "").replace(/^\?/, ""));
  } catch {
    return "";
  }
  const iesire = new URLSearchParams();
  for (const [k, v] of sp) {
    const valoare = v.trim().slice(0, 120);
    if (!PARAMETRI_LISTA.has(k) || valoare === "") continue;
    iesire.append(k, valoare);
  }
  const text = iesire.toString();
  return text.length <= LUNGIME_MAX_QS ? text : "";
}

// ===== Numerele din selecte: memorate 2 minute pe combinația de filtre =====
export const TTL_NUMERE_MS = 120_000;
export const LIMITA_NUMERE_MS = 5_000;

export type NumereFiltre = { cu: number; fara: number; ai: number; netrimise: number | null; trimise: number | null };

// Cheia memoriei: ORGANIZAȚIA (nicio cifră nu trece între organizații), plus filtrele care schimbă numerele; pagina, sortarea și „Top” nu le schimbă.
// „Lucrate recent” depinde de colegul care întreabă, deci cheia primește și utilizatorul.
export function cheieNumere(orgId: string, userId: string, f: Record<string, unknown>, esteAdmin: boolean): string {
  const { pagina: _pagina, top: _top, ordine: _ordine, ...ramas } = f;
  void _pagina;
  void _top;
  void _ordine;
  const sortat = Object.keys(ramas)
    .sort()
    .map((k) => [k, ramas[k]]);
  return JSON.stringify({ o: orgId, u: f.vezi === "recente" ? userId : null, a: esteAdmin, f: sortat });
}

type Intrare<T> = { la: number; valoare: T };

// Memorie în RAM cu durată de viață și plafon de intrări (cele mai vechi ies primele). `acum` se poate injecta (teste).
export function creeazaMemorie<T>(optiuni: { ttlMs: number; max: number; acum?: () => number }) {
  const harta = new Map<string, Intrare<T>>();
  const acum = optiuni.acum ?? Date.now;
  return {
    citeste(cheie: string): T | undefined {
      const i = harta.get(cheie);
      if (!i) return undefined;
      if (acum() - i.la >= optiuni.ttlMs) {
        harta.delete(cheie);
        return undefined;
      }
      return i.valoare;
    },
    scrie(cheie: string, valoare: T): void {
      harta.delete(cheie);
      harta.set(cheie, { la: acum(), valoare });
      while (harta.size > optiuni.max) {
        const prima = harta.keys().next().value;
        if (prima === undefined) break;
        harta.delete(prima);
      }
    },
    get size() {
      return harta.size;
    },
  };
}

// Rezultatul unei interogări lente cu limită de timp FĂRĂ să întrerupă conexiunea: dacă nu se termină la timp, întoarce null (eticheta apare fără număr), iar interogarea
// rămasă în urmă își termină treaba în fundal și își scrie rezultatul în memorie pentru următoarea cerere.
export async function cuLimita<T>(promisiune: Promise<T>, ms: number, cb: { laSfarsit?: (valoare: T) => void; laEroare?: (e: unknown) => void } = {}): Promise<T | null> {
  let termen: ReturnType<typeof setTimeout> | undefined;
  const intarziat = new Promise<null>((r) => {
    termen = setTimeout(() => r(null), ms);
  });
  const urmarita = promisiune.then(
    (v) => {
      cb.laSfarsit?.(v);
      return v;
    },
    (e) => {
      cb.laEroare?.(e);
      return null;
    },
  );
  try {
    return await Promise.race([urmarita, intarziat]);
  } finally {
    if (termen) clearTimeout(termen);
  }
}
