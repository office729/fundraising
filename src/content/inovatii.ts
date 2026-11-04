// Ce am inovat în ultima perioadă: lista afișată în Centrul de inovare (CRM → Centrul de inovare) și în „Noutăți”.
//
// REGULĂ (valabilă la fiecare lot publicat): orice modificare pe care o văd ONG-urile (funcționalitate nouă, îmbunătățire, reparație importantă) primește
// aici o intrare, în ACELAȘI commit cu modificarea. Cele mai noi sunt primele. Scrie pentru un ONG, nu pentru un programator: ce poate face acum și de ce
// îi folosește, într-o propoziție-două. Nu intră: lucrări interne (Panou platformă), refactorizări, teste. Formatul e verificat de tests/inovatii.test.mjs.
//
//  - id: unic și stabil (data + cuvinte-cheie), nu se schimbă niciodată;
//  - data: ziua publicării (YYYY-MM-DD); intrările de după cea mai recentă primesc eticheta „Nou” 14 zile;
//  - tip: "nou" (funcționalitate nouă), "imbunatatire" (face mai bine ceva existent), "reparat" (o problemă rezolvată);
//  - link: calea din CRM (fără /<org>/crm/), ca să apară butonul „Deschide”; omite-l dacă nu are o pagină proprie;
//  - dinPropunere: true dacă vine dintr-o idee propusă de ONG-uri (apare eticheta „Propusă de ONG-uri”);
//  - ideeId: id-ul ideii din Centrul de inovare (Panou platformă → Centrul de inovare, în linkul ideii) de unde vine noutatea. Organizațiile care au propus sau
//    votat acea idee văd „Ai cerut tu, am făcut”. Se completează doar dacă noutatea vine dintr-o idee reală;
//  - cumFolosesti: o propoziție despre cum folosești noutatea ca să strângi mai mult (apare în Centru, sub descriere). Recomandat la funcțiile noi.

export type TipInovatie = "nou" | "imbunatatire" | "reparat";

export type Inovatie = {
  id: string;
  data: string;
  titlu: string;
  descriere: string;
  categorie: string;
  tip: TipInovatie;
  link?: string;
  dinPropunere?: boolean;
  ideeId?: string;
  cumFolosesti?: string;
};

export const INOVATII: Inovatie[] = [
  {
    id: "2026-11-04-control-ai-si-date",
    data: "2026-11-04",
    titlu: "Mai mult control asupra AI-ului și a datelor personale",
    descriere: "Povestea campaniei pleacă la AI doar dacă bifezi asta în Setări → Integrări & AI, iar AI-ul se poate opri la bugetul lunar. Revenirile nedorite se pot respinge definitiv, iar la eșec vezi motivul. Cereri GDPR acoperă acum și agentul email, candidații și influencerii; emailurile trimise se anonimizează după 24 de luni.",
    categorie: "Platformă",
    tip: "imbunatatire",
    link: "consum-ai",
  },
  {
    id: "2026-11-04-ai-contul-organizatiei",
    data: "2026-11-04",
    titlu: "AI pe propriul tău cont Anthropic și pagina Consum AI",
    descriere: "În Setări → Integrări & AI îți conectezi contul Anthropic (cheia se salvează criptată și nu se mai afișează). Funcțiile cu AI din Alexandrit, de la promovarea campaniilor și granturi până la agentul de email și analize, folosesc acum contul tău: plătești doar ce folosești, direct la Anthropic. Pagina Consum AI arată costul pe instrument și pe zile, estimarea la final de lună și bugetul tău de referință.",
    categorie: "Platformă",
    tip: "nou",
    link: "consum-ai",
    cumFolosesti: "Conectează contul, pune o limită de cheltuieli în consola Anthropic și urmărește în Consum AI cât te costă fiecare instrument.",
  },
  {
    id: "2026-11-04-analiza-ong",
    data: "2026-11-04",
    titlu: "Analiză ONG-uri: află cum strânge bani alt ONG",
    descriere: "Scrii numele unui ONG și AI-ul (pe contul tău Anthropic) caută pe internet și scrie un raport: canale, campanii, comunicare, cifre publice, ce putem prelua și ce nu. Rulează în fundal, cu surse listate cu link.",
    categorie: "Strângere de fonduri",
    tip: "nou",
    link: "analiza-ong",
    cumFolosesti: "Alege un ONG care strânge bine, citește „Ce putem prelua” și încearcă o idee în campania următoare.",
  },
  {
    id: "2026-11-04-analiza-reclame",
    data: "2026-11-04",
    titlu: "Analiza săptămânală a reclamelor, cu AI",
    descriere: "În fiecare luni dimineață, AI-ul din contul tău Anthropic analizează reclamele ultimelor 7 zile: ce merge bine, ce pierde bani și cel mult trei propuneri concrete, cu text nou pentru reclamă. O poți porni și manual, din Reclame.",
    categorie: "Rapoarte și statistici",
    tip: "nou",
    link: "reclame",
    cumFolosesti: "Citește propunerile luni dimineață, copiază textul nou în Ads Manager și compară rezultatele peste o săptămână.",
  },
  {
    id: "2026-11-04-one-pager-editabil",
    data: "2026-11-04",
    titlu: "One Pager editabil direct pe pagină",
    descriere: "Datele de contact și textul din banda „Implică-te” se corectează cu un clic, direct pe documentul A4, iar PDF-ul le folosește imediat. Administratorul poate salva datele ca implicite pentru toată echipa.",
    categorie: "Companii și sponsorizări",
    tip: "imbunatatire",
    link: "instrumente",
    cumFolosesti: "Înainte să trimiți prezentarea unei firme, pune numele și telefonul colegei care o sună și descarcă PDF-ul.",
  },
  {
    id: "2026-11-04-agent-email-companii",
    data: "2026-11-04",
    titlu: "Agent email către companii (IMPACT)",
    descriere: "AI-ul (pe contul tău Anthropic) scrie ciorne pentru firmele tale; tu le corectezi și le aprobi, iar emailul pleacă din propria ta căsuță, cu semnătura ta și One Pager-ul atașat. Răspunsurile se citesc din aceeași căsuță și se etichetează; fără răspuns în 5 zile lucrătoare primești o revenire și scriptul de apel. Nimic nu pleacă fără apăsarea ta.",
    categorie: "Strângere de fonduri",
    tip: "nou",
    link: "agent-email",
    cumFolosesti: "Conectează-ți căsuța în Setări, alege zece firme cu persoană de contact și lasă AI-ul să scrie ciornele; corectezi două rânduri, apeși „Trimite” și vezi răspunsurile în fila „Azi”.",
  },
  {
    id: "2026-11-04-influenceri",
    data: "2026-11-04",
    titlu: "Influenceri: fișe, linkuri unice și rezultate",
    descriere: "Pentru pachetul IMPACT: ții evidența creatorilor de conținut pe care îi rogi să distribuie campaniile, pregătești mesajul cu un link unic (AI pe contul tău Anthropic sau șablon) și îl trimiți tu, manual. Vezi clicurile și donațiile încasate pe fiecare link, cu verificări și reveniri programate.",
    categorie: "Strângere de fonduri",
    tip: "nou",
    link: "influenceri",
    cumFolosesti: "Alege o campanie urgentă, pregătește mesajul pentru zece creatori potriviți și urmărește care link aduce donații.",
  },
  {
    id: "2026-10-30-cod-qr-stand-eveniment",
    data: "2026-10-30",
    titlu: "Cod QR pentru stand sau eveniment",
    descriere: "În generatorul de linkuri din „Statistici și surse” vezi acum codul QR al fiecărui link, îl afișezi pe tot ecranul telefonului sau îl descarci pentru afiș. Noul tip „Stand sau eveniment” numără separat donațiile venite de la fiecare eveniment.",
    categorie: "Strângere de fonduri",
    tip: "nou",
    link: "surse",
    cumFolosesti: "La un stand sau o gală, dă fiecărui eveniment propriul nume de campanie și vezi după aceea care a adus cele mai multe donații.",
  },
  {
    id: "2026-10-30-doneaza-lunar-dupa-donatie",
    data: "2026-10-30",
    titlu: "Donatorii unici sunt invitați să doneze lunar",
    descriere: "După o donație unică, fereastra de mulțumire propune o donație lunară mică (aproximativ un sfert din suma donată, între 10 și 50 de lei) și deschide formularul cu suma deja completată. Fereastra nu se mai închide singură, ca donatorul să apuce să aleagă.",
    categorie: "Donatori",
    tip: "imbunatatire",
    link: "strangere-fonduri",
    cumFolosesti: "Invitația la donație lunară apare exact când donatorul tocmai a donat, fără să mai trimiți ceva separat.",
  },
  {
    id: "2026-10-30-centrul-de-inovare-raspuns-in-termen",
    data: "2026-10-30",
    titlu: "Centrul de inovare: idei mai clare și răspuns în 5 zile lucrătoare",
    descriere:
      "Spui ce vrei să crești cu ideea ta (donații recurente, Formular 230, D177…), vezi starea ei în șase pași, primești răspuns în 5 zile lucrătoare și afli pe email când se lucrează la o idee votată de organizația ta. Poți raporta o idee cu date personale, iar ideile nu mai acceptă emailuri, telefoane sau CNP-uri.",
    categorie: "Platformă",
    tip: "imbunatatire",
    link: "inovare",
    cumFolosesti: "Alege la fiecare idee ce vrei să crești: ideile care ajută direct la donații, 3,5% sau D177 trec în față.",
  },
  {
    id: "2026-10-30-centrul-de-inovare",
    data: "2026-10-30",
    titlu: "Centrul de inovare în fundraising",
    descriere: "Propune ideile tale pentru platformă, votează ideile altor ONG-uri și vezi ce am făcut deja. Voturile ne ajută să alegem ce construim întâi; decizia finală rămâne a echipei.",
    categorie: "Platformă",
    tip: "nou",
    link: "inovare",
  },
  {
    id: "2026-10-29-calendar-programari",
    data: "2026-10-29",
    titlu: "Calendar de programări în Alexandrit",
    descriere: "Programezi o consultanță 1 la 1 direct din platformă, fără cont sau cookie-uri externe: alegi ziua și ora, primești confirmare pe email și fișier pentru calendar.",
    categorie: "Platformă",
    tip: "nou",
    link: "consultanta",
  },
  {
    id: "2026-10-29-statistici-si-surse",
    data: "2026-10-29",
    titlu: "Statistici și surse: de unde vin donatorii",
    descriere: "Vezi dacă vizitatorii vin din postări obișnuite sau din reclame, câți donează sau trimit Formularul 230 și ce sursă a adus fiecare donație. Include generator de linkuri pentru postări, reclame, newslettere și coduri QR.",
    categorie: "Strângere de fonduri",
    tip: "nou",
    link: "surse",
    cumFolosesti: "Compară sursele și pune bugetul de promovare pe cele care aduc donații, nu doar vizite.",
  },
  {
    id: "2026-10-28-telefon-si-tableta",
    data: "2026-10-28",
    titlu: "Platforma, mai comodă pe telefon și tabletă",
    descriere: "Butoane și câmpuri mai ușor de atins, ferestre care nu mai acoperă tastatura și meniuri care încap pe ecran, în tot panoul și în formularul 230.",
    categorie: "Platformă",
    tip: "imbunatatire",
  },
  {
    id: "2026-10-28-crm-companii-impact",
    data: "2026-10-28",
    titlu: "CRM Companii: sume estimate din bilanț și ferestre fiscale",
    descriere: "Pentru pachetul IMPACT: estimăm cât ar putea redirecționa o firmă din bilanțul ei, vezi firmele eligibile pentru D177 și termenele fiscale, cu liste și filtre pentru ce ai de făcut azi. Conectare cu Waalaxy pentru LinkedIn.",
    categorie: "Companii și sponsorizări",
    tip: "nou",
    link: "companii",
    cumFolosesti: "Înainte de fereastra D177, începe cu firmele eligibile cu suma estimată cea mai mare.",
  },
  {
    id: "2026-10-24-igiena-liste-donatori-360",
    data: "2026-10-24",
    titlu: "Fișa donatorului 360°, liste de email curate și câmpuri personalizate",
    descriere: "O singură fișă cu tot istoricul unui donator, igiena listelor de email (adrese greșite sau care resping mesajele), câmpuri personalizate pentru ce contează la tine și API public cu webhook-uri pentru integrări.",
    categorie: "Donatori",
    tip: "nou",
    link: "donatori",
  },
  {
    id: "2026-10-24-parcursuri-donatori",
    data: "2026-10-24",
    titlu: "Parcursuri pentru donatori",
    descriere: "Mesaje automate pentru Welcome, Save, Upgrade și Reactivare, cu rezultate pe parcurs (conversie, zile, venit) și ore de liniște între 9:00 și 19:00.",
    categorie: "Donatori",
    tip: "nou",
    link: "donatori",
    cumFolosesti: "Pornește Reactivare pentru donatorii care n-au mai donat de un an și urmărește câți revin.",
  },
  {
    id: "2026-10-24-import-curat",
    data: "2026-10-24",
    titlu: "Import curat de donatori",
    descriere: "La import se corectează emailurile și telefoanele și se semnalează dublurile, cu confirmare înainte de salvare.",
    categorie: "Import și export",
    tip: "imbunatatire",
    link: "donatori",
  },
  {
    id: "2026-10-22-modul-analiza-donator",
    data: "2026-10-22",
    titlu: "Analiza donatorului și alte module de inteligență (IMPACT)",
    descriere: "Risc de pierdere, ritm de donare și recomandări, calculate din datele organizației tale, fără servicii externe.",
    categorie: "Donatori",
    tip: "nou",
    link: "donatori",
  },
  {
    id: "2026-10-22-nota-ce-inseamna-crm",
    data: "2026-10-22",
    titlu: "„Ce înseamnă CRM?” pe înțelesul tuturor",
    descriere: "O notă scurtă, cu exemple, care explică ce poți face într-un CRM, afișată în paginile principale.",
    categorie: "Platformă",
    tip: "imbunatatire",
  },
];
