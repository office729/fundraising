// Newsman Remarketing: părțile pure (fără importuri, testabile) ale integrării din lib/newsman.ts.

// Scriptul Newsman, cu „Respectă setările Marketing din cookie banner (consent mode)” bifat în contul Newsman, pornește urmărirea doar dacă în `window.dataLayer` există un
// semnal Google Consent Mode cu cele trei permisiuni acordate (citit din `consent` + `default`/`update`). Fără semnal, nu urmărește nimic. Bannerul nostru are propria alegere
// pentru marketing, deci o traducem în acest semnal: acordat la bifare, refuzat la retragere.
export type SemnalConsimtamant = { ad_storage: "granted" | "denied"; ad_user_data: "granted" | "denied"; ad_personalization: "granted" | "denied" };

export function semnalConsimtamant(acordat: boolean): SemnalConsimtamant {
  const v = acordat ? "granted" : "denied";
  return { ad_storage: v, ad_user_data: v, ad_personalization: v };
}

// Cookie-urile setate de Newsman pe domeniul nostru (identificatorul de abonat, cel din newsletter, atribuirea conversiilor, nu-te-abona): toate încep cu `_nzm_`. La retragerea
// acordului le ștergem pe toate.
export const esteCookieNewsman = (nume: string): boolean => nume.startsWith("_nzm_");
