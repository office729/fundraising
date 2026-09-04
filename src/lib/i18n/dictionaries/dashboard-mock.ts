import type { Locale } from "../config";

// Traduceri pentru etichetele STRUCTURALE ale datelor demonstrative de pe
// Acasă (etape pipeline, KPI-uri, priorități) — nu ating datele generate
// propriu-zise (nume de firme/persoane, titluri de task-uri), doar
// vocabularul de interfață din jurul lor.
export const DASHBOARD_MOCK_DICT = {
  ro: {
    etapaLabel: {
      nou: "Prospect identificat",
      pe_viitor: "Pe viitor",
      email: "Propunere pe email",
      mesaj: "Mesaj LinkedIn",
      onepager: "One-pager trimis",
      telefon: "Contactat telefonic",
      online: "Întâlnire one-to-one",
      contract_trimis: "Contract trimis",
      contract_semnat: "Contract semnat (D177/20%)",
      contract_asteptare: "Depus la ANAF",
      contract_anulat: "Contract anulat",
      sponsorizat: "Bani virați (sponsorizat)",
    } as Record<string, string>,
    prioritate: { mare: "mare", medie: "medie", mica: "mică" },
    perioadaImplicita: "ultimele 30 de zile",
    kpis: {
      donatiiLuna: "Donații luna aceasta",
      donatii: "Donații",
      sponsorizari: "Sponsorizări încasate",
      donatoriActivi: "Donatori activi",
      recurente: "Donații recurente",
      fonduri: "Fonduri disponibile",
      retentie: "Rata de retenție",
      explicatieDonatii: (p: string) => `Total donații (PF + PJ) primite în ${p}.`,
      explicatieSponsorizari: (p: string) => `Sumele confirmate de la companii în ${p}.`,
      explicatieDonatoriActivi: "Donatori cu cel puțin o contribuție în ultimele 6 luni.",
      explicatieRecurente: (p: string) => `Donații recurente primite în ${p}.`,
      explicatieFonduri: "Sume alocate de sponsori, încă necheltuite pe beneficiari.",
      explicatieRetentie: "Procentul donatorilor fideli sau recurenți din baza totală.",
    },
    actionCenter: {
      taskIntarziat: (titlu: string, nume: string) => `Task întârziat: ${titlu} — ${nume}`,
      contractExpira: (nume: string) => `Contract care expiră curând — ${nume}`,
      etapaFaraActivitate: (etapa: string, zile: number, nume: string) => `${etapa} de ${zile} zile, fără activitate — ${nume}`,
    },
  },
  en: {
    etapaLabel: {
      nou: "Prospect identified",
      pe_viitor: "For later",
      email: "Emailed proposal",
      mesaj: "LinkedIn message",
      onepager: "One-pager sent",
      telefon: "Contacted by phone",
      online: "One-to-one meeting",
      contract_trimis: "Contract sent",
      contract_semnat: "Contract signed (D177/20%)",
      contract_asteptare: "Filed with ANAF",
      contract_anulat: "Contract cancelled",
      sponsorizat: "Funds transferred (sponsored)",
    } as Record<string, string>,
    prioritate: { mare: "high", medie: "medium", mica: "low" },
    perioadaImplicita: "the last 30 days",
    kpis: {
      donatiiLuna: "Donations this month",
      donatii: "Donations",
      sponsorizari: "Sponsorships received",
      donatoriActivi: "Active donors",
      recurente: "Recurring donations",
      fonduri: "Funds available",
      retentie: "Retention rate",
      explicatieDonatii: (p: string) => `Total donations (individuals + companies) received in ${p}.`,
      explicatieSponsorizari: (p: string) => `Amounts confirmed from companies in ${p}.`,
      explicatieDonatoriActivi: "Donors with at least one contribution in the last 6 months.",
      explicatieRecurente: (p: string) => `Recurring donations received in ${p}.`,
      explicatieFonduri: "Amounts allocated by sponsors, not yet spent on beneficiaries.",
      explicatieRetentie: "Share of loyal or recurring donors in the total donor base.",
    },
    actionCenter: {
      taskIntarziat: (titlu: string, nume: string) => `Overdue task: ${titlu} — ${nume}`,
      contractExpira: (nume: string) => `Contract expiring soon — ${nume}`,
      etapaFaraActivitate: (etapa: string, zile: number, nume: string) => `${etapa} for ${zile} days, no activity — ${nume}`,
    },
  },
} satisfies Record<Locale, unknown>;
