// Analiza săptămânală a reclamelor cu AI: promptul (doar cifre agregate, fără date personale), schema răspunsului și validarea lui strictă.
// Pur: fără importuri de valori, fără rețea, fără baza de date — ca să poată fi testat. Apelul către Claude e în analiza-ai-server.ts.

export const TIPURI_PROPUNERE = ["buget", "text", "public", "oprire", "masurare"] as const;
export type TipPropunere = (typeof TIPURI_PROPUNERE)[number];
export const MAX_PROPUNERI = 3;
export const MAX_CAMPANII_IN_PROMPT = 30;

const MAX_REZUMAT = 1500;
const MAX_MOTIV = 600;
const MAX_TITLU = 140;
const MAX_DETALII = 900;
const MAX_TEXT_NOU = 700;
const MAX_DE_VERIFICAT = 6;
const MAX_VERDICT = 5;

// ───────────── datele trimise la AI ─────────────

export type SaptamanaAnterioara = { cheltuialaLei: number; donatii: number; donatiiNeteLei: number };

export type CampanieAnaliza = {
  eticheta: string;
  platforma: string;
  codUtm: string | null;
  // false = cheltuială fără cod UTM legat (nu se pot atribui donații) sau cod UTM fără cheltuială importată
  legata: boolean;
  cheltuialaLei: number;
  afisari: number | null;
  // clicuri raportate de platformă pe linkul reclamei
  clicuriPlatforma: number | null;
  // vizitatori unici (pe zi) veniți pe paginile de campanie prin linkul cu urmărire (codul UTM), măsurați de Alexandrit
  vizitatoriLink: number;
  deschideriFormular: number;
  // doar donații confirmate atribuite exact (utm_campaign din donație = codul campaniei)
  donatii: number;
  donatiiNeteLei: number;
  donatoriNoi: number;
  costPerDonatieLei: number | null;
  roasNet: number | null;
  saptamanaAnterioara: SaptamanaAnterioara | null;
};

export type TotaluriAnaliza = { cheltuialaLei: number; donatii: number; donatiiNeteLei: number; donatoriNoi: number; roasNet: number | null };

export type DateAnaliza = {
  perioada: { de: string; pana: string };
  anterioara: { de: string; pana: string };
  fereastraZile: number;
  totaluri: TotaluriAnaliza;
  totaluriAnterioare: TotaluriAnaliza;
  campanii: CampanieAnaliza[];
  calitate: { costNealocatLei: number; donatiiFaraCostLegat: number };
};

// ───────────── curățarea textelor din date ─────────────

const CONTROL = /[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u2028-\u202E\u2060-\u2069\uFEFF]/g;

// Etichetele campaniilor (nume date de organizație în platforma de reclame) pot purta, din greșeală, un nume de persoană, un email sau un telefon
// (ex. „Operație Ion Popescu 0722123456”). La AI nu pleacă adrese de email, linkuri, numere de telefon sau șiruri lungi de cifre (CNP, IBAN).
export function curataEticheta(t: unknown, max = 80): string {
  if (typeof t !== "string") return "";
  let s = t.slice(0, 600).replace(CONTROL, " ");
  s = s.replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[email]");
  s = s.replace(/\b(?:https?:\/\/|www\.)\S+/gi, "[link]");
  s = s.replace(/\b[A-Z]{2}\d{2}[A-Z0-9]{10,30}\b/g, "[cont]");
  // număr de telefon / CNP / cifre lungi: 9+ cifre (o dată sau un preț nu ajung la atât), cu separatori obișnuiți între ele
  s = s.replace(/(?:\+?\d[\s.\-()]*){9,}/g, "[număr]");
  s = s.replace(/\s+/g, " ").trim();
  if (s.length > max) s = s.slice(0, max).trim();
  return s;
}

const rot = (n: number | null): number | null => (n === null || !Number.isFinite(n) ? null : Math.round(n * 100) / 100);
const rotZero = (n: number): number => (Number.isFinite(n) ? Math.round(n * 100) / 100 : 0);

// Aceeași structură, dar cu textele curățate și numerele rotunjite; campaniile se taie la cele mai relevante (după cheltuială, apoi după venit).
export function pregatesteDate(d: DateAnaliza): DateAnaliza {
  const campanii = d.campanii
    .map((c) => ({
      ...c,
      eticheta: curataEticheta(c.eticheta) || "(fără nume)",
      platforma: curataEticheta(c.platforma, 40),
      codUtm: c.codUtm === null ? null : curataEticheta(c.codUtm, 60) || null,
      cheltuialaLei: rotZero(c.cheltuialaLei),
      donatiiNeteLei: rotZero(c.donatiiNeteLei),
      costPerDonatieLei: rot(c.costPerDonatieLei),
      roasNet: rot(c.roasNet),
      saptamanaAnterioara: c.saptamanaAnterioara
        ? { cheltuialaLei: rotZero(c.saptamanaAnterioara.cheltuialaLei), donatii: c.saptamanaAnterioara.donatii, donatiiNeteLei: rotZero(c.saptamanaAnterioara.donatiiNeteLei) }
        : null,
    }))
    .sort((a, b) => b.cheltuialaLei - a.cheltuialaLei || b.donatiiNeteLei - a.donatiiNeteLei)
    .slice(0, MAX_CAMPANII_IN_PROMPT);
  const t = (x: TotaluriAnaliza): TotaluriAnaliza => ({ cheltuialaLei: rotZero(x.cheltuialaLei), donatii: x.donatii, donatiiNeteLei: rotZero(x.donatiiNeteLei), donatoriNoi: x.donatoriNoi, roasNet: rot(x.roasNet) });
  return {
    perioada: d.perioada,
    anterioara: d.anterioara,
    fereastraZile: d.fereastraZile,
    totaluri: t(d.totaluri),
    totaluriAnterioare: t(d.totaluriAnterioare),
    campanii,
    calitate: { costNealocatLei: rotZero(d.calitate.costNealocatLei), donatiiFaraCostLegat: d.calitate.donatiiFaraCostLegat },
  };
}

// ───────────── promptul ─────────────

export type LimbaAnaliza = "ro" | "en";

export const SCHEMA_RASPUNS = `{
  "rezumat": "2-4 propoziții despre săptămână, cu cifre",
  "castigatoare": [ { "campanie": "numele EXACT din date", "motiv": "de ce funcționează, cu cifre" } ],
  "pierderi": [ { "campanie": "numele EXACT din date", "motiv": "de ce pierde bani sau nu aduce donații, cu cifre" } ],
  "propuneri": [ { "tip": "buget | text | public | oprire | masurare", "campanie": "numele EXACT din date sau null", "titlu": "o propoziție scurtă", "detalii": "ce se schimbă și de ce, cu cifre", "text_nou": "textul nou propus pentru reclamă (doar la tip text), altfel null" } ],
  "de_verificat": [ "lucruri pe care omul trebuie să le verifice înainte să decidă (date lipsă, coduri UTM nelegate, perioade incomplete)" ]
}`;

export function construiestePrompt(date: DateAnaliza, limba: LimbaAnaliza = "ro"): { system: string; user: string } {
  const d = pregatesteDate(date);
  const limbaRaspuns = limba === "en" ? "engleză" : "română, cu diacritice";
  const system = [
    "Ești analist de performanță a reclamelor plătite pentru un ONG din România (donații online). Lucrezi cu datele unei săptămâni și le explici colegelor ne-tehnice.",
    "REGULI:",
    "- Folosește DOAR cifrele din datele primite. Nu inventa campanii, cifre, bugete sau rezultate. Dacă o informație lipsește, spune că lipsește (la „de_verificat”).",
    "- Numele campaniilor se scriu exact așa cum apar în date.",
    "- Donațiile sunt cele confirmate, atribuite prin modelul ultimului clic cu cod UTM; atribuirea e o regulă de asociere, nu o dovadă că reclama a produs donația. Nu o prezenta ca certitudine.",
    "- Sub 10 donații atribuite pe o campanie, eșantionul e mic: nu trage concluzii ferme și nu propune oprirea ei doar pe această bază; recomandă măsurare sau răbdare.",
    "- O campanie cu cheltuială, dar fără cod UTM legat (câmpul „legata” fals) nu poate fi evaluată: propune măsurare (legarea codului UTM), nu oprire.",
    "- Cifrele ultimei zile pot fi incomplete. Sumele sunt în lei.",
    `- MAXIM ${MAX_PROPUNERI} propuneri, în ordinea importanței; fiecare de unul din tipurile: ${TIPURI_PROPUNERE.join(", ")}. La tipul „text” oferă obligatoriu un text nou, scurt și demn, pentru reclamă (fără promisiuni false, fără date personale ale cuiva, fără numele unor beneficiari).`,
    "- Nu include nicio dată personală (nume de persoane, emailuri, telefoane) în răspuns.",
    `- Răspunde în limba ${limbaRaspuns}.`,
    "- Răspunde DOAR cu un obiect JSON valid, fără text în afara lui și fără blocuri de cod, exact cu această structură (câmpurile lipsă se pun ca listă goală sau null):",
    SCHEMA_RASPUNS,
    `- „castigatoare” și „pierderi”: cel mult ${MAX_VERDICT} fiecare. „de_verificat”: cel mult ${MAX_DE_VERIFICAT}.`,
  ].join("\n");
  const user = [
    `Analizează reclamele pentru perioada ${d.perioada.de} – ${d.perioada.pana} (comparativ cu ${d.anterioara.de} – ${d.anterioara.pana}). Fereastra de atribuire: ${d.fereastraZile} zile.`,
    "Datele (JSON):",
    JSON.stringify(d),
  ].join("\n");
  return { system, user };
}

// ───────────── răspunsul: validare strictă ─────────────

export type Verdict = { campanie: string; motiv: string };
export type Propunere = { tip: TipPropunere; campanie: string | null; titlu: string; detalii: string; textNou: string | null };
export type AnalizaReclame = { rezumat: string; castigatoare: Verdict[]; pierderi: Verdict[]; propuneri: Propunere[]; deVerificat: string[] };

export type RezultatValidare = { ok: true; analiza: AnalizaReclame; taiate: number } | { ok: false; motiv: string };

const esteObiect = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x);

// Text de afișat: fără caractere de control, spații normalizate, tăiat la lungime. Rămâne text simplu (interfața îl afișează ca text, nu ca HTML).
function text(x: unknown, max: number): string | null {
  if (typeof x !== "string") return null;
  let s = x.replace(CONTROL, " ").replace(/\s+/g, " ").trim();
  if (s.length > max) {
    s = s.slice(0, max);
    const ultim = s.charCodeAt(s.length - 1);
    if (ultim >= 0xd800 && ultim <= 0xdbff) s = s.slice(0, -1);
    s = s.trim();
  }
  return s;
}

// Scoate JSON-ul dintr-un răspuns care poate avea un bloc ```json ... ``` sau text în jur.
export function extrageJson(brut: string): unknown {
  const t = brut.trim();
  const fara = t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const incearca = (s: string): unknown => {
    try {
      return JSON.parse(s);
    } catch {
      return undefined;
    }
  };
  const direct = incearca(fara);
  if (direct !== undefined) return direct;
  const i = fara.indexOf("{");
  const j = fara.lastIndexOf("}");
  return i >= 0 && j > i ? incearca(fara.slice(i, j + 1)) : undefined;
}

const normalizeaza = (s: string): string =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036F]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

// O campanie pomenită de AI trebuie să existe în date (egalitate sau incluziune, ignorând diacriticele și majusculele). Altfel e o invenție.
export function campaniePotrivita(nume: string, cunoscute: string[]): boolean {
  const n = normalizeaza(nume);
  if (!n) return false;
  return cunoscute.some((c) => {
    const k = normalizeaza(c);
    return k === n || (n.length >= 4 && k.includes(n)) || (k.length >= 4 && n.includes(k));
  });
}

function verdicte(x: unknown, cunoscute: string[] | null): Verdict[] | null {
  if (!Array.isArray(x)) return null;
  const rez: Verdict[] = [];
  for (const it of x) {
    if (!esteObiect(it)) return null;
    const campanie = text(it.campanie, 120);
    const motiv = text(it.motiv, MAX_MOTIV);
    if (!campanie || !motiv) return null;
    if (cunoscute && !campaniePotrivita(campanie, cunoscute)) continue; // campanie inexistentă în date: se renunță la rând
    rez.push({ campanie, motiv });
  }
  return rez;
}

// `campaniiCunoscute`: etichetele din datele trimise; când e dat, verdictele despre campanii inexistente se elimină, iar o propunere despre o campanie inexistentă pierde legătura cu ea.
export function valideazaAnaliza(brut: string, campaniiCunoscute: string[] | null = null): RezultatValidare {
  const j = extrageJson(typeof brut === "string" ? brut : "");
  if (!esteObiect(j)) return { ok: false, motiv: "Răspunsul nu e un obiect JSON." };

  const rezumat = text(j.rezumat, MAX_REZUMAT);
  if (!rezumat) return { ok: false, motiv: "Lipsește rezumatul." };

  const castigatoare = verdicte(j.castigatoare ?? [], campaniiCunoscute);
  if (!castigatoare) return { ok: false, motiv: "„castigatoare” are o structură greșită." };
  const pierderi = verdicte(j.pierderi ?? [], campaniiCunoscute);
  if (!pierderi) return { ok: false, motiv: "„pierderi” are o structură greșită." };

  if (!Array.isArray(j.propuneri ?? [])) return { ok: false, motiv: "„propuneri” trebuie să fie o listă." };
  const propuneriBrute = (j.propuneri ?? []) as unknown[];
  const propuneri: Propunere[] = [];
  for (const it of propuneriBrute) {
    if (!esteObiect(it)) return { ok: false, motiv: "O propunere are o structură greșită." };
    const tip = it.tip;
    if (typeof tip !== "string" || !(TIPURI_PROPUNERE as readonly string[]).includes(tip)) return { ok: false, motiv: "O propunere are un tip necunoscut." };
    const titlu = text(it.titlu, MAX_TITLU);
    const detalii = text(it.detalii, MAX_DETALII);
    if (!titlu || !detalii) return { ok: false, motiv: "O propunere nu are titlu sau detalii." };
    if (it.campanie !== null && it.campanie !== undefined && typeof it.campanie !== "string") return { ok: false, motiv: "O propunere are o campanie greșită." };
    if (it.text_nou !== null && it.text_nou !== undefined && typeof it.text_nou !== "string") return { ok: false, motiv: "O propunere are un text nou greșit." };
    let campanie = typeof it.campanie === "string" ? text(it.campanie, 120) || null : null;
    if (campanie && campaniiCunoscute && !campaniePotrivita(campanie, campaniiCunoscute)) campanie = null;
    const textNou = tip === "text" && typeof it.text_nou === "string" ? text(it.text_nou, MAX_TEXT_NOU) || null : null;
    propuneri.push({ tip: tip as TipPropunere, campanie, titlu, detalii, textNou });
  }
  // Mai mult de 3 propuneri: le păstrăm pe primele (în ordinea importanței cerută în prompt), nu pierdem toată analiza.
  const taiate = Math.max(0, propuneri.length - MAX_PROPUNERI);

  const dv = j.de_verificat ?? [];
  if (!Array.isArray(dv)) return { ok: false, motiv: "„de_verificat” trebuie să fie o listă." };
  const deVerificat: string[] = [];
  for (const it of dv) {
    const t = text(it, 300);
    if (t === null) return { ok: false, motiv: "„de_verificat” conține o valoare care nu e text." };
    if (t) deVerificat.push(t);
  }

  return {
    ok: true,
    taiate,
    analiza: {
      rezumat,
      castigatoare: castigatoare.slice(0, MAX_VERDICT),
      pierderi: pierderi.slice(0, MAX_VERDICT),
      propuneri: propuneri.slice(0, MAX_PROPUNERI),
      deVerificat: deVerificat.slice(0, MAX_DE_VERIFICAT),
    },
  };
}

// ───────────── săptămâna (pentru cron și buton) ─────────────

const MS_ZI = 86_400_000;
const dinIso = (iso: string) => Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)));
const laIso = (ms: number) => new Date(ms).toISOString().slice(0, 10);

// Ultimele 7 zile ÎNCHEIATE (până ieri, în ora României) și cele 7 dinaintea lor; `luni` e ziua de luni a săptămânii în care cade `azi` (cheia de idempotență a cron-ului).
export function saptamanaAnalizei(azi: string): { de: string; pana: string; anterioara: { de: string; pana: string }; luni: string } {
  const pana = laIso(dinIso(azi) - MS_ZI);
  const de = laIso(dinIso(azi) - 7 * MS_ZI);
  const zi = new Date(dinIso(azi)).getUTCDay(); // 0 = duminică
  const luni = laIso(dinIso(azi) - ((zi + 6) % 7) * MS_ZI);
  return { de, pana, anterioara: { de: laIso(dinIso(azi) - 14 * MS_ZI), pana: laIso(dinIso(azi) - 8 * MS_ZI) }, luni };
}

// Cât durează o analiză „în lucru” înainte să fie considerată abandonată (cererea a murit) și să poată fi reluată.
export const ANALIZA_IN_LUCRU_MAX_MIN = 15;
