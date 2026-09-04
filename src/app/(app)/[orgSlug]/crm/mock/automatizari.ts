export type PasAutomatizare = {
  tip: "declansator" | "conditie" | "asteptare" | "actiune" | "ramificatie";
  titlu: string;
  detaliu: string;
};

export type Automatizare = {
  id: string;
  nume: string;
  descriere: string;
  activa: boolean;
  declansariLunar: number;
  pasi: PasAutomatizare[];
};

export const AUTOMATIZARI: Automatizare[] = [
  {
    id: "auto-1",
    nume: "Mulțumire după prima donație",
    descriere: "Trimite un email personalizat imediat ce un donator nou contribuie pentru prima dată.",
    activa: true,
    declansariLunar: 18,
    pasi: [
      { tip: "declansator", titlu: "Donație nouă înregistrată", detaliu: "Se declanșează la orice donație nouă" },
      { tip: "conditie", titlu: "Este prima donație a donatorului?", detaliu: "Verifică istoricul donatorului" },
      { tip: "asteptare", titlu: "Așteaptă 1 oră", detaliu: "Timp de procesare a plății" },
      { tip: "actiune", titlu: "Trimite email de mulțumire", detaliu: "Șablon „Bun venit + mulțumire”" },
    ],
  },
  {
    id: "auto-2",
    nume: "Reactivare după 180 de zile",
    descriere: "Identifică donatorii inactivi de peste 6 luni și le trimite o campanie de reactivare.",
    activa: true,
    declansariLunar: 7,
    pasi: [
      { tip: "declansator", titlu: "Verificare zilnică", detaliu: "Rulează în fiecare noapte, 02:00" },
      { tip: "conditie", titlu: "Ultima donație > 180 zile", detaliu: "Filtrează segmentul „Inactiv”" },
      { tip: "actiune", titlu: "Trimite campanie de reactivare", detaliu: "Email cu poveste + CTA donație" },
    ],
  },
  {
    id: "auto-3",
    nume: "Aniversarea donatorului",
    descriere: "Marchează ziua în care s-a împlinit un an de la prima donație, cu un mesaj de mulțumire.",
    activa: false,
    declansariLunar: 4,
    pasi: [
      { tip: "declansator", titlu: "Aniversare 1 an de la prima donație", detaliu: "Calculat automat per donator" },
      { tip: "actiune", titlu: "Trimite mesaj de felicitare", detaliu: "Include un rezumat al impactului avut" },
    ],
  },
  {
    id: "auto-4",
    nume: "Plată recurentă eșuată",
    descriere: "Notifică donatorul și echipa când o donație recurentă nu poate fi procesată.",
    activa: true,
    declansariLunar: 3,
    pasi: [
      { tip: "declansator", titlu: "Plată recurentă eșuată", detaliu: "Webhook de la procesatorul de plăți" },
      { tip: "asteptare", titlu: "Așteaptă 1 zi", detaliu: "Lasă timp pentru reîncercare automată" },
      { tip: "actiune", titlu: "Trimite email + link actualizare card", detaliu: "Către donator" },
      { tip: "ramificatie", titlu: "Eșuează din nou?", detaliu: "Da → notifică echipa · Nu → închide" },
    ],
  },
  {
    id: "auto-5",
    nume: "Follow-up sponsorizare",
    descriere: "Creează automat un task când o oportunitate stă blocată prea mult într-o etapă.",
    activa: true,
    declansariLunar: 11,
    pasi: [
      { tip: "declansator", titlu: "Oportunitate fără activitate 14 zile", detaliu: "Verificare zilnică pe pipeline" },
      { tip: "actiune", titlu: "Creează task de follow-up", detaliu: "Alocat responsabilului oportunității" },
    ],
  },
  {
    id: "auto-6",
    nume: "Contract care expiră",
    descriere: "Avertizează din timp înainte ca un contract de sponsorizare să expire.",
    activa: true,
    declansariLunar: 2,
    pasi: [
      { tip: "declansator", titlu: "30 de zile înainte de expirare", detaliu: "Verificare zilnică pe contracte" },
      { tip: "actiune", titlu: "Notifică responsabilul", detaliu: "+ generează draft de reînnoire" },
    ],
  },
  {
    id: "auto-7",
    nume: "Raport de impact",
    descriere: "Generează și trimite automat un raport trimestrial fiecărui sponsor activ.",
    activa: false,
    declansariLunar: 1,
    pasi: [
      { tip: "declansator", titlu: "Sfârșit de trimestru", detaliu: "1 ianuarie / aprilie / iulie / octombrie" },
      { tip: "actiune", titlu: "Generează raport per sponsor", detaliu: "Include beneficiarii susținuți" },
      { tip: "actiune", titlu: "Trimite raportul", detaliu: "Către contactul principal al companiei" },
    ],
  },
  {
    id: "auto-8",
    nume: "Actualizare despre beneficiar",
    descriere: "Anunță automat sponsorii unui beneficiar când apare o actualizare nouă.",
    activa: true,
    declansariLunar: 6,
    pasi: [
      { tip: "declansator", titlu: "Actualizare publicată", detaliu: "Pe pagina unui beneficiar" },
      { tip: "conditie", titlu: "Beneficiarul are sponsori activi?", detaliu: "Verifică lista de sponsori" },
      { tip: "actiune", titlu: "Trimite actualizarea sponsorilor", detaliu: "Email cu textul + fotografiile noi" },
    ],
  },
];
