import "server-only";

import { raporteazaEroare } from "@/lib/monitoring";
import { extrageApeluri, normalizeazaUrl, type ApelGasit } from "@/lib/granturi/stari";
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
  } catch (e) {
    // Orice eroare (cheie invalidă, timeout, JSON stricat) → null, apelantul cade pe șablon —
    // dar o raportăm, altfel un AI căzut (cheie expirată, credit epuizat) trece neobservat.
    raporteazaEroare("ai", e);
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
  } catch (e) {
    raporteazaEroare("ai", e);
    return null;
  }
}

// Draft de cerere de finanțare (modulul Granturi): pornește din dosarul standard al organizației și din cerințele finanțatorului.
// AI-ul primește DOAR faptele din dosar și din fișa grantului; ce lipsește rămâne marcat pentru completare, nu se inventează.
export type DateDraftGrant = {
  dosar: { eticheta: string; valoare: string }[];
  finantator: string;
  titlu: string;
  suma: string | null;
  termen: string | null;
  cerinte: string | null;
  eligibilitate: string[];
  limba: "ro" | "en";
};

export async function genereazaDraftGrantAI(d: DateDraftGrant): Promise<string | null> {
  if (!aiConfigurat()) return null;
  const ro = d.limba === "ro";
  const system = [
    "Ești specialist în scrierea de cereri de finanțare pentru organizații non-profit din România.",
    ro ? "Scrii în limba română, clar, concret și fără exagerări." : "You write in clear, concrete English, without exaggeration.",
    "REGULI STRICTE, fără excepție:",
    "- Folosește DOAR faptele din dosarul organizației și din fișa grantului. NU inventa cifre, sume, nume, parteneri, date, rezultate, citate sau experiență.",
    ro
      ? "- Când o informație necesară lipsește, scrie exact [DE COMPLETAT: ce informație lipsește], în locul ei. Nu completa cu presupuneri."
      : "- When a needed piece of information is missing, write exactly [TO COMPLETE: what is missing] in its place. Do not fill gaps with assumptions.",
    "- Păstrează cifrele și sumele exact cum ți-au fost date (nu le rotunji, nu le converti).",
    "- Dacă cerințele finanțatorului enumeră secțiuni sau limite de lungime, respectă-le; altfel folosește: rezumat, nevoia și contextul, obiective, activități, rezultate așteptate, despre organizație, sustenabilitate. Adaugă bugetul doar dacă există date pentru el.",
    "- Fără formatare Markdown (fără #, **, liste cu steluțe): titluri de secțiune pe rând separat, apoi text simplu. Răspunde DOAR cu cererea, fără comentarii.",
  ].join("\n");
  const prompt = [
    `Finanțator: ${d.finantator}`,
    `Programul / apelul: ${d.titlu}`,
    d.suma ? `Suma solicitată: ${d.suma}` : "Suma solicitată: necomunicată",
    d.termen ? `Termen de depunere: ${d.termen}` : "",
    "",
    "Cerințele finanțatorului (lipite din ghid; singura sursă pentru structura și limitele cererii):",
    d.cerinte?.trim() || "(nu au fost completate — folosește structura implicită)",
    d.eligibilitate.length ? "\nCriterii de eligibilitate de reținut:\n" + d.eligibilitate.map((e) => "- " + e).join("\n") : "",
    "",
    "Dosarul organizației (singura sursă de fapte despre organizație):",
    d.dosar.length ? d.dosar.map((x) => `${x.eticheta}: ${x.valoare}`).join("\n") : "(dosarul este gol — marchează tot ce lipsește)",
  ]
    .filter((l, i, a) => l !== "" || a[i - 1] !== "")
    .join("\n");
  try {
    const text = curata(await apeleazaAI({ system, prompt, maxTokens: 3000, timeoutMs: 90000 }));
    return text || null;
  } catch (e) {
    raporteazaEroare("ai-grant", e);
    return null;
  }
}

// Căutare de apeluri de finanțare cu căutarea web a Anthropic (modulul Granturi). Garda principală: păstrăm DOAR rezultatele al căror link a
// apărut într-un rezultat real al căutării — modelul nu poate propune un link inventat. Termenul se păstrează doar dacă e o dată viitoare validă.
export type RezultatCautareApeluri = { ok: true; apeluri: ApelGasit[] } | { ok: false; eroare: string };

export async function cautaApeluriAI(p: { domeniu: string; zona: string; observatii: string; azi: string }): Promise<RezultatCautareApeluri> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { ok: false, eroare: "Căutarea cu AI nu e configurată pe această platformă." };
  const model = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;
  const system = [
    "Ești cercetător de oportunități de finanțare pentru organizații non-profit din România.",
    "Folosește căutarea web ca să găsești apeluri sau programe de finanțare DESCHISE sau care se repetă anual și sunt potrivite cererii.",
    "REGULI STRICTE:",
    "- Fiecare rezultat trebuie să aibă un link care a apărut într-un rezultat real al căutării. NU inventa finanțatori, apeluri, sume sau termene.",
    "- Pune termenul de depunere (format AAAA-LL-ZZ) doar dacă îl ai din pagina găsită; altfel null. Nu ghici.",
    "- Preferă surse oficiale ale finanțatorului față de agregatoare. Ignoră apelurile închise.",
    "- Răspunde DOAR cu un array JSON, fără alt text, de cel mult 8 elemente: [{\"finantator\": \"...\", \"titlu\": \"...\", \"termen\": \"AAAA-LL-ZZ\" sau null, \"url\": \"https://...\", \"motiv\": \"o propoziție: de ce se potrivește\"}]. Dacă nu găsești nimic sigur, răspunde cu [].",
  ].join("\n");
  const prompt = [
    `Data de azi: ${p.azi}`,
    `Domeniul de activitate al organizației: ${p.domeniu || "nespecificat"}`,
    `Zona geografică: ${p.zona}`,
    p.observatii ? `Alte precizări: ${p.observatii}` : "",
    "Caută apeluri de finanțare relevante pentru o organizație non-profit din România.",
  ]
    .filter(Boolean)
    .join("\n");

  const messages: unknown[] = [{ role: "user", content: prompt }];
  const gasite = new Set<string>();
  let text = "";
  try {
    // „pause_turn”: căutarea lungă e întreruptă de API și se continuă retrimițând răspunsul parțial (o singură dată: două ture de cel mult 50 s, sub limita paginii).
    for (let tura = 0; tura < 2; tura++) {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 50_000);
      let res: Response;
      try {
        res = await fetch(ANTHROPIC_URL, {
          method: "POST",
          headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
          body: JSON.stringify({ model, max_tokens: 3000, system, messages, tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 3 }] }),
          signal: ctrl.signal,
        });
      } finally {
        clearTimeout(t);
      }
      if (!res.ok) {
        const detaliu = await res.text().catch(() => "");
        if (res.status === 400 && /web.?search/i.test(detaliu)) return { ok: false, eroare: "Căutarea web nu e activată pentru contul Anthropic al platformei." };
        throw new Error(`AI a răspuns ${res.status}. ${detaliu.slice(0, 200)}`);
      }
      const data = (await res.json()) as { content?: Array<{ type: string; text?: string; content?: unknown }>; stop_reason?: string };
      for (const b of data.content ?? []) {
        if (b.type === "text" && typeof b.text === "string") text += b.text;
        if (b.type === "web_search_tool_result" && Array.isArray(b.content)) {
          for (const r of b.content as Array<{ url?: string }>) {
            const n = r.url ? normalizeazaUrl(r.url) : null;
            if (n) gasite.add(n);
          }
        }
      }
      if (data.stop_reason !== "pause_turn") break;
      messages.push({ role: "assistant", content: data.content });
    }
  } catch (e) {
    raporteazaEroare("ai-cautare-apeluri", e);
    return { ok: false, eroare: "Căutarea nu a reușit acum. Încearcă din nou în câteva momente." };
  }

  return { ok: true, apeluri: extrageApeluri(text, gasite, p.azi) };
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
  } catch (e) {
    raporteazaEroare("ai", e);
    return null;
  }
}
