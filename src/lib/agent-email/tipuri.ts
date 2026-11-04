// Tipurile pe care le văd și serverul, și pagina (fără cod de server). Datele către browser sunt în ISO 8601.
import type { EtichetaRaspuns, Mecanism, Problema, StareMesaj, TipMesaj } from "./reguli";

export type RaspunsClient = {
  id: string;
  primitLa: string;
  subiect: string;
  fragment: string;
  eticheta: EtichetaRaspuns;
  automat: boolean;
  citit: boolean;
};

export type MesajClient = {
  id: string;
  companyId: string;
  firma: string;
  contactId: string | null;
  catre: { nume: string; email: string; rol: string | null };
  de: { id: string | null; nume: string; email: string };
  subiect: string;
  mesaj: string;
  subiectAlt: string | null;
  subiectAles: "A" | "B" | "editat" | null;
  aiSubiect: string | null;
  mecanism: Mecanism;
  cazNume: string | null;
  cazLink: string | null; // singurul link permis în text (pagina publică a campaniei)
  istoric: string | null;
  tip: TipMesaj;
  revenireLa: string | null;
  stare: StareMesaj;
  eroare: string | null;
  creat: string;
  seTrimiteLa: string | null;
  trimisLa: string | null;
  aprobatDe: string | null;
  deschis: { prima: string; ultima: string; nr: number } | null;
  raspunsuri: RaspunsClient[];
  apelLa: string | null;
  apelFacutLa: string | null;
  salutGhicit: boolean;
  pdfNume: string | null;
};

export type ContPublic = {
  adresa: string;
  semnatura: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  imapHost: string;
  imapPort: number;
  imapUser: string;
  amprenta: string;
  smtpTestatLa: string | null;
  smtpEroare: string | null;
  imapTestatLa: string | null;
  imapEroare: string | null;
  imapVerificatLa: string | null;
  imapNoi: number;
};

export type StareContEmail = { criptareActiva: boolean; cont: ContPublic | null };

export type ExpeditorClient = { id: string; nume: string; email: string; semnaturaRezumat: string };
export type ColegClient = { id: string; nume: string };

export type SetariAgent = { limitaZi: number; pixelActiv: boolean };
export type PdfGeneral = { nume: string; marime: number; la: string; de: string | null; hash: string };

export type DatePaginaAgent = {
  acum: string;
  eu: { id: string; nume: string; admin: boolean };
  contulMeu: ContPublic | null;
  criptareActiva: boolean;
  aiConectat: boolean;
  setari: SetariAgent;
  pdfGeneral: PdfGeneral | null;
  expeditori: ExpeditorClient[]; // cei în numele cărora se pot scrie ciorne
  colegi: ColegClient[]; // membrii organizației (filtrul „firmele responsabilului”)
  numeColegi: string[]; // pentru verificarea „numele altui coleg în text”
  mesaje: MesajClient[];
  trimiseAziEu: number;
};

export type CandidatAgent = {
  id: string;
  nume: string;
  stage: string;
  loc: string | null;
  scor: number;
  sponsor: boolean;
  sumaSponsorizata: number;
  mecanismMarcat: ("d177" | "mec20")[];
  neeligibilD177: boolean;
  contact: { id: string; nume: string; rol: string | null; email: string; acord: "da" | "necunoscut"; cheie: boolean };
  pdfFirma: boolean;
  areCiorna: boolean;
};

export type FiltreCandidati = {
  q: string;
  responsabilId: string; // "" = toate firmele
  tip: "toate" | "sponsori" | "noi";
  mecanism: "toate" | "d177" | "mec20";
  scorMin: number;
  doarCuAcord: boolean;
  ordine: "scor" | "nume";
};

export type RezultatCandidati = { lista: CandidatAgent[]; total: number; plafonat: boolean; explicatie: { firme: number; faraContactBun: number; scriseRecent: number } };

export type RezultatActiune = { ok: boolean; error?: string; mesaj?: string };
export type RezultatTrimitere = RezultatActiune & { probleme?: Problema[] };
export type RezultatGenerare = RezultatActiune & { create?: number; erori?: string[] };

export type PrevizualizareMesaj = {
  semnatura: string; // textul semnăturii expeditorului (se transformă în HTML cu corpEmailHtml)
  subsolText: string;
  atasament: { nume: string; marime: number; sursa: "firma" | "general"; hash: string } | null;
  revenire: boolean;
  poateTrimite: boolean; // contul meu e expeditorul
};
