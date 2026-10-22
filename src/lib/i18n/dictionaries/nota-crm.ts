import type { Locale } from "../config";

// Nota explicativă „Ce înseamnă CRM?”, pentru ONG-urile mici care nu cunosc termenul. O singură sursă de text: o folosesc și nota din
// aplicație (crm/components/nota-crm.tsx), și panoul de pe pagina publică ((marketing)/nota-crm-marketing.tsx).
// Tot ce e afirmat despre platformă în „partea tehnică” există în cod: fișe cu istoric și contacte, etape cu responsabil și termen de urmărire,
// filtre și segmente, date separate pe organizație (RLS), acces pe roluri, consimțământ înregistrat pe persoană de contact.
export const NOTA_CRM_DICT = {
  ro: {
    titlu: "Ce înseamnă CRM?",
    intro:
      "CRM înseamnă Customer Relationship Management, adică managementul relațiilor cu clienții. În fundraising, „clienții” sunt donatorii, sponsorii, voluntarii, beneficiarii și partenerii organizației.",
    cuvinteTitlu: "Cele trei cuvinte",
    cuvinte: [
      { termen: "Customer", sens: "client", d: "Persoana sau organizația cu care ai o relație: un donator, o firmă sponsor, un voluntar, un partener." },
      { termen: "Relationship", sens: "relație", d: "Tot ce s-a întâmplat între voi: donații, apeluri, e-mailuri, întâlniri, contracte, documente, notițe și acordul de a fi contactat." },
      { termen: "Management", sens: "gestionare", d: "Organizarea sistematică a relațiilor: cine răspunde de fiecare, în ce etapă e discuția, când e următorul pas și ce rezultate aduce." },
    ],
    tehnicTitlu: "Partea tehnică",
    tehnicIntro: "Un CRM este o bază de date centralizată, cu acces pe roluri, în care fiecare persoană sau firmă are o fișă:",
    tehnic: [
      "Fișă unică pentru fiecare persoană sau firmă, în locul fișierelor separate, cu contacte și istoric legate de ea.",
      "Pipeline: etapele prin care trece o relație (de exemplu contact, discuții, contract, încasat), cu responsabil și dată de urmărire.",
      "Filtre și segmente: județ, funcție, sumă sau etapă, iar cifrele din rapoarte se calculează direct din aceleași date, fără copiere între fișiere.",
      "Securitate: datele fiecărei organizații sunt separate de ale celorlalte, accesul se face pe roluri, iar consimțământul pentru contactare se înregistrează pe persoană.",
    ],
    exempluTitlu: "Exemplu",
    exemplu:
      "O firmă confirmă la telefon interesul pentru o sponsorizare. Fișa ei reține persoana de contact, discuția, etapa „Discuții” și data următorului apel. La scadență, platforma o afișează în lista de lucru, iar după semnarea contractului sponsorizarea apare în rapoarte.",
    ascunde: "Am înțeles",
    arata: "Ce înseamnă CRM?",
  },
  en: {
    titlu: "What does CRM mean?",
    intro:
      "CRM stands for Customer Relationship Management. In fundraising, the “customers” are the organization's donors, sponsors, volunteers, beneficiaries and partners.",
    cuvinteTitlu: "The three words",
    cuvinte: [
      { termen: "Customer", sens: "client", d: "The person or organization you have a relationship with: a donor, a sponsoring company, a volunteer, a partner." },
      { termen: "Relationship", sens: "relationship", d: "Everything that has happened between you: donations, calls, e-mails, meetings, contracts, documents, notes and consent to be contacted." },
      { termen: "Management", sens: "management", d: "Organizing relationships systematically: who is responsible for each, what stage the conversation is at, when the next step is and what results it brings." },
    ],
    tehnicTitlu: "The technical side",
    tehnicIntro: "A CRM is a centralized database with role-based access, where every person or company has a record:",
    tehnic: [
      "One record per person or company, instead of separate files, with contacts and history linked to it.",
      "Pipeline: the stages a relationship goes through (for example contact, discussions, contract, received), with an owner and a follow-up date.",
      "Filters and segments: county, role, amount or stage, and report figures are computed directly from the same data, with no copying between files.",
      "Security: each organization's data is kept separate from the others', access is role-based, and consent to be contacted is recorded per person.",
    ],
    exempluTitlu: "Example",
    exemplu:
      "A company confirms by phone that it is interested in a sponsorship. Its record keeps the contact person, the conversation, the “Discussions” stage and the date of the next call. When it falls due, the platform shows it in the work list, and once the contract is signed the sponsorship appears in the reports.",
    ascunde: "Got it",
    arata: "What does CRM mean?",
  },
} as const satisfies Record<Locale, unknown>;
