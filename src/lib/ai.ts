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

// Un document atașat (PDF) — trimis ca bloc "document" alături de textul
// promptului, în aceeași cerere. Anthropic citește nativ tabelele din PDF,
// nu trece prin OCR/parsare separată.
export type DocumentAtasat = { mediaType: "application/pdf"; base64: string };

// Apel low-level la Anthropic. Întoarce textul răspunsului sau aruncă.
// `documente` (opțional) transformă `content`-ul mesajului dintr-un string
// simplu într-un array de blocuri (document + text) — superset al formei
// existente, cei trei apelanți vechi (text simplu) rămân neschimbați.
// `timeoutMs` (implicit 30s, ca înainte) — extragerea din document are nevoie
// de mai mult (prompt + fișier mai mari), de-aici parametrul separat.
async function apeleazaAI(params: {
  system: string;
  prompt: string;
  maxTokens?: number;
  documente?: DocumentAtasat[];
  timeoutMs?: number;
}): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY lipsește din mediu — AI-ul nu e configurat.");
  const model = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;

  const content = params.documente?.length
    ? [
        ...params.documente.map((d) => ({
          type: "document" as const,
          source: { type: "base64" as const, media_type: d.mediaType, data: d.base64 },
        })),
        { type: "text" as const, text: params.prompt },
      ]
    : params.prompt;

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), params.timeoutMs ?? 30000);
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
        messages: [{ role: "user", content }],
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

// Text de mulțumire pentru o sponsorizare de companie (secțiunea 9) — mesaj
// public pe care beneficiarul îl postează pentru a mulțumi firmei. Întoarce null
// (fără cheie / eroare) → apelantul cere completare manuală.
export async function genereazaTextMultumireAI(
  date: DateCampanie,
  companie: string,
  suma: number | null,
  moneda: string | null,
): Promise<string | null> {
  if (!aiConfigurat()) return null;
  const sumaTxt = suma ? `${suma.toLocaleString("ro-RO")} ${moneda || "lei"}` : null;
  const prompt = [
    formatDate(date),
    "",
    `Compania „${companie}" a sponsorizat această campanie${sumaTxt ? ` cu ${sumaTxt}` : ""}.`,
    "Scrie un mesaj SCURT și cald de mulțumire publică (pentru Facebook/Instagram), pe care familia/beneficiarul îl poate posta pentru a mulțumi companiei.",
    "Menționează numele companiei exact. Ton sincer, demn, nu exagerat. Include un scurt îndemn pozitiv (ex. să susțină și alții). Poți include linkul campaniei.",
    "Nu inventa detalii despre companie sau despre caz. Răspunde DOAR cu textul mesajului, fără ghilimele, fără explicații.",
  ].join("\n");
  try {
    const text = curata(await apeleazaAI({ system: systemPrompt(), prompt, maxTokens: 500 }));
    return text || null;
  } catch {
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

// --- Modulul „Raport de activitate companii" --------------------------------
// Gardă identică în spirit cu systemPrompt() de mai sus, dar pentru extragere
// de cifre financiare, nu copywriting: interdicție explicită de a inventa sau
// estima orice cifră care nu apare clar în documentul primit.

const CAMPURI_FINANCIARE = [
  "venituri",
  "cheltuieli",
  "activeTotale",
  "datoriiTotale",
  "capitalPropriu",
  "rezultatNet",
] as const;

export type DateFinanciareExtrase = Partial<Record<(typeof CAMPURI_FINANCIARE)[number], number>> & {
  anGasit?: number | null;
};

function systemPromptExtragere(): string {
  return [
    "Ești un contabil care extrage cifre dintr-un document financiar oficial (Balanță de verificare sau Bilanț contabil) al unui ONG din România.",
    "REGULI STRICTE, fără excepție:",
    "- Extrage DOAR cifre care apar EXPLICIT, clar, în documentul primit.",
    "- Dacă o cifră nu apare clar sau nu ești sigur ce reprezintă, pune null pentru ea — NU estima, NU calcula, NU presupune.",
    "- Nu confunda rânduri asemănătoare (ex. active imobilizate vs. active circulante vs. active totale) — dacă nu poți distinge cu certitudine, pune null.",
    "- Răspunde DOAR cu JSON valid, fără text în plus, fără ```.",
  ].join("\n");
}

// Extrage cifrele-cheie dintr-un document financiar — fie un PDF (trimis ca
// atașament, Claude îl citește nativ), fie text tabelar deja parsat dintr-un
// XLSX (vezi parse-balanta-xlsx.ts). Întoarce null (fără cheie / eroare /
// JSON invalid) — apelantul marchează extractieStatus = 'eroare' și cere
// completare manuală, niciodată nu inventează cifre.
export async function extrageDateFinanciareAI(params: {
  an: number;
  tip: "balanta" | "bilant";
  documentPdf?: DocumentAtasat;
  textTabelar?: string;
}): Promise<DateFinanciareExtrase | null> {
  if (!aiConfigurat()) return null;
  if (!params.documentPdf && !params.textTabelar) return null;

  const prompt = [
    `Document: ${params.tip === "balanta" ? "Balanță de verificare" : "Bilanț contabil"}, an fiscal declarat: ${params.an}.`,
    params.textTabelar ? "Conținutul tabelar al documentului (extras dintr-un Excel):\n" + params.textTabelar.slice(0, 20000) : "Documentul e atașat ca PDF.",
    "",
    "Extrage următoarele cifre (în lei, numere întregi, fără text/simbol monetar) dacă apar clar:",
    "- venituri (total venituri anul curent)",
    "- cheltuieli (total cheltuieli anul curent)",
    "- activeTotale (total active)",
    "- datoriiTotale (total datorii)",
    "- capitalPropriu (capitaluri proprii)",
    "- rezultatNet (rezultatul exercițiului — profit sau pierdere; pierdere = număr negativ)",
    "- anGasit (anul fiscal la care se referă documentul, dacă e menționat explicit — altfel null)",
    "",
    "Format de răspuns (JSON valid, fără text în plus, fără ```):",
    '{ "venituri": number|null, "cheltuieli": number|null, "activeTotale": number|null, "datoriiTotale": number|null, "capitalPropriu": number|null, "rezultatNet": number|null, "anGasit": number|null }',
  ].join("\n");

  try {
    const raw = curata(
      await apeleazaAI({
        system: systemPromptExtragere(),
        prompt,
        maxTokens: 800,
        documente: params.documentPdf ? [params.documentPdf] : undefined,
        timeoutMs: 90000,
      }),
    );
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: DateFinanciareExtrase = {};
    for (const camp of CAMPURI_FINANCIARE) {
      const v = parsed[camp];
      if (typeof v === "number" && Number.isFinite(v)) out[camp] = v;
    }
    out.anGasit = typeof parsed.anGasit === "number" ? parsed.anGasit : null;
    return out;
  } catch {
    return null;
  }
}

export type SectiuniRaportActivitate = {
  titlu: string;
  introducere: string;
  rezumatFinanciar: string;
  folosireFonduri: string;
  impact: string;
  multumire: string;
};

function systemPromptRaport(): string {
  return [
    "Ești redactor de rapoarte anuale de activitate pentru un ONG din România, care raportează unui sponsor corporate cum au fost folosite fondurile.",
    "Ton: profesional, transparent, recunoscător — niciodată exagerat sau promoțional.",
    "REGULI STRICTE, fără excepție:",
    "- Folosește DOAR cifrele și faptele primite explicit. NU inventa sume, procente, proiecte, cifre de impact sau declarații.",
    "- Dacă o informație nu-ți e dată, nu o menționa — nu completa cu presupuneri sau formulări vagi care sugerează cifre inexistente.",
    "- Păstrează sumele exact cum îți sunt date (nu rotunji, nu converti monedă).",
    "- Scrie în limba română.",
  ].join("\n");
}

// Generează cele 6 secțiuni ale raportului de activitate pentru O companie/an,
// din cifrele financiare CONFIRMATE (nu direct din extractia AI brută — vezi
// financialDocuments.confirmatLa) și din sponsorizarea reală a companiei.
// Întoarce null (fără cheie / eroare) — apelantul cere completare manuală.
export async function genereazaRaportActivitateAI(params: {
  orgName: string;
  an: number;
  companie: { nume: string; sumaSponsorizata: number | null; proiecte: string[] };
  dateFinanciare: DateFinanciareExtrase | null;
}): Promise<SectiuniRaportActivitate | null> {
  if (!aiConfigurat()) return null;

  const financiar = params.dateFinanciare
    ? Object.entries(params.dateFinanciare)
        .filter(([k, v]) => k !== "anGasit" && typeof v === "number")
        .map(([k, v]) => `${k}: ${(v as number).toLocaleString("ro-RO")} lei`)
        .join(", ") || "necunoscute"
    : "necunoscute";

  const prompt = [
    `Organizație: ${params.orgName}`,
    `An de raportare: ${params.an}`,
    `Companie sponsor: ${params.companie.nume}`,
    params.companie.sumaSponsorizata != null
      ? `Sumă sponsorizată de această companie în ${params.an}: ${params.companie.sumaSponsorizata.toLocaleString("ro-RO")} lei`
      : "Sumă sponsorizată: necunoscută",
    params.companie.proiecte.length ? `Proiecte legate de această sponsorizare: ${params.companie.proiecte.join(", ")}` : "",
    `Cifre financiare confirmate ale organizației pentru ${params.an}: ${financiar}`,
    "",
    "Scrie raportul de activitate cu exact 6 secțiuni, adresat acestei companii sponsor.",
    "Format de răspuns (JSON valid, fără text în plus, fără ```):",
    '{ "titlu": string, "introducere": string, "rezumatFinanciar": string, "folosireFonduri": string, "impact": string, "multumire": string }',
    "- titlu: titlul raportului (ex. include numele organizației și anul).",
    "- introducere: 1 paragraf, prezentarea organizației și scopul raportului.",
    "- rezumatFinanciar: 1 paragraf, folosind DOAR cifrele financiare date mai sus (dacă sunt 'necunoscute', scrie un paragraf general fără cifre inventate).",
    "- folosireFonduri: 1 paragraf despre cum au fost folosite fondurile (dacă proiectele nu sunt date, rămâi general, fără a inventa proiecte).",
    "- impact: 1 paragraf — DOAR dacă ai date concrete de impact; altfel un paragraf scurt, general, fără cifre inventate.",
    "- multumire: 1-2 fraze de mulțumire către companie, menționând-o explicit pe nume.",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const raw = curata(await apeleazaAI({ system: systemPromptRaport(), prompt, maxTokens: 1800 }));
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const sectiuni: Partial<SectiuniRaportActivitate> = {};
    for (const cheie of ["titlu", "introducere", "rezumatFinanciar", "folosireFonduri", "impact", "multumire"] as const) {
      const v = parsed[cheie];
      sectiuni[cheie] = typeof v === "string" ? v.trim() : "";
    }
    if (!sectiuni.titlu || !sectiuni.introducere) return null;
    return sectiuni as SectiuniRaportActivitate;
  } catch {
    return null;
  }
}
