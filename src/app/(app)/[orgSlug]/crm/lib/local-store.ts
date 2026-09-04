"use client";

import { useCallback, useSyncExternalStore } from "react";

import type { Beneficiar } from "../mock/beneficiari";
import type { Companie } from "../mock/companii";
import type { Donator } from "../mock/donatori";
import type { Task } from "../mock/taskuri";

// Stare locală (localStorage) pentru interacțiuni în prototipul cu date
// demonstrative — „lucrat", notițe și donații adăugate manual nu există în
// mock-ul static, deci trăiesc aici cât timp modulul nu e conectat la o bază reală.
//
// Citirile trec prin `readAll` cu un cache pe cheie: `useSyncExternalStore`
// cere ca `getSnapshot()` să întoarcă aceeași referință cât timp datele nu
// s-au schimbat (altfel re-randează la nesfârșit) — `JSON.parse` fresh la
// fiecare citire ar rupe asta.

const cache = new Map<string, { raw: string | null; value: unknown }>();
const EMPTY_ARRAY: never[] = [];

function readAll<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  const raw = window.localStorage.getItem(key);
  const cached = cache.get(key);
  if (cached && cached.raw === raw) return cached.value as T;
  let value: T = fallback;
  if (raw) {
    try {
      value = JSON.parse(raw) as T;
    } catch {
      value = fallback;
    }
  }
  cache.set(key, { raw, value });
  return value;
}

// Eveniment intern: `storage` nativ nu se declanșează în ACELAȘI tab care a
// scris — fără el, componentele care citesc via useSyncExternalStore nu s-ar
// re-randa după propriul lor toggle/salvare.
const STORE_EVENT = "ci-local-store-change";
function notify() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(STORE_EVENT));
}

// Întoarce succes/eșec — apelanții care scriu loturi mari (import) TREBUIE să
// verifice, altfel un eșec de cotă (localStorage plin) trece drept succes:
// UI-ul ar arăta „N rânduri importate" fără ca scrierea să fi avut loc de fapt.
function writeAll<T>(key: string, value: T): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    cache.delete(key); // forțează recitirea (+ reparsarea) la următorul readAll
    notify();
    return true;
  } catch {
    // localStorage plin (cotă depășită) sau indisponibil (mod privat etc.)
    return false;
  }
}

// Hook hidratare-sigur pentru citiri din acest store: randează valoarea
// implicită la SSR/primul paint client (identic pe ambele — fără mismatch),
// apoi comută pe valoarea reală din localStorage imediat după hidratare.
// NU folosim useState+useEffect aici (ar produce exact eroarea de hidratare
// pe care o rezolvăm) — useSyncExternalStore e primitivul făcut pentru
// store-uri externe ca localStorage.
function subscribe(callback: () => void) {
  window.addEventListener(STORE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(STORE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

export function useLocalStoreValue<T>(getSnapshot: () => T, serverValue: T): T {
  const getServerSnapshot = useCallback(() => serverValue, [serverValue]);
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

const WORKED_KEY = "ci-lucrat";
const NOTES_KEY = "ci-notite";
const DONATII_EXTRA_KEY = "ci-donatii-extra";

export function getWorked(id: string): boolean {
  return !!readAll<Record<string, boolean>>(WORKED_KEY, {})[id];
}
export function setWorked(id: string, value: boolean) {
  const all = { ...readAll<Record<string, boolean>>(WORKED_KEY, {}) };
  if (value) all[id] = true;
  else delete all[id];
  writeAll(WORKED_KEY, all);
}

export type Notita = { id: string; text: string; la: string; autor: string; editatLa?: string };
export function getNotite(donatorId: string): Notita[] {
  return readAll<Record<string, Notita[]>>(NOTES_KEY, {})[donatorId] ?? EMPTY_ARRAY;
}
export function addNotita(donatorId: string, text: string, autor: string) {
  const all = { ...readAll<Record<string, Notita[]>>(NOTES_KEY, {}) };
  const nota: Notita = { id: `n${Date.now()}`, text, la: new Date().toISOString(), autor };
  all[donatorId] = [nota, ...(all[donatorId] ?? [])];
  writeAll(NOTES_KEY, all);
  return nota;
}
export function stergeNotita(donatorId: string, notaId: string) {
  const all = { ...readAll<Record<string, Notita[]>>(NOTES_KEY, {}) };
  all[donatorId] = (all[donatorId] ?? []).filter((n) => n.id !== notaId);
  writeAll(NOTES_KEY, all);
}
export function editeazaNotita(donatorId: string, notaId: string, text: string) {
  const all = { ...readAll<Record<string, Notita[]>>(NOTES_KEY, {}) };
  all[donatorId] = (all[donatorId] ?? []).map((n) => (n.id === notaId ? { ...n, text, editatLa: new Date().toISOString() } : n));
  writeAll(NOTES_KEY, all);
}

const NOTES_COMPANII_KEY = "ci-notite-companii";
export function getNotiteCompanie(companyId: string): Notita[] {
  return readAll<Record<string, Notita[]>>(NOTES_COMPANII_KEY, {})[companyId] ?? EMPTY_ARRAY;
}
export function addNotitaCompanie(companyId: string, text: string, autor: string) {
  const all = { ...readAll<Record<string, Notita[]>>(NOTES_COMPANII_KEY, {}) };
  const nota: Notita = { id: `n${Date.now()}`, text, la: new Date().toISOString(), autor };
  all[companyId] = [nota, ...(all[companyId] ?? [])];
  writeAll(NOTES_COMPANII_KEY, all);
  return nota;
}
export function stergeNotitaCompanie(companyId: string, notaId: string) {
  const all = { ...readAll<Record<string, Notita[]>>(NOTES_COMPANII_KEY, {}) };
  all[companyId] = (all[companyId] ?? []).filter((n) => n.id !== notaId);
  writeAll(NOTES_COMPANII_KEY, all);
}
export function editeazaNotitaCompanie(companyId: string, notaId: string, text: string) {
  const all = { ...readAll<Record<string, Notita[]>>(NOTES_COMPANII_KEY, {}) };
  all[companyId] = (all[companyId] ?? []).map((n) => (n.id === notaId ? { ...n, text, editatLa: new Date().toISOString() } : n));
  writeAll(NOTES_COMPANII_KEY, all);
}

export type DonatieManuala = {
  id: string;
  suma: number;
  moneda: string;
  campanie: string;
  data: string;
  recurenta: boolean;
  proiect: string;
  formular230: boolean;
};
export function getDonatiiExtra(donatorId: string): DonatieManuala[] {
  return readAll<Record<string, DonatieManuala[]>>(DONATII_EXTRA_KEY, {})[donatorId] ?? EMPTY_ARRAY;
}
export function addDonatie(donatorId: string, d: Omit<DonatieManuala, "id" | "data">) {
  const all = { ...readAll<Record<string, DonatieManuala[]>>(DONATII_EXTRA_KEY, {}) };
  const donatie: DonatieManuala = { ...d, id: `dm${Date.now()}`, data: new Date().toISOString() };
  all[donatorId] = [donatie, ...(all[donatorId] ?? [])];
  writeAll(DONATII_EXTRA_KEY, all);
  return donatie;
}

const TASKS_KEY = "ci-taskuri-donator";
const PROIECTE_KEY = "ci-proiecte-donator";
const COMUNICARE_LOG_KEY = "ci-comunicare-log";

export type TaskLocal = { id: string; titlu: string; responsabil: string; termen: string; status: "de_facut" | "finalizat"; creatLa: string };
export function getTaskuriDonator(donatorId: string): TaskLocal[] {
  return readAll<Record<string, TaskLocal[]>>(TASKS_KEY, {})[donatorId] ?? EMPTY_ARRAY;
}
export function addTaskDonator(donatorId: string, titlu: string, responsabil: string, termen: string) {
  const all = { ...readAll<Record<string, TaskLocal[]>>(TASKS_KEY, {}) };
  const task: TaskLocal = { id: `t${Date.now()}`, titlu, responsabil, termen, status: "de_facut", creatLa: new Date().toISOString() };
  all[donatorId] = [task, ...(all[donatorId] ?? [])];
  writeAll(TASKS_KEY, all);
  return task;
}
export function toggleTaskDonator(donatorId: string, taskId: string) {
  const all = { ...readAll<Record<string, TaskLocal[]>>(TASKS_KEY, {}) };
  all[donatorId] = (all[donatorId] ?? []).map((t) =>
    t.id === taskId ? { ...t, status: t.status === "finalizat" ? "de_facut" : "finalizat" } : t,
  );
  writeAll(TASKS_KEY, all);
}

export function getProiecteDonator(donatorId: string): string[] {
  return readAll<Record<string, string[]>>(PROIECTE_KEY, {})[donatorId] ?? EMPTY_ARRAY;
}
export function addProiectDonator(donatorId: string, nume: string) {
  const all = { ...readAll<Record<string, string[]>>(PROIECTE_KEY, {}) };
  const existente = all[donatorId] ?? [];
  if (!existente.includes(nume)) all[donatorId] = [...existente, nume];
  writeAll(PROIECTE_KEY, all);
}

export type ComunicareLog = { id: string; tip: "email" | "whatsapp" | "apel"; la: string; autor: string; rezumat: string };
export function getComunicareLog(donatorId: string): ComunicareLog[] {
  return readAll<Record<string, ComunicareLog[]>>(COMUNICARE_LOG_KEY, {})[donatorId] ?? EMPTY_ARRAY;
}
export function logComunicare(donatorId: string, tip: ComunicareLog["tip"], autor: string, rezumat: string) {
  const all = { ...readAll<Record<string, ComunicareLog[]>>(COMUNICARE_LOG_KEY, {}) };
  const log: ComunicareLog = { id: `c${Date.now()}`, tip, la: new Date().toISOString(), autor, rezumat };
  all[donatorId] = [log, ...(all[donatorId] ?? [])];
  writeAll(COMUNICARE_LOG_KEY, all);
  return log;
}

// ===== Import bază de date (CSV/Excel/JSON) — rândurile importate se adaugă
// la lista statică de demo, nu o înlocuiesc. Fiecare tip (donatori/companii)
// stă sub propria cheie, ca un import greșit la un tip să nu-l atingă pe celălalt.

const IMPORTED_DONATORI_KEY = "ci-import-donatori";
const IMPORTED_COMPANII_KEY = "ci-import-companii";

// Prototipul ține datele importate în localStorage (limită tipică ~5MB per
// domeniu în browser) — un fișier real de mii de rânduri poate depăși cota
// silențios. Plafonăm dur ca să nu se mai poată bloca fila (import care
// „reușește" fără să scrie de fapt nimic, sau pagina care nu se mai încarcă).
export const MAX_IMPORT_ROWS = 3000;

export type ImportResult<T> = { rows: T[]; ok: boolean; trunchiat: boolean };

export function getImportedDonatori<T>(): T[] {
  return readAll<T[]>(IMPORTED_DONATORI_KEY, EMPTY_ARRAY as T[]);
}
export function addImportedDonatori<T>(rows: T[]): ImportResult<T> {
  const combinate = [...getImportedDonatori<T>(), ...rows];
  const trunchiat = combinate.length > MAX_IMPORT_ROWS;
  const all = trunchiat ? combinate.slice(0, MAX_IMPORT_ROWS) : combinate;
  const ok = writeAll(IMPORTED_DONATORI_KEY, all);
  return { rows: all, ok, trunchiat };
}
export function clearImportedDonatori() {
  writeAll(IMPORTED_DONATORI_KEY, []);
}

let donatorCounter = 0;
export function addDonatorManual(input: {
  nume: string;
  email: string;
  telefon: string;
  localitate: string;
  responsabil: string;
  consimtamant: Donator["consimtamant"];
}): Donator {
  donatorCounter += 1;
  const donator: Donator = {
    id: `don-manual-${Date.now()}-${donatorCounter}`,
    nume: input.nume,
    email: input.email,
    telefon: input.telefon,
    localitate: input.localitate,
    tip: "unic",
    status: "nou",
    segment: "nou",
    scorImplicare: 30,
    rfm: { r: 3, f: 1, m: 1 },
    totalDonat: 0,
    moneda: "RON",
    ultimaDonatieLa: new Date().toISOString(),
    responsabil: input.responsabil,
    campaniiPreferate: [],
    consimtamant: input.consimtamant,
  };
  addImportedDonatori([donator]);
  return donator;
}

export function getImportedCompanii<T>(): T[] {
  return readAll<T[]>(IMPORTED_COMPANII_KEY, EMPTY_ARRAY as T[]);
}
export function addImportedCompanii<T>(rows: T[]): ImportResult<T> {
  const combinate = [...getImportedCompanii<T>(), ...rows];
  const trunchiat = combinate.length > MAX_IMPORT_ROWS;
  const all = trunchiat ? combinate.slice(0, MAX_IMPORT_ROWS) : combinate;
  const ok = writeAll(IMPORTED_COMPANII_KEY, all);
  return { rows: all, ok, trunchiat };
}
export function clearImportedCompanii() {
  writeAll(IMPORTED_COMPANII_KEY, []);
}

let companieCounter = 0;
export function addCompanieManual(input: {
  nume: string;
  cui: string;
  industrie: string;
  judet: string;
  localitate: string;
  responsabil: string;
}): Companie {
  companieCounter += 1;
  const companie: Companie = {
    id: `co-manual-${Date.now()}-${companieCounter}`,
    nume: input.nume,
    cui: input.cui,
    industrie: input.industrie,
    judet: input.judet,
    localitate: input.localitate,
    site: "",
    administrator: "",
    ca: 0,
    profit: 0,
    nrAngajati: 0,
    stage: "nou",
    status: "open",
    sumaSponsorizata: 0,
    sumaDisponibila: 0,
    ultimaActivitateLa: new Date().toISOString(),
    responsabil: input.responsabil,
    urmatoareaActiune: "De contactat",
    mecanism: "niciunul",
    formular230: false,
    proiect: "",
    lunaDecizie: 12,
    caen: "",
    regCom: "",
    anInfiintare: new Date().getFullYear(),
    numarContract: "",
    dataSemnare: "",
  };
  addImportedCompanii([companie]);
  return companie;
}

// Resetare completă a datelor locale ale prototipului (import, notițe, task-uri,
// sponsorizări adăugate manual etc.) — șterge DOAR cheile acestui modul (prefix
// "ci-"), niciodată tot localStorage-ul: pe același domeniu mai stă și sesiunea
// de autentificare (Supabase), care NU trebuie atinsă de un reset al prototipului.
export function clearAllLocalData() {
  if (typeof window === "undefined") return;
  const keys = Object.keys(window.localStorage).filter((k) => k.startsWith("ci-"));
  keys.forEach((k) => window.localStorage.removeItem(k));
  cache.clear();
  notify();
}

// ===== Urmărire apeluri (De sunat / Sunați / Mulțumiți) — la fel ca „lucrat",
// nu există în mock, deci trăiește local cât timp modulul e prototip.

const SUNAT_KEY = "ci-sunat";
const MULTUMIT_KEY = "ci-multumit";

export function getSunatMap(): Record<string, boolean> {
  return readAll<Record<string, boolean>>(SUNAT_KEY, {});
}
export function setSunat(id: string, value: boolean) {
  const all = { ...readAll<Record<string, boolean>>(SUNAT_KEY, {}) };
  if (value) all[id] = true;
  else delete all[id];
  writeAll(SUNAT_KEY, all);
}

export function getMultumitMap(): Record<string, boolean> {
  return readAll<Record<string, boolean>>(MULTUMIT_KEY, {});
}
export function setMultumit(id: string, value: boolean) {
  const all = { ...readAll<Record<string, boolean>>(MULTUMIT_KEY, {}) };
  if (value) all[id] = true;
  else delete all[id];
  writeAll(MULTUMIT_KEY, all);
}

// ===== Persoane de contact (companii) — contactele din mock + cele adăugate
// manual din panoul „Adaugă persoană de contact" trăiesc împreună aici.

const CONTACTE_KEY = "ci-contacte-companii";
const CONTACTE_STERSE_KEY = "ci-contacte-sterse";

export type ContactLocal = {
  id: string;
  companyId: string;
  nume: string;
  pozitii: string[];
  functie: string;
  telefon: string;
  email: string;
  facebook: string;
  linkedin: string;
  website: string;
  dataPropunerii: string;
  prioritar: boolean;
};

export function getContacteLocale(companyId: string): ContactLocal[] {
  return readAll<Record<string, ContactLocal[]>>(CONTACTE_KEY, {})[companyId] ?? EMPTY_ARRAY;
}
export function addContactCompanie(companyId: string, input: Omit<ContactLocal, "id" | "companyId">): ContactLocal {
  const all = { ...readAll<Record<string, ContactLocal[]>>(CONTACTE_KEY, {}) };
  const contact: ContactLocal = { ...input, id: `ct-manual-${Date.now()}`, companyId };
  all[companyId] = [contact, ...(all[companyId] ?? [])];
  writeAll(CONTACTE_KEY, all);
  return contact;
}
export function setContactPrioritarLocal(companyId: string, contactId: string, value: boolean) {
  const all = { ...readAll<Record<string, ContactLocal[]>>(CONTACTE_KEY, {}) };
  all[companyId] = (all[companyId] ?? []).map((c) => (c.id === contactId ? { ...c, prioritar: value } : c));
  writeAll(CONTACTE_KEY, all);
}

// Prioritatea contactelor din mock (nu doar cele adăugate local) — nu putem
// scrie peste array-ul static, deci ținem override-urile separat, pe id.
export function getPrioritarOverrideMap(): Record<string, boolean> {
  return readAll<Record<string, boolean>>("ci-contacte-prioritar-override", {});
}
export function setPrioritarOverride(contactId: string, value: boolean) {
  const all = { ...readAll<Record<string, boolean>>("ci-contacte-prioritar-override", {}) };
  all[contactId] = value;
  writeAll("ci-contacte-prioritar-override", all);
}

export function getContacteSterse(): Record<string, boolean> {
  return readAll<Record<string, boolean>>(CONTACTE_STERSE_KEY, {});
}
export function stergeContactMock(contactId: string) {
  const all = { ...readAll<Record<string, boolean>>(CONTACTE_STERSE_KEY, {}) };
  all[contactId] = true;
  writeAll(CONTACTE_STERSE_KEY, all);
}

// ===== Etape pipeline companie — bifă individuală pe fiecare etapă, nu un
// singur „stadiu curent" care marchează automat tot ce e înainte ca terminat.
// O firmă poate sări pași reali (ex. sună direct și obține contractul, fără
// să fi trecut prin mesaj LinkedIn/one-pager) — completat trebuie să reflecte
// ce s-a întâmplat de fapt, nu doar poziția în listă.

const ETAPE_COMPLETATE_KEY = "ci-companie-etape-completate";

export function getEtapeCompletateMap(): Record<string, string[]> {
  return readAll<Record<string, string[]>>(ETAPE_COMPLETATE_KEY, {});
}
export function toggleEtapaCompanie(companyId: string, etapa: string) {
  const all = { ...readAll<Record<string, string[]>>(ETAPE_COMPLETATE_KEY, {}) };
  const curente = all[companyId] ?? [];
  all[companyId] = curente.includes(etapa) ? curente.filter((e) => e !== etapa) : [...curente, etapa];
  writeAll(ETAPE_COMPLETATE_KEY, all);
}

const STATUS_OVERRIDE_KEY = "ci-companie-status";

export function getStatusOverrideMap(): Record<string, string> {
  return readAll<Record<string, string>>(STATUS_OVERRIDE_KEY, {});
}
export function setCompanieStatus(companyId: string, status: string) {
  const all = { ...readAll<Record<string, string>>(STATUS_OVERRIDE_KEY, {}) };
  all[companyId] = status;
  writeAll(STATUS_OVERRIDE_KEY, all);
}

// ===== Sponsorizări companie — înregistrate manual din butonul „Sponsorizare"
// de pe profil, separate de ledger-ul static DONATII (sursa="companie").

const SPONSORIZARI_KEY = "ci-sponsorizari-companii";

export type AlocareLocal = { id: string; nume: string; suma: number; data: string };

export type SponsorizareLocal = {
  id: string;
  suma: number;
  data: string;
  proiect: string;
  nota: string;
  alocari: AlocareLocal[];
};

export function getSponsorizariCompanie(companyId: string): SponsorizareLocal[] {
  return readAll<Record<string, SponsorizareLocal[]>>(SPONSORIZARI_KEY, {})[companyId] ?? EMPTY_ARRAY;
}
export function addSponsorizareCompanie(companyId: string, input: Omit<SponsorizareLocal, "id" | "alocari">): SponsorizareLocal {
  const all = { ...readAll<Record<string, SponsorizareLocal[]>>(SPONSORIZARI_KEY, {}) };
  const sponsorizare: SponsorizareLocal = { ...input, id: `sp-${Date.now()}`, alocari: [] };
  all[companyId] = [sponsorizare, ...(all[companyId] ?? [])];
  writeAll(SPONSORIZARI_KEY, all);
  return sponsorizare;
}
export function stergeSponsorizareCompanie(companyId: string, sponsorizareId: string) {
  const all = { ...readAll<Record<string, SponsorizareLocal[]>>(SPONSORIZARI_KEY, {}) };
  all[companyId] = (all[companyId] ?? []).filter((s) => s.id !== sponsorizareId);
  writeAll(SPONSORIZARI_KEY, all);
}

// Defalcarea sumei — cui i-a fost alocată o parte din sponsorizare (beneficiar/caz).
export function addAlocareSponsorizare(companyId: string, sponsorizareId: string, input: { nume: string; suma: number }) {
  const all = { ...readAll<Record<string, SponsorizareLocal[]>>(SPONSORIZARI_KEY, {}) };
  const alocare: AlocareLocal = { id: `al-${Date.now()}`, nume: input.nume, suma: input.suma, data: new Date().toISOString() };
  all[companyId] = (all[companyId] ?? []).map((s) => (s.id === sponsorizareId ? { ...s, alocari: [...s.alocari, alocare] } : s));
  writeAll(SPONSORIZARI_KEY, all);
}
export function stergeAlocareSponsorizare(companyId: string, sponsorizareId: string, alocareId: string) {
  const all = { ...readAll<Record<string, SponsorizareLocal[]>>(SPONSORIZARI_KEY, {}) };
  all[companyId] = (all[companyId] ?? []).map((s) =>
    s.id === sponsorizareId ? { ...s, alocari: s.alocari.filter((a) => a.id !== alocareId) } : s,
  );
  writeAll(SPONSORIZARI_KEY, all);
}

// ===== Etichete firmă (mecanism fiscal / formular 230 / proiect / lună decizie)
// — suprascriu câmpurile din mock, editabile din dialogul de sponsorizare nouă.

const FLAGURI_KEY = "ci-companie-flaguri";

export type FlagOverride = Partial<
  Pick<Companie, "mecanism" | "formular230" | "proiect" | "lunaDecizie" | "numarContract" | "dataSemnare">
>;

export function getFlagOverrideMap(): Record<string, FlagOverride> {
  return readAll<Record<string, FlagOverride>>(FLAGURI_KEY, {});
}
export function setCompanieFlags(companyId: string, patch: FlagOverride) {
  const all = { ...readAll<Record<string, FlagOverride>>(FLAGURI_KEY, {}) };
  all[companyId] = { ...all[companyId], ...patch };
  writeAll(FLAGURI_KEY, all);
}

// ===== Pagina globală „Taskuri" — task-urile din mock rămân doar-citire ca
// obiecte, dar status/termen se pot suprascrie local (nicio scriere reală),
// iar task-urile noi trăiesc într-un array separat, la fel ca restul prototipului.

const TASKURI_GLOBALE_KEY = "ci-taskuri-globale";
const TASKURI_STATUS_KEY = "ci-taskuri-status";
const TASKURI_TERMEN_KEY = "ci-taskuri-termen";
const TASKURI_STERSE_KEY = "ci-taskuri-sterse";

export function getTaskuriGlobale(): Task[] {
  return readAll<Task[]>(TASKURI_GLOBALE_KEY, EMPTY_ARRAY as Task[]);
}
export function addTaskGlobal(input: Omit<Task, "id" | "status">) {
  const all = getTaskuriGlobale();
  const task: Task = { ...input, id: `tg-${Date.now()}`, status: "de_facut" };
  writeAll(TASKURI_GLOBALE_KEY, [task, ...all]);
  return task;
}

export function getTaskStatusOverride(): Record<string, Task["status"]> {
  return readAll<Record<string, Task["status"]>>(TASKURI_STATUS_KEY, {});
}
export function setTaskStatus(taskId: string, status: Task["status"]) {
  const locale = getTaskuriGlobale();
  if (locale.some((t) => t.id === taskId)) {
    writeAll(TASKURI_GLOBALE_KEY, locale.map((t) => (t.id === taskId ? { ...t, status } : t)));
    return;
  }
  const all = { ...readAll<Record<string, Task["status"]>>(TASKURI_STATUS_KEY, {}) };
  all[taskId] = status;
  writeAll(TASKURI_STATUS_KEY, all);
}

export function getTaskTermenOverride(): Record<string, string> {
  return readAll<Record<string, string>>(TASKURI_TERMEN_KEY, {});
}
export function setTaskTermen(taskId: string, termenLa: string) {
  const locale = getTaskuriGlobale();
  if (locale.some((t) => t.id === taskId)) {
    writeAll(TASKURI_GLOBALE_KEY, locale.map((t) => (t.id === taskId ? { ...t, termenLa } : t)));
    return;
  }
  const all = { ...readAll<Record<string, string>>(TASKURI_TERMEN_KEY, {}) };
  all[taskId] = termenLa;
  writeAll(TASKURI_TERMEN_KEY, all);
}

export function getTaskuriSterse(): Record<string, boolean> {
  return readAll<Record<string, boolean>>(TASKURI_STERSE_KEY, {});
}
export function stergeTask(taskId: string) {
  const locale = getTaskuriGlobale();
  if (locale.some((t) => t.id === taskId)) {
    writeAll(TASKURI_GLOBALE_KEY, locale.filter((t) => t.id !== taskId));
    return;
  }
  const all = { ...readAll<Record<string, boolean>>(TASKURI_STERSE_KEY, {}) };
  all[taskId] = true;
  writeAll(TASKURI_STERSE_KEY, all);
}

// ===== Contracte companie — fișierul încărcat (Word/PDF) trăiește ca data URI
// în localStorage (doar fișiere mici, prototip) — nu există storage real aici.

const CONTRACTE_COMPANII_KEY = "ci-contracte-companii";

export type ContractLocal = {
  id: string;
  nume: string;
  fisierNume: string;
  fisierTip: string;
  fisierData: string;
  status: "trimis" | "semnat" | "asteptare" | "anulat";
  incarcatLa: string;
};

export function getContracteCompanie(companyId: string): ContractLocal[] {
  return readAll<Record<string, ContractLocal[]>>(CONTRACTE_COMPANII_KEY, {})[companyId] ?? EMPTY_ARRAY;
}
export function addContractCompanie(companyId: string, input: Omit<ContractLocal, "id" | "incarcatLa">) {
  const all = { ...readAll<Record<string, ContractLocal[]>>(CONTRACTE_COMPANII_KEY, {}) };
  const contract: ContractLocal = { ...input, id: `ctrl-${Date.now()}`, incarcatLa: new Date().toISOString() };
  all[companyId] = [contract, ...(all[companyId] ?? [])];
  writeAll(CONTRACTE_COMPANII_KEY, all);
  return contract;
}
export function stergeContractCompanie(companyId: string, contractId: string) {
  const all = { ...readAll<Record<string, ContractLocal[]>>(CONTRACTE_COMPANII_KEY, {}) };
  all[companyId] = (all[companyId] ?? []).filter((c) => c.id !== contractId);
  writeAll(CONTRACTE_COMPANII_KEY, all);
}
export function setContractStatus(companyId: string, contractId: string, status: ContractLocal["status"]) {
  const all = { ...readAll<Record<string, ContractLocal[]>>(CONTRACTE_COMPANII_KEY, {}) };
  all[companyId] = (all[companyId] ?? []).map((c) => (c.id === contractId ? { ...c, status } : c));
  writeAll(CONTRACTE_COMPANII_KEY, all);
}

// ===== Beneficiari / proiecte adăugate manual din „Adaugă" — se adaugă la
// lista statică, nu o înlocuiesc (la fel ca donatori/companii importați).

const IMPORTED_BENEFICIARI_KEY = "ci-import-beneficiari";

export function getImportedBeneficiari<T>(): T[] {
  return readAll<T[]>(IMPORTED_BENEFICIARI_KEY, EMPTY_ARRAY as T[]);
}
export function addImportedBeneficiari<T>(rows: T[]) {
  const all = [...getImportedBeneficiari<T>(), ...rows];
  writeAll(IMPORTED_BENEFICIARI_KEY, all);
  return all;
}

let beneficiarCounter = 0;
export function addBeneficiarManual(input: {
  nume: string;
  obiectiv: number;
  descriere: string;
  sumaStransa: number;
  localitate: string;
}): Beneficiar {
  beneficiarCounter += 1;
  const beneficiar: Beneficiar = {
    id: `ben-manual-${Date.now()}-${beneficiarCounter}`,
    nume: input.nume,
    varsta: 0,
    localitate: input.localitate,
    statusCampanie: "activa",
    poveste: input.descriere,
    obiectiv: input.obiectiv,
    sumaStransa: input.sumaStransa,
    sumaAlocata: 0,
    sumaAchitata: 0,
    zileActive: 0,
    sponsoriIds: [],
  };
  addImportedBeneficiari([beneficiar]);
  return beneficiar;
}

// ===== Instrumente — Planificator IT: proiecte web pe faze/pagini, brief,
// program zilnic și registru de domenii & acces. Store nou, izolat.

const PROIECTE_IT_KEY = "ci-proiecte-it";

export type FazaProiectIT = "brief" | "design" | "dezvoltare" | "testare" | "live";

export type ProiectIT = {
  id: string;
  nume: string;
  tip: "intern" | "client";
  faza: FazaProiectIT;
  pagini: string[];
  domeniu: string;
  acces: string;
  brief: string;
  creatLa: string;
};

export function getProiecteIT(): ProiectIT[] {
  return readAll<ProiectIT[]>(PROIECTE_IT_KEY, EMPTY_ARRAY as ProiectIT[]);
}
export function addProiectIT(input: Omit<ProiectIT, "id" | "creatLa" | "faza">): ProiectIT {
  const proiect: ProiectIT = { ...input, id: `pit-${Date.now()}`, faza: "brief", creatLa: new Date().toISOString() };
  writeAll(PROIECTE_IT_KEY, [proiect, ...getProiecteIT()]);
  return proiect;
}
export function setFazaProiectIT(id: string, faza: FazaProiectIT) {
  writeAll(PROIECTE_IT_KEY, getProiecteIT().map((p) => (p.id === id ? { ...p, faza } : p)));
}
export function stergeProiectIT(id: string) {
  writeAll(PROIECTE_IT_KEY, getProiecteIT().filter((p) => p.id !== id));
}

// ===== Instrumente — Împărțire grupuri Facebook.

const GRUPURI_FB_KEY = "ci-grupuri-facebook";

export type GrupFacebook = {
  id: string;
  nume: string;
  membri: number;
  responsabil: string;
  frecventaPostari: "zilnic" | "saptamanal" | "lunar";
  link: string;
  creatLa: string;
};

export function getGrupuriFacebook(): GrupFacebook[] {
  return readAll<GrupFacebook[]>(GRUPURI_FB_KEY, EMPTY_ARRAY as GrupFacebook[]);
}
export function addGrupFacebook(input: Omit<GrupFacebook, "id" | "creatLa">): GrupFacebook {
  const grup: GrupFacebook = { ...input, id: `gfb-${Date.now()}`, creatLa: new Date().toISOString() };
  writeAll(GRUPURI_FB_KEY, [grup, ...getGrupuriFacebook()]);
  return grup;
}
export function setResponsabilGrupFacebook(id: string, responsabil: string) {
  writeAll(GRUPURI_FB_KEY, getGrupuriFacebook().map((g) => (g.id === id ? { ...g, responsabil } : g)));
}
export function stergeGrupFacebook(id: string) {
  writeAll(GRUPURI_FB_KEY, getGrupuriFacebook().filter((g) => g.id !== id));
}

// ===== Instrumente — Comunicate de presă generate (istoric local).

const COMUNICATE_KEY = "ci-comunicate-presa";

export type Comunicat = { id: string; titlu: string; continut: string; creatLa: string };

export function getComunicate(): Comunicat[] {
  return readAll<Comunicat[]>(COMUNICATE_KEY, EMPTY_ARRAY as Comunicat[]);
}
export function addComunicat(titlu: string, continut: string): Comunicat {
  const comunicat: Comunicat = { id: `cp-${Date.now()}`, titlu, continut, creatLa: new Date().toISOString() };
  writeAll(COMUNICATE_KEY, [comunicat, ...getComunicate()]);
  return comunicat;
}
export function stergeComunicat(id: string) {
  writeAll(COMUNICATE_KEY, getComunicate().filter((c) => c.id !== id));
}

// ===== Documente (pagina globală „Documente") — fișierul urcat trăiește ca
// data URI în localStorage, la fel ca la Contracte companie: doar fișiere
// mici, e un prototip, nu există storage real aici.

const DOCUMENTE_KEY = "ci-documente-globale";

export type DocumentLocal = {
  id: string;
  nume: string;
  tip: "contract" | "factura" | "raport" | "altul";
  legatDe: { tip: "companie" | "donator"; id: string; nume: string };
  fisierTip: string;
  fisierData: string;
  incarcatLa: string;
};

export function getDocumenteLocale(): DocumentLocal[] {
  return readAll<DocumentLocal[]>(DOCUMENTE_KEY, EMPTY_ARRAY as DocumentLocal[]);
}
export function addDocumentLocal(input: Omit<DocumentLocal, "id" | "incarcatLa">): DocumentLocal {
  const document: DocumentLocal = { ...input, id: `docl-${Date.now()}`, incarcatLa: new Date().toISOString() };
  writeAll(DOCUMENTE_KEY, [document, ...getDocumenteLocale()]);
  return document;
}
export function stergeDocumentLocal(id: string) {
  writeAll(DOCUMENTE_KEY, getDocumenteLocale().filter((d) => d.id !== id));
}

// ===== Notificări văzute (clopoțel) — task-urile întârziate rămân întârziate
// oricât, dar odată ce ai deschis panoul cu ele nu mai are rost să tragă
// atenția la loc; punctul roșu revine doar când apare un task NOU întârziat.

const NOTIFICARI_VAZUTE_KEY = "ci-notificari-vazute";

export function getNotificariVazute(): Record<string, boolean> {
  return readAll<Record<string, boolean>>(NOTIFICARI_VAZUTE_KEY, {});
}
export function marcheazaNotificariVazute(ids: string[]) {
  const all = { ...readAll<Record<string, boolean>>(NOTIFICARI_VAZUTE_KEY, {}) };
  ids.forEach((id) => (all[id] = true));
  writeAll(NOTIFICARI_VAZUTE_KEY, all);
}
