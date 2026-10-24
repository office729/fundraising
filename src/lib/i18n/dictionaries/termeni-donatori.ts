import type { Locale } from "../config";

// Termeni și condiții pentru donatori (paginile publice de campanie): donație voluntară, donații lunare, rambursări, afișare publică, date.
// Pagina: /termeni-donatori. Operatorul datelor donatorului e Organizația; Alexandrit e persoană împuternicită (vezi nota de informare din formular).
type Sectiune = { titlu: string; paragrafe?: string[]; puncte?: string[]; incheiere?: string[] };

export const TERMENI_DONATORI_DICT = {
  ro: {
    homeLabel: "Acasă",
    eyebrow: "Legal",
    titlu: "Termeni și condiții pentru donatori",
    actualizatLabel: "Ultima actualizare",
    actualizat: "24 octombrie 2026",
    sectiuni: [
      {
        titlu: "1. Cine este cine",
        paragrafe: [
          "Donația este făcută către organizația care a publicat campania („Organizația”), identificată pe pagina campaniei prin denumire, CIF și datele ei de contact. Platforma Alexandrit, operată de MEDIGROUPPLUS SRL (CUI 38103518), oferă infrastructura tehnică a paginii. Plata este procesată de Stripe, în contul Organizației. Alexandrit nu primește banii, nu este parte în donație și nu răspunde pentru modul în care Organizația folosește fondurile.",
        ],
      },
      {
        titlu: "2. Donația este voluntară",
        paragrafe: [
          "Donezi de bunăvoie o sumă între 3 și 50.000 lei, fără contraprestație. Donația se înregistrează după confirmarea plății de către procesator. Donația nu este o vânzare de bunuri sau servicii. Dacă Organizația oferă recompense sau acces la un eveniment, se aplică condițiile lor specifice, inclusiv dreptul legal de retragere, dacă legea îl prevede.",
          "Dacă ești o companie și vrei un contract de sponsorizare, folosește canalul destinat sponsorizărilor al Organizației. Dacă ai sub 18 ani, donezi doar cu acordul părintelui sau al reprezentantului tău legal.",
        ],
      },
      {
        titlu: "3. Donații lunare",
        paragrafe: [
          "Dacă alegi „lunar”, autorizezi plata recurentă a sumei alese, în fiecare lună, până o oprești. Poți schimba suma, pune donația pe pauză, o poți opri sau poți actualiza cardul oricând, din linkul „Gestionează-ți donația lunară”, trimis pe e-mailul folosit la donație. Organizația este informată despre modificările făcute. Oprirea produce efecte de la plata următoare.",
        ],
      },
      {
        titlu: "4. Rambursări și probleme cu plata",
        paragrafe: [
          "Dacă ai fost taxat greșit sau de două ori, scrie Organizației (datele ei sunt pe pagina campaniei). Alexandrit nu operează rambursări. Contestațiile bancare (chargeback) se rezolvă între tine, banca ta, procesator și Organizație.",
        ],
      },
      {
        titlu: "5. Ce se afișează public",
        paragrafe: [
          "Pe pagina campaniei pot apărea numele, suma și mesajul tău, dacă nu bifezi „Nu-mi afișa numele public”. Nu include în mesaj date personale ale altor persoane, injurii sau conținut ilegal; putem ascunde mesajele care încalcă aceste reguli. Poți cere oricând ascunderea mesajului tău.",
        ],
      },
      {
        titlu: "6. Documente fiscale",
        paragrafe: [
          "Platforma nu emite documente fiscale. Organizația poate emite o confirmare a donației. Dacă donația îți aduce vreun avantaj fiscal depinde de legislație și de situația ta; Alexandrit nu oferă consultanță fiscală.",
        ],
      },
      {
        titlu: "7. Datele tale",
        paragrafe: [
          "Operatorul datelor tale este Organizația; Alexandrit este persoană împuternicită și trimite e-mailurile tehnice (confirmare, link de gestionare) din numele ei. Stripe prelucrează unele date ca operator propriu, pentru obligațiile sale (verificarea plății, prevenirea fraudei).",
          "Pe lângă datele donației, măsurăm vizitele paginii de campanie fără cookie-uri și fără să păstrăm adresa IP: păstrăm 13 luni o amprentă zilnică pseudonimizată, sursa vizitei, tipul dispozitivului și țara, ca Organizația să vadă câți oameni îi susțin campaniile. Te poți opune activând „Nu mă urmări” în browser sau scriind Organizației.",
          "Dreptul la ștergere nu se aplică datelor pe care legea ne obligă să le păstrăm (de exemplu evidențele contabile), iar unele date rămân și la procesator. Drepturile tale (acces, rectificare, ștergere, restricționare, opoziție, portabilitate, retragerea consimțământului) și temeiurile prelucrării sunt în nota de informare din formularul de donație și în Politica de confidențialitate (GDPR). Plângeri: Autoritatea Națională de Supraveghere a Prelucrării Datelor cu Caracter Personal (ANSPDCP), www.dataprotection.ro.",
        ],
      },
      {
        titlu: "8. Comunicări opționale",
        paragrafe: [
          "Primești mesaje de la organizație (mulțumiri, vești despre proiecte, invitații de a dona din nou sau lunar) sau invitația în grupul de mesagerie doar dacă bifezi opțiunile separate. Unele e-mailuri se trimit automat, în funcție de istoricul donațiilor tale (de exemplu după prima sau a doua donație, sau dacă o donație lunară se oprește). Poți retrage oricând acordul (link de dezabonare în fiecare e-mail).",
        ],
      },
      {
        titlu: "9. Folosire corectă",
        paragrafe: [
          "Este interzis să folosești carduri sau date ale altor persoane ori să testezi carduri pe paginile de donații. Plățile suspecte pot fi blocate, iar Organizația și procesatorul pot sesiza autoritățile.",
        ],
      },
      {
        titlu: "10. Răspundere",
        paragrafe: [
          "Informațiile campaniei aparțin Organizației. Nu garantăm atingerea țintei campaniei sau o anumită folosire a fondurilor. Nu limităm răspunderea care nu poate fi limitată legal.",
        ],
      },
      {
        titlu: "11. Legea aplicabilă",
        paragrafe: [
          "Se aplică legea română. Pentru problemele cu donația te adresezi Organizației; pentru problemele tehnice ale paginii, la contactul de mai jos. Dacă legea îți recunoaște drepturi de consumator în raport cu o anumită plată, acestea rămân neafectate. Instanțele competente sunt cele prevăzute de lege.",
        ],
      },
      {
        titlu: "12. Contact",
        paragrafe: [
          "MEDIGROUPPLUS SRL, CUI 38103518, J07/617/2017, Str. Prieteniei nr. 4, sat Boscoteni, comuna Frumușica, județul Botoșani. E-mail: vlad.placinta@alexandrit.ro.",
        ],
      },
    ] satisfies Sectiune[],
  },
  en: {
    homeLabel: "Home",
    eyebrow: "Legal",
    titlu: "Terms and conditions for donors",
    actualizatLabel: "Last updated",
    actualizat: "October 24, 2026",
    sectiuni: [
      {
        titlu: "1. Who is who",
        paragrafe: [
          "Your donation is made to the organization that published the campaign (the “Organization”), identified on the campaign page by name, tax ID and contact details. The Alexandrit platform, operated by MEDIGROUPPLUS SRL (tax ID 38103518), provides the page's technical infrastructure. The payment is processed by Stripe, in the Organization's account. Alexandrit does not receive the money, is not a party to the donation and is not responsible for how the Organization uses the funds.",
        ],
      },
      {
        titlu: "2. Donating is voluntary",
        paragrafe: [
          "You donate voluntarily an amount between 3 and 50,000 RON, with nothing in return. The donation is recorded once the processor confirms the payment. A donation is not a sale of goods or services. If the Organization offers rewards or access to an event, their specific conditions apply, including the legal right of withdrawal, if the law provides it.",
          "If you are a company and want a sponsorship contract, use the Organization's sponsorship channel. If you are under 18, you may donate only with the consent of your parent or legal representative.",
        ],
      },
      {
        titlu: "3. Monthly donations",
        paragrafe: [
          "If you choose “monthly”, you authorize the recurring payment of the chosen amount every month until you stop it. You can change the amount, pause or stop the donation, or update your card at any time from the “Manage your monthly donation” link sent to the e-mail you used for the donation. The Organization is informed of the changes. Stopping takes effect from the next payment.",
        ],
      },
      {
        titlu: "4. Refunds and payment problems",
        paragrafe: [
          "If you were charged by mistake or twice, write to the Organization (its details are on the campaign page). Alexandrit does not process refunds. Bank disputes (chargebacks) are resolved between you, your bank, the processor and the Organization.",
        ],
      },
      {
        titlu: "5. What is shown publicly",
        paragrafe: [
          "Your name, amount and message may appear on the campaign page unless you tick “Don't show my name publicly”. Do not include other people's personal data, insults or illegal content in your message; we may hide messages that break these rules. You can ask for your message to be hidden at any time.",
        ],
      },
      {
        titlu: "6. Tax documents",
        paragrafe: [
          "The platform does not issue tax documents. The Organization may issue a donation confirmation. Whether a donation gives you any tax advantage depends on the law and your situation; Alexandrit does not give tax advice.",
        ],
      },
      {
        titlu: "7. Your data",
        paragrafe: [
          "The controller of your data is the Organization; Alexandrit is a processor and sends the technical e-mails (confirmation, management link) on its behalf. Stripe processes some data as its own controller, for its own obligations (verifying the payment, fraud prevention).",
          "Besides the donation data, we measure visits to the campaign page without cookies and without keeping your IP address: for 13 months we keep a pseudonymised daily fingerprint, the visit source, device type and country, so the Organization can see how many people support its campaigns. You can object by turning on “Do Not Track” in your browser or by writing to the Organization.",
          "The right to erasure does not apply to data we must keep by law (for example accounting records), and some data also remains with the processor. Your rights (access, rectification, erasure, restriction, objection, portability, withdrawal of consent) and the legal bases are in the information notice in the donation form and in the Privacy Policy (GDPR). Complaints: the Romanian data protection authority (ANSPDCP), www.dataprotection.ro.",
        ],
      },
      {
        titlu: "8. Optional communications",
        paragrafe: [
          "You receive messages from the organization (thank-yous, project news, invitations to donate again or monthly) or an invitation to the messaging group only if you tick the separate options. Some e-mails are sent automatically, depending on your donation history (for example after your first or second donation, or if a monthly donation stops). You can withdraw consent at any time (every e-mail has an unsubscribe link).",
        ],
      },
      {
        titlu: "9. Fair use",
        paragrafe: [
          "You must not use other people's cards or data, or test cards on donation pages. Suspicious payments may be blocked, and the Organization and the processor may report them to the authorities.",
        ],
      },
      {
        titlu: "10. Liability",
        paragrafe: [
          "Campaign information belongs to the Organization. We do not guarantee that the campaign will reach its goal or that funds will be used in a particular way. We do not limit liability that cannot be limited by law.",
        ],
      },
      {
        titlu: "11. Governing law",
        paragrafe: [
          "Romanian law applies. For problems with the donation, contact the Organization; for technical problems with the page, use the contact below. If the law gives you consumer rights regarding a particular payment, they remain unaffected. The competent courts are those provided by law.",
        ],
      },
      {
        titlu: "12. Contact",
        paragrafe: [
          "MEDIGROUPPLUS SRL, tax ID 38103518, J07/617/2017, Str. Prieteniei nr. 4, Boscoteni village, Frumușica commune, Botoșani county, Romania. E-mail: vlad.placinta@alexandrit.ro.",
        ],
      },
    ] satisfies Sectiune[],
  },
} as const satisfies Record<Locale, unknown>;
