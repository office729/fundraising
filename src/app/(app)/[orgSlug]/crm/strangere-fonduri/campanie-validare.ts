// Validarea asistentului de creare a campaniei — logică pură (fără React, fără baza de date), ca să poată fi testată.
// Regulile sunt cele ale acțiunii de pe server (creeazaPaginaAdminAction), plus câteva praguri de calitate afișate ca avertismente.
// Erorile sunt CODURI; textul lor, în română sau engleză, e în campanie-texte.ts.

import type { CodAvertisment, CodEroare } from "./campanie-texte";

export type CampanieForm = {
  titlu: string;
  template: string;
  sumaTinta: string;
  termen: string;
  judet: string;
  localitate: string;
  poveste: string;
  numeCreator: string;
  emailCreator: string;
};

export const CAMPANIE_GOALA: CampanieForm = { titlu: "", template: "", sumaTinta: "", termen: "", judet: "", localitate: "", poveste: "", numeCreator: "", emailCreator: "" };

export const LIMITE = { titluMin: 5, titluMax: 120, povesteMin: 40, povesteRecomandat: 300, povesteMax: 8000, sumaMax: 10_000_000 } as const;

export const NR_PASI = 5;
export type EroriCampanie = Partial<Record<keyof CampanieForm, CodEroare>>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DATA = /^(\d{4})-(\d{2})-(\d{2})$/;

// Termenul campaniei: gol = fără termen; altfel o dată „YYYY-MM-DD” reală, cel mult 3 ani în viitor.
// `azi` e data de azi („YYYY-MM-DD”), dată de apelant. Termenul din trecut e refuzat doar la creare (`permiteTrecut: false`).
export function parseazaTermen(brut: string, azi: string, permiteTrecut = false): { valoare: string | null; eroare: CodEroare | null } {
  const t = brut.trim();
  if (!t) return { valoare: null, eroare: null };
  const m = DATA.exec(t);
  const d = m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])) : null;
  if (!m || !d || d.getUTCFullYear() !== +m[1] || d.getUTCMonth() !== +m[2] - 1 || d.getUTCDate() !== +m[3]) return { valoare: null, eroare: "termen.invalid" };
  if (!permiteTrecut && t < azi) return { valoare: null, eroare: "termen.trecut" };
  const limita = new Date(`${azi}T00:00:00Z`);
  limita.setUTCFullYear(limita.getUTCFullYear() + 3);
  if (d > limita) return { valoare: null, eroare: "termen.departe" };
  return { valoare: t, eroare: null };
}

// Zile rămase până la termen (0 = azi, negativ = depășit).
export function zileRamase(termen: string, azi: string): number {
  return Math.round((Date.parse(`${termen}T00:00:00Z`) - Date.parse(`${azi}T00:00:00Z`)) / 86_400_000);
}

// Data de azi în România, „YYYY-MM-DD”.
export function aziRo(acum: Date = new Date()): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Bucharest", year: "numeric", month: "2-digit", day: "2-digit" }).format(acum);
}

// Data „YYYY-MM-DD” cu `zile` zile după `de_la`.
export function adaugaZile(de_la: string, zile: number): string {
  const d = new Date(`${de_la}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + zile);
  return d.toISOString().slice(0, 10);
}

// Suma țintă: gol = fără țintă; altfel un număr întreg pozitiv (acceptă „10.000”, „10 000”, „10000”).
export function parseazaSuma(brut: string): { valoare: number | null; eroare: CodEroare | null } {
  const curat = brut.replace(/[\s.]/g, "").replace(",", ".");
  if (!curat) return { valoare: null, eroare: null };
  const n = Number(curat);
  if (!Number.isFinite(n) || n <= 0) return { valoare: null, eroare: "suma.invalida" };
  if (n > LIMITE.sumaMax) return { valoare: null, eroare: "suma.mare" };
  return { valoare: Math.round(n), eroare: null };
}

export function valideazaPas(pas: number, f: CampanieForm, azi: string = aziRo()): EroriCampanie {
  const e: EroriCampanie = {};
  if (pas === 0) {
    const titlu = f.titlu.trim();
    if (!titlu) e.titlu = "titlu.gol";
    else if (titlu.length < LIMITE.titluMin) e.titlu = "titlu.scurt";
    else if (titlu.length > LIMITE.titluMax) e.titlu = "titlu.lung";
    if (!f.template) e.template = "template.gol";
    const suma = parseazaSuma(f.sumaTinta);
    if (suma.eroare) e.sumaTinta = suma.eroare;
    const termen = parseazaTermen(f.termen, azi);
    if (termen.eroare) e.termen = termen.eroare;
    if (!f.numeCreator.trim()) e.numeCreator = "nume.gol";
    const email = f.emailCreator.trim();
    if (!email) e.emailCreator = "email.gol";
    else if (!EMAIL.test(email)) e.emailCreator = "email.invalid";
  }
  if (pas === 1) {
    const poveste = f.poveste.trim();
    if (!poveste) e.poveste = "poveste.gol";
    else if (poveste.length < LIMITE.povesteMin) e.poveste = "poveste.scurta";
    else if (poveste.length > LIMITE.povesteMax) e.poveste = "poveste.lunga";
  }
  return e;
}

// Toate erorile care blochează publicarea, cu primul pas care trebuie corectat.
export function valideazaTot(f: CampanieForm, azi: string = aziRo()): { erori: EroriCampanie; primulPas: number | null } {
  const e0 = valideazaPas(0, f, azi);
  const e1 = valideazaPas(1, f, azi);
  const erori = { ...e0, ...e1 };
  const primulPas = Object.keys(e0).length ? 0 : Object.keys(e1).length ? 1 : null;
  return { erori, primulPas };
}

export type Avertisment = { cheie: CodAvertisment; pas: number };

// Lucruri care nu blochează publicarea, dar fac campania mai slabă. Afișate la verificare.
export function avertismente(f: CampanieForm, areImagine: boolean): Avertisment[] {
  const a: Avertisment[] = [];
  const poveste = f.poveste.trim().length;
  if (poveste > 0 && poveste < LIMITE.povesteRecomandat) a.push({ cheie: "poveste", pas: 1 });
  if (!areImagine) a.push({ cheie: "poza", pas: 2 });
  if (!parseazaSuma(f.sumaTinta).valoare) a.push({ cheie: "tinta", pas: 0 });
  if (!f.termen.trim()) a.push({ cheie: "termen", pas: 0 });
  if (!f.judet.trim()) a.push({ cheie: "judet", pas: 0 });
  return a;
}

export const arataGol = (f: CampanieForm) => !(f.titlu.trim() || f.poveste.trim() || f.sumaTinta.trim() || f.termen.trim() || f.judet.trim() || f.localitate.trim());
