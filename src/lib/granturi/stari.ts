// Logica pură a modulului Granturi (fără baze de date și fără alias-uri `@/`, ca să poată fi testată direct): stările unei cereri de
// finanțare, termenele, validarea intrărilor și rezumatul registrului.

export const STARI_GRANT = ["identificat", "in_pregatire", "aplicat", "castigat", "respins", "in_derulare", "raportat", "renuntat"] as const;
export type StareGrant = (typeof STARI_GRANT)[number];

export const ETICHETE_STARE: Record<StareGrant, string> = {
  identificat: "Identificat",
  in_pregatire: "În pregătire",
  aplicat: "Aplicat",
  castigat: "Câștigat",
  respins: "Respins",
  in_derulare: "În derulare",
  raportat: "Raportat",
  renuntat: "Renunțat",
};

// Cât timp cererea nu a fost depusă, termenul limită contează (alertă + reminder).
export const STARI_CU_TERMEN_DEPUNERE: readonly StareGrant[] = ["identificat", "in_pregatire"];
// Stările în care banii sunt (sau pot fi) ai organizației.
export const STARI_FINANTATE: readonly StareGrant[] = ["castigat", "in_derulare", "raportat"];
// Cererile închise: nu mai cer nimic de la echipă.
export const STARI_INCHISE: readonly StareGrant[] = ["raportat", "respins", "renuntat"];

export const TIPURI_FINANTATOR = ["corporate", "fundatie", "ue", "public", "platforma", "alt"] as const;
export type TipFinantator = (typeof TIPURI_FINANTATOR)[number];
export const ETICHETE_TIP: Record<TipFinantator, string> = {
  corporate: "Companie / fundație corporativă",
  fundatie: "Fundație",
  ue: "Fonduri europene",
  public: "Instituție publică",
  platforma: "Platformă / program",
  alt: "Altul",
};

export const MONEDE = ["RON", "EUR", "USD"] as const;
export type Moneda = (typeof MONEDE)[number];

export const esteStare = (x: unknown): x is StareGrant => typeof x === "string" && (STARI_GRANT as readonly string[]).includes(x);
export const esteTip = (x: unknown): x is TipFinantator => typeof x === "string" && (TIPURI_FINANTATOR as readonly string[]).includes(x);
export const esteMoneda = (x: unknown): x is Moneda => typeof x === "string" && (MONEDE as readonly string[]).includes(x);

const DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;

// Data calendaristică validă (YYYY-MM-DD) sau null. `2026-02-31` nu trece.
export function dataValida(x: unknown): string | null {
  if (typeof x !== "string" || !DATA_ISO.test(x)) return null;
  const [a, l, z] = x.split("-").map(Number);
  const d = new Date(Date.UTC(a, l - 1, z));
  return d.getUTCFullYear() === a && d.getUTCMonth() === l - 1 && d.getUTCDate() === z ? x : null;
}

// Zile calendaristice până la termen (negativ = depășit). Ambele date sunt YYYY-MM-DD, deci nu depind de fusul orar.
export function zileLaTermen(termen: string | null, azi: string): number | null {
  const t = dataValida(termen);
  const a = dataValida(azi);
  if (!t || !a) return null;
  const ms = (s: string) => {
    const [y, m, d] = s.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((ms(t) - ms(a)) / 86_400_000);
}

export type Urgenta = "depasit" | "azi" | "curand" | "ok" | "fara";

// Cât de aproape e termenul: azi, în următoarele 7 zile (curând), mai departe (ok) sau depășit.
export function urgentaTermen(zile: number | null): Urgenta {
  if (zile === null) return "fara";
  if (zile < 0) return "depasit";
  if (zile === 0) return "azi";
  return zile <= 7 ? "curand" : "ok";
}

// Ziua de azi în București (YYYY-MM-DD) — termenele se judecă după data de acasă, nu după UTC.
export function aziBucuresti(acum: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Bucharest", year: "numeric", month: "2-digit", day: "2-digit" }).format(acum);
}

// Text scurt, uman, pentru un termen: „în 3 zile”, „azi”, „depășit cu 2 zile”.
export function textTermen(zile: number | null): string {
  if (zile === null) return "fără termen";
  if (zile === 0) return "azi";
  if (zile === 1) return "mâine";
  if (zile === -1) return "depășit cu o zi";
  return zile > 0 ? `în ${zile} zile` : `depășit cu ${-zile} zile`;
}

export type ElementLista = { text: string; ok: boolean };

// Liste de bifat (eligibilitate, documente): maximum 40 de elemente, fiecare de cel mult 200 de caractere, fără rânduri goale.
export function curataLista(x: unknown): ElementLista[] {
  if (!Array.isArray(x)) return [];
  const rez: ElementLista[] = [];
  for (const e of x) {
    if (rez.length >= 40) break;
    if (!e || typeof e !== "object") continue;
    const text = String((e as { text?: unknown }).text ?? "").trim().slice(0, 200);
    if (text) rez.push({ text, ok: (e as { ok?: unknown }).ok === true });
  }
  return rez;
}

// Suma ca număr ≥ 0 cu două zecimale, sau null (gol / invalid / negativ).
export function sumaValida(x: unknown): number | null {
  if (x === null || x === undefined || x === "") return null;
  const n = typeof x === "number" ? x : Number(String(x).replace(",", "."));
  if (!Number.isFinite(n) || n < 0 || n > 1e12) return null;
  return Math.round(n * 100) / 100;
}

export type GrantRezumat = { stare: string; suma: number | null; sumaCastigata: number | null; moneda: string; termen: string | null };

export type RezumatRegistru = {
  total: number;
  inLucru: number; // identificate + în pregătire
  depuse: number; // aplicate, în așteptarea deciziei
  finantate: number; // câștigate, în derulare, raportate
  termeneCurand: number; // neacoperite, cu termen în 7 zile (inclusiv azi) sau depășit
  sumaFinantataPeMoneda: Record<string, number>;
  sumaCerutaPeMoneda: Record<string, number>; // aplicate, în așteptare
};

export function rezumaRegistru(randuri: GrantRezumat[], azi: string): RezumatRegistru {
  const r: RezumatRegistru = { total: randuri.length, inLucru: 0, depuse: 0, finantate: 0, termeneCurand: 0, sumaFinantataPeMoneda: {}, sumaCerutaPeMoneda: {} };
  for (const g of randuri) {
    if (STARI_CU_TERMEN_DEPUNERE.includes(g.stare as StareGrant)) {
      r.inLucru += 1;
      const u = urgentaTermen(zileLaTermen(g.termen, azi));
      if (u === "depasit" || u === "azi" || u === "curand") r.termeneCurand += 1;
    }
    if (g.stare === "aplicat") {
      r.depuse += 1;
      if (g.suma) r.sumaCerutaPeMoneda[g.moneda] = (r.sumaCerutaPeMoneda[g.moneda] ?? 0) + g.suma;
    }
    if (STARI_FINANTATE.includes(g.stare as StareGrant)) {
      r.finantate += 1;
      const s = g.sumaCastigata ?? g.suma;
      if (s) r.sumaFinantataPeMoneda[g.moneda] = (r.sumaFinantataPeMoneda[g.moneda] ?? 0) + s;
    }
  }
  return r;
}

// Câmpurile dosarului standard, în ordinea în care apar în formular. `cheie` e stabilă (se salvează în baza de date).
export const CAMPURI_DOSAR: { cheie: string; eticheta: string; ajutor: string; exemplu?: string; lung?: boolean }[] = [
  { cheie: "denumire", eticheta: "Denumirea oficială", ajutor: "Așa cum apare în actele de înființare.", exemplu: "Asociația Exemplu pentru Copii" },
  { cheie: "cui", eticheta: "CUI / cod fiscal", ajutor: "" },
  { cheie: "inregistrare", eticheta: "Înregistrare și statut", ajutor: "Număr în Registrul Asociațiilor și Fundațiilor, forma juridică, statut de utilitate publică dacă există.", exemplu: "Asociație, înscrisă în Registrul Asociațiilor și Fundațiilor sub nr. …/…" },
  { cheie: "an_infiintare", eticheta: "Anul înființării", ajutor: "" },
  { cheie: "sediu", eticheta: "Sediul", ajutor: "" },
  { cheie: "website", eticheta: "Website și pagini publice", ajutor: "" },
  { cheie: "misiune", eticheta: "Misiune și viziune", ajutor: "Două-trei propoziții: ce schimbați și pentru cine.", exemplu: "Sprijinim familiile cu copii bolnavi din județul … prin tratamente decontate, transport și consiliere.", lung: true },
  { cheie: "activitati", eticheta: "Activități principale", ajutor: "Ce faceți concret, în fiecare an.", lung: true },
  { cheie: "beneficiari", eticheta: "Beneficiari", ajutor: "Cine sunt și câți ajungeți anual, cu cifre reale. Anonimizează: fără nume complete, adrese, CNP sau diagnostice detaliate.", exemplu: "În 2025 am sprijinit 120 de familii, în principal din mediul rural.", lung: true },
  { cheie: "impact", eticheta: "Cifre de impact", ajutor: "Rezultate măsurabile, cu perioada la care se referă (ex. 2025: 120 de familii sprijinite).", exemplu: "2025: 120 de familii sprijinite, 340 de drumuri la spital decontate.", lung: true },
  { cheie: "povesti", eticheta: "Povești de caz", ajutor: "Două-trei povești scurte, cu acordul persoanelor, care pot fi folosite în cereri. Anonimizează: prenume schimbat, fără adresă și fără date de sănătate detaliate (datele de sănătate cer consimțământ explicit).", exemplu: "Andrei (prenume schimbat), 7 ani, a început tratamentul în …", lung: true },
  { cheie: "buget", eticheta: "Buget anual și surse de venit", ajutor: "Venituri și cheltuieli pe ultimul an încheiat, pe surse.", exemplu: "2025: venituri 480.000 lei (donații 60%, sponsorizări 30%, granturi 10%); cheltuieli 455.000 lei.", lung: true },
  { cheie: "finantari", eticheta: "Finanțări și parteneri anteriori", ajutor: "Cine v-a finanțat, cât și pentru ce, cu anul.", lung: true },
  { cheie: "echipa", eticheta: "Echipă și experiență", ajutor: "Cine conduce organizația și cine implementează proiectele.", lung: true },
  { cheie: "contact_nume", eticheta: "Persoana de contact", ajutor: "" },
  { cheie: "contact_email", eticheta: "E-mail de contact", ajutor: "" },
  { cheie: "contact_telefon", eticheta: "Telefon de contact", ajutor: "" },
  { cheie: "iban", eticheta: "IBAN și banca", ajutor: "Pentru grantul în lei; pentru granturi în valută, adaugă și contul în valută." },
];

// Păstrează doar cheile cunoscute, ca text curat de cel mult 6000 de caractere (restul din baza de date nu se citește niciodată).
export function curataDosar(x: unknown): Record<string, string> {
  const rez: Record<string, string> = {};
  if (!x || typeof x !== "object") return rez;
  for (const c of CAMPURI_DOSAR) {
    const v = (x as Record<string, unknown>)[c.cheie];
    if (typeof v === "string" && v.trim()) rez[c.cheie] = v.trim().slice(0, 6000);
  }
  return rez;
}

// Cât din dosar e completat (afișat ca progres): câmpuri completate din total.
export function progresDosar(continut: Record<string, string>): { completate: number; total: number } {
  return { completate: CAMPURI_DOSAR.filter((c) => (continut[c.cheie] ?? "").trim()).length, total: CAMPURI_DOSAR.length };
}

// Ce primește serverul de la formularul unui grant (totul text, cum vine din câmpuri) și ce se salvează după validare.
export type GrantInput = {
  id: string | null;
  finantator: string;
  titlu: string;
  tipFinantator: string;
  stare: string;
  suma: string;
  moneda: string;
  termen: string;
  link: string;
  responsabilId: string | null;
  nota: string;
  cerinte: string;
  eligibilitate: unknown;
  documente: unknown;
  draft: string;
  sumaCastigata: string;
  dataDecizie: string;
  termenRaportare: string;
};

export type GrantCurat = {
  finantator: string;
  titlu: string;
  tipFinantator: TipFinantator;
  stare: StareGrant;
  suma: number | null;
  moneda: Moneda;
  termen: string | null;
  link: string | null;
  responsabilId: string | null;
  nota: string | null;
  cerinte: string | null;
  eligibilitate: ElementLista[];
  documente: ElementLista[];
  draft: string | null;
  sumaCastigata: number | null;
  dataDecizie: string | null;
  termenRaportare: string | null;
};

const text = (x: unknown, max: number): string | null => {
  const s = typeof x === "string" ? x.trim().slice(0, max) : "";
  return s || null;
};

// Doar adrese web (http/https); orice altceva (javascript:, data:, text liber) nu se păstrează ca link.
export function linkValid(x: unknown): string | null {
  const s = text(x, 500);
  if (!s) return null;
  const cuProtocol = /^https?:\/\//i.test(s) ? s : `https://${s}`;
  try {
    const u = new URL(cuProtocol);
    return (u.protocol === "https:" || u.protocol === "http:") && u.hostname.includes(".") ? u.toString() : null;
  } catch {
    return null;
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function valideazaGrant(i: GrantInput): { ok: true; v: GrantCurat } | { ok: false; eroare: string } {
  const finantator = text(i.finantator, 160);
  const titlu = text(i.titlu, 240);
  if (!finantator) return { ok: false, eroare: "Scrie numele finanțatorului." };
  if (!titlu) return { ok: false, eroare: "Scrie titlul programului sau al apelului." };
  if (!esteStare(i.stare)) return { ok: false, eroare: "Starea nu e validă." };
  if (i.termen && !dataValida(i.termen)) return { ok: false, eroare: "Termenul de depunere nu e o dată validă." };
  if (i.dataDecizie && !dataValida(i.dataDecizie)) return { ok: false, eroare: "Data deciziei nu e validă." };
  if (i.termenRaportare && !dataValida(i.termenRaportare)) return { ok: false, eroare: "Termenul de raportare nu e o dată validă." };
  if (i.suma && sumaValida(i.suma) === null) return { ok: false, eroare: "Suma solicitată nu e validă." };
  if (i.sumaCastigata && sumaValida(i.sumaCastigata) === null) return { ok: false, eroare: "Suma câștigată nu e validă." };
  if (i.link && !linkValid(i.link)) return { ok: false, eroare: "Linkul trebuie să fie o adresă web (ex. https://…)." };
  return {
    ok: true,
    v: {
      finantator,
      titlu,
      tipFinantator: esteTip(i.tipFinantator) ? i.tipFinantator : "alt",
      stare: i.stare,
      suma: sumaValida(i.suma),
      moneda: esteMoneda(i.moneda) ? i.moneda : "RON",
      termen: dataValida(i.termen),
      link: linkValid(i.link),
      responsabilId: i.responsabilId && UUID.test(i.responsabilId) ? i.responsabilId : null,
      nota: text(i.nota, 4000),
      cerinte: text(i.cerinte, 20000),
      eligibilitate: curataLista(i.eligibilitate),
      documente: curataLista(i.documente),
      draft: text(i.draft, 30000),
      sumaCastigata: sumaValida(i.sumaCastigata),
      dataDecizie: dataValida(i.dataDecizie),
      termenRaportare: dataValida(i.termenRaportare),
    },
  };
}

// Ce reminder de termen mai trebuie trimis: „1z” (azi sau mâine) sau „7z” (în 2–7 zile), fiecare o singură dată. Termenele depășite nu mai primesc.
export function reminderDeTrimis(zile: number | null, trimis7z: boolean, trimis1z: boolean): "1z" | "7z" | null {
  if (zile === null || zile < 0) return null;
  if (zile <= 1) return trimis1z ? null : "1z";
  if (zile <= 7) return trimis7z ? null : "7z";
  return null;
}

// ---- Rezultatele căutării cu AI: garda împotriva linkurilor inventate ----

export type ApelGasit = { finantator: string; titlu: string; termen: string | null; url: string; motiv: string };

// Fără parametri de căutare și fără fragment: aceeași pagină cu linkuri ușor diferite se potrivește.
export function normalizeazaUrl(u: string): string | null {
  try {
    const x = new URL(u);
    if (x.protocol !== "https:" && x.protocol !== "http:") return null;
    return `${x.hostname.replace(/^www\./, "")}${x.pathname.replace(/\/+$/, "")}`.toLowerCase();
  } catch {
    return null;
  }
}

// Din textul modelului (un array JSON) păstrează doar elementele complete al căror link a apărut într-un rezultat real al căutării
// (`gasite`, linkuri normalizate). Termenul rămâne doar dacă e o dată validă, azi sau în viitor.
export function extrageApeluri(text: string, gasite: ReadonlySet<string>, azi: string): ApelGasit[] {
  const inceput = text.indexOf("[");
  const sfarsit = text.lastIndexOf("]");
  if (inceput < 0 || sfarsit <= inceput) return [];
  let brut: unknown;
  try {
    brut = JSON.parse(text.slice(inceput, sfarsit + 1));
  } catch {
    return [];
  }
  if (!Array.isArray(brut)) return [];
  const apeluri: ApelGasit[] = [];
  for (const e of brut) {
    if (apeluri.length >= 8 || !e || typeof e !== "object") continue;
    const o = e as Record<string, unknown>;
    const url = typeof o.url === "string" ? o.url.trim() : "";
    const n = normalizeazaUrl(url);
    const finantator = typeof o.finantator === "string" ? o.finantator.trim().slice(0, 160) : "";
    const titlu = typeof o.titlu === "string" ? o.titlu.trim().slice(0, 240) : "";
    if (!n || !gasite.has(n) || !finantator || !titlu || !/^https:\/\//i.test(url)) continue;
    const termen = dataValida(o.termen) && String(o.termen) >= azi ? String(o.termen) : null;
    apeluri.push({ finantator, titlu, termen, url: url.slice(0, 500), motiv: typeof o.motiv === "string" ? o.motiv.trim().slice(0, 300) : "" });
  }
  return apeluri;
}

// Doar gazda unui link (fără www, cale sau parametri), pentru afișat lângă rezultate: omul vede de unde vine pagina înainte să o deschidă.
export function domeniuDinUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}
