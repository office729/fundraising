// Registrul de timp alocat unei organizații pentru munca custom, integrări și suport: cât timp a alocat echipa (nu cât a „calculat” un instrument AI), la ce, cu ce rezultat.
// Echipa platformei îl completează (manual sau cu timer); clientul își vede doar timpul și banca de ore (dacă pagina „Timp alocat” e activată pentru el), iar tariful și suma
// de facturat rămân doar la echipa platformei. Timpul e al echipei: munca cu asistență AI se marchează cu un indicator (cuAi), nu se numără separat. Funcții pure, fără
// importuri externe, ca să se poată folosi în pagini, în acțiuni și în teste.

export const CATEGORII = {
  custom: "Modificare custom",
  integrare: "Integrare cu alt tool (Apollo, Lusha etc.)",
  suport: "Suport",
  altele: "Altele",
} as const;
export type Categorie = keyof typeof CATEGORII;

export const MINUTE_MAXIME_INTRARE = 24 * 60;
export const LUNGIME_MINIMA_DESCRIERE = 3;
export const LUNGIME_MAXIMA_DESCRIERE = 300;
// Pragul de la care clientul e avertizat că pachetul de ore se apropie de sfârșit (orele din pachet se setează în configurarea de aspect: lib/personalizare-org.ts).
export const PRAG_ATENTIE_PACHET = 0.8;

const are = (obiect: object, cheie: string) => Object.prototype.hasOwnProperty.call(obiect, cheie);

export type IntrareTimp = { categorie: Categorie; descriere: string; minute: number; data: string; cuAi: boolean };
export type RezultatIntrare = { ok: true; valoare: IntrareTimp } | { ok: false; eroare: string };

// „2h 30m”, „45m”, „1h”. Minute întregi, nenegative.
export function formateazaMinute(minute: number): string {
  const m = Math.max(0, Math.round(minute));
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h === 0) return `${r}m`;
  return r === 0 ? `${h}h` : `${h}h ${r}m`;
}

// Durata scrisă de om → minute. Acceptă: „90” (minute), „90m”, „1h”, „1,5h”, „1h30”, „1h 30m”, „1:30”. Întoarce null dacă nu o înțelege sau e în afara 1–1440.
export function parseDurata(text: unknown): number | null {
  if (typeof text !== "string") return null;
  const t = text.trim().toLowerCase().replace(/\s+/g, " ");
  let minute: number | null = null;
  let m: RegExpMatchArray | null;
  if ((m = t.match(/^(\d{1,4})$/))) minute = Number(m[1]);
  else if ((m = t.match(/^(\d{1,4}) ?m(?:in)?$/))) minute = Number(m[1]);
  else if ((m = t.match(/^(\d{1,2}):(\d{1,2})$/))) minute = Number(m[1]) * 60 + Number(m[2]);
  else if ((m = t.match(/^(\d{1,2})(?:[.,](\d{1,2}))? ?h(?:ours?)?$/))) minute = Math.round(Number(`${m[1]}.${m[2] ?? "0"}`) * 60);
  else if ((m = t.match(/^(\d{1,2}) ?h(?:ours?)? ?(\d{1,2})(?: ?m(?:in)?)?$/))) minute = Number(m[1]) * 60 + Number(m[2]);
  if (minute === null || !Number.isFinite(minute) || minute < 1 || minute > MINUTE_MAXIME_INTRARE) return null;
  return minute;
}

function dataValida(brut: unknown): string | null {
  if (typeof brut !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(brut)) return null;
  const d = new Date(`${brut}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== brut) return null;
  const an = Number(brut.slice(0, 4));
  return an >= 2024 && an <= 2100 ? brut : null;
}

// Descriere vizibilă clientului: text scurt, fără caractere de control (rândurile noi devin spații).
export function curataDescriere(brut: unknown): string | null {
  if (typeof brut !== "string") return null;
  const t = brut
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return t.length >= LUNGIME_MINIMA_DESCRIERE && t.length <= LUNGIME_MAXIMA_DESCRIERE ? t : null;
}

// Validare strictă a unei intrări primite de la client (acțiunile server nu se pot baza pe tipurile TypeScript). `minute` poate veni ca număr sau ca text („1h30”).
export function valideazaIntrare(brut: unknown): RezultatIntrare {
  if (typeof brut !== "object" || brut === null || Array.isArray(brut)) return { ok: false, eroare: "Intrare invalidă." };
  const o = brut as Record<string, unknown>;
  if (typeof o.categorie !== "string" || !are(CATEGORII, o.categorie)) return { ok: false, eroare: "Alege categoria." };
  const descriere = curataDescriere(o.descriere);
  if (descriere === null) return { ok: false, eroare: `Descrierea trebuie să aibă între ${LUNGIME_MINIMA_DESCRIERE} și ${LUNGIME_MAXIMA_DESCRIERE} de caractere.` };
  const minute = typeof o.minute === "number" ? (Number.isInteger(o.minute) && o.minute >= 1 && o.minute <= MINUTE_MAXIME_INTRARE ? o.minute : null) : parseDurata(o.minute);
  if (minute === null) return { ok: false, eroare: "Durată invalidă (de exemplu 90, 1h30, 1:30 sau 2h; maximum 24 de ore)." };
  const data = dataValida(o.data);
  if (data === null) return { ok: false, eroare: "Dată invalidă." };
  if (o.cuAi !== undefined && typeof o.cuAi !== "boolean") return { ok: false, eroare: "Indicatorul „cu asistență AI” trebuie să fie da sau nu." };
  return { ok: true, valoare: { categorie: o.categorie as Categorie, descriere, minute, data, cuAi: o.cuAi === true } };
}

// Timerul: minutele între pornire și oprire, rotunjite în sus (un timer oprit imediat tot înseamnă 1 minut), cu plafon de 24 de ore ca să nu rămână un timer uitat pornit
// zile întregi.
export function minuteDinTimer(pornitMs: number, opritMs: number): number {
  const minute = Math.ceil((opritMs - pornitMs) / 60_000);
  return Math.min(MINUTE_MAXIME_INTRARE, Math.max(1, minute));
}

export type Moneda = "RON" | "EUR";
// Un singur tarif pe oră pentru timpul echipei.
export type Tarife = { ora: number; moneda: Moneda };
export type RezultatTarife = { ok: true; valoare: Tarife } | { ok: false; eroare: string };

const TARIF_MAXIM = 100_000;

// Număr nenegativ cu cel mult 2 zecimale, din număr sau din text cu virgulă („150,50”); null dacă nu e valid sau depășește maximul.
function numarCuDouaZecimale(x: unknown, maxim: number): number | null {
  const n = typeof x === "number" ? x : typeof x === "string" && /^\d{1,6}(?:[.,]\d{1,2})?$/.test(x.trim()) ? Number(x.trim().replace(",", ".")) : NaN;
  return Number.isFinite(n) && n >= 0 && n <= maxim && Math.abs(n * 100 - Math.round(n * 100)) < 1e-6 ? Math.round(n * 100) / 100 : null;
}

export function valideazaTarife(brut: unknown): RezultatTarife {
  if (typeof brut !== "object" || brut === null || Array.isArray(brut)) return { ok: false, eroare: "Tarif invalid." };
  const o = brut as Record<string, unknown>;
  const ora = numarCuDouaZecimale(o.ora, TARIF_MAXIM);
  if (ora === null) return { ok: false, eroare: `Tariful pe oră trebuie să fie un număr între 0 și ${TARIF_MAXIM}, cu cel mult 2 zecimale.` };
  if (o.moneda !== "RON" && o.moneda !== "EUR") return { ok: false, eroare: "Moneda trebuie să fie RON sau EUR." };
  return { ok: true, valoare: { ora, moneda: o.moneda } };
}

// Suma pentru un număr de minute la un tarif pe oră, rotunjită la 2 zecimale (se rotunjește suma, nu minutele).
export const sumaPentru = (minute: number, tarifOra: number): number => Math.round((minute / 60) * tarifOra * 100) / 100;

export type Totaluri = {
  minute: number;
  // din care cu asistență AI (indicator, nu timp separat)
  minuteCuAi: number;
  peCategorie: Record<Categorie, number>;
  // Doar când se dă tariful (echipa platformei): suma de facturat.
  suma: { total: number; moneda: Moneda } | null;
};

export function totaluri(intrari: { categorie: Categorie; minute: number; cuAi?: boolean }[], tarife: Tarife | null): Totaluri {
  const peCategorie: Record<Categorie, number> = { custom: 0, integrare: 0, suport: 0, altele: 0 };
  let minute = 0;
  let minuteCuAi = 0;
  for (const i of intrari) {
    peCategorie[i.categorie] += i.minute;
    minute += i.minute;
    if (i.cuAi) minuteCuAi += i.minute;
  }
  return { minute, minuteCuAi, peCategorie, suma: tarife ? { total: sumaPentru(minute, tarife.ora), moneda: tarife.moneda } : null };
}

// Ziua de azi în România, „AAAA-LL-ZZ” (nu în UTC: o intrare de la 00:30 e din ziua nouă).
export const aziBucuresti = (acum: Date = new Date()): string => acum.toLocaleDateString("sv-SE", { timeZone: "Europe/Bucharest" });

// Minutele intrărilor din luna calendaristică a datei `azi` („AAAA-LL-ZZ”). Pentru pachetul lunar: banca de ore se resetează la începutul fiecărei luni.
export function minuteInLuna(intrari: { data: string; minute: number }[], azi: string): number {
  const luna = azi.slice(0, 7);
  return intrari.reduce((s, i) => (i.data.slice(0, 7) === luna ? s + i.minute : s), 0);
}

// „octombrie 2026” pentru luna datei „AAAA-LL-ZZ”, și „1 noiembrie” pentru următorul reset (prima zi a lunii următoare).
export const numeLuna = (azi: string): string => new Date(`${azi.slice(0, 7)}-01T12:00:00`).toLocaleDateString("ro-RO", { month: "long", year: "numeric" });
export function urmatorulReset(azi: string): string {
  const d = new Date(`${azi.slice(0, 7)}-01T12:00:00`);
  d.setMonth(d.getMonth() + 1);
  return d.toLocaleDateString("ro-RO", { day: "numeric", month: "long" });
}

export type StareBanca = "fara_pachet" | "in_limita" | "atentie" | "depasit";
export type BancaOre = {
  stare: StareBanca;
  minutePachet: number;
  minuteFolosite: number;
  // negativ când pachetul a fost depășit
  minuteRamase: number;
  // 0–1 (plafonat la 1 pentru bara de progres)
  procent: number;
};

// Banca de ore: ore incluse în pachet vs timp folosit. „atentie” de la 80%, „depasit” peste 100%.
export function bancaOre(minuteFolosite: number, orePachet: number | null | undefined): BancaOre {
  const minutePachet = orePachet && orePachet > 0 ? Math.round(orePachet * 60) : 0;
  if (minutePachet === 0) return { stare: "fara_pachet", minutePachet: 0, minuteFolosite, minuteRamase: 0, procent: 0 };
  const raport = minuteFolosite / minutePachet;
  const stare: StareBanca = raport > 1 ? "depasit" : raport >= PRAG_ATENTIE_PACHET ? "atentie" : "in_limita";
  return { stare, minutePachet, minuteFolosite, minuteRamase: minutePachet - minuteFolosite, procent: Math.min(1, Math.max(0, raport)) };
}
