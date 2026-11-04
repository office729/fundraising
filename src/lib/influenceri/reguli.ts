// Influenceri — regulile pure ale modulului: liste (categorii, etape, platforme), normalizarea handle-urilor și emailurilor pentru deduplicare,
// planificarea verificărilor și a revenirilor, ordonarea pe platformă și linkul unic al unei campanii. Fără acces la baza de date și fără importuri de valori,
// ca să poată fi folosit și în browser și în teste (node --test).

export type Loc = "ro" | "en";
export type Eticheta = { ro: string; en: string };

// Cele 11 categorii de creatori.
export const CATEGORII = [
  { k: "familie", ro: "Părinți / conținut despre familie", en: "Parents / family content" },
  { k: "vedete", ro: "Vedete și personalități publice", en: "Celebrities and public figures" },
  { k: "jurnalisti", ro: "Jurnaliști și prezentatori TV", en: "Journalists and TV presenters" },
  { k: "sportivi", ro: "Sportivi", en: "Athletes" },
  { k: "artisti", ro: "Artiști și cântăreți", en: "Artists and singers" },
  { k: "religios", ro: "Creatori de conținut religios", en: "Religious content creators" },
  { k: "antreprenori", ro: "Antreprenori", en: "Entrepreneurs" },
  { k: "medici", ro: "Medici și specialiști din sănătate", en: "Doctors and health specialists" },
  { k: "lifestyle", ro: "Creatori lifestyle", en: "Lifestyle creators" },
  { k: "micro_local", ro: "Microinfluenceri locali", en: "Local micro-influencers" },
  { k: "diaspora", ro: "Influenceri români din diaspora", en: "Romanian influencers abroad" },
] as const satisfies readonly ({ k: string } & Eticheta)[];
export type Categorie = (typeof CATEGORII)[number]["k"];
export const esteCategorie = (v: unknown): v is Categorie => typeof v === "string" && CATEGORII.some((c) => c.k === v);

// Pașii colaborării. Ordinea este cea din filtru.
export const ETAPE = [
  { k: "identificat", ro: "Influencer identificat", en: "Influencer identified" },
  { k: "pregatit", ro: "Pregătit pentru contactare", en: "Ready to contact" },
  { k: "asteptam", ro: "Așteptăm răspuns", en: "Waiting for a reply" },
  { k: "raspuns", ro: "A răspuns", en: "Replied" },
  { k: "accepta", ro: "Acceptă colaborarea", en: "Accepted" },
  { k: "materiale", ro: "Materiale transmise", en: "Materials sent" },
  { k: "distribuit", ro: "Campanie distribuită", en: "Campaign shared" },
  { k: "finalizat", ro: "Colaborare finalizată", en: "Collaboration completed" },
  { k: "ambasador", ro: "Ambasador permanent", en: "Permanent ambassador" },
  { k: "refuz", ro: "Refuz", en: "Declined" },
  { k: "stop", ro: "Nu mai contactăm", en: "Do not contact" },
] as const satisfies readonly ({ k: string } & Eticheta)[];
export type Etapa = (typeof ETAPE)[number]["k"];
export const esteEtapa = (v: unknown): v is Etapa => typeof v === "string" && ETAPE.some((e) => e.k === v);
// Etapele în care nu mai scriem nimănui (refuz sau cerere de a nu mai fi contactat).
export const ETAPE_FARA_CONTACT: ReadonlySet<string> = new Set(["refuz", "stop"]);
export const ETAPE_ACCEPTATE: ReadonlySet<string> = new Set(["accepta", "materiale", "distribuit", "finalizat", "ambasador"]);

export const PLATFORME = [
  { k: "instagram", ro: "Instagram", en: "Instagram" },
  { k: "facebook", ro: "Facebook", en: "Facebook" },
  { k: "tiktok", ro: "TikTok", en: "TikTok" },
  { k: "youtube", ro: "YouTube", en: "YouTube" },
] as const satisfies readonly ({ k: string } & Eticheta)[];
export type PlatformaSociala = (typeof PLATFORME)[number]["k"];
export const PLATFORME_CHEI: readonly PlatformaSociala[] = PLATFORME.map((p) => p.k);
export const estePlatforma = (v: unknown): v is PlatformaSociala => typeof v === "string" && (PLATFORME_CHEI as readonly string[]).includes(v);
// Canalele prin care se poate pregăti un mesaj (cele patru platforme + emailul profesional).
export type Canal = PlatformaSociala | "email";
export const esteCanal = (v: unknown): v is Canal => v === "email" || estePlatforma(v);

// Tipurile de intrări din istoric (jurnalul de audit al fișei).
export const ACTIVITATI = {
  creat: { ro: "Adăugat în CRM", en: "Added to the CRM" },
  import: { ro: "Importat", en: "Imported" },
  actualizat: { ro: "Profil actualizat", en: "Profile updated" },
  mesaj_trimis: { ro: "Mesaj trimis", en: "Message sent" },
  raspuns: { ro: "A răspuns", en: "Replied" },
  nota: { ro: "Notă", en: "Note" },
  etapa: { ro: "Etapă schimbată", en: "Stage changed" },
  follow_up: { ro: "Pas următor programat", en: "Next step scheduled" },
  distribuire: { ro: "Distribuire confirmată", en: "Share confirmed" },
  nu_contacta: { ro: "Nu mai contactăm", en: "Do not contact" },
  preluat: { ro: "Preluat de altă colegă", en: "Taken over by a colleague" },
  link: { ro: "Link unic creat", en: "Unique link created" },
} as const satisfies Record<string, Eticheta>;
export type TipActivitate = keyof typeof ACTIVITATI;
export const esteActivitate = (v: unknown): v is TipActivitate => typeof v === "string" && v in ACTIVITATI;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const esteUuid = (v: unknown): v is string => typeof v === "string" && UUID.test(v);

// ───────── Text și numere ─────────

// Text curățat: tăiat la lungime, fără caractere de control; gol => null.
export function text(v: unknown, max = 300): string | null {
  if (typeof v !== "string") return null;
  const t = v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").trim().slice(0, max);
  return t || null;
}

export type Urmaritori = Partial<Record<PlatformaSociala, number>>;

// Numărul de urmăritori: doar cele patru platforme, întregi între 1 și 10 miliarde; restul se ignoră.
export function curataUrmaritori(v: unknown): Urmaritori {
  const out: Urmaritori = {};
  if (!v || typeof v !== "object") return out;
  for (const k of PLATFORME_CHEI) {
    const brut = (v as Record<string, unknown>)[k];
    const n = typeof brut === "number" ? brut : Number(String(brut ?? "").replace(/[^\d]/g, ""));
    if (Number.isFinite(n) && n >= 1) out[k] = Math.min(Math.round(n), 10_000_000_000);
  }
  return out;
}

// ───────── Handle-uri și emailuri normalizate (deduplicare) ─────────

const GAZDE_CUNOSCUTE = /^(?:https?:\/\/)?(?:[a-z0-9-]+\.)*(?:instagram\.com|ig\.me|facebook\.com|fb\.com|fb\.me|m\.me|messenger\.com|tiktok\.com|youtube\.com|youtu\.be)(?=[/?#:]|$)/i;
const esteAdresa = (s: string) => /^https?:\/\//i.test(s) || GAZDE_CUNOSCUTE.test(s);

type Adresa = { gazda: string; segmente: string[]; query: URLSearchParams };

function adresa(brut: string): Adresa | null {
  const s = brut.trim();
  try {
    const u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
    // „www.”, „m.” etc. dispar, dar „m.me” rămâne întreg.
    const gazda = u.hostname.toLowerCase().replace(/^(?:www|m|mobile|web|mbasic|l|lm|business)\.(?=.+\.)/, "");
    const segmente = u.pathname
      .split("/")
      .filter(Boolean)
      .map((x) => {
        try {
          return decodeURIComponent(x);
        } catch {
          return x;
        }
      });
    return { gazda, segmente, query: u.searchParams };
  } catch {
    return null;
  }
}

const handleCurat = (h: string | undefined, re: RegExp): string | null => {
  const x = (h ?? "").trim().replace(/^@+/, "").toLowerCase();
  return re.test(x) ? x : null;
};

const RESERVATE_IG = new Set(["p", "reel", "reels", "explore", "stories", "tv", "accounts", "direct", "about", "legal", "developer", "web", "emails", "challenge", "directory", "privacy", "highlights", "locations"]);

export function normInstagram(v: string | null | undefined): string | null {
  const s = (v ?? "").trim();
  if (!s) return null;
  let h: string | undefined;
  if (esteAdresa(s)) {
    const a = adresa(s);
    if (!a) return null;
    if (a.gazda === "ig.me") h = a.segmente[0] === "m" ? a.segmente[1] : a.segmente[0];
    else if (a.gazda === "instagram.com") h = a.segmente[0] === "stories" ? a.segmente[1] : a.segmente[0];
    else return null;
    if (!h || RESERVATE_IG.has(h.toLowerCase())) return null;
  } else h = s;
  return handleCurat(h, /^[a-z0-9._]{1,30}$/);
}

const GAZDE_FACEBOOK = new Set(["facebook.com", "fb.com", "fb.me", "m.me", "messenger.com"]);
const RESERVATE_FB = new Set(["groups", "events", "watch", "share", "sharer", "sharer.php", "story.php", "permalink.php", "photo", "photo.php", "video", "videos", "reel", "reels", "hashtag", "login", "marketplace", "gaming", "stories", "public", "l.php", "dialog", "plugins", "help", "policies", "privacy", "about"]);

// Facebook: pagină sau profil după nume, sau după id numeric (profile.php?id=…, /people/Nume/<id>, /pages/Nume/<id>, /p/Nume-<id>).
export function normFacebook(v: string | null | undefined): string | null {
  let s = (v ?? "").trim();
  if (!s) return null;
  if (/^profile\.php\?/i.test(s)) s = `facebook.com/${s}`;
  let seg: string[];
  let query = new URLSearchParams();
  if (esteAdresa(s)) {
    const a = adresa(s);
    if (!a || !GAZDE_FACEBOOK.has(a.gazda)) return null;
    seg = a.gazda === "messenger.com" && a.segmente[0] === "t" ? a.segmente.slice(1) : a.segmente;
    query = a.query;
  } else seg = [s.replace(/^@+/, "")];
  const prim = (seg[0] ?? "").toLowerCase();
  if (!prim) return null;
  if (prim === "profile.php") {
    const id = query.get("id") ?? "";
    return /^\d{5,}$/.test(id) ? `id:${id}` : null;
  }
  if (prim === "people" || prim === "pages") {
    const id = [...seg].reverse().find((x) => /^\d{5,}$/.test(x));
    return id ? `id:${id}` : null;
  }
  if (prim === "p") {
    const m = /-(\d{9,})$/.exec(seg[1] ?? "");
    return m ? `id:${m[1]}` : null;
  }
  if (RESERVATE_FB.has(prim)) return null;
  if (/^\d{8,}$/.test(prim)) return `id:${prim}`;
  return /^[a-z0-9._-]{3,100}$/.test(prim) ? prim : null;
}

export function normTiktok(v: string | null | undefined): string | null {
  const s = (v ?? "").trim();
  if (!s) return null;
  if (esteAdresa(s)) {
    const a = adresa(s);
    if (!a || a.gazda !== "tiktok.com") return null;
    const prim = a.segmente[0] ?? "";
    return prim.startsWith("@") ? handleCurat(prim, /^[a-z0-9._]{2,24}$/) : null;
  }
  return handleCurat(s, /^[a-z0-9._]{2,24}$/);
}

// YouTube: canalul după id (/channel/UC…) sau după nume (@nume, /c/nume, /user/nume).
export function normYoutube(v: string | null | undefined): string | null {
  const s = (v ?? "").trim();
  if (!s) return null;
  if (esteAdresa(s)) {
    const a = adresa(s);
    if (!a || a.gazda !== "youtube.com") return null;
    const [p0, p1] = a.segmente;
    if (!p0) return null;
    if (p0.toLowerCase() === "channel") return p1 && /^[\w-]{10,}$/.test(p1) ? `channel:${p1.toLowerCase()}` : null;
    if (p0.startsWith("@")) return handleCurat(p0, /^[a-z0-9._-]{3,100}$/);
    if (p0.toLowerCase() === "c" || p0.toLowerCase() === "user") return handleCurat(p1, /^[a-z0-9._-]{3,100}$/);
    return null;
  }
  if (/^UC[\w-]{22}$/.test(s)) return `channel:${s.toLowerCase()}`;
  return handleCurat(s, /^[a-z0-9._-]{3,100}$/);
}

export function normEmail(v: string | null | undefined): string | null {
  const e = (v ?? "").trim().toLowerCase();
  return e.length <= 200 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e : null;
}

export type ContacteInfluencer = { instagram?: string | null; facebook?: string | null; tiktok?: string | null; youtube?: string | null; email?: string | null };
export type CheiNormalizate = Record<"instagram" | "facebook" | "tiktok" | "youtube" | "email", string | null>;

export function cheiNormalizate(c: ContacteInfluencer): CheiNormalizate {
  return { instagram: normInstagram(c.instagram), facebook: normFacebook(c.facebook), tiktok: normTiktok(c.tiktok), youtube: normYoutube(c.youtube), email: normEmail(c.email) };
}

// Cheile pentru lista de excludere: toate handle-urile și emailul, cu prefix de platformă („ig:ana.pop”, „fb:id:1000…”, „em:ana@exemplu.ro”).
export function listaChei(c: ContacteInfluencer): string[] {
  const n = cheiNormalizate(c);
  const out: string[] = [];
  if (n.instagram) out.push(`ig:${n.instagram}`);
  if (n.facebook) out.push(`fb:${n.facebook}`);
  if (n.tiktok) out.push(`tt:${n.tiktok}`);
  if (n.youtube) out.push(`yt:${n.youtube}`);
  if (n.email) out.push(`em:${n.email}`);
  return out;
}

// Numele afișat când nu există unul: handle-ul (cu @ unde se obișnuiește), apoi emailul.
export function numeDinContacte(c: ContacteInfluencer): string | null {
  const n = cheiNormalizate(c);
  if (n.instagram) return `@${n.instagram}`;
  if (n.tiktok) return `@${n.tiktok}`;
  if (n.youtube) return n.youtube.startsWith("channel:") ? "YouTube" : `@${n.youtube}`;
  if (n.facebook) return n.facebook.startsWith("id:") ? `Facebook ${n.facebook.slice(3)}` : n.facebook;
  if (n.email) return n.email;
  return null;
}

// ───────── Adrese de profil și de conversație (deschise de colegă; mesajul îl trimite ea) ─────────

export function urlProfil(platforma: PlatformaSociala, valoare: string | null | undefined): string | null {
  if (platforma === "instagram") {
    const h = normInstagram(valoare);
    return h ? `https://www.instagram.com/${h}/` : null;
  }
  if (platforma === "facebook") {
    const h = normFacebook(valoare);
    if (!h) return null;
    return h.startsWith("id:") ? `https://www.facebook.com/profile.php?id=${h.slice(3)}` : `https://www.facebook.com/${h}`;
  }
  if (platforma === "tiktok") {
    const h = normTiktok(valoare);
    return h ? `https://www.tiktok.com/@${h}` : null;
  }
  const h = normYoutube(valoare);
  if (!h) return null;
  return h.startsWith("channel:") ? `https://www.youtube.com/channel/${h.slice(8)}` : `https://www.youtube.com/@${h}`;
}

// Conversația se deschide direct pe Instagram (ig.me) și Facebook (m.me); la TikTok și YouTube se deschide profilul.
export function urlConversatie(platforma: PlatformaSociala, valoare: string | null | undefined): string | null {
  if (platforma === "instagram") {
    const h = normInstagram(valoare);
    return h ? `https://ig.me/m/${h}` : null;
  }
  if (platforma === "facebook") {
    const h = normFacebook(valoare);
    if (!h) return null;
    return `https://m.me/${h.startsWith("id:") ? h.slice(3) : h}`;
  }
  return urlProfil(platforma, valoare);
}

// ───────── Ordonare și filtrare pe platformă ─────────

type PentruOrdonare = { id: string; numePublic: string; actualizatLa: string; urmaritori: Urmaritori } & Record<PlatformaSociala, string | null>;

export function urmaritoriPe(urmaritori: Urmaritori | null | undefined, platforma: PlatformaSociala | null): number {
  const n = (k: PlatformaSociala) => Math.max(0, Number(urmaritori?.[k]) || 0);
  if (platforma) return n(platforma);
  return Math.max(0, ...PLATFORME_CHEI.map(n));
}

// Cu platformă aleasă apar doar influencerii care au cont acolo, ordonați după urmăritorii de pe acea platformă (egalitate: cei modificați mai recent, apoi alfabetic).
// Fără platformă: cei modificați mai recent.
export function ordoneazaInfluenceri<T extends PentruOrdonare>(lista: readonly T[], platforma: PlatformaSociala | null): T[] {
  const ai = (x: T) => (platforma ? Boolean((x[platforma] ?? "").trim()) : true);
  const filtrata = lista.filter(ai);
  return filtrata.sort((a, b) => {
    if (platforma) {
      const d = urmaritoriPe(b.urmaritori, platforma) - urmaritoriPe(a.urmaritori, platforma);
      if (d !== 0) return d;
    }
    const t = Date.parse(b.actualizatLa) - Date.parse(a.actualizatLa);
    if (Number.isFinite(t) && t !== 0) return t;
    return a.numePublic.localeCompare(b.numePublic, "ro") || a.id.localeCompare(b.id);
  });
}

// ───────── Urmărire: verificări și reveniri (nimic nu se trimite automat) ─────────

export type SetariUrmarire = {
  verificareZile: number; // după „Am trimis”: când verificăm dacă a răspuns
  revenireZile: number; // de la ultimul mesaj: când se poate trimite o revenire
  maxReveniri: number; // câte reveniri la un influencer, cel mult
  blocareColegZile: number; // câte zile după mesajul unei colege cerem confirmare înainte să scriem noi
};
export const SETARI_IMPLICITE: SetariUrmarire = { verificareZile: 3, revenireZile: 7, maxReveniri: 2, blocareColegZile: 14 };

export function curataSetari(x: Partial<Record<keyof SetariUrmarire, unknown>> | null | undefined): SetariUrmarire {
  const c = (v: unknown, min: number, max: number, implicit: number) => {
    // null / lipsă / text gol nu devin 0 (Number(null) = 0): rămâne valoarea implicită.
    const n = v === null || v === undefined || v === "" ? NaN : Math.round(Number(v));
    return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : implicit;
  };
  const D = SETARI_IMPLICITE;
  return {
    verificareZile: c(x?.verificareZile, 1, 30, D.verificareZile),
    revenireZile: c(x?.revenireZile, 2, 60, D.revenireZile),
    maxReveniri: c(x?.maxReveniri, 0, 5, D.maxReveniri),
    blocareColegZile: c(x?.blocareColegZile, 0, 60, D.blocareColegZile),
  };
}

const ZI_MS = 86_400_000;
const peste = (acum: Date, zile: number) => new Date(acum.getTime() + zile * ZI_MS);

export type TipPas = "verificare" | "revenire" | "manual";

// Ce se întâmplă după „Am trimis”: etapa „Așteptăm răspuns” și verificarea la +verificareZile. Primul mesaj nu e revenire; următoarele sunt reveniri și se numără.
export function dupaTrimitere(s: SetariUrmarire, stare: { nrReveniri: number; amContactat: boolean }, acum: Date): { nrReveniri: number; verificareLa: Date; limitaAtinsa: boolean } {
  const nrReveniri = stare.amContactat ? stare.nrReveniri + 1 : 0;
  return { nrReveniri, verificareLa: peste(acum, s.verificareZile), limitaAtinsa: nrReveniri >= s.maxReveniri };
}

// La verificare, dacă n-a răspuns: revenirea se poate trimite la +revenireZile de la ultimul mesaj (sau imediat, dacă termenul a trecut) — dar nu peste limită.
export function dupaVerificareFaraRaspuns(s: SetariUrmarire, stare: { nrReveniri: number; ultimaContactare: Date }, acum: Date): { revenireLa: Date | null; limitaAtinsa: boolean } {
  if (stare.nrReveniri >= s.maxReveniri) return { revenireLa: null, limitaAtinsa: true };
  const dorit = peste(stare.ultimaContactare, s.revenireZile);
  return { revenireLa: dorit.getTime() < acum.getTime() ? acum : dorit, limitaAtinsa: false };
}

export function poateReveni(s: SetariUrmarire, stare: { nrReveniri: number; ultimaContactare: Date | null }, acum: Date): boolean {
  if (!stare.ultimaContactare || stare.nrReveniri >= s.maxReveniri) return false;
  return acum.getTime() >= peste(stare.ultimaContactare, s.revenireZile).getTime();
}

export const reveniriRamase = (s: SetariUrmarire, nrReveniri: number): number => Math.max(0, s.maxReveniri - nrReveniri);

// ───────── Linkul unic al unei campanii: /r/<campanie>-i<cod aleator> ─────────
// Slugul e și valoarea utm_campaign a donațiilor atribuite (cel mult 60 de caractere, litere mici, cifre și liniuță). Nu conține numele persoanei.

export const ALFABET_COD = "abcdefghjkmnpqrstuvwxyz23456789"; // 31 de caractere, fără i, l, o, 0, 1 (se confundă la citit)
export const LUNGIME_COD = 8;
export const MAX_SLUG_LINK = 60;
const LIMITA_OCTET = Math.floor(256 / ALFABET_COD.length) * ALFABET_COD.length; // 248: octeții peste limită se ignoră (fără părtinire)

// Codul din octeți aleatori (criptografici, dați de apelant); null dacă nu au ajuns octeți buni.
export function codDinOcteti(octeti: ArrayLike<number>): string | null {
  let cod = "";
  for (let i = 0; i < octeti.length && cod.length < LUNGIME_COD; i++) {
    const b = octeti[i] ?? 0;
    if (b < LIMITA_OCTET) cod += ALFABET_COD[b % ALFABET_COD.length];
  }
  return cod.length === LUNGIME_COD ? cod : null;
}

// Partea de campanie din slug: slugul paginii, curățat și scurtat ca slugul întreg să încapă în 60 de caractere.
export function bazaSlugLink(slugCaz: string): string {
  const max = MAX_SLUG_LINK - 2 - LUNGIME_COD;
  const baza = slugCaz
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max)
    .replace(/-+$/g, "");
  return baza || "caz";
}

export function construiesteSlugLink(slugCaz: string, cod: string): string {
  return `${bazaSlugLink(slugCaz)}-i${cod}`;
}

const RE_SLUG_LINK = /^[a-z0-9](?:[a-z0-9-]{0,48}[a-z0-9])?-i[a-hjkmnp-z2-9]{8}$/;
export const esteSlugLink = (v: unknown): v is string => typeof v === "string" && v.length <= MAX_SLUG_LINK && RE_SLUG_LINK.test(v);

// Parametrii cu care ruta /r trimite vizitatorul pe pagina campaniei, ca donația să poarte exact slugul în utm_campaign.
export function parametriUtm(canal: Canal, slug: string): Record<"utm_source" | "utm_medium" | "utm_campaign" | "utm_content", string> {
  return { utm_source: canal, utm_medium: canal === "email" ? "email" : "social", utm_campaign: slug, utm_content: "influenceri" };
}

// ───────── Coordonare între colege ─────────

// Altă colegă a scris recent aceluiași influencer? (ultimul mesaj trimis: cine și când)
export function blocatDeColega(ultim: { userId: string | null; la: Date } | null, userId: string, acum: Date, zile: number): boolean {
  if (!ultim || zile <= 0 || !ultim.userId || ultim.userId === userId) return false;
  return acum.getTime() - ultim.la.getTime() < zile * ZI_MS;
}

// ───────── Filtrele listei (parametri din adresă) ─────────

export const PRAGURI_AUDIENTA = [5_000, 20_000, 100_000, 500_000] as const;

export type FiltreLista = {
  q?: string;
  platforma?: PlatformaSociala;
  categorie?: Categorie;
  etapa?: Etapa;
  responsabil?: string; // uuid sau „fara”
  caz?: string; // uuid
  judet?: string; // text brut (se verifică pe server) sau „diaspora” / „fara”
  urmMin?: number;
  scadente?: boolean;
};

type ParamUrl = string | readonly string[] | undefined;
const primul = (v: ParamUrl): string | undefined => (typeof v === "string" ? v : v?.[0]);

// Un parametru repetat vine ca listă: se ia primul. Valorile de tip listă albă se verifică; textul liber se taie; numerele se plafonează la praguri cunoscute.
export function parseazaFiltre(sp: Record<string, ParamUrl>): FiltreLista {
  const f: FiltreLista = {};
  const q = text(primul(sp.q), 100);
  if (q) f.q = q;
  const plat = primul(sp.plat);
  if (estePlatforma(plat)) f.platforma = plat;
  const cat = primul(sp.cat);
  if (esteCategorie(cat)) f.categorie = cat;
  const etapa = primul(sp.etapa);
  if (esteEtapa(etapa)) f.etapa = etapa;
  const resp = primul(sp.resp);
  if (resp === "fara" || esteUuid(resp)) f.responsabil = resp;
  const caz = primul(sp.caz);
  if (esteUuid(caz)) f.caz = caz;
  const judet = text(primul(sp.judet), 40);
  if (judet) f.judet = judet;
  const urm = Number(primul(sp.urm));
  if ((PRAGURI_AUDIENTA as readonly number[]).includes(urm)) f.urmMin = urm;
  if (primul(sp.scad) === "1") f.scadente = true;
  return f;
}

// ───────── Categoria dintr-un text liber (import) ─────────

const normText = (s: string): string =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[_\-./]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

// „familie”, „Sportivi”, „micro local”, „Artiști și cântăreți” (RO sau EN) => cheia categoriei; text necunoscut => null (rămâne categoria implicită).
export function categorieDin(v: string | null | undefined): Categorie | null {
  const n = normText(v ?? "");
  if (!n) return null;
  for (const c of CATEGORII) if (normText(c.k) === n || normText(c.ro) === n || normText(c.en) === n) return c.k;
  for (const c of CATEGORII) if (n.length >= 4 && (normText(c.ro).startsWith(n) || normText(c.en).startsWith(n) || n.includes(normText(c.k)))) return c.k;
  return null;
}

// Filtrele înapoi în parametrii adresei (invers lui parseazaFiltre); `schimbari` suprascrie sau scoate (undefined) un parametru.
export function parametriDinFiltre(f: FiltreLista, schimbari: Partial<Record<"q" | "plat" | "cat" | "etapa" | "resp" | "caz" | "judet" | "urm" | "scad", string | undefined>> = {}): URLSearchParams {
  const baza: Record<string, string | undefined> = {
    q: f.q,
    plat: f.platforma,
    cat: f.categorie,
    etapa: f.etapa,
    resp: f.responsabil,
    caz: f.caz,
    judet: f.judet,
    urm: f.urmMin ? String(f.urmMin) : undefined,
    scad: f.scadente ? "1" : undefined,
    ...schimbari,
  };
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(baza)) if (v) p.set(k, v);
  return p;
}

// Cum se arată un profil în listă: „@nume” (sau numele paginii de Facebook, id-ul numeric, „YouTube” pentru un canal după id).
export function etichetaProfil(platforma: PlatformaSociala, valoare: string | null | undefined): string {
  const n = platforma === "instagram" ? normInstagram(valoare) : platforma === "facebook" ? normFacebook(valoare) : platforma === "tiktok" ? normTiktok(valoare) : normYoutube(valoare);
  if (!n) return (valoare ?? "").trim().slice(0, 40);
  if (n.startsWith("id:")) return n.slice(3);
  if (n.startsWith("channel:")) return "YouTube";
  return platforma === "facebook" ? n : `@${n}`;
}
