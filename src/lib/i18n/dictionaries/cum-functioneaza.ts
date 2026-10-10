import type { Locale } from "../config";

// Pagina „Cum funcționează”: descrierea platformei, scrisă pentru un ONG care o evaluează. Descrie doar ce face platforma acum.
export const CUM_FUNCTIONEAZA_DICT = {
  ro: {
    breadcrumb: "Cum funcționează",
    fluxTitlu: "De la cont la donații",
    fluxNota: "Cele patru etape prin care trece o organizație nouă.",
    fluxPasi: [
      { t: "Îți creezi contul", d: "30 de zile, fără card" },
      { t: "Adaugi donatorii, firmele și colegii", d: "imporți ce ai deja" },
      { t: "Deschizi campanii", d: "pagină și plată cu cardul" },
      { t: "Lucrezi și măsori", d: "sarcini, segmente, rapoarte" },
    ],
    h1: "De la cont la prima donație: cum lucrezi cu Alexandrit",
    subtitlu:
      "Un singur loc în care îți ții donatorii, companiile partenere, campaniile și echipa. Platforma face munca repetitivă în locul tău, ca să rămână timp pentru oameni și pentru cauză.",
    ctaPrimar: "Începe 30 de zile gratuit",
    ctaSecundar: "Vezi abonamentele",
    pasiTitlu: "De la cont la primele donații, în patru pași",
    pasi: [
      { t: "Îți creezi contul", d: "Ai 30 de zile gratuite, fără card. Adaugi numele organizației, logo-ul, CIF-ul și domeniul de activitate; platforma își ia culorile și aspectul din ele." },
      { t: "Adaugi donatorii, firmele și colegii", d: "Importi donatorii și donațiile deja existente, adaugi firmele cu care lucrezi și îți inviți colegii, fiecare cu rolul lui." },
      { t: "Deschizi campanii", d: "Creezi pagina unei campanii în cinci pași ghidați, o publici și o distribui. Donatorii plătesc cu cardul, iar tu vezi donațiile în timp real." },
      { t: "Lucrezi și măsori", d: "Echipa își vede sarcinile, donatorii se grupează automat după comportament, iar rapoartele se generează din datele tale, nu din tabele scrise de mână." },
    ],
    moduleTitlu: "Ce face platforma pentru organizația ta",
    moduleSubtitlu: "Fiecare parte funcționează singură, dar toate folosesc aceleași date: un donator nu trebuie introdus de două ori.",
    module: [
      {
        t: "Campanii de strângere de fonduri",
        d: "Fiecare caz sau proiect are pagina lui, pe care o poți distribui pe rețele.",
        puncte: [
          "Asistent de creare în cinci pași, cu previzualizare pe calculator și pe telefon",
          "Donații cu cardul, unice sau lunare, cu mulțumire trimisă automat donatorului",
          "Link scurt de distribuit, bară de progres, termen și actualizări pentru susținători",
          "Mai multe campanii pentru proiecte diferite, adunate sub numele asociației",
          "Alexandrit nu reține niciun comision din donații; se aplică doar comisionul procesatorului de plăți, Stripe",
        ],
      },
      {
        t: "CRM pentru persoane fizice",
        d: "Toți donatorii, cu istoricul lor, într-un singur loc.",
        puncte: [
          "Donatorii apar automat din paginile de donație; îi poți importa și din fișiere",
          "Segmente gata făcute: noi, fideli, lunari, în pauză, cu notițe și mulțumiri urmărite",
          "Harta României cu donatorii pe județe",
          "Profilul donatorului: îi grupezi după cum donează (prima dată, lunar, în pauză) și vezi ce mesaj merită încercat pentru fiecare grup",
        ],
      },
      {
        t: "CRM pentru companii și sponsorizări",
        d: "De la prima discuție până la banii încasați.",
        puncte: [
          "Firmele urmărite pe etape, cu contacte, notițe și istoric de sponsorizări",
          "Verificarea firmei la ANAF și documente pentru sponsorizare",
          "Modul dedicat pentru redirecționarea impozitului pe profit (D177)",
          "Harta firmelor pe județe și rapoarte pentru parteneri",
        ],
      },
      {
        t: "Formularul 230",
        d: "Redirecționarea a 3,5% din impozit, fără hârtii.",
        puncte: [
          "Link propriu al organizației, unde oamenii completează formularul și îl semnează de pe telefon",
          "PDF-ul oficial completat automat, cu datele organizației",
          "Borderouri pregătite pentru ANAF, cu cel mult 50 de formulare fiecare",
          "Date personale protejate, vizibile doar celor autorizați",
        ],
      },
      {
        t: "Voluntari",
        d: "Sarcini online și activități pe teren, în aceeași pagină.",
        puncte: [
          "Pagină publică unde voluntarii aleg o sarcină sau o tură",
          "Check-in cu cod QR la activitățile pe teren și link pentru coordonator",
          "Mesaj de reamintire înainte de activitate și mulțumire după",
          "Adeverință de voluntariat generată din orele validate",
        ],
      },
      {
        t: "Echipă și organizare",
        d: "Fiecare știe ce are de făcut și cum merge.",
        puncte: [
          "Roluri diferite pentru proprietar, administratori și membri",
          "Program de lucru pe proiecte, fără suprapuneri",
          "Obiective și indicatori de performanță pe echipă",
          "Sarcini și notificări pentru ce întârzie",
        ],
      },
      {
        t: "Instrumente de comunicare și raportare",
        d: "Documentele pe care le ceri de obicei de la un birou de fundraising.",
        puncte: [
          "Newslettere pentru donatori și pentru companii, pe baza datelor tale",
          "One-pager pentru parteneri și rapoarte de impact",
          "Comunicate de presă și grupuri de Facebook pentru campanii",
          "Rapoarte care se actualizează singure, fără copiat de date",
        ],
      },
      {
        t: "Abonament și facturare",
        d: "Știi mereu ce plătești și primești factura.",
        puncte: [
          "Pachet potrivit mărimii echipei, sau configurat după nevoile tale",
          "Plata cu cardul, cu reînnoire automată dacă o alegi",
          "Îți descarci facturile din pagina de facturare",
        ],
      },
    ],
    exempluTitlu: "Un exemplu: de la o campanie la un donator care revine",
    exempluSubtitlu: "Așa lucrează părțile platformei împreună, în practică.",
    exemplu: [
      { t: "Publici campania", d: "Ai un caz sau un proiect și îi creezi pagina. O trimiți prin WhatsApp, e-mail și rețele." },
      { t: "Cineva donează", d: "Donatorul plătește cu cardul, o dată sau lunar, și primește imediat un mesaj de mulțumire." },
      { t: "Apare în CRM", d: "Donatorul și donația intră singure în baza ta de persoane fizice, fără introducere manuală." },
      { t: "Îl mulțumești și îl ții aproape", d: "Echipa vede cine nu a fost încă mulțumit și poate trimite o actualizare cu rezultatul campaniei." },
      { t: "Vezi cine revine", d: "După câteva luni, platforma îl grupează: donează din nou, a rămas lunar sau e în pauză. Îți arată ce poți testa pentru fiecare grup." },
    ],
    datelorTitlu: "Datele tale rămân ale tale",
    datelor: [
      { t: "Fiecare organizație, separată", d: "Datele unei organizații nu se văd din contul alteia. Separarea se face în baza de date, nu doar în aplicație." },
      { t: "Acces pe roluri", d: "Fiecare coleg vede și face doar ce îi permite rolul: proprietar, administrator sau membru." },
      { t: "Datele donatorilor, protejate", d: "CNP-urile din Formularul 230 sunt stocate criptat, iar datele personale se văd doar de cei autorizați." },
      { t: "Cadru GDPR clar", d: "Există acord de prelucrare a datelor (DPA) și politică de confidențialitate, iar donatorii dau acorduri separate pentru e-mail și WhatsApp." },
    ],
    ctaTitlu: "Încearcă platforma cu datele organizației tale",
    ctaDesc: "30 de zile gratuite, fără card. Dacă vrei să vorbim înainte, îți răspundem cu plăcere la întrebări.",
    ctaContact: "Scrie-ne",
  },
  en: {
    breadcrumb: "How it works",
    fluxTitlu: "From account to donations",
    fluxNota: "The four stages a new organization goes through.",
    fluxPasi: [
      { t: "Create your account", d: "30 days, no card" },
      { t: "Add your donors, companies and colleagues", d: "import what you already have" },
      { t: "Open campaigns", d: "page and card payment" },
      { t: "Work and measure", d: "tasks, segments, reports" },
    ],
    h1: "From account to first donation: working with Alexandrit",
    subtitlu:
      "One place for your donors, partner companies, campaigns and team. The platform does the repetitive work for you, so time is left for people and for the cause.",
    ctaPrimar: "Start 30 days free",
    ctaSecundar: "See the plans",
    pasiTitlu: "From account to first donations, in four steps",
    pasi: [
      { t: "Create your account", d: "You get 30 free days, no card needed. Add your organisation's name, logo, tax ID and field of activity; the platform takes its colours and look from them." },
      { t: "Add your donors, companies and colleagues", d: "Import the donors and donations you already have, add the companies you work with and invite colleagues, each with their own role." },
      { t: "Open campaigns", d: "Create a campaign page in five guided steps, publish it and share it. Donors pay by card and you see donations in real time." },
      { t: "Work and measure", d: "Your team sees its tasks, donors are grouped automatically by behaviour, and reports are generated from your own data, not from hand-typed spreadsheets." },
    ],
    moduleTitlu: "What the platform does for your organisation",
    moduleSubtitlu: "Each part works on its own, but all of them use the same data: a donor never has to be entered twice.",
    module: [
      {
        t: "Fundraising campaigns",
        d: "Every case or project gets its own page that you can share on social media.",
        puncte: [
          "A five-step creation wizard, with a desktop and phone preview",
          "Card donations, one-time or monthly, with an automatic thank-you to the donor",
          "A short link to share, a progress bar, a deadline and updates for supporters",
          "Several campaigns for different projects, gathered under the association's name",
          "Alexandrit takes no commission on donations; only the payment processor's fee (Stripe) applies",
        ],
      },
      {
        t: "CRM for individuals",
        d: "All your donors and their history in one place.",
        puncte: [
          "Donors appear automatically from donation pages; you can also import them from files",
          "Ready-made segments: new, loyal, monthly, paused, with notes and tracked thank-yous",
          "A map of Romania with donors by county",
          "The donor profile: group donors by how they give (first time, monthly, paused) and see which message is worth trying for each group",
        ],
      },
      {
        t: "CRM for companies and sponsorships",
        d: "From the first conversation to the money received.",
        puncte: [
          "Companies tracked by stage, with contacts, notes and sponsorship history",
          "Company checks against the tax authority and sponsorship documents",
          "A dedicated module for redirecting profit tax (D177)",
          "A map of companies by county and reports for partners",
        ],
      },
      {
        t: "Form 230",
        d: "Redirecting 3.5% of income tax, without paperwork.",
        puncte: [
          "Your own link, where people fill in and sign the form from their phone",
          "The official PDF filled in automatically with your organisation's details",
          "Batches ready for the tax authority, up to 50 forms each",
          "Personal data protected and visible only to authorised people",
        ],
      },
      {
        t: "Volunteers",
        d: "Online tasks and on-site activities on the same page.",
        puncte: [
          "A public page where volunteers pick a task or a shift",
          "QR code check-in for on-site activities and a coordinator link",
          "Reminders before an activity and a thank-you afterwards",
          "A volunteering certificate generated from validated hours",
        ],
      },
      {
        t: "Team and organisation",
        d: "Everyone knows what to do and how it's going.",
        puncte: [
          "Different roles for owner, administrators and members",
          "A project work schedule with no overlaps",
          "Goals and performance indicators per team",
          "Tasks and notifications for what is running late",
        ],
      },
      {
        t: "Communication and reporting tools",
        d: "The documents you usually ask a fundraising office for.",
        puncte: [
          "Newsletters for donors and for companies, based on your data",
          "One-pagers for partners and impact reports",
          "Press releases and Facebook groups for campaigns",
          "Reports that update themselves, with no copying of data",
        ],
      },
      {
        t: "Subscription and billing",
        d: "You always know what you pay and you get the invoice.",
        puncte: [
          "A plan sized for your team, or configured to your needs",
          "Card payment, with automatic renewal if you choose it",
          "You download your invoices from the billing page",
        ],
      },
    ],
    exempluTitlu: "An example: from a campaign to a returning donor",
    exempluSubtitlu: "This is how the parts of the platform work together, in practice.",
    exemplu: [
      { t: "You publish the campaign", d: "You have a case or a project and create its page. You send it by WhatsApp, e-mail and social media." },
      { t: "Someone donates", d: "The donor pays by card, once or monthly, and immediately gets a thank-you message." },
      { t: "It appears in the CRM", d: "The donor and the donation enter your individuals database on their own, with no manual entry." },
      { t: "You thank them and stay close", d: "Your team sees who hasn't been thanked yet and can send an update with the campaign's result." },
      { t: "You see who comes back", d: "After a few months the platform groups them: gives again, stayed monthly or is paused. It shows what you can test for each group." },
    ],
    datelorTitlu: "Your data stays yours",
    datelor: [
      { t: "Every organisation, separate", d: "One organisation's data cannot be seen from another's account. The separation is enforced in the database, not only in the app." },
      { t: "Role-based access", d: "Each colleague sees and does only what their role allows: owner, administrator or member." },
      { t: "Donor data, protected", d: "National ID numbers from Form 230 are stored encrypted, and personal data is visible only to authorised people." },
      { t: "A clear GDPR framework", d: "There is a data processing agreement (DPA) and a privacy policy, and donors give separate consents for e-mail and WhatsApp." },
    ],
    ctaTitlu: "Try the platform with your organisation's data",
    ctaDesc: "30 free days, no card. If you'd like to talk first, we're happy to answer your questions.",
    ctaContact: "Write to us",
  },
} satisfies Record<Locale, unknown>;
