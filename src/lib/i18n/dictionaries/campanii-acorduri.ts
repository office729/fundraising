import type { Locale } from "../config";

// Secțiunea „Acorduri și protecția datelor” din dialogul de editare a campaniei (crm/strangere-fonduri/edit-page-dialog.tsx)
// și avertismentul din cardul campaniei. Regula e în lib/campanii/distribuibil.ts.
export const CAMPANII_ACORDURI_DICT = {
  ro: {
    titlu: "Acorduri și protecția datelor",
    intro: "Doar campaniile cu acordurile în regulă pot fi trimise la AI sau date mai departe (Agent email, Influenceri, promovare).",
    minor: "Beneficiarul este minor",
    acordDistribuireMinor: "Părintele/tutorele a acceptat distribuirea",
    anonimizat: "Cazul este anonimizat",
    acordRetras: "Acordul a fost retras",
    acordDiagnostic: "Avem acordul pentru diagnostic și descrierea cazului",
    acordDiagnosticNota: "Fără el, povestea campaniei nu pleacă la AI.",
    avertisment: "Campania nu poate fi trimisă la AI sau dată mai departe:",
    motive: {
      fara_acord_publicare: "lipsește acordul pentru publicare.",
      anonimizat: "cazul este anonimizat.",
      acord_retras: "acordul a fost retras.",
      minor_fara_acord: "beneficiarul este minor și lipsește acordul părintelui sau al tutorelui.",
    },
    eroareBifa: "Acordurile nu au fost trimise corect. Reîncarcă pagina și încearcă din nou.",
  },
  en: {
    titlu: "Consents and data protection",
    intro: "Only campaigns with valid consents can be sent to AI or shared further (Email agent, Influencers, promotion).",
    minor: "The beneficiary is a minor",
    acordDistribuireMinor: "The parent/guardian agreed to sharing",
    anonimizat: "The case is anonymized",
    acordRetras: "Consent was withdrawn",
    acordDiagnostic: "We have consent for the diagnosis and the case description",
    acordDiagnosticNota: "Without it, the campaign story is not sent to AI.",
    avertisment: "This campaign cannot be sent to AI or shared further:",
    motive: {
      fara_acord_publicare: "the consent to publish is missing.",
      anonimizat: "the case is anonymized.",
      acord_retras: "consent was withdrawn.",
      minor_fara_acord: "the beneficiary is a minor and the parent's or guardian's consent is missing.",
    },
    eroareBifa: "The consents were not sent correctly. Reload the page and try again.",
  },
} satisfies Record<Locale, unknown>;
