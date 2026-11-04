import type { Locale } from "../config";

// Ce s-a șters/anonimizat la o cerere de ștergere (câmpurile din stergePersoanaAction).
type RezumatStergere = {
  contacteSterse: number;
  voluntariStersi: number;
  panouVoluntariSterse: number;
  paginiAnonimizate: number;
  mesajeAnonimizate: number;
  contacteMediaAnonimizate: number;
  emailuriCiorneSterse: number;
  emailuriAnonimizate: number;
  raspunsuriAnonimizate: number;
  candidatiAnonimizati: number;
  influenceriStersi: number;
  adaugataLaSuprimare: boolean;
};

// Setări → Cereri GDPR ale persoanelor (setari/gdpr/*) și descrierile modulelor blocate din pagina de setări.
export const SETARI_GDPR_UI_DICT = {
  ro: {
    inapoi: "← Setări",
    titlu: "Cereri GDPR ale persoanelor",
    intro:
      "Caută după email (sau după profil / handle) o persoană care cere acces la date sau ștergerea lor (art. 15 și 17 GDPR): persoane de contact la companii, voluntari, creatori de pagini de campanie, expeditori de mesaje, contacte media, emailurile trimise de Agentul email și răspunsurile primite, persoane găsite în Prospectare și influenceri. Pentru donatori folosește panoul din profilul donatorului.",
    metadata: "Cereri GDPR",
    email: "Adresa de email a persoanei",
    handle: "Profil sau handle (opțional)",
    handleAjutor: "Link de profil (Instagram, TikTok, Facebook, YouTube, LinkedIn) sau @handle. Poți căuta și doar după el, fără email.",
    handlePlaceholder: "@nume sau link",
    cauta: "Caută",
    gasite: (persoana: string) => `Date găsite pentru ${persoana}`,
    randuri: {
      contacte: "Persoane de contact la companii (CRM Companii)",
      voluntari: "Voluntari (CRM Voluntari)",
      pagini: "Pagini de campanie create",
      mesaje: "Mesaje trimise (portal beneficiari)",
      media: "Contacte media",
      emailuriAgent: "Emailuri ale Agentului email (ciorne și trimise)",
      raspunsuriAgent: "Răspunsuri primite la emailurile Agentului",
      candidati: "Persoane găsite în Prospectare (candidați)",
      influenceri: "Influenceri (fișe)",
    },
    suprimat: "Adresa e deja pe lista „nu mai contacta” (se păstrează doar o amprentă a ei).",
    ceiDonator: (donatii: number, formulare: number) => `Persoana apare și ca donator (${donatii} donații, ${formulare} formulare 230). Datele de donator, donațiile și Formularul 230 au evidență contabilă/legală și se gestionează din panoul GDPR al donatorului`,
    deschideProfil: "deschide profilul",
    exporta: "Exportă datele (JSON)",
    sterge: "Șterge / anonimizează",
    exportEsuat: "Exportul a eșuat.",
    stergereEsuata: "Ștergerea a eșuat.",
    confirma: (persoana: string) => `Ștergi/anonimizezi datele asociate cu ${persoana} din sursele de mai jos? Nu se poate anula. Adresa de email intră pe lista „nu mai contacta” (doar amprenta ei), ca să nu mai fie contactată.`,
    gata: (x: RezumatStergere) =>
      `Gata: ${x.contacteSterse} contacte șterse, ${x.voluntariStersi} voluntari scoși${x.panouVoluntariSterse ? ` (și ${x.panouVoluntariSterse} din panou)` : ""}, ${x.paginiAnonimizate} pagini și ${x.mesajeAnonimizate} mesaje anonimizate, ${x.contacteMediaAnonimizate} contacte media anonimizate, ${x.emailuriCiorneSterse} ciorne de email șterse, ${x.emailuriAnonimizate} emailuri trimise anonimizate (${x.raspunsuriAnonimizate} răspunsuri golite), ${x.candidatiAnonimizati} candidați din Prospectare anonimizați, ${x.influenceriStersi} influenceri șterși${x.adaugataLaSuprimare ? "; adresa e pe lista „nu mai contacta”" : ""}.`,
    prospectareModul:
      "Caută decidenți pentru firmele tale cu propriile chei la Lusha, Apollo, Prospeo și Hunter, și îi trimite la abordare pe LinkedIn prin Waalaxy.",
    campuriModul: "Adaugă câmpurile tale la donatori și la firme (text, număr, dată, alegere, da/nu), vizibile în fișe, în export și în API.",
    apiModul: "Conectează Alexandrit la alte instrumente: chei API pentru citirea donatorilor și a donațiilor și webhook-uri pentru donații reușite și dezabonări.",
  },
  en: {
    inapoi: "← Settings",
    titlu: "People's GDPR requests",
    intro:
      "Search by email (or by profile / handle) for a person asking for access to their data or its deletion (Art. 15 and 17 GDPR): contact people at companies, volunteers, campaign page creators, message senders, media contacts, emails sent by the Email agent and replies received, people found in Prospecting and influencers. For donors, use the panel on the donor's profile.",
    metadata: "GDPR requests",
    email: "The person's email address",
    handle: "Profile or handle (optional)",
    handleAjutor: "Profile link (Instagram, TikTok, Facebook, YouTube, LinkedIn) or @handle. You can also search by it alone, without an email.",
    handlePlaceholder: "@name or link",
    cauta: "Search",
    gasite: (persoana: string) => `Data found for ${persoana}`,
    randuri: {
      contacte: "Contact people at companies (Companies CRM)",
      voluntari: "Volunteers (Volunteers CRM)",
      pagini: "Campaign pages created",
      mesaje: "Messages sent (beneficiary panel)",
      media: "Media contacts",
      emailuriAgent: "Email agent emails (drafts and sent)",
      raspunsuriAgent: "Replies received to the Agent's emails",
      candidati: "People found in Prospecting (candidates)",
      influenceri: "Influencers (profiles)",
    },
    suprimat: "The address is already on the \"do not contact\" list (only a fingerprint of it is kept).",
    ceiDonator: (donatii: number, formulare: number) => `This person also appears as a donor (${donatii} donations, ${formulare} Form 230 submissions). Donor data, donations and Form 230 are accounting/legal records and are handled from the donor's GDPR panel`,
    deschideProfil: "open the profile",
    exporta: "Export the data (JSON)",
    sterge: "Delete / anonymise",
    exportEsuat: "The export failed.",
    stergereEsuata: "The deletion failed.",
    confirma: (persoana: string) => `Delete/anonymise the data associated with ${persoana} from the sources below? This cannot be undone. The email address goes on the "do not contact" list (only a fingerprint of it), so the person is not contacted again.`,
    gata: (x: RezumatStergere) =>
      `Done: ${x.contacteSterse} contacts deleted, ${x.voluntariStersi} volunteers removed${x.panouVoluntariSterse ? ` (and ${x.panouVoluntariSterse} from the panel)` : ""}, ${x.paginiAnonimizate} pages and ${x.mesajeAnonimizate} messages anonymised, ${x.contacteMediaAnonimizate} media contacts anonymised, ${x.emailuriCiorneSterse} email drafts deleted, ${x.emailuriAnonimizate} sent emails anonymised (${x.raspunsuriAnonimizate} replies emptied), ${x.candidatiAnonimizati} Prospecting candidates anonymised, ${x.influenceriStersi} influencers deleted${x.adaugataLaSuprimare ? "; the address is on the \"do not contact\" list" : ""}.`,
    prospectareModul:
      "Looks up decision makers for your companies with your own keys at Lusha, Apollo, Prospeo and Hunter, and sends them to LinkedIn outreach through Waalaxy.",
    campuriModul: "Add your own fields to donors and companies (text, number, date, choice, yes/no), visible on their pages, in the export and in the API.",
    apiModul: "Connect Alexandrit to other tools: API keys for reading donors and donations, and webhooks for successful donations and unsubscribes.",
  },
} satisfies Record<Locale, unknown>;
