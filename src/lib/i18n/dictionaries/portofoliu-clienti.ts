import type { Locale } from "../config";

export const PORTOFOLIU_CLIENTI_DICT = {
  ro: {
    breadcrumbHub: "Hub Fundraising",
    breadcrumb: "Portofoliu Clienți",
    eyebrow: "Portofoliu clienți",
    titlu: "ONG-uri și companii care folosesc instrumentele Hub Fundraising",
    subtitlu: "De la CRM la website-uri de fundraising, organizațiile de mai jos au ales instrumentele din Hub pentru a-și profesionaliza activitatea de strângere de fonduri.",
    clienti: [
      { nume: "Asociația Salvează o Inimă", instrumente: ["Website Fundraising", "CRM Persoane Fizice"], desc: "Website nou de campanii și CRM pentru gestiunea donatorilor individuali." },
      { nume: "Asociația HAPPY", instrumente: ["CRM Persoane Juridice"], desc: "Gestiune structurată a companiilor partenere și a contractelor de sponsorizare." },
      { nume: "Asociația Nectarios", instrumente: ["One Pager Companii", "Raport de Activitate"], desc: "Materiale profesionale pentru atragerea de noi sponsori corporate." },
      { nume: "A.P.C.A Botoșani", instrumente: ["Newsletter Persoane Fizice"], desc: "Comunicare periodică, structurată, cu baza de donatori individuali." },
      { nume: "Asociația ANAID", instrumente: ["Avatar Donator"], desc: "Profil clar al donatorului ideal, folosit în toate campaniile ulterioare." },
      { nume: "Centrele ROUA", instrumente: ["Generator Program Echipă"], desc: "Organizare mai bună a echipei și a calendarului de campanii." },
    ],
    bandaTitlu: "Vrei ONG-ul tău în acest portofoliu?",
    bandaCta: "Vezi instrumentele Hub →",
  },
  en: {
    breadcrumbHub: "Fundraising Hub",
    breadcrumb: "Client Portfolio",
    eyebrow: "Client portfolio",
    titlu: "NGOs and companies using the Fundraising Hub tools",
    subtitlu: "From CRM to fundraising websites, the organizations below chose the Hub tools to professionalize their fundraising activity.",
    clienti: [
      { nume: "Asociația Salvează o Inimă", instrumente: ["Fundraising Website", "Individual Donor CRM"], desc: "New campaign website and CRM for managing individual donors." },
      { nume: "Asociația HAPPY", instrumente: ["Company CRM"], desc: "Structured management of partner companies and sponsorship contracts." },
      { nume: "Asociația Nectarios", instrumente: ["Company One Pager", "Activity Report"], desc: "Professional materials for attracting new corporate sponsors." },
      { nume: "A.P.C.A Botoșani", instrumente: ["Individual Newsletter"], desc: "Regular, structured communication with the individual donor base." },
      { nume: "Asociația ANAID", instrumente: ["Donor Persona"], desc: "A clear profile of the ideal donor, used in all subsequent campaigns." },
      { nume: "Centrele ROUA", instrumente: ["Team Schedule Generator"], desc: "Better organization of the team and the campaign calendar." },
    ],
    bandaTitlu: "Want your NGO in this portfolio?",
    bandaCta: "See the Hub tools →",
  },
} satisfies Record<Locale, unknown>;
