import type { Locale } from "@/lib/i18n/config";

// Textele de interfață din datele demonstrative (titluri de taskuri, rezumate de comunicări, următoarea acțiune,
// proiecte). Datele rămân în română (sunt fixture-uri deterministe); cine le afișează în engleză trece textul prin
// `traduMock`. Numele fictive de persoane și firme nu se traduc.
const EN: Record<string, string> = {
  "Sună pentru follow-up": "Call for follow-up",
  "Trimite raport de impact": "Send impact report",
  "Programează întâlnire": "Schedule a meeting",
  "Trimite mulțumire personalizată": "Send a personalised thank-you",
  "Verifică documentele lipsă": "Check missing documents",
  "Reînnoiește contractul": "Renew the contract",
  "Trimite propunere de sponsorizare": "Send sponsorship proposal",
  "Follow-up telefonic": "Follow-up call",
  "Reînnoire contract": "Contract renewal",
  "Discuție despre oportunitatea de sponsorizare pentru trimestrul curent.": "Discussion about the sponsorship opportunity for the current quarter.",
  "Trimis raportul de impact pentru ultima campanie susținută.": "Impact report sent for the last supported campaign.",
  "Confirmare de participare la evenimentul de strângere de fonduri.": "Attendance confirmed for the fundraising event.",
  "Mulțumire pentru donația recentă și actualizare despre beneficiar.": "Thank-you for the recent donation and an update about the beneficiary.",
  "Follow-up după propunerea de parteneriat trimisă săptămâna trecută.": "Follow-up after the partnership proposal sent last week.",
  "Urgențe medicale": "Medical emergencies",
  "Copii cu boli rare": "Children with rare diseases",
  "Educație pentru toți": "Education for all",
  "Ajutor bătrâni singuri": "Help for elderly people living alone",
};

export function traduMock(text: string, locale: Locale): string {
  return locale === "en" ? (EN[text] ?? text) : text;
}
