// „Sursele donațiilor” (pagina de raport): partea PURĂ, fără importuri de valori, ca să ruleze identic pe server și în teste.
// Conține: parsarea filtrelor din adresă, calculul tabelului (donații, total EUR, medie, pondere), paginarea listei de donații și formatările.
// Interogările la baza de date sunt în raport.ts.
//
// Definiții (aceleași în pagină, în ajutor și în teste):
//  - „Donație plătită” = fundraising_donations.status = 'reusita' (setată doar de webhook-ul procesatorului de plăți). Nu intră: în așteptare, eșuate, rambursate
//    integral ('rambursata'). O rambursare PARȚIALĂ lasă donația 'reusita' și suma din raport rămâne cea de la început de plată.
//  - Data plății = fundraising_donations.created_at (nu există o coloană separată pentru momentul confirmării), în ora Europe/Bucharest.
//  - Suma = suma_eur_centi calculată O SINGURĂ DATĂ la început de plată. Null = conversie indisponibilă: donația se numără, dar NU se adaugă la sume și
//    NU intră în medie și în pondere (nu se tratează ca 0).

export const LIMITA_DETALII = 100;
const PAGINA_MAXIMA = 100_000;
const LUNGIME_CAMPANIE = 100;

export const CAMPANIE_FARA = "-"; // valoarea din adresă pentru „Fără campanie”
export const PREFIX_CAMPANIE = "n:"; // o campanie cu nume: n:<nume> (prefixul evită orice confuzie cu valoarea de mai sus)

export type CampanieFiltru = { tip: "toate" } | { tip: "fara" } | { tip: "nume"; nume: string };

export type FiltreSurse = {
  de: string | null; // YYYY-MM-DD, ora României, inclusiv
  pana: string | null; // YYYY-MM-DD, ora României, inclusiv
  sursa: string | null; // categorie din lista albă
  campanie: CampanieFiltru;
  detalii: string | null; // categoria a cărei listă de donații se afișează
  pagina: number; // pagina listei de donații, de la 1
};

export type ParametriAdresa = Record<string, string | string[] | undefined>;

// Un parametru repetat în adresă vine ca listă: se ia primul. Se plafonează lungimea înainte de orice altă prelucrare.
const primul = (sp: ParametriAdresa, cheie: string, max = 200): string | null => {
  const v = sp[cheie];
  const t = Array.isArray(v) ? v[0] : v;
  return typeof t === "string" ? t.slice(0, max) : null;
};

// Doar zile reale din calendar (nu 2026-02-30), într-un interval rezonabil.
export function esteZiValida(v: unknown): v is string {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const [a, l, z] = v.split("-").map(Number) as [number, number, number];
  if (a < 2000 || a > 2100) return false;
  const d = new Date(Date.UTC(a, l - 1, z));
  return d.getUTCFullYear() === a && d.getUTCMonth() === l - 1 && d.getUTCDate() === z;
}

// Textul unei campanii de marketing: fără caractere de control, spații la capete, cel mult 100 de caractere (ca la captare). Gol => null.
export function curataCampanie(v: string | null | undefined): string | null {
  if (typeof v !== "string") return null;
  const t = v.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, LUNGIME_CAMPANIE).trim();
  return t.length > 0 ? t : null;
}

// Valoarea unui filtru de campanie, așa cum apare în adresă: "" = toate, "-" = fără campanie, "n:<nume>" = o campanie (și un nume fără prefix, scris de mână).
export function parseazaCampanie(brut: string | null): CampanieFiltru {
  if (brut === null) return { tip: "toate" };
  const t = brut.trim();
  if (t === "") return { tip: "toate" };
  if (t === CAMPANIE_FARA) return { tip: "fara" };
  const nume = curataCampanie(t.startsWith(PREFIX_CAMPANIE) ? t.slice(PREFIX_CAMPANIE.length) : t);
  return nume ? { tip: "nume", nume } : { tip: "toate" };
}

export const valoareCampanie = (c: CampanieFiltru): string => (c.tip === "fara" ? CAMPANIE_FARA : c.tip === "nume" ? `${PREFIX_CAMPANIE}${c.nume}` : "");

// `categorii`: lista albă a surselor (CATEGORII din nucleu.ts). Orice valoare invalidă se ignoră (devine „toate”/pagina 1), nimic din adresă nu ajunge neverificat în SQL.
export function parseazaFiltre(sp: ParametriAdresa, categorii: readonly string[]): FiltreSurse {
  let de = primul(sp, "de", 12);
  let pana = primul(sp, "pana", 12);
  de = esteZiValida(de) ? de : null;
  pana = esteZiValida(pana) ? pana : null;
  if (de && pana && de > pana) [de, pana] = [pana, de]; // capetele inversate: le punem în ordine, ca să nu rezulte un raport gol din greșeală
  const sursaBruta = primul(sp, "sursa", 40)?.trim() ?? "";
  const sursa = categorii.includes(sursaBruta) ? sursaBruta : null;
  const detaliiBrute = primul(sp, "detalii", 40)?.trim() ?? "";
  // Lista de detalii trebuie să fie coerentă cu filtrul de sursă: cu o sursă aleasă, tabelul are un singur rând.
  const detalii = categorii.includes(detaliiBrute) && (!sursa || sursa === detaliiBrute) ? detaliiBrute : null;
  const p = primul(sp, "pagina", 7);
  const pagina = p && /^\d{1,6}$/.test(p) ? Math.min(Math.max(1, Number(p)), PAGINA_MAXIMA) : 1;
  return { de, pana, sursa, campanie: parseazaCampanie(primul(sp, "campanie", 140)), detalii, pagina: detalii ? pagina : 1 };
}

// Filtrele -> parametri de adresă (pentru linkurile de presetări, „Vezi donațiile” și paginare). Parametrii goi lipsesc.
export function parametriUrl(f: FiltreSurse): URLSearchParams {
  const q = new URLSearchParams();
  if (f.de) q.set("de", f.de);
  if (f.pana) q.set("pana", f.pana);
  if (f.sursa) q.set("sursa", f.sursa);
  const c = valoareCampanie(f.campanie);
  if (c) q.set("campanie", c);
  if (f.detalii) {
    q.set("detalii", f.detalii);
    if (f.pagina > 1) q.set("pagina", String(f.pagina));
  }
  return q;
}

// ---------- date calendaristice (fără fusuri: lucrăm cu șiruri YYYY-MM-DD) ----------

export function ziuaBucuresti(acum: number = Date.now()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Bucharest", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(acum));
}

export function adaugaZile(zi: string, n: number): string {
  const [a, l, z] = zi.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(a, l - 1, z + n)).toISOString().slice(0, 10);
}

export type Presetare = { cheie: "toate" | "30" | "90" | "an"; de: string | null; pana: string | null };

// Presetările perioadei, calculate din „azi” în ora României (ultimele 30/90 de zile includ ziua de azi).
export function presetari(azi: string): Presetare[] {
  return [
    { cheie: "toate", de: null, pana: null },
    { cheie: "30", de: adaugaZile(azi, -29), pana: azi },
    { cheie: "90", de: adaugaZile(azi, -89), pana: azi },
    { cheie: "an", de: `${azi.slice(0, 4)}-01-01`, pana: azi },
  ];
}

// ---------- tabelul pe surse ----------

// Un rând agregat din baza de date: donații plătite pe categorie, câte au conversie în EUR și suma lor (în cenți).
export type RandAgregat = { categorie: string; donatii: number; cuConversie: number; totalCenti: number };

export type RandSursa = {
  categorie: string;
  donatii: number;
  faraConversie: number; // donații fără conversie în EUR: numărate, dar neincluse în sume
  totalCenti: number | null; // null = nicio donație cu conversie în EUR (nu se afișează 0)
  medieCenti: number | null; // doar din donațiile cu conversie; null dacă nu există niciuna
  pondere: number | null; // % din totalul EUR afișat (o zecimală); null dacă totalul e 0 sau rândul nu are sumă
};
export type TotalSurse = { donatii: number; faraConversie: number; totalCenti: number | null; medieCenti: number | null };
export type RaportSurse = { randuri: RandSursa[]; total: TotalSurse };

// La fel ca pondere() din nucleu.ts (o zecimală); ținută aici ca fișierul să rămână fără importuri de valori. Un test verifică egalitatea.
export const procent = (parte: number, total: number): number | null => (total > 0 ? Math.round((parte / total) * 1000) / 10 : null);

const intNenegativ = (n: unknown): number => (typeof n === "number" && Number.isFinite(n) && n > 0 ? Math.round(n) : 0);

// `ordine`: ordinea categoriilor (CATEGORII), folosită doar la egalitate. Sortat descrescător după total EUR, apoi după numărul de donații.
// Rândurile fără donații nu apar (nu afișăm zero-uri înșelătoare); aceeași categorie primită de două ori se însumează.
export function calculeazaRaport(randuri: readonly RandAgregat[], ordine: readonly string[] = []): RaportSurse {
  const harta = new Map<string, { donatii: number; cuConversie: number; totalCenti: number }>();
  for (const r of randuri) {
    const donatii = intNenegativ(r.donatii);
    if (donatii === 0) continue;
    const x = harta.get(r.categorie) ?? { donatii: 0, cuConversie: 0, totalCenti: 0 };
    x.donatii += donatii;
    x.cuConversie += Math.min(intNenegativ(r.cuConversie), donatii);
    x.totalCenti += intNenegativ(r.totalCenti);
    harta.set(r.categorie, x);
  }
  const totalCenti = [...harta.values()].reduce((s, x) => s + x.totalCenti, 0);
  const donatiiTotal = [...harta.values()].reduce((s, x) => s + x.donatii, 0);
  const cuConversieTotal = [...harta.values()].reduce((s, x) => s + x.cuConversie, 0);
  const pozitie = (c: string) => {
    const i = ordine.indexOf(c);
    return i === -1 ? ordine.length : i;
  };
  const rez: RandSursa[] = [...harta.entries()].map(([categorie, x]) => ({
    categorie,
    donatii: x.donatii,
    faraConversie: x.donatii - x.cuConversie,
    totalCenti: x.cuConversie > 0 ? x.totalCenti : null,
    medieCenti: x.cuConversie > 0 ? Math.round(x.totalCenti / x.cuConversie) : null,
    pondere: x.cuConversie > 0 ? procent(x.totalCenti, totalCenti) : null,
  }));
  rez.sort((a, b) => (b.totalCenti ?? 0) - (a.totalCenti ?? 0) || b.donatii - a.donatii || pozitie(a.categorie) - pozitie(b.categorie) || a.categorie.localeCompare(b.categorie));
  return {
    randuri: rez,
    total: { donatii: donatiiTotal, faraConversie: donatiiTotal - cuConversieTotal, totalCenti: cuConversieTotal > 0 ? totalCenti : null, medieCenti: cuConversieTotal > 0 ? Math.round(totalCenti / cuConversieTotal) : null },
  };
}

// ---------- paginare ----------

export type Paginare = { pagina: number; pagini: number; offset: number; limita: number };

// Pagina cerută se aduce în intervalul valid (o pagină peste ultima cade pe ultima); fără rezultate există o singură pagină, goală.
export function paginare(total: number, pagina: number, limita: number = LIMITA_DETALII): Paginare {
  const t = intNenegativ(total);
  const pagini = Math.max(1, Math.ceil(t / limita));
  const p = Math.min(Math.max(1, Math.floor(Number.isFinite(pagina) ? pagina : 1)), pagini);
  return { pagina: p, pagini, offset: (p - 1) * limita, limita };
}

// ---------- afișare ----------

export type LimbaRaport = "ro" | "en";
const LOCALE_NUMERE: Record<LimbaRaport, string> = { ro: "ro-RO", en: "en-GB" };

export function formatEur(centi: number, limba: LimbaRaport = "ro"): string {
  return `${new Intl.NumberFormat(LOCALE_NUMERE[limba], { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(centi / 100)} EUR`;
}

export function formatProcent(p: number | null, limba: LimbaRaport = "ro"): string {
  return p === null ? "—" : `${new Intl.NumberFormat(LOCALE_NUMERE[limba], { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(p)}%`;
}
