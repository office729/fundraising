import "server-only";

import type { ContinutCanal, DateCampanie } from "@/lib/promovare/generator";

// Integrare AI (Anthropic) pentru generarea de conținut de promovare — inițializare
// LAZY (ca la email.ts/twilio.ts): nimic nu se citește la evaluarea modulului, ca
// `next build` să nu depindă de cheie. Complet inertă fără ANTHROPIC_API_KEY —
// apelantul cade automat pe generatorul determinist (src/lib/promovare/generator.ts).
//
// GARDĂ DE CONȚINUT (secțiunea 5 din cerință): AI-ul primește DOAR informațiile
// aprobate ale campaniei (poveste, titlu, org, URL, sume) și are interdicție
// explicită să inventeze diagnostice, sume, declarații, termene sau date medicale.

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = "claude-sonnet-5";

export function aiConfigurat(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

type CanalContinut = ContinutCanal["canal"];

const ETICHETA_CANAL: Record<CanalContinut, string> = {
  facebook: "Facebook (postare)",
  instagram: "Instagram (caption)",
  tiktok: "TikTok (descriere video)",
  whatsapp: "WhatsApp (mesaj către contacte apropiate)",
  grup_local: "grup local Facebook/WhatsApp (mesaj de apel)",
  comunicat: "comunicat de presă",
};

// Apel low-level la Anthropic. Întoarce textul răspunsului sau aruncă.
async function apeleazaAI(params: { system: string; prompt: string; maxTokens?: number }): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY lipsește din mediu — AI-ul nu e configurat.");
  const model = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 30000);
  let res: Response;
  try {
    res = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: params.maxTokens ?? 1024,
        system: params.system,
        messages: [{ role: "user", content: params.prompt }],
      }),
      signal: ctrl.signal,
    });
  } finally {
    clearTimeout(t);
  }
  if (!res.ok) {
    const detaliu = await res.text().catch(() => "");
    throw new Error(`AI a răspuns ${res.status}. ${detaliu.slice(0, 200)}`);
  }
  const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
  const text = (data.content ?? [])
    .filter((b) => b.type === "text" && typeof b.text === "string")
    .map((b) => b.text)
    .join("")
    .trim();
  if (!text) throw new Error("AI a întors un răspuns gol.");
  return text;
}

// Sistemul comun — regulile de conținut se aplică la orice generare.
function systemPrompt(): string {
  return [
    "Ești copywriter pentru o asociație caritabilă din România care strânge fonduri pentru cazuri reale (medicale/sociale).",
    "Scrii în limba română, cu ton empatic, uman, demn — niciodată manipulator, senzaționalist sau siropos.",
    "REGULI STRICTE, fără excepție:",
    "- Folosește DOAR informațiile din campania primită (poveste, titlu, organizație, sume, link). NU inventa NIMIC.",
    "- NU inventa diagnostice, cifre, sume, procente, date medicale, citate, nume de persoane, termene sau declarații care nu-ți sunt date explicit.",
    "- Dacă o informație nu-ți e dată, pur și simplu nu o menționa. Nu completa cu presupuneri.",
    "- Include linkul campaniei exact cum ți-a fost dat, fără să-l modifici.",
    "- Păstrează sumele exact cum ți-au fost date (nu rotunji, nu converti).",
    "- Respectă demnitatea beneficiarului: fără detalii medicale grafice, fără a cere milă, fără exagerări.",
    "- Adaptează stilul și lungimea la canalul cerut.",
  ].join("\n");
}

function formatDate(date: DateCampanie): string {
  return [
    `Titlu campanie: ${date.titlu}`,
    `Organizație: ${date.orgName}`,
    `Link campanie (folosește-l exact): ${date.url}`,
    date.sumaTinta != null ? `Sumă necesară: ${date.sumaTinta.toLocaleString("ro-RO")} lei` : "Sumă necesară: necomunicată",
    `Sumă strânsă până acum: ${date.sumaStransa.toLocaleString("ro-RO")} lei`,
    "",
    "Povestea aprobată a campaniei (singura sursă de fapte):",
    date.poveste.trim(),
  ].join("\n");
}

// Curăță eventualele garduri de cod / prefixe pe care le poate adăuga modelul.
function curata(s: string): string {
  return s
    .replace(/^```[a-z]*\n?/i, "")
    .replace(/\n?```$/i, "")
    .trim();
}

// Generează materialul pentru UN canal. Întoarce forma ContinutCanal sau null
// (fără cheie / eroare) — apelantul cade pe generatorul determinist.
export async function genereazaContinutCanalAI(
  date: DateCampanie,
  canal: CanalContinut,
  variatie?: number,
): Promise<ContinutCanal | null> {
  if (!aiConfigurat()) return null;
  const scurtNota = variatie ? `\n\nAceasta este varianta ${variatie + 1} — scrie un unghi diferit față de variantele obișnuite, dar respectând aceleași reguli.` : "";
  const cere =
    canal === "comunicat"
      ? [
          "Scrie un COMUNICAT DE PRESĂ complet, în limba română, pentru presa locală.",
          "Structură: titlu (antet), oraș/dată ca [Localitate], [DATA] (lasă-le ca placeholder dacă nu-ți sunt date), 2-4 paragrafe, un rând de contact presă la final ca placeholder [Contact presă].",
          "NU inventa citate; dacă pui un citat, lasă-l ca placeholder [Citat reprezentant].",
          "Răspunde DOAR cu formatul JSON de mai jos.",
        ].join("\n")
      : [
          `Scrie un material pentru ${ETICHETA_CANAL[canal]} despre această campanie.`,
          "Adaptează lungimea și tonul la platformă (Facebook mai narativ, Instagram mai vizual/scurt cu 1-2 emoji potrivite, TikTok foarte scurt și direct, WhatsApp/grup local ca un mesaj personal către cunoscuți).",
          "Include un îndemn clar la donație sau distribuire și linkul campaniei.",
          "Răspunde DOAR cu formatul JSON de mai jos.",
        ].join("\n");

  const prompt = [
    formatDate(date),
    "",
    cere + scurtNota,
    "",
    "Format de răspuns (JSON valid, fără text în plus, fără ```):",
    '{ "titlu": string|null, "textComplet": string, "textScurt": string|null, "indemn": string|null }',
    "- titlu: titlu/introducere scurtă (sau null dacă nu are sens pentru canal).",
    "- textComplet: textul principal, gata de publicat.",
    "- textScurt: o variantă foarte scurtă (sau null).",
    "- indemn: îndemnul la acțiune separat (sau null).",
  ].join("\n");

  try {
    const raw = curata(await apeleazaAI({ system: systemPrompt(), prompt, maxTokens: canal === "comunicat" ? 1400 : 800 }));
    const parsed = JSON.parse(raw) as { titlu?: unknown; textComplet?: unknown; textScurt?: unknown; indemn?: unknown };
    const textComplet = typeof parsed.textComplet === "string" ? parsed.textComplet.trim() : "";
    if (!textComplet) return null;
    return {
      canal,
      titlu: typeof parsed.titlu === "string" && parsed.titlu.trim() ? parsed.titlu.trim() : null,
      textComplet,
      textScurt: typeof parsed.textScurt === "string" && parsed.textScurt.trim() ? parsed.textScurt.trim() : null,
      indemn: typeof parsed.indemn === "string" && parsed.indemn.trim() ? parsed.indemn.trim() : null,
    };
  } catch {
    // Orice eroare (cheie invalidă, timeout, JSON stricat) → null, apelantul cade pe șablon.
    return null;
  }
}

export type PostCalendarAI = { obiectiv: string; text: string };

// Generează un plan de N zile de postări, adaptat la stadiul real al campaniei
// (procent, sumă rămasă). Întoarce null (fără cheie / eroare) → apelantul cade pe
// generatorul determinist.
export async function genereazaCalendarZilnicAI(date: DateCampanie, zile = 7): Promise<PostCalendarAI[] | null> {
  if (!aiConfigurat()) return null;
  const prompt = [
    formatDate(date),
    "",
    `Creează un plan de ${zile} zile de postări pentru promovarea acestei campanii, adaptat stadiului ei curent (procent atins, cât mai e de strâns).`,
    "Fiecare zi: un unghi/obiectiv diferit (prezentare, progres, de ce contează fiecare leu, mulțumire, apel la distribuire, mesajul pragului curent, recapitulare) și un text gata de publicat cu linkul campaniei.",
    "Variază tonul și lungimea. Nu repeta același text.",
    "",
    "Format de răspuns (JSON valid, fără text în plus, fără ```): un array cu exact " + zile + " obiecte:",
    '[{ "obiectiv": string, "text": string }, ...]',
  ].join("\n");

  try {
    const raw = curata(await apeleazaAI({ system: systemPrompt(), prompt, maxTokens: 2200 }));
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    const out: PostCalendarAI[] = [];
    for (const it of parsed) {
      const o = it as { obiectiv?: unknown; text?: unknown };
      const text = typeof o.text === "string" ? o.text.trim() : "";
      const obiectiv = typeof o.obiectiv === "string" && o.obiectiv.trim() ? o.obiectiv.trim() : "Postare";
      if (text) out.push({ obiectiv, text });
    }
    return out.length ? out.slice(0, zile) : null;
  } catch {
    return null;
  }
}
