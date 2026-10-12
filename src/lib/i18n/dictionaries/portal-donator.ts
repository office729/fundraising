import type { Locale } from "../config";

// Portalul donatorului lunar: pagina unde își cere linkul, pagina unde își gestionează donația și emailurile aferente.
export const PORTAL_DONATOR_DICT = {
  ro: {
    cere: {
      titlu: "Donația ta lunară",
      intro: "Scrie adresa de e-mail folosită la donație. Dacă avem o donație lunară pe ea, îți trimitem un link prin care o poți gestiona: schimbi suma, o pui pe pauză, o oprești sau îți actualizezi cardul.",
      emailEticheta: "Adresa de e-mail",
      buton: "Trimite-mi linkul",
      seTrimite: "Se trimite…",
      trimis: "Dacă există o donație lunară pentru această adresă, ți-am trimis un e-mail cu linkul. Verifică și folderul Spam. Linkul e valabil o oră.",
      emailInvalid: "Scrie o adresă de e-mail validă.",
      preaMulte: "Prea multe încercări. Încearcă din nou peste câteva minute.",
      indisponibil: "Gestionarea online a donațiilor lunare nu este disponibilă pentru această organizație. Scrie-ne și te ajutăm.",
      inapoi: (org: string) => `← Înapoi la campaniile ${org}`,
    },
    gestioneaza: {
      titlu: (org: string) => `Donațiile tale lunare către ${org}`,
      intro: "Aici poți schimba suma, pune donația pe pauză, o poți opri sau poți actualiza cardul. Organizația este înștiințată când faci o modificare.",
      expirat: "Linkul nu mai este valabil. Cere unul nou, e valabil o oră.",
      cereNou: "Cere un link nou",
      niciunul: "Nu am găsit donații lunare pentru această adresă.",
      stari: { activ: "Activă", pauza: "În pauză", oprit: "Oprită" },
      pePerLuna: "/ lună",
      urmatoarea: (data: string) => `Următoarea plată: ${data}`,
      inPauza: "Nu se încasează nimic cât timp donația e în pauză.",
      schimbaSuma: "Schimbă suma",
      sumaNoua: "Suma nouă (lei)",
      salveaza: "Salvează",
      renunta: "Renunță",
      pauza: "Pune pe pauză",
      reia: "Reia donația",
      opreste: "Oprește donația",
      confirmaOprire: "Sigur oprești donația lunară? Nu se mai încasează nimic de la următoarea lună.",
      daOprest: "Da, oprește",
      actualizeazaCard: "Actualizează cardul",
      sumaEuro: "Donațiile lunare în euro nu își pot schimba suma de aici. Scrie organizației dacă vrei să o modifici.",
      sumaMinMax: (min: number, max: number) => `Suma trebuie să fie între ${min} și ${max.toLocaleString("ro-RO")} lei.`,
      mesaje: {
        suma: (v: number) => `Gata: de acum donezi ${v.toLocaleString("ro-RO")} lei pe lună. Mulțumim!`,
        pauza: "Donația e în pauză. O poți relua oricând.",
        reia: "Donația lunară a fost reluată. Mulțumim!",
        opreste: "Donația lunară a fost oprită. Îți mulțumim pentru tot sprijinul!",
        eroare: "Nu am putut face modificarea. Încearcă din nou sau scrie organizației.",
        oprit: "Această donație este deja oprită.",
        stare: "Starea donației s-a schimbat între timp. Reîncarcă pagina.",
        card: "Nu am putut deschide pagina pentru actualizarea cardului. Încearcă din nou mai târziu.",
        limita: "Prea multe încercări. Încearcă din nou peste câteva minute.",
      },
    },
    emailLink: {
      subiect: (org: string) => `Gestionează-ți donația lunară către ${org}`,
      html: (org: string, link: string) => `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #14213d;">
      <p>Bună!</p>
      <p>Ai cerut să-ți gestionezi donația lunară către <strong>${org}</strong>. Din linkul de mai jos poți schimba suma, pune donația pe pauză, o poți opri sau poți actualiza cardul.</p>
      <p><a href="${link}" style="display:inline-block;background:#154a85;color:#fff;text-decoration:none;padding:12px 22px;border-radius:6px;font-weight:bold;">Gestionează donația</a></p>
      <p style="font-size:13px;color:#5b6b85;">Linkul e valabil o oră. Dacă nu ai cerut tu acest e-mail, îl poți ignora: nu se schimbă nimic.</p>
      <p>Mulțumim pentru sprijin,<br/>Echipa ${org}</p>
    </div>`,
    },
    emailOrganizatie: {
      subiect: (actiune: string) => `Un donator lunar: ${actiune}`,
      actiuni: { suma: "și-a schimbat suma", pauza: "a pus donația pe pauză", reia: "a reluat donația", opreste: "a oprit donația", card: "își actualizează cardul" },
      html: (p: { actiune: string; email: string; campanie: string; inainte: string; dupa: string }) => `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #14213d;">
      <p>Un donator lunar <strong>${p.actiune}</strong>.</p>
      <ul>
        <li>Donator: ${p.email}</li>
        <li>Campanie: ${p.campanie}</li>
        <li>Înainte: ${p.inainte}</li>
        <li>Acum: ${p.dupa}</li>
      </ul>
      <p style="font-size:13px;color:#5b6b85;">Mesaj automat din Alexandrit. Donatorul și-a făcut singur modificarea din pagina de gestionare a donației lunare.</p>
    </div>`,
    },
    linkInEmailMultumire: "Gestionează-ți donația lunară",
    linkInSubsol: "Donator lunar? Gestionează-ți donația",
  },
  en: {
    cere: {
      titlu: "Your monthly donation",
      intro: "Enter the e-mail address you used to donate. If we have a monthly donation under it, we'll send you a link to manage it: change the amount, pause it, stop it or update your card.",
      emailEticheta: "E-mail address",
      buton: "Send me the link",
      seTrimite: "Sending…",
      trimis: "If a monthly donation exists for this address, we've e-mailed you the link. Check your spam folder too. The link is valid for one hour.",
      emailInvalid: "Enter a valid e-mail address.",
      preaMulte: "Too many attempts. Try again in a few minutes.",
      indisponibil: "Managing monthly donations online isn't available for this organization. Write to them and they'll help you.",
      inapoi: (org: string) => `← Back to ${org}'s campaigns`,
    },
    gestioneaza: {
      titlu: (org: string) => `Your monthly donations to ${org}`,
      intro: "Here you can change the amount, pause or stop the donation, or update your card. The organization is notified when you make a change.",
      expirat: "This link is no longer valid. Request a new one, it's valid for one hour.",
      cereNou: "Request a new link",
      niciunul: "We couldn't find any monthly donations for this address.",
      stari: { activ: "Active", pauza: "Paused", oprit: "Stopped" },
      pePerLuna: "/ month",
      urmatoarea: (data: string) => `Next payment: ${data}`,
      inPauza: "Nothing is charged while the donation is paused.",
      schimbaSuma: "Change amount",
      sumaNoua: "New amount (RON)",
      salveaza: "Save",
      renunta: "Cancel",
      pauza: "Pause",
      reia: "Resume donation",
      opreste: "Stop donation",
      confirmaOprire: "Are you sure you want to stop your monthly donation? Nothing will be charged from next month.",
      daOprest: "Yes, stop it",
      actualizeazaCard: "Update card",
      sumaEuro: "Monthly donations in euro can't change amount here. Write to the organization if you want to change it.",
      sumaMinMax: (min: number, max: number) => `The amount must be between ${min} and ${max.toLocaleString("en-US")} RON.`,
      mesaje: {
        suma: (v: number) => `Done: you now donate ${v.toLocaleString("en-US")} RON per month. Thank you!`,
        pauza: "Your donation is paused. You can resume it any time.",
        reia: "Your monthly donation has been resumed. Thank you!",
        opreste: "Your monthly donation has been stopped. Thank you for all your support!",
        eroare: "We couldn't make the change. Try again or write to the organization.",
        oprit: "This donation is already stopped.",
        stare: "The donation's status changed in the meantime. Reload the page.",
        card: "We couldn't open the card update page. Try again later.",
        limita: "Too many attempts. Try again in a few minutes.",
      },
    },
    emailLink: {
      subiect: (org: string) => `Manage your monthly donation to ${org}`,
      html: (org: string, link: string) => `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #14213d;">
      <p>Hello!</p>
      <p>You asked to manage your monthly donation to <strong>${org}</strong>. From the link below you can change the amount, pause or stop the donation, or update your card.</p>
      <p><a href="${link}" style="display:inline-block;background:#154a85;color:#fff;text-decoration:none;padding:12px 22px;border-radius:6px;font-weight:bold;">Manage donation</a></p>
      <p style="font-size:13px;color:#5b6b85;">The link is valid for one hour. If you didn't request this e-mail you can ignore it: nothing changes.</p>
      <p>Thank you for your support,<br/>The ${org} team</p>
    </div>`,
    },
    emailOrganizatie: {
      subiect: (actiune: string) => `A monthly donor: ${actiune}`,
      actiuni: { suma: "changed their amount", pauza: "paused their donation", reia: "resumed their donation", opreste: "stopped their donation", card: "is updating their card" },
      html: (p: { actiune: string; email: string; campanie: string; inainte: string; dupa: string }) => `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #14213d;">
      <p>A monthly donor <strong>${p.actiune}</strong>.</p>
      <ul>
        <li>Donor: ${p.email}</li>
        <li>Campaign: ${p.campanie}</li>
        <li>Before: ${p.inainte}</li>
        <li>Now: ${p.dupa}</li>
      </ul>
      <p style="font-size:13px;color:#5b6b85;">Automatic message from Alexandrit. The donor made this change themselves from the monthly donation management page.</p>
    </div>`,
    },
    linkInEmailMultumire: "Manage your monthly donation",
    linkInSubsol: "Monthly donor? Manage your donation",
  },
} as const satisfies Record<Locale, unknown>;
