// Registrul de timp pentru munca custom și suportul unei organizații: cine a lucrat, la ce, cât. Echipa platformei îl completează (manual sau cu timer), clientul își vede
// doar timpul (dacă pagina „Timp alocat” e activată pentru el), iar tarifele și suma de facturat rămân doar la echipa platformei. Funcții pure, fără importuri externe,
// ca să se poată folosi în pagini, în acțiuni și în teste.

export const EXECUTANTI = { claude: "Claude", echipa: "Echipa noastră" } as const;
export type Executant = keyof typeof EXECUTANTI;

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

const are = (obiect: object, cheie: string) => Object.prototype.hasOwnProperty.call(obiect, cheie);

export type IntrareTimp = { executant: Executant; categorie: Categorie; descriere: string; minute: number; data: string };
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
  if (typeof o.executant !== "string" || !are(EXECUTANTI, o.executant)) return { ok: false, eroare: "Alege cine a lucrat." };
  if (typeof o.categorie !== "string" || !are(CATEGORII, o.categorie)) return { ok: false, eroare: "Alege categoria." };
  const descriere = curataDescriere(o.descriere);
  if (descriere === null) return { ok: false, eroare: `Descrierea trebuie să aibă între ${LUNGIME_MINIMA_DESCRIERE} și ${LUNGIME_MAXIMA_DESCRIERE} de caractere.` };
  const minute = typeof o.minute === "number" ? (Number.isInteger(o.minute) && o.minute >= 1 && o.minute <= MINUTE_MAXIME_INTRARE ? o.minute : null) : parseDurata(o.minute);
  if (minute === null) return { ok: false, eroare: "Durată invalidă (de exemplu 90, 1h30, 1:30 sau 2h; maximum 24 de ore)." };
  const data = dataValida(o.data);
  if (data === null) return { ok: false, eroare: "Dată invalidă." };
  return { ok: true, valoare: { executant: o.executant as Executant, categorie: o.categorie as Categorie, descriere, minute, data } };
}

// Timerul: minutele între pornire și oprire, rotunjite în sus (un timer oprit imediat tot înseamnă 1 minut), cu plafon de 24 de ore ca să nu rămână un timer uitat pornit
// zile întregi.
export function minuteDinTimer(pornitMs: number, opritMs: number): number {
  const minute = Math.ceil((opritMs - pornitMs) / 60_000);
  return Math.min(MINUTE_MAXIME_INTRARE, Math.max(1, minute));
}

export type Moneda = "RON" | "EUR";
export type Tarife = { claude: number; echipa: number; moneda: Moneda };
export type RezultatTarife = { ok: true; valoare: Tarife } | { ok: false; eroare: string };

const TARIF_MAXIM = 100_000;

// Tarife pe oră, pozitive sau zero, cu cel mult 2 zecimale. Acceptă și text cu virgulă („150,50”).
export function valideazaTarife(brut: unknown): RezultatTarife {
  if (typeof brut !== "object" || brut === null || Array.isArray(brut)) return { ok: false, eroare: "Tarife invalide." };
  const o = brut as Record<string, unknown>;
  const numar = (x: unknown): number | null => {
    const n = typeof x === "number" ? x : typeof x === "string" && /^\d{1,6}(?:[.,]\d{1,2})?$/.test(x.trim()) ? Number(x.trim().replace(",", ".")) : NaN;
    // cel mult 2 zecimale și pentru numere (nu rotunjim în tăcere o valoare cu mai multe)
    return Number.isFinite(n) && n >= 0 && n <= TARIF_MAXIM && Math.abs(n * 100 - Math.round(n * 100)) < 1e-6 ? Math.round(n * 100) / 100 : null;
  };
  const claude = numar(o.claude);
  const echipa = numar(o.echipa);
  if (claude === null || echipa === null) return { ok: false, eroare: `Tarifele pe oră trebuie să fie numere între 0 și ${TARIF_MAXIM}, cu cel mult 2 zecimale.` };
  if (o.moneda !== "RON" && o.moneda !== "EUR") return { ok: false, eroare: "Moneda trebuie să fie RON sau EUR." };
  return { ok: true, valoare: { claude, echipa, moneda: o.moneda } };
}

// Suma pentru un număr de minute la un tarif pe oră, rotunjită la 2 zecimale (se rotunjește suma, nu minutele).
export const sumaPentru = (minute: number, tarifOra: number): number => Math.round((minute / 60) * tarifOra * 100) / 100;

export type Totaluri = {
  minute: number;
  peExecutant: Record<Executant, number>;
  peCategorie: Record<Categorie, number>;
  // Doar când se dau tarife (echipa platformei): suma de facturat pe executant și totală.
  suma: { claude: number; echipa: number; total: number; moneda: Moneda } | null;
};

export function totaluri(intrari: { executant: Executant; categorie: Categorie; minute: number }[], tarife: Tarife | null): Totaluri {
  const peExecutant: Record<Executant, number> = { claude: 0, echipa: 0 };
  const peCategorie: Record<Categorie, number> = { custom: 0, integrare: 0, suport: 0, altele: 0 };
  for (const i of intrari) {
    peExecutant[i.executant] += i.minute;
    peCategorie[i.categorie] += i.minute;
  }
  const minute = peExecutant.claude + peExecutant.echipa;
  const suma = tarife
    ? (() => {
        const claude = sumaPentru(peExecutant.claude, tarife.claude);
        const echipa = sumaPentru(peExecutant.echipa, tarife.echipa);
        return { claude, echipa, total: Math.round((claude + echipa) * 100) / 100, moneda: tarife.moneda };
      })()
    : null;
  return { minute, peExecutant, peCategorie, suma };
}
