"use client";

import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb } from "pdf-lib";

// Completează PDF-ul REAL al Formularului 230 (ANAF, anexa 2) — un singur
// șablon în public/formular-230-template.pdf, comun tuturor organizațiilor și
// conturilor. Secțiunea I (contribuabilul) are câmpuri completabile reale în
// PDF (FIELD_MAP, mai jos). Secțiunea II (denumire/CIF/IBAN ale beneficiarului)
// NU are câmpuri completabile — e text static, flatten-uit în șablonul sursă —
// deci pentru fiecare cont/beneficiar diferit, acoperim cu alb valorile vechi
// și desenăm peste ele pe cele reale ale contului respectiv (SECTIUNE_II_BOXES,
// coordonate măsurate direct pe șablonul curent — vezi „cum s-au aflat" mai jos).

export type DateFormular230Pdf = {
  nume: string;
  prenume: string;
  initialaTatalui: string;
  cnp: string;
  email: string;
  telefon: string;
  strada: string;
  numar: string;
  judet: string;
  localitate: string;
  codPostal: string;
  bloc: string;
  scara: string;
  etaj: string;
  apartament: string;
  semnatura: string; // data URI PNG (canvas.toDataURL)
  an: number; // anul fiscal al depunerii — fixat la trimitere, nu la descărcare
};

export type DateBeneficiarPdf = {
  nume: string;
  cif: string;
  iban: string;
};

const FIELD_MAP: Record<string, Exclude<keyof DateFormular230Pdf, "semnatura" | "an">> = {
  nume: "nume",
  prenume: "prenume",
  initiala: "initialaTatalui",
  cnp: "cnp",
  email: "email",
  telefon: "telefon",
  strada: "strada",
  numar: "numar",
  judet: "judet",
  localitate: "localitate",
  codpostal: "codPostal",
  bloc: "bloc",
  scara: "scara",
  etaj: "etaj",
  apartament: "apartament",
};

// Poziția casetei „Semnătură contribuabil" pe pagina PDF (612×792pt, Letter),
// măsurată pixel cu pixel pe șablonul curent din public/ (randare la 200dpi
// cu pdftoppm, citind exact unde încep/se termină chenarul casetei și unde
// începe eticheta „Semnătură împuternicit" alăturată). Caseta e strânsă între
// eticheta proprie (stânga), textul „Sub sancțiunile...” (sus), eticheta
// „Semnătură împuternicit” (dreapta) și nota de subsol 1) (jos) — încape doar
// ~2-6pt de marjă pe fiecare parte, de-aia SEMNATURA_COVER de mai jos are
// marje explicite, asimetrice, nu un padding uniform. Dacă înlocuiești
// șablonul cu un PDF care are alt aranjament, recalibrează (generează un PDF
// de test, randează-l cu pdftoppm și măsoară din nou chenarul).
const SEMNATURA_BOX = { x: 156, y: 132, width: 126, height: 13 };
const SEMNATURA_COVER = { x: 154, y: 129, width: 132, height: 19 };

// Coordonatele textului static din Secțiunea II — aflate extrăgând poziția
// exactă a fiecărei valori din șablon (pdfjs-dist getTextContent(), pe fiecare
// item cu transform-ul lui). Originea e jos-stânga (convenția PDF/pdf-lib).
// Fiecare casetă e puțin mai largă/înaltă decât textul original, ca padding.
const SECTIUNE_II = {
  denumire: { x: 190, y: 360, width: 375, height: 16, fontSize: 10, valoareX: 196, valoareY: 363.4 },
  cif: { x: 270, y: 381, width: 130, height: 14, fontSize: 10, valoareX: 285, valoareY: 384.1 },
  iban: { x: 176, y: 339, width: 156, height: 14, fontSize: 10, valoareX: 178, valoareY: 341.6 },
  an: { x: 308, y: 689, width: 66, height: 18, fontSize: 14, valoareX: 312, valoareY: 691.8 },
};

export async function completeazaFormular230Pdf(
  date: DateFormular230Pdf,
  beneficiar?: DateBeneficiarPdf,
): Promise<Uint8Array> {
  const templateBytes = await fetch("/formular-230-template.pdf").then((r) => r.arrayBuffer());
  const pdf = await PDFDocument.load(templateBytes);
  const form = pdf.getForm();

  // Fonturile Standard 14 (Helvetica etc.) folosesc encodarea WinAnsi, care NU
  // are diacriticele românești cu virgulă (ș/ț) — orice nume/localitate reală
  // (ex. „Constanța") arunca eroare la desenare SAU la generarea aspectului
  // câmpurilor de formular (form.flatten() apelează implicit
  // updateFieldAppearances() cu fontul implicit Helvetica). Fontkit + un TTF
  // real (vezi public/fonts/inter-regular.ttf) rezolvă ambele cazuri — de-aia
  // fontul se încarcă mereu, nu doar când există un beneficiar de desenat.
  pdf.registerFontkit(fontkit);
  const fontBytes = await fetch("/fonts/inter-regular.ttf").then((r) => r.arrayBuffer());
  const font = await pdf.embedFont(fontBytes, { subset: true });

  for (const [fieldName, campKey] of Object.entries(FIELD_MAP)) {
    const value = date[campKey];
    if (!value) continue;
    try {
      form.getTextField(fieldName).setText(value);
    } catch {
      // câmpul nu (mai) există în șablonul curent — ignorăm, nu blocăm restul
    }
  }
  // Regenerează aspectul câmpurilor CU fontul nostru, înainte de flatten —
  // altfel flatten() își regenerează singur aspectul cu Helvetica implicit.
  form.updateFieldAppearances(font);

  const page = pdf.getPages()[0];

  if (beneficiar) {
    const acopera = (box: { x: number; y: number; width: number; height: number }) =>
      page.drawRectangle({ x: box.x, y: box.y, width: box.width, height: box.height, color: rgb(1, 1, 1) });
    const scrie = (text: string, box: (typeof SECTIUNE_II)["denumire"]) =>
      page.drawText(text, { x: box.valoareX, y: box.valoareY, size: box.fontSize, font, color: rgb(0, 0, 0) });

    acopera(SECTIUNE_II.denumire);
    scrie(beneficiar.nume, SECTIUNE_II.denumire);
    acopera(SECTIUNE_II.cif);
    scrie(beneficiar.cif, SECTIUNE_II.cif);
    acopera(SECTIUNE_II.iban);
    scrie(beneficiar.iban, SECTIUNE_II.iban);
    acopera(SECTIUNE_II.an);
    scrie(String(date.an), SECTIUNE_II.an);
  }

  if (date.semnatura) {
    // Șablonul original avea o semnătură-exemplu desenată deja în casetă (a
    // rămas din PDF-ul-sursă) — o acoperim cu alb ÎNAINTE să desenăm semnătura
    // reală, altfel ies suprapuse, ca și cum ar fi semnat de două ori.
    page.drawRectangle({
      x: SEMNATURA_COVER.x,
      y: SEMNATURA_COVER.y,
      width: SEMNATURA_COVER.width,
      height: SEMNATURA_COVER.height,
      color: rgb(1, 1, 1),
    });
    // Chenarul casetei dispare odată acoperit (era parte din desenul static al
    // paginii) — îl redesenăm, altfel caseta „Semnătură contribuabil" rămâne
    // vizibil neîncadrată față de „Semnătură împuternicit" de alături.
    page.drawRectangle({
      x: SEMNATURA_BOX.x,
      y: SEMNATURA_BOX.y,
      width: SEMNATURA_BOX.width,
      height: SEMNATURA_BOX.height,
      borderColor: rgb(0.14, 0.12, 0.13),
      borderWidth: 0.75,
    });

    try {
      // Semnătura vine dintr-un rând salvat de un vizitator neautentificat —
      // serverul verifică doar prefixul "data:image/", nu că e o imagine
      // validă. Dacă e coruptă, generarea PDF-ului nu trebuie să pice —
      // formularul rămâne descărcabil, doar fără semnătura desenată.
      const pngBytes = await fetch(date.semnatura).then((r) => r.arrayBuffer());
      const png = await pdf.embedPng(pngBytes);
      const scale = Math.min(SEMNATURA_BOX.width / png.width, SEMNATURA_BOX.height / png.height, 1);
      const w = png.width * scale;
      const h = png.height * scale;
      page.drawImage(png, {
        x: SEMNATURA_BOX.x + (SEMNATURA_BOX.width - w) / 2,
        y: SEMNATURA_BOX.y + (SEMNATURA_BOX.height - h) / 2,
        width: w,
        height: h,
      });
    } catch {
      // caseta rămâne albă, goală — mai bine decât un PDF care nu se generează deloc
    }
  }

  // updateFieldAppearances: false — deja regenerat mai sus, cu fontul nostru;
  // flatten() ar face-o din nou implicit, cu Helvetica, anulând fix-ul de mai sus.
  form.flatten({ updateFieldAppearances: false });
  return pdf.save();
}

export function downloadPdfBytes(bytes: Uint8Array, filename: string) {
  const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
