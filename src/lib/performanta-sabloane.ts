import type { FrecventaActualizare, Metoda, TipTinta } from "@/lib/performanta-masurare";

// Șabloane de obiective pe roluri, pornind de la echipa unui ONG de fundraising. Sunt PUNCTE DE PLECARE: țintele sunt exemple, nu
// recomandări sau norme, și trebuie ajustate după situația organizației. Fiecare rezultat-cheie spune ce măsoară (formula), de unde vine
// valoarea și până unde merge atribuirea. Metricile din CRM sunt ale organizației, nu ale unei persoane: șablonul o spune explicit.

export type KrSablon = {
  titlu: string;
  metoda: Metoda;
  tipTinta: TipTinta;
  unitate?: string;
  nivelInitial?: number | null;
  tinta: number | null;
  tintaMax?: number | null;
  pondere: number;
  sursa: "manual" | "crm";
  metrica?: string;
  frecventa: FrecventaActualizare;
  formula: string;
  reguli?: string;
  atribuire: string;
};

export type ObiectivSablon = { titlu: string; descriere: string; rezultate: KrSablon[] };

export type SablonRol = {
  id: string;
  rol: string;
  rezumat: string;
  obiective: ObiectivSablon[];
};

export const NOTA_EXEMPLU = "Țintă de exemplu: ajustează-o înainte să fie folosită.";

const COMUN = "Contribuție comună a echipei; nu se atribuie unei singure persoane.";

export const SABLOANE_ROLURI: SablonRol[] = [
  {
    id: "conducere",
    rol: "Conducere și parteneriate",
    rezumat: "Parteneriate strategice, direcția organizației și deciziile care nu trebuie să aștepte.",
    obiective: [
      {
        titlu: "Consolidăm parteneriatele strategice",
        descriere: "Mai puține relații, dar solide: parteneri care rămân și susțin organizația de la an la an.",
        rezultate: [
          { titlu: "Parteneriate strategice semnate", metoda: "crescator", tipTinta: "cumulativ", unitate: "parteneriate", nivelInitial: 0, tinta: 3, pondere: 3, sursa: "manual", frecventa: "lunar", formula: "Numărul de parteneriate cu acord semnat de ambele părți, în perioadă.", reguli: "Exclude intențiile și discuțiile în curs.", atribuire: "Rezultat al conducerii. Contribuția echipei de companii se discută în 1:1, nu se împarte automat." },
          { titlu: "Întâlniri cu parteneri potențiali", metoda: "crescator", tipTinta: "cumulativ", unitate: "întâlniri", nivelInitial: 0, tinta: 12, pondere: 1, sursa: "manual", frecventa: "saptamanal", formula: "Întâlniri (online sau față în față) cu decidenți din organizații sau companii.", reguli: "Fără apeluri scurte de curtoazie.", atribuire: "Întâlnirile la care persoana a participat efectiv." },
        ],
      },
      {
        titlu: "Direcție clară și decizii la timp",
        descriere: "Consiliul știe unde suntem, iar echipa nu așteaptă după decizii.",
        rezultate: [
          { titlu: "Raportul trimestrial către consiliu predat", metoda: "binar", tipTinta: "periodic", tinta: 1, pondere: 2, sursa: "manual", frecventa: "trimestrial", formula: "Raportul e trimis consiliului până la termenul stabilit.", atribuire: "Responsabilitatea predării aparține persoanei; datele vin de la toată echipa." },
          { titlu: "Decizii în așteptare de peste 5 zile lucrătoare", metoda: "descrescator", tipTinta: "periodic", unitate: "decizii", nivelInitial: 8, tinta: 2, pondere: 2, sursa: "manual", frecventa: "saptamanal", formula: "Blocaje marcate „necesită decizie” rămase deschise peste 5 zile lucrătoare (vezi Prezentare generală).", atribuire: "Depinde și de cei care trebuie să decidă; se discută cauzele, nu se judecă numărul." },
        ],
      },
    ],
  },
  {
    id: "fundraising_pr",
    rol: "Fundraising și PR",
    rezumat: "Campanii lansate la timp, încasări și vizibilitate în presă.",
    obiective: [
      {
        titlu: "Campanii care ajung la oameni",
        descriere: "Campanii planificate, lansate la termen și care aduc donații.",
        rezultate: [
          { titlu: "Campanii lansate la termen", metoda: "crescator", tipTinta: "cumulativ", unitate: "campanii", nivelInitial: 0, tinta: 3, pondere: 2, sursa: "manual", frecventa: "lunar", formula: "Campanii publicate în ziua planificată sau mai devreme.", reguli: "O campanie întârziată cu o zi sau mai mult nu se numără.", atribuire: "Persoana care a coordonat campania; contribuția colegilor se menționează, nu se împarte." },
          { titlu: "Încasări din donații", metoda: "crescator", tipTinta: "cumulativ", unitate: "lei", nivelInitial: 0, tinta: 150000, pondere: 3, sursa: "crm", metrica: "incasari_totale", frecventa: "zilnic", formula: "Suma donațiilor reușite din perioadă (online, înregistrate și importate), după rambursări.", reguli: "Fără promisiuni și fără banii din D177.", atribuire: `Încasările organizației, nu ale unei persoane. ${COMUN}` },
        ],
      },
      {
        titlu: "Vizibilitate în presă",
        descriere: "Povestea organizației ajunge în publicații și la emisiuni care contează.",
        rezultate: [
          { titlu: "Apariții în presă", metoda: "crescator", tipTinta: "cumulativ", unitate: "apariții", nivelInitial: 0, tinta: 8, pondere: 2, sursa: "manual", frecventa: "lunar", formula: "Articole sau emisiuni care menționează organizația, cu link ca dovadă la actualizare.", reguli: "Fără republicări ale aceluiași material.", atribuire: "Apariții obținute prin munca persoanei sau a echipei de comunicare." },
          { titlu: "Comunicate de presă trimise", metoda: "crescator", tipTinta: "cumulativ", unitate: "comunicate", nivelInitial: 0, tinta: 4, pondere: 1, sursa: "manual", frecventa: "lunar", formula: "Comunicate trimise către listele de presă ale organizației.", atribuire: "Comunicatele redactate sau coordonate de persoană." },
        ],
      },
    ],
  },
  {
    id: "companii_voluntari",
    rol: "Companii și voluntari",
    rezumat: "Relația cu companiile sponsor și activarea voluntarilor.",
    obiective: [
      {
        titlu: "Dezvoltăm parteneriatele cu companii",
        descriere: "Mai multe companii care cunosc organizația și o sprijină.",
        rezultate: [
          { titlu: "Companii noi contactate", metoda: "crescator", tipTinta: "cumulativ", unitate: "companii", nivelInitial: 0, tinta: 40, pondere: 1, sursa: "manual", frecventa: "saptamanal", formula: "Companii cu care s-a luat un prim contact documentat în CRM, în perioadă.", reguli: "O companie contactată de două ori se numără o dată.", atribuire: "Contactele făcute de persoană." },
          { titlu: "Întâlniri cu companii", metoda: "crescator", tipTinta: "cumulativ", unitate: "întâlniri", nivelInitial: 0, tinta: 15, pondere: 2, sursa: "manual", frecventa: "saptamanal", formula: "Întâlniri cu reprezentanți ai companiilor, online sau față în față.", atribuire: "Întâlnirile la care persoana a participat." },
          { titlu: "Sponsorizări înregistrate", metoda: "crescator", tipTinta: "cumulativ", unitate: "lei", nivelInitial: 0, tinta: 80000, pondere: 3, sursa: "crm", metrica: "sponsorizari_inregistrate", frecventa: "zilnic", formula: "Suma sponsorizărilor înregistrate în CRM Companii, cu data în perioadă.", reguli: "CRM-ul nu separă promisiunea, contractul și încasarea: suma e a celor înregistrate, nu neapărat încasate. D177 și sponsorizarea directă se urmăresc separat, nu se adună.", atribuire: `Toate sponsorizările înregistrate ale organizației. ${COMUN}` },
        ],
      },
      {
        titlu: "Voluntari activi",
        descriere: "O comunitate de voluntari care chiar face lucruri, nu doar e înscrisă.",
        rezultate: [
          { titlu: "Voluntari activi în perioadă", metoda: "crescator", tipTinta: "periodic", unitate: "voluntari", nivelInitial: 10, tinta: 25, pondere: 2, sursa: "manual", frecventa: "lunar", formula: "Voluntari care au făcut cel puțin o activitate în perioadă.", reguli: "Fără voluntarii doar înscriși.", atribuire: "Rezultatul programului de voluntari, la care contribuie mai mulți colegi." },
          { titlu: "Ore de voluntariat raportate", metoda: "crescator", tipTinta: "cumulativ", unitate: "ore", nivelInitial: 0, tinta: 300, pondere: 1, sursa: "manual", frecventa: "lunar", formula: "Suma orelor raportate de voluntari în perioadă.", atribuire: "Al programului de voluntari." },
        ],
      },
    ],
  },
  {
    id: "donatori_pf",
    rol: "Donatori persoane fizice",
    rezumat: "Relația cu donatorii: mulțumiri, retenție, donatori lunari și date curate.",
    obiective: [
      {
        titlu: "Păstrăm donatorii",
        descriere: "Donatorii se simt văzuți și rămân alături de organizație.",
        rezultate: [
          { titlu: "Retenția donatorilor", metoda: "crescator", tipTinta: "periodic", unitate: "%", nivelInitial: 55, tinta: 70, pondere: 3, sursa: "crm", metrica: "retentie_donatori", frecventa: "zilnic", formula: "Dintre donatorii din cele 12 luni dinaintea perioadei, ce procent au donat din nou în perioadă.", reguli: "Dacă nu a existat niciun donator în cele 12 luni anterioare, valoarea lipsește (nu 0%).", atribuire: `Rezultat al organizației. ${COMUN}` },
          { titlu: "Donatori lunari activi", metoda: "crescator", tipTinta: "periodic", unitate: "donatori", nivelInitial: 450, tinta: 600, pondere: 2, sursa: "crm", metrica: "donatori_lunari_activi", frecventa: "zilnic", formula: "Donatori cu un abonament lunar activ în momentul calculului.", reguli: "Valoare de moment, nu istorică.", atribuire: `Rezultat al organizației. ${COMUN}` },
          { titlu: "Donatori mulțumiți în 48 de ore", metoda: "crescator", tipTinta: "periodic", unitate: "%", nivelInitial: 60, tinta: 90, pondere: 2, sursa: "manual", frecventa: "lunar", formula: "Procentul donațiilor de cel puțin 100 de lei pentru care s-a trimis mulțumire în 48 de ore.", reguli: "Se numără donațiile reușite; mulțumirea poate fi telefon, mesaj sau email.", atribuire: "Mulțumirile trimise de persoană." },
        ],
      },
      {
        titlu: "Aducem donatori noi",
        descriere: "Baza de donatori crește, iar datele lor sunt suficient de complete ca să-i putem mulțumi.",
        rezultate: [
          { titlu: "Donatori noi", metoda: "crescator", tipTinta: "cumulativ", unitate: "donatori", nivelInitial: 0, tinta: 150, pondere: 2, sursa: "crm", metrica: "donatori_noi", frecventa: "zilnic", formula: "Donatori a căror primă donație din platformă cade în perioadă.", reguli: "Un donator care a mai donat înainte (inclusiv prin import) nu e nou.", atribuire: `Rezultat al organizației, la care contribuie campaniile și comunicarea. ${COMUN}` },
          { titlu: "Completitudinea datelor donatorilor", metoda: "crescator", tipTinta: "periodic", unitate: "%", nivelInitial: 70, tinta: 90, pondere: 1, sursa: "crm", metrica: "completitudine_date_donatori", frecventa: "zilnic", formula: "Procentul donatorilor cu telefon, localitate și județ completate.", reguli: "Valoare de moment.", atribuire: "Se îmbunătățește prin munca persoanei, dar și prin formularele de donație." },
        ],
      },
    ],
  },
  {
    id: "video_live",
    rol: "Video și live",
    rezumat: "Videoclipuri și transmisiuni live livrate la timp, care țin atenția oamenilor.",
    obiective: [
      {
        titlu: "Conținut video care sprijină campaniile",
        descriere: "Clipuri și transmisiuni care spun povestea și duc oamenii spre donație.",
        rezultate: [
          { titlu: "Videoclipuri publicate", metoda: "crescator", tipTinta: "cumulativ", unitate: "videoclipuri", nivelInitial: 0, tinta: 12, pondere: 2, sursa: "manual", frecventa: "lunar", formula: "Videoclipuri publicate pe canalele organizației în perioadă.", reguli: "Fără scurtele repostate din alte clipuri.", atribuire: "Clipurile produse de persoană." },
          { titlu: "Durata medie de vizionare", metoda: "interval", tipTinta: "periodic", unitate: "%", tinta: 40, tintaMax: 70, pondere: 1, sursa: "manual", frecventa: "lunar", formula: "Procentul din durata clipului vizionat în medie, din statistica platformei.", reguli: "Se compară clipuri de lungime asemănătoare.", atribuire: "Depinde de subiect și de distribuție, nu doar de realizare; se citește ca semnal, nu ca notă." },
          { titlu: "Transmisiuni live realizate", metoda: "crescator", tipTinta: "cumulativ", unitate: "transmisiuni", nivelInitial: 0, tinta: 4, pondere: 1, sursa: "manual", frecventa: "lunar", formula: "Transmisiuni live difuzate până la capăt.", atribuire: "Transmisiunile la care persoana a fost responsabilă de realizare." },
        ],
      },
      {
        titlu: "Livrăm la timp",
        descriere: "Echipa se poate baza pe materialele video în calendarul campaniilor.",
        rezultate: [{ titlu: "Materiale video predate la termen", metoda: "crescator", tipTinta: "periodic", unitate: "%", nivelInitial: 70, tinta: 90, pondere: 2, sursa: "manual", frecventa: "lunar", formula: "Procentul materialelor predate până la termenul din planul campaniei.", reguli: "Termenul rămâne cel agreat; mutările făcute de alții nu se socotesc întârziere.", atribuire: "Materialele realizate de persoană." }],
      },
    ],
  },
  {
    id: "date_rapoarte",
    rol: "Statistici, rapoarte și LinkedIn",
    rezumat: "Rapoarte corecte și predate la timp, plus prezența organizației pe LinkedIn.",
    obiective: [
      {
        titlu: "Rapoarte corecte și la timp",
        descriere: "Sponsorii primesc cifre corecte, la data promisă.",
        rezultate: [
          { titlu: "Rapoarte de sponsor predate la termen", metoda: "crescator", tipTinta: "cumulativ", unitate: "rapoarte", nivelInitial: 0, tinta: 10, pondere: 3, sursa: "manual", frecventa: "lunar", formula: "Rapoarte trimise sponsorilor până la termenul din contract sau din plan.", atribuire: "Rapoartele pregătite de persoană; datele vin de la toată echipa." },
          { titlu: "Neconcordanțe găsite după predare", metoda: "descrescator", tipTinta: "cumulativ", unitate: "neconcordanțe", nivelInitial: 5, tinta: 0, pondere: 2, sursa: "manual", frecventa: "lunar", formula: "Diferențe dintre raport și datele din CRM, descoperite de altcineva după predare.", reguli: "Se notează doar cele confirmate.", atribuire: "Depinde și de calitatea datelor introduse de colegi." },
          { titlu: "Raportul anual de impact publicat", metoda: "binar", tipTinta: "periodic", tinta: 1, pondere: 2, sursa: "manual", frecventa: "trimestrial", formula: "Raportul anual e publicat pe site până la data stabilită.", atribuire: "Coordonat de persoană, cu contribuția întregii echipe." },
        ],
      },
      {
        titlu: "Prezență pe LinkedIn",
        descriere: "Organizația e văzută de oamenii și companiile care o pot susține.",
        rezultate: [
          { titlu: "Postări publicate pe LinkedIn", metoda: "crescator", tipTinta: "cumulativ", unitate: "postări", nivelInitial: 0, tinta: 24, pondere: 1, sursa: "manual", frecventa: "saptamanal", formula: "Postări publicate pe pagina organizației în perioadă.", atribuire: "Postările pregătite sau publicate de persoană." },
          { titlu: "Rata medie de interacțiune", metoda: "interval", tipTinta: "periodic", unitate: "%", tinta: 2, tintaMax: 6, pondere: 1, sursa: "manual", frecventa: "lunar", formula: "Interacțiuni împărțite la afișări, în medie pe postările din perioadă, din statistica LinkedIn.", reguli: "Se compară perioade de lungime egală.", atribuire: "Depinde de conținut și de algoritm; se citește ca semnal, nu ca notă." },
        ],
      },
    ],
  },
];

export const SABLON_PE_ID = new Map(SABLOANE_ROLURI.map((s) => [s.id, s]));

// ───────── Ținte stabilite de organizație ─────────
// Organizația poate înlocui țintele-exemplu cu cele agreate cu echipa. Se păstrează doar valorile introduse de ea (per titlu de rezultat-cheie),
// iar șablonul poate fi marcat „confirmat”: obiectivele create din el nu mai poartă nota de „țintă de exemplu”.

export type TintaOrg = { tinta: number | null; tintaMax: number | null; nivelInitial: number | null };
export type SetariSablon = { confirmat: boolean; confirmatLa: string | null; tinte: Record<string, TintaOrg> };
export type SetariSabloane = Record<string, SetariSablon>;
export type SablonEfectiv = SablonRol & { confirmat: boolean; confirmatLa: string | null; personalizat: boolean; tinteOrg: Record<string, TintaOrg> };

export const NOTA_CONFIRMAT = "Ținte stabilite cu echipa.";

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

// Verifică țintele propuse pentru un șablon; returnează textul erorii sau null.
export function valideazaTinte(sablon: SablonRol, tinte: Record<string, TintaOrg>): string | null {
  const krs = sablon.obiective.flatMap((o) => o.rezultate);
  for (const [titlu, t] of Object.entries(tinte)) {
    const kr = krs.find((k) => k.titlu === titlu);
    if (!kr) return `„${titlu}” nu face parte din șablon.`;
    if (kr.metoda === "binar") continue;
    if (num(t.tinta) === null) return `Completează ținta pentru „${titlu}”.`;
    if (Math.abs(t.tinta as number) > 1e9) return `Ținta pentru „${titlu}” e prea mare.`;
    if (kr.metoda === "interval") {
      if (num(t.tintaMax) === null) return `Completează ambele limite pentru „${titlu}”.`;
      if ((t.tintaMax as number) < (t.tinta as number)) return `Pentru „${titlu}”, limita de sus trebuie să fie cel puțin cât cea de jos.`;
    }
    if (t.nivelInitial !== null && num(t.nivelInitial) === null) return `Nivelul de pornire pentru „${titlu}” nu e un număr.`;
  }
  return null;
}

// Șablonul cu țintele organizației aplicate peste cele din exemplu.
export function sablonEfectiv(sablon: SablonRol, setari: SetariSablon | undefined): SablonEfectiv {
  const tinte = setari?.tinte ?? {};
  return {
    ...sablon,
    confirmat: Boolean(setari?.confirmat),
    confirmatLa: setari?.confirmatLa ?? null,
    personalizat: Object.keys(tinte).length > 0,
    tinteOrg: tinte,
    obiective: sablon.obiective.map((o) => ({
      ...o,
      rezultate: o.rezultate.map((r) => {
        const t = tinte[r.titlu];
        if (!t || r.metoda === "binar") return r;
        return { ...r, tinta: t.tinta, tintaMax: r.metoda === "interval" ? t.tintaMax : (r.tintaMax ?? null), nivelInitial: r.metoda === "interval" ? null : t.nivelInitial };
      }),
    })),
  };
}
