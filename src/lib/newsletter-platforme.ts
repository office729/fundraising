// Platforme de trimis newslettere, pentru ghidul din paginile de newsletter. Prețurile se schimbă des: ce apare aici e orientativ,
// verificat în octombrie 2026 (pagina oficială a furnizorului unde s-a putut, altfel articole comparative) și se confirmă la furnizor înainte de plată.

export const VERIFICAT_LA = "octombrie 2026";

export type Volum = "s0" | "s1" | "s2" | "s3";

export const VOLUME: { id: Volum; eticheta: string; buget: string; sfat: string }[] = [
  { id: "s0", eticheta: "Sub 500", buget: "0 – 10 €/lună", sfat: "Începe gratuit: planurile fără plată acoperă liste mici, iar costul real e timpul, nu banii. Importă lista din CSV și testează două sau trei platforme înainte de a alege." },
  { id: "s1", eticheta: "500 – 2.500", buget: "10 – 35 €/lună", sfat: "Un plan plătit mic scoate sigla platformei din emailuri și deblochează automatizările (mesaj de bun venit, mulțumire după donație). Cere reducerea pentru ONG înainte de prima plată." },
  { id: "s2", eticheta: "2.500 – 10.000", buget: "30 – 150 €/lună", sfat: "Aici contează modelul de preț: dacă plătești pe abonat, curăță lista de inactivi; dacă plătești pe emailuri trimise, ai avantaj când trimiți rar. Compară costul real pentru numărul tău de abonați, nu prețul „de la”." },
  { id: "s3", eticheta: "Peste 10.000", buget: "de la ~100 € în sus", sfat: "Cere ofertă și reducerea pentru ONG, pentru că la acest volum prețurile se negociază. Alege modelul pe volum de emailuri dacă trimiți rar și urmărește deliverability-ul (să ajungă în inbox, nu în spam)." },
];

export type Platforma = {
  id: string;
  nume: string;
  domeniu: string; // pentru logo
  url: string;
  origine: "ro" | "intl";
  descriere: string;
  gratuit: string;
  deLa: string;
  model: "abonați" | "emailuri trimise" | "abonați și emailuri";
  ong: string | null;
  potrivit: string;
  volume: Volum[];
};

export const PLATFORME: Platforma[] = [
  {
    id: "sendmachine",
    nume: "Sendmachine",
    domeniu: "sendmachine.com",
    url: "https://www.sendmachine.com/",
    origine: "ro",
    descriere: "Platformă românească de email și SMS marketing, cu editor drag & drop și automatizări.",
    gratuit: "15.000 de emailuri pe lună, în primele luni (conform site-ului)",
    deLa: "de la ~8,90 €/lună (sursă terță)",
    model: "emailuri trimise",
    ong: "20% reducere pentru ONG, conform site-ului",
    potrivit: "Liste mici și medii, dacă preferi un furnizor din România.",
    volume: ["s0", "s1", "s2"],
  },
  {
    id: "newsman",
    nume: "NewsMan",
    domeniu: "newsman.app",
    url: "https://www.newsman.app/",
    origine: "ro",
    descriere: "Una dintre cele mai cunoscute platforme românești de email marketing și automatizări, cu SMS și plată și prin credite.",
    gratuit: "Plan gratuit limitat (într-un test mai vechi: 1.000 de abonați, 5.000 de emailuri)",
    deLa: "de la ~5 € (test mai vechi, verifică)",
    model: "abonați și emailuri",
    ong: "Întreabă echipa de vânzări",
    potrivit: "Liste mici și medii, cu suport în română și integrări cu magazine online românești.",
    volume: ["s0", "s1", "s2"],
  },
  {
    id: "brevo",
    nume: "Brevo",
    domeniu: "brevo.com",
    url: "https://www.brevo.com/",
    origine: "intl",
    descriere: "Fost Sendinblue (Franța). Contacte nelimitate în planul gratuit, iar prețul depinde de câte emailuri trimiți. Are automatizări, SMS și un CRM simplu.",
    gratuit: "300 de emailuri pe zi, contacte nelimitate",
    deLa: "de la ~9 $/lună pentru 5.000 de emailuri (surse terțe)",
    model: "emailuri trimise",
    ong: "Reducere posibilă (se vorbește de 15%, condițiile diferă): cere la vânzări",
    potrivit: "Liste mari care trimit rar: plătești pe emailuri, nu pe abonat.",
    volume: ["s0", "s1", "s2", "s3"],
  },
  {
    id: "mailerlite",
    nume: "MailerLite",
    domeniu: "mailerlite.com",
    url: "https://www.mailerlite.com/",
    origine: "intl",
    descriere: "Editor simplu și curat, bun pentru începători. Formularele de înscriere și automatizările de bază sunt incluse.",
    gratuit: "250 de abonați, 2.500 de emailuri pe lună",
    deLa: "de la 12 $/lună (Comfort) și 25 $/lună (Power)",
    model: "abonați",
    ong: "30% reducere, cu dovada statutului, cerută înainte de cumpărare",
    potrivit: "Echipe mici fără specialist în marketing, cu listă sub 10.000.",
    volume: ["s0", "s1", "s2"],
  },
  {
    id: "mailchimp",
    nume: "Mailchimp",
    domeniu: "mailchimp.com",
    url: "https://mailchimp.com/",
    origine: "intl",
    descriere: "Cel mai cunoscut: multe șabloane și integrări. Se scumpește repede pe măsură ce lista crește.",
    gratuit: "250 de contacte, 500 de trimiteri pe lună",
    deLa: "de la 11,70 € (Essentials) și 17,99 € (Standard), la 500 de contacte",
    model: "abonați",
    ong: "15% reducere, cerută înainte de trecerea pe plan plătit",
    potrivit: "Dacă echipa îl folosește deja sau ai nevoie de integrări multe.",
    volume: ["s1", "s2", "s3"],
  },
  {
    id: "sendpulse",
    nume: "SendPulse",
    domeniu: "sendpulse.com",
    url: "https://sendpulse.com/",
    origine: "intl",
    descriere: "Email, SMS, chatbot și notificări web într-un singur loc, cu plan gratuit generos.",
    gratuit: "500 de abonați, 15.000 de emailuri pe lună",
    deLa: "de la 9,60 $/lună la 500 de abonați (plată anuală)",
    model: "abonați și emailuri",
    ong: "Întreabă suportul",
    potrivit: "Buget mic și nevoie de mai multe canale (email plus SMS sau mesagerie).",
    volume: ["s0", "s1", "s2"],
  },
  {
    id: "mailjet",
    nume: "Mailjet",
    domeniu: "mailjet.com",
    url: "https://www.mailjet.com/",
    origine: "intl",
    descriere: "Platformă europeană (Franța), cu editor colaborativ și trimitere tranzacțională (confirmări, chitanțe).",
    gratuit: "Plan gratuit, cu plafon zilnic de trimiteri",
    deLa: "vezi pagina de prețuri",
    model: "emailuri trimise",
    ong: "20% reducere pentru ONG (documentația oficială), nu pe plan anual",
    potrivit: "Liste mici și echipe care trimit și emailuri automate de la site.",
    volume: ["s0", "s1"],
  },
  {
    id: "kit",
    nume: "Kit (ConvertKit)",
    domeniu: "kit.com",
    url: "https://kit.com/",
    origine: "intl",
    descriere: "Gândit pentru creatori: secvențe de emailuri, formulare și pagini de înscriere. Bun când newsletterul e canalul principal.",
    gratuit: "Până la 10.000 de abonați, cu limite la automatizări și cu sigla Kit în emailuri",
    deLa: "de la 39 $/lună la 1.000 de abonați (Creator)",
    model: "abonați",
    ong: null,
    potrivit: "Liste mari, dar cu nevoi simple, cât timp rămâi pe planul gratuit.",
    volume: ["s0", "s1", "s2"],
  },
  {
    id: "activecampaign",
    nume: "ActiveCampaign",
    domeniu: "activecampaign.com",
    url: "https://www.activecampaign.com/",
    origine: "intl",
    descriere: "Automatizări avansate și CRM, pentru parcursuri complexe ale donatorului (bun venit, a doua donație, reactivare).",
    gratuit: "Doar perioadă de probă",
    deLa: "de la ~15 $/lună la 1.000 de contacte (ghid românesc, verifică)",
    model: "abonați",
    ong: "Întreabă echipa de vânzări",
    potrivit: "Când ai o persoană care construiește fluxuri automate și vrei segmentare fină.",
    volume: ["s2", "s3"],
  },
  {
    id: "beehiiv",
    nume: "beehiiv",
    domeniu: "beehiiv.com",
    url: "https://www.beehiiv.com/",
    origine: "intl",
    descriere: "Platformă pentru newslettere editoriale, cu creștere prin recomandări. Planurile plătite s-au restructurat în octombrie 2026.",
    gratuit: "Până la 2.500 de abonați",
    deLa: "verifică pagina de prețuri (s-au schimbat în octombrie 2026)",
    model: "abonați",
    ong: null,
    potrivit: "Newsletter ca publicație (povești, articole), nu doar campanii de donații.",
    volume: ["s0", "s1", "s2"],
  },
  {
    id: "substack",
    nume: "Substack",
    domeniu: "substack.com",
    url: "https://substack.com/",
    origine: "intl",
    descriere: "Scrii și publici simplu, cu arhivă publică. Gratuit; comision de 10% doar dacă vinzi abonamente plătite.",
    gratuit: "Gratuit pentru publicare",
    deLa: "10% din abonamentele plătite (dacă vinzi)",
    model: "abonați",
    ong: null,
    potrivit: "Newslettere narative, fără design de brand sau segmentare avansată.",
    volume: ["s0", "s1"],
  },
];
