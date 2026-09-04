import type { Locale } from "../config";

export const FONDURI_PLATI_DICT = {
  ro: {
    statusLabel: { incasat: "Încasat", alocat: "Alocat", achitat: "Achitat", in_asteptare: "În așteptare" },
    title: "Fonduri și plăți",
    subtitle: (n: number) => `${n} alocări/plăți`,
    export: "Export",
    totalIncasat: "Total încasat",
    totalAlocat: "Total alocat",
    totalAchitat: "Total achitat",
    columns: { beneficiar: "Beneficiar", incasat: "Încasat", alocat: "Alocat", achitat: "Achitat", status: "Status", data: "Data" },
    toateStatusurile: "Toate statusurile",
    sidePanel: {
      subtitle: "Detalii alocare & plată",
      documentJustificativ: "Document justificativ",
      jurnalulModificarilor: "Jurnalul modificărilor",
      platMarcataAchitat: "Plată marcată achitat",
      sumaAlocataBeneficiarului: "Sumă alocată beneficiarului",
    },
  },
  en: {
    statusLabel: { incasat: "Received", alocat: "Allocated", achitat: "Paid", in_asteptare: "Pending" },
    title: "Funds & payments",
    subtitle: (n: number) => `${n} allocations/payments`,
    export: "Export",
    totalIncasat: "Total received",
    totalAlocat: "Total allocated",
    totalAchitat: "Total paid",
    columns: { beneficiar: "Beneficiary", incasat: "Received", alocat: "Allocated", achitat: "Paid", status: "Status", data: "Date" },
    toateStatusurile: "All statuses",
    sidePanel: {
      subtitle: "Allocation & payment details",
      documentJustificativ: "Supporting document",
      jurnalulModificarilor: "Change log",
      platMarcataAchitat: "Payment marked as paid",
      sumaAlocataBeneficiarului: "Amount allocated to beneficiary",
    },
  },
} satisfies Record<Locale, unknown>;
