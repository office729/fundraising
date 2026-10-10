// Încărcarea logoului în browser: fișierul se citește local (nu pleacă nicăieri), se micșorează și se păstrează ca imagine PNG încorporată,
// iar culorile mărcii se extrag din pixelii lui. Doar pentru browser (folosește canvas).
import { culoriDinPixeli, type PaletaLogo } from "@/lib/raport-impact-culori";

const TIPURI = ["image/png", "image/jpeg", "image/webp", "image/svg+xml", "image/gif"];
const MAXIM_FISIER = 6 * 1024 * 1024;
const MAXIM_CARACTERE = 280_000; // mai puțin decât limita acceptată la salvare (300 000)

function incarcaImagine(src: string): Promise<HTMLImageElement> {
  return new Promise((rezolva, respinge) => {
    const img = new Image();
    img.onload = () => rezolva(img);
    img.onerror = () => respinge(new Error("Imaginea nu a putut fi citită. Încearcă un PNG, JPG sau SVG."));
    img.src = src;
  });
}

function deseneaza(img: HTMLImageElement, latura: number): HTMLCanvasElement {
  const w = img.naturalWidth || 300;
  const h = img.naturalHeight || 300;
  const scara = Math.min(1, latura / Math.max(w, h));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(w * scara));
  canvas.height = Math.max(1, Math.round(h * scara));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Browserul nu poate prelucra imaginea.");
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function paletaDinImagine(img: HTMLImageElement): PaletaLogo | null {
  const canvas = deseneaza(img, 96);
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  return culoriDinPixeli(ctx.getImageData(0, 0, canvas.width, canvas.height).data);
}

export async function paletaDinLogo(src: string): Promise<PaletaLogo | null> {
  return paletaDinImagine(await incarcaImagine(src));
}

// Fișierul devine un PNG de cel mult ~360 px, încorporat în raport (fără adrese externe care pot dispărea). SVG-ul se transformă în imagine, deci nu se păstrează cod.
export async function incarcaLogo(fisier: File): Promise<{ dataUrl: string; paleta: PaletaLogo | null }> {
  if (!TIPURI.includes(fisier.type)) throw new Error("Alege un fișier PNG, JPG, WebP, GIF sau SVG.");
  if (fisier.size > MAXIM_FISIER) throw new Error("Fișierul e prea mare (maximum 6 MB).");
  const sursa = URL.createObjectURL(fisier);
  try {
    const img = await incarcaImagine(sursa);
    let dataUrl = "";
    for (const latura of [360, 280, 220, 160, 120]) {
      dataUrl = deseneaza(img, latura).toDataURL("image/png");
      if (dataUrl.length <= MAXIM_CARACTERE) break;
    }
    if (dataUrl.length > MAXIM_CARACTERE) throw new Error("Logoul e prea complex. Încearcă o variantă mai simplă sau mai mică.");
    return { dataUrl, paleta: paletaDinImagine(img) };
  } finally {
    URL.revokeObjectURL(sursa);
  }
}
