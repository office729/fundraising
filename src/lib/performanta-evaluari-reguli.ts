import type { Eu } from "@/lib/performanta-acces";

// Echipă & Performanță — discuții și evaluări: tipurile de intrări, validarea conținutului și regulile de acces, fără baza de date.
// Intrările se păstrează în `kpi_interactiuni` (aceeași tabelă ca check-in-ul și 1:1 din modulul KPI), ca să existe o singură istorie.
//
// Cine vede ce (se aplică pe server, nu doar în interfață):
//  - actualizare săptămânală, autoevaluare, obiective de dezvoltare, 1:1: angajatul, managerii lui (direct sau indirect), adminul de departament, administratorii;
//  - review trimestrial: autorul și administratorii; ceilalți (inclusiv angajatul) abia după ce autorul îl PARTAJEAZĂ;
//  - feedback: angajatul căruia i se adresează, autorul, managerii lui și administratorii.
// Un coleg fără legătură cu persoana nu vede nimic din toate acestea.

export type TipIntrare = "checkin" | "1la1" | "review_trimestrial" | "autoevaluare" | "feedback" | "obiectiv_dezvoltare";

export const TIPURI_INTRARE: TipIntrare[] = ["checkin", "1la1", "review_trimestrial", "autoevaluare", "feedback", "obiectiv_dezvoltare"];

export const ETICHETE_INTRARE: Record<TipIntrare, string> = {
  checkin: "Actualizare săptămânală",
  "1la1": "Discuție 1:1",
  review_trimestrial: "Review trimestrial",
  autoevaluare: "Autoevaluare",
  feedback: "Feedback",
  obiectiv_dezvoltare: "Obiective de dezvoltare",
};

export const STATUS_DEZVOLTARE = { de_inceput: "De început", in_curs: "În curs", atins: "Atins", amanat: "Amânat" } as const;
export type StatusDezvoltare = keyof typeof STATUS_DEZVOLTARE;

export type RezumatObiectiv = { titlu: string; progres: number | null; stare: string };

export type Continut = Record<string, unknown>;

const DATA = /^\d{4}-\d{2}-\d{2}$/;
const text = (v: unknown, max = 2000) => String(v ?? "").trim().slice(0, max);
const dataOk = (s: unknown): s is string => typeof s === "string" && DATA.test(s) && new Date(`${s}T00:00:00Z`).toISOString().slice(0, 10) === s;
const COD_PERIOADA = /^(\d{4}-T[1-4]|an-\d{4})$/;

type Rez = { ok: true; continut: Continut } | { ok: false; eroare: string };
const err = (eroare: string): Rez => ({ ok: false, eroare });

// Curăță și validează conținutul unei intrări. Cel puțin un câmp de text trebuie completat: nu salvăm formulare goale.
export function valideazaContinut(tip: TipIntrare, c: Continut): Rez {
  switch (tip) {
    case "checkin": {
      const o = { realizari: text(c.realizari), blocaje: text(c.blocaje), prioritate: text(c.prioritate) };
      if (!o.realizari && !o.blocaje && !o.prioritate) return err("Scrie măcar un rând: ce ți-a ieșit, ce te blochează sau ce urmează.");
      return { ok: true, continut: o };
    }
    case "1la1": {
      const urmatoarea = c.urmatoarea ? String(c.urmatoarea) : null;
      if (urmatoarea && !dataOk(urmatoarea)) return err("Data următoarei discuții e invalidă.");
      const o = { subiecte: text(c.subiecte), decizii: text(c.decizii), actiuni: text(c.actiuni), urmatoarea };
      if (!o.subiecte && !o.decizii && !o.actiuni) return err("Notează măcar subiectele, deciziile sau acțiunile discuției.");
      return { ok: true, continut: o };
    }
    case "review_trimestrial": {
      const perioada = text(c.perioada, 12);
      if (!COD_PERIOADA.test(perioada)) return err("Alege perioada reviewului.");
      const o = { perioada, rezumat: text(c.rezumat), puncteTari: text(c.puncteTari), deDezvoltat: text(c.deDezvoltat), partajat: c.partajat === true };
      if (!o.rezumat && !o.puncteTari && !o.deDezvoltat) return err("Completează măcar rezumatul, punctele tari sau ce e de dezvoltat.");
      return { ok: true, continut: o };
    }
    case "autoevaluare": {
      const perioada = text(c.perioada, 12);
      if (!COD_PERIOADA.test(perioada)) return err("Alege perioada autoevaluării.");
      const o = { perioada, ceaIesit: text(c.ceaIesit), ceamInvatat: text(c.ceamInvatat), nevoieSprijin: text(c.nevoieSprijin) };
      if (!o.ceaIesit && !o.ceamInvatat && !o.nevoieSprijin) return err("Scrie măcar un răspuns.");
      return { ok: true, continut: o };
    }
    case "feedback": {
      const tipFeedback = c.tipFeedback === "sugestie" ? "sugestie" : "apreciere";
      const o = { tipFeedback, text: text(c.text), context: text(c.context, 300) };
      if (o.text.length < 5) return err("Scrie feedbackul (cel puțin 5 caractere), concret și la obiect.");
      return { ok: true, continut: o };
    }
    case "obiectiv_dezvoltare": {
      const titlu = text(c.titlu, 200);
      if (titlu.length < 3) return err("Dă un titlu obiectivului de dezvoltare.");
      const termen = c.termen ? String(c.termen) : null;
      if (termen && !dataOk(termen)) return err("Termenul e invalid.");
      const status = (c.status as string) in STATUS_DEZVOLTARE ? (c.status as StatusDezvoltare) : "de_inceput";
      return { ok: true, continut: { titlu, descriere: text(c.descriere), termen, status, comentariu: text(c.comentariu) } };
    }
    default:
      return err("Tip necunoscut.");
  }
}

export type IntrareAcces = { tip: string; angajatId: string; autorUserId: string | null; partajat?: boolean };

const imediat = (eu: Eu, angajatId: string) => eu.admin || angajatId === eu.angajatId || eu.subordonati.has(angajatId);

export function vedeIntrare(eu: Eu, i: IntrareAcces): boolean {
  if (eu.admin) return true;
  if (i.autorUserId && i.autorUserId === eu.userId) return true;
  if (i.tip === "review_trimestrial") return Boolean(i.partajat) && imediat(eu, i.angajatId);
  return imediat(eu, i.angajatId);
}

// Cine poate scrie o intrare de acest tip despre/pentru persoana `tintaId`.
export function poateScrieIntrare(eu: Eu, tip: TipIntrare, tintaId: string): boolean {
  if (eu.admin) return true;
  const euInsumi = Boolean(eu.angajatId && tintaId === eu.angajatId);
  const subordonat = eu.subordonati.has(tintaId);
  switch (tip) {
    case "checkin":
    case "autoevaluare":
      return euInsumi;
    case "obiectiv_dezvoltare":
      return euInsumi || subordonat;
    case "1la1":
    case "review_trimestrial":
      return subordonat;
    case "feedback":
      return Boolean(eu.angajatId) && !euInsumi;
    default:
      return false;
  }
}

// Modificare: doar autorul. Ștergere: autorul sau un administrator.
export const poateEditaIntrare = (eu: Eu, i: IntrareAcces) => Boolean(i.autorUserId && i.autorUserId === eu.userId);
export const poateStergeIntrare = (eu: Eu, i: IntrareAcces) => eu.admin || poateEditaIntrare(eu, i);

// Pentru lista echipei: o discuție 1:1 „de programat” dacă n-a fost niciuna de mai mult de 45 de zile. E o reamintire, nu o judecată.
export const ZILE_PANA_LA_1LA1 = 45;
export function de1la1(ultima: string | null, azi: string): "niciodata" | "de_programat" | "la_zi" {
  if (!ultima) return "niciodata";
  const zile = Math.round((Date.parse(`${azi}T00:00:00Z`) - Date.parse(`${ultima}T00:00:00Z`)) / 86400000);
  return zile > ZILE_PANA_LA_1LA1 ? "de_programat" : "la_zi";
}
