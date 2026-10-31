// Avatarele donatorilor construite din DATELE REALE ale organizației (donații online, înregistrate manual și importate).
// Logică pură (fără bază de date, fără React): primește cifre AGREGATE și întoarce grupuri comportamentale cu dovezi, interpretări,
// ipoteze de validat, recomandări și indicatori. Nu atinge persoane: nicio cifră nu descrie un donator anume.
//
// Reguli respectate aici:
//  - un avatar apare doar dacă grupul are cel puțin PRAG_MIN donatori (sub prag, nu se afișează nimic despre el);
//  - faptele (cifre) sunt separate de interpretare (ce pare să însemne) și de ipoteze (ce NU se poate deduce din date);
//  - motivațiile, emoțiile și situația personală nu se deduc: apar doar ca ipoteze, de validat cu donatorii;
//  - nu se deduce venitul sau averea din suma donată.
//
// Limba: construiesteAvatare și textFisa primesc un parametru opțional `locale` (implicit „ro”, ca testele existente);
// textele englezești stau în SABLOANE_EN și în ramurile „en” de mai jos.

import type { Locale } from "../i18n/config";

export type GrupCod = "recurent" | "fidel" | "major" | "nou" | "pauza";
export type Incredere = "ridicat" | "mediu" | "scazut";

export const PRAG_MIN = 10;
export const PRAG_MEDIU = 30;
export const PRAG_RIDICAT = 100;
// Sub acest număr de donatori în toată baza nu are sens să împărțim în grupuri.
export const PRAG_BAZA = 20;

export type GrupStat = {
  grup: GrupCod;
  nr: number;
  suma: number;
  medianaTotal: number; // lei donați în total, mediana pe donator
  medieDonatii: number; // număr mediu de donații pe donator
  medianaRecentaZile: number; // zile de la ultima donație (mediana)
  medianaIntervalZile: number | null; // zile între donații (mediana, doar donatori cu 2+ donații)
  cuInterval: number; // câți donatori au 2+ donații (baza pentru intervalul de mai sus)
  cuEmail: number; // câți au acordat acord pentru email și nu s-au dezabonat
  dezabonati: number;
  riscLuni: number; // doar „pauză”: câți nu au donat de 6–12 luni
  inactivi: number; // doar „pauză”: câți nu au donat de peste 12 luni
  proiecte: { titlu: string; donatori: number }[]; // campaniile susținute de cei mai mulți din grup
};

export type AnStat = { an: number; donatii: number; donatori: number; suma: number };

export type BazaStat = {
  donatori: number;
  suma: number;
  medianaDonatie: number;
  recurenti: number;
  revenire: { valoare: number | null; eligibili: number }; // % din donatorii cu prima donație acum >6 luni care au donat din nou
  retentie12: { valoare: number | null; baza: number }; // % din donatorii activi acum 12–24 luni care au donat și în ultimele 12 luni
  surse: { sursa: string; nr: number }[]; // de unde provin înregistrările din CRM (câmpul „sursă”)
  ani: AnStat[];
};

export type DateAvatare = { baza: BazaStat; grupuri: GrupStat[]; canaleIntroduse: boolean };

export type Avatar = {
  id: GrupCod;
  nume: string;
  etapa: string;
  dovada: string; // dovada principală, într-o frază, pentru tabelul de avatare
  nr: number;
  procentBaza: number;
  suma: number;
  procentSuma: number;
  incredere: Incredere;
  motivIncredere: string;
  fapte: string[];
  interpretare: string[];
  ipoteze: string[];
  campanii: { titlu: string; donatori: number }[];
  bariere: string[];
  canale: string[];
  recomandari: { mesaj: string; cta: string; frecventa: string; canal: string; evitat: string[]; urmatorulPas: string };
  teste: string[];
  indicatori: string[];
  dateSuplimentare: string[];
};

export type SursaDate = { eticheta: string; stare: "conectat" | "manual" | "lipsa"; detaliu: string };

export type RezultatAvatare = {
  suficient: boolean;
  avatare: Avatar[];
  grupuriMici: { nume: string; nr: number }[];
  baza: BazaStat;
  surse: SursaDate[];
  limitari: string[];
  intrebari: string[];
};

export function nivelIncredere(nr: number): Incredere | null {
  if (nr < PRAG_MIN) return null;
  if (nr >= PRAG_RIDICAT) return "ridicat";
  if (nr >= PRAG_MEDIU) return "mediu";
  return "scazut";
}

export const ETICHETA_INCREDERE: Record<Incredere, string> = { ridicat: "Încredere ridicată", mediu: "Încredere medie", scazut: "Încredere scăzută" };
const ETICHETA_INCREDERE_EN: Record<Incredere, string> = { ridicat: "High confidence", mediu: "Medium confidence", scazut: "Low confidence" };
export const etichetaIncredere = (i: Incredere, locale: Locale = "ro") => (locale === "ro" ? ETICHETA_INCREDERE[i] : ETICHETA_INCREDERE_EN[i]);

const fmtLocale = (locale: Locale) => (locale === "ro" ? "ro-RO" : "en-GB");
const pct = (parte: number, total: number) => (total > 0 ? Math.round((parte / total) * 100) : 0);
const lei = (n: number, locale: Locale = "ro") => `${Math.round(n).toLocaleString(fmtLocale(locale))} lei`;
const zile = (n: number, locale: Locale = "ro") => `${Math.round(n).toLocaleString(fmtLocale(locale))} ${locale === "ro" ? (Math.round(n) === 1 ? "zi" : "zile") : Math.round(n) === 1 ? "day" : "days"}`;

const NUME_GRUP: Record<GrupCod, string> = {
  recurent: "Susținătorii lunari",
  fidel: "Donatorii care revin",
  major: "Contribuitorii mari",
  nou: "Donatorii noi",
  pauza: "Donatorii în pauză",
};
const NUME_GRUP_EN: Record<GrupCod, string> = {
  recurent: "Monthly supporters",
  fidel: "Donors who come back",
  major: "Major contributors",
  nou: "New donors",
  pauza: "Donors on pause",
};
export const ORDINE_GRUPURI: GrupCod[] = ["recurent", "fidel", "major", "nou", "pauza"];

function fapteComune(g: GrupStat, baza: BazaStat, locale: Locale = "ro"): string[] {
  const fl = fmtLocale(locale);
  if (locale !== "ro") {
    const f = [
      `${g.nr.toLocaleString(fl)} donors (${pct(g.nr, baza.donatori)}% of the base with gifts)`,
      `${lei(g.suma, locale)} given in total (${pct(g.suma, baza.suma)}% of the total amount)`,
      `Given in total per donor: ${lei(g.medianaTotal, locale)} (median); ${g.medieDonatii.toLocaleString(fl, { maximumFractionDigits: 1 })} gifts on average`,
      `Last gift: ${zile(g.medianaRecentaZile, locale)} ago (median)`,
    ];
    if (g.medianaIntervalZile != null && g.cuInterval >= PRAG_MIN) f.push(`Typical interval between gifts: ${zile(g.medianaIntervalZile, locale)} (median, across ${g.cuInterval} donors with 2+ gifts)`);
    f.push(`Reachable by email (with consent, not unsubscribed): ${g.cuEmail.toLocaleString(fl)} of ${g.nr.toLocaleString(fl)} (${pct(g.cuEmail, g.nr)}%)`);
    return f;
  }
  const f = [
    `${g.nr.toLocaleString("ro-RO")} donatori (${pct(g.nr, baza.donatori)}% din baza cu donații)`,
    `${lei(g.suma)} donați în total (${pct(g.suma, baza.suma)}% din suma totală)`,
    `Donat în total pe donator: ${lei(g.medianaTotal)} (mediana); ${g.medieDonatii.toLocaleString("ro-RO", { maximumFractionDigits: 1 })} donații în medie`,
    `Ultima donație: acum ${zile(g.medianaRecentaZile)} (mediana)`,
  ];
  if (g.medianaIntervalZile != null && g.cuInterval >= PRAG_MIN) f.push(`Interval tipic între donații: ${zile(g.medianaIntervalZile)} (mediana, pe ${g.cuInterval} donatori cu 2+ donații)`);
  f.push(`Pot fi contactați pe email (cu acord, nedezabonați): ${g.cuEmail.toLocaleString("ro-RO")} din ${g.nr.toLocaleString("ro-RO")} (${pct(g.cuEmail, g.nr)}%)`);
  return f;
}

const IPOTEZA_MOTIV = "Motivul pentru care donează nu rezultă din datele de donație. Rămâne o ipoteză până la validarea cu donatorii (sondaj scurt sau 5–8 conversații).";
const IPOTEZA_MOTIV_EN = "The reason they give cannot be read from the gift data. It remains a hypothesis until validated with donors (a short survey or 5–8 conversations).";

type Sablon = Pick<Avatar, "etapa" | "interpretare" | "ipoteze" | "bariere" | "canale" | "recomandari" | "teste" | "indicatori" | "dateSuplimentare"> & { fapteExtra?: (g: GrupStat, baza: BazaStat) => string[]; dovada: (g: GrupStat) => string };

const SABLOANE: Record<GrupCod, Sablon> = {
  recurent: {
    dovada: (g) => `${g.medieDonatii.toLocaleString("ro-RO", { maximumFractionDigits: 1 })} donații în medie; ${pct(g.cuEmail, g.nr)}% contactabili pe email`,
    etapa: "Relație activă — donație lunară",
    interpretare: [
      "Au un abonament lunar activ: sunt grupul cu relația cea mai stabilă și cu venit previzibil pentru organizație.",
      "Pentru ei, riscul principal nu e lipsa interesului inițial, ci oprirea tăcută a plății (card expirat, plată eșuată) sau uitarea motivului pentru care donează.",
    ],
    ipoteze: [IPOTEZA_MOTIV, "Ipoteză: o confirmare periodică a impactului reduce oprirea abonamentelor. De testat, nu de presupus."],
    bariere: ["Plăți eșuate sau card expirat (de verificat în datele de plată)", "Comunicare prea rară sau prea insistentă (ipoteză)"],
    canale: ["Email (dacă există acord)", "Pagina de mulțumire și pagina campaniei", "Mesaj scurt de actualizare, în aceeași limbă și ton ca la donație"],
    recomandari: {
      mesaj: "Mulțumire concretă: ce s-a făcut în luna aceasta și cum a contribuit grupul lor. Fără cerere de bani în același mesaj.",
      cta: "Citește actualizarea / Vezi ce am făcut împreună",
      frecventa: "De testat: o actualizare scurtă pe lună, cu un singur mesaj principal",
      canal: "Email, apoi pagina campaniei",
      evitat: ["Cereri de donații suplimentare în fiecare comunicare", "Mesaje generice fără rezultate concrete", "Presiune sau vinovăție"],
      urmatorulPas: "Trimite prima actualizare lunară de mulțumire și urmărește câți deschid și câți își mențin abonamentul 90 de zile.",
    },
    teste: ["Subiect de email: numele campaniei vs. rezultatul concret", "Mulțumire în text simplu vs. cu poză din teren (cu acordul persoanelor)"],
    indicatori: ["Rata de păstrare a abonamentelor la 3, 6 și 12 luni", "Plăți eșuate / total plăți", "Rata de deschidere și de dezabonare la actualizări"],
    dateSuplimentare: ["Motivele opririi abonamentelor (sondaj la anulare)", "Rata de deschidere a emailurilor către acest grup", "Istoricul plăților eșuate"],
  },
  fidel: {
    dovada: (g) => (g.medianaIntervalZile != null && g.cuInterval >= PRAG_MIN ? `Revin la ~${zile(g.medianaIntervalZile)} (mediana)` : `${g.medieDonatii.toLocaleString("ro-RO", { maximumFractionDigits: 1 })} donații în medie`),
    etapa: "Relație în creștere — au donat de cel puțin două ori",
    interpretare: [
      "Au revenit după prima donație: comportamentul arată încredere deja verificată în practică.",
      "Sunt cel mai apropiat grup de o donație lunară, dar asta rămâne de verificat: revenirea nu garantează că ar accepta un abonament.",
    ],
    ipoteze: [IPOTEZA_MOTIV, "Ipoteză: oferta unei donații lunare mici, prezentată ca opțiune, ar putea fi primită bine. De testat pe un eșantion, nu pe tot grupul."],
    bariere: ["Nu li s-a propus niciodată o donație lunară (de verificat în istoricul comunicărilor)", "Teama de angajament pe termen lung (ipoteză)"],
    canale: ["Email (dacă există acord)", "Pagina campaniei la care au donat ultima dată"],
    recomandari: {
      mesaj: "Recunoaște continuitatea („ați fost alături de noi de mai multe ori”) și arată rezultatul concret al ultimei campanii.",
      cta: "Rămâi alături — donează lunar o sumă mică (opțional)",
      frecventa: "De testat: o invitație la donație lunară după o actualizare de impact, nu imediat după donație",
      canal: "Email, apoi pagina de donație cu opțiunea „lunar” deschisă",
      evitat: ["Insistență repetată dacă a refuzat o dată", "Sume lunare mari, nepotrivite cu donațiile lor anterioare", "Presiune sau vinovăție"],
      urmatorulPas: "Alege un eșantion mic din grup, trimite o actualizare de impact și, în același mesaj, invitația opțională la donație lunară.",
    },
    teste: ["Invitație la donație lunară în același mesaj cu actualizarea vs. într-un mesaj separat", "Suma lunară sugerată: valoarea mediană a donațiilor lor vs. o sumă mai mică"],
    indicatori: ["Rata de conversie în donație lunară", "A treia donație în 12 luni", "Rata de dezabonare după invitație"],
    dateSuplimentare: ["Sursa fiecărei donații (online, transfer, eveniment)", "Reacția la invitațiile anterioare, dacă au existat", "Feedback direct de la câțiva donatori din grup"],
  },
  major: {
    dovada: (g) => `${lei(g.medianaTotal)} donați în total pe donator (mediana)`,
    etapa: "Relație de valoare — în primele 10% după suma donată",
    interpretare: [
      "Contribuie cu o parte importantă din suma totală. Pierderea unui singur donator din acest grup se vede în venit.",
      "Suma donată nu spune nimic despre veniturile sau situația unei persoane: grupul e definit doar prin cât a donat deja.",
    ],
    ipoteze: [IPOTEZA_MOTIV, "Ipoteză: mulțumirea personală și transparența asupra rezultatelor contează mai mult decât apelurile de masă. De verificat prin conversații, nu presupus."],
    bariere: ["Comunicarea de masă poate părea impersonală (ipoteză)", "Lipsa unui contact uman în organizație (de verificat)"],
    canale: ["Mesaj personal sau telefon, doar dacă există acord de contact", "Email personalizat", "Invitație la o prezentare de rezultate"],
    recomandari: {
      mesaj: "Mulțumire personală, semnată de o persoană din echipă, cu rezultatele la care a contribuit grupul. Fără cerere de bani în primul contact.",
      cta: "Hai să-ți arătăm ce s-a întâmplat — te invităm la o scurtă prezentare",
      frecventa: "De testat: un contact personal la 4–6 luni, în afara campaniilor",
      canal: "Mesaj personal / telefon cu acord, apoi raport scurt",
      evitat: ["Tratarea ca „sursă de bani”", "Comunicare de masă identică cu cea pentru restul donatorilor", "Referiri la suma donată în fața altora"],
      urmatorulPas: "Pentru fiecare donator din grup, desemnează o persoană din echipă care îi mulțumește personal în următoarele 30 de zile.",
    },
    teste: ["Mulțumire personală vs. mulțumire standard: efectul asupra următoarei donații", "Invitație la prezentare vs. raport trimis pe email"],
    indicatori: ["Rata de păstrare a donatorilor din grup la 12 luni", "Frecvența donațiilor după mulțumirea personală", "Număr de conversații de feedback realizate"],
    dateSuplimentare: ["Interesele declarate de donatori (doar dacă le oferă voluntar)", "Acordul de contact telefonic", "Istoricul interacțiunilor cu echipa"],
  },
  nou: {
    dovada: (g) => `O singură donație; ultima acum ${zile(g.medianaRecentaZile)} (mediana)`,
    etapa: "Început de relație — o singură donație, în ultimele 6 luni",
    interpretare: [
      "A doua donație este momentul decisiv: în acest grup se decide dacă relația continuă sau rămâne un gest izolat.",
      "O singură donație nu permite concluzii despre persoană: nu deducem preferințe sau motive din ea.",
    ],
    ipoteze: [IPOTEZA_MOTIV, "Ipoteză: o mulțumire rapidă și concretă crește șansa unei a doua donații. De testat prin compararea a două variante de mulțumire."],
    bariere: ["Nu știu ce s-a făcut cu donația lor (ipoteză)", "Lipsa unei invitații clare de a rămâne în legătură (de verificat)"],
    canale: ["Email de mulțumire (dacă există acord)", "Pagina de mulțumire de după donație", "Actualizări ale campaniei"],
    recomandari: {
      mesaj: "Mulțumire în 24–48 de ore, cu explicația simplă a ce se întâmplă cu donația și ce urmează.",
      cta: "Rămâi în legătură — află ce s-a făcut cu donația ta",
      frecventa: "De testat: 1 mulțumire + 1 actualizare de impact în primele 30 de zile, apoi o primă invitație blândă",
      canal: "Email și pagina de mulțumire",
      evitat: ["A doua cerere de bani imediat după prima donație", "Mesaje lungi sau multiple în primele zile", "Presiune sau vinovăție"],
      urmatorulPas: "Verifică dacă fiecare donator nou primește mulțumirea în 48 de ore și adaugă o actualizare de impact după 3–4 săptămâni.",
    },
    teste: ["Mulțumire în 24 de ore vs. în 3 zile", "Prima invitație după 30 de zile vs. după 60 de zile", "Mulțumire cu rezultat concret vs. cu poveste"],
    indicatori: ["Rata de a doua donație în 90 de zile", "Rata de deschidere a mulțumirii", "Rata de dezabonare în primele 30 de zile"],
    dateSuplimentare: ["Sursa primei donații (campanie, link distribuit, eveniment)", "Rata de deschidere a primelor emailuri", "Feedback scurt: „ce te-a convins să donezi?” (voluntar)"],
  },
  pauza: {
    dovada: (g) => `${g.riscLuni.toLocaleString("ro-RO")} în pauză de 6–12 luni · ${g.inactivi.toLocaleString("ro-RO")} de peste 12 luni`,
    etapa: "Relație întreruptă — nu au mai donat de peste 6 luni",
    interpretare: [
      "Au donat cândva, dar nu mai recent. Din date nu putem ști dacă au fost solicitați, dacă au uitat sau dacă și-au pierdut interesul.",
      "Este un grup cu potențial de reactivare, dar și cu cel mai mare risc de oboseală dacă este presat.",
    ],
    ipoteze: [
      IPOTEZA_MOTIV,
      "Ipoteză: o parte dintre ei nu au mai fost contactați de la ultima donație. De verificat în istoricul comunicărilor.",
      "Nu presupunem motive personale (financiare, de sănătate sau altele): nu pot fi deduse și nu trebuie atribuite.",
    ],
    bariere: ["Lipsa comunicării după ultima donație (de verificat)", "Interes mutat spre alte cauze (ipoteză)", "Adresă de email veche sau inactivă (de verificat)"],
    canale: ["Email (doar cu acord, nedezabonați)", "O singură serie scurtă de mesaje, apoi pauză"],
    recomandari: {
      mesaj: "Ce s-a realizat de la ultima lor donație, cu mulțumire sinceră. Opțiunea clară de a nu mai primi mesaje.",
      cta: "Vezi ce s-a întâmplat — și, dacă dorești, susține din nou",
      frecventa: "De testat: 2 mesaje în 60 de zile, apoi oprire dacă nu răspund",
      canal: "Email; fără insistență pe alte canale",
      evitat: ["Seria lungă de mesaje de reactivare", "Tonul de reproș („ne-ai uitat”)", "Ignorarea dezabonărilor"],
      urmatorulPas: "Pregătește seria de 2 mesaje pentru cei cu acord de email și măsoară reactivarea și dezabonările după 60 de zile.",
    },
    teste: ["Mesaj cu rezultate vs. mesaj cu poveste nouă", "Pauză 6–12 luni vs. peste 12 luni: mesaje diferite"],
    indicatori: ["Rata de reactivare (donație nouă în 90 de zile)", "Rata de dezabonare", "Rata de deschidere a primului mesaj"],
    dateSuplimentare: ["Data ultimei comunicări trimise fiecărui donator", "Motivul dezabonărilor, dacă e oferit voluntar", "Rata de deschidere a emailurilor din ultimele 12 luni"],
    fapteExtra: (g) => [`Din ei, ${g.riscLuni.toLocaleString("ro-RO")} nu au donat de 6–12 luni, iar ${g.inactivi.toLocaleString("ro-RO")} de peste 12 luni`],
  },
};

const SABLOANE_EN: Record<GrupCod, Sablon> = {
  recurent: {
    dovada: (g) => `${g.medieDonatii.toLocaleString("en-GB", { maximumFractionDigits: 1 })} gifts on average; ${pct(g.cuEmail, g.nr)}% reachable by email`,
    etapa: "Active relationship — monthly gift",
    interpretare: [
      "They have an active monthly subscription: the group with the most stable relationship and predictable income for the organization.",
      "For them, the main risk is not a lack of initial interest but a silent stop of payment (expired card, failed payment) or forgetting why they give.",
    ],
    ipoteze: [IPOTEZA_MOTIV_EN, "Hypothesis: a periodic confirmation of impact reduces subscription cancellations. To be tested, not assumed."],
    bariere: ["Failed payments or expired card (check in the payment data)", "Communication that is too rare or too insistent (hypothesis)"],
    canale: ["Email (if there is consent)", "The thank-you page and the campaign page", "A short update message, in the same language and tone as at the time of the gift"],
    recomandari: {
      mesaj: "A concrete thank-you: what was done this month and how the group contributed. No request for money in the same message.",
      cta: "Read the update / See what we did together",
      frecventa: "To test: one short update a month, with a single main message",
      canal: "Email, then the campaign page",
      evitat: ["Requests for extra gifts in every communication", "Generic messages without concrete results", "Pressure or guilt"],
      urmatorulPas: "Send the first monthly thank-you update and track how many open it and how many keep their subscription for 90 days.",
    },
    teste: ["Email subject: the campaign name vs. the concrete result", "Plain-text thank-you vs. one with a photo from the field (with the people's consent)"],
    indicatori: ["Subscription retention rate at 3, 6 and 12 months", "Failed payments / total payments", "Open and unsubscribe rate on updates"],
    dateSuplimentare: ["Reasons for cancelling subscriptions (survey at cancellation)", "Open rate of emails to this group", "History of failed payments"],
  },
  fidel: {
    dovada: (g) => (g.medianaIntervalZile != null && g.cuInterval >= PRAG_MIN ? `They come back about every ${zile(g.medianaIntervalZile, "en")} (median)` : `${g.medieDonatii.toLocaleString("en-GB", { maximumFractionDigits: 1 })} gifts on average`),
    etapa: "Growing relationship — have given at least twice",
    interpretare: [
      "They came back after the first gift: the behaviour shows trust already verified in practice.",
      "They are the group closest to a monthly gift, but that remains to be verified: coming back does not guarantee they would accept a subscription.",
    ],
    ipoteze: [IPOTEZA_MOTIV_EN, "Hypothesis: offering a small monthly gift, presented as an option, might be well received. To be tested on a sample, not on the whole group."],
    bariere: ["They have never been offered a monthly gift (check in the communication history)", "Fear of a long-term commitment (hypothesis)"],
    canale: ["Email (if there is consent)", "The page of the campaign they last gave to"],
    recomandari: {
      mesaj: "Acknowledge their continuity (“you have been with us several times”) and show the concrete result of the last campaign.",
      cta: "Stay with us — give a small monthly amount (optional)",
      frecventa: "To test: an invitation to a monthly gift after an impact update, not right after a gift",
      canal: "Email, then the donation page with the “monthly” option open",
      evitat: ["Repeated insistence if they declined once", "Large monthly amounts, out of line with their previous gifts", "Pressure or guilt"],
      urmatorulPas: "Pick a small sample from the group, send an impact update and, in the same message, the optional invitation to a monthly gift.",
    },
    teste: ["Invitation to a monthly gift in the same message as the update vs. in a separate message", "Suggested monthly amount: the median of their gifts vs. a smaller amount"],
    indicatori: ["Conversion rate to a monthly gift", "A third gift within 12 months", "Unsubscribe rate after the invitation"],
    dateSuplimentare: ["The source of each gift (online, transfer, event)", "Reaction to earlier invitations, if there were any", "Direct feedback from a few donors in the group"],
  },
  major: {
    dovada: (g) => `${lei(g.medianaTotal, "en")} given in total per donor (median)`,
    etapa: "Valuable relationship — in the top 10% by amount given",
    interpretare: [
      "They contribute an important part of the total amount. Losing a single donor from this group shows in income.",
      "The amount given says nothing about a person's income or situation: the group is defined only by how much it has already given.",
    ],
    ipoteze: [IPOTEZA_MOTIV_EN, "Hypothesis: personal thanks and transparency about results matter more than mass appeals. To be checked through conversations, not assumed."],
    bariere: ["Mass communication may feel impersonal (hypothesis)", "No human contact in the organization (to be checked)"],
    canale: ["Personal message or phone call, only if there is consent to be contacted", "Personalised email", "An invitation to a results presentation"],
    recomandari: {
      mesaj: "A personal thank-you, signed by a team member, with the results the group contributed to. No request for money in the first contact.",
      cta: "Let us show you what happened — we invite you to a short presentation",
      frecventa: "To test: a personal contact every 4–6 months, outside campaigns",
      canal: "Personal message / phone call with consent, then a short report",
      evitat: ["Treating them as a “source of money”", "Mass communication identical to the one for other donors", "Mentioning the amount given in front of others"],
      urmatorulPas: "For each donor in the group, assign a team member to thank them personally within the next 30 days.",
    },
    teste: ["Personal thank-you vs. standard thank-you: the effect on the next gift", "Invitation to a presentation vs. a report sent by email"],
    indicatori: ["Retention rate of the group's donors at 12 months", "Frequency of gifts after the personal thank-you", "Number of feedback conversations held"],
    dateSuplimentare: ["Interests stated by donors (only if they offer them voluntarily)", "Consent for phone contact", "History of interactions with the team"],
  },
  nou: {
    dovada: (g) => `A single gift; the latest ${zile(g.medianaRecentaZile, "en")} ago (median)`,
    etapa: "Start of a relationship — a single gift, in the last 6 months",
    interpretare: [
      "The second gift is the decisive moment: in this group it is decided whether the relationship continues or remains an isolated gesture.",
      "A single gift does not allow conclusions about the person: we do not infer preferences or reasons from it.",
    ],
    ipoteze: [IPOTEZA_MOTIV_EN, "Hypothesis: a quick, concrete thank-you raises the chance of a second gift. To be tested by comparing two thank-you variants."],
    bariere: ["They don't know what was done with their gift (hypothesis)", "No clear invitation to stay in touch (to be checked)"],
    canale: ["Thank-you email (if there is consent)", "The thank-you page after the gift", "Campaign updates"],
    recomandari: {
      mesaj: "A thank-you within 24–48 hours, with a simple explanation of what happens with the gift and what comes next.",
      cta: "Stay in touch — find out what was done with your gift",
      frecventa: "To test: 1 thank-you + 1 impact update in the first 30 days, then a first gentle invitation",
      canal: "Email and the thank-you page",
      evitat: ["A second request for money right after the first gift", "Long or multiple messages in the first days", "Pressure or guilt"],
      urmatorulPas: "Check that every new donor receives the thank-you within 48 hours and add an impact update after 3–4 weeks.",
    },
    teste: ["Thank-you within 24 hours vs. within 3 days", "First invitation after 30 days vs. after 60 days", "Thank-you with a concrete result vs. with a story"],
    indicatori: ["Second-gift rate within 90 days", "Open rate of the thank-you", "Unsubscribe rate in the first 30 days"],
    dateSuplimentare: ["The source of the first gift (campaign, shared link, event)", "Open rate of the first emails", "Short feedback: “what convinced you to give?” (voluntary)"],
  },
  pauza: {
    dovada: (g) => `${g.riscLuni.toLocaleString("en-GB")} on pause for 6–12 months · ${g.inactivi.toLocaleString("en-GB")} for over 12 months`,
    etapa: "Interrupted relationship — haven't given for over 6 months",
    interpretare: [
      "They gave once, but not recently. From the data we cannot know whether they were asked, whether they forgot, or whether they lost interest.",
      "It is a group with reactivation potential, but also with the highest risk of fatigue if pressed.",
    ],
    ipoteze: [
      IPOTEZA_MOTIV_EN,
      "Hypothesis: some of them have not been contacted since their last gift. To be checked in the communication history.",
      "We do not assume personal reasons (financial, health or other): they cannot be inferred and must not be attributed.",
    ],
    bariere: ["No communication after the last gift (to be checked)", "Interest shifted to other causes (hypothesis)", "Old or inactive email address (to be checked)"],
    canale: ["Email (only with consent, not unsubscribed)", "A single short series of messages, then a pause"],
    recomandari: {
      mesaj: "What was achieved since their last gift, with a sincere thank-you. A clear option to stop receiving messages.",
      cta: "See what happened — and, if you wish, support us again",
      frecventa: "To test: 2 messages in 60 days, then stop if they don't respond",
      canal: "Email; no insistence on other channels",
      evitat: ["A long series of reactivation messages", "A tone of reproach (“you forgot us”)", "Ignoring unsubscribes"],
      urmatorulPas: "Prepare the 2-message series for those with email consent and measure reactivation and unsubscribes after 60 days.",
    },
    teste: ["Message with results vs. message with a new story", "Pause of 6–12 months vs. over 12 months: different messages"],
    indicatori: ["Reactivation rate (a new gift within 90 days)", "Unsubscribe rate", "Open rate of the first message"],
    dateSuplimentare: ["The date of the last communication sent to each donor", "The reason for unsubscribing, if offered voluntarily", "Open rate of emails over the last 12 months"],
    fapteExtra: (g) => [`Of these, ${g.riscLuni.toLocaleString("en-GB")} have not given for 6–12 months, and ${g.inactivi.toLocaleString("en-GB")} for over 12 months`],
  },
};

function motivIncredere(nr: number, nivel: Incredere, locale: Locale = "ro"): string {
  if (locale !== "ro") {
    const baza = `The group has ${nr.toLocaleString("en-GB")} donors`;
    if (nivel === "ridicat") return `${baza}: enough for stable patterns. The reasons remain hypotheses all the same.`;
    if (nivel === "mediu") return `${baza}: the patterns are indicative, to be confirmed in the next campaigns.`;
    return `${baza}: small group, the figures may vary a lot. Treat conclusions as hypotheses.`;
  }
  const baza = `Grupul are ${nr.toLocaleString("ro-RO")} donatori`;
  if (nivel === "ridicat") return `${baza}: suficient pentru tipare stabile. Motivele rămân totuși ipoteze.`;
  if (nivel === "mediu") return `${baza}: tiparele sunt orientative, de confirmat în următoarele campanii.`;
  return `${baza}: grup mic, cifrele pot varia mult. Tratează concluziile ca ipoteze.`;
}

export function construiesteAvatare(date: DateAvatare, locale: Locale = "ro"): RezultatAvatare {
  const en = locale !== "ro";
  const { baza, grupuri } = date;
  const dupaGrup = new Map(grupuri.map((g) => [g.grup, g]));
  const avatare: Avatar[] = [];
  const grupuriMici: { nume: string; nr: number }[] = [];

  if (baza.donatori >= PRAG_BAZA) {
    for (const id of ORDINE_GRUPURI) {
      const g = dupaGrup.get(id);
      if (!g || g.nr === 0) continue;
      const nivel = nivelIncredere(g.nr);
      if (!nivel) {
        grupuriMici.push({ nume: (en ? NUME_GRUP_EN : NUME_GRUP)[id], nr: g.nr });
        continue;
      }
      const s = (en ? SABLOANE_EN : SABLOANE)[id];
      avatare.push({
        id,
        nume: (en ? NUME_GRUP_EN : NUME_GRUP)[id],
        etapa: s.etapa,
        dovada: s.dovada(g),
        nr: g.nr,
        procentBaza: pct(g.nr, baza.donatori),
        suma: g.suma,
        procentSuma: pct(g.suma, baza.suma),
        incredere: nivel,
        motivIncredere: motivIncredere(g.nr, nivel, locale),
        fapte: [...fapteComune(g, baza, locale), ...(s.fapteExtra?.(g, baza) ?? [])],
        interpretare: s.interpretare,
        ipoteze: s.ipoteze,
        // Campaniile apar doar dacă le-au susținut cel puțin 3 donatori din grup (nu expunem alegerile unor persoane izolate).
        campanii: g.proiecte.filter((p) => p.donatori >= 3).slice(0, 3),
        bariere: s.bariere,
        canale: s.canale,
        recomandari: s.recomandari,
        teste: s.teste,
        indicatori: s.indicatori,
        dateSuplimentare: s.dateSuplimentare,
      });
    }
  }

  if (en) {
    const suraseEn: SursaDate[] = [
      { eticheta: "Gifts on the platform (online, recorded manually, imported)", stare: baza.donatori > 0 ? "conectat" : "lipsa", detaliu: baza.donatori > 0 ? `${baza.donatori.toLocaleString("en-GB")} donors with gifts` : "There are no gifts in the CRM yet" },
      { eticheta: "Channel statistics (followers, reach, engagement)", stare: date.canaleIntroduse ? "manual" : "lipsa", detaliu: date.canaleIntroduse ? "Entered by the team under “Budget & channels”; not verified automatically" : "To be filled in manually under “Budget & channels”" },
      { eticheta: "Website, Google Analytics (GA4)", stare: "lipsa", detaliu: "Not connected. Add aggregate results to see which pages lead to gifts" },
      { eticheta: "Newsletters (opens, clicks, unsubscribes)", stare: "lipsa", detaliu: "Not connected. Without them we cannot say how each group reacts to communications" },
      { eticheta: "Donor surveys and feedback", stare: "lipsa", detaliu: "None yet. It is the only source for real reasons and barriers" },
    ];
    const limitariEn = [
      "The analysis uses only the CRM gifts of donors with an email address. Gifts without an email are not included in the groups.",
      "Groups are defined by giving behaviour (recency, frequency, value), not by age, income, location or other personal characteristics.",
      "Correlation does not mean causation: two things appearing together does not show that one causes the other.",
      "A group under 10 donors is not shown. Groups under 30 have low confidence.",
      "The website, social networks, GA4 and newsletters are not connected; what they say about the audience is not included.",
    ];
    const intrebariEn = [
      "What reasons do donors say made them give? (cannot be inferred from the data)",
      "Through which channels did they learn about the organization? (the gift source is not filled in everywhere)",
      "How does each group react to newsletters and thank-you communications?",
      "What are the reasons why donors on pause stopped giving?",
    ];
    return { suficient: avatare.length > 0, avatare, grupuriMici, baza, surse: suraseEn, limitari: limitariEn, intrebari: intrebariEn };
  }

  const surse: SursaDate[] = [
    { eticheta: "Donații în platformă (online, înregistrate manual, importate)", stare: baza.donatori > 0 ? "conectat" : "lipsa", detaliu: baza.donatori > 0 ? `${baza.donatori.toLocaleString("ro-RO")} donatori cu donații` : "Nu există încă donații în CRM" },
    { eticheta: "Statistici canale (urmăritori, acoperire, interacțiune)", stare: date.canaleIntroduse ? "manual" : "lipsa", detaliu: date.canaleIntroduse ? "Introduse de echipă în „Buget & canale”; nu sunt verificate automat" : "Se completează manual în „Buget & canale”" },
    { eticheta: "Site, Google Analytics (GA4)", stare: "lipsa", detaliu: "Nu este conectat. Adaugă rezultate agregate pentru a vedea ce pagini duc la donații" },
    { eticheta: "Newslettere (deschideri, clicuri, dezabonări)", stare: "lipsa", detaliu: "Nu este conectat. Fără ele nu putem spune cum reacționează fiecare grup la comunicări" },
    { eticheta: "Sondaje și feedback de la donatori", stare: "lipsa", detaliu: "Nu există încă. Este singura sursă pentru motive și bariere reale" },
  ];

  const limitari = [
    "Analiza folosește doar donațiile din CRM ale donatorilor cu email. Donațiile fără email nu intră în grupuri.",
    "Grupurile sunt definite după comportamentul de donare (recență, frecvență, valoare), nu după vârstă, venit, locație sau alte caracteristici personale.",
    "Corelația nu înseamnă cauzalitate: faptul că două lucruri apar împreună nu arată că unul îl provoacă pe celălalt.",
    "Un grup sub 10 donatori nu se afișează. Grupurile sub 30 sunt cu încredere scăzută.",
    "Site-ul, rețelele sociale, GA4 și newsletterele nu sunt conectate; ce spun ele despre public nu este inclus.",
  ];
  const intrebari = [
    "Ce motive spun donatorii că i-au făcut să doneze? (nu se poate deduce din date)",
    "Prin ce canale au aflat de organizație? (sursa donației nu e completată peste tot)",
    "Cum reacționează fiecare grup la newslettere și la comunicările de mulțumire?",
    "Care sunt motivele pentru care donatorii în pauză nu au mai donat?",
  ];

  return { suficient: avatare.length > 0, avatare, grupuriMici, baza, surse, limitari, intrebari };
}

// Textul unei fișe de avatar, pentru copiere în documente interne (doar date agregate).
export function textFisa(a: Avatar, locale: Locale = "ro"): string {
  const lista = (titlu: string, items: string[]) => (items.length ? `${titlu}\n${items.map((i) => `- ${i}`).join("\n")}\n` : "");
  if (locale !== "ro") {
    return [
      `${a.nume} — ${a.etapa}`,
      `${etichetaIncredere(a.incredere, locale)}: ${a.motivIncredere}`,
      "",
      lista("Facts observed (from the organization's data)", a.fapte),
      lista("Marketing interpretation", a.interpretare),
      lista("Hypotheses to validate", a.ipoteze),
      lista("Campaigns supported by several in the group", a.campanii.map((c) => `${c.titlu} (${c.donatori} donors)`)),
      `Recommendation\n- Message: ${a.recomandari.mesaj}\n- Call to action: ${a.recomandari.cta}\n- Frequency to test: ${a.recomandari.frecventa}\n- Channel: ${a.recomandari.canal}\n- Next step: ${a.recomandari.urmatorulPas}\n`,
      lista("To avoid", a.recomandari.evitat),
      lista("Priority A/B tests", a.teste),
      lista("Indicators to track", a.indicatori),
      lista("Data that would confirm or refute the avatar", a.dateSuplimentare),
    ]
      .filter((x) => x !== "")
      .join("\n");
  }
  return [
    `${a.nume} — ${a.etapa}`,
    `${ETICHETA_INCREDERE[a.incredere]}: ${a.motivIncredere}`,
    "",
    lista("Fapte observate (din datele organizației)", a.fapte),
    lista("Interpretare de marketing", a.interpretare),
    lista("Ipoteze de validat", a.ipoteze),
    lista("Campanii susținute de mai mulți din grup", a.campanii.map((c) => `${c.titlu} (${c.donatori} donatori)`)),
    `Recomandare\n- Mesaj: ${a.recomandari.mesaj}\n- Apel la acțiune: ${a.recomandari.cta}\n- Frecvență de testat: ${a.recomandari.frecventa}\n- Canal: ${a.recomandari.canal}\n- Următorul pas: ${a.recomandari.urmatorulPas}\n`,
    lista("De evitat", a.recomandari.evitat),
    lista("Teste A/B prioritare", a.teste),
    lista("Indicatori de urmărit", a.indicatori),
    lista("Date care ar confirma sau infirma avatarul", a.dateSuplimentare),
  ]
    .filter((x) => x !== "")
    .join("\n");
}
