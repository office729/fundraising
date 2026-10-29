// Calculul sloturilor libere ale calendarului intern de programări. Funcții pure, fără importuri externe, ca să se testeze (inclusiv trecerea la ora de vară/iarnă).
// Programul și excepțiile sunt în ora României (Europe/Bucharest); sloturile se întorc ca momente UTC (ISO), iar interfața le afișează în ora României.

export const FUS_ORAR = "Europe/Bucharest";

export type Interval = { zi: number; de: string; pana: string }; // zi: 1 = luni … 7 = duminică; de/pana: "HH:MM"
export type Exceptie = { data: string; tip: "liber" | "program"; de?: string | null; pana?: string | null }; // data: "YYYY-MM-DD"
export type ConfigProgramari = {
  pasMin: number; // din câte în câte minute începe un slot (ex. 30)
  pauzaMin: number; // pauza minimă între două întâlniri
  preavizOre: number; // cât de aproape de acum se poate programa cineva
  orizontZile: number; // cât de departe în viitor se poate programa
  maxPePezi: number; // 0 = fără limită
};
export const CONFIG_IMPLICITA: ConfigProgramari = { pasMin: 30, pauzaMin: 0, preavizOre: 12, orizontZile: 45, maxPePezi: 0 };
export type Ocupat = { start: Date; sfarsit: Date };

const MIN = 60_000;
const ZI_MS = 86_400_000;
const DATA_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const ORA_RE = /^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/;

export const esteData = (x: unknown): x is string => {
  if (typeof x !== "string") return false;
  const m = DATA_RE.exec(x);
  if (!m) return false;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return d.getUTCFullYear() === Number(m[1]) && d.getUTCMonth() === Number(m[2]) - 1 && d.getUTCDate() === Number(m[3]);
};
export const esteOra = (x: unknown): x is string => typeof x === "string" && ORA_RE.test(x);
export const oraScurta = (x: string): string => x.slice(0, 5);
const minute = (hhmm: string): number => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
const hhmm = (min: number): string => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

// Diferența dintre ora locală din România și UTC la un moment dat (în ms), din regulile Intl (ține cont de ora de vară).
function decalaj(utcMs: number): number {
  const p = new Intl.DateTimeFormat("en-US", { timeZone: FUS_ORAR, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }).formatToParts(new Date(utcMs));
  const g = (t: string) => Number(p.find((x) => x.type === t)?.value);
  return Date.UTC(g("year"), g("month") - 1, g("day"), g("hour"), g("minute"), g("second")) - Math.floor(utcMs / 1000) * 1000;
}

// „2026-10-28” + „10:30” în ora României -> momentul UTC; null dacă ora locală nu există (golul de la trecerea la ora de vară).
export function localLaUtc(data: string, ora: string): Date | null {
  const m = DATA_RE.exec(data);
  if (!m || !esteOra(ora)) return null;
  const naiv = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(ora.slice(0, 2)), Number(ora.slice(3, 5)));
  let utc = naiv - decalaj(naiv);
  utc = naiv - decalaj(utc); // a doua trecere: corectează în jurul schimbării de oră
  const rez = new Date(utc);
  return decalaj(utc) + utc === naiv ? rez : null;
}

// Data (YYYY-MM-DD) și ora („HH:MM”) locale ale unui moment, în ora României.
export function localDinUtc(d: Date): { data: string; ora: string } {
  const loc = new Date(d.getTime() + decalaj(d.getTime()));
  const iso = loc.toISOString();
  return { data: iso.slice(0, 10), ora: iso.slice(11, 16) };
}

// 1 = luni … 7 = duminică, pentru o dată calendaristică.
export function ziSaptamana(data: string): number {
  const m = DATA_RE.exec(data)!;
  const z = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))).getUTCDay();
  return z === 0 ? 7 : z;
}

export function adaugaZile(data: string, n: number): string {
  const m = DATA_RE.exec(data)!;
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) + n * ZI_MS).toISOString().slice(0, 10);
}

const suprapune = (a0: number, a1: number, b0: number, b1: number) => a0 < b1 && a1 > b0;

// Intervalele zilei: o excepție „liber” închide ziua; excepțiile „program” înlocuiesc programul săptămânal; altfel programul săptămânal.
export function intervaleleZilei(data: string, saptamanal: Interval[], exceptii: Exceptie[]): { de: string; pana: string }[] {
  const deZi = exceptii.filter((e) => e.data === data);
  if (deZi.some((e) => e.tip === "liber")) return [];
  const speciale = deZi.filter((e) => e.tip === "program" && esteOra(e.de) && esteOra(e.pana) && minute(e.de!) < minute(e.pana!));
  if (speciale.length > 0) return speciale.map((e) => ({ de: oraScurta(e.de!), pana: oraScurta(e.pana!) }));
  const z = ziSaptamana(data);
  return saptamanal.filter((i) => i.zi === z && esteOra(i.de) && esteOra(i.pana) && minute(i.de) < minute(i.pana)).map((i) => ({ de: oraScurta(i.de), pana: oraScurta(i.pana) }));
}

export type Slot = { startUtc: string; ora: string }; // ora = „HH:MM” în ora României

export function sloturiPeZi(p: {
  data: string;
  durataMin: number;
  config: ConfigProgramari;
  saptamanal: Interval[];
  exceptii: Exceptie[];
  ocupate: Ocupat[];
  acum: Date;
}): Slot[] {
  const { data, durataMin, config, acum } = p;
  if (!esteData(data) || durataMin < 1) return [];
  const pas = Math.max(5, Math.round(config.pasMin) || 30);
  const pauza = Math.max(0, Math.round(config.pauzaMin) || 0);
  const devreme = acum.getTime() + Math.max(0, config.preavizOre) * 60 * MIN;
  const tarziu = acum.getTime() + Math.max(1, config.orizontZile) * ZI_MS;

  const interval = intervaleleZilei(data, p.saptamanal, p.exceptii);
  // Câte întâlniri sunt deja în ziua aceea (după ora României), pentru plafonul zilnic.
  if (config.maxPePezi > 0) {
    const deja = p.ocupate.filter((o) => localDinUtc(o.start).data === data).length;
    if (deja >= config.maxPePezi) return [];
  }
  const rez: Slot[] = [];
  const vazute = new Set<string>();
  for (const iv of interval) {
    for (let m = minute(iv.de); m + durataMin <= minute(iv.pana); m += pas) {
      const start = localLaUtc(data, hhmm(m));
      if (!start) continue;
      const s = start.getTime();
      const e = s + durataMin * MIN;
      if (s < devreme || s > tarziu) continue;
      if (p.ocupate.some((o) => suprapune(s, e + pauza * MIN, o.start.getTime() - pauza * MIN, o.sfarsit.getTime() + pauza * MIN))) continue;
      const k = start.toISOString();
      if (vazute.has(k)) continue;
      vazute.add(k);
      rez.push({ startUtc: k, ora: hhmm(m) });
    }
  }
  return rez.sort((a, b) => a.startUtc.localeCompare(b.startUtc));
}

// Zilele unei luni care au cel puțin un slot liber (pentru marcarea lor în calendar).
export function zileDisponibileInLuna(p: { an: number; luna: number; durataMin: number; config: ConfigProgramari; saptamanal: Interval[]; exceptii: Exceptie[]; ocupate: Ocupat[]; acum: Date }): string[] {
  const zile: string[] = [];
  const prima = `${p.an}-${String(p.luna).padStart(2, "0")}-01`;
  if (!esteData(prima)) return zile;
  for (let i = 0; i < 31; i++) {
    const data = adaugaZile(prima, i);
    if (data.slice(0, 7) !== prima.slice(0, 7)) break;
    if (sloturiPeZi({ ...p, data }).length > 0) zile.push(data);
  }
  return zile;
}

// Un moment ales de vizitator e valid doar dacă e exact unul dintre sloturile libere ale zilei lui.
export function esteSlotValid(startUtc: Date, p: Omit<Parameters<typeof sloturiPeZi>[0], "data">): boolean {
  const { data } = localDinUtc(startUtc);
  return sloturiPeZi({ ...p, data }).some((s) => s.startUtc === startUtc.toISOString());
}

// Validarea setărilor generale venite din formularul de administrare.
export function curataConfig(x: unknown): ConfigProgramari {
  const r = (x && typeof x === "object" ? x : {}) as Record<string, unknown>;
  const n = (v: unknown, min: number, max: number, implicit: number) => {
    const t = Number(v);
    return Number.isFinite(t) ? Math.min(max, Math.max(min, Math.round(t))) : implicit;
  };
  return {
    pasMin: n(r.pasMin, 5, 240, CONFIG_IMPLICITA.pasMin),
    pauzaMin: n(r.pauzaMin, 0, 240, CONFIG_IMPLICITA.pauzaMin),
    preavizOre: n(r.preavizOre, 0, 24 * 30, CONFIG_IMPLICITA.preavizOre),
    orizontZile: n(r.orizontZile, 1, 365, CONFIG_IMPLICITA.orizontZile),
    maxPePezi: n(r.maxPePezi, 0, 50, CONFIG_IMPLICITA.maxPePezi),
  };
}

// ---------- fișier .ics (Adaugă în calendar) ----------

const ics = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
const icsData = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

// RFC 5545: liniile mai lungi de 75 de octeți se pliază (continuarea începe cu un spațiu).
function plia(linie: string): string {
  const enc = new TextEncoder();
  if (enc.encode(linie).length <= 75) return linie;
  const iesire: string[] = [];
  let curent = "";
  for (const c of linie) {
    if (enc.encode(curent + c).length > (iesire.length === 0 ? 75 : 74)) {
      iesire.push(curent);
      curent = c;
    } else curent += c;
  }
  iesire.push(curent);
  return iesire.join("\r\n ");
}

export function genereazaIcs(p: { uid: string; start: Date; sfarsit: Date; titlu: string; descriere?: string | null; locatie?: string | null; creatLa?: Date }): string {
  const linii = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Alexandrit//Programari//RO",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${p.uid}@alexandrit.ro`,
    `DTSTAMP:${icsData(p.creatLa ?? new Date())}`,
    `DTSTART:${icsData(p.start)}`,
    `DTEND:${icsData(p.sfarsit)}`,
    `SUMMARY:${ics(p.titlu)}`,
    ...(p.descriere ? [`DESCRIPTION:${ics(p.descriere)}`] : []),
    ...(p.locatie ? [`LOCATION:${ics(p.locatie)}`] : []),
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return linii.map(plia).join("\r\n") + "\r\n";
}

// ---------- setările paginii (texte) ----------

export type SetariProgramari = ConfigProgramari & {
  titlu: string; // titlul paginii de programare
  intro: string; // textul de sub titlu
  mesajConfirmare: string; // mesajul afișat și trimis după programare
  emailNotificare: string; // unde ajunge vestea unei noi programări (gol = adresa implicită)
  cereTelefon: boolean; // telefonul devine obligatoriu
};
export const SETARI_IMPLICITE: SetariProgramari = {
  ...CONFIG_IMPLICITA,
  titlu: "Programează o sesiune cu Vlad Plăcintă",
  intro: "Alege ziua și ora care ți se potrivesc. Primești confirmarea pe email, cu un link prin care poți anula sau muta programarea.",
  mesajConfirmare: "Te așteptăm! Dacă te răzgândești, folosește linkul din emailul de confirmare.",
  emailNotificare: "",
  cereTelefon: false,
};

const text = (v: unknown, max: number, implicit: string): string => (typeof v === "string" ? v.trim().slice(0, max) : implicit);

export function curataSetari(x: unknown): SetariProgramari {
  const r = (x && typeof x === "object" ? x : {}) as Record<string, unknown>;
  const email = text(r.emailNotificare, 120, "");
  return {
    ...curataConfig(r),
    titlu: text(r.titlu, 120, SETARI_IMPLICITE.titlu) || SETARI_IMPLICITE.titlu,
    intro: text(r.intro, 600, SETARI_IMPLICITE.intro),
    mesajConfirmare: text(r.mesajConfirmare, 600, SETARI_IMPLICITE.mesajConfirmare),
    emailNotificare: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "",
    cereTelefon: r.cereTelefon === true,
  };
}

// ---------- datele din formularul de programare ----------

export type DatePersoana = { nume: string; email: string; telefon: string; organizatie: string; mesaj: string };

export function valideazaPersoana(x: unknown, cereTelefon: boolean): { ok: true; date: DatePersoana } | { ok: false; erori: Partial<Record<keyof DatePersoana, string>> } {
  const r = (x && typeof x === "object" ? x : {}) as Record<string, unknown>;
  const t = (k: string, max: number) => (typeof r[k] === "string" ? (r[k] as string).trim().slice(0, max) : "");
  const date: DatePersoana = { nume: t("nume", 120), email: t("email", 160).toLowerCase(), telefon: t("telefon", 40), organizatie: t("organizatie", 160), mesaj: t("mesaj", 1000) };
  const erori: Partial<Record<keyof DatePersoana, string>> = {};
  if (date.nume.length < 2) erori.nume = "Scrie-ți numele.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(date.email)) erori.email = "Adresa de email nu pare corectă.";
  if (date.telefon && !/^[+\d\s().-]{6,40}$/.test(date.telefon)) erori.telefon = "Numărul de telefon nu pare corect.";
  if (cereTelefon && !date.telefon) erori.telefon = "Scrie un număr de telefon.";
  return Object.keys(erori).length ? { ok: false, erori } : { ok: true, date };
}
