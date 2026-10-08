import { PROCENT_IMPLICIT, xmlBorderou, type DateBorderou } from "@/lib/borderou230";

// Generarea fișierelor borderoului în browser (datele vin de la server, doar pentru owner/admin).

function descarca(blob: Blob, nume: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nume;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export const numeFisier = (d: DateBorderou, ext: string) => `borderou-230-${d.an}-nr-${d.nr}.${ext}`;

export async function descarcaExcelBorderou(d: DateBorderou) {
  const XLSX = await import("xlsx");
  const antet: (string | number)[][] = [
    ["Borderou Formular 230"],
    ["Nr. borderou", d.nr, "", "Data", d.dataBorderou],
    ["Anul", d.an, "", "Luna", d.luna],
    ["Entitate beneficiară", d.entitate.den],
    ["CUI / CIF", d.entitate.cui, "", "IBAN", d.entitate.iban],
    ["Procent din impozit", `${PROCENT_IMPLICIT}%`, "", "Număr declarații", d.declaratii.length],
    [],
    ["Nr. crt.", "Nume", "Inițiala tatălui", "Prenume", "CNP", "Adresă", "Telefon", "Email", "Distribuire 2 ani", "Acord comunicare date", "Data completării"],
    ...d.declaratii.map((x) => [x.nrPoz, x.nume, x.initiala, x.prenume, x.cnp, x.adresa, x.telefon, x.email, x.doiAni ? "Da" : "Nu", x.acord ? "Da" : "Nu", x.dataCompletarii]),
  ];
  const ws = XLSX.utils.aoa_to_sheet(antet);
  ws["!cols"] = [{ wch: 9 }, { wch: 18 }, { wch: 10 }, { wch: 18 }, { wch: 16 }, { wch: 46 }, { wch: 14 }, { wch: 28 }, { wch: 12 }, { wch: 14 }, { wch: 14 }];
  // CNP ca text (nu număr) — altfel Excel îl rotunjește / taie zerourile.
  const primulRand = 8;
  d.declaratii.forEach((x, i) => {
    const celula = ws[XLSX.utils.encode_cell({ r: primulRand + i, c: 4 })];
    if (celula) {
      celula.t = "s";
      celula.v = x.cnp;
    }
  });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `Borderou ${d.nr}`);
  XLSX.writeFile(wb, numeFisier(d, "xlsx"));
}

export function descarcaXmlBorderou(d: DateBorderou) {
  descarca(new Blob([xmlBorderou(d)], { type: "application/xml;charset=utf-8" }), numeFisier(d, "xml"));
}

export async function descarcaPdfBorderou(d: DateBorderou) {
  const { PDFDocument, rgb } = await import("pdf-lib");
  const fontkit = (await import("@pdf-lib/fontkit")).default;
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  // Font cu diacritice (ă î ș ț) — fontul standard PDF nu le are.
  const fontBytes = await fetch("/fonts/inter-regular.ttf").then((r) => r.arrayBuffer());
  const font = await pdf.embedFont(fontBytes, { subset: true });

  const W = 842;
  const H = 595;
  const M = 30;
  const coloane: { t: string; w: number; v: (x: DateBorderou["declaratii"][number]) => string }[] = [
    { t: "Nr.", w: 22, v: (x) => String(x.nrPoz) },
    { t: "Nume", w: 72, v: (x) => x.nume },
    { t: "Ini.", w: 24, v: (x) => x.initiala },
    { t: "Prenume", w: 72, v: (x) => x.prenume },
    { t: "CNP", w: 80, v: (x) => x.cnp },
    { t: "Adresă", w: 190, v: (x) => x.adresa },
    { t: "Telefon", w: 62, v: (x) => x.telefon },
    { t: "Email", w: 118, v: (x) => x.email },
    { t: "2 ani", w: 28, v: (x) => (x.doiAni ? "Da" : "Nu") },
    { t: "Acord", w: 32, v: (x) => (x.acord ? "Da" : "Nu") },
    { t: "Data", w: 52, v: (x) => x.dataCompletarii },
  ];
  const inalt = 14;
  const taie = (text: string, w: number, size: number) => {
    if (font.widthOfTextAtSize(text, size) <= w - 4) return text;
    let t = text;
    while (t.length > 1 && font.widthOfTextAtSize(t + "…", size) > w - 4) t = t.slice(0, -1);
    return t + "…";
  };

  let page = pdf.addPage([W, H]);
  let y = H - M;
  const text = (s: string, x: number, yy: number, size = 8, culoare = rgb(0.06, 0.09, 0.16)) => page.drawText(s, { x, y: yy, size, font, color: culoare });

  text(`Borderou Formular 230 — nr. ${d.nr} / ${d.an}`, M, y, 15);
  y -= 18;
  text(`${d.entitate.den}  ·  CUI ${d.entitate.cui || "—"}  ·  IBAN ${d.entitate.iban || "—"}`, M, y, 9);
  y -= 13;
  text(`Data: ${d.dataBorderou}  ·  Procent din impozit: ${PROCENT_IMPLICIT}%  ·  ${d.declaratii.length} declarații (maximum 50 pe borderou)`, M, y, 9, rgb(0.35, 0.4, 0.5));
  y -= 22;

  const antetTabel = () => {
    let x = M;
    page.drawRectangle({ x: M, y: y - 4, width: W - 2 * M, height: inalt, color: rgb(0.93, 0.95, 0.97) });
    for (const c of coloane) {
      text(c.t, x + 2, y, 7.5, rgb(0.28, 0.33, 0.41));
      x += c.w;
    }
    y -= inalt;
  };
  antetTabel();
  for (const [i, x] of d.declaratii.entries()) {
    if (y < M + 70) {
      page = pdf.addPage([W, H]);
      y = H - M;
      antetTabel();
    }
    if (i % 2 === 1) page.drawRectangle({ x: M, y: y - 4, width: W - 2 * M, height: inalt, color: rgb(0.98, 0.98, 0.99) });
    let cx = M;
    for (const c of coloane) {
      text(taie(c.v(x), c.w, 7), cx + 2, y, 7);
      cx += c.w;
    }
    y -= inalt;
  }

  y -= 24;
  text(`Total declarații în acest borderou: ${d.declaratii.length}`, M, y, 9);
  text("Reprezentant legal: ______________________      Semnătura și ștampila: ______________________", M + 260, y, 9);

  const bytes = await pdf.save();
  descarca(new Blob([bytes as BlobPart], { type: "application/pdf" }), numeFisier(d, "pdf"));
}
