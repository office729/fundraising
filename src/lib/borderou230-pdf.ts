// Borderou Formular 230 în PDF-ul inteligent ANAF (șablonul oficial D230, formular XFA dinamic cu drepturi Reader).
// Datele contribuabililor și ale entității se scriu în pachetul „datasets” al formularului, deci Adobe Reader le arată deja
// completate în câmpurile borderoului; organizației îi rămân doar validarea și semnarea.
//
// Fișierul șablon are „drepturi de utilizare” (Reader Extensions, UR3): semnătura lor acoperă octeții originali, de aceea NU
// rescriem documentul (pdf-lib ar elimina XFA și drepturile), ci adăugăm la sfârșit o actualizare incrementală — același
// mecanism prin care Reader însuși salvează un formular completat: obiectul „datasets” înlocuit + o secțiune xref nouă.

import { PDFArray, PDFDict, PDFDocument, PDFName, PDFRef } from "pdf-lib";

import { MAX_PE_BORDEROU, PROCENT_IMPLICIT, type DateBorderou } from "./borderou230";

const xmlEsc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Formularul oficial lucrează cu MAJUSCULE fără diacritice (scripturile lui le aplică la tastare/ieșire din câmp).
const fara = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const majuscule = (s: string) => fara(s).toUpperCase().replace(/\s+/g, " ").trim();
// Nume: câmpul acceptă doar litere și spațiu (liniuța e blocată la tastare), deci „POPA-IONESCU” devine „POPA IONESCU”.
const nume = (s: string) => majuscule(s).replace(/[^A-Z ]/g, " ").replace(/\s+/g, " ").trim();
// Prenume și inițială: litere, spațiu și liniuță.
const prenume = (s: string) => majuscule(s).replace(/[^A-Z -]/g, " ").replace(/\s+/g, " ").trim();
const cifre = (s: string) => s.replace(/\D/g, "");
const iban = (s: string) => fara(s).replace(/\s+/g, "").toUpperCase();
// CUI fără prefixul „RO” (câmpul acceptă doar cifre).
const cui = (s: string) => cifre(s.replace(/^\s*RO/i, ""));
// dd.mm.yyyy → yyyy-mm-dd (formatul canonic al câmpurilor de dată XFA).
const dataIso = (s: string) => {
  const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(s.trim());
  return m ? `${m[3]}-${m[2]}-${m[1]}` : "";
};

const el = (tag: string, v: string | number | null | undefined) => (v == null || v === "" ? "" : `<${tag}>${xmlEsc(String(v))}</${tag}>`);

// Conținutul pachetului XFA „datasets”: structura de date a formularului (rădăcina = subformularul „form1”), în modul
// „Entitate nonprofit / Unitate de cult” (z_tipPersoana = Rad2), cu entitatea, borderoul și până la 50 de contribuabili.
export function xmlDatasetsBorderou(d: DateBorderou): string {
  if (d.declaratii.length > MAX_PE_BORDEROU) throw new Error(`Un borderou poate avea cel mult ${MAX_PE_BORDEROU} de declarații.`);
  const den = majuscule(d.entitate.den);
  const cif = cui(d.entitate.cui);
  const cont = iban(d.entitate.iban);
  const persoane = d.declaratii
    .map((x, i) => {
      const adresa = majuscule(x.adresa);
      return (
        `<contrib>` +
        `<nrCrt>${el("nV", i + 1)}</nrCrt>` +
        `<idCnt>${el("nume", nume(x.nume))}${el("init", prenume(x.initiala))}${el("pren", prenume(x.prenume))}${el("cif_c", cifre(x.cnp))}${el("adresa", adresa)}${el("telefon", x.telefon.replace(/\s+/g, ""))}${el("email", x.email.trim())}</idCnt>` +
        `<s15><date>` +
        `<nrCrt>${el("nV", 1)}</nrCrt>` +
        `<optiuneSuma><slct><ent>1</ent><brs>0</brs></slct></optiuneSuma>` +
        `<ent><idEnt>${el("anDoi", x.doiAni ? 2 : 1)}${el("cifOJ", cif)}${el("denOJ", den)}${el("ibanNp", cont)}${el("prc", PROCENT_IMPLICIT)}${el("acord", x.acord ? 1 : 0)}</idEnt></ent>` +
        `</date></s15>` +
        `</contrib>`
      );
    })
    .join("");
  return (
    `<xfa:datasets xmlns:xfa="http://www.xfa.org/schema/xfa-data/1.0/"><xfa:data><form1>` +
    `<IdDoc>${el("an_r", d.an)}</IdDoc>` +
    `<nrDataB>${el("nrD", d.nr)}${el("dataD", dataIso(d.dataBorderou))}${el("adresaD", majuscule(d.entitate.adresa ?? ""))}</nrDataB>` +
    persoane +
    `${el("z_tipPersoana", "Rad2")}${el("z_denEntitate", den)}${el("z_cifEntitate", cif)}${el("z_ibanEntitate", cont)}` +
    `</form1></xfa:data></xfa:datasets>`
  );
}

const latin1 = (b: Uint8Array) => {
  let s = "";
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000));
  return s;
};
const ascii = (s: string) => Uint8Array.from(s, (c) => c.charCodeAt(0));
const concat = (parti: Uint8Array[]) => {
  const out = new Uint8Array(parti.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parti) {
    out.set(p, o);
    o += p.length;
  }
  return out;
};

// Numărul obiectului „datasets” din tabloul /XFA al formularului (perechi nume, referință).
async function refDatasets(sablon: Uint8Array): Promise<number> {
  const doc = await PDFDocument.load(sablon, { ignoreEncryption: true, updateMetadata: false });
  const acro = doc.catalog.lookup(PDFName.of("AcroForm"), PDFDict);
  const xfa = acro.lookup(PDFName.of("XFA"), PDFArray);
  for (let i = 0; i + 1 < xfa.size(); i += 2) {
    const nm = xfa.lookup(i);
    if (nm && "decodeText" in nm && (nm as { decodeText(): string }).decodeText() === "datasets") {
      const r = xfa.get(i + 1);
      if (r instanceof PDFRef) return r.objectNumber;
    }
  }
  throw new Error("Șablonul PDF nu conține pachetul XFA «datasets».");
}

// Adaugă la șablon o actualizare incrementală cu datele borderoului. Octeții originali rămân neatinși (drepturile Reader
// și structura XFA se păstrează); documentul rezultat se deschide în Adobe Reader/Acrobat cu formularul deja completat.
export async function completeazaBorderouPdf(sablon: Uint8Array, d: DateBorderou): Promise<Uint8Array> {
  const nrDatasets = await refDatasets(sablon);
  const text = latin1(sablon.subarray(Math.max(0, sablon.length - 64)));
  const sx = /startxref\s+(\d+)\s+%%EOF\s*$/.exec(text);
  if (!sx) throw new Error("Șablonul PDF nu are un cap de fișier valid (startxref).");
  const prev = Number(sx[1]);

  // Dicționarul secțiunii xref anterioare (flux xref): de acolo luăm Root, Info, ID și Size.
  const cap = latin1(sablon.subarray(prev, Math.min(sablon.length, prev + 700)));
  if (!/\/Type\s*\/XRef/.test(cap)) throw new Error("Șablonul PDF are un format xref neașteptat.");
  const root = /\/Root\s+(\d+)\s+(\d+)\s+R/.exec(cap);
  const info = /\/Info\s+(\d+)\s+(\d+)\s+R/.exec(cap);
  const id = /\/ID\s*\[([^\]]*)\]/.exec(cap);
  const size = /\/Size\s+(\d+)/.exec(cap);
  if (!root || !size) throw new Error("Șablonul PDF nu are rădăcina sau dimensiunea xref.");
  const nrXref = Number(size[1]); // obiectul nou pentru noul flux xref

  const lipsaEol = sablon[sablon.length - 1] !== 0x0a && sablon[sablon.length - 1] !== 0x0d;
  const baza = lipsaEol ? concat([sablon, ascii("\n")]) : sablon;

  const continut = new TextEncoder().encode(xmlDatasetsBorderou(d));
  const obiectDatasets = concat([ascii(`${nrDatasets} 0 obj\n<</Length ${continut.length}>>\nstream\n`), continut, ascii("\nendstream\nendobj\n")]);
  const offDatasets = baza.length;
  const offXref = offDatasets + obiectDatasets.length;

  const intrare = (tip: number, off: number, gen: number) => Uint8Array.from([tip, (off >>> 24) & 255, (off >>> 16) & 255, (off >>> 8) & 255, off & 255, (gen >>> 8) & 255, gen & 255]);
  const intrari = concat([intrare(1, offDatasets, 0), intrare(1, offXref, 0)]);
  const dict =
    `<</Type/XRef/Size ${nrXref + 1}/W[1 4 2]/Index[${nrDatasets} 1 ${nrXref} 1]/Root ${root[1]} ${root[2]} R` +
    `${info ? `/Info ${info[1]} ${info[2]} R` : ""}${id ? `/ID[${id[1].trim()}]` : ""}/Prev ${prev}/Length ${intrari.length}>>`;
  const obiectXref = concat([ascii(`${nrXref} 0 obj\n${dict}\nstream\n`), intrari, ascii(`\nendstream\nendobj\nstartxref\n${offXref}\n%%EOF\n`)]);
  return concat([baza, obiectDatasets, obiectXref]);
}
