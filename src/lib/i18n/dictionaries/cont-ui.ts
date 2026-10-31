import type { Locale } from "../config";

// Pagina „Contul meu” (/cont): notificări pe e-mail și ștergerea contului, plus mesajele întoarse de acțiunile ei.
export const CONT_UI_DICT = {
  ro: {
    metaTitlu: "Contul meu",
    inapoiApp: "Înapoi în aplicație",
    inapoiSite: "Înapoi la site",
    titlu: "Contul meu",
    emailuri: "E-mailuri de la Alexandrit",
    rezumat: {
      titlu: "Rezumatul săptămânal al calendarului",
      descriere: "În fiecare luni: termenele din săptămână și momentele bune de campanie. Îl primești ca proprietar al unei organizații cu calendarul inclus.",
    },
    sterge: {
      titlu: "Șterge-mi contul",
      puncte: [
        "Numele și adresa ta de email sunt eliminate din platformă, iar contul de autentificare se șterge definitiv.",
        "Ieși din toate organizațiile din care faceai parte; datele organizațiilor (donatori, companii, campanii) rămân la ele.",
        "Dacă ești singurul owner al unei organizații, trebuie întâi să predai rolul sau să ștergi organizația.",
        "Istoricul acțiunilor (de exemplu cine a creat o înregistrare) rămâne, dar fără numele sau emailul tău.",
        "Nu se poate anula.",
      ],
      confirmare: (email: string) => `Pentru confirmare, scrie adresa de email a contului (${email})`,
      seSterge: "Se șterge…",
      buton: "Șterge definitiv contul meu",
    },
    erori: {
      tipNecunoscut: "Tip de notificare necunoscut.",
      contNegasit: "Contul nu a fost găsit.",
      nuSalvat: "Nu am putut salva alegerea. Încearcă din nou.",
      confirmareGresita: "Scrie exact adresa de email a contului pentru a confirma ștergerea.",
      unicOwner: "Ești singurul owner al uneia sau mai multor organizații. Predă rolul de owner altcuiva sau șterge organizația (Setări → Date și ștergerea organizației), apoi încearcă din nou.",
      nuSters: "Nu am putut șterge contul. Încearcă din nou sau scrie-ne la vlad.placinta@alexandrit.ro.",
    },
  },
  en: {
    metaTitlu: "My account",
    inapoiApp: "Back to the app",
    inapoiSite: "Back to the website",
    titlu: "My account",
    emailuri: "Emails from Alexandrit",
    rezumat: {
      titlu: "Weekly calendar summary",
      descriere: "Every Monday: the week's deadlines and good moments for campaigns. You receive it as the owner of an organization with the calendar included.",
    },
    sterge: {
      titlu: "Delete my account",
      puncte: [
        "Your name and email address are removed from the platform, and the sign-in account is permanently deleted.",
        "You leave all the organizations you belonged to; the organizations' data (donors, companies, campaigns) stays with them.",
        "If you are the only owner of an organization, you must first hand over the role or delete the organization.",
        "The action history (for example who created a record) remains, but without your name or email.",
        "This cannot be undone.",
      ],
      confirmare: (email: string) => `To confirm, type the account's email address (${email})`,
      seSterge: "Deleting…",
      buton: "Permanently delete my account",
    },
    erori: {
      tipNecunoscut: "Unknown notification type.",
      contNegasit: "Account not found.",
      nuSalvat: "We couldn't save your choice. Please try again.",
      confirmareGresita: "Type the account's email address exactly to confirm the deletion.",
      unicOwner: "You are the only owner of one or more organizations. Hand the owner role over to someone else or delete the organization (Settings → Data and organization deletion), then try again.",
      nuSters: "We couldn't delete the account. Try again or write to us at vlad.placinta@alexandrit.ro.",
    },
  },
} satisfies Record<Locale, unknown>;
