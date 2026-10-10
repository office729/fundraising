// Motivul grafic al documentelor (rapoarte, scrisori, certificate): inima cu linia de puls e identitatea unei organizații de sănătate, dar
// instrumentul e pentru orice ONG. Fiecare document alege: inimă cu puls, monogramă (prima literă a numelui) sau fără motiv.
// Funcțiile de randare sunt sincrone și pure în raport cu datele: motivul se fixează la începutul randării (seteazaMotiv) și îl citesc ajutoarele grafice.

export const MOTIVE = [
  { id: "inima", eticheta: "Inimă cu linie de puls" },
  { id: "monograma", eticheta: "Monogramă (prima literă a numelui)" },
  { id: "niciunul", eticheta: "Fără motiv grafic" },
] as const;
export type Motiv = (typeof MOTIVE)[number]["id"];

export const curataMotiv = (v: unknown, implicit: Motiv = "inima"): Motiv => (MOTIVE.some((m) => m.id === v) ? (v as Motiv) : implicit);
// Organizațiile cu „inimă” în nume păstrează inima; celelalte pornesc cu monograma.
export const motivImplicit = (numeOrg: string): Motiv => (/inim/i.test(numeOrg) ? "inima" : "monograma");

let motivActiv: Motiv = "inima";
let literaActiva = "A";

export function seteazaMotiv(m: Motiv, numeOrg: string): void {
  motivActiv = m;
  literaActiva = (numeOrg.trim().match(/\p{L}/u)?.[0] ?? "A").toUpperCase();
}
export const motivCurent = (): Motiv => motivActiv;
export const literaCurenta = (): string => literaActiva;

const SERIF_SVG = "Georgia,'Iowan Old Style','Times New Roman',serif";
const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Monograma: cerc în culorile organizației, cu litera în alb. Același cadru ca inima (120×112), ca să intre în aceleași locuri.
export function monograma(marime: number | string, id: string): string {
  const w = typeof marime === "number" ? `width="${marime}" height="${Math.round((marime * 112) / 120)}"` : `style="display:block;width:${marime};height:auto"`;
  return `<svg viewBox="0 0 120 112" ${w} role="img" aria-label="Monogramă"><defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--a)"/><stop offset="1" stop-color="var(--b)"/></linearGradient></defs><circle cx="60" cy="56" r="52" fill="url(#${id})"/><text x="60" y="76" text-anchor="middle" font-size="58" font-weight="700" fill="#fff" font-family="${SERIF_SVG}">${esc(literaActiva)}</text></svg>`;
}
