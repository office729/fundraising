"use client";

import { useSyncExternalStore } from "react";

type Salutari = { morning: string; afternoon: string; evening: string };

const aboneaza = () => () => {};
const oraBrowser = () => new Date().getHours();
// Serverul rulează în UTC, browserul în ora locală: același getHours() ar da alt text la randare și la hidratare
// (eroarea React #418). La hidratare React folosește snapshot-ul de server, apoi trece pe ora reală, fără nepotrivire.
const oraServer = () => 12;

// Salutul în funcție de ora din browser, sigur la hidratare.
export function useSalut(salutari: Salutari): string {
  const ora = useSyncExternalStore(aboneaza, oraBrowser, oraServer);
  return ora < 12 ? salutari.morning : ora < 18 ? salutari.afternoon : salutari.evening;
}
