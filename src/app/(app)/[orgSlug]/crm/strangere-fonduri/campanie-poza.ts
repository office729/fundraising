// Poza principală a campaniei: validare, citire și decupare 16:9 în browser, ca pagina publică să arate la fel indiferent de fotografie.

export const TIPURI_ACCEPTATE = ["image/jpeg", "image/png", "image/webp"];
export const MAX_INTRARE_MB = 25;
const LATIME_MAX = 1600;
export const RAPORT = 16 / 9;

export function valideazaFisier(f: { type: string; size: number }): string | null {
  if (!TIPURI_ACCEPTATE.includes(f.type)) return "Folosește o poză JPG, PNG sau WebP.";
  if (f.size > MAX_INTRARE_MB * 1024 * 1024) return `Poza are peste ${MAX_INTRARE_MB} MB. Alege una mai mică.`;
  return null;
}

export type PozaCitita = { url: string; latime: number; inaltime: number };

export function citestePoza(fisier: File): Promise<PozaCitita> {
  return new Promise((rezolva, respinge) => {
    const url = URL.createObjectURL(fisier);
    const img = new Image();
    img.onload = () => rezolva({ url, latime: img.naturalWidth, inaltime: img.naturalHeight });
    img.onerror = () => {
      URL.revokeObjectURL(url);
      respinge(new Error("Nu am putut citi poza. Încearcă alt fișier."));
    };
    img.src = url;
  });
}

// Axa pe care poza depășește cadrul 16:9 (acolo are sens poziția) și poziția CSS pentru object-position.
export function axaDeDecupare(latime: number, inaltime: number): "x" | "y" | null {
  const r = latime / inaltime;
  if (Math.abs(r - RAPORT) < 0.01) return null;
  return r > RAPORT ? "x" : "y";
}
export function pozitieCss(latime: number, inaltime: number, poz: number): string {
  const axa = axaDeDecupare(latime, inaltime);
  return axa === "x" ? `${poz}% 50%` : axa === "y" ? `50% ${poz}%` : "50% 50%";
}

// Decupează poza la 16:9 (în jurul poziției alese, 0–100) și o micșorează la maximum 1600 px lățime. Rezultatul e JPEG.
export async function decupeaza(fisier: File, poza: PozaCitita, poz: number): Promise<File> {
  const img = new Image();
  img.src = poza.url;
  await img.decode();
  const { latime, inaltime } = poza;
  const axa = axaDeDecupare(latime, inaltime);
  let sw = latime;
  let sh = inaltime;
  if (axa === "x") sw = Math.round(inaltime * RAPORT);
  else if (axa === "y") sh = Math.round(latime / RAPORT);
  const sx = axa === "x" ? Math.round((latime - sw) * (poz / 100)) : 0;
  const sy = axa === "y" ? Math.round((inaltime - sh) * (poz / 100)) : 0;
  const scara = Math.min(1, LATIME_MAX / sw);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(sw * scara);
  canvas.height = Math.round(sh * scara);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Browserul nu poate pregăti poza.");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", 0.88));
  if (!blob) throw new Error("Nu am putut pregăti poza pentru încărcare.");
  const nume = fisier.name.replace(/\.[^.]+$/, "") || "campanie";
  return new File([blob], `${nume}.jpg`, { type: "image/jpeg" });
}
