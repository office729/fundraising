// Calcule pure pentru pagina „Consum AI”: zilele din ultimele 31, estimarea la final de lună, procentul din buget. Ziua se socotește în ora României.

// Instrumentele care folosesc AI-ul organizației (cheia stocată în ai_consum.instrument); eticheta e în română și engleză.
export const INSTRUMENTE_AI = ["agent_email", "reclame", "influenceri", "analiza_ong", "deep_search_ai", "one_pager", "promovare", "granturi", "altele"] as const;
export type InstrumentAi = (typeof INSTRUMENTE_AI)[number];

export const ETICHETE_INSTRUMENT: Record<InstrumentAi, { ro: string; en: string }> = {
  agent_email: { ro: "Agent email", en: "Email agent" },
  reclame: { ro: "Analiza reclamelor", en: "Ad analysis" },
  influenceri: { ro: "Influenceri", en: "Influencers" },
  analiza_ong: { ro: "Analiză ONG-uri", en: "NGO analysis" },
  deep_search_ai: { ro: "Căutare decidenți pe internet (AI)", en: "Decision-maker web search (AI)" },
  one_pager: { ro: "One Pager", en: "One Pager" },
  promovare: { ro: "Promovare campanii", en: "Campaign promotion" },
  granturi: { ro: "Granturi", en: "Grants" },
  altele: { ro: "Altele", en: "Other" },
};

export const eInstrumentAi = (v: unknown): v is InstrumentAi => typeof v === "string" && (INSTRUMENTE_AI as readonly string[]).includes(v);

const TZ = "Europe/Bucharest";

// „2026-11-04” în ora României.
export function ziBucuresti(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

function adunaZile(zi: string, n: number): string {
  const d = new Date(`${zi}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export type ZiConsum = { zi: string; costUsd: number; apeluri: number };

// Ultimele `zile` zile (inclusiv azi), cu zero unde nu a fost consum. `randuri` vin din SQL, deja grupate pe zi (ora României).
export function ultimeleZile(randuri: { zi: string; costUsd: number; apeluri: number }[], azi: string, zile = 31): ZiConsum[] {
  const dupa = new Map(randuri.map((r) => [r.zi, r]));
  const iesire: ZiConsum[] = [];
  for (let i = zile - 1; i >= 0; i--) {
    const zi = adunaZile(azi, -i);
    const r = dupa.get(zi);
    iesire.push({ zi, costUsd: r?.costUsd ?? 0, apeluri: r?.apeluri ?? 0 });
  }
  return iesire;
}

export function zileInLuna(azi: string): number {
  const [a, l] = azi.split("-").map(Number);
  return new Date(Date.UTC(a, l, 0)).getUTCDate();
}

// Estimarea la final de lună: media zilnică de până acum × zilele lunii. Fără consum încă => 0. Prima zi a lunii nu extrapolează dintr-o singură zi parțială fără consum.
export function estimareLuna(costLuna: number, azi: string): number {
  const ziDinLuna = Number(azi.slice(8, 10));
  if (!(costLuna > 0) || ziDinLuna < 1) return 0;
  return Math.round(((costLuna / ziDinLuna) * zileInLuna(azi)) * 100) / 100;
}

// Procentul consumat din buget (întreg, plafonat la 999); fără buget => null.
export function procentBuget(costLuna: number, bugetUsd: number | null): number | null {
  if (bugetUsd == null || !(bugetUsd > 0)) return null;
  return Math.min(999, Math.round((costLuna / bugetUsd) * 100));
}

export function costMediu(cost: number, apeluri: number): number {
  return apeluri > 0 ? Math.round((cost / apeluri) * 10000) / 10000 : 0;
}

// Sume cu zecimale fixe pentru afișare.
export function formatUsd(v: number, locale: "ro" | "en"): string {
  const zecimale = v > 0 && v < 1 ? 3 : 2;
  return `${new Intl.NumberFormat(locale === "ro" ? "ro-RO" : "en-GB", { minimumFractionDigits: zecimale, maximumFractionDigits: zecimale }).format(v)} USD`;
}

export function formatLei(usd: number, cursUsdRon: number | null, locale: "ro" | "en"): string | null {
  if (cursUsdRon == null || !(cursUsdRon > 0)) return null;
  const lei = usd * cursUsdRon;
  return `≈ ${new Intl.NumberFormat(locale === "ro" ? "ro-RO" : "en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(lei)} ${locale === "ro" ? "lei" : "RON"}`;
}
