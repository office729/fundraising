// Logica pură pentru sarcinile online și activitățile pe teren ale voluntarilor (fără acces la baza de date, deci ușor de testat):
// tipuri, statusuri, calculul orelor, statusul voluntarului, linkuri cu UTM, validări.

export const TIPURI_SARCINA = [
  { id: "distribuie", nume: "Distribuie o postare", exemplu: "Dă mai departe o campanie pe rețelele tale." },
  { id: "text", nume: "Scrie sau tradu un text", exemplu: "Un articol, o traducere sau o descriere scurtă." },
  { id: "grafica", nume: "Fă o grafică sau un video", exemplu: "Un material vizual pentru o campanie sau un eveniment." },
  { id: "altceva", nume: "Altceva", exemplu: "Orice altă sarcină pe care o poți face de acasă." },
] as const;
export type TipSarcina = (typeof TIPURI_SARCINA)[number]["id"];
export const esteTipSarcina = (x: unknown): x is TipSarcina => TIPURI_SARCINA.some((t) => t.id === x);
// La „Altceva”, dacă managerul a scris un nume (ex. „Proiect: traducere site”), acela apare în loc de „Altceva”.
export const numeTipSarcina = (id: string, personalizat?: string | null) => (id === "altceva" && personalizat?.trim() ? personalizat.trim() : (TIPURI_SARCINA.find((t) => t.id === id)?.nume ?? id));
export const MAX_TIP_PERSONALIZAT = 60;

export type StareSarcina = "ciorna" | "publicata" | "inchisa";
export type StareActivitate = "ciorna" | "publicata" | "incheiata" | "anulata";
export type StatusInscriere = "in_asteptare" | "confirmata" | "rezerva" | "prezent" | "absent" | "anulata";
export type StareImplicare = "angajat" | "finalizat" | "renuntat";

export const ETICHETE_INSCRIERE: Record<StatusInscriere, string> = {
  in_asteptare: "În așteptare",
  confirmata: "Confirmată",
  rezerva: "Listă de rezervă",
  prezent: "Prezent",
  absent: "Absent",
  anulata: "Anulată",
};

// Înscrierile care ocupă un loc în tură.
export const STATUSURI_CARE_OCUPA_LOC: StatusInscriere[] = ["in_asteptare", "confirmata", "prezent"];

export const MAX = { titlu: 120, descriere: 1500, text: 1800, instructiuni: 1500, locatie: 200, nume: 80, problema: 1200, linkPostare: 500 } as const;

// ===== Ore =====
// Orele dintre două momente, rotunjite la sfert de oră (ex. 09:00–12:10 = 3,25). Niciodată negative.
export function calculeazaOre(inceput: Date, sfarsit: Date): number {
  const ore = (sfarsit.getTime() - inceput.getTime()) / 3_600_000;
  if (!Number.isFinite(ore) || ore <= 0) return 0;
  return Math.round(ore * 4) / 4;
}

export function formateazaOre(ore: number | string | null | undefined): string {
  const n = Number(ore ?? 0);
  if (!Number.isFinite(n)) return "0";
  return n.toLocaleString("ro-RO", { maximumFractionDigits: 2 });
}

// ===== Statusul voluntarului =====
// Doar Nou / Activ / Inactiv se calculează; „Retras” înseamnă că rândul nu mai există (ștergere la cerere).
export type StatusVoluntar = "nou" | "activ" | "inactiv";
export const ZILE_INACTIV = 90;

export function statusVoluntar(ultimaActiune: Date | null, acum: Date = new Date()): StatusVoluntar {
  if (!ultimaActiune) return "nou";
  const zile = (acum.getTime() - ultimaActiune.getTime()) / 86_400_000;
  return zile <= ZILE_INACTIV ? "activ" : "inactiv";
}
export const ETICHETE_STATUS_VOLUNTAR: Record<StatusVoluntar, string> = { nou: "Nou", activ: "Activ", inactiv: "Inactiv" };

// ===== Linkuri =====
// Doar https (sau http pentru teste locale); orice altceva (javascript:, data:, mailto:) este refuzat.
export function normalizeazaLink(brut: string | null | undefined): string | null {
  const s = String(brut ?? "").trim();
  if (!s) return null;
  // Orice schemă în afară de http(s) (javascript:, data:, mailto:…) se refuză.
  if (/^[a-z][a-z0-9+.-]*:/i.test(s) && !/^https?:\/\//i.test(s)) return null;
  try {
    const u = new URL(/^[a-z]+:\/\//i.test(s) ? s : `https://${s}`);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

const slugUtm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

// Linkul de distribuit, cu UTM. `utm_content` poartă un cod opac al sarcinii (nu numele sau telefonul voluntarului),
// iar valorile sunt cu litere mici (UTM e sensibil la majuscule).
export function linkCuUtm(linkBaza: string, parametri: { canal?: string | null; campanie: string; sarcina: string }): string {
  const u = new URL(linkBaza);
  u.searchParams.set("utm_source", "voluntar");
  u.searchParams.set("utm_medium", slugUtm(parametri.canal || "social") || "social");
  u.searchParams.set("utm_campaign", slugUtm(parametri.campanie) || "voluntari");
  u.searchParams.set("utm_content", slugUtm(parametri.sarcina) || "sarcina");
  return u.toString();
}

export const listaCanale = (s: string | null | undefined): string[] => (s ? s.split(",").map((x) => x.trim()).filter(Boolean) : []);

// ===== Sarcini: este deschisă? =====
export function sarcinaDeschisa(
  s: { stare: string; inceputLa: string | null; termen: string | null; nrVoluntari: number | null; finalizari: number },
  azi: string,
): boolean {
  if (s.stare !== "publicata") return false;
  if (s.inceputLa && s.inceputLa > azi) return false;
  if (s.termen && s.termen < azi) return false;
  if (s.nrVoluntari != null && s.finalizari >= s.nrVoluntari) return false;
  return true;
}

// ===== Înscrieri =====
// Statusul unei înscrieri noi: aprobare manuală → în așteptare; altfel confirmată dacă mai e loc, altfel pe lista de rezervă.
export function statusInscriereNoua(aprobare: string, locuriOcupate: number, locuri: number): StatusInscriere {
  if (aprobare === "manuala") return "in_asteptare";
  return locuriOcupate < locuri ? "confirmata" : "rezerva";
}

// ===== Validări (la nivel de formular) =====
export function textCurat(brut: unknown, max: number): string {
  return String(brut ?? "")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .trim()
    .slice(0, max);
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const emailValid = (s: string) => s.length <= 120 && EMAIL.test(s);

export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ===== Ora României =====
// Câmpurile <input type="datetime-local"> dau ora locală („2026-11-14T09:00”); în baza de date se păstrează momentul real (UTC).
function decalajRo(ms: number): number {
  const p = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Bucharest",
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(ms));
  const v = (t: string) => Number(p.find((x) => x.type === t)?.value);
  return (Date.UTC(v("year"), v("month") - 1, v("day"), v("hour"), v("minute"), v("second")) - Math.floor(ms / 1000) * 1000) / 60_000;
}

export function dinOraRo(local: string | null | undefined): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(String(local ?? ""));
  if (!m) return null;
  const [y, mo, d, h, mi] = m.slice(1).map(Number);
  const presupus = Date.UTC(y, mo - 1, d, h, mi);
  let t = presupus - decalajRo(presupus) * 60_000;
  const decalaj2 = decalajRo(t);
  t = presupus - decalaj2 * 60_000;
  const rezultat = new Date(t);
  return Number.isNaN(rezultat.getTime()) ? null : rezultat;
}

export function laOraRo(data: Date | string): string {
  const d = typeof data === "string" ? new Date(data) : data;
  const p = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Bucharest", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(d);
  return p.replace(" ", "T");
}
