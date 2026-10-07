// Culoarea textului (alb sau aproape negru) cu cel mai bun contrast pe o culoare de fundal aleasă de organizație.
// Culoarea de brand poate fi oricât de deschisă: text alb pe #5fb6ab are doar ~2,4:1 (WCAG cere 4,5:1).
function luminanta(hex: string): number | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  const canal = (v: number) => {
    const x = v / 255;
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * canal((n >> 16) & 255) + 0.7152 * canal((n >> 8) & 255) + 0.0722 * canal(n & 255);
}

const INCHIS = "#0f172a";
const LUMINANTA_INCHIS = luminanta(INCHIS)!;

export function culoareTextPeFundal(hex: string | null | undefined): "#ffffff" | typeof INCHIS {
  const l = hex ? luminanta(hex) : null;
  if (l == null) return "#ffffff";
  const contrastAlb = 1.05 / (l + 0.05);
  const contrastInchis = (l + 0.05) / (LUMINANTA_INCHIS + 0.05);
  return contrastInchis > contrastAlb ? INCHIS : "#ffffff";
}
