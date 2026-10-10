// Avatarele donatorilor construite din DATELE REALE ale organizației (donații online, înregistrate manual și importate).
// Logică pură (fără bază de date, fără React): primește cifre AGREGATE și întoarce grupuri comportamentale cu dovezi, interpretări,
// ipoteze de validat, recomandări și indicatori. Nu atinge persoane: nicio cifră nu descrie un donator anume.
//
// Reguli respectate aici:
//  - un avatar apare doar dacă grupul are cel puțin PRAG_MIN donatori (sub prag, nu se afișează nimic despre el);
//  - faptele (cifre) sunt separate de interpretare (ce pare să însemne) și de ipoteze (ce NU se poate deduce din date);
//  - motivațiile, emoțiile și situația personală nu se deduc: apar doar ca ipoteze, de validat cu donatorii;
//  - nu se deduce venitul sau averea din suma donată.

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

const pct = (parte: number, total: number) => (total > 0 ? Math.round((parte / total) * 100) : 0);
const lei = (n: number) => `${Math.round(n).toLocaleString("ro-RO")} lei`;
const zile = (n: number) => `${Math.round(n).toLocaleString("ro-RO")} ${Math.round(n) === 1 ? "zi" : "zile"}`;

const NUME_GRUP: Record<GrupCod, string> = {
  recurent: "Susținătorii lunari",
  fidel: "Donatorii care revin",
  major: "Contribuitorii mari",
  nou: "Donatorii noi",
  pauza: "Donatorii în pauză",
};
export const ORDINE_GRUPURI: GrupCod[] = ["recurent", "fidel", "major", "nou", "pauza"];

function fapteComune(g: GrupStat, baza: BazaStat): string[] {
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

function motivIncredere(nr: number, nivel: Incredere): string {
  const baza = `Grupul are ${nr.toLocaleString("ro-RO")} donatori`;
  if (nivel === "ridicat") return `${baza}: suficient pentru tipare stabile. Motivele rămân totuși ipoteze.`;
  if (nivel === "mediu") return `${baza}: tiparele sunt orientative, de confirmat în următoarele campanii.`;
  return `${baza}: grup mic, cifrele pot varia mult. Tratează concluziile ca ipoteze.`;
}

export function construiesteAvatare(date: DateAvatare): RezultatAvatare {
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
        grupuriMici.push({ nume: NUME_GRUP[id], nr: g.nr });
        continue;
      }
      const s = SABLOANE[id];
      avatare.push({
        id,
        nume: NUME_GRUP[id],
        etapa: s.etapa,
        dovada: s.dovada(g),
        nr: g.nr,
        procentBaza: pct(g.nr, baza.donatori),
        suma: g.suma,
        procentSuma: pct(g.suma, baza.suma),
        incredere: nivel,
        motivIncredere: motivIncredere(g.nr, nivel),
        fapte: [...fapteComune(g, baza), ...(s.fapteExtra?.(g, baza) ?? [])],
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
export function textFisa(a: Avatar): string {
  const lista = (titlu: string, items: string[]) => (items.length ? `${titlu}\n${items.map((i) => `- ${i}`).join("\n")}\n` : "");
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
