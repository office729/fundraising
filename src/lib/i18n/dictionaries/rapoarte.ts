import type { Locale } from "../config";

export const RAPOARTE_DICT = {
  ro: {
    title: "Rapoarte",
    subtitle: "Pregătite pentru consiliul director sau pentru sponsori",
    printeaza: "Printează / salvează PDF",
    reports: {
      campanie: { label: "Raport pe campanie", description: "Sumă strânsă și progres pe fiecare beneficiar activ." },
      sponsor: { label: "Raport pe sponsor", description: "Contribuția fiecărei companii, ordonată descrescător." },
      perioada: { label: "Raport pe perioadă", description: "Evoluția lunară a donațiilor pe ultimele 12 luni." },
    },
    campanie: {
      subtitle: (n: number) => `${n} beneficiari`,
      columns: { beneficiar: "Beneficiar", status: "Status", obiectiv: "Obiectiv", strans: "Strâns", progres: "Progres" },
    },
    sponsor: {
      subtitle: (total: string) => `Total contribuit: ${total}`,
      columns: { companie: "Companie", industrie: "Industrie", contribuit: "Contribuit" },
    },
    perioada: {
      subtitle: "Ultimele 12 luni",
      columns: { luna: "Lună", persoaneFizice: "Persoane fizice", companii: "Companii", recurente: "Recurente", total: "Total" },
    },
  },
  en: {
    title: "Reports",
    subtitle: "Ready for the board of directors or for sponsors",
    printeaza: "Print / save PDF",
    reports: {
      campanie: { label: "Campaign report", description: "Amount raised and progress for each active beneficiary." },
      sponsor: { label: "Sponsor report", description: "Each company's contribution, sorted in descending order." },
      perioada: { label: "Period report", description: "Monthly donation trend over the last 12 months." },
    },
    campanie: {
      subtitle: (n: number) => `${n} beneficiaries`,
      columns: { beneficiar: "Beneficiary", status: "Status", obiectiv: "Goal", strans: "Raised", progres: "Progress" },
    },
    sponsor: {
      subtitle: (total: string) => `Total contributed: ${total}`,
      columns: { companie: "Company", industrie: "Industry", contribuit: "Contributed" },
    },
    perioada: {
      subtitle: "Last 12 months",
      columns: { luna: "Month", persoaneFizice: "Individuals", companii: "Companies", recurente: "Recurring", total: "Total" },
    },
  },
} satisfies Record<Locale, unknown>;
