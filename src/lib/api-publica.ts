// API-ul public al platformei (/api/v1) și webhook-urile trimise către sistemele organizației: chei, permisiuni, semnătură, adrese permise, reîncercări.
// Fără importuri (se folosește și în interfață), ca să se poată testa direct. Generarea și semnarea (node:crypto) stau în lib/api-publica-cripto.ts; accesul la baza de date, în lib/api-publica-server.ts.

// ===== Chei API =====
// Format: alx_live_<43 de caractere>. Se arată o singură dată; în baza de date rămân doar hash-ul (SHA-256) și un prefix pentru recunoaștere.
export const PREFIX_CHEIE = "alx_live_";
const RE_CHEIE = /^alx_live_[A-Za-z0-9_-]{43}$/;

export const esteCheieApi = (x: unknown): x is string => typeof x === "string" && RE_CHEIE.test(x);
// Primele caractere, ca persoana să recunoască o cheie în listă (fără să o poată reconstitui).
export const prefixAfisat = (cheie: string): string => `${cheie.slice(0, PREFIX_CHEIE.length + 6)}…`;

// Antetul „Authorization: Bearer …”.
export function extrageBearer(antet: string | null | undefined): string | null {
  const m = /^Bearer\s+(\S+)$/i.exec(antet ?? "");
  return m && esteCheieApi(m[1]) ? m[1] : null;
}

export const SCOPURI = ["donatori:citire", "donatori:scriere", "donatii:citire", "email:scriere"] as const;
export type Scop = (typeof SCOPURI)[number];
export const ETICHETE_SCOP: Record<Scop, string> = {
  "donatori:citire": "Citește donatorii",
  "donatori:scriere": "Modifică câmpurile personalizate ale donatorilor",
  "donatii:citire": "Citește donațiile",
  "email:scriere": "Marchează adrese de e-mail respinse sau reclamate",
};
export const esteScop = (x: unknown): x is Scop => typeof x === "string" && (SCOPURI as readonly string[]).includes(x);
export function curataScopuri(brut: unknown): Scop[] {
  return [...new Set((Array.isArray(brut) ? brut : []).filter(esteScop))];
}

// ===== Paginare =====
export const LIMITA_IMPLICITA = 100;
export const LIMITA_MAXIMA = 200;
export function limitaPagina(brut: string | null | undefined): number {
  const n = Number(brut);
  if (!Number.isInteger(n) || n < 1) return LIMITA_IMPLICITA;
  return Math.min(n, LIMITA_MAXIMA);
}
const RE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const esteUuid = (x: unknown): x is string => typeof x === "string" && RE_UUID.test(x);

// ===== Webhook-uri =====
export const EVENIMENTE = ["donatie.reusita", "donator.dezabonat", "test.ping"] as const;
export type Eveniment = (typeof EVENIMENTE)[number];
export const ETICHETE_EVENIMENT: Record<Eveniment, string> = {
  "donatie.reusita": "O donație a reușit",
  "donator.dezabonat": "Un donator s-a dezabonat de la e-mailuri",
  "test.ping": "Test (trimis din setări)",
};
// „test.ping” se trimite doar din butonul de test, nu se abonează.
export const EVENIMENTE_ABONABILE: readonly Eveniment[] = ["donatie.reusita", "donator.dezabonat"];
export const esteEveniment = (x: unknown): x is Eveniment => typeof x === "string" && (EVENIMENTE as readonly string[]).includes(x);
export function curataEvenimente(brut: unknown): Eveniment[] {
  return [...new Set((Array.isArray(brut) ? brut : []).filter((e): e is Eveniment => esteEveniment(e) && EVENIMENTE_ABONABILE.includes(e)))];
}

export const PREFIX_SECRET_WEBHOOK = "whsec_";
// Plicul unui eveniment: același pentru toate tipurile.
export function plicEveniment(id: string, tip: Eveniment, creatLa: Date, date: unknown): { id: string; tip: Eveniment; creat_la: string; date: unknown } {
  return { id, tip, creat_la: creatLa.toISOString(), date };
}

// ===== Adrese IP (fără node:net) =====
// 4 = IPv4 corect (patru numere de la 0 la 255), 6 = IPv6 corect (verificat de parserul de URL), 0 = nu e adresă IP.
export function tipIp(brut: string): 0 | 4 | 6 {
  const x = brut.trim().replace(/^\[|\]$/g, "");
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(x)) return x.split(".").every((o) => Number(o) <= 255) ? 4 : 0;
  if (!x.includes(":") || x.length > 45 || /[^0-9a-fA-F:.]/.test(x)) return 0;
  try {
    new URL(`http://[${x}]/`);
    return 6;
  } catch {
    return 0;
  }
}

// ===== Adrese permise pentru webhook =====
// Doar https, fără utilizator/parolă, fără adrese interne. Verificarea la trimitere (în server) rezolvă numele și refuză adresele IP interne: aici, forma adresei.
export const MAX_URL_WEBHOOK = 300;
export function valideazaUrlWebhook(brut: unknown): { ok: true; url: string } | { ok: false; mesaj: string } {
  const text = typeof brut === "string" ? brut.trim() : "";
  if (!text) return { ok: false, mesaj: "Scrie adresa (URL-ul) la care trimitem evenimentele." };
  if (text.length > MAX_URL_WEBHOOK) return { ok: false, mesaj: "Adresa e prea lungă." };
  let u: URL;
  try {
    u = new URL(text);
  } catch {
    return { ok: false, mesaj: "Adresa nu pare corectă. Exemplu: https://exemplu.ro/webhook" };
  }
  if (u.protocol !== "https:") return { ok: false, mesaj: "Adresa trebuie să înceapă cu https://." };
  if (u.username || u.password) return { ok: false, mesaj: "Adresa nu poate conține utilizator sau parolă." };
  if (u.port && u.port !== "443") return { ok: false, mesaj: "Folosește portul standard (443)." };
  const gazda = u.hostname.toLowerCase().replace(/\.$/, "");
  if (!gazda.includes(".") && tipIp(gazda) === 0) return { ok: false, mesaj: "Adresa trebuie să aibă un nume de domeniu public." };
  if (tipIp(gazda) !== 0) return { ok: false, mesaj: "Folosește un nume de domeniu, nu o adresă IP." };
  if (/(^|\.)(localhost|local|internal|intranet|lan|home|corp|test|invalid|example)$/.test(gazda)) return { ok: false, mesaj: "Adresa trebuie să fie un domeniu public." };
  u.hash = "";
  return { ok: true, url: u.toString() };
}

function ipv4Public(ip: string): boolean {
  const o = ip.split(".").map(Number);
  if (o.length !== 4 || o.some((x) => !Number.isInteger(x) || x < 0 || x > 255)) return false;
  const [a, b, c] = o;
  if (a === 0 || a === 10 || a === 127 || a >= 224) return false; // rețea „această”, privat, loopback, multicast și rezervat
  if (a === 169 && b === 254) return false; // link-local (inclusiv metadate cloud)
  if (a === 172 && b >= 16 && b <= 31) return false;
  if (a === 192 && b === 168) return false;
  if (a === 100 && b >= 64 && b <= 127) return false; // CGNAT
  if (a === 192 && b === 0 && c === 0) return false;
  if (a === 192 && b === 0 && c === 2) return false;
  if (a === 198 && (b === 18 || b === 19)) return false;
  if (a === 198 && b === 51 && c === 100) return false;
  if (a === 203 && b === 0 && c === 113) return false;
  return true;
}

// Adresa IP rezolvată e publică? (Folosit la trimitere: un nume care duce într-o rețea internă nu primește webhook-uri.)
export function esteIpPublic(ip: string): boolean {
  const x = ip.trim().toLowerCase().replace(/^\[|\]$/g, "");
  const v = tipIp(x);
  if (v === 4) return ipv4Public(x);
  if (v !== 6) return false;
  const mapat = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(x);
  if (mapat) return ipv4Public(mapat[1]);
  if (x === "::" || x === "::1") return false;
  const primul = parseInt(x.split(":")[0] || "0", 16);
  if ((primul & 0xfe00) === 0xfc00) return false; // fc00::/7 unic-local
  if ((primul & 0xffc0) === 0xfe80) return false; // fe80::/10 link-local
  if ((primul & 0xff00) === 0xff00) return false; // multicast
  if (x.startsWith("2001:db8") || x.startsWith("2001:0db8")) return false; // documentație
  if (x.startsWith("64:ff9b")) return false; // NAT64: ar putea duce la adrese interne
  return true;
}

// ===== Reîncercări =====
// O livrare nereușită se reîncearcă cu pauze tot mai mari, până la MAX_INCERCARI; apoi rămâne „eșuată”. Pauzele sunt în ore (cron-ul de reîncercare rulează zilnic,
// deci în practică se reia la rularea următoare).
export const MAX_INCERCARI = 5;
export const PAUZE_ORE = [0, 1, 6, 24, 72] as const;
export function urmatoareaIncercare(incercari: number, acum: Date): Date | null {
  if (incercari >= MAX_INCERCARI) return null;
  const ore = PAUZE_ORE[Math.max(0, Math.min(incercari, PAUZE_ORE.length - 1))];
  return new Date(acum.getTime() + ore * 3_600_000);
}
// Un endpoint se dezactivează automat după atâtea livrări eșuate la rând.
export const PRAG_DEZACTIVARE = 20;

// Codul HTTP al răspunsului: 2xx = primit; 410 = destinatarul cere să nu mai trimitem; restul = eșec (se reîncearcă).
export function rezultatLivrare(cod: number | null): "trimis" | "esuat" | "dezactiveaza" {
  if (cod !== null && cod >= 200 && cod < 300) return "trimis";
  if (cod === 410) return "dezactiveaza";
  return "esuat";
}
