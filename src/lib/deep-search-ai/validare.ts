// „Caută pe internet (AI)”: partea pură (fără rețea, fără bază de date) — citirea și curățarea răspunsului Claude, marcajele pentru telefon și memoria de 30 de zile.
// Răspunsul unui model nu e de încredere: tot ce intră în CRM trece prin funcțiile de aici.

export const MAX_DECIDENTI_AI = 8;
export const ZILE_MEMORIE_AI = 30;

export type DecidentAi = {
  nume: string;
  rol: string;
  email: string | null;
  telefon: string | null;
  sursaUrl: string;
};

const faraDiacritice = (s: string) =>
  s
    .replace(/[șş]/gi, "s")
    .replace(/[țţ]/gi, "t")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

const curataText = (v: unknown, max: number): string => (typeof v === "string" ? v.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max) : "");

// Numele complet = cel puțin două cuvinte cu litere („Ion Popescu”). Un singur cuvânt (doar prenumele) ar contopi sau inventa persoane.
export function esteNumeComplet(nume: string): boolean {
  const cuvinte = nume.split(/\s+/).filter((c) => /\p{L}/u.test(c));
  return cuvinte.length >= 2;
}

export function cheiePersoana(nume: string): string {
  return faraDiacritice(nume)
    .replace(/[^a-z\s-]/g, " ")
    .split(/[\s-]+/)
    .filter(Boolean)
    .sort()
    .join(" ");
}

const RE_EMAIL = /^[A-Za-z0-9._%+'-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;
// Adrese de exemplu / de umplutură pe care modelele le scriu când nu au găsit nimic.
const RE_EMAIL_FALS = /@(?:example|exemplu|domain|domeniu|test)\.(?:com|ro|org|net)$|^(?:name|nume|prenume|email|exemplu|example)@/i;

export function emailValid(brut: unknown): string | null {
  const e = curataText(brut, 200).replace(/^mailto:/i, "").toLowerCase();
  return RE_EMAIL.test(e) && !RE_EMAIL_FALS.test(e) ? e : null;
}

// Primul număr de telefon de pe text (modelul poate scrie „0721 123 456 (secretariat)”); minim 9 și maxim 15 cifre.
export function telefonValid(brut: unknown): string | null {
  const t = curataText(brut, 80);
  const m = /(\+?\d[\d\s().\/-]{6,}\d)/.exec(t);
  if (!m) return null;
  const cifre = m[1].replace(/\D/g, "");
  if (cifre.length < 9 || cifre.length > 15) return null;
  return m[1].replace(/\s+/g, " ").trim().slice(0, 40);
}

// Doar linkuri web (http/https) către o pagină publică; nimic cu date de autentificare în adresă.
export function urlSursaValid(brut: unknown): string | null {
  const t = curataText(brut, 500);
  if (!/^https?:\/\//i.test(t)) return null;
  try {
    const u = new URL(t);
    if ((u.protocol !== "http:" && u.protocol !== "https:") || u.username || u.password || !u.hostname.includes(".")) return null;
    return u.toString().slice(0, 500);
  } catch {
    return null;
  }
}

export type TipTelefon = "mobil" | "fix";

// „📱 mobil” = prefix 07 (și +40 7…); orice alt număr românesc = „☎ fix / centrală”. Numerele din alte țări nu se marchează.
export function tipTelefon(telefon: string | null | undefined): TipTelefon | null {
  const brut = (telefon ?? "").trim();
  if (!brut) return null;
  const cifre = brut.replace(/\D/g, "");
  const international = /^(\+|00)/.test(brut);
  let national = cifre;
  if (international) {
    const fara00 = cifre.replace(/^00/, "");
    if (!fara00.startsWith("40")) return null;
    national = `0${fara00.slice(2)}`;
  } else if (cifre.length === 9 && cifre.startsWith("7")) {
    national = `0${cifre}`; // prefixul 0 lipsă („721 123 456”)
  }
  if (!national.startsWith("0") || national.length !== 10) return null;
  return national.startsWith("07") ? "mobil" : "fix";
}

// Scoate blocul JSON din răspuns: poate veni în ``` sau înconjurat de text. Încearcă de la ultimul `{"decidenti"`, apoi de la primul `{`.
function extrageJson(text: string): unknown {
  const t = text.replace(/```(?:json)?/gi, "");
  const porniri: number[] = [];
  const re = /\{\s*"decidenti"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(t))) porniri.push(m.index);
  porniri.reverse();
  const prima = t.indexOf("{");
  if (prima >= 0 && !porniri.includes(prima)) porniri.push(prima);
  for (const start of porniri) {
    let sfarsit = t.lastIndexOf("}");
    for (let incercari = 0; sfarsit > start && incercari < 12; incercari++) {
      try {
        return JSON.parse(t.slice(start, sfarsit + 1));
      } catch {
        sfarsit = t.lastIndexOf("}", sfarsit - 1);
      }
    }
  }
  return undefined;
}

export type RezultatParsare = { ok: true; decidenti: DecidentAi[]; ignorati: number } | { ok: false };

// Răspunsul AI → lista curată: fără nume dintr-un singur cuvânt, fără persoane fără sursă publică verificabilă, fără emailuri invalide (persoana rămâne, adresa nu),
// fără dubluri, cel mult 8. `ignorati` = câte intrări s-au aruncat (pentru transparență în interfață).
export function parseazaRaspunsAi(text: string): RezultatParsare {
  const j = extrageJson(String(text ?? ""));
  const lista = Array.isArray(j) ? j : j && typeof j === "object" && Array.isArray((j as { decidenti?: unknown }).decidenti) ? (j as { decidenti: unknown[] }).decidenti : null;
  if (!lista) return { ok: false };
  const vazute = new Set<string>();
  const decidenti: DecidentAi[] = [];
  let ignorati = 0;
  for (const brut of lista) {
    const x = (brut && typeof brut === "object" ? brut : {}) as Record<string, unknown>;
    const nume = curataText(x.nume, 120);
    const sursaUrl = urlSursaValid(x.sursa ?? x.sursaUrl ?? x.url);
    const cheie = cheiePersoana(nume);
    if (!esteNumeComplet(nume) || !sursaUrl || !cheie || vazute.has(cheie)) {
      ignorati++;
      continue;
    }
    vazute.add(cheie);
    decidenti.push({ nume, rol: curataText(x.rol ?? x.functie, 120), email: emailValid(x.email), telefon: telefonValid(x.telefon), sursaUrl });
  }
  return { ok: true, decidenti: decidenti.slice(0, MAX_DECIDENTI_AI), ignorati: ignorati + Math.max(0, decidenti.length - MAX_DECIDENTI_AI) };
}

// Căutarea AI se plătește (căutări web + tokeni): un rezultat mai nou de 30 de zile se refolosește.
export function esteMemoratProaspat(creatLaIso: string | null | undefined, acum: number = Date.now()): boolean {
  if (!creatLaIso) return false;
  const t = new Date(creatLaIso).getTime();
  return Number.isFinite(t) && acum - t >= 0 && acum - t < ZILE_MEMORIE_AI * 86_400_000;
}
