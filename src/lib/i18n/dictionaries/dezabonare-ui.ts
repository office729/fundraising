import type { Locale } from "../config";

// Paginile publice de dezabonare: /dezabonare (preferințe pentru mesajele organizațiilor) și /dezabonare-notificare (e-mailurile platformei).
// E-mailurile în sine rămân în română; aici sunt doar paginile deschise din link și mesajele acțiunilor lor.
export const DEZABONARE_UI_DICT = {
  ro: {
    donator: {
      metaTitlu: "Cât de des vrei mesaje",
      titlu: "Cât de des vrei să primești mesaje?",
      dejaDezabonat1: "Ești deja dezabonat de la mesajele organizației ",
      dejaDezabonat2: " și nu vei primi nimic. Dacă te răzgândești și vrei din nou mesaje, scrie organizației.",
      alege1: "Alege ce ți se potrivește pentru mesajele de la ",
      alege2: " (mulțumiri, vești, invitații, reamintirea Formularului 230, mesaje către voluntari).",
      linkInvalid: "Linkul e invalid sau incomplet.",
      finale: {
        deloc: "Te-ai dezabonat. Nu vei mai primi e-mailuri de la această organizație.",
        rara: "Am notat: vei primi mesaje mai rar, cel mult unul pe lună.",
        normala: "Am notat: vei primi mesaje ca până acum.",
      } as Record<string, string>,
      legenda: (org: string) => `Cât de des vrei să primești mesaje de la ${org}`,
      normalaTitlu: "Ca până acum.",
      normalaDesc: " Mesaje rare: mulțumiri, vești despre proiecte, o invitație din când în când.",
      rarTitlu: "Mai rar.",
      rarDesc: " Cel mult un mesaj pe lună.",
      delocTitlu: "Nu mai vreau deloc e-mailuri",
      delocDesc: (org: string) => ` de la ${org}.`,
      seProceseaza: "Se procesează...",
      salveaza: "Salvează alegerea",
      erori: {
        linkInvalid: "Link invalid sau expirat.",
        alegeVarianta: "Alege una dintre variante.",
        nuProcesat: "Nu am putut procesa cererea — încearcă din nou.",
      },
    },
    notificare: {
      metaTitlu: "Dezabonare e-mail",
      titluImplicit: "Dezabonare de la e-mail",
      linkInvalid: "Linkul de dezabonare e invalid sau incomplet.",
      tipuri: {
        "rezumat-calendar": { titlu: "Dezabonare de la rezumatul săptămânal", descriere: "Confirmă că nu mai vrei să primești în fiecare luni rezumatul calendarului de fundraising (termene și momente de campanie)." },
        "invitatie-feedback": { titlu: "Dezabonare de la invitațiile la chestionar", descriere: "Confirmă că nu mai vrei să primești invitații pe e-mail la chestionarul de satisfacție Alexandrit." },
      } as Record<string, { titlu: string; descriere: string }>,
      gata: "Gata, te-ai dezabonat. Nu vei mai primi acest e-mail. Te poți reabona oricând din „Contul meu”, din aplicație.",
      seProceseaza: "Se procesează...",
      confirma: "Confirmă dezabonarea",
      erori: {
        linkInvalid: "Link invalid sau expirat.",
        nuProcesat: "Nu am putut procesa cererea. Încearcă din nou.",
      },
    },
  },
  en: {
    donator: {
      metaTitlu: "How often you want messages",
      titlu: "How often would you like to receive messages?",
      dejaDezabonat1: "You are already unsubscribed from the messages of ",
      dejaDezabonat2: " and will not receive anything. If you change your mind and want messages again, write to the organization.",
      alege1: "Choose what suits you for the messages from ",
      alege2: " (thank-yous, news, invitations, Formular 230 reminders, messages to volunteers).",
      linkInvalid: "The link is invalid or incomplete.",
      finale: {
        deloc: "You have unsubscribed. You will no longer receive emails from this organization.",
        rara: "Noted: you will receive messages less often, at most one a month.",
        normala: "Noted: you will keep receiving messages as before.",
      } as Record<string, string>,
      legenda: (org: string) => `How often you want to receive messages from ${org}`,
      normalaTitlu: "As before.",
      normalaDesc: " Occasional messages: thank-yous, project news, an invitation from time to time.",
      rarTitlu: "Less often.",
      rarDesc: " At most one message a month.",
      delocTitlu: "I don't want any more emails",
      delocDesc: (org: string) => ` from ${org}.`,
      seProceseaza: "Processing...",
      salveaza: "Save my choice",
      erori: {
        linkInvalid: "The link is invalid or has expired.",
        alegeVarianta: "Choose one of the options.",
        nuProcesat: "We couldn't process the request — please try again.",
      },
    },
    notificare: {
      metaTitlu: "Email unsubscribe",
      titluImplicit: "Unsubscribe from emails",
      linkInvalid: "The unsubscribe link is invalid or incomplete.",
      tipuri: {
        "rezumat-calendar": { titlu: "Unsubscribe from the weekly summary", descriere: "Confirm that you no longer want to receive the fundraising calendar summary every Monday (deadlines and campaign moments)." },
        "invitatie-feedback": { titlu: "Unsubscribe from survey invitations", descriere: "Confirm that you no longer want to receive email invitations to the Alexandrit satisfaction survey." },
      } as Record<string, { titlu: string; descriere: string }>,
      gata: "Done, you have unsubscribed. You will no longer receive this email. You can resubscribe at any time from “My account”, in the app.",
      seProceseaza: "Processing...",
      confirma: "Confirm unsubscribe",
      erori: {
        linkInvalid: "The link is invalid or has expired.",
        nuProcesat: "We couldn't process the request. Please try again.",
      },
    },
  },
} satisfies Record<Locale, unknown>;
