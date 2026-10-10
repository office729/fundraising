// Certificate (recunoștință, mulțumire, voluntariat, parteneriat...): datele de intrare, curățarea lor și tipurile de certificat.
import { ACCENTE_IMPLICITE, curataAccente, iso, linieDinText, paragrafeDinText, text, textLung, urlLogo, type Accente } from "./documente-comun";
import { curataMotiv, motivImplicit, type Motiv } from "./motiv";
import { dataLunga } from "./raport-impact";

export const MODELE_CERTIFICATE = [
  { id: "clasic", eticheta: "Clasic ornat", hint: "Ramă dublă cu ornamente în colțuri și sigiliu" },
  { id: "modern", eticheta: "Modern", hint: "Nume mare aliniat la stânga, bloc de culoare pe margine" },
  { id: "gala", eticheta: "Gală", hint: "Ramă groasă în gradient și fundal luminos" },
  { id: "swiss", eticheta: "Grilă tipografică", hint: "Coloană laterală cu date, numele mare, aliniat la stânga, ca un afiș elvețian" },
  { id: "inima", eticheta: "Inimă", hint: "Inimă mare ca filigran și linie de puls sub nume" },
  { id: "banda", eticheta: "Bandă laterală", hint: "Coloană colorată cu sigiliu, textul în dreapta" },
  { id: "diploma", eticheta: "Diplomă", hint: "Format portret, cu panglică în partea de sus" },
  { id: "numeral", eticheta: "Anul în fundal", hint: "Anul foarte mare, discret, în spatele textului aliniat la stânga" },
  { id: "acuarela", eticheta: "Acuarelă", hint: "Pete de culoare fine în fundal, scris italic" },
  { id: "tipografic", eticheta: "Tipografic", hint: "Numele în litere foarte mari, aspect de afiș" },
  { id: "medalion", eticheta: "Medalion", hint: "Medalion cu raze la stânga, textul în dreapta" },
  { id: "diagonala", eticheta: "Diagonală", hint: "Câmp de culoare tăiat în diagonală, cu sigiliul pe margine" },
  { id: "ziar", eticheta: "Ediție specială", hint: "Antet de ziar, titlul pe prima pagină și text pe două coloane" },
  { id: "intunecat", eticheta: "Întunecat", hint: "Fundal închis, text deschis, linii în culoarea principală" },
  { id: "poster", eticheta: "Poster portret", hint: "Format portret, sigiliu mare sus și nume central" },
] as const;
export type ModelCertificat = (typeof MODELE_CERTIFICATE)[number]["id"];
export const MODELE_PORTRET: ModelCertificat[] = ["diploma", "poster"];

export type TipCertificat = "recunostinta" | "multumire" | "voluntar" | "partener" | "sponsor" | "participare";

export const TIPURI_CERTIFICAT: { id: TipCertificat; eticheta: string; titlu: string; introducere: string; motiv: string }[] = [
  { id: "recunostinta", eticheta: "Certificat de recunoștință", titlu: "Certificat de recunoștință", introducere: "se acordă cu mulțumire", motiv: "pentru sprijinul acordat și pentru încrederea cu care ne-a fost alături în misiunea noastră." },
  { id: "multumire", eticheta: "Certificat de mulțumire pentru donator", titlu: "Certificat de mulțumire", introducere: "se acordă cu mulțumire", motiv: "pentru generozitatea cu care a ales să facă o schimbare în viața oamenilor pe care îi sprijinim." },
  { id: "voluntar", eticheta: "Certificat de voluntariat", titlu: "Certificat de voluntariat", introducere: "se acordă", motiv: "pentru timpul, energia și implicarea din activitatea de voluntariat desfășurată alături de {ORGANIZATIE}." },
  { id: "partener", eticheta: "Certificat de parteneriat", titlu: "Certificat de parteneriat", introducere: "se acordă partenerului", motiv: "pentru colaborarea din {AN} și pentru proiectele realizate împreună cu {ORGANIZATIE}." },
  { id: "sponsor", eticheta: "Certificat de sponsor", titlu: "Certificat de sponsor", introducere: "se acordă sponsorului", motiv: "pentru sprijinul acordat în {AN}, care a contribuit la realizarea proiectelor noastre." },
  { id: "participare", eticheta: "Certificat de participare", titlu: "Certificat de participare", introducere: "se acordă", motiv: "pentru participarea la evenimentul organizat de {ORGANIZATIE}." },
];

export type DateCertificat = Accente & {
  model: ModelCertificat;
  logoOng: string;
  logoDestinatar: string;
  tip: TipCertificat;
  antetNume: string;
  titlu: string;
  introducere: string;
  destinatar: string;
  motiv: string;
  detaliu: string; // ex.: „Suma susținută: 5.000 lei” sau „120 de ore de voluntariat”
  citat: string;
  loc: string;
  data: string;
  nrCertificat: string;
  semn1Nume: string;
  semn1Functie: string;
  semn2Nume: string;
  semn2Functie: string;
  motivGrafic: Motiv;
  verificareOnline: boolean; // certificatul primește un cod și o pagină publică de verificare
  codVerificare: string; // atribuit la export
  urlVerificare: string; // adresa paginii publice (https)
};

export function dateCertificatGoale(o: { nume: string; logo?: string; acc?: Accente }, azi: string): DateCertificat {
  const t = TIPURI_CERTIFICAT[0];
  return {
    ...(o.acc ?? ACCENTE_IMPLICITE),
    model: "clasic",
    logoOng: o.logo ?? "",
    logoDestinatar: "",
    tip: t.id,
    antetNume: o.nume,
    titlu: t.titlu,
    introducere: t.introducere,
    destinatar: "",
    motiv: t.motiv,
    detaliu: "",
    citat: "",
    loc: "",
    data: azi,
    nrCertificat: "",
    semn1Nume: "",
    semn1Functie: "",
    semn2Nume: "",
    semn2Functie: "",
    motivGrafic: motivImplicit(o.nume),
    verificareOnline: true,
    codVerificare: "",
    urlVerificare: "",
  };
}

export function curataDateCertificat(brut: unknown, azi = ""): DateCertificat {
  const b = (brut && typeof brut === "object" ? brut : {}) as Record<string, unknown>;
  return {
    ...curataAccente(b),
    model: MODELE_CERTIFICATE.some((m) => m.id === b.model) ? (b.model as ModelCertificat) : "clasic",
    logoOng: urlLogo(b.logoOng),
    logoDestinatar: urlLogo(b.logoDestinatar),
    tip: TIPURI_CERTIFICAT.some((t) => t.id === b.tip) ? (b.tip as TipCertificat) : "recunostinta",
    antetNume: text(b.antetNume, 160),
    titlu: text(b.titlu, 80),
    introducere: text(b.introducere, 100),
    destinatar: text(b.destinatar, 120),
    motiv: textLung(b.motiv, 500),
    detaliu: text(b.detaliu, 160),
    citat: text(b.citat, 200),
    loc: text(b.loc, 80),
    data: iso(b.data) || azi,
    nrCertificat: text(b.nrCertificat, 40),
    semn1Nume: text(b.semn1Nume, 100),
    semn1Functie: text(b.semn1Functie, 100),
    semn2Nume: text(b.semn2Nume, 100),
    semn2Functie: text(b.semn2Functie, 100),
    motivGrafic: curataMotiv(b.motivGrafic),
    verificareOnline: b.verificareOnline !== false,
    codVerificare: /^[A-Z0-9]{5}-[A-Z0-9]{5}$/.test(String(b.codVerificare)) ? String(b.codVerificare) : "",
    urlVerificare: /^https:\/\/[^\s"'<>]{1,200}$/.test(String(b.urlVerificare)) ? String(b.urlVerificare) : "",
  };
}

export function valoriCertificat(d: DateCertificat): Record<string, string> {
  return { DESTINATAR: d.destinatar || "destinatar", ORGANIZATIE: d.antetNume || "organizația noastră", DATA: dataLunga(d.data), AN: d.data.slice(0, 4) };
}
export const motivCertificat = (d: DateCertificat) => paragrafeDinText(d.motiv, valoriCertificat(d));
export const linieCertificat = (brut: string, d: DateCertificat) => linieDinText(brut, valoriCertificat(d));

export function dateCertificatExemplu(o: { nume: string; logo?: string; acc?: Accente }, azi: string): DateCertificat {
  return {
    ...dateCertificatGoale(o, azi),
    destinatar: "Exemplu Construct SRL",
    detaliu: "4 proiecte susținute în 2025–2026",
    citat: "Împreună, orice inimă poate bate mai departe.",
    loc: "București",
    nrCertificat: "Nr. 014 / 2026",
    semn1Nume: "Vlad Popescu",
    semn1Functie: "Președinte",
    semn2Nume: "Ana Marinescu",
    semn2Functie: "Director executiv",
  };
}
