import type { Locale } from "../config";

// Pagina de newsletter din CRM (ghidul de platforme, newsletter-pagina.tsx). Datele platformelor (lib/newsletter-platforme.ts)
// sunt în română; pentru engleză, textele lor vin din acest dicționar, pe id-ul platformei / al intervalului de volum.
export const NEWSLETTER_UI_DICT = {
  ro: {
    tabs: { generator: "Generator", ghid: "Ghid: ce e un newsletter și unde îl trimiți", label: "Newsletter" },
    ghidTitlu: { pf: "Newsletter pentru donatori: ghid", pj: "Newsletter pentru companii: ghid" },
    ghidIntro:
      "Generezi newsletterul în fila „Generator”, apoi îl trimiți dintr-o platformă de email marketing. Aici găsești ce înseamnă un newsletter și ce platformă se potrivește, după câți abonați ai și cât vrei să plătești.",
    ideiTitlu: "Ce este un newsletter",
    idei: {
      pf: [
        { titlu: "Ce este", text: "Un email trimis regulat unei liste de oameni care ți-au cerut să-i ții la curent. Spre deosebire de rețelele sociale, lista este a ta și nu depinde de un algoritm." },
        { titlu: "De ce contează pentru donatori", text: "Transformă o donație într-o relație: mulțumești, arăți ce s-a făcut cu banii și ceri, la momentul potrivit, următorul pas. Donatorii care primesc vești rămân și donează din nou." },
        { titlu: "Ce pui în el", text: "O poveste de impact, cât s-a strâns și cât a mai rămas, mulțumiri și un singur buton clar (donează, redirecționează, distribuie). Un subiect scurt și onest se deschide mai des." },
        { titlu: "Reguli de bază", text: "Cere acord explicit pentru emailuri (GDPR și legea comunicațiilor electronice), păstrează dovada lui, pune un link de dezabonare vizibil și trimite constant, de exemplu o dată pe lună." },
      ],
      pj: [
        { titlu: "Ce este", text: "Un email trimis regulat unei liste de oameni care ți-au cerut să-i ții la curent. Spre deosebire de rețelele sociale, lista este a ta și nu depinde de un algoritm." },
        { titlu: "De ce contează pentru companii", text: "Ține vie relația cu partenerii între întâlniri: rezultate, repere ale parteneriatului, invitații la evenimente și oportunități de implicare. Costă puțin și arată seriozitate." },
        { titlu: "Ce pui în el", text: "Rezultate măsurabile (sume, proiecte, beneficiari), o poveste scurtă, următorul eveniment și un singur pas clar: o întâlnire, o ofertă sau raportul de impact." },
        { titlu: "Reguli de bază", text: "Păstrează un link de dezabonare vizibil și dovada că ai fost abordat legitim, chiar și pentru adrese de companii. Trimite la un ritm pe care îl poți ține: lunar sau trimestrial." },
      ],
    },
    volumTitlu: "Câți abonați ai?",
    volumDesc: "Alege intervalul și vezi ce se potrivește și cât costă, orientativ.",
    volumGrup: "Număr de abonați",
    buget: "Buget orientativ",
    listeCompanii:
      "Listele de companii sunt de obicei mici (zeci sau sute de adrese), deci un plan gratuit sau cel mai mic plan plătit ajunge, iar personalizarea (numele firmei, ce au susținut) contează mai mult decât volumul.",
    sePotrivesc: "Se potrivesc:",
    platformeTitlu: "Platforme din România și din lume",
    platformeDesc: "Apasă pe un logo sau pe „Deschide site-ul” ca să vezi prețurile actuale.",
    filtruGrup: "Filtru după origine",
    filtre: { toate: "Toate", ro: "România", intl: "Internațional" },
    cumAlegi: "Cum alegi, pe scurt",
    sfaturi: [
      "Dacă plătești **pe abonat** (MailerLite, Mailchimp, Kit), curăță periodic lista de inactivi. Dacă plătești **pe emailuri trimise** (Brevo, Sendmachine), ai avantaj când trimiți rar către o listă mare.",
      "Verifică să poți **lipi propriul HTML** sau un șablon cod, ca să folosești newsletterul făcut aici. Majoritatea platformelor permit asta, dar nu toate pe planul gratuit.",
      "Cere **reducerea pentru ONG înainte de prima plată**: la mai multe platforme nu se aplică retroactiv și cere dovada statutului (certificat de înregistrare).",
      "Pentru date personale, preferă un furnizor cu servere în UE sau cu acord de prelucrare a datelor (DPA) și păstrează dovada acordului abonaților.",
    ],
    disclaimer: (verificat: string) =>
      `Prețurile și reducerile sunt orientative, verificate în ${verificat} pe paginile furnizorilor sau în articole comparative, și se schimbă des. Confirmă-le la furnizor înainte să plătești. Logo-urile aparțin proprietarilor lor și sunt afișate doar pentru identificarea platformelor.`,
    deschideSite: (nume: string) => `Deschide site-ul ${nume}`,
    deschide: "Deschide site-ul",
    origine: { ro: "România", intl: "Internațional" },
    sePotriveste: "Se potrivește",
    gratuit: "Gratuit",
    platit: "Plătit",
    sePlateste: "Se plătește",
    dupa: (model: string) => `după ${model}`,
    reducereOng: "Reducere ONG",
    faraReducere: "Nu am găsit o reducere publică",
    potrivitPentru: "Potrivit pentru:",
    volumePotrivite: "Volume potrivite",
  },
  en: {
    tabs: { generator: "Generator", ghid: "Guide: what a newsletter is and where to send it", label: "Newsletter" },
    ghidTitlu: { pf: "Newsletter for donors: guide", pj: "Newsletter for companies: guide" },
    ghidIntro:
      "You create the newsletter in the “Generator” tab, then send it from an email marketing platform. Here you will find what a newsletter is and which platform fits, depending on how many subscribers you have and how much you want to pay.",
    ideiTitlu: "What a newsletter is",
    idei: {
      pf: [
        { titlu: "What it is", text: "An email sent regularly to a list of people who asked you to keep them posted. Unlike social media, the list is yours and does not depend on an algorithm." },
        { titlu: "Why it matters for donors", text: "It turns a donation into a relationship: you say thank you, show what was done with the money and, at the right moment, ask for the next step. Donors who hear from you stay and give again." },
        { titlu: "What to put in it", text: "An impact story, how much was raised and how much is left, thanks, and a single clear button (donate, redirect, share). A short, honest subject line gets opened more often." },
        { titlu: "Ground rules", text: "Ask for explicit consent for emails (GDPR and the electronic communications law), keep proof of it, add a visible unsubscribe link and send consistently, for example once a month." },
      ],
      pj: [
        { titlu: "What it is", text: "An email sent regularly to a list of people who asked you to keep them posted. Unlike social media, the list is yours and does not depend on an algorithm." },
        { titlu: "Why it matters for companies", text: "It keeps the relationship with partners alive between meetings: results, partnership milestones, event invitations and ways to get involved. It costs little and shows you are serious." },
        { titlu: "What to put in it", text: "Measurable results (amounts, projects, beneficiaries), a short story, the next event and one clear step: a meeting, an offer or the impact report." },
        { titlu: "Ground rules", text: "Keep a visible unsubscribe link and proof that you approached them on a legitimate basis, even for company addresses. Send at a pace you can keep up: monthly or quarterly." },
      ],
    },
    volumTitlu: "How many subscribers do you have?",
    volumDesc: "Pick the range to see what fits and roughly what it costs.",
    volumGrup: "Number of subscribers",
    buget: "Indicative budget",
    listeCompanii:
      "Company lists are usually small (tens or hundreds of addresses), so a free plan or the smallest paid plan is enough, and personalisation (the company name, what they supported) matters more than volume.",
    sePotrivesc: "Good fits:",
    platformeTitlu: "Platforms from Romania and worldwide",
    platformeDesc: "Click a logo or “Open site” to see current prices.",
    filtruGrup: "Filter by origin",
    filtre: { toate: "All", ro: "Romania", intl: "International" },
    cumAlegi: "How to choose, in short",
    sfaturi: [
      "If you pay **per subscriber** (MailerLite, Mailchimp, Kit), clean out inactive contacts regularly. If you pay **per email sent** (Brevo, Sendmachine), you have the advantage when you send rarely to a large list.",
      "Check that you can **paste your own HTML** or a code template, so you can use the newsletter built here. Most platforms allow it, but not all on the free plan.",
      "Ask for the **nonprofit discount before the first payment**: several platforms do not apply it retroactively and ask for proof of status (registration certificate).",
      "For personal data, prefer a provider with servers in the EU or with a data processing agreement (DPA), and keep proof of your subscribers' consent.",
    ],
    disclaimer: (verificat: string) =>
      `Prices and discounts are indicative, checked in ${verificat} on the providers' pages or in comparison articles, and change often. Confirm them with the provider before you pay. Logos belong to their owners and are shown only to identify the platforms.`,
    deschideSite: (nume: string) => `Open the ${nume} site`,
    deschide: "Open site",
    origine: { ro: "Romania", intl: "International" },
    sePotriveste: "Good fit",
    gratuit: "Free",
    platit: "Paid",
    sePlateste: "Pricing model",
    dupa: (model: string) => model,
    reducereOng: "Nonprofit discount",
    faraReducere: "No public discount found",
    potrivitPentru: "Best for:",
    volumePotrivite: "Suitable volumes",
  },
} satisfies Record<Locale, unknown>;

export type NewsletterUiDict = (typeof NEWSLETTER_UI_DICT)["ro"];

// Textele în engleză ale datelor din lib/newsletter-platforme.ts (în română acolo), pe id.
export const NEWSLETTER_VERIFICAT_EN = "October 2026";

export const NEWSLETTER_VOLUME_EN: Record<string, { eticheta: string; buget: string; sfat: string }> = {
  s0: {
    eticheta: "Under 500",
    buget: "0 – 10 €/month",
    sfat: "Start free: the no-cost plans cover small lists, and the real cost is time, not money. Import your list from a CSV and try two or three platforms before choosing.",
  },
  s1: {
    eticheta: "500 – 2,500",
    buget: "10 – 35 €/month",
    sfat: "A small paid plan removes the platform logo from your emails and unlocks automations (welcome message, thank-you after a donation). Ask for the nonprofit discount before the first payment.",
  },
  s2: {
    eticheta: "2,500 – 10,000",
    buget: "30 – 150 €/month",
    sfat: "The pricing model matters here: if you pay per subscriber, clean out inactive contacts; if you pay per email sent, you have the advantage when you send rarely. Compare the real cost for your number of subscribers, not the “from” price.",
  },
  s3: {
    eticheta: "Over 10,000",
    buget: "from ~100 € upwards",
    sfat: "Ask for a quote and the nonprofit discount, because prices are negotiated at this volume. Choose the per-email model if you send rarely, and watch deliverability (reaching the inbox, not spam).",
  },
};

export const NEWSLETTER_MODEL_EN: Record<string, string> = {
  abonați: "by number of subscribers",
  "emailuri trimise": "by emails sent",
  "abonați și emailuri": "by subscribers and emails",
};

export const NEWSLETTER_PLATFORME_EN: Record<string, { descriere: string; gratuit: string; deLa: string; ong: string | null; potrivit: string }> = {
  sendmachine: {
    descriere: "Romanian email and SMS marketing platform, with a drag & drop editor and automations.",
    gratuit: "15,000 emails per month in the first months (per the website)",
    deLa: "from ~€8.90/month (third-party source)",
    ong: "20% nonprofit discount, per the website",
    potrivit: "Small and medium lists, if you prefer a Romanian provider.",
  },
  newsman: {
    descriere: "One of the best-known Romanian email marketing platforms: drag & drop automations, AI-assisted segmentation and conversion of HTML code into an editable template.",
    gratuit: "Limited free plan (in an older test: 1,000 subscribers, 5,000 emails)",
    deLa: "from ~€5 (older test, please verify)",
    ong: "Ask the sales team",
    potrivit: "Small and medium lists; the HTML-to-template conversion matches the newsletter built here (the “Copy for template conversion” button).",
  },
  themarketer: {
    descriere: "Romanian platform (launched in 2023) for email, SMS and automations, designed for online shops: segmentation, welcome messages, integrations with Shopify, WooCommerce, Magento and PrestaShop, plus GDPR tools (double opt-in).",
    gratuit: "Free plan (per third-party sources: up to 1,000 contacts and 5,000 emails per month, to be verified)",
    deLa: "Standard from ~$23/month for 1,000 contacts (Shopify listing; check the pricing page)",
    ong: "Ask the sales team",
    potrivit: "If you also have an online shop or campaigns with products or tickets and prefer a Romanian company.",
  },
  brevo: {
    descriere: "Formerly Sendinblue (France). Unlimited contacts on the free plan, and the price depends on how many emails you send. Includes automations, SMS and a simple CRM.",
    gratuit: "300 emails per day, unlimited contacts",
    deLa: "from ~$9/month for 5,000 emails (third-party sources)",
    ong: "A discount may be available (15% is mentioned, conditions vary): ask sales",
    potrivit: "Large lists that send rarely: you pay per email, not per subscriber.",
  },
  mailerlite: {
    descriere: "A simple, clean editor, good for beginners. Sign-up forms and basic automations are included.",
    gratuit: "250 subscribers, 2,500 emails per month",
    deLa: "from $12/month (Comfort) and $25/month (Power)",
    ong: "30% discount, with proof of status, requested before purchase",
    potrivit: "Small teams without a marketing specialist, with a list under 10,000.",
  },
  mailchimp: {
    descriere: "The best known: many templates and integrations. It gets expensive quickly as the list grows.",
    gratuit: "250 contacts, 500 sends per month",
    deLa: "from €11.70 (Essentials) and €17.99 (Standard), at 500 contacts",
    ong: "15% discount, requested before moving to a paid plan",
    potrivit: "If your team already uses it or you need many integrations.",
  },
  sendpulse: {
    descriere: "Email, SMS, chatbot and web push notifications in one place, with a generous free plan.",
    gratuit: "500 subscribers, 15,000 emails per month",
    deLa: "from $9.60/month at 500 subscribers (annual billing)",
    ong: "Ask support",
    potrivit: "A small budget and a need for several channels (email plus SMS or messaging).",
  },
  mailjet: {
    descriere: "European platform (France), with a collaborative editor and transactional sending (confirmations, receipts).",
    gratuit: "Free plan, with a daily sending cap",
    deLa: "see the pricing page",
    ong: "20% nonprofit discount (official documentation), not on annual plans",
    potrivit: "Small lists and teams that also send automated emails from their website.",
  },
  kit: {
    descriere: "Built for creators: email sequences, forms and sign-up pages. Good when the newsletter is your main channel.",
    gratuit: "Up to 10,000 subscribers, with limits on automations and the Kit logo in emails",
    deLa: "from $39/month at 1,000 subscribers (Creator)",
    ong: null,
    potrivit: "Large lists with simple needs, as long as you stay on the free plan.",
  },
  activecampaign: {
    descriere: "Advanced automations and CRM, for complex donor journeys (welcome, second donation, reactivation).",
    gratuit: "Trial period only",
    deLa: "from ~$15/month at 1,000 contacts (Romanian guide, please verify)",
    ong: "Ask the sales team",
    potrivit: "When someone on your team builds automated flows and you want fine-grained segmentation.",
  },
  beehiiv: {
    descriere: "Platform for editorial newsletters, with growth through referrals. Paid plans were restructured in October 2026.",
    gratuit: "Up to 2,500 subscribers",
    deLa: "check the pricing page (changed in October 2026)",
    ong: null,
    potrivit: "A newsletter as a publication (stories, articles), not only donation campaigns.",
  },
  substack: {
    descriere: "Write and publish simply, with a public archive. Free; a 10% fee only if you sell paid subscriptions.",
    gratuit: "Free to publish",
    deLa: "10% of paid subscriptions (if you sell any)",
    ong: null,
    potrivit: "Narrative newsletters, without brand design or advanced segmentation.",
  },
};
