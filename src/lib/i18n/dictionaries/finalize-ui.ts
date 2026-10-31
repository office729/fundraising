import type { Locale } from "../config";

// Pasul „Încă un pas” (finalizarea organizației după prima autentificare): doar textele care nu există deja în AUTH_DICT
// (etichetele câmpurilor, acceptarea termenilor și erorile comune se iau de acolo).
export const FINALIZE_UI_DICT = {
  ro: {
    titlu: "Încă un pas",
    autentificatCa: "Ești autentificat(ă) ca ",
    completeaza: ". Completează datele organizației pentru care creezi contul.",
    planAlesPre: "Planul ales pe pagina de prețuri: ",
    planPret: (pret: number) => ` — ${pret} lei/lună`,
    planAplicat: ". Îl aplicăm automat organizației tale noi.",
    continua: "Continuă",
    seCreeaza: "Se creează...",
    orgLipsa: "Completează numele organizației.",
    orgPreaLung: (max: number) => `Numele organizației e prea lung (maxim ${max} de caractere).`,
  },
  en: {
    titlu: "One more step",
    autentificatCa: "You're signed in as ",
    completeaza: ". Fill in the details of the organization you're creating the account for.",
    planAlesPre: "Plan chosen on the pricing page: ",
    planPret: (pret: number) => ` — ${pret} lei/month`,
    planAplicat: ". We apply it automatically to your new organization.",
    continua: "Continue",
    seCreeaza: "Creating...",
    orgLipsa: "Enter the organization's name.",
    orgPreaLung: (max: number) => `The organization name is too long (maximum ${max} characters).`,
  },
} satisfies Record<Locale, unknown>;
