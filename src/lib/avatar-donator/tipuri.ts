// Tipuri, valori implicite și configurația profilurilor pentru pagina „Avatar donator".
// Toate valorile numerice din formulare sunt păstrate ca text (cum le scrie omul) și interpretate în motor.ts.

export type Grad = "" | "masurat" | "estimat" | "ipoteza";
export const GRADE: { key: Exclude<Grad, "">; label: string; pondere: number }[] = [
  { key: "masurat", label: "Măsurat (date reale)", pondere: 1 },
  { key: "estimat", label: "Estimat", pondere: 0.6 },
  { key: "ipoteza", label: "Ipoteză", pondere: 0.3 },
];

export type Raspuns = { variante: string; text: string; grad: Grad; perioada: string; responsabil: string };
export const RASPUNS_GOL: Raspuns = { variante: "", text: "", grad: "", perioada: "", responsabil: "" };

export const CANALE = ["facebook", "instagram", "tiktok", "linkedin", "google"] as const;
export type CanalId = (typeof CANALE)[number];
export const CANAL_LABEL: Record<CanalId, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
  linkedin: "LinkedIn",
  google: "Google (Search / YouTube)",
};

// Linkurile către panourile de statistici ale fiecărei platforme (se deschid în tab nou, cu contul tău logat).
export const CANAL_STATISTICI_IMPLICIT: Record<CanalId, { eticheta: string; url: string }> = {
  facebook: { eticheta: "Meta Business Suite — Insights", url: "https://business.facebook.com/latest/insights/results" },
  instagram: { eticheta: "Meta Business Suite — Insights", url: "https://business.facebook.com/latest/insights/results" },
  tiktok: { eticheta: "TikTok Creator Center — Analytics", url: "https://www.tiktok.com/creator-center/analytics" },
  linkedin: { eticheta: "LinkedIn — pagina companiei (Analytics)", url: "https://www.linkedin.com/feed/" },
  google: { eticheta: "Google Analytics / YouTube Studio", url: "https://studio.youtube.com/" },
};

export type CanalDate = {
  profil: string; // linkul profilului/paginii organizației
  statistici: string; // linkul către panoul de statistici (analytics)
  urmaritori: string;
  reach30: string;
  engagement: string; // rata de interacțiune, %
  donatoriNoiPct: string; // % din donatorii noi care declară/arată acest canal (Q61)
  cpa: string; // cost mediu real per donator adus prin acest canal, lei
};
export const CANAL_GOL: CanalDate = { profil: "", statistici: "", urmaritori: "", reach30: "", engagement: "", donatoriNoiPct: "", cpa: "" };

export type Conversie = "" | "unica" | "recurenta" | "sms" | "lead" | "sponsorizare" | "distribuire";
export const CONVERSII: { key: Exclude<Conversie, "">; label: string }[] = [
  { key: "unica", label: "Donație unică" },
  { key: "recurenta", label: "Donație recurentă" },
  { key: "sms", label: "SMS" },
  { key: "lead", label: "Lead (date de contact)" },
  { key: "sponsorizare", label: "Sponsorizare" },
  { key: "distribuire", label: "Distribuire" },
];

export type Buget = {
  lunar: string; // buget lunar total de promovare (Q91), lei
  testPct: string; // % din buget rezervat pentru teste
  donatieUnica: string; // donația medie unică, lei (Q16)
  donatieLunara: string; // donația lunară medie a unui donator recurent, lei
  luniRecuperare: string; // în câte luni vrei să recuperezi costul de achiziție al unui donator recurent
  repetare: string; // din 100 de donatori unici, câți mai donează ulterior (%) — intră în valoarea pe 12 luni
  esantion: string; // câți donatori noi ai măsurat pe canale în ultimele ~90 de zile (mărimea eșantionului din „% din donatorii noi”)
};

export type Mix = { individual: string; recurent: string; companii: string; altele: string }; // % din obiectivul de venit (Q12)
export type Varste = { v18_24: string; v25_34: string; v35_44: string; v45_54: string; v55: string }; // % din donatori (Q41)
export const VARSTE_ETICHETE: Record<keyof Varste, string> = { v18_24: "18–24", v25_34: "25–34", v35_44: "35–44", v45_54: "45–54", v55: "55+" };

// ===== Profiluri (scor de potrivire pe segmente) =====
export type ProfilId = "A" | "B" | "C";
export type Criteriu = { key: string; label: string; max: number };
export const PROFILE: { id: ProfilId; titlu: string; criterii: Criteriu[] }[] = [
  {
    id: "A",
    titlu: "Profil A — Donator individual (donație unică)",
    criterii: [
      { key: "afinitate", label: "Afinitate cu misiunea", max: 20 },
      { key: "trigger", label: "Trigger și răspuns creativ", max: 15 },
      { key: "acces", label: "Acces prin canal și plată", max: 15 },
      { key: "valoare", label: "Valoare financiară realistă", max: 15 },
      { key: "incredere", label: "Încredere și dovadă", max: 15 },
      { key: "geografie", label: "Geografie și etapă de viață", max: 10 },
      { key: "recomandare", label: "Recomandare și comunitate", max: 10 },
    ],
  },
  {
    id: "B",
    titlu: "Profil B — Donator recurent",
    criterii: [
      { key: "afinitate", label: "Afinitate stabilă cu misiunea", max: 15 },
      { key: "frecventa", label: "Frecvență și repetiție observată", max: 20 },
      { key: "retentie", label: "Retenție și risc de abandon", max: 20 },
      { key: "plata", label: "Metodă de plată potrivită", max: 10 },
      { key: "actualizari", label: "Preferință pentru actualizări", max: 15 },
      { key: "valoare", label: "Valoare pe 12/36 luni", max: 15 },
      { key: "legal", label: "Compatibilitate legală și etică", max: 5 },
    ],
  },
  {
    id: "C",
    titlu: "Profil C — Sponsor corporate",
    criterii: [
      { key: "industrie", label: "Industrie și dimensiune potrivite", max: 15 },
      { key: "decident", label: "Acces la decident", max: 15 },
      { key: "csr", label: "Compatibilitate CSR/ESG", max: 15 },
      { key: "capacitate", label: "Capacitate și valoare posibilă", max: 20 },
      { key: "guvernanta", label: "Guvernanță, dovadă și raportare", max: 15 },
      { key: "geografie", label: "Geografie și comunitate comună", max: 5 },
      { key: "relatie", label: "Potențial de relație pe termen lung", max: 10 },
      { key: "operational", label: "Capacitate operațională internă", max: 5 },
    ],
  },
];
export type Segment = { nume: string; criterii: Record<string, number> }; // procent 0–100 per criteriu
export const NR_SEGMENTE = 3;

export const REZUMAT_CAMPURI: { key: string; label: string }[] = [
  { key: "nume", label: "Nume intern al profilului" },
  { key: "marime", label: "Mărimea segmentului" },
  { key: "date", label: "Date definitorii (persoana reală: nume, vârstă, meserie, oraș)" },
  { key: "citat", label: "În cuvintele lui (un citat care îl descrie)" },
  { key: "ciclu", label: "Etapa relației (nou, recurent, fidel, major, în risc, inactiv)" },
  { key: "comportament", label: "Comportament financiar" },
  { key: "sume", label: "Sume propuse (cele 3 sume din cerere)" },
  { key: "recurent", label: "Disponibilitate pentru donație lunară" },
  { key: "motivatie", label: "Motivație principală" },
  { key: "obiectii", label: "Obiecții și dovezi" },
  { key: "mesaj", label: "Mesaj și format" },
  { key: "canale", label: "Canale" },
  { key: "contact", label: "Preferință de contact" },
  { key: "momente", label: "Momente" },
  { key: "excluderi", label: "Excluderi" },
  { key: "kpi", label: "KPI și limite" },
  { key: "baza", label: "Pe ce se bazează fișa (date reale, interviuri, intuiție)" },
];

// Verificări obligatorii înainte de orice promovare plătită (cazuri medicale / minori). Afișate mereu, nu doar
// când misiunea conține anumite cuvinte; până sunt bifate toate, recomandările sunt orientative.
export const CHECKLIST_CONFORMITATE: { key: string; text: string }[] = [
  { key: "consimtamant", text: "Există consimțământ scris și datat de la beneficiar sau de la ambii reprezentanți legali (dacă e minor), separat pentru poveste, imagine și reclame plătite." },
  { key: "minimizare", text: "Diagnosticul publicat este strict cel necesar: fără CNP, adresă, școală, localitate exactă sau documente medicale integrale." },
  { key: "audiente", text: "Nicio listă cu beneficiari, părinți sau pacienți nu este încărcată ca audiență. Lista de donatori se încarcă doar cu consimțământ specific pentru publicitate personalizată sau altă bază legală confirmată de DPO." },
  { key: "politici", text: "Politicile fiecărei platforme pentru strângeri de fonduri și conținut medical au fost verificate și aprobate de un responsabil numit." },
  { key: "retragere", text: "Există o procedură de retragere: campania se oprește și reclamele se șterg rapid (recomandat: cel mult 48 de ore) la cererea beneficiarului." },
  { key: "surplus", text: "Donatorii află din ce bani se plătește promovarea și ce se întâmplă cu surplusul sau dacă beneficiarul nu mai poate folosi fondurile." },
];

// ===== Fișe de avatar (varianta simplă) =====
// Fișa PRINCIPALĂ trăiește în câmpurile documentului (rezumat, conversie, buget), ca varianta detaliată și motorul să o folosească;
// fișele SUPLIMENTARE (donator lunar, firme etc.) sunt independente și nu intră în calculul de buget.
export type TipFisa = "unic" | "lunar" | "firme" | "alta";
export const TIPURI_FISA: { key: TipFisa; label: string; conversie: Conversie; descriere: string }[] = [
  { key: "unic", label: "Donator unic", conversie: "unica", descriere: "Donează o dată, de obicei pentru un caz concret." },
  { key: "lunar", label: "Donator lunar", conversie: "recurenta", descriere: "Donație recurentă, relație pe termen lung." },
  { key: "firme", label: "Firmă / sponsor", conversie: "sponsorizare", descriere: "Companii care sponsorizează sau redirecționează impozit." },
  { key: "alta", label: "Altă fișă", conversie: "", descriere: "Orice alt segment: voluntari, ambasadori, presă." },
];
export const FISA_PRINCIPALA = "principal";
export const MAX_FISE_SUPLIMENTARE = 5;
export const MAX_VALIDARI = 10;

export type Recunoastere = "" | "da" | "partial" | "nu";
export type Validare = { id: string; persoana: string; recunoaste: Recunoastere; nota: string };

export type Fisa = {
  id: string;
  nume: string;
  tip: TipFisa;
  rezumat: Record<string, string>;
  conversie: Conversie;
  donatieUnica: string;
  lunar: string;
  validari: Validare[];
  revizuitLa: string | null;
  creat: string;
};

export function citesteFisa(d: AvatarData, id: string): Fisa {
  const extra = id === FISA_PRINCIPALA ? undefined : d.fiseExtra.find((f) => f.id === id);
  if (extra) return extra;
  return {
    id: FISA_PRINCIPALA,
    nume: d.rezumat.nume?.trim() || "Principală",
    tip: "unic",
    rezumat: d.rezumat,
    conversie: d.conversie,
    donatieUnica: d.buget.donatieUnica,
    lunar: d.buget.lunar,
    validari: d.validari,
    revizuitLa: d.revizuitLa,
    creat: d.actualizat ?? "",
  };
}

export function scrieFisa(d: AvatarData, f: Fisa): AvatarData {
  if (f.id === FISA_PRINCIPALA) {
    return { ...d, rezumat: f.rezumat, conversie: f.conversie, buget: { ...d.buget, donatieUnica: f.donatieUnica, lunar: f.lunar }, validari: f.validari, revizuitLa: f.revizuitLa };
  }
  return { ...d, fiseExtra: d.fiseExtra.map((x) => (x.id === f.id ? f : x)) };
}

export function toateFisele(d: AvatarData): Fisa[] {
  return [citesteFisa(d, FISA_PRINCIPALA), ...d.fiseExtra];
}

const UN_AN_MS = 365 * 24 * 3600 * 1000;
// O fișă începută și nerevizuită de peste 12 luni (Bloomerang: refă exercițiul în fiecare an). Pentru fișa principală,
// ultima salvare numără ca „atingere”; pentru cele suplimentare, data creării.
export function fiseDeRevizuit(d: AvatarData, acum: number): Fisa[] {
  return toateFisele(d).filter((f) => {
    if (Object.values(f.rezumat).every((v) => !v)) return false;
    const baza = Date.parse(f.revizuitLa ?? f.creat);
    return Number.isFinite(baza) && acum - baza > UN_AN_MS;
  });
}

// Cât de bine a fost verificată fișa pe donatori reali: 5+ interviuri cu cel puțin 70% recunoaștere = validată.
export function incredereValidari(validari: Validare[]): { grad: Exclude<Grad, "">; n: number; pct: number } {
  const completate = validari.filter((v) => v.recunoaste !== "");
  const n = completate.length;
  const pct = n === 0 ? 0 : Math.round((completate.reduce((s, v) => s + (v.recunoaste === "da" ? 1 : v.recunoaste === "partial" ? 0.5 : 0), 0) / n) * 100);
  const grad: Exclude<Grad, ""> = n >= 5 && pct >= 70 ? "masurat" : n >= 3 ? "estimat" : "ipoteza";
  return { grad, n, pct };
}

export type AvatarData = {
  raspunsuri: Record<number, Raspuns>;
  conformitate: Record<string, boolean>;
  buget: Buget;
  mix: Mix;
  varste: Varste;
  digital: string; // 1–5, cât de ușor plătesc online donatorii (Q48)
  conversie: Conversie;
  canale: Record<CanalId, CanalDate>;
  profile: Record<ProfilId, Segment[]>;
  rezumat: Record<string, string>;
  validari: Validare[]; // verificarea fișei principale pe donatori reali
  revizuitLa: string | null; // ultima revizuire confirmată a fișei principale
  fiseExtra: Fisa[];
  actualizat: string | null;
};

export function avatarGol(): AvatarData {
  const canale = Object.fromEntries(CANALE.map((c) => [c, { ...CANAL_GOL }])) as Record<CanalId, CanalDate>;
  const profile = Object.fromEntries(
    PROFILE.map((p) => [p.id, Array.from({ length: NR_SEGMENTE }, (_, i) => ({ nume: `Segment ${i + 1}`, criterii: {} as Record<string, number> }))]),
  ) as Record<ProfilId, Segment[]>;
  return {
    raspunsuri: {},
    conformitate: {},
    buget: { lunar: "", testPct: "20", donatieUnica: "", donatieLunara: "", luniRecuperare: "3", repetare: "", esantion: "" },
    mix: { individual: "", recurent: "", companii: "", altele: "" },
    varste: { v18_24: "", v25_34: "", v35_44: "", v45_54: "", v55: "" },
    digital: "",
    conversie: "",
    canale,
    profile,
    rezumat: {},
    validari: [],
    revizuitLa: null,
    fiseExtra: [],
    actualizat: null,
  };
}

function normalizeazaValidari(x: unknown): Validare[] {
  if (!Array.isArray(x)) return [];
  return x.slice(0, MAX_VALIDARI).map((v, i) => {
    const o = (v ?? {}) as Partial<Validare>;
    const rec: Recunoastere = o.recunoaste === "da" || o.recunoaste === "partial" || o.recunoaste === "nu" ? o.recunoaste : "";
    return { id: typeof o.id === "string" && o.id ? o.id : `v${i}`, persoana: String(o.persoana ?? ""), recunoaste: rec, nota: String(o.nota ?? "") };
  });
}

function normalizeazaFise(x: unknown): Fisa[] {
  if (!Array.isArray(x)) return [];
  return x.slice(0, MAX_FISE_SUPLIMENTARE).flatMap((v, i) => {
    const o = (v ?? {}) as Partial<Fisa>;
    if (typeof o.id !== "string" || !o.id || o.id === FISA_PRINCIPALA) return [];
    const tip: TipFisa = TIPURI_FISA.some((t) => t.key === o.tip) ? (o.tip as TipFisa) : "alta";
    return [
      {
        id: o.id,
        nume: String(o.nume ?? "") || `Fișa ${i + 2}`,
        tip,
        rezumat: { ...(o.rezumat ?? {}) },
        conversie: (o.conversie ?? "") as Conversie,
        donatieUnica: String(o.donatieUnica ?? ""),
        lunar: String(o.lunar ?? ""),
        validari: normalizeazaValidari(o.validari),
        revizuitLa: typeof o.revizuitLa === "string" ? o.revizuitLa : null,
        creat: typeof o.creat === "string" ? o.creat : "",
      },
    ];
  });
}

// Completează un document salvat (posibil mai vechi/incomplet) cu valorile implicite lipsă.
export function normalizeaza(x: unknown): AvatarData {
  const g = avatarGol();
  if (!x || typeof x !== "object") return g;
  const s = x as Partial<AvatarData>;
  return {
    raspunsuri: { ...(s.raspunsuri ?? {}) },
    conformitate: { ...(s.conformitate ?? {}) },
    buget: { ...g.buget, ...(s.buget ?? {}) },
    mix: { ...g.mix, ...(s.mix ?? {}) },
    varste: { ...g.varste, ...(s.varste ?? {}) },
    digital: s.digital ?? "",
    conversie: s.conversie ?? "",
    canale: Object.fromEntries(CANALE.map((c) => [c, { ...CANAL_GOL, ...(s.canale?.[c] ?? {}) }])) as Record<CanalId, CanalDate>,
    profile: Object.fromEntries(
      PROFILE.map((p) => [
        p.id,
        Array.from({ length: NR_SEGMENTE }, (_, i) => {
          const seg = s.profile?.[p.id]?.[i];
          return { nume: seg?.nume || `Segment ${i + 1}`, criterii: { ...(seg?.criterii ?? {}) } };
        }),
      ]),
    ) as Record<ProfilId, Segment[]>,
    rezumat: { ...(s.rezumat ?? {}) },
    validari: normalizeazaValidari(s.validari),
    revizuitLa: typeof s.revizuitLa === "string" ? s.revizuitLa : null,
    fiseExtra: normalizeazaFise(s.fiseExtra),
    actualizat: s.actualizat ?? null,
  };
}

// Statistici reale din platformă (donații online reușite) — folosite ca reper, nu ca înlocuitor al datelor din canale.
// Donațiile UNICE sunt separate de cele RECURENTE (fiecare reînnoire lunară e un rând în baza de date) și toate
// sumele sunt nete de rambursări — altfel media și mediana ar amesteca rate lunare cu donații unice.
export type StatisticiPlatforma = {
  donatii: number; // donații unice reușite
  donatoriUnici: number; // adrese de email distincte (toate donațiile)
  suma: number; // total net (unice + recurente), lei
  medieUnica: number;
  medianaUnica: number;
  donatii12Luni: number; // donații unice în ultimele 12 luni
  incasariRecurente: number; // număr de încasări lunare reușite
  medianaLunara: number; // suma tipică a unei încasări lunare
  abonamenteActive: number;
  procentRecurent: number; // % din venitul net venit din donații recurente
};
