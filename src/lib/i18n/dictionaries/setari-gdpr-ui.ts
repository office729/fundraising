import type { Locale } from "../config";

// Setări → Cereri GDPR ale persoanelor (setari/gdpr/*) și descrierile modulelor blocate din pagina de setări.
export const SETARI_GDPR_UI_DICT = {
  ro: {
    inapoi: "← Setări",
    titlu: "Cereri GDPR ale persoanelor",
    intro:
      "Caută după email o persoană care cere acces la date sau ștergerea lor (art. 15 și 17 GDPR): persoane de contact la companii, voluntari, creatori de pagini de campanie, expeditori de mesaje și contacte media. Pentru donatori folosește panoul din profilul donatorului.",
    metadata: "Cereri GDPR",
    email: "Adresa de email a persoanei",
    cauta: "Caută",
    gasite: (email: string) => `Date găsite pentru ${email}`,
    randuri: {
      contacte: "Persoane de contact la companii (CRM Companii)",
      voluntari: "Voluntari (CRM Voluntari)",
      pagini: "Pagini de campanie create",
      mesaje: "Mesaje trimise (portal beneficiari)",
      media: "Contacte media",
    },
    ceiDonator: (donatii: number, formulare: number) => `Persoana apare și ca donator (${donatii} donații, ${formulare} formulare 230). Datele de donator, donațiile și Formularul 230 au evidență contabilă/legală și se gestionează din panoul GDPR al donatorului`,
    deschideProfil: "deschide profilul",
    exporta: "Exportă datele (JSON)",
    sterge: "Șterge / anonimizează",
    exportEsuat: "Exportul a eșuat.",
    stergereEsuata: "Ștergerea a eșuat.",
    confirma: (email: string) => `Ștergi/anonimizezi datele asociate cu ${email} din sursele de mai jos? Nu se poate anula.`,
    gata: (x: { contacteSterse: number; voluntariStersi: number; panouVoluntariSterse: number; paginiAnonimizate: number; mesajeAnonimizate: number; contacteMediaAnonimizate: number }) =>
      `Gata: ${x.contacteSterse} contacte șterse, ${x.voluntariStersi} voluntari scoși${x.panouVoluntariSterse ? ` (și ${x.panouVoluntariSterse} din panou)` : ""}, ${x.paginiAnonimizate} pagini și ${x.mesajeAnonimizate} mesaje anonimizate, ${x.contacteMediaAnonimizate} contacte media anonimizate.`,
    prospectareModul:
      "Caută decidenți pentru firmele tale cu propriile chei la Lusha, Apollo, Prospeo și Hunter, și îi trimite la abordare pe LinkedIn prin Waalaxy.",
    campuriModul: "Adaugă câmpurile tale la donatori și la firme (text, număr, dată, alegere, da/nu), vizibile în fișe, în export și în API.",
    apiModul: "Conectează Alexandrit la alte instrumente: chei API pentru citirea donatorilor și a donațiilor și webhook-uri pentru donații reușite și dezabonări.",
  },
  en: {
    inapoi: "← Settings",
    titlu: "People's GDPR requests",
    intro:
      "Search by email for a person asking for access to their data or its deletion (Art. 15 and 17 GDPR): contact people at companies, volunteers, campaign page creators, message senders and media contacts. For donors, use the panel on the donor's profile.",
    metadata: "GDPR requests",
    email: "The person's email address",
    cauta: "Search",
    gasite: (email: string) => `Data found for ${email}`,
    randuri: {
      contacte: "Contact people at companies (Companies CRM)",
      voluntari: "Volunteers (Volunteers CRM)",
      pagini: "Campaign pages created",
      mesaje: "Messages sent (beneficiary panel)",
      media: "Media contacts",
    },
    ceiDonator: (donatii: number, formulare: number) => `This person also appears as a donor (${donatii} donations, ${formulare} Form 230 submissions). Donor data, donations and Form 230 are accounting/legal records and are handled from the donor's GDPR panel`,
    deschideProfil: "open the profile",
    exporta: "Export the data (JSON)",
    sterge: "Delete / anonymise",
    exportEsuat: "The export failed.",
    stergereEsuata: "The deletion failed.",
    confirma: (email: string) => `Delete/anonymise the data associated with ${email} from the sources below? This cannot be undone.`,
    gata: (x: { contacteSterse: number; voluntariStersi: number; panouVoluntariSterse: number; paginiAnonimizate: number; mesajeAnonimizate: number; contacteMediaAnonimizate: number }) =>
      `Done: ${x.contacteSterse} contacts deleted, ${x.voluntariStersi} volunteers removed${x.panouVoluntariSterse ? ` (and ${x.panouVoluntariSterse} from the panel)` : ""}, ${x.paginiAnonimizate} pages and ${x.mesajeAnonimizate} messages anonymised, ${x.contacteMediaAnonimizate} media contacts anonymised.`,
    prospectareModul:
      "Looks up decision makers for your companies with your own keys at Lusha, Apollo, Prospeo and Hunter, and sends them to LinkedIn outreach through Waalaxy.",
    campuriModul: "Add your own fields to donors and companies (text, number, date, choice, yes/no), visible on their pages, in the export and in the API.",
    apiModul: "Connect Alexandrit to other tools: API keys for reading donors and donations, and webhooks for successful donations and unsubscribes.",
  },
} satisfies Record<Locale, unknown>;
