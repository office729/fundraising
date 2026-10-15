"use client";

import { CONSENT_KEY } from "@/lib/analytics";

import { touchDinParametri, type Touch } from "./atribuire";

// Contextul ultimului clic eligibil (utm_*), păstrat în browser DOAR după acordul pentru statistici, pentru ca o donație făcută la o a doua vizită
// să rămână atribuită. Fără acord nu se scrie nimic pe dispozitiv: contează doar adresa paginii din acel moment.
// Conține numai coduri UTM și momentul clicului, nicio dată personală și niciun identificator.
const KEY = "fa_touch_v1";
const MAX_VECHIME_MS = 30 * 86_400_000;

// Momentul vizitei: încărcarea paginii (nu momentul în care se trimite formularul), ca fereastra de atribuire să se măsoare de la clic.
const momentVizita = (): number => Math.floor(performance.timeOrigin || Date.now());

const acord = (): boolean => {
  try {
    return window.localStorage.getItem(CONSENT_KEY) === "granted";
  } catch {
    return false;
  }
};

function citesteStocat(): Touch | null {
  try {
    const brut = window.localStorage.getItem(KEY);
    if (!brut) return null;
    const t = JSON.parse(brut) as Touch;
    if (!t || typeof t.s !== "string" || typeof t.t !== "number" || Date.now() - t.t > MAX_VECHIME_MS) return null;
    return { ...t, st: 1 };
  } catch {
    return null;
  }
}

// La fiecare încărcare a unei pagini de campanie: cu acord, un nou clic cu utm_source înlocuiește contextul vechi (ultimul clic câștigă, inclusiv
// email sau social organic); fără acord, orice context stocat înainte (acord retras) se șterge.
export function memoreazaTouch(): void {
  try {
    if (!acord()) {
      window.localStorage.removeItem(KEY);
      return;
    }
    const q = new URLSearchParams(window.location.search);
    const t = touchDinParametri((n) => q.get(n), momentVizita());
    if (t) window.localStorage.setItem(KEY, JSON.stringify(t));
    else if (!citesteStocat()) window.localStorage.removeItem(KEY);
  } catch {
    // stocare indisponibilă: se folosește doar adresa paginii
  }
}

// Valoarea pentru câmpul ascuns al formularului: clicul din adresa curentă (fără stocare) sau, cu acord, ultimul clic păstrat. Gol dacă nu există.
export function touchPentruDonatie(): string {
  try {
    const q = new URLSearchParams(window.location.search);
    const dinUrl = touchDinParametri((n) => q.get(n), momentVizita());
    if (dinUrl) return JSON.stringify(acord() ? { ...dinUrl, st: 1 } : dinUrl);
    if (!acord()) return "";
    const stocat = citesteStocat();
    return stocat ? JSON.stringify(stocat) : "";
  } catch {
    return "";
  }
}
