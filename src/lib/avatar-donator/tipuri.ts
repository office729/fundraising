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
  { key: "date", label: "Date definitorii" },
  { key: "comportament", label: "Comportament financiar" },
  { key: "motivatie", label: "Motivație principală" },
  { key: "obiectii", label: "Obiecții și dovezi" },
  { key: "mesaj", label: "Mesaj și format" },
  { key: "canale", label: "Canale" },
  { key: "momente", label: "Momente" },
  { key: "excluderi", label: "Excluderi" },
  { key: "kpi", label: "KPI și limite" },
];

export type AvatarData = {
  raspunsuri: Record<number, Raspuns>;
  buget: Buget;
  mix: Mix;
  varste: Varste;
  digital: string; // 1–5, cât de ușor plătesc online donatorii (Q48)
  conversie: Conversie;
  canale: Record<CanalId, CanalDate>;
  profile: Record<ProfilId, Segment[]>;
  rezumat: Record<string, string>;
  actualizat: string | null;
};

export function avatarGol(): AvatarData {
  const canale = Object.fromEntries(CANALE.map((c) => [c, { ...CANAL_GOL }])) as Record<CanalId, CanalDate>;
  const profile = Object.fromEntries(
    PROFILE.map((p) => [p.id, Array.from({ length: NR_SEGMENTE }, (_, i) => ({ nume: `Segment ${i + 1}`, criterii: {} as Record<string, number> }))]),
  ) as Record<ProfilId, Segment[]>;
  return {
    raspunsuri: {},
    buget: { lunar: "", testPct: "20", donatieUnica: "", donatieLunara: "", luniRecuperare: "3" },
    mix: { individual: "", recurent: "", companii: "", altele: "" },
    varste: { v18_24: "", v25_34: "", v35_44: "", v45_54: "", v55: "" },
    digital: "",
    conversie: "",
    canale,
    profile,
    rezumat: {},
    actualizat: null,
  };
}

// Completează un document salvat (posibil mai vechi/incomplet) cu valorile implicite lipsă.
export function normalizeaza(x: unknown): AvatarData {
  const g = avatarGol();
  if (!x || typeof x !== "object") return g;
  const s = x as Partial<AvatarData>;
  return {
    raspunsuri: { ...(s.raspunsuri ?? {}) },
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
    actualizat: s.actualizat ?? null,
  };
}

// Statistici reale din platformă (donații online reușite) — folosite ca reper, nu ca înlocuitor al datelor din canale.
export type StatisticiPlatforma = {
  donatii: number;
  donatoriUnici: number;
  suma: number;
  medie: number;
  mediana: number;
  donatii12Luni: number;
};
