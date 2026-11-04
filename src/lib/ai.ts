import "server-only";

import { apeleazaClaude } from "@/lib/ai-org/client";
import { citesteConfigAi, inregistreazaConsum, mesajFaraCheieAi, rulezaCaOrganizatie } from "@/lib/ai-org/consum-server";
import type { InstrumentAi } from "@/lib/ai-org/consum";
import type { Efort, Loc } from "@/lib/ai-org/protocol";
import { db as dbGlobal } from "@/lib/db";
import { raporteazaEroare } from "@/lib/monitoring";
import { extrageApeluri, normalizeazaUrl, type ApelGasit } from "@/lib/granturi/stari";
import type { ContinutCanal, DateCampanie } from "@/lib/promovare/generator";

// Funcțiile AI de promovare și granturi rulează pe contul Anthropic al ORGANIZAȚIEI (cheia ei, modelul ales de ea): platforma nu are cheie proprie.
// Fără cont conectat apelantul primește mesajul „Conectează contul Anthropic…” (contextAi) și cade pe generatorul determinist unde există.
// Consumul fiecărui apel se înregistrează în Consum AI (nu blochează niciodată generarea).
//
// GARDĂ DE CONȚINUT (secțiunea 5 din cerință): AI-ul primește DOAR informațiile
// aprobate ale campaniei (poveste, titlu, org, URL, sume) și are interdicție
// explicită să inventeze diagnostice, sume, declarații, termene sau date medicale.

// Contextul unui apel: cheia și modelul organizației, citite în faza scurtă cu baza de date; trece prin `pregatit` ca date simple.
// `eroare` se completează când apelul eșuează (credite epuizate, cheie invalidă…), ca apelantul să arate motivul exact.
export type ContextAi = { orgId: string; userId: string; cheie: string; model: string; locale: Loc; instrument: InstrumentAi; eroare: string | null };

export async function contextAi(
  ctx: { db: typeof dbGlobal; orgId: string; userId: string },
  instrument: InstrumentAi,
  locale: Loc,
): Promise<{ ok: true; ai: ContextAi } | { ok: false; eroare: string }> {
  const cfg = await citesteConfigAi(ctx.db, ctx.orgId);
  if (!cfg.conectat || !cfg.cheie) return { ok: false, eroare: mesajFaraCheieAi(locale, cfg.ilizibila) };
  return { ok: true, ai: { orgId: ctx.orgId, userId: ctx.userId, cheie: cfg.cheie, model: cfg.model, locale, instrument, eroare: null } };
}

// Eroare deja explicată utilizatorului (cheie, credite, limită): nu se raportează ca defecțiune.
class EroareAiOrg extends Error {}
const raporteaza = (zona: string, e: unknown) => {
  if (!(e instanceof EroareAiOrg)) raporteazaEroare(zona, e);
};

type CanalContinut = ContinutCanal["canal"];

const ETICHETA_CANAL: Record<CanalContinut, string> = {
  facebook: "Facebook (postare)",
  instagram: "Instagram (caption)",
  tiktok: "TikTok (descriere video)",
  whatsapp: "WhatsApp (mesaj către contacte apropiate)",
  grup_local: "grup local Facebook/WhatsApp (mesaj de apel)",
  comunicat: "comunicat de presă",
};

type ParamsApel = { system: string; prompt: string; maxTokens: number; efort?: Efort; timeoutMs?: number; cautareWeb?: { maxUtilizari: number }; maxTure?: number; termenTotalMs?: number };

// Apelul către Claude cu cheia organizației. maxTokens include și raționamentul modelului, de aceea limitele sunt largi (se plătesc doar tokenii folosiți).
async function apeleaza(ai: ContextAi, p: ParamsApel) {
  const r = await apeleazaClaude({
    cheie: ai.cheie,
    model: ai.model,
    system: p.system,
    mesaje: [{ role: "user", content: p.prompt }],
    maxTokens: p.maxTokens,
    efort: p.efort ?? "low",
    timeoutMs: p.timeoutMs ?? 60_000,
    termenTotalMs: p.termenTotalMs,
    cautareWeb: p.cautareWeb ?? null,
    maxTure: p.maxTure,
    locale: ai.locale,
  });
  try {
    await rulezaCaOrganizatie(ai.orgId, (db) => inregistreazaConsum(db, { orgId: ai.orgId, userId: ai.userId, instrument: ai.instrument, model: r.model, utilizare: r.utilizare, costUsd: r.costUsd }));
  } catch (e) {
    raporteazaEroare("ai-consum-scriere", e, { orgId: ai.orgId });
  }
  if (!r.ok) ai.eroare = r.eroare;
  return r;
}

async function apeleazaAI(ai: ContextAi, p: ParamsApel): Promise<string> {
  const r = await apeleaza(ai, p);
  if (!r.ok) throw new EroareAiOrg(r.eroare);
  if (!r.text) throw new Error("AI a întors un răspuns gol.");
  return r.text;
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
  ai: ContextAi,
  date: DateCampanie,
  canal: CanalContinut,
  variatie?: number,
): Promise<ContinutCanal | null> {
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
    const raw = curata(await apeleazaAI(ai, { system: systemPrompt(), prompt, maxTokens: canal === "comunicat" ? 6000 : 4000 }));
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
    raporteaza("ai", e);
    return null;
  }
}

// Text de mulțumire pentru o sponsorizare de companie (secțiunea 9) — mesaj
// public pe care beneficiarul îl postează pentru a mulțumi firmei. Întoarce null
// (fără cheie / eroare) → apelantul cere completare manuală.
export async function genereazaTextMultumireAI(
  ai: ContextAi,
  date: DateCampanie,
  companie: string,
  suma: number | null,
  moneda: string | null,
): Promise<string | null> {
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
    const text = curata(await apeleazaAI(ai, { system: systemPrompt(), prompt, maxTokens: 2500 }));
    return text || null;
  } catch (e) {
    raporteaza("ai", e);
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

export async function genereazaDraftGrantAI(ai: ContextAi, d: DateDraftGrant): Promise<string | null> {
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
    const text = curata(await apeleazaAI(ai, { system, prompt, maxTokens: 14000, efort: "medium", timeoutMs: 90_000, termenTotalMs: 100_000 }));
    return text || null;
  } catch (e) {
    raporteaza("ai-grant", e);
    return null;
  }
}

// Căutare de apeluri de finanțare cu căutarea web a Anthropic (modulul Granturi). Garda principală: păstrăm DOAR rezultatele al căror link a
// apărut într-un rezultat real al căutării — modelul nu poate propune un link inventat. Termenul se păstrează doar dacă e o dată viitoare validă.
export type RezultatCautareApeluri = { ok: true; apeluri: ApelGasit[] } | { ok: false; eroare: string };

export async function cautaApeluriAI(ai: ContextAi, p: { domeniu: string; zona: string; observatii: string; azi: string }): Promise<RezultatCautareApeluri> {
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

  try {
    // Căutarea lungă poate fi întreruptă de API (pause_turn); apeleazaClaude o reia, dar ținem două ture de cel mult 50 s, sub limita paginii.
    const r = await apeleaza(ai, { system, prompt, maxTokens: 8000, timeoutMs: 50_000, termenTotalMs: 100_000, maxTure: 2, cautareWeb: { maxUtilizari: 3 } });
    if (!r.ok) return { ok: false, eroare: r.eroare };
    // Garda principală: păstrăm doar linkurile care au apărut într-un rezultat real al căutării (sau într-o citare din acestea).
    const gasite = new Set<string>();
    for (const sursa of r.surse) {
      const n = normalizeazaUrl(sursa.url);
      if (n) gasite.add(n);
    }
    return { ok: true, apeluri: extrageApeluri(r.text, gasite, p.azi) };
  } catch (e) {
    raporteaza("ai-cautare-apeluri", e);
    return { ok: false, eroare: ai.locale === "en" ? "The search did not succeed right now. Try again in a few moments." : "Căutarea nu a reușit acum. Încearcă din nou în câteva momente." };
  }
}

export type PostCalendarAI = { obiectiv: string; text: string };

// Generează un plan de N zile de postări, adaptat la stadiul real al campaniei
// (procent, sumă rămasă). Întoarce null (fără cheie / eroare) → apelantul cade pe
// generatorul determinist.
export async function genereazaCalendarZilnicAI(ai: ContextAi, date: DateCampanie, zile = 7): Promise<PostCalendarAI[] | null> {
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
    const raw = curata(await apeleazaAI(ai, { system: systemPrompt(), prompt, maxTokens: 9000 }));
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
    raporteaza("ai", e);
    return null;
  }
}
