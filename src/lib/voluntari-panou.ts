// Logica pură a panoului voluntarilor (fără acces la baza de date, deci ușor de testat): canale, ziua după ora României,
// mesaje variate, alocarea misiunii zilei, insigne.

export const CANALE_VOLUNTAR = [
  { id: "whatsapp", nume: "WhatsApp", actiune: "Trimite pe WhatsApp către 3 persoane apropiate" },
  { id: "facebook", nume: "Facebook", actiune: "Postează pe profilul tău de Facebook" },
  { id: "instagram", nume: "Instagram", actiune: "Postează în Story pe Instagram" },
  { id: "linkedin", nume: "LinkedIn", actiune: "Postează pe LinkedIn" },
  { id: "email", nume: "Email", actiune: "Trimite pe email unor prieteni sau colegi" },
] as const;
export type CanalId = (typeof CANALE_VOLUNTAR)[number]["id"];
export const CANAL_IDS: CanalId[] = CANALE_VOLUNTAR.map((c) => c.id);
const CAN_LEN = CANAL_IDS.length;
export const esteCanal = (x: unknown): x is CanalId => typeof x === "string" && (CANAL_IDS as string[]).includes(x);
export const numeCanal = (id: string): string => CANALE_VOLUNTAR.find((c) => c.id === id)?.nume ?? id;

export const MISIUNE_NR = 5;

// ===== Cod link =====
// 12 caractere din alfabetul codurilor scurte (fără caractere ambigue) — vezi lib/short-code.ts.
export const COD_VOLUNTAR_REGEX = /^[2-9A-HJ-NP-Za-km-z]{12}$/;

// ===== Ziua după ora României =====
export function ziuaRo(data: Date = new Date()): string {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Bucharest", year: "numeric", month: "2-digit", day: "2-digit" }).format(data);
  return p; // en-CA => YYYY-MM-DD
}

function dinIso(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
function laIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}
export function adaugaZile(iso: string, zile: number): string {
  const d = dinIso(iso);
  d.setUTCDate(d.getUTCDate() + zile);
  return laIso(d);
}
// Data de luni a săptămânii care conține ziua dată.
export function luniSaptamana(iso: string): string {
  const d = dinIso(iso);
  const zi = (d.getUTCDay() + 6) % 7; // luni = 0
  return adaugaZile(iso, -zi);
}
// Săptămâna aceasta, viitoarea și următoarele 6 (de luni până vineri) — pentru alegerea campaniei săptămânii.
export function saptamaniDisponibile(azi: string): { luni: string; eticheta: string }[] {
  const start = luniSaptamana(azi);
  const f = (iso: string) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}`;
  return Array.from({ length: 8 }, (_, i) => {
    const luni = adaugaZile(start, i * 7);
    const prefix = i === 0 ? "Săptămâna aceasta" : i === 1 ? "Săptămâna viitoare" : "Săptămâna";
    return { luni, eticheta: `${prefix} · ${f(luni)} – ${f(adaugaZile(luni, 4))}` };
  });
}

// ===== Telefon =====
// Ultimele 9 cifre (fără prefix de țară), sau null dacă numărul e prea scurt ca să fie potrivit în siguranță.
export function normalizeazaTelefon(s: string | null | undefined): string | null {
  const cifre = String(s ?? "").replace(/\D/g, "");
  return cifre.length >= 9 ? cifre.slice(-9) : null;
}

// ===== Mesaje variate =====
export const VARIANTE_INTRO = [
  "Am dat de o campanie care merită susținută:",
  "Aș vrea să îți arăt ceva la care țin:",
  "Dacă ai un minut, te rog citește asta:",
  "O cauză la care contribui și eu, poate te alături:",
  "Un lucru bun la care putem ajuta împreună:",
  "Mă ajuți să dau mai departe această campanie?",
];

const scurt = (s: string, max: number): string => {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const taiat = t.slice(0, max);
  const ultimulSpatiu = taiat.lastIndexOf(" ");
  return `${taiat.slice(0, ultimulSpatiu > max * 0.6 ? ultimulSpatiu : max).trimEnd()}…`;
};

// Mesajul gata de copiat. Textul propriu al echipei (per campanie sau implicit) are prioritate; {titlu} și {link} se înlocuiesc,
// iar dacă lipsește {link}, linkul se adaugă la final. Fără text propriu, începutul se schimbă la fiecare copiere (6 variante).
export function construiesteMesaj(p: { titlu: string; poveste: string; link: string; custom?: string | null; varianta?: number }): string {
  const custom = p.custom?.trim();
  if (custom) {
    const cuTitlu = custom.replaceAll("{titlu}", p.titlu);
    return cuTitlu.includes("{link}") ? cuTitlu.replaceAll("{link}", p.link) : `${cuTitlu}\n\n${p.link}`;
  }
  const i = (((p.varianta ?? 0) % VARIANTE_INTRO.length) + VARIANTE_INTRO.length) % VARIANTE_INTRO.length;
  const rezumat = scurt(p.poveste, 180);
  return `${VARIANTE_INTRO[i]}\n\n${p.titlu}${rezumat ? `\n${rezumat}` : ""}\n\n${p.link}`;
}

// ===== Alocarea misiunii zilei =====
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export type CampaniePentruMisiune = { id: string; progres: number | null }; // progres 0–1; null = fără țintă

// Până la 5 acțiuni (campanie + canal), fiecare combinație o singură dată. Întâi campania săptămânii (până la 3 canale diferite),
// apoi rotație între celelalte campanii, începând cu cele mai departe de țintă; canalul diferă de la un voluntar și de la o zi la alta.
export function alegeMisiune(p: { campanii: CampaniePentruMisiune[]; campaniaSaptamanii: string | null; seed: string; nr?: number }): { campaignId: string; canal: CanalId }[] {
  const nr = p.nr ?? MISIUNE_NR;
  if (p.campanii.length === 0) return [];
  const offset = hash(p.seed) % CAN_LEN;
  const canale = (k: number): CanalId => CANAL_IDS[(offset + k) % CAN_LEN];
  const rezultat: { campaignId: string; canal: CanalId }[] = [];
  const folosite = new Set<string>();
  const adauga = (campaignId: string, canal: CanalId): boolean => {
    const cheie = `${campaignId}|${canal}`;
    if (folosite.has(cheie) || rezultat.length >= nr) return false;
    folosite.add(cheie);
    rezultat.push({ campaignId, canal });
    return true;
  };

  const vedeta = p.campaniaSaptamanii && p.campanii.some((c) => c.id === p.campaniaSaptamanii) ? p.campaniaSaptamanii : null;
  if (vedeta) for (let k = 0; k < 3; k++) adauga(vedeta, canale(k));

  const altele = p.campanii
    .filter((c) => c.id !== vedeta)
    .sort((a, b) => (a.progres ?? 0.5) - (b.progres ?? 0.5) || a.id.localeCompare(b.id));
  // Cel mult CAN_LEN tururi: după ele toate combinațiile posibile au fost încercate.
  for (let tur = 0; tur < CAN_LEN && rezultat.length < nr; tur++) {
    for (let i = 0; i < altele.length && rezultat.length < nr; i++) adauga(altele[i].id, canale(tur + i + 3));
  }
  // Dacă rămân locuri (puține campanii), completăm cu restul canalelor campaniei săptămânii.
  if (vedeta) for (let k = 3; k < CAN_LEN && rezultat.length < nr; k++) adauga(vedeta, canale(k));
  return rezultat;
}

// ===== Insigne =====
export const INSIGNE = [
  { prag: 1, nume: "Primul pas" },
  { prag: 10, nume: "Voce activă" },
  { prag: 50, nume: "Ambasador" },
  { prag: 100, nume: "Campion al comunității" },
] as const;
export function insigneObtinute(total: number): readonly (typeof INSIGNE)[number][] {
  return INSIGNE.filter((i) => total >= i.prag);
}
export function urmatoareaInsigna(total: number): (typeof INSIGNE)[number] | null {
  return INSIGNE.find((i) => total < i.prag) ?? null;
}
