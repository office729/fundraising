// Culorile raportului pornind de la logoul firmei. Funcții pure, pe pixeli (RGBA), ca să poată fi testate fără browser;
// decupajul și citirea pixelilor din imagine se fac în pagină (impact/logo-util.ts).

export type PaletaLogo = { accent: string; accent2: string; accent3: string; sursa: "logo" | "neutru" };

type Hsl = { h: number; s: number; l: number };

export function rgbLaHsl(r: number, g: number, b: number): Hsl {
  const R = r / 255, G = g / 255, B = b / 255;
  const max = Math.max(R, G, B), min = Math.min(R, G, B), d = max - min;
  const l = (max + min) / 2;
  if (d === 0) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = max === R ? ((G - B) / d) % 6 : max === G ? (B - R) / d + 2 : (R - G) / d + 4;
  return { h: (h * 60 + 360) % 360, s, l };
}

export function hslLaHex({ h, s, l }: Hsl): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  const hex = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, "0");
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

const limiteaza = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

// Culoarea principală apare pe alb (cifre, titluri) și sub text alb (gradiente): rămâne în intervalul în care ambele se citesc.
// Luminanța relativă (WCAG) a unei culori hex: cu ea se măsoară contrastul față de alb.
function luminanta(hex: string): number {
  const canal = (i: number) => {
    const v = parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * canal(0) + 0.7152 * canal(1) + 0.0722 * canal(2);
}
// Contrastul cu albul trebuie să fie cel puțin 4,5:1 (text alb pe culoare și culoare pe alb). Nuanțele deschise (galben, verde, turcoaz)
// au nevoie de o luminozitate mult mai mică decât limita fixă: se închid treptat până se citesc.
const CONTRAST_ALB = 4.5;
const principala = (c: Hsl): Hsl => {
  const p: Hsl = { h: c.h, s: limiteaza(c.s, 0.35, 0.9), l: limiteaza(c.l, 0.28, 0.44) };
  while (p.l > 0.08 && 1.05 / (luminanta(hslLaHex(p)) + 0.05) < CONTRAST_ALB) p.l -= 0.01;
  return p;
};
const inchisa = (c: Hsl): Hsl => ({ h: c.h, s: limiteaza(c.s * 0.95, 0.3, 0.85), l: limiteaza(c.l * 0.58, 0.12, 0.24) });
const deschisa = (c: Hsl): Hsl => ({ h: c.h, s: limiteaza(c.s * 0.65, 0.2, 0.7), l: 0.955 });

type Galeata = { greutate: number; r: number; g: number; b: number; n: number };

// Culorile dominante: pixelii aproape transparenți, albi sau foarte deschiși se ignoră; cei saturați cântăresc mai mult.
// Dacă logoul e doar alb-negru-gri, paleta pleacă de la cea mai frecventă nuanță neutră (în loc să inventeze o culoare).
export function culoriDinPixeli(data: ArrayLike<number>): PaletaLogo | null {
  const galeti = new Map<number, Galeata>();
  const neutre = new Map<number, Galeata>();
  for (let i = 0; i + 3 < data.length; i += 4) {
    if (data[i + 3] < 140) continue;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const hsl = rgbLaHsl(r, g, b);
    if (hsl.l > 0.94) continue;
    const saturat = hsl.s >= 0.28 && hsl.l > 0.12 && hsl.l < 0.9;
    const cheie = saturat ? Math.floor(hsl.h / 20) * 10 + Math.min(2, Math.floor(hsl.l * 3)) : Math.floor(hsl.l * 8);
    const tinta = saturat ? galeti : neutre;
    const gl = tinta.get(cheie) ?? { greutate: 0, r: 0, g: 0, b: 0, n: 0 };
    gl.greutate += 0.5 + hsl.s;
    gl.r += r; gl.g += g; gl.b += b; gl.n += 1;
    tinta.set(cheie, gl);
  }
  const medie = (gl: Galeata): Hsl => rgbLaHsl(gl.r / gl.n, gl.g / gl.n, gl.b / gl.n);
  const clasate = [...galeti.values()].sort((a, b) => b.greutate - a.greutate);
  if (clasate.length > 0) {
    const prima = medie(clasate[0]);
    // A doua culoare a mărcii, dacă există una clar diferită și destul de prezentă; altfel, o nuanță mai închisă a celei dintâi.
    const diferita = clasate.slice(1).find((g) => {
      const m = medie(g);
      const dh = Math.min(Math.abs(m.h - prima.h), 360 - Math.abs(m.h - prima.h));
      return dh >= 35 && g.greutate >= clasate[0].greutate * 0.35;
    });
    const a = principala(prima);
    return { accent: hslLaHex(a), accent2: hslLaHex(inchisa(diferita ? medie(diferita) : prima)), accent3: hslLaHex(deschisa(prima)), sursa: "logo" };
  }
  const gri = [...neutre.values()].sort((a, b) => b.n - a.n)[0];
  if (!gri) return null;
  const m = medie(gri);
  const baza: Hsl = { h: m.h, s: Math.min(m.s, 0.12), l: limiteaza(m.l, 0.16, 0.36) };
  return { accent: hslLaHex(baza), accent2: hslLaHex({ ...baza, l: Math.max(0.1, baza.l * 0.6) }), accent3: hslLaHex({ ...baza, l: 0.955 }), sursa: "neutru" };
}

// Paleta unui raport pornind de la o singură culoare (ex. culoarea organizației), cu aceleași limite de lizibilitate.
export function paletaDinHex(hex: string): PaletaLogo | null {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!m) return null;
  const c = rgbLaHsl(parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16));
  return { accent: hslLaHex(principala(c)), accent2: hslLaHex(inchisa(c)), accent3: hslLaHex(deschisa(c)), sursa: "logo" };
}

// Contrastul unei culori cu albul (1–21): sub 4,5 textul alb pe ea sau ea ca text pe alb se citește greu.
export const contrastCuAlb = (hex: string): number => (/^#[0-9a-f]{6}$/i.test(hex) ? 1.05 / (luminanta(hex) + 0.05) : 21);
