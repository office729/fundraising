import type { Locale } from "../config";

export const DONATII_DICT = {
  ro: {
    luni: ["Ianuarie", "Februarie", "Martie", "Aprilie", "Mai", "Iunie", "Iulie", "August", "Septembrie", "Octombrie", "Noiembrie", "Decembrie"],
    title: "Donații",
    subtitle: (n: number) => `${n} tranzacții`,
    totalRon: "Total RON:",
    columns: { sursa: "Sursă", tip: "Tip", campanie: "Campanie", suma: "Sumă", recurenta: "Recurentă", data: "Data" },
    recurentaBadge: "recurentă",
    sursaTip: { donator: "donator", companie: "companie" },
    filters: {
      toateSursele: "Toate sursele",
      persoaneFizice: "Persoane fizice",
      companii: "Companii",
      toateMonedele: "Toate monedele",
      toateLunile: "Toate lunile",
      toiAnii: "Toți anii",
      toiResponsabilii: "Toți responsabilii",
    },
  },
  en: {
    luni: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
    title: "Donations",
    subtitle: (n: number) => `${n} transactions`,
    totalRon: "Total RON:",
    columns: { sursa: "Source", tip: "Type", campanie: "Campaign", suma: "Amount", recurenta: "Recurring", data: "Date" },
    recurentaBadge: "recurring",
    sursaTip: { donator: "individual", companie: "company" },
    filters: {
      toateSursele: "All sources",
      persoaneFizice: "Individuals",
      companii: "Companies",
      toateMonedele: "All currencies",
      toateLunile: "All months",
      toiAnii: "All years",
      toiResponsabilii: "All owners",
    },
  },
} satisfies Record<Locale, unknown>;
