// Salvează un document HTML (scrisoare, certificat, raport de impact) ca fișier PDF, direct din browser, fără fereastra de tipărire.
// Browserul desenează documentul exact cum îl vezi în previzualizare (SVG cu foreignObject → imagine), iar fiecare pagină A4 se desenează
// separat pe un canvas de mărime fixă și intră ca imagine în PDF (memorie constantă și calitate egală, oricât de lung e documentul).
// Rezultatul e o imagine de înaltă rezoluție: textul nu se mai poate selecta și linkurile nu mai sunt apăsabile. Pentru text selectabil
// rămâne varianta de tipărire.
//
// Documentul se așază pe pagini astfel:
//  - încape pe o pagină: o singură pagină A4;
//  - e mai lung (raport, scrisoare lungă): se taie în pagini A4 între blocuri (un paragraf sau o fișă de proiect nu se rupe la mijloc),
//    cu margine sus și jos pe paginile de continuare;
//  - diapozitive: fiecare diapozitiv e o pagină.

const SCARA = 3; // ≈ 290 dpi pentru o pagină A4
const A4_LAT_PT = 595.28;
const A4_INALT_PT = 841.89;
const MARGINE_MM = 14; // sus/jos pe paginile de continuare
const TIMEOUT_TOTAL_MS = 60_000;
const TIMEOUT_RESURSA_MS = 8_000;

export class EroarePdf extends Error {}

function cuTimeout<T>(p: Promise<T>, ms: number, mesaj: string): Promise<T> {
  let t: ReturnType<typeof setTimeout>;
  return Promise.race([p, new Promise<never>((_, nu) => (t = setTimeout(() => nu(new EroarePdf(mesaj)), ms)))]).finally(() => clearTimeout(t));
}

const asteaptaIncarcarea = (el: HTMLIFrameElement | HTMLImageElement) =>
  cuTimeout(
    new Promise<void>((ok, nu) => {
      el.addEventListener("load", () => ok(), { once: true });
      el.addEventListener("error", () => nu(new EroarePdf("Documentul nu a putut fi pregătit.")), { once: true });
    }),
    TIMEOUT_RESURSA_MS * 2,
    "Documentul s-a încărcat prea greu.",
  );

function dinBlob(b: Blob): Promise<string> {
  return new Promise((ok, nu) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result));
    r.onerror = () => nu(new EroarePdf("Un logo nu a putut fi citit."));
    r.readAsDataURL(b);
  });
}

// Imaginile de pe alte site-uri nu se desenează într-un SVG, așa că se transformă în date înglobate; dacă nu pot fi citite
// (adresa nu e permisă de aplicație, nu răspunde la timp sau nu permite folosirea), se omit și se numără.
async function inglobeazaImagini(doc: Document): Promise<number> {
  let omise = 0;
  await Promise.all(
    [...doc.querySelectorAll("img")].map(async (img) => {
      const src = img.getAttribute("src") ?? "";
      if (!src || src.startsWith("data:")) return;
      try {
        const r = await fetch(src, { mode: "cors", credentials: "omit", signal: AbortSignal.timeout(TIMEOUT_RESURSA_MS) });
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

type Zona = { sus: number; jos: number; decalaj: number }; // în pixeli de document; decalaj = loc alb deasupra, în pagină

// Pagini tăiate acolo unde nu trece prin mijlocul unui bloc mic (rând, paragraf, fișă, titlu). Prima pagină nu are margine sus.
function taiePagini(radacina: HTMLElement, total: number, inaltPag: number, margine: number): Zona[] {
  const r0 = radacina.getBoundingClientRect();
  const blocuri: [number, number][] = [];
  for (const el of radacina.querySelectorAll("*")) {
    const r = el.getBoundingClientRect();
    if (r.height > 2 && r.height < inaltPag * 0.45) blocuri.push([r.top - r0.top, r.bottom - r0.top]);
  }
  const taieOk = (y: number) => !blocuri.some(([t, b]) => t < y - 0.5 && b > y + 0.5);
  const zone: Zona[] = [];
  let sus = 0;
  while (sus < total - 1) {
    const decalaj = zone.length ? margine : 0;
    const util = inaltPag - decalaj - margine; // loc alb jos, pe toate paginile în afară de ultima
    let jos = Math.min(total, sus + util);
    if (total - sus <= inaltPag - decalaj) jos = total; // ultima pagină poate folosi tot spațiul
    else {
      let y = jos;
      while (y > sus + util * 0.55 && !taieOk(y)) y -= 2;
      if (y > sus + util * 0.55) jos = y;
    }
    zone.push({ sus, jos, decalaj });
    sus = jos;
  }
  return zone.length ? zone : [{ sus: 0, jos: total, decalaj: 0 }];
}

async function creeaza(html: string): Promise<{ blob: Blob; imaginiOmise: number; pagini: number }> {
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

    // Pagina PDF: A4 pe orientarea cerută de document; înălțimea paginii în pixeli de document, la lățimea documentului.
    const peisaj = /@page\s*\{[^}]*size:\s*A4\s+landscape/i.test(html);
    const latPagPt = peisaj ? A4_INALT_PT : A4_LAT_PT;
    const inaltPagPt = peisaj ? A4_LAT_PT : A4_INALT_PT;
    const inaltPag = Math.round((latime * inaltPagPt) / latPagPt);
    const margine = Math.round((latime * MARGINE_MM) / (peisaj ? 297 : 210));
    const diapozitive = lung ? [...lung.querySelectorAll<HTMLElement>(".sw")] : [];
    let zone: Zona[];
    let inaltPagini: number[]; // în puncte
    if (diapozitive.length > 1) {
      const r0 = lung!.getBoundingClientRect();
      zone = diapozitive.map((d) => {
        const r = d.getBoundingClientRect();
        return { sus: Math.round(r.top - r0.top), jos: Math.round(r.bottom - r0.top), decalaj: 0 };
      });
      inaltPagini = zone.map((z) => ((z.jos - z.sus) * latPagPt) / latime);
    } else if (inaltime <= inaltPag * 1.03) {
      zone = [{ sus: 0, jos: inaltime, decalaj: 0 }];
      inaltPagini = [inaltPagPt];
    } else {
      zone = taiePagini(radacina, inaltime, inaltPag, margine);
      inaltPagini = zone.map(() => inaltPagPt);
    }

    const xhtml = new XMLSerializer().serializeToString(doc.documentElement);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${latime}" height="${inaltime}"><foreignObject x="0" y="0" width="${latime}" height="${inaltime}">${xhtml}</foreignObject></svg>`;
    const img = new Image();
    const incarcat = asteaptaIncarcarea(img);
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    await incarcat;

    const { PDFDocument } = await import("pdf-lib");
    const pdf = await PDFDocument.create();
    const canvas = document.createElement("canvas"); // același canvas pentru toate paginile: memoria nu crește cu lungimea documentului
    try {
      for (let i = 0; i < zone.length; i++) {
        const z = zone[i];
        const hz = z.jos - z.sus;
        canvas.width = Math.round(latime * SCARA);
        canvas.height = Math.max(1, Math.round(hz * SCARA));
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new EroarePdf("Browserul nu poate desena documentul.");
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, z.sus, latime, hz, 0, 0, canvas.width, canvas.height);
        const jpg = await new Promise<Blob | null>((ok) => {
          try {
            canvas.toBlob(ok, "image/jpeg", 0.88);
          } catch {
            ok(null); // canvas „contaminat” (unele browsere nu permit citirea desenului din SVG)
          }
        });
        if (!jpg) throw new EroarePdf("Browserul nu permite salvarea directă ca PDF.");
        const pagina = pdf.addPage([latPagPt, inaltPagini[i]]);
        const poza = await pdf.embedJpg(new Uint8Array(await jpg.arrayBuffer()));
        const inaltPozaPt = (hz * latPagPt) / latime;
        const decalajPt = (z.decalaj * latPagPt) / latime;
        pagina.drawImage(poza, { x: 0, y: pagina.getHeight() - decalajPt - inaltPozaPt, width: latPagPt, height: inaltPozaPt });
      }
    } finally {
      canvas.width = 0; // eliberează memoria canvasului
      canvas.height = 0;
    }
    pdf.setCreator("Alexandrit");
    const bytes = await pdf.save();
    return { blob: new Blob([bytes as BlobPart], { type: "application/pdf" }), imaginiOmise, pagini: zone.length };
  } finally {
    cadru.remove();
  }
}

export function htmlInPdf(html: string): Promise<{ blob: Blob; imaginiOmise: number; pagini: number }> {
  return cuTimeout(creeaza(html), TIMEOUT_TOTAL_MS, "Crearea PDF-ului a durat prea mult.");
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
