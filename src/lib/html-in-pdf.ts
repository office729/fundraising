// Salvează un document HTML (scrisoare, certificat, raport de impact) ca fișier PDF, direct din browser, fără fereastra de tipărire.
// Browserul desenează documentul exact cum îl vezi în previzualizare (SVG cu foreignObject → imagine → canvas), iar canvasul
// intră ca imagine pe paginile PDF. Rezultatul e o imagine de înaltă rezoluție: textul nu se mai poate selecta și linkurile nu mai
// sunt apăsabile. Pentru text selectabil rămâne varianta de tipărire.
//
// Două feluri de documente:
//  - o singură pagină (`.sw`, scrisori și certificate): pagina PDF are mărimea documentului;
//  - document lung (`.foaie`, rapoarte): se taie în pagini A4, între blocuri (un paragraf sau o fișă de proiect nu se rupe la mijloc),
//    iar la diapozitive fiecare diapozitiv e o pagină.

const SCARA = 3; // ≈ 290 dpi pentru o pagină A4
const LATURA_MAX = 16000; // limita de siguranță a canvasului, în pixeli
const PX_LA_PT = 0.75; // 96 dpi → 72 dpi
const A4_LAT_PT = 595.28;
const A4_INALT_PT = 841.89;

export class EroarePdf extends Error {}

const asteaptaIncarcarea = (el: HTMLIFrameElement | HTMLImageElement) =>
  new Promise<void>((ok, nu) => {
    el.addEventListener("load", () => ok(), { once: true });
    el.addEventListener("error", () => nu(new EroarePdf("Documentul nu a putut fi pregătit.")), { once: true });
  });

function dinBlob(b: Blob): Promise<string> {
  return new Promise((ok, nu) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result));
    r.onerror = () => nu(new EroarePdf("Un logo nu a putut fi citit."));
    r.readAsDataURL(b);
  });
}

// Imaginile de pe alte site-uri nu se desenează într-un SVG, așa că se transformă în date înglobate; dacă nu pot fi citite, se omit.
async function inglobeazaImagini(doc: Document): Promise<number> {
  let omise = 0;
  await Promise.all(
    [...doc.querySelectorAll("img")].map(async (img) => {
      const src = img.getAttribute("src") ?? "";
      if (!src || src.startsWith("data:")) return;
      try {
        const r = await fetch(src, { mode: "cors", credentials: "omit" });
        if (!r.ok) throw new Error("http");
        img.setAttribute("src", await dinBlob(await r.blob()));
      } catch {
        img.remove();
        omise++;
      }
    }),
  );
  return omise;
}

type Pagina = { sus: number; jos: number }; // în pixeli de document

// Pagini de înălțime „inalt”, tăiate acolo unde nu trece prin mijlocul unui bloc mic (rând, paragraf, fișă, titlu).
function taiePagini(radacina: HTMLElement, total: number, inalt: number): Pagina[] {
  const r0 = radacina.getBoundingClientRect();
  const blocuri: [number, number][] = [];
  for (const el of radacina.querySelectorAll("*")) {
    const r = el.getBoundingClientRect();
    if (r.height > 2 && r.height < inalt * 0.45) blocuri.push([r.top - r0.top, r.bottom - r0.top]);
  }
  const taieOk = (y: number) => !blocuri.some(([t, b]) => t < y - 0.5 && b > y + 0.5);
  const pagini: Pagina[] = [];
  let sus = 0;
  while (sus < total - 1) {
    let jos = Math.min(total, sus + inalt);
    if (jos < total) {
      let y = jos;
      while (y > sus + inalt * 0.55 && !taieOk(y)) y -= 2;
      if (y > sus + inalt * 0.55) jos = y;
    }
    pagini.push({ sus, jos });
    sus = jos;
  }
  return pagini.length ? pagini : [{ sus: 0, jos: total }];
}

export async function htmlInPdf(html: string): Promise<{ blob: Blob; imaginiOmise: number; pagini: number }> {
  const cadru = document.createElement("iframe");
  cadru.setAttribute("aria-hidden", "true");
  cadru.tabIndex = -1;
  // Fără scripturi: documentul e doar citit, dar are nevoie de aceeași origine ca să-l putem măsura.
  cadru.setAttribute("sandbox", "allow-same-origin");
  cadru.style.cssText = "position:fixed;left:-10000px;top:0;width:1200px;height:800px;border:0;visibility:hidden";
  cadru.srcdoc = html;
  const gata = asteaptaIncarcarea(cadru);
  document.body.appendChild(cadru);
  try {
    await gata;
    const doc = cadru.contentDocument;
    if (!doc) throw new EroarePdf("Documentul nu a putut fi citit.");
    const lung = doc.querySelector<HTMLElement>(".foaie");
    const radacina = lung ?? doc.querySelector<HTMLElement>(".sw");
    if (!radacina) throw new EroarePdf("Documentul nu are structura așteptată.");
    await doc.fonts?.ready;

    const latime = Math.round(parseFloat(getComputedStyle(radacina).maxWidth) || radacina.getBoundingClientRect().width);
    const stil = doc.createElement("style");
    stil.textContent = lung
      ? `html,body{background:#fff!important}.foaie{margin:0!important;max-width:none!important;width:${latime}px!important;box-shadow:none!important}`
      : `html{background:#fff!important}.sw{margin:0!important;max-width:none!important;width:${latime}px!important}.pag{box-shadow:none!important}`;
    doc.head.appendChild(stil);
    const imaginiOmise = await inglobeazaImagini(doc);
    const inaltime = Math.ceil(radacina.getBoundingClientRect().height);
    if (!latime || !inaltime) throw new EroarePdf("Documentul nu are dimensiuni.");

    // Paginile PDF: [zona din document, mărimea paginii în puncte]
    const peisaj = /@page\s*\{[^}]*size:\s*A4\s+landscape/i.test(html);
    const latPagPt = lung ? (peisaj ? A4_INALT_PT : A4_LAT_PT) : latime * PX_LA_PT;
    let zone: Pagina[];
    let inaltPagPt: number[];
    const diapozitive = lung ? [...lung.querySelectorAll<HTMLElement>(".sw")] : [];
    if (!lung) {
      zone = [{ sus: 0, jos: inaltime }];
      inaltPagPt = [inaltime * PX_LA_PT];
    } else if (diapozitive.length > 1) {
      const r0 = lung.getBoundingClientRect();
      zone = diapozitive.map((d) => {
        const r = d.getBoundingClientRect();
        return { sus: Math.round(r.top - r0.top), jos: Math.round(r.bottom - r0.top) };
      });
      inaltPagPt = zone.map((z) => ((z.jos - z.sus) * latPagPt) / latime);
    } else {
      const inaltPag = Math.round((latime * (peisaj ? A4_LAT_PT : A4_INALT_PT)) / (peisaj ? A4_INALT_PT : A4_LAT_PT));
      zone = taiePagini(lung, inaltime, inaltPag);
      inaltPagPt = zone.map(() => (peisaj ? A4_LAT_PT : A4_INALT_PT));
    }

    const xhtml = new XMLSerializer().serializeToString(doc.documentElement);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${latime}" height="${inaltime}"><foreignObject x="0" y="0" width="${latime}" height="${inaltime}">${xhtml}</foreignObject></svg>`;
    const img = new Image();
    const incarcat = asteaptaIncarcarea(img);
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    await incarcat;

    const scara = Math.min(SCARA, LATURA_MAX / inaltime, LATURA_MAX / latime);
    const mare = document.createElement("canvas");
    mare.width = Math.round(latime * scara);
    mare.height = Math.round(inaltime * scara);
    const ctx = mare.getContext("2d");
    if (!ctx) throw new EroarePdf("Browserul nu poate desena documentul.");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, mare.width, mare.height);
    ctx.drawImage(img, 0, 0, mare.width, mare.height);

    const { PDFDocument } = await import("pdf-lib");
    const pdf = await PDFDocument.create();
    for (let i = 0; i < zone.length; i++) {
      const z = zone[i];
      const h = Math.max(1, Math.round((z.jos - z.sus) * scara));
      const bucata = document.createElement("canvas");
      bucata.width = mare.width;
      bucata.height = h;
      const c2 = bucata.getContext("2d");
      if (!c2) throw new EroarePdf("Browserul nu poate desena documentul.");
      c2.fillStyle = "#fff";
      c2.fillRect(0, 0, bucata.width, bucata.height);
      c2.drawImage(mare, 0, Math.round(z.sus * scara), mare.width, h, 0, 0, mare.width, h);
      const jpg = await new Promise<Blob | null>((ok) => {
        try {
          bucata.toBlob(ok, "image/jpeg", 0.92);
        } catch {
          ok(null); // canvas „contaminat” (unele browsere nu permit citirea desenului din SVG)
        }
      });
      if (!jpg) throw new EroarePdf("Browserul nu permite salvarea directă ca PDF.");
      const pagina = pdf.addPage([latPagPt, inaltPagPt[i]]);
      const poza = await pdf.embedJpg(new Uint8Array(await jpg.arrayBuffer()));
      const inaltPozaPt = ((z.jos - z.sus) * latPagPt) / latime;
      pagina.drawImage(poza, { x: 0, y: pagina.getHeight() - inaltPozaPt, width: latPagPt, height: inaltPozaPt });
    }
    pdf.setCreator("Alexandrit");
    const bytes = await pdf.save();
    return { blob: new Blob([bytes as BlobPart], { type: "application/pdf" }), imaginiOmise, pagini: zone.length };
  } finally {
    cadru.remove();
  }
}

export function descarcaBlob(blob: Blob, numeFisier: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = numeFisier;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
