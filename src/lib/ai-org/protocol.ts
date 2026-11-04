// Partea pură a clientului Claude al organizației: corpul cererii, citirea răspunsului și mesajele pentru erori. Fără rețea și fără server-only, ca să poată fi testată.
import type { Utilizare } from "./pret";

// Utilizarea dintr-un răspuns Anthropic (câmpuri lipsă = 0, valori nenumerice ignorate).
export function utilizareDinRaspuns(usage: unknown): Utilizare {
  const u = (usage ?? {}) as Record<string, unknown>;
  const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);
  const server = (u.server_tool_use ?? {}) as Record<string, unknown>;
  return {
    tokeniIn: n(u.input_tokens),
    tokeniOut: n(u.output_tokens),
    tokeniCacheCitire: n(u.cache_read_input_tokens),
    tokeniCacheScriere: n(u.cache_creation_input_tokens),
    cautariWeb: n(server.web_search_requests),
  };
}

export type Loc = "ro" | "en";

export type MesajClaude = { role: "user" | "assistant"; content: string | unknown[] };
export type Efort = "low" | "medium" | "high" | "xhigh" | "max";

export type CerereClaude = {
  cheie: string;
  model: string;
  system?: string;
  mesaje: MesajClaude[];
  maxTokens: number;
  efort?: Efort;
  // Căutare web (instrument de server Anthropic, 10 USD la 1000 de căutări): maxim de căutări într-un apel.
  cautareWeb?: { maxUtilizari: number } | null;
  timeoutMs?: number;
  // Continuările după pause_turn (căutarea web lungă); implicit 4.
  maxTure?: number;
  // Termenul TOTAL al apelului (toate turele): fiecare tură primește doar timpul rămas, ca funcția să nu fie tăiată de platformă înainte să se înregistreze consumul.
  termenTotalMs?: number;
  locale?: Loc;
  // Refuzurile se retrimit automat pe un model de rezervă (Anthropic, server-side); pornit implicit.
  fallback?: boolean;
};

// Haiku nu are rezervă server-side (fallbacks) și folosește căutarea web de bază.
export const esteHaiku = (model: string) => model.includes("haiku");

export const URL_MESAJE = "https://api.anthropic.com/v1/messages";
export const URL_MODELE = "https://api.anthropic.com/v1/models?limit=1";
export const BETA_FALLBACK = "server-side-fallback-2026-07-01";

export function anteteCerere(cheie: string, fallback: boolean): Record<string, string> {
  const h: Record<string, string> = { "content-type": "application/json", "x-api-key": cheie, "anthropic-version": "2023-06-01" };
  if (fallback) h["anthropic-beta"] = BETA_FALLBACK;
  return h;
}

// Corpul cererii. Fără `thinking` (modelele curente rulează adaptiv; Opus 5.5 nu acceptă oprirea) și fără `tool_choice` forțat (refuzat de model).
export function corpCerere(c: CerereClaude, mesaje: MesajClaude[] = c.mesaje, cuFallback = c.fallback !== false && !esteHaiku(c.model)): Record<string, unknown> {
  const corp: Record<string, unknown> = {
    model: c.model,
    max_tokens: c.maxTokens,
    messages: mesaje,
    output_config: { effort: c.efort ?? "medium" },
  };
  if (c.system) corp.system = c.system;
  // Varianta cu filtrare dinamică nu e listată pentru Haiku; acolo folosim varianta de bază.
  if (c.cautareWeb) corp.tools = [{ type: esteHaiku(c.model) ? "web_search_20250305" : "web_search_20260209", name: "web_search", max_uses: Math.max(1, Math.min(30, Math.floor(c.cautareWeb.maxUtilizari))) }];
  // Refuzurile (stop_reason "refusal") sunt rare, dar la ele cererea se reia pe un model de rezervă, fără să plătească organizația o a doua cerere separată.
  if (cuFallback) corp.fallbacks = "default";
  return corp;
}

export type Sursa = { url: string; titlu: string };

export type RaspunsParsat = {
  text: string;
  continut: unknown[];
  surse: Sursa[];
  oprire: string;
  model: string;
  utilizare: Utilizare;
};

// Citește un răspuns 200 de la /v1/messages. Tolerant la câmpuri lipsă; nu aruncă.
export function parseazaRaspuns(corp: unknown, modelCerut: string): RaspunsParsat {
  const r = (corp ?? {}) as Record<string, unknown>;
  const continut = Array.isArray(r.content) ? (r.content as unknown[]) : [];
  const texte: string[] = [];
  const surse = new Map<string, Sursa>();
  const adauga = (url: unknown, titlu: unknown) => {
    if (typeof url !== "string" || !/^https?:\/\//i.test(url)) return;
    if (!surse.has(url)) surse.set(url, { url, titlu: typeof titlu === "string" && titlu.trim() ? titlu.trim().slice(0, 200) : url });
  };
  for (const b of continut) {
    const bloc = (b ?? {}) as Record<string, unknown>;
    if (bloc.type === "text" && typeof bloc.text === "string") {
      texte.push(bloc.text);
      if (Array.isArray(bloc.citations)) for (const ci of bloc.citations as Record<string, unknown>[]) adauga(ci?.url, ci?.title);
    } else if (bloc.type === "web_search_tool_result" && Array.isArray(bloc.content)) {
      // Rezultat de succes = listă; o eroare a instrumentului vine ca obiect (HTTP 200), deci nu are ce citi aici.
      for (const it of bloc.content as Record<string, unknown>[]) adauga(it?.url, it?.title);
    }
  }
  return {
    text: texte.join("").trim(),
    continut,
    surse: [...surse.values()],
    oprire: typeof r.stop_reason === "string" ? r.stop_reason : "",
    model: typeof r.model === "string" && r.model ? r.model : modelCerut,
    utilizare: utilizareDinRaspuns(r.usage),
  };
}

export type CodEroare = "cheie" | "credite" | "limita" | "temporar" | "refuz" | "cerere" | "retea" | "necunoscut";

// Nicio cheie (nici parțială) nu apare vreodată într-un mesaj de eroare.
export function curataMesajAi(m: string): string {
  return m.replace(/sk-ant-[A-Za-z0-9_-]+/g, "[cheie]").replace(/\s+/g, " ").trim().slice(0, 240);
}

const MESAJE: Record<Loc, Record<CodEroare, string>> = {
  ro: {
    cheie: "Cheia Anthropic a organizației nu mai e validă. Un administrator o poate actualiza în Setări → Integrări & AI.",
    credite: "S-au terminat creditele din contul Anthropic al organizației (console.anthropic.com → Billing). Adaugă credite și încearcă din nou.",
    limita: "Prea multe cereri către Anthropic — încearcă peste un minut.",
    temporar: "Anthropic are o problemă temporară. Cheia nu a fost modificată; încearcă din nou peste câteva minute.",
    refuz: "Modelul a refuzat cererea. Reformulează sau schimbă datele trimise și încearcă din nou.",
    cerere: "Anthropic nu a putut procesa cererea.",
    retea: "Anthropic nu răspunde acum. Încearcă din nou peste câteva minute.",
    necunoscut: "Generarea nu a reușit. Încearcă din nou.",
  },
  en: {
    cheie: "The organization's Anthropic key is no longer valid. An administrator can update it in Settings → Integrations & AI.",
    credite: "The organization's Anthropic account has run out of credits (console.anthropic.com → Billing). Add credits and try again.",
    limita: "Too many requests to Anthropic — try again in a minute.",
    temporar: "Anthropic has a temporary problem. The key was not changed; try again in a few minutes.",
    refuz: "The model declined the request. Rephrase it or change the data sent and try again.",
    cerere: "Anthropic could not process the request.",
    retea: "Anthropic is not responding right now. Try again in a few minutes.",
    necunoscut: "The generation did not succeed. Please try again.",
  },
};

export function mesajEroare(cod: CodEroare, locale: Loc = "ro", detaliu?: string): string {
  const baza = MESAJE[locale][cod];
  return cod === "cerere" && detaliu ? `${baza} (${curataMesajAi(detaliu)})` : baza;
}

// Codul de eroare după starea HTTP și corpul de eroare Anthropic ({ error: { type, message } }).
export function codDinHttp(status: number, corp: unknown): { cod: CodEroare; detaliu: string } {
  const e = ((corp ?? {}) as { error?: { type?: string; message?: string } }).error ?? {};
  const mesaj = typeof e.message === "string" ? e.message : "";
  if (/credit balance|billing|purchase credits/i.test(mesaj) || status === 402) return { cod: "credite", detaliu: mesaj };
  if (status === 401 || e.type === "authentication_error") return { cod: "cheie", detaliu: mesaj };
  if (status === 403 || e.type === "permission_error") return { cod: "cheie", detaliu: mesaj };
  if (status === 429 || e.type === "rate_limit_error") return { cod: "limita", detaliu: mesaj };
  if (status === 529 || status >= 500 || e.type === "overloaded_error" || e.type === "api_error") return { cod: "temporar", detaliu: mesaj };
  if (status >= 400) return { cod: "cerere", detaliu: mesaj };
  return { cod: "necunoscut", detaliu: mesaj };
}

// O cheie Anthropic arată așa: sk-ant-… (api03 etc.). Verificare de formă înainte de a o trimite la Anthropic.
export const RE_CHEIE_ANTHROPIC = /^sk-ant-[A-Za-z0-9_-]{20,300}$/;
