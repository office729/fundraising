// Piese comune pentru scrisori și certificate: curățarea câmpurilor, culorile, logo-urile și scheletul documentului HTML.
// Documentele rezultate sunt HTML autonom (CSS inline, fără scripturi sau fonturi externe), la fel ca rapoartele de impact.
import { esc, HEX, urlLogo } from "./raport-impact";

export { esc, urlLogo };

export const SANS = `"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif`;
export const SERIF = `Georgia,"Iowan Old Style","Times New Roman",serif`;

export type Accente = { accent: string; accent2: string; accent3: string };
export const ACCENTE_IMPLICITE: Accente = { accent: "#b3261e", accent2: "#7f1d1d", accent3: "#fdf1ef" };

export const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
export const textLung = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");
export const iso = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : "");

export function curataAccente(b: Record<string, unknown>, implicit: Accente = ACCENTE_IMPLICITE): Accente {
  return {
    accent: HEX.test(String(b.accent)) ? String(b.accent) : implicit.accent,
    accent2: HEX.test(String(b.accent2)) ? String(b.accent2) : implicit.accent2,
    accent3: HEX.test(String(b.accent3)) ? String(b.accent3) : implicit.accent3,
  };
}

// Paragrafe din text: rândurile libere despart paragrafele; tot ce intră e escapat.
export function paragrafeDinText(brut: string, valori: Record<string, string> = {}): string[] {
  return esc(brut)
    .replace(/\{([A-Z_]+)\}/g, (m, k: string) => (k in valori ? esc(valori[k]) : m))
    .split(/\n\s*\n/)
    .map((p) => p.trim().replace(/\n/g, "<br>"))
    .filter(Boolean);
}
export const linieDinText = (brut: string, valori: Record<string, string> = {}) =>
  esc(brut).replace(/\{([A-Z_]+)\}/g, (m, k: string) => (k in valori ? esc(valori[k]) : m));

// Imagine de logo, cu înălțime fixă (ca să nu depindă de dimensiunile intrinseci).
export const logoImg = (src: string, alt: string, inaltime = "1em") => (src ? `<img src="${esc(src)}" alt="${esc(alt)}" style="display:block;height:${inaltime};width:auto;max-width:100%;object-fit:contain">` : "");

// Scheletul comun: foaie pe fundal neutru pe ecran, curată la tipărire. `lat` = lățimea maximă a foii în px; dimensiunile din interior sunt în cqw,
// deci documentul se micșorează fără deformare pe orice ecran și la tipărire.
export function docShell(titlu: string, a: Accente, css: string, corp: string, opt: { pagina: "A4" | "A4 landscape"; lat: number; lungimeMm: number; latimeMm: number }): string {
  return `<!doctype html><html lang="ro"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(titlu)}</title><style>
:root{--a:${a.accent};--b:${a.accent2};--c:${a.accent3};--t:#231f20;--m:#6a6466;--l:#e7e2e2;--ab:color-mix(in srgb,var(--a) 9%,#fff)}
*{box-sizing:border-box}html{background:#ebe8e8;-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{margin:0;color:var(--t);font-family:${SANS};-webkit-font-smoothing:antialiased}
h1,h2,h3,p{margin:0}a{color:var(--a)}
.sw{container-type:inline-size;max-width:${opt.lat}px;margin:24px auto}
.pag{position:relative;background:#fff;overflow:hidden;box-shadow:0 1px 2px rgba(35,31,32,.08),0 22px 60px rgba(35,31,32,.14);font-size:1.7cqw;line-height:1.55}
.nr{font-variant-numeric:tabular-nums}
@media(max-width:700px){.sw{margin:0}}
@page{size:${opt.pagina};margin:0}
@media print{html{background:#fff}.sw{margin:0;max-width:none;width:${opt.latimeMm}mm}.pag{box-shadow:none}}
${css}</style></head><body><div class="sw">${corp}</div></body></html>`;
}

export const A4_PORTRET = { pagina: "A4" as const, lat: 794, latimeMm: 210, lungimeMm: 297 };
export const A4_PEISAJ = { pagina: "A4 landscape" as const, lat: 1123, latimeMm: 297, lungimeMm: 210 };

// Inimă cu puls, desenată (aceeași ca în rapoarte), pentru modelele cu identitatea organizației.
export function inimaPuls(id = "hp"): string {
  return `<svg viewBox="0 0 120 112" role="img" aria-label="Inimă străbătută de o linie de puls" style="display:block;width:100%;height:auto"><defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--a)"/><stop offset="1" stop-color="var(--b)"/></linearGradient><radialGradient id="${id}s" cx=".3" cy=".25" r=".6"><stop offset="0" stop-color="#fff" stop-opacity=".38"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs><path d="M60 104 14 58C-2 42 2 16 24 8c14-5 29 1 36 14 7-13 22-19 36-14 22 8 26 34 10 50z" fill="url(#${id})"/><path d="M60 104 14 58C-2 42 2 16 24 8c14-5 29 1 36 14 7-13 22-19 36-14 22 8 26 34 10 50z" fill="url(#${id}s)"/><path d="M6 54h30l8-16 12 36 10-28 7 8h41" fill="none" stroke="#fff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

// Linie de puls pe toată lățimea.
export function linieEcg(culoare = "currentColor", opacitate = 0.25): string {
  let cale = "M0 40";
  for (let x = 40; x < 1200; x += 190) cale += ` L${x} 40 L${x + 20} 40 L${x + 30} 14 L${x + 44} 66 L${x + 56} 28 L${x + 66} 40`;
  cale += " L1200 40";
  return `<svg viewBox="0 0 1200 80" preserveAspectRatio="none" width="100%" height="100%" aria-hidden="true"><path d="${cale}" fill="none" stroke="${culoare}" stroke-opacity="${opacitate}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg>`;
}
