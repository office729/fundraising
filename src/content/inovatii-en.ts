import type { Inovatie } from "./inovatii";

// Versiunea în engleză a listei „Ce am inovat” (src/content/inovatii.ts), pe id-ul intrării. REGULĂ: la fiecare intrare nouă din inovatii.ts adaugi aici și traducerea
// ei (verificat de tests/inovare.test.mjs). Termenii fiscali românești rămân, cu explicație: „Form 230 (3.5% income-tax redirect)”, „D177 (profit-tax redirect)”.
export type InovatieEn = { titlu: string; descriere: string; categorie: string; cumFolosesti?: string };

export const INOVATII_EN: Record<string, InovatieEn> = {
  "2026-11-07-cai-calde-pliate": {
    titlu: "Warm paths open only when you want them",
    descriere: "On the company page, the list of warm paths now stays closed and you only see how many there are. You open it with the “Show” button, so the rest of the page is no longer pushed down.",
    categorie: "Companies and sponsorships",
  },
  "2026-11-05-surse-donatii": {
    titlu: "Donation sources: where the money you raise comes from",
    descriere: "See, in EUR, how much paid donations bring from Facebook and Google ads, newsletters, search or other websites, with the number of donations, the average donation and the share. Filter by period, source and campaign, and open the list of donations behind each total.",
    categorie: "Reports and statistics",
    cumFolosesti: "Tag your ads and newsletters with utm_medium and compare the sources, so you can move budget to where most donations come from.",
  },
  "2026-11-04-control-ai-si-date": {
    titlu: "More control over the AI and personal data",
    descriere: "The campaign story goes to the AI only if you tick that in Settings → Integrations & AI, and the AI can pause at the monthly budget. Unwanted follow-ups can be rejected for good, and on failure you see the reason. GDPR requests now cover the email agent, candidates and influencers; sent emails are anonymised after 24 months.",
    categorie: "Platform",
  },
  "2026-11-04-ai-contul-organizatiei": {
    titlu: "AI on your own Anthropic account and the AI usage page",
    descriere: "In Settings → Integrations & AI you connect your Anthropic account (the key is saved encrypted and never shown again). The AI features in Alexandrit, from campaign promotion and grants to the email agent and analyses, now use your account: you pay only for what you use, directly to Anthropic. The AI usage page shows the cost by tool and by day, the end-of-month estimate and your reference budget.",
    categorie: "Platform",
    cumFolosesti: "Connect the account, set a spending limit in the Anthropic console and watch in AI usage what each tool costs you.",
  },
  "2026-11-04-analiza-reclame": {
    titlu: "Weekly ad analysis, with AI",
    descriere: "Every Monday morning, the AI on your own Anthropic account analyzes the last 7 days of ads: what works, what loses money and at most three concrete suggestions, with new ad text. You can also start it manually, from Ads.",
    categorie: "Reports and statistics",
    cumFolosesti: "Read the suggestions on Monday morning, copy the new text into Ads Manager and compare the results a week later.",
  },
  "2026-11-04-one-pager-editabil": {
    titlu: "One Pager editable right on the page",
    descriere: "The contact details and the text of the “Get involved” band are corrected with one click, directly on the A4 document, and the PDF uses them right away. The administrator can save them as defaults for the whole team.",
    categorie: "Companies and sponsorships",
    cumFolosesti: "Before sending the presentation to a company, put in the name and phone of the colleague who will call them and download the PDF.",
  },
  "2026-11-04-agent-email-companii": {
    titlu: "Email agent for companies (IMPACT)",
    descriere: "The AI (on your own Anthropic account) writes drafts for your companies; you correct and approve them, and the email leaves from your own mailbox, with your signature and the One Pager attached. Replies are read from the same mailbox and labelled; with no reply in 5 working days you get a follow-up and the call script. Nothing is sent without your click.",
    categorie: "Fundraising",
    cumFolosesti: "Connect your mailbox in Settings, pick ten companies with a contact person and let the AI write the drafts; fix a couple of lines, press “Send” and see the replies in the “Today” tab.",
  },
  "2026-11-04-influenceri": {
    titlu: "Influencers: profiles, unique links and results",
    descriere: "For the IMPACT plan: keep track of the content creators you ask to share your campaigns, prepare the message with a unique link (AI on your own Anthropic account or a template) and send it yourself, manually. See the clicks and received donations for each link, with scheduled checks and follow-ups.",
    categorie: "Fundraising",
    cumFolosesti: "Pick an urgent campaign, prepare the message for ten fitting creators and see which link brings in donations.",
  },
  "2026-10-30-cod-qr-stand-eveniment": {
    titlu: "QR code for a stand or event",
    descriere: "In the link generator under “Statistics and sources” you now see each link's QR code, show it full-screen on a phone or download it for a poster. The new “Stand or event” type counts the donations from each event separately.",
    categorie: "Fundraising",
    cumFolosesti: "At a stand or gala, give each event its own campaign name and see afterwards which one brought in the most donations.",
  },
  "2026-10-30-doneaza-lunar-dupa-donatie": {
    titlu: "One-time donors are invited to give monthly",
    descriere: "After a one-time donation, the thank-you window suggests a small monthly gift (about a quarter of the amount given, between 10 and 50 lei) and opens the form with the amount already filled in. The window no longer closes by itself, so the donor has time to choose.",
    categorie: "Donors",
    cumFolosesti: "The monthly-gift invitation appears exactly when the donor has just given, without you sending anything separately.",
  },
  "2026-10-30-centrul-de-inovare-raspuns-in-termen": {
    titlu: "Innovation Center: clearer ideas and an answer within 5 working days",
    descriere: "You say what you want to grow with your idea (recurring gifts, Form 230, D177…), follow its status through six steps, get an answer within 5 working days and hear by email when work starts on an idea your organization voted for. You can report an idea containing personal data, and ideas no longer accept emails, phone numbers or personal ID numbers.",
    categorie: "Platform",
    cumFolosesti: "For every idea, choose what you want to grow: ideas that directly help donations, the 3.5% redirect or D177 move to the front.",
  },
  "2026-10-30-centrul-de-inovare": {
    titlu: "Fundraising Innovation Center",
    descriere: "Suggest your ideas for the platform, vote on other NGOs' ideas and see what we have already done. Votes help us choose what to build first; the final decision stays with the team.",
    categorie: "Platform",
  },
  "2026-10-29-calendar-programari": {
    titlu: "Booking calendar inside Alexandrit",
    descriere: "Book a 1-to-1 consultation straight from the platform, with no account and no external cookies: pick the day and time, get an email confirmation and a calendar file.",
    categorie: "Platform",
  },
  "2026-10-29-statistici-si-surse": {
    titlu: "Statistics and sources: where donors come from",
    descriere: "See whether visitors arrive from regular posts or from ads, how many donate or send Form 230 and which source brought each donation. Includes a link generator for posts, ads, newsletters and QR codes.",
    categorie: "Fundraising",
    cumFolosesti: "Compare the sources and put your promotion budget on the ones that bring donations, not just visits.",
  },
  "2026-10-28-telefon-si-tableta": {
    titlu: "The platform, easier to use on phone and tablet",
    descriere: "Buttons and fields that are easier to tap, windows that no longer cover the keyboard and menus that fit the screen, across the whole dashboard and in Form 230.",
    categorie: "Platform",
  },
  "2026-10-28-crm-companii-impact": {
    titlu: "Companies CRM: estimated amounts from the balance sheet and tax windows",
    descriere: "For the IMPACT plan: we estimate how much a company could redirect from its balance sheet, you see the companies eligible for D177 (profit-tax redirect) and the tax deadlines, with lists and filters for what to do today. Connects with Waalaxy for LinkedIn.",
    categorie: "Companies and sponsorships",
    cumFolosesti: "Before the D177 window, start with the eligible companies that have the highest estimated amount.",
  },
  "2026-10-24-igiena-liste-donatori-360": {
    titlu: "360° donor profile, clean email lists and custom fields",
    descriere: "One profile with a donor's whole history, email list hygiene (wrong or bouncing addresses), custom fields for what matters to you and a public API with webhooks for integrations.",
    categorie: "Donors",
  },
  "2026-10-24-parcursuri-donatori": {
    titlu: "Donor journeys",
    descriere: "Automated messages for Welcome, Save, Upgrade and Reactivation, with results per journey (conversion, days, revenue) and quiet hours between 9:00 and 19:00.",
    categorie: "Donors",
    cumFolosesti: "Start Reactivation for donors who have not given in a year and track how many come back.",
  },
  "2026-10-24-import-curat": {
    titlu: "Clean donor import",
    descriere: "On import, emails and phone numbers are corrected and duplicates are flagged, with a confirmation before saving.",
    categorie: "Import and export",
  },
  "2026-10-22-modul-analiza-donator": {
    titlu: "Donor analysis and other intelligence modules (IMPACT)",
    descriere: "Churn risk, giving rhythm and recommendations, calculated from your organization's own data, without external services.",
    categorie: "Donors",
  },
  "2026-10-22-nota-ce-inseamna-crm": {
    titlu: "“What does CRM mean?” in plain words",
    descriere: "A short note with examples that explains what you can do in a CRM, shown on the main pages.",
    categorie: "Platform",
  },
};

export type InovatieAfisata = Omit<Inovatie, "titlu" | "descriere" | "categorie" | "cumFolosesti"> & { titlu: string; descriere: string; categorie: string; cumFolosesti?: string };

// Intrarea în limba cerută; fără traducere (nu ar trebui: testul o cere) rămâne varianta română.
export function inovatieIn(n: Inovatie, locale: "ro" | "en"): InovatieAfisata {
  if (locale === "ro") return n;
  const en = INOVATII_EN[n.id];
  return en ? { ...n, ...en } : n;
}

