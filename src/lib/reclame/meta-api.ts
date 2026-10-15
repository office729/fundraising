// Citirea costurilor din Meta Marketing API (Insights). Doar citire (permisiunea ads_read): nu se modifică bugete și nu se pornesc sau opresc reclame.
// Modul pur, fără importuri: `fetch` și `asteapta` se injectează, ca logica de paginare, reîncercare și împărțire a intervalelor să se testeze fără rețea.
//
// Din documentația Meta: endpoint /act_{id}/insights; parametri level, time_increment (1 = pe zile), time_range {since, until}, breakdowns, limit;
// erori de limitare (cod 4 / 17 / 32 / 613 / 80000–80014, subcod 1504022) și de volum prea mare (cod 100, subcod 1487534: se restrânge intervalul);
// anteturile X-FB-Ads-Insights-Throttle și x-ad-account-usage; datele se actualizează la ~15 minute și nu se mai schimbă după ~28 de zile.

export const VERSIUNE_GRAPH_IMPLICITA = "v25.0";
export const GAZDA_GRAPH = "graph.facebook.com";

export const CAMPURI_INSIGHTS = ["date_start", "campaign_id", "campaign_name", "adset_id", "adset_name", "ad_id", "ad_name", "spend", "impressions", "inline_link_clicks", "account_currency"] as const;

export type ClasaEroareMeta = "token" | "permisiuni" | "cont" | "limita" | "prea-mare" | "tranzitorie" | "alta";

export class EroareMeta extends Error {
  clasa: ClasaEroareMeta;
  cod: number | null;
  subcod: number | null;
  status: number;
  constructor(clasa: ClasaEroareMeta, mesaj: string, status: number, cod: number | null, subcod: number | null) {
    super(mesaj);
    this.name = "EroareMeta";
    this.clasa = clasa;
    this.status = status;
    this.cod = cod;
    this.subcod = subcod;
  }
}

type CorpEroare = { error?: { message?: string; code?: number; error_subcode?: number; type?: string } };

// Clasifică un răspuns de eroare Graph API. Mesajul păstrat NU conține tokenul și nu citează textul brut al Meta (care poate include detalii interne).
export function claseazaEroare(status: number, corp: unknown): EroareMeta {
  const e = ((corp ?? {}) as CorpEroare).error ?? {};
  const cod = typeof e.code === "number" ? e.code : null;
  const subcod = typeof e.error_subcode === "number" ? e.error_subcode : null;
  if (cod === 190 || cod === 102 || status === 401) return new EroareMeta("token", "Tokenul de acces a expirat sau a fost revocat. Generează unul nou și reconectează contul.", status, cod, subcod);
  if (cod === 10 || (cod !== null && cod >= 200 && cod <= 299)) return new EroareMeta("permisiuni", "Tokenul nu are permisiunea ads_read pe acest cont publicitar.", status, cod, subcod);
  if (cod === 100 && subcod === 1487534) return new EroareMeta("prea-mare", "Interogarea întoarce prea multe date; intervalul se restrânge.", status, cod, subcod);
  if (cod === 4 || cod === 17 || cod === 32 || cod === 613 || (cod !== null && cod >= 80000 && cod <= 80014) || subcod === 1504022 || status === 429)
    return new EroareMeta("limita", "Meta a limitat temporar cererile. Sincronizarea se reia mai târziu.", status, cod, subcod);
  if (cod === 100 || cod === 803 || status === 404) return new EroareMeta("cont", "Contul publicitar nu a fost găsit sau tokenul nu are acces la el. Verifică ID-ul contului.", status, cod, subcod);
  if (status >= 500 || cod === 1 || cod === 2) return new EroareMeta("tranzitorie", "Meta nu a răspuns corect. Sincronizarea se reia mai târziu.", status, cod, subcod);
  return new EroareMeta("alta", `Meta a refuzat cererea (cod ${cod ?? status}).`, status, cod, subcod);
}

export type FetchLike = (url: string, init: { headers: Record<string, string>; signal?: AbortSignal }) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

export type OptiuniClient = {
  fetchImpl: FetchLike;
  token: string;
  versiune?: string;
  // Pauză între reîncercări; implicit reală, în teste se injectează una instantanee.
  asteapta?: (ms: number) => Promise<void>;
  maxReincercari?: number;
  timeoutMs?: number;
};

const pauza = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
export const idCont = (brut: string): string | null => {
  const m = /^(?:act_)?(\d{5,20})$/.exec(brut.trim());
  return m ? m[1]! : null;
};

export function urlInsights(o: { versiune?: string; contId: string; de: string; pana: string; limit?: number }): string {
  const p = new URLSearchParams({
    level: "ad",
    time_increment: "1",
    time_range: JSON.stringify({ since: o.de, until: o.pana }),
    breakdowns: "publisher_platform",
    fields: CAMPURI_INSIGHTS.join(","),
    limit: String(o.limit ?? 500),
  });
  return `https://${GAZDA_GRAPH}/${o.versiune ?? VERSIUNE_GRAPH_IMPLICITA}/act_${o.contId}/insights?${p.toString()}`;
}

// Paginarea Graph API: se urmează doar adresa `paging.next`, și doar dacă duce tot la graph.facebook.com (nu trimitem tokenul altundeva).
export function urmatoareaPagina(corp: unknown): string | null {
  const next = ((corp ?? {}) as { paging?: { next?: unknown } }).paging?.next;
  if (typeof next !== "string") return null;
  try {
    const u = new URL(next);
    return u.protocol === "https:" && u.hostname === GAZDA_GRAPH ? u.toString() : null;
  } catch {
    return null;
  }
}

async function cerere(o: OptiuniClient, url: string): Promise<unknown> {
  const asteapta = o.asteapta ?? pauza;
  const max = o.maxReincercari ?? 4;
  let incercare = 0;
  for (;;) {
    let raspuns;
    try {
      raspuns = await o.fetchImpl(url, { headers: { Authorization: `Bearer ${o.token}`, Accept: "application/json" }, signal: AbortSignal.timeout(o.timeoutMs ?? 30_000) });
    } catch {
      // rețea căzută sau timeout: tratat ca o eroare trecătoare
      if (incercare >= max) throw new EroareMeta("tranzitorie", "Nu am putut contacta Meta. Sincronizarea se reia mai târziu.", 0, null, null);
      incercare += 1;
      await asteapta(1000 * 2 ** incercare);
      continue;
    }
    let corp: unknown = null;
    try {
      corp = await raspuns.json();
    } catch {
      corp = null;
    }
    if (raspuns.ok) return corp;
    const eroare = claseazaEroare(raspuns.status, corp);
    // Doar erorile trecătoare și limitarea se reîncearcă, cu pauză tot mai lungă; restul (token, permisiuni, cont, volum) se întorc imediat.
    if ((eroare.clasa === "limita" || eroare.clasa === "tranzitorie") && incercare < max) {
      incercare += 1;
      await asteapta(Math.min(30_000, 1500 * 2 ** incercare));
      continue;
    }
    throw eroare;
  }
}

export type InsightRand = {
  date_start?: string;
  campaign_id?: string;
  campaign_name?: string;
  adset_id?: string;
  adset_name?: string;
  ad_id?: string;
  ad_name?: string;
  spend?: string;
  impressions?: string;
  inline_link_clicks?: string;
  account_currency?: string;
  publisher_platform?: string;
};

export const MAX_PAGINI = 200;

// Toate rândurile pentru un interval. La „prea multe date” intervalul se împarte în două și se reia, până la o singură zi.
export async function descarcaInsights(o: OptiuniClient & { contId: string; de: string; pana: string }): Promise<{ randuri: InsightRand[]; pagini: number }> {
  const randuri: InsightRand[] = [];
  let pagini = 0;
  let url: string | null = urlInsights({ versiune: o.versiune, contId: o.contId, de: o.de, pana: o.pana });
  try {
    while (url) {
      if (pagini >= MAX_PAGINI) throw new EroareMeta("alta", "Prea multe pagini de rezultate; restrânge perioada.", 0, null, null);
      const corp = (await cerere(o, url)) as { data?: unknown };
      pagini += 1;
      if (Array.isArray(corp?.data)) randuri.push(...(corp.data as InsightRand[]));
      url = urmatoareaPagina(corp);
    }
  } catch (e) {
    if (e instanceof EroareMeta && e.clasa === "prea-mare" && o.de < o.pana) {
      const [a, b] = imparteInterval(o.de, o.pana);
      const st = await descarcaInsights({ ...o, de: a.de, pana: a.pana });
      const dr = await descarcaInsights({ ...o, de: b.de, pana: b.pana });
      return { randuri: [...st.randuri, ...dr.randuri], pagini: st.pagini + dr.pagini };
    }
    throw e;
  }
  return { randuri, pagini };
}

const MS_ZI = 86_400_000;
const dinIso = (iso: string) => Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)));
const laIso = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export function imparteInterval(de: string, pana: string): [{ de: string; pana: string }, { de: string; pana: string }] {
  const n = Math.round((dinIso(pana) - dinIso(de)) / MS_ZI) + 1;
  const jumatate = Math.floor(n / 2);
  return [
    { de, pana: laIso(dinIso(de) + (jumatate - 1) * MS_ZI) },
    { de: laIso(dinIso(de) + jumatate * MS_ZI), pana },
  ];
}

// Intervale de cel mult `zileMax` zile, ca fiecare cerere să rămână mică.
export function intervale(de: string, pana: string, zileMax = 14): { de: string; pana: string }[] {
  const rez: { de: string; pana: string }[] = [];
  for (let ms = dinIso(de); ms <= dinIso(pana); ms += zileMax * MS_ZI) rez.push({ de: laIso(ms), pana: laIso(Math.min(ms + (zileMax - 1) * MS_ZI, dinIso(pana))) });
  return rez;
}

// Contul publicitar: nume, monedă, fus orar, stare — dovada că tokenul și ID-ul funcționează.
export async function citesteCont(o: OptiuniClient & { contId: string }): Promise<{ nume: string | null; moneda: string | null; fusOrar: string | null; stare: number | null }> {
  const url = `https://${GAZDA_GRAPH}/${o.versiune ?? VERSIUNE_GRAPH_IMPLICITA}/act_${o.contId}?${new URLSearchParams({ fields: "name,currency,timezone_name,account_status" }).toString()}`;
  const c = (await cerere(o, url)) as { name?: unknown; currency?: unknown; timezone_name?: unknown; account_status?: unknown };
  return {
    nume: typeof c.name === "string" ? c.name.slice(0, 200) : null,
    moneda: typeof c.currency === "string" && /^[A-Za-z]{3}$/.test(c.currency) ? c.currency.toUpperCase() : null,
    fusOrar: typeof c.timezone_name === "string" ? c.timezone_name.slice(0, 80) : null,
    stare: typeof c.account_status === "number" ? c.account_status : null,
  };
}

export type RandCostMeta = {
  ziua: string;
  cont: string;
  campanieCheie: string;
  campanieNume: string;
  setCheie: string;
  setNume: string;
  reclamaCheie: string;
  reclamaNume: string;
  plasament: string;
  cheltuialaMinor: number;
  afisari: number | null;
  clicuri: number | null;
};

const numar = (v: unknown): number | null => {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

// Rândurile Insights → rânduri de cost. Rândurile fără dată validă sau fără sumă numerică se ignoră (și se numără). Cheltuiala vine ca text zecimal („12.34”).
// Rândurile cu aceeași cheie (zi + reclamă + plasament) se adună, ca să nu apară două rânduri pentru aceeași cheie unică din baza de date.
export function mapeazaInsights(randuri: InsightRand[], contId: string): { randuri: RandCostMeta[]; ignorate: number; moneda: string | null } {
  const adunate = new Map<string, RandCostMeta>();
  let ignorate = 0;
  let moneda: string | null = null;
  for (const r of randuri) {
    const spend = numar(r.spend);
    if (!r.date_start || !/^\d{4}-\d{2}-\d{2}$/.test(r.date_start) || spend === null) {
      ignorate += 1;
      continue;
    }
    if (!moneda && typeof r.account_currency === "string" && /^[A-Za-z]{3}$/.test(r.account_currency)) moneda = r.account_currency.toUpperCase();
    const rand: RandCostMeta = {
      ziua: r.date_start,
      cont: `act_${contId}`,
      campanieCheie: String(r.campaign_id ?? "").slice(0, 100),
      campanieNume: String(r.campaign_name ?? r.campaign_id ?? "").slice(0, 200),
      setCheie: String(r.adset_id ?? "").slice(0, 100),
      setNume: String(r.adset_name ?? r.adset_id ?? "").slice(0, 200),
      reclamaCheie: String(r.ad_id ?? "").slice(0, 100),
      reclamaNume: String(r.ad_name ?? r.ad_id ?? "").slice(0, 200),
      plasament: String(r.publisher_platform ?? "").toLowerCase().slice(0, 40),
      cheltuialaMinor: Math.round(spend * 100),
      afisari: numar(r.impressions) === null ? null : Math.round(numar(r.impressions)!),
      clicuri: numar(r.inline_link_clicks) === null ? null : Math.round(numar(r.inline_link_clicks)!),
    };
    const cheie = [rand.ziua, rand.cont, rand.campanieCheie, rand.setCheie, rand.reclamaCheie, rand.plasament].join("\u0001");
    const e = adunate.get(cheie);
    if (e) {
      e.cheltuialaMinor += rand.cheltuialaMinor;
      e.afisari = e.afisari === null && rand.afisari === null ? null : (e.afisari ?? 0) + (rand.afisari ?? 0);
      e.clicuri = e.clicuri === null && rand.clicuri === null ? null : (e.clicuri ?? 0) + (rand.clicuri ?? 0);
    } else adunate.set(cheie, rand);
  }
  return { randuri: [...adunate.values()], ignorate, moneda };
}

// Codul UTM din numele campaniei (ex. „Inimă pentru Ana — cmp_026”), ca legătura să se facă singură când echipa îl pune în nume.
export function codDinNumeCampanie(nume: string): string | null {
  const m = /(?:^|[^a-z0-9])(cmp_[a-z0-9]{1,40})(?![a-z0-9_])/i.exec(nume);
  return m ? m[1]!.toLowerCase() : null;
}

// Perioada de sincronizat: ultimele `zile` zile până azi (inclusiv). Insights se actualizează la ~15 minute și se stabilizează după ~28 de zile,
// deci sincronizările periodice recitesc ultimele 7 zile (corecții), iar prima conectare și „Reîncarcă” iau 28–90 de zile.
export function perioadaSincronizare(azi: string, zile: number): { de: string; pana: string } {
  const n = Math.min(Math.max(Math.floor(zile), 1), 90);
  return { de: laIso(dinIso(azi) - (n - 1) * MS_ZI), pana: azi };
}

// Cât de „veche” e o sincronizare pentru a merita reluată automat la deschiderea paginii.
export const PRAG_VECHIME_MIN = 60;
export const esteVeche = (ultimaReusitaMs: number | null, acumMs: number, pragMin = PRAG_VECHIME_MIN): boolean => ultimaReusitaMs === null || acumMs - ultimaReusitaMs > pragMin * 60_000;
