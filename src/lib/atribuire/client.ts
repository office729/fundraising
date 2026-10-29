"use client";

import { CONSENT_KEY } from "@/lib/analytics";

import { raporteazaEvenimentAtribuire } from "./actiuni";
import { CHEIE_SESIUNE, CHEIE_VIZITATOR, stergeIdentificatori } from "./identificatori";
import { areEticheteDeCampanie, esteUuid, INACTIVITATE_SESIUNE_MS, semnaleDinUrl, serializeazaContext, type ContextAtribuire, type Flux, type Semnale } from "./clasificare";

// Urmărirea provenienței în browser. Reguli de confidențialitate:
//  - Fără acordul pentru statistici (bannerul de cookie-uri) NU se scrie nimic pe dispozitiv și nu există identificator persistent: contează doar adresa
//    paginii din acel moment (UTM, referrer). Serverul numără vizita doar ca amprentă zilnică, fără urmărire între zile.
//  - Cu acord se păstrează doar un UUID aleatoriu de vizitator și unul de sesiune, plus semnalele UTM/referrer ale începutului de sesiune.
//    Nicio dată personală, niciun nume, email, telefon sau conținut de formular nu ajunge aici.
//  - Dacă vizitatorul a REFUZAT explicit, nu se trimite niciun eveniment de pe pagină (conversiile — donația, formularul — se înregistrează oricum
//    operațional, cu proveniența luată doar din adresa curentă).
type StareSesiune = { id: string; ultima: number; semnale: Semnale };

const uuidNou = (): string => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : "");

export function acordStatistici(): boolean {
  try {
    return window.localStorage.getItem(CONSENT_KEY) === "granted";
  } catch {
    return false;
  }
}
// Refuz explicit: orice identificator rămas de la un acord anterior se șterge pe loc.
export function refuzStatistici(): boolean {
  try {
    if (window.localStorage.getItem(CONSENT_KEY) !== "denied") return false;
    stergeIdentificatori();
    return true;
  } catch {
    return false;
  }
}

function citesteJson<T>(cheie: string): T | null {
  try {
    const brut = window.localStorage.getItem(cheie);
    return brut ? (JSON.parse(brut) as T) : null;
  } catch {
    return null;
  }
}
function scrie(cheie: string, valoare: unknown) {
  try {
    window.localStorage.setItem(cheie, JSON.stringify(valoare));
  } catch {
    // stocare indisponibilă: contează doar adresa paginii
  }
}

const semnaleCurente = (): Semnale => semnaleDinUrl((n) => new URLSearchParams(window.location.search).get(n), document.referrer || null);
const semnatura = (s: Semnale) => [s.utmSource, s.utmMedium, s.utmCampaign, s.utmContent, s.adClickTip].map((x) => x ?? "").join("|");

// `activitate`: true când pagina tocmai s-a încărcat (reînnoiește sesiunea și poate începe una nouă); false la simpla citire pentru un formular.
export function contextCurent(activitate: boolean): ContextAtribuire {
  const curente = semnaleCurente();
  if (!acordStatistici()) {
    stergeIdentificatori(); // acord retras sau nedat: orice identificator rămas se șterge
    return { v: null, s: null, semnale: curente };
  }
  let vizitator = citesteJson<string>(CHEIE_VIZITATOR);
  if (!esteUuid(vizitator)) {
    vizitator = uuidNou();
    if (!esteUuid(vizitator)) return { v: null, s: null, semnale: curente };
    scrie(CHEIE_VIZITATOR, vizitator);
  }
  const acum = Date.now();
  let sesiune = citesteJson<StareSesiune>(CHEIE_SESIUNE);
  const valida = !!sesiune && esteUuid(sesiune.id) && typeof sesiune.ultima === "number" && acum - sesiune.ultima <= INACTIVITATE_SESIUNE_MS;
  // O sesiune nouă începe după 30 de minute de inactivitate sau când sosește un clic nou cu etichete de campanie (altele decât ale sesiunii curente).
  const clicNou = valida && areEticheteDeCampanie(curente) && semnatura(curente) !== semnatura(sesiune!.semnale);
  if (activitate && (!valida || clicNou)) {
    sesiune = { id: uuidNou(), ultima: acum, semnale: curente };
    scrie(CHEIE_SESIUNE, sesiune);
  } else if (valida && activitate) {
    sesiune = { ...sesiune!, ultima: acum };
    scrie(CHEIE_SESIUNE, sesiune);
  } else if (!valida) {
    // Citire fără activitate, dar fără sesiune activă (formular rămas deschis mult timp): sesiune nouă cu semnalele de acum.
    sesiune = { id: uuidNou(), ultima: acum, semnale: curente };
    scrie(CHEIE_SESIUNE, sesiune);
  }
  return { v: vizitator, s: sesiune!.id, semnale: sesiune!.semnale };
}

// Valoarea pentru câmpul ascuns al formularelor (donație, înscriere) sau pentru corpul cererii (Formular 230).
export function contextSerializat(): string {
  try {
    return serializeazaContext(contextCurent(false));
  } catch {
    return "";
  }
}

const trimise = new Set<string>();

// Raportează un eveniment, cel mult o dată pe încărcare de pagină pentru aceeași combinație. Nu aruncă niciodată.
export function urmareste(flux: Flux, tip: string, tinta: { orgSlug?: string; pageSlug?: string; beneficiarSlug?: string } = {}): void {
  try {
    if (refuzStatistici()) return;
    const cheie = `${flux}|${tip}|${tinta.orgSlug ?? ""}|${tinta.pageSlug ?? ""}|${tinta.beneficiarSlug ?? ""}|${window.location.pathname}`;
    if (trimise.has(cheie)) return;
    trimise.add(cheie);
    const ctx = serializeazaContext(contextCurent(tip === "vizita"));
    void raporteazaEvenimentAtribuire({ flux, tip, ...tinta, ctx, cale: window.location.pathname }).catch(() => {});
  } catch {
    // măsurarea nu are voie să strice pagina
  }
}
