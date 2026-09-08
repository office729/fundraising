import type { Locale } from "../config";

export const GDPR_DICT = {
  ro: {
    homeLabel: "Acasă",
    eyebrow: "Legal",
    titlu: "Politica de confidențialitate (GDPR)",
    actualizatLabel: "Ultima actualizare",
    actualizat: "[DE COMPLETAT — data publicării]",
    s1: {
      titlu: "1. Operator de date",
      text: "Operator: [DE COMPLETAT — denumirea legală a entității], sediu [DE COMPLETAT], CUI/CIF [DE COMPLETAT], contact: vlad.placinta@fundrasingacademy.ro.",
    },
    s2: {
      titlu: "2. Ce date colectăm",
      intro: "Pe site și în platformă putem colecta:",
      items: [
        "Date de cont: nume, email, parolă (stocată criptat prin furnizorul de autentificare).",
        "Date de contact trimise prin formulare sau email (nume, telefon, mesaj).",
        "Date introduse voluntar de client în CRM-ul propriu din Hub Fundraising (donatori, companii, contracte) — acestea aparțin organizației client, nu Fundraising Academy; sunt izolate per organizație.",
        "Date tehnice minime (cookie-uri de sesiune) — vezi Politica de cookies.",
      ],
    },
    s3: {
      titlu: "3. Scopul prelucrării",
      text: "Furnizarea serviciilor solicitate (cont, abonament, consiliere), comunicare cu clientul, facturare și îndeplinirea obligațiilor legale (contabile, fiscale).",
    },
    s4: {
      titlu: "4. Temeiul legal",
      text: "Executarea contractului (art. 6(1)(b) GDPR) pentru furnizarea serviciilor; consimțământul (art. 6(1)(a)) pentru comunicări opționale; interesul legitim (art. 6(1)(f)) pentru securitate și îmbunătățirea serviciului; obligația legală (art. 6(1)(c)) pentru evidențe contabile/fiscale.",
    },
    s5: {
      titlu: "5. Cât timp păstrăm datele",
      text: "[DE COMPLETAT — perioade concrete de retenție: date de cont pe durata abonamentului + termenul legal ulterior; documente fiscale conform legislației contabile din România (de regulă minimum 10 ani).]",
    },
    s6: {
      titlu: "6. Drepturile persoanelor vizate",
      text1: "Conform GDPR, ai dreptul de acces, rectificare, ștergere, restricționare a prelucrării, portabilitate a datelor, opoziție și de a depune plângere la Autoritatea Națională de Supraveghere a Prelucrării Datelor cu Caracter Personal (ANSPDCP).",
      text2Before: "Pentru exercitarea oricărui drept:",
    },
    s7: {
      titlu: "7. Sub-procesatori și găzduire",
      text: "[DE COMPLETAT — lista furnizorilor tehnici implicați: găzduire aplicație (Vercel), bază de date/autentificare (Supabase), procesator de plăți, orice serviciu de email/SMS folosit — cu mențiunea țării/regiunii unde sunt găzduite datele.]",
    },
    s8: {
      titlu: "8. Datele din CRM-ul clienților (organizații ONG)",
      text: "Pentru organizațiile care folosesc Hub Fundraising, Fundraising Academy acționează ca persoană împuternicită (procesator) pentru datele donatorilor/companiilor introduse de organizație în propriul CRM — organizația rămâne operator pentru acele date. [DE COMPLETAT — dacă e cazul, un Acord de Prelucrare a Datelor (DPA) separat, semnat cu fiecare organizație client.]",
    },
  },
  en: {
    homeLabel: "Home",
    eyebrow: "Legal",
    titlu: "Privacy Policy (GDPR)",
    actualizatLabel: "Last updated",
    actualizat: "[TO COMPLETE — publication date]",
    s1: {
      titlu: "1. Data controller",
      text: "Controller: [TO COMPLETE — legal entity name], registered office [TO COMPLETE], Tax ID [TO COMPLETE], contact: vlad.placinta@fundrasingacademy.ro.",
    },
    s2: {
      titlu: "2. What data we collect",
      intro: "On the site and in the platform we may collect:",
      items: [
        "Account data: name, email, password (stored encrypted by the authentication provider).",
        "Contact data submitted via forms or email (name, phone, message).",
        "Data voluntarily entered by the client into their own CRM within Fundraising Hub (donors, companies, contracts) — this belongs to the client organization, not Fundraising Academy; it is isolated per organization.",
        "Minimal technical data (session cookies) — see the Cookie Policy.",
      ],
    },
    s3: {
      titlu: "3. Purpose of processing",
      text: "Providing the requested services (account, subscription, consulting), communicating with the client, invoicing, and fulfilling legal obligations (accounting, tax).",
    },
    s4: {
      titlu: "4. Legal basis",
      text: "Performance of a contract (GDPR art. 6(1)(b)) for providing the services; consent (art. 6(1)(a)) for optional communications; legitimate interest (art. 6(1)(f)) for security and service improvement; legal obligation (art. 6(1)(c)) for accounting/tax records.",
    },
    s5: {
      titlu: "5. How long we keep data",
      text: "[TO COMPLETE — concrete retention periods: account data for the subscription's duration plus the subsequent legal term; tax documents per Romanian accounting legislation (generally a minimum of 10 years).]",
    },
    s6: {
      titlu: "6. Data subject rights",
      text1: "Under GDPR, you have the right to access, rectify, erase, restrict processing, port your data, object, and file a complaint with Romania's National Supervisory Authority for Personal Data Processing (ANSPDCP).",
      text2Before: "To exercise any right:",
    },
    s7: {
      titlu: "7. Sub-processors and hosting",
      text: "[TO COMPLETE — list of technical providers involved: application hosting (Vercel), database/authentication (Supabase), payment processor, any email/SMS service used — noting the country/region where the data is hosted.]",
    },
    s8: {
      titlu: "8. Data in client CRMs (NGO organizations)",
      text: "For organizations using Fundraising Hub, Fundraising Academy acts as a data processor for the donor/company data entered by the organization into its own CRM — the organization remains the controller for that data. [TO COMPLETE — if applicable, a separate Data Processing Agreement (DPA) signed with each client organization.]",
    },
  },
} satisfies Record<Locale, unknown>;
