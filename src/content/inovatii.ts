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
//  - dinPropunere: true dacă vine dintr-o idee propusă de ONG-uri (apare eticheta „Propusă de ONG-uri”).

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
};

export const INOVATII: Inovatie[] = [
  {
    id: "2026-10-30-centrul-de-inovare",
    data: "2026-10-30",
    titlu: "Centrul de inovare în fundraising",
    descriere: "Propune ideile tale pentru platformă, votează ideile altor ONG-uri și vezi ce am făcut deja. Ce primește cele mai multe voturi ajunge în planul nostru.",
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
