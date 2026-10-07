"use client";

import { useSyncExternalStore } from "react";

// O organizație nouă (fără donatori și fără pagini de campanie) nu vede implicit tabloul de bord demonstrativ: cifre inventate
// lângă datele ei reale încurcă un utilizator fără experiență. Exemplele apar doar dacă le cere, per organizație și per browser.
const EVENIMENT = "fa-exemple-demo";
const cheie = (orgSlug: string) => `fa:exemple-demo:${orgSlug}`;

export function seteazaExempleDemo(orgSlug: string, activ: boolean) {
  try {
    if (activ) localStorage.setItem(cheie(orgSlug), "1");
    else localStorage.removeItem(cheie(orgSlug));
  } catch {
    /* modul privat / stocare blocată: rămâne starea din memorie până la reîncărcare */
  }
  window.dispatchEvent(new Event(EVENIMENT));
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENIMENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENIMENT, cb);
    window.removeEventListener("storage", cb);
  };
}

export function useExempleDemo(orgSlug: string): boolean {
  return useSyncExternalStore(
    subscribe,
    () => {
      try {
        return localStorage.getItem(cheie(orgSlug)) === "1";
      } catch {
        return false;
      }
    },
    () => false,
  );
}
