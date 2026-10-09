// Metadatele metricilor CRM pentru rezultate-cheie (etichete, formule, limite de atribuire) — fără SQL, importabile și din browser.
// Calculul efectiv e în lib/performanta-surse.ts.

export type MetricaCrm = { id: string; eticheta: string; unitate: string; formula: string; limite: string; snapshot?: boolean };

export const METRICI_CRM: MetricaCrm[] = [
  {
    id: "incasari_totale",
    eticheta: "Încasări din donații (lei)",
    unitate: "lei",
    formula: "Suma donațiilor reușite din perioadă (online, înregistrate de echipă și importate), după rambursări.",
    limite: "Nu include promisiuni, contracte de sponsorizare nesemnate sau banii de la ANAF din D177 (alt flux). Nu e atribuit unei persoane.",
  },
  { id: "incasari_recurente", eticheta: "Încasări din donații lunare (lei)", unitate: "lei", formula: "Suma încasărilor care provin din abonamente lunare, în perioadă.", limite: "Doar donațiile online recurente. Nu e atribuit unei persoane." },
  { id: "donatii_nr", eticheta: "Număr de donații", unitate: "donații", formula: "Câte donații reușite au avut loc în perioadă.", limite: "O donație lunară încasată de 3 ori în perioadă se numără de 3 ori." },
  { id: "donatori_noi", eticheta: "Donatori noi", unitate: "donatori", formula: "Donatori a căror PRIMĂ donație din platformă cade în perioadă.", limite: "Un donator care a mai donat înainte (inclusiv prin import) nu e nou." },
  {
    id: "retentie_donatori",
    eticheta: "Retenția donatorilor",
    unitate: "%",
    formula: "Dintre donatorii care au donat în cele 12 luni de dinaintea perioadei, ce procent au donat din nou în perioadă.",
    limite: "Dacă n-a existat niciun donator în cele 12 luni anterioare, valoarea lipsește (nu 0%).",
  },
  { id: "donatori_lunari_activi", eticheta: "Donatori lunari activi (acum)", unitate: "donatori", formula: "Donatori cu un abonament lunar activ în momentul calculului.", limite: "Valoare de moment, nu istorică.", snapshot: true },
  { id: "sponsorizari_inregistrate", eticheta: "Sponsorizări înregistrate (lei)", unitate: "lei", formula: "Suma sponsorizărilor înregistrate în CRM Companii, cu data în perioadă.", limite: "CRM Companii nu separă încă promisiunea, contractul și încasarea: suma e a sponsorizărilor înregistrate, nu neapărat încasate." },
  { id: "sponsorizari_nr", eticheta: "Număr de sponsorizări înregistrate", unitate: "sponsorizări", formula: "Câte sponsorizări au fost înregistrate în CRM Companii în perioadă.", limite: "Vezi limita de la „Sponsorizări înregistrate”." },
  {
    id: "completitudine_date_donatori",
    eticheta: "Completitudinea datelor donatorilor",
    unitate: "%",
    formula: "Procentul donatorilor care au telefon, localitate și județ completate.",
    limite: "Valoare de moment. Donatorii fără donații nu sunt excluși.",
    snapshot: true,
  },
];
export const METRICA_PE_ID = new Map(METRICI_CRM.map((m) => [m.id, m]));
