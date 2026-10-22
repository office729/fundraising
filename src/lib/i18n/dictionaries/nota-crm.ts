import type { Locale } from "../config";

// Nota explicativă „Ce înseamnă CRM?”, pentru ONG-urile mici care nu cunosc termenul. O singură sursă de text: o folosesc și nota din
// aplicație (crm/components/nota-crm.tsx), și panoul de pe pagina publică ((marketing)/nota-crm-marketing.tsx).
export const NOTA_CRM_DICT = {
  ro: {
    titlu: "Ce înseamnă CRM?",
    intro:
      "CRM e un cuvânt din lumea afacerilor, dar ideea e simplă: este caietul digital în care ții evidența oamenilor și a firmelor cu care lucrezi, într-un singur loc, în loc de foi de Excel, agende și mesaje pierdute.",
    puncte: [
      { t: "Cine sunt", d: "Donatorii, sponsorii, voluntarii și datele lor de contact." },
      { t: "Ce s-a întâmplat", d: "Ce au donat, cu cine a vorbit echipa și când, ce ai notat despre ei." },
      { t: "Ce urmează", d: "La cine trebuie să revii, până când și cine se ocupă." },
    ],
    exempluTitlu: "Un exemplu",
    exemplu:
      "O firmă din orașul tău spune la telefon că vrea să te sprijine. O treci în CRM, notezi ce ați discutat și programezi un telefon peste o săptămână. Alexandrit îți amintește când vine ziua. Peste un an, oricine din echipă vede istoricul: ce a promis firma, ce documente ai trimis și ce sponsorizare a dat.",
    ascunde: "Am înțeles",
    arata: "Ce înseamnă CRM?",
  },
  en: {
    titlu: "What does CRM mean?",
    intro:
      "CRM is a business word, but the idea is simple: it is the digital notebook where you keep track of the people and companies you work with, in one place, instead of spreadsheets, notebooks and lost messages.",
    puncte: [
      { t: "Who they are", d: "Donors, sponsors, volunteers and their contact details." },
      { t: "What happened", d: "What they gave, who on the team spoke with them and when, what you noted about them." },
      { t: "What comes next", d: "Who you need to get back to, by when, and who is handling it." },
    ],
    exempluTitlu: "An example",
    exemplu:
      "A company in your town says over the phone that it wants to support you. You add it to the CRM, note what you discussed and schedule a call for next week. Alexandrit reminds you when the day comes. A year later, anyone on the team can see the history: what the company promised, which documents you sent and what sponsorship it gave.",
    ascunde: "Got it",
    arata: "What does CRM mean?",
  },
} as const satisfies Record<Locale, unknown>;
