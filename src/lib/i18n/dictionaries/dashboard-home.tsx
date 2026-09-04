import type { Locale } from "../config";

// Doar textul static al paginii principale a dashboard-ului (Acasă) — datele
// afișate (KPI-uri, centru de acțiuni, pipeline) vin din generatorul mock
// (./mock) care rămâne în română deocamdată; se traduce separat.
export const DASHBOARD_HOME_DICT = {
  ro: {
    greeting: { morning: "Bună dimineața", afternoon: "Bună ziua", evening: "Bună seara" },
    summary: (actiuni: number, blocate: number) => (
      <>
        Astăzi ai <strong className="text-[var(--ci-text)]">{actiuni} acțiuni importante</strong> și{" "}
        <strong className="text-[var(--ci-text)]">{blocate} companii blocate în pipeline</strong> care necesită
        follow-up.
      </>
    ),
    perioade: [
      { key: "toata", label: "Toată perioada" },
      { key: "saptamana", label: "Săptămâna aceasta" },
      { key: "luna", label: "Luna aceasta" },
      { key: "q1", label: "Q1" },
      { key: "q2", label: "Q2" },
      { key: "q3", label: "Q3" },
      { key: "q4", label: "Q4" },
      { key: "an", label: "Anul acesta" },
      { key: "personalizat", label: "Interval personalizat" },
    ],
    actionCenter: { title: "Centrul de acțiuni", subtitle: "Ce trebuie rezolvat înainte de orice altceva", resolve: "Rezolvă" },
    donationChart: {
      title: "Evoluția donațiilor",
      subtitle: "Ultimele 12 luni — persoane fizice, companii, recurente",
      pf: "Persoane fizice",
      pj: "Companii",
      recurent: "Recurente",
      anTrecut: "An anterior",
    },
    pipeline: { titlePrefix: "Pipeline D177 / 20%", inLucru: (n: number) => `${n} companii în lucru`, seeAll: "Vezi toate companiile" },
    proiecte: { title: "Proiecte active", subtitle: "Beneficiari cu strângere de fonduri în desfășurare", seeAll: "Vezi toate", urgenta: "Urgentă", activa: "Activă", zileActive: (n: number) => `${n} zile active`, din: "din" },
    team: { title: "Activitatea echipei", subtitle: "Ultimele 30 de zile", calls: "Apeluri (real, Twilio)", emails: "Emailuri", meetings: "Întâlniri", tasksDone: "Taskuri rezolvate" },
  },
  en: {
    greeting: { morning: "Good morning", afternoon: "Good afternoon", evening: "Good evening" },
    summary: (actiuni: number, blocate: number) => (
      <>
        Today you have <strong className="text-[var(--ci-text)]">{actiuni} important actions</strong> and{" "}
        <strong className="text-[var(--ci-text)]">{blocate} companies stuck in the pipeline</strong> that need
        follow-up.
      </>
    ),
    perioade: [
      { key: "toata", label: "All time" },
      { key: "saptamana", label: "This week" },
      { key: "luna", label: "This month" },
      { key: "q1", label: "Q1" },
      { key: "q2", label: "Q2" },
      { key: "q3", label: "Q3" },
      { key: "q4", label: "Q4" },
      { key: "an", label: "This year" },
      { key: "personalizat", label: "Custom range" },
    ],
    actionCenter: { title: "Action center", subtitle: "What needs to be resolved before anything else", resolve: "Resolve" },
    donationChart: {
      title: "Donation trend",
      subtitle: "Last 12 months — individuals, companies, recurring",
      pf: "Individuals",
      pj: "Companies",
      recurent: "Recurring",
      anTrecut: "Previous year",
    },
    pipeline: { titlePrefix: "D177 / 20% pipeline", inLucru: (n: number) => `${n} companies in progress`, seeAll: "See all companies" },
    proiecte: { title: "Active projects", subtitle: "Beneficiaries with fundraising in progress", seeAll: "See all", urgenta: "Urgent", activa: "Active", zileActive: (n: number) => `${n} days active`, din: "of" },
    team: { title: "Team activity", subtitle: "Last 30 days", calls: "Calls (live, Twilio)", emails: "Emails", meetings: "Meetings", tasksDone: "Tasks completed" },
  },
} satisfies Record<Locale, unknown>;

export type DashboardHomeDict = (typeof DASHBOARD_HOME_DICT)["ro"];
