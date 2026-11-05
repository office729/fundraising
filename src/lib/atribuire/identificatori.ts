"use client";

// Cheile din stocarea locală a browserului pentru provenința vizitatorilor (vezi client.ts). Fișier separat, fără server actions, ca bannerul de
// cookie-uri să le poată șterge fără să tragă tot urmăritorul.
export const CHEIE_VIZITATOR = "fa_vid_v1";
export const CHEIE_SESIUNE = "fa_sid_v1";
import { CHEIE_SURSE_PERSISTENT } from "@/lib/surse-donatii/chei";

// Retragerea sau refuzul acordului pentru statistici șterge imediat identificatorii pseudonimi de vizitator și de sesiune.
export function stergeIdentificatori(): void {
  try {
    window.localStorage.removeItem(CHEIE_VIZITATOR);
    window.localStorage.removeItem(CHEIE_SESIUNE);
    // „Sursele donațiilor”: memoria persistentă (max. 90 de zile) dispare la retragerea acordului; sesiunea curentă continuă cu copia din sessionStorage.
    window.localStorage.removeItem(CHEIE_SURSE_PERSISTENT);
  } catch {
    // nimic de șters
  }
}
