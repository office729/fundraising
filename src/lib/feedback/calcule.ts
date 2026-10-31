// Feedback de la utilizatorii platformei: chestionarul de satisfacție (NPS + note pe arii) și sugestiile. Funcții pure, fără importuri, ca să poată fi testate.

export const ARII_NOTE = [
  { cheie: "usurinta", eticheta: "Cât de ușor e de folosit" },
  { cheie: "utilitate", eticheta: "Cât de utile îți sunt funcțiile" },
  { cheie: "viteza", eticheta: "Viteza și stabilitatea platformei" },
  { cheie: "suport", eticheta: "Ajutorul și suportul primit" },
  { cheie: "pret", eticheta: "Raportul dintre calitate și preț" },
] as const;

export const MODULE_FOLOSITE = [
  { cheie: "donatori", eticheta: "Donatori (persoane fizice)" },
  { cheie: "companii", eticheta: "Companii și sponsorizări" },
  { cheie: "d177", eticheta: "Declarația 177" },
  { cheie: "formular-230", eticheta: "Formularul 230" },
  { cheie: "pagini-donatie", eticheta: "Pagini de donație și campanii" },
  { cheie: "granturi", eticheta: "Granturi" },
  { cheie: "calendar", eticheta: "Calendarul de fundraising" },
  { cheie: "voluntari", eticheta: "Voluntari" },
  { cheie: "kpi", eticheta: "KPI și performanță" },
  { cheie: "comunicare", eticheta: "Newsletter și comunicare" },
  { cheie: "instrumente", eticheta: "Instrumentele de design și rapoarte" },
] as const;

export const CATEGORII_SUGESTIE = [
  { cheie: "functie-noua", eticheta: "O funcție nouă" },
  { cheie: "imbunatatire", eticheta: "O îmbunătățire la ce există" },
  { cheie: "problema", eticheta: "O problemă sau o greșeală" },
  { cheie: "integrare", eticheta: "O integrare cu alt serviciu" },
  { cheie: "pret-pachete", eticheta: "Prețuri și pachete" },
  { cheie: "altceva", eticheta: "Altceva" },
] as const;

export const STARI_SUGESTIE = [
  { cheie: "nou", eticheta: "Primită", ton: "neutral" },
  { cheie: "in-analiza", eticheta: "În analiză", ton: "blue" },
  { cheie: "planificat", eticheta: "Planificată", ton: "amber" },
  { cheie: "livrat", eticheta: "Livrată", ton: "green" },
  { cheie: "nu-acum", eticheta: "Nu acum", ton: "neutral" },
] as const;

export type StareSugestie = (typeof STARI_SUGESTIE)[number]["cheie"];

export const MAX_MESAJ = 2000;
export const MAX_TITLU = 120;
export const MAX_TEXT_CHESTIONAR = 1500;
export const ZILE_INTRE_CHESTIONARE = 30; // un utilizator trimite cel mult un chestionar pe lună
export const ZILE_PANA_LA_INVITATIE = 5; // abia după câteva zile de folosire merită întrebat
export const ZILE_REINVITARE = 90; // cine a răspuns nu mai e invitat 3 luni
export const MAX_SUGESTII_PE_ZI = 5; // pe organizație

const CHEI_ARII: string[] = ARII_NOTE.map((a) => a.cheie);
const CHEI_MODULE: string[] = MODULE_FOLOSITE.map((m) => m.cheie);
const CHEI_CATEGORII: string[] = CATEGORII_SUGESTIE.map((c) => c.cheie);
const CHEI_STARI: string[] = STARI_SUGESTIE.map((s) => s.cheie);

export const esteStareSugestie = (x: unknown): x is StareSugestie => typeof x === "string" && CHEI_STARI.includes(x);

const text = (x: unknown, max: number): string => (typeof x === "string" ? x.replace(/\r\n/g, "\n").trim().slice(0, max) : "");
const intrInterval = (x: unknown, min: number, max: number): number | null => {
  const n = typeof x === "number" ? x : typeof x === "string" && x.trim() !== "" ? Number(x) : NaN;
  return Number.isInteger(n) && n >= min && n <= max ? n : null;
};

export type ChestionarInput = {
  nps: number | null;
  satisfactie: number | null;
  note: Record<string, number | null>;
  module: string[];
  cePlace: string;
  ceLipseste: string;
  poateContacta: boolean;
};

export type ChestionarValid = {
  nps: number;
  satisfactie: number;
  note: Record<string, number>;
  module: string[];
  cePlace: string | null;
  ceLipseste: string | null;
  poateContacta: boolean;
};

// `locale` (implicit „ro”) alege limba mesajelor de eroare; textele românești rămân cele verificate de teste.
export function valideazaChestionar(input: unknown, locale: "ro" | "en" = "ro"): { ok: true; v: ChestionarValid } | { ok: false; eroare: string } {
  const t = (ro: string, en: string) => (locale === "en" ? en : ro);
  const i = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const nps = intrInterval(i.nps, 0, 10);
  if (nps === null) return { ok: false, eroare: t("Alege un număr de la 0 la 10 la prima întrebare.", "Choose a number from 0 to 10 for the first question.") };
  const satisfactie = intrInterval(i.satisfactie, 1, 5);
  if (satisfactie === null) return { ok: false, eroare: t("Spune cât de mulțumit ești în general (de la 1 la 5).", "Tell us how satisfied you are overall (from 1 to 5).") };
  const note: Record<string, number> = {};
  const notePrimite = (i.note && typeof i.note === "object" ? i.note : {}) as Record<string, unknown>;
  for (const cheie of CHEI_ARII) {
    const n = intrInterval(notePrimite[cheie], 1, 5);
    if (n !== null) note[cheie] = n;
  }
  const folosite = Array.isArray(i.module) ? [...new Set(i.module.filter((m): m is string => typeof m === "string" && CHEI_MODULE.includes(m)))] : [];
  const cePlace = text(i.cePlace, MAX_TEXT_CHESTIONAR);
  const ceLipseste = text(i.ceLipseste, MAX_TEXT_CHESTIONAR);
  return { ok: true, v: { nps, satisfactie, note, module: folosite, cePlace: cePlace || null, ceLipseste: ceLipseste || null, poateContacta: i.poateContacta === true } };
}

export type SugestieInput = { categorie: string; titlu: string; mesaj: string; poateContacta: boolean };
export type SugestieValida = { categorie: string; titlu: string; mesaj: string; poateContacta: boolean };

export function valideazaSugestie(input: unknown, locale: "ro" | "en" = "ro"): { ok: true; v: SugestieValida } | { ok: false; eroare: string } {
  const t = (ro: string, en: string) => (locale === "en" ? en : ro);
  const i = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const categorie = typeof i.categorie === "string" && CHEI_CATEGORII.includes(i.categorie) ? i.categorie : null;
  if (!categorie) return { ok: false, eroare: t("Alege ce fel de sugestie este.", "Choose what kind of suggestion this is.") };
  const titlu = text(i.titlu, MAX_TITLU);
  if (titlu.length < 3) return { ok: false, eroare: t("Dă un titlu scurt sugestiei (cel puțin 3 caractere).", "Give your suggestion a short title (at least 3 characters).") };
  const mesaj = text(i.mesaj, MAX_MESAJ);
  if (mesaj.length < 10) return { ok: false, eroare: t("Descrie sugestia în câteva cuvinte (cel puțin 10 caractere).", "Describe your suggestion in a few words (at least 10 characters).") };
  return { ok: true, v: { categorie, titlu, mesaj, poateContacta: i.poateContacta === true } };
}

// Net Promoter Score: promotori (9–10), pasivi (7–8), detractori (0–6).
export type CategorieNps = "promotor" | "pasiv" | "detractor";
export const categorieNps = (n: number): CategorieNps => (n >= 9 ? "promotor" : n >= 7 ? "pasiv" : "detractor");

export type RezultatNps = { nr: number; promotori: number; pasivi: number; detractori: number; nps: number | null };

// NPS = % promotori − % detractori, rotunjit la întreg, de la −100 la +100; fără răspunsuri nu există scor.
export function calculeazaNps(scoruri: number[]): RezultatNps {
  const r: RezultatNps = { nr: 0, promotori: 0, pasivi: 0, detractori: 0, nps: null };
  for (const s of scoruri) {
    if (!Number.isInteger(s) || s < 0 || s > 10) continue;
    r.nr += 1;
    const c = categorieNps(s);
    if (c === "promotor") r.promotori += 1;
    else if (c === "pasiv") r.pasivi += 1;
    else r.detractori += 1;
  }
  if (r.nr > 0) r.nps = Math.round(((r.promotori - r.detractori) / r.nr) * 100);
  return r;
}

const medie = (v: number[]): number | null => (v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10 : null);

export type RandChestionar = { nps: number | null; satisfactie: number | null; note: Record<string, number>; module: string[]; createdAt: Date };

export type RezumatChestionare = {
  nr: number;
  nps: RezultatNps;
  satisfactieMedie: number | null;
  mediiArii: { cheie: string; eticheta: string; medie: number | null; nr: number }[];
  moduleFrecvente: { cheie: string; eticheta: string; nr: number }[];
  pelUna: { luna: string; nr: number; nps: number | null }[];
};

export function rezumaChestionare(randuri: RandChestionar[]): RezumatChestionare {
  const npsuri = randuri.map((r) => r.nps).filter((x): x is number => x !== null);
  const arii = ARII_NOTE.map((a) => {
    const v = randuri.map((r) => r.note[a.cheie]).filter((x): x is number => typeof x === "number");
    return { cheie: a.cheie as string, eticheta: a.eticheta as string, medie: medie(v), nr: v.length };
  });
  const numarare = new Map<string, number>();
  for (const r of randuri) for (const m of r.module) numarare.set(m, (numarare.get(m) ?? 0) + 1);
  const moduleFrecvente = MODULE_FOLOSITE.map((m) => ({ cheie: m.cheie as string, eticheta: m.eticheta as string, nr: numarare.get(m.cheie) ?? 0 }))
    .filter((m) => m.nr > 0)
    .sort((a, b) => b.nr - a.nr);
  const peLuna = new Map<string, number[]>();
  for (const r of randuri) {
    if (r.nps === null) continue;
    const luna = `${r.createdAt.getUTCFullYear()}-${String(r.createdAt.getUTCMonth() + 1).padStart(2, "0")}`;
    peLuna.set(luna, [...(peLuna.get(luna) ?? []), r.nps]);
  }
  const pelUna = [...peLuna.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([luna, v]) => ({ luna, nr: v.length, nps: calculeazaNps(v).nps }));
  return {
    nr: randuri.length,
    nps: calculeazaNps(npsuri),
    satisfactieMedie: medie(randuri.map((r) => r.satisfactie).filter((x): x is number => x !== null)),
    mediiArii: arii,
    moduleFrecvente,
    pelUna,
  };
}

const MS_ZI = 86_400_000;

// Când apare invitația de a completa chestionarul: după câteva zile de la înscriere și numai dacă utilizatorul n-a răspuns de curând.
export function trebuieInvitat(zileDeLaInscriere: number, ultimulChestionarLa: Date | null, acum: Date): boolean {
  if (zileDeLaInscriere < ZILE_PANA_LA_INVITATIE) return false;
  if (!ultimulChestionarLa) return true;
  return (acum.getTime() - ultimulChestionarLa.getTime()) / MS_ZI >= ZILE_REINVITARE;
}

// Cât mai așteaptă până poate trimite un nou chestionar (0 = poate acum).
export function zileRamaseChestionar(ultimulChestionarLa: Date | null, acum: Date): number {
  if (!ultimulChestionarLa) return 0;
  const trecute = (acum.getTime() - ultimulChestionarLa.getTime()) / MS_ZI;
  return trecute >= ZILE_INTRE_CHESTIONARE ? 0 : Math.ceil(ZILE_INTRE_CHESTIONARE - trecute);
}
