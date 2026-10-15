// Dicționarul de metrici afișat în pagină („Cum se calculează”). O singură sursă, ca textele din tooltips, din instrucțiuni și din export să nu diverge.

export type DefinitieMetrica = { cheie: string; nume: string; formula: string; nota?: string };

export const DICTIONAR_METRICI: DefinitieMetrica[] = [
  { cheie: "cheltuieli", nume: "Cheltuieli reclame", formula: "Suma costurilor raportate sau importate pentru perioadă, convertite în lei.", nota: "Baza costului e cea din sursă (de obicei fără TVA); taxele nu sunt adăugate." },
  { cheie: "donatii", nume: "Donații confirmate atribuite reclamelor", formula: "Numărul plăților confirmate de procesator (webhook) la care ultimul clic eligibil a fost dintr-o reclamă plătită, în fereastra aleasă.", nota: "Un clic pe „Donează”, crearea sesiunii de plată sau pagina de mulțumire nu numără. Atribuirea e o regulă de asociere, nu o dovadă că reclama a produs donația." },
  { cheie: "brut", nume: "Valoare brută atribuită", formula: "Suma donațiilor confirmate atribuite, înainte de rambursări." },
  { cheie: "net", nume: "Valoare netă atribuită", formula: "Valoare brută − rambursările (parțiale sau totale) de la procesator.", nota: "Comisioanele procesatorului nu sunt scăzute: nu sunt păstrate pe donație. Valoarea netă e deci un maxim, nu suma care ajunge efectiv în cont." },
  { cheie: "cpa", nume: "Cost per donație", formula: "Cheltuieli ÷ numărul donațiilor confirmate atribuite.", nota: "Fără donații, indicatorul nu se afișează (nu e zero)." },
  { cheie: "cpn", nume: "Cost per donator nou", formula: "Cheltuieli ÷ donatorii noi atribuiți. „Nou” = niciun alt rând confirmat anterior cu același e-mail în organizație.", nota: "Un donator fără e-mail rămâne neclasificat; nu devine automat nou." },
  { cheie: "roas-brut", nume: "ROAS brut", formula: "Valoare brută atribuită ÷ cheltuieli (lei donați la 1 leu cheltuit)." },
  { cheie: "roas-net", nume: "ROAS net", formula: "Valoare netă atribuită ÷ cheltuieli (lei donați la 1 leu cheltuit)." },
  { cheie: "ramas", nume: "Rămas după reclame", formula: "Valoare netă atribuită − cheltuieli.", nota: "Nu e profit: nu include comisioanele procesatorului, munca echipei sau alte costuri." },
  { cheie: "medie", nume: "Valoarea medie a donației", formula: "Valoare brută atribuită ÷ numărul donațiilor confirmate atribuite." },
  { cheie: "recurente", nume: "Încasat ulterior de abonamentele atribuite", formula: "Suma reînnoirilor confirmate ale abonamentelor a căror primă plată a fost atribuită, încasate după prima plată.", nota: "Reînnoirile nu primesc atribuire proprie și nu sunt incluse în indicatorii de mai sus; se arată separat." },
  { cheie: "perioada", nume: "Perioada raportului", formula: "Donațiile se raportează la data donației (ora României); costurile, la ziua raportată de sursă. E un „ROAS de perioadă”, nu o analiză pe cohortă de clicuri.", nota: "Dacă o donație vine după mai multe zile de la clic, apare în perioada donației, nu în cea a cheltuielii." },
];

export const NOTE_LIMITE: string[] = [
  "Donațiile făcute fără parametri UTM și fără acord pentru statistici (acces direct, aplicații care taie parametrii, alt dispozitiv) rămân neatribuite. Cifrele sunt un minim verificabil, nu totalul real al efectului reclamelor.",
  "Conversiile raportate de platformele de reclame (Meta, TikTok, LinkedIn) nu sunt incluse și nu se adună cu cele de aici: aceeași donație poate fi revendicată de mai multe platforme.",
  "Un clic înseamnă o vizită cu parametri UTM; vizualizările de reclamă fără clic nu sunt măsurate.",
  "Donațiile prin transfer bancar sau SMS nu au un clic asociat și apar ca neatribuite.",
];
