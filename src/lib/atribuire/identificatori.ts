"use client";

// Cheile din stocarea locală a browserului pentru provenința vizitatorilor (vezi client.ts). Fișier separat, fără server actions, ca bannerul de
// cookie-uri să le poată șterge fără să tragă tot urmăritorul.
export const CHEIE_VIZITATOR = "fa_vid_v1";
export const CHEIE_SESIUNE = "fa_sid_v1";

// Retragerea sau refuzul acordului pentru statistici șterge imediat identificatorii pseudonimi de vizitator și de sesiune.
export function stergeIdentificatori(): void {
  try {
    window.localStorage.removeItem(CHEIE_VIZITATOR);
    window.localStorage.removeItem(CHEIE_SESIUNE);
  } catch {
    // nimic de șters
  }
}
