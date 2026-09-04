import type { Locale } from "../config";

export const DONATORI_LIST_DICT = {
  ro: {
    segment: { nou: "Nou", fidel: "Fidel", major: "Major", recurent: "Recurent", in_risc: "În risc", inactiv: "Inactiv", reactivat: "Reactivat" } as Record<string, string>,
    chip: {
      toti: "Toți", recurenti: "Recurenți", unica: "O singură donație", top: "Top donatori", cutelefon: "Cu telefon",
      desunat: "De sunat", sunati: "Sunați", multumiti: "Mulțumiți", lunari: "Donatori lunari", candidati: "Candidați lunar",
      winback: "Win-back", consimt: "Consimțământ", faraconsimt: "Fără consimțământ", noi: "Noi", activi: "Activi", dormanti: "Dormanți",
    } as Record<string, string>,
    localOnly: "Urmărire locală — doar în acest browser",
    header: { title: "Persoane fizice", subtitle: (afisati: number, total: number) => `${afisati} donatori afișați (din ${total} total)` },
    stats: { donatori: "Donatori", donatii: "Donații", totalDonat: "Total donat", recurenti: "Recurenți", medie: "Medie" },
    search: "Caută după nume…",
    filters: "Filtre",
    resetFilters: "Resetează filtrele",
    columns: { nume: "Nume", segment: "Segment", scor: "Scor implicare", totalDonat: "Total donat", ultimaDonatie: "Ultima donație", responsabil: "Responsabil", localitate: "Localitate", apel: "Apel" },
    call: {
      multumit: "Mulțumit", sunat: "Sunat", deSunat: "De sunat",
      titleMultumit: "Mulțumit — clic pentru a reseta",
      titleSunat: "Sunat — clic pentru a marca Mulțumit",
      titleDeSunat: "Clic pentru a marca Sunat",
    },
    empty: { title: "Niciun donator găsit", description: "Încearcă alți termeni de căutare sau alt segment." },
  },
  en: {
    segment: { nou: "New", fidel: "Loyal", major: "Major", recurent: "Recurring", in_risc: "At risk", inactiv: "Inactive", reactivat: "Reactivated" } as Record<string, string>,
    chip: {
      toti: "All", recurenti: "Recurring", unica: "One-time donation", top: "Top donors", cutelefon: "With phone",
      desunat: "To call", sunati: "Called", multumiti: "Thanked", lunari: "Monthly donors", candidati: "Monthly candidates",
      winback: "Win-back", consimt: "Consented", faraconsimt: "No consent", noi: "New", activi: "Active", dormanti: "Dormant",
    } as Record<string, string>,
    localOnly: "Local tracking — this browser only",
    header: { title: "Individuals", subtitle: (afisati: number, total: number) => `${afisati} donors shown (of ${total} total)` },
    stats: { donatori: "Donors", donatii: "Donations", totalDonat: "Total donated", recurenti: "Recurring", medie: "Average" },
    search: "Search by name…",
    filters: "Filters",
    resetFilters: "Reset filters",
    columns: { nume: "Name", segment: "Segment", scor: "Engagement score", totalDonat: "Total donated", ultimaDonatie: "Last donation", responsabil: "Owner", localitate: "Location", apel: "Call" },
    call: {
      multumit: "Thanked", sunat: "Called", deSunat: "To call",
      titleMultumit: "Thanked — click to reset",
      titleSunat: "Called — click to mark Thanked",
      titleDeSunat: "Click to mark Called",
    },
    empty: { title: "No donor found", description: "Try different search terms or another segment." },
  },
} satisfies Record<Locale, unknown>;
