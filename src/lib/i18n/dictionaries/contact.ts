import type { Locale } from "../config";

export const CONTACT_DICT = {
  ro: {
    homeLabel: "Acasă",
    breadcrumb: "Contact",
    eyebrow: "Contact",
    titlu: "Hai să vorbim",
    subtitlu: "Pentru consiliere și programări, scrie-i direct lui Vlad. Pentru probleme tehnice ale platformei, contactează-l pe Andrei.",
    persoane: [
      { nume: "Vlad Plăcintă", rol: "Consiliere", email: "vlad.placinta@alexandrit.ro", telefon: "0757 401 042", tel: "0757401042" },
      { nume: "Andrei Plăcintă", rol: "Suport tehnic", email: "andrei.placinta@alexandrit.ro", telefon: "0721 425 650", tel: "0721425650" },
    ],
    emailLabel: "Email",
    telefonLabel: "Telefon",
    bandaTitlu: "Preferi să alegi direct un interval liber?",
    bandaCta: "Programează o consiliere 1 la 1",
  },
  en: {
    homeLabel: "Home",
    breadcrumb: "Contact",
    eyebrow: "Contact",
    titlu: "Let's talk",
    subtitlu: "For consulting and bookings, write directly to Vlad. For technical issues with the platform, contact Andrei.",
    persoane: [
      { nume: "Vlad Plăcintă", rol: "Consulting", email: "vlad.placinta@alexandrit.ro", telefon: "0757 401 042", tel: "0757401042" },
      { nume: "Andrei Plăcintă", rol: "Technical support", email: "andrei.placinta@alexandrit.ro", telefon: "0721 425 650", tel: "0721425650" },
    ],
    emailLabel: "Email",
    telefonLabel: "Phone",
    bandaTitlu: "Prefer to pick a free slot yourself?",
    bandaCta: "Book a 1-on-1 consultation",
  },
} satisfies Record<Locale, unknown>;
