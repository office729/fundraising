// Lista de lead-uri (ONG-urile care au completat formularul de pe site): stările, validarea modificărilor și exportul CSV.
// Fișier fără importuri, ca să se poată testa direct.

export const STARI_LEAD = ["nou", "contactat", "in_discutie", "inscris", "pierdut"] as const;
export type StareLead = (typeof STARI_LEAD)[number];

export const ETICHETE_STARE: Record<StareLead, string> = {
  nou: "Nou",
  contactat: "Contactat",
  in_discutie: "În discuție",
  inscris: "Înscris",
  pierdut: "Pierdut",
};

export const MAX_NOTITA = 2000;

export function esteStareLead(x: unknown): x is StareLead {
  return typeof x === "string" && (STARI_LEAD as readonly string[]).includes(x);
}

// Notița: text simplu, fără caractere de control (în afară de rând nou), tăiat la limită; gol = fără notiță.
export function curataNotita(brut: unknown): string | null {
  if (typeof brut !== "string") return null;
  const t = brut.replace(/\r\n/g, "\n").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim().slice(0, MAX_NOTITA);
  return t === "" ? null : t;
}

// Textul de căutare: litere mici, fără diacritice, ca „Asociația” să se găsească și cu „asociatia”.
export function normalizeazaCautare(t: string): string {
  return t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

export type LeadCautabil = { nume: string; organizatie: string; email: string; telefon: string | null; campanie: string | null };

export function potriveste(lead: LeadCautabil, cautare: string): boolean {
  const c = normalizeazaCautare(cautare);
  if (!c) return true;
  return normalizeazaCautare([lead.nume, lead.organizatie, lead.email, lead.telefon ?? "", lead.campanie ?? ""].join(" ")).includes(c);
}

// Celulă CSV: ghilimele duble escapate; o valoare care începe cu = + - @ (sau tab/CR) primește un apostrof în față, ca Excel să n-o execute ca formulă.
export function celulaCsv(v: string | number | null | undefined): string {
  let t = v === null || v === undefined ? "" : String(v);
  // Un număr de telefon („+40 757 401 042”) nu e formulă și nu primește apostrof; orice altceva care începe cu = + - @ (sau tab/CR) da.
  if (/^[=+\-@\t\r]/.test(t) && !/^\+\d[\d\s().-]{5,}$/.test(t)) t = `'${t}`;
  return /[",\n\r;]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
}

export type LeadCsv = { creatLa: string; nume: string; organizatie: string; email: string; telefon: string | null; stare: StareLead; campanie: string | null; cale: string | null; nrTrimiteri: number; notita: string | null; provenienta?: string | null };

export function leaduriCaCsv(leaduri: LeadCsv[]): string {
  const antet = ["Data", "Nume", "Organizație", "E-mail", "Telefon", "Stare", "Campanie", "Sursă măsurată", "Pagina", "Trimiteri", "Notiță"];
  const randuri = leaduri.map((l) => [l.creatLa.slice(0, 10), l.nume, l.organizatie, l.email, l.telefon, ETICHETE_STARE[l.stare], l.campanie, l.provenienta ?? null, l.cale, l.nrTrimiteri, l.notita].map(celulaCsv).join(";"));
  // BOM la început, ca Excel să citească diacriticele.
  return `﻿${[antet.map(celulaCsv).join(";"), ...randuri].join("\r\n")}\r\n`;
}
