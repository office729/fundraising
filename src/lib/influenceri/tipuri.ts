// Influenceri — tipurile care trec între server și interfață (datele ajung în browser ca JSON simplu: datele calendaristice sunt șiruri ISO 8601).
import type { Urmaritori } from "./reguli";

export type Membru = { id: string; nume: string };

export type CazDistribuibil = { id: string; slug: string; titlu: string; judet: string | null; ramasLei: number | null };

export type RandLista = {
  id: string;
  numePublic: string;
  fotoUrl: string | null;
  instagram: string | null;
  facebook: string | null;
  tiktok: string | null;
  youtube: string | null;
  urmaritori: Urmaritori;
  categorie: string;
  oras: string | null;
  judet: string | null;
  tara: string | null;
  etapa: string;
  responsabilId: string | null;
  responsabil: string | null;
  nuContacta: boolean;
  ultimaContactare: string | null;
  ultimulContactDe: string | null;
  followUpLa: string | null;
  followUpTip: string | null;
  followUpNota: string | null;
  nrReveniri: number;
  cazId: string | null;
  caz: string | null;
  actualizatLa: string;
};

export type Influencer = RandLista & {
  nume: string | null;
  email: string | null;
  telefon: string | null;
  domeniu: string | null;
  publicTinta: string | null;
  sursaDate: string;
  temeiLegal: string;
  note: string | null;
  nuContactaMotiv: string | null;
  ultimulRaspuns: string | null;
  acordPublic: boolean;
  creatLa: string;
};

export type Activitate = { id: string; tip: string; canal: string | null; text: string | null; caz: string | null; user: string | null; la: string };

export type LinkInfluencer = { id: string; caz: string; cazId: string; slug: string; platforma: string; url: string; clicuri: number; donatii: number; sumaLei: number };

export type Coordonare = { nume: string | null; la: string };

export type Fisa = { inf: Influencer; activitati: Activitate[]; linkuri: LinkInfluencer[]; coordonare: Coordonare | null };

export type StareAzi = { identificate: number; tinta: number | null };

export type DateInfluenceri = {
  randuri: RandLista[];
  trunchiat: boolean;
  scadenteAzi: number;
  membri: Membru[];
  cazuri: CazDistribuibil[];
  eu: { id: string; esteAdmin: boolean };
  setari: { verificareZile: number; revenireZile: number; maxReveniri: number; blocareColegZile: number };
  azi: StareAzi;
  aiConectat: boolean;
  siteUrl: string;
};

// Câmpurile fișei, așa cum vin din formular (text liber; normalizarea și validarea se fac pe server).
export type CampuriInfluencer = {
  nume?: string;
  numePublic?: string;
  fotoUrl?: string;
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  youtube?: string;
  urmaritori?: Record<string, number | string | undefined>;
  categorie?: string;
  domeniu?: string;
  publicTinta?: string;
  oras?: string;
  judet?: string;
  tara?: string;
  email?: string;
  telefon?: string;
  sursaDate?: string;
  temeiLegal?: string;
  responsabilId?: string | null;
  cazId?: string | null;
  note?: string;
  acordPublic?: boolean;
};

export type RezultatSalvare = { id: string; duplicat: false } | { id: string; duplicat: true };

export type RezultatImport = { adaugate: number; completate: number; excluse: number; erori: string[] };

export type MesajePregatite = {
  link: string;
  variante: { instagram: string; facebook: string; colaborare: string };
  sursa: "ai" | "sablon";
  // Motivul pentru care s-a folosit șablonul în loc de AI (cont neconectat, eroare, răspuns neutilizabil).
  avertisment: string | null;
  // Altă colegă a scris recent aceluiași influencer: avertismentul apare chiar la pregătirea mesajului.
  coordonare: Coordonare | null;
};

export type Rez<T = null> = { ok: true; data: T; mesaj?: string } | { ok: false; eroare: string; coordonare?: boolean };
