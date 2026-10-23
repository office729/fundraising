// Prospectare de decidenți (pachetul IMPACT): reguli de scor, adaptoare către furnizori (Apollo, Hunter) și orchestratorul căutării. Fără DB; rețeaua se injectează
// (`fetchFn`), deci totul se testează direct. Fiecare ONG folosește PROPRIILE chei la furnizori. Portat din CRM-ul Asociației Salvează o Inimă.
//
// Scorul de decident: cât de potrivită e o persoană pentru o discuție despre sponsorizare, după funcție. Fiecare nivel are o prioritate
// (1 = cel mai important); primul nivel care se potrivește câștigă. Fără AI: reguli pe care le poți citi și verifica.

const faraDiacritice = (s: string) =>
  (s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

// „Product Owner”, „Data Owner”, „Process Owner”… sunt roluri de execuție (IT, operațiuni), nu proprietarul firmei.
const RE_OWNER_FALS = /\b(product|products|process|data|service|solution|system|systems|platform|technical|tech|content|application|app|risk|budget|project|program|programme|feature|asset|control|account|category|brand|release|domain|capability|change|quality|test)\s+owner\b/gi;
export function faraOwnerFals(titlu: string): string {
  return (titlu || "").replace(RE_OWNER_FALS, " ");
}

const NIVELURI: { prioritate: number; baza: number; re: RegExp }[] = [
  { prioritate: 1, baza: 100, re: /\b(ceo|chief executive|owner|proprietar|co-?founder|founder|fondator|asociat unic|administrator|presedinte|president)\b/ },
  { prioritate: 2, baza: 95, re: /\b(cfo|chief financial|finance director|director financiar|director economic|head of finance|financial director)\b/ },
  // Contabilul-șef sau economistul-șef: intermediar util (știe de D177), dar nu decide singur.
  { prioritate: 2, baza: 75, re: /\b(contabil sef|economist sef|chief accountant|contabil)\b/ },
  { prioritate: 3, baza: 95, re: /\b(csr|esg|sustainab|sustenabil|corporate affairs|corporate responsibility|responsabilitate sociala)\b/ },
  { prioritate: 1, baza: 90, re: /\b(general manager|managing director|director general|country manager|director executiv|executive director)\b/ },
  { prioritate: 4, baza: 80, re: /\b(marketing director|director (de )?marketing|head of marketing|cmo|chief marketing|pr manager|public relations|communications?|comunicare|corporate communications)\b/ },
  { prioritate: 5, baza: 70, re: /\b(hr director|director (de )?resurse umane|head of hr|hr manager|people director|people ?& ?culture|chief people|resurse umane|human resources)\b/ },
];

// Funcții de filială sau magazin: nu decid sponsorizări la nivel de companie.
const RE_LOCAL = /\b(magazin|store|shop|sucursal|filial|branch|punct de lucru|regional|zonal|area|depozit|warehouse|agentie|agency)\b/;

export type ScorDecident = { scor: number; prioritate: number | null };

// `angajati` (mărimea firmei) schimbă pe cine contactezi întâi: sub 50 de angajați decide patronul sau administratorul (+10);
// peste 250, CSR (+20) și comunicarea sau marketingul (+10) au buget și proces de sponsorizare.
export function scorDecident(titlu: string, opts: { seniority?: string; romania?: boolean; angajati?: number | null } = {}): ScorDecident {
  const t = faraDiacritice(faraOwnerFals(titlu));
  const sen = faraDiacritice(opts.seniority || "");
  if (!t && !sen) return { scor: 0, prioritate: null };
  if (/\b(intern|stagiar|trainee|practicant)\b/.test(t)) return { scor: 0, prioritate: null };

  let baza = 30;
  let prioritate: number | null = null;
  const nivel = NIVELURI.find((n) => n.re.test(t));
  if (nivel) {
    baza = nivel.baza;
    prioritate = nivel.prioritate;
  } else if (/\b(director|head)\b/.test(t)) {
    baza = 45;
  } else if (/\bmanager\b/.test(t)) {
    baza = 50;
  } else if (/\b(specialist|consultant|assistant|asistent|referent|operator|agent)\b/.test(t)) {
    baza = 20;
  }

  let bonus = 0;
  if (/\b(chief|ceo|cfo|cmo|coo|cto|c-suite|c_suite)\b/.test(t) || sen === "c_suite" || sen === "c-suite") bonus += 20;
  else if (/\bdirector\b/.test(t) || sen === "director") bonus += 15;
  else if (/\bhead\b/.test(t) || sen === "head") bonus += 10;
  if (opts.romania) bonus += 10;
  if (RE_LOCAL.test(t) && (prioritate === null || prioritate > 1)) bonus -= 40;
  const ang = opts.angajati ?? null;
  if (ang !== null && ang > 0) {
    if (ang < 50 && prioritate === 1) bonus += 10;
    if (ang > 250 && prioritate === 3) bonus += 20;
    if (ang > 250 && prioritate === 4) bonus += 10;
  }
  return { scor: Math.max(0, baza + bonus), prioritate };
}

// Numele aduse la o cheie stabilă: fără diacritice și punctuație, cuvintele în ordine alfabetică („Popescu Ion” = „Ion Popescu”). Spre deosebire de
// potrivirea căilor calde, aici un nume cu un singur cuvânt tot primește o cheie (ca să nu se piardă un candidat).
export function cheieNume(nume: string): string {
  const cuvinte = faraDiacritice(nume)
    .replace(/[^a-z\s-]/g, " ")
    .split(/[\s-]+/)
    .filter(Boolean);
  return [...cuvinte].sort().join(" ");
}

// Domeniul curat dintr-un URL de site („https://www.firma.ro/contact” → „firma.ro”).
export function domeniuDinSite(site: string | null | undefined): string | null {
  if (!site) return null;
  const d = site
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/[/?#].*$/, "")
    .toLowerCase();
  return d && d.includes(".") && !/\s/.test(d) ? d : null;
}

const WEBMAIL = new Set(["gmail.com", "googlemail.com", "yahoo.com", "yahoo.ro", "hotmail.com", "hotmail.ro", "outlook.com", "live.com", "msn.com", "icloud.com", "me.com", "aol.com", "protonmail.com", "proton.me", "gmx.com", "gmx.net", "yandex.com", "mail.ru", "mail.com", "zoho.com"]);

// Domeniul firmei dintr-un e-mail al unui contact, dacă nu e webmail (ex. „ion@firma.ro” → „firma.ro”).
export function domeniuDinEmail(email: string | null | undefined): string | null {
  const parti = (email || "").trim().toLowerCase().split("@");
  if (parti.length !== 2) return null;
  const d = parti[1].trim();
  return d && d.includes(".") && !WEBMAIL.has(d) ? d : null;
}

export function linkedinNormalizat(url: string | null | undefined): string {
  return (url || "")
    .trim()
    .toLowerCase()
    .replace(/[?#].*$/, "")
    .replace(/^https?:\/\/(www\.)?/, "")
    .replace(/\/+$/, "");
}

// Departamentul din CRM, după departamentul și funcția primite de la furnizor.
export function departamentCrm(departament: string | null | undefined, functie: string | null | undefined, seniority?: string | null): string {
  const d = faraDiacritice(faraOwnerFals(`${departament || ""} ${functie || ""}`));
  const s = faraDiacritice(seniority || "");
  if (/(financ|account|contab)/.test(d)) return "Financiar";
  if (/(executive|management|ceo|owner|director|administrator|president|founder)/.test(d) || ["owner", "founder", "c_suite"].includes(s)) return "Conducere";
  if (/(\bhr\b|human)/.test(d)) return "HR";
  return "";
}

// ============================================================================
// Adaptoare către furnizori
// ============================================================================

export type FetchFn = (url: string, init?: RequestInit) => Promise<Response>;
// Furnizori de date: găsesc decidenți și e-mailuri. Fiecare organizație își pune propriile chei.
export type Furnizor = "apollo" | "hunter" | "prospeo" | "lusha";
export const FURNIZORI: readonly Furnizor[] = ["lusha", "apollo", "prospeo", "hunter"];
export const NUME_FURNIZOR: Record<Furnizor, string> = { apollo: "Apollo", hunter: "Hunter", prospeo: "Prospeo", lusha: "Lusha" };
// Conectori: furnizorii de date + Waalaxy (trimite persoanele aprobate în campanii LinkedIn; nu caută date).
export type Conector = Furnizor | "waalaxy";
export const CONECTORI: readonly Conector[] = [...FURNIZORI, "waalaxy"];
export const NUME_CONECTOR: Record<Conector, string> = { ...NUME_FURNIZOR, waalaxy: "Waalaxy" };

export type CandidatBrut = {
  nume: string;
  rol: string;
  dept: string;
  linkedin: string;
  email: string;
  emailStatus: string | null; // valid | risky | invalid | null (neverificat)
  sursa: Furnizor;
  ids?: Partial<Record<Furnizor, string>>; // id-ul persoanei la fiecare furnizor care a găsit-o
  cerereLusha?: string; // Lusha leagă îmbogățirea de cererea de căutare
  seniority?: string;
};

export type Rezultat<T> = { ok: true; date: T } | { ok: false; eroare: string; status?: number };

const APOLLO = "https://api.apollo.io/api/v1";
const HUNTER = "https://api.hunter.io/v2";

function eroareHttp(furnizor: Furnizor, status: number, mesaj?: string): string {
  const nume = NUME_FURNIZOR[furnizor];
  if (status === 401 || status === 403) return `${nume} nu a acceptat cheia: verifică-o în Setări → Prospectare.`;
  if (status === 429) return `Limita contului tău de la ${nume} a fost atinsă; încearcă mai târziu.`;
  return mesaj ? `${nume}: ${mesaj}` : `${nume} a răspuns cu eroarea ${status}.`;
}

function eroareRetea(furnizor: Furnizor, e: unknown): string {
  return `${NUME_FURNIZOR[furnizor]} nu a răspuns (${e instanceof Error ? e.name : "eroare de rețea"}).`;
}

const emailReal = (e?: string | null) => {
  const v = (e || "").trim();
  return !v || v.includes("email_not_unlocked") || v.startsWith("not_unlocked") ? "" : v;
};

// ===== Apollo =====
const SENIORITATI_DECIDENTI = ["owner", "founder", "c_suite", "partner", "vp", "director", "head"];
const TITLURI_DECIDENTI = ["CEO", "Owner", "Administrator", "Managing Director", "General Manager", "Director General", "CFO", "Chief Financial Officer", "Finance Director", "Director Financiar", "Director Economic", "President", "Presedinte", "Contabil", "Chief Accountant", "CSR Manager", "Marketing Director"];

type PersoanaApollo = { id?: string; name?: string; first_name?: string; last_name?: string; title?: string; seniority?: string; departments?: string[]; linkedin_url?: string; email?: string };

const headereApollo = (cheie: string) => ({ "X-Api-Key": cheie, "Content-Type": "application/json", "Cache-Control": "no-cache" });

export async function apolloValideaza(cheie: string, f: FetchFn): Promise<Rezultat<true>> {
  try {
    const res = await f(`${APOLLO}/auth/health`, { headers: headereApollo(cheie), signal: AbortSignal.timeout(15000), cache: "no-store" });
    return res.ok ? { ok: true, date: true } : { ok: false, eroare: eroareHttp("apollo", res.status), status: res.status };
  } catch (e) {
    return { ok: false, eroare: eroareRetea("apollo", e) };
  }
}

// Caută decidenții unei firme după domeniu (sau, în lipsa lui, după nume). Căutarea în Apollo nu consumă credite; emailul se obține separat.
export async function apolloCauta(cheie: string, firma: { nume: string; domeniu: string | null }, f: FetchFn): Promise<Rezultat<CandidatBrut[]>> {
  const corp: Record<string, unknown> = { page: 1, per_page: 25, person_seniorities: SENIORITATI_DECIDENTI, person_titles: TITLURI_DECIDENTI, person_locations: ["Romania"] };
  if (firma.domeniu) corp.q_organization_domains_list = [firma.domeniu];
  else corp.q_organization_name = firma.nume;
  try {
    const res = await f(`${APOLLO}/mixed_people/api_search`, { method: "POST", headers: headereApollo(cheie), body: JSON.stringify(corp), signal: AbortSignal.timeout(20000), cache: "no-store" });
    const j = (await res.json().catch(() => ({}))) as { people?: PersoanaApollo[]; error?: string; error_message?: string };
    if (!res.ok) return { ok: false, eroare: eroareHttp("apollo", res.status, j.error_message || j.error), status: res.status };
    const candidati: CandidatBrut[] = (j.people ?? [])
      .filter((p) => p.id)
      .map((p) => ({
        nume: (p.name || `${p.first_name || ""} ${p.last_name || ""}`).trim(),
        rol: p.title || "",
        dept: departamentCrm((p.departments || []).join(" "), p.title, p.seniority),
        linkedin: p.linkedin_url || "",
        email: "",
        emailStatus: null,
        sursa: "apollo" as const,
        ids: { apollo: String(p.id) },
        seniority: p.seniority || "",
      }))
      .filter((c) => c.nume);
    return { ok: true, date: candidati };
  } catch (e) {
    return { ok: false, eroare: eroareRetea("apollo", e) };
  }
}

// Obține e-mailul de serviciu al persoanelor alese (după id). CONSUMĂ credite din contul Apollo al organizației. Fără e-mailuri personale.
export async function apolloImbogateste(cheie: string, ids: string[], f: FetchFn): Promise<Rezultat<Record<string, string>>> {
  if (ids.length === 0) return { ok: true, date: {} };
  try {
    const res = await f(`${APOLLO}/people/bulk_match`, { method: "POST", headers: headereApollo(cheie), body: JSON.stringify({ reveal_personal_emails: false, details: ids.slice(0, 50).map((id) => ({ id })) }), signal: AbortSignal.timeout(30000), cache: "no-store" });
    const j = (await res.json().catch(() => ({}))) as { matches?: (PersoanaApollo | null)[]; error_message?: string };
    if (!res.ok) return { ok: false, eroare: eroareHttp("apollo", res.status, j.error_message), status: res.status };
    const emailuri: Record<string, string> = {};
    for (const m of j.matches ?? []) {
      const email = emailReal(m?.email);
      if (m?.id && email) emailuri[String(m.id)] = email;
    }
    return { ok: true, date: emailuri };
  } catch (e) {
    return { ok: false, eroare: eroareRetea("apollo", e) };
  }
}

// ===== Hunter =====
type EmailHunter = { value?: string; first_name?: string; last_name?: string; position?: string; department?: string; seniority?: string; confidence?: number; linkedin?: string; verification?: { status?: string } };
const headereHunter = (cheie: string) => ({ "X-API-KEY": cheie });

export async function hunterValideaza(cheie: string, f: FetchFn): Promise<Rezultat<true>> {
  try {
    const res = await f(`${HUNTER}/account`, { headers: headereHunter(cheie), signal: AbortSignal.timeout(15000), cache: "no-store" });
    return res.ok ? { ok: true, date: true } : { ok: false, eroare: eroareHttp("hunter", res.status), status: res.status };
  } catch (e) {
    return { ok: false, eroare: eroareRetea("hunter", e) };
  }
}

const ROL_DECIZIE = /(ceo|owner|founder|administrator|managing|general manager|director|cfo|financ|econom|president|presedinte|contab|chief|head)/i;

function statusHunter(s: string | undefined): string | null {
  const v = (s || "").toLowerCase();
  if (!v) return null;
  if (v === "valid" || v === "deliverable") return "valid";
  if (v === "invalid" || v === "undeliverable" || v === "disposable") return "invalid";
  return "risky";
}

// Emailurile publice găsite pe domeniul firmei (cu funcție). Consumă 1 credit Hunter pe căutare.
export async function hunterDomeniu(cheie: string, domeniu: string, f: FetchFn): Promise<Rezultat<CandidatBrut[]>> {
  try {
    const res = await f(`${HUNTER}/domain-search?domain=${encodeURIComponent(domeniu)}&limit=25`, { headers: headereHunter(cheie), signal: AbortSignal.timeout(20000), cache: "no-store" });
    const j = (await res.json().catch(() => ({}))) as { data?: { emails?: EmailHunter[] }; errors?: { details?: string }[] };
    if (!res.ok) return { ok: false, eroare: eroareHttp("hunter", res.status, j.errors?.[0]?.details), status: res.status };
    const candidati: CandidatBrut[] = (j.data?.emails ?? [])
      .filter((e) => e.value)
      .map((e) => ({
        nume: `${e.first_name || ""} ${e.last_name || ""}`.trim(),
        rol: e.position || "",
        dept: departamentCrm(e.department, e.position, e.seniority),
        linkedin: e.linkedin || "",
        email: String(e.value),
        emailStatus: statusHunter(e.verification?.status),
        sursa: "hunter" as const,
        seniority: e.seniority || "",
      }))
      .filter((c) => c.nume && ROL_DECIZIE.test(faraOwnerFals(`${c.rol} ${c.dept} ${c.seniority}`)));
    return { ok: true, date: candidati };
  } catch (e) {
    return { ok: false, eroare: eroareRetea("hunter", e) };
  }
}

// Emailul cel mai probabil al unei persoane pe domeniul firmei. Consumă 1 credit Hunter.
export async function hunterEmail(cheie: string, domeniu: string, numeComplet: string, f: FetchFn): Promise<Rezultat<{ email: string; status: string | null }>> {
  try {
    const res = await f(`${HUNTER}/email-finder?domain=${encodeURIComponent(domeniu)}&full_name=${encodeURIComponent(numeComplet)}`, { headers: headereHunter(cheie), signal: AbortSignal.timeout(15000), cache: "no-store" });
    const j = (await res.json().catch(() => ({}))) as { data?: { email?: string; verification?: { status?: string } } };
    if (!res.ok) return { ok: false, eroare: eroareHttp("hunter", res.status), status: res.status };
    return { ok: true, date: { email: String(j.data?.email || ""), status: statusHunter(j.data?.verification?.status) } };
  } catch (e) {
    return { ok: false, eroare: eroareRetea("hunter", e) };
  }
}

// Verifică dacă un e-mail există și poate primi mesaje (valid, riscant sau invalid). Consumă 1 credit Hunter.
export async function hunterVerifica(cheie: string, email: string, f: FetchFn): Promise<Rezultat<string | null>> {
  try {
    const res = await f(`${HUNTER}/email-verifier?email=${encodeURIComponent(email)}`, { headers: headereHunter(cheie), signal: AbortSignal.timeout(15000), cache: "no-store" });
    const j = (await res.json().catch(() => ({}))) as { data?: { status?: string; result?: string } };
    if (!res.ok) return { ok: false, eroare: eroareHttp("hunter", res.status), status: res.status };
    return { ok: true, date: statusHunter(j.data?.status || j.data?.result) };
  } catch (e) {
    return { ok: false, eroare: eroareRetea("hunter", e) };
  }
}

// ===== Prospeo =====
const PROSPEO = "https://api.prospeo.io";
const SENIORITATI_PROSPEO = ["Founder/Owner", "C-Suite", "Partner", "Vice President", "Head", "Director"];
const headerePr = (cheie: string) => ({ "X-KEY": cheie, "Content-Type": "application/json" });

// Furnizorii nu au toți un apel gratuit documentat pentru verificarea cheii. Respingem doar când furnizorul spune clar că cheia nu e bună
// (401/403 sau un cod de eroare care o menționează); orice alt răspuns fără eroare de autentificare înseamnă că cheia nu a fost respinsă.
async function valideazaTolerant(furnizor: Furnizor, res: Response): Promise<Rezultat<true>> {
  if (res.ok) return { ok: true, date: true };
  if (res.status === 401 || res.status === 403) return { ok: false, eroare: eroareHttp(furnizor, res.status), status: res.status };
  const j = (await res.json().catch(() => ({}))) as { error_code?: string; message?: string; error?: string };
  const cod = `${j.error_code ?? ""} ${j.message ?? ""} ${j.error ?? ""}`;
  if (/(invalid|unauthori[sz]ed|forbidden).*(key|token|api)|(key|token|api).*(invalid|unauthori[sz]ed)/i.test(cod)) return { ok: false, eroare: eroareHttp(furnizor, 401), status: 401 };
  if (res.status >= 500 || res.status === 429) return { ok: false, eroare: eroareHttp(furnizor, res.status), status: res.status };
  return { ok: true, date: true };
}

export async function prospeoValideaza(cheie: string, f: FetchFn): Promise<Rezultat<true>> {
  try {
    return await valideazaTolerant("prospeo", await f(`${PROSPEO}/account-information`, { headers: headerePr(cheie), signal: AbortSignal.timeout(15000), cache: "no-store" }));
  } catch (e) {
    return { ok: false, eroare: eroareRetea("prospeo", e) };
  }
}

type PersoanaProspeo = {
  person_id?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  current_job_title?: string | null;
  linkedin_url?: string | null;
  email?: { status?: string | null; revealed?: boolean | null; email?: string | null } | null;
};

// Răspunsul vine fie direct, fie împachetat în { data | response }.
function corpProspeo<T>(j: unknown): T {
  const o = (j || {}) as Record<string, unknown>;
  return ((o.data as T) || (o.response as T) || (o as T)) as T;
}

// Căutarea consumă 1 credit pe pagină cu rezultate.
export async function prospeoCauta(cheie: string, firma: { nume: string; domeniu: string | null }, f: FetchFn): Promise<Rezultat<CandidatBrut[]>> {
  const filtre = {
    company: firma.domeniu ? { websites: { include: [firma.domeniu] } } : { names: { include: [firma.nume] } },
    person_seniority: { include: SENIORITATI_PROSPEO },
    person_location_search: { include: ["Romania"] },
  };
  try {
    const res = await f(`${PROSPEO}/search-person`, { method: "POST", headers: headerePr(cheie), body: JSON.stringify({ page: 1, filters: filtre }), signal: AbortSignal.timeout(20000), cache: "no-store" });
    const j = (await res.json().catch(() => ({}))) as unknown;
    if (!res.ok) {
      const o = (j || {}) as { error_code?: string; message?: string };
      if (o.error_code === "NO_RESULTS") return { ok: true, date: [] };
      return { ok: false, eroare: eroareHttp("prospeo", res.status, o.message), status: res.status };
    }
    const b = corpProspeo<{ results?: { person?: PersoanaProspeo }[] }>(j);
    const candidati: CandidatBrut[] = (b.results ?? [])
      .map((r) => r.person)
      .filter((p): p is PersoanaProspeo => Boolean(p?.person_id))
      .map((p) => ({
        nume: (p.full_name || `${p.first_name || ""} ${p.last_name || ""}`).trim(),
        rol: p.current_job_title || "",
        dept: departamentCrm("", p.current_job_title),
        linkedin: p.linkedin_url || "",
        email: "",
        emailStatus: null,
        sursa: "prospeo" as const,
        ids: { prospeo: String(p.person_id) },
      }))
      .filter((c) => c.nume);
    return { ok: true, date: candidati };
  } catch (e) {
    return { ok: false, eroare: eroareRetea("prospeo", e) };
  }
}

// E-mailul persoanelor alese (după id). CONSUMĂ credite Prospeo: 1 pe e-mail găsit.
export async function prospeoImbogateste(cheie: string, ids: string[], f: FetchFn): Promise<Rezultat<Record<string, { email: string; verificat: boolean }>>> {
  if (ids.length === 0) return { ok: true, date: {} };
  try {
    const res = await f(`${PROSPEO}/bulk-enrich-person`, { method: "POST", headers: headerePr(cheie), body: JSON.stringify({ only_verified_email: false, enrich_mobile: false, data: ids.slice(0, 25).map((id) => ({ identifier: id, person_id: id })) }), signal: AbortSignal.timeout(45000), cache: "no-store" });
    const j = (await res.json().catch(() => ({}))) as unknown;
    if (!res.ok) {
      const o = (j || {}) as { error_code?: string; message?: string };
      if (o.error_code === "NO_RESULTS") return { ok: true, date: {} };
      return { ok: false, eroare: eroareHttp("prospeo", res.status, o.message), status: res.status };
    }
    const b = corpProspeo<{ matched?: { identifier?: string; person?: PersoanaProspeo }[] }>(j);
    const rezultat: Record<string, { email: string; verificat: boolean }> = {};
    for (const m of b.matched ?? []) {
      const p = m?.person;
      const email = p?.email?.revealed !== false && p?.email?.email && !p.email.email.includes("*") ? p.email.email : "";
      const id = String(m?.identifier || p?.person_id || "");
      if (id && email) rezultat[id] = { email, verificat: p?.email?.status === "VERIFIED" };
    }
    return { ok: true, date: rezultat };
  } catch (e) {
    return { ok: false, eroare: eroareRetea("prospeo", e) };
  }
}

// ===== Lusha =====
const LUSHA = "https://api.lusha.com";
const SENIORITATI_LUSHA = [10, 9, 7, 8, 6]; // founder, c-suite, partner, VP, director
const headereLusha = (cheie: string) => ({ api_key: cheie, "Content-Type": "application/json" });

export async function lushaValideaza(cheie: string, f: FetchFn): Promise<Rezultat<true>> {
  try {
    return await valideazaTolerant("lusha", await f(`${LUSHA}/account/usage`, { headers: headereLusha(cheie), signal: AbortSignal.timeout(15000), cache: "no-store" }));
  } catch (e) {
    return { ok: false, eroare: eroareRetea("lusha", e) };
  }
}

type PersoanaLusha = { contactId?: string; name?: string; jobTitle?: string; departments?: string[] };

function deptLusha(departamente: string[] | undefined): string {
  const d = (departamente || []).join(" ").toLowerCase();
  if (d.includes("finance")) return "Financiar";
  if (d.includes("management")) return "Conducere";
  if (d.includes("human resources")) return "HR";
  return "";
}

// Caută decidenții firmei: întâi cu locația România, apoi fără filtru de țară (prima treaptă cu rezultate câștigă). Fiecare cerere consumă 1 credit.
export async function lushaCauta(cheie: string, firma: { nume: string; domeniu: string | null }, f: FetchFn): Promise<Rezultat<{ candidati: CandidatBrut[]; cereri: number }>> {
  const companii: Record<string, unknown> = { include: { names: [firma.nume], ...(firma.domeniu ? { domains: [firma.domeniu] } : {}) } };
  const trepte: Record<string, unknown>[] = [{ seniority: SENIORITATI_LUSHA, locations: [{ country: "Romania" }] }, { seniority: SENIORITATI_LUSHA }];
  let cereri = 0;
  try {
    for (const include of trepte) {
      const res = await f(`${LUSHA}/prospecting/contact/search`, { method: "POST", headers: headereLusha(cheie), body: JSON.stringify({ pages: { page: 0, size: 25 }, filters: { companies: companii, contacts: { include } } }), signal: AbortSignal.timeout(20000), cache: "no-store" });
      cereri++;
      const j = (await res.json().catch(() => ({}))) as { requestId?: string; data?: PersoanaLusha[]; message?: string };
      if (!res.ok) return { ok: false, eroare: eroareHttp("lusha", res.status, j.message), status: res.status };
      const candidati: CandidatBrut[] = (j.data ?? [])
        .filter((c) => c.contactId && c.name)
        .map((c) => ({
          nume: String(c.name),
          rol: c.jobTitle || "",
          dept: deptLusha(c.departments) || departamentCrm("", c.jobTitle),
          linkedin: "",
          email: "",
          emailStatus: null,
          sursa: "lusha" as const,
          ids: { lusha: String(c.contactId) },
          cerereLusha: j.requestId,
        }));
      if (candidati.length > 0) return { ok: true, date: { candidati, cereri } };
    }
    return { ok: true, date: { candidati: [], cereri } };
  } catch (e) {
    return { ok: false, eroare: eroareRetea("lusha", e) };
  }
}

// E-mailul persoanelor alese (după cererea de căutare). CONSUMĂ credite Lusha. Rezultatul se potrivește pe nume (Lusha nu întoarce id-ul la îmbogățire).
export async function lushaImbogateste(cheie: string, cerereId: string, ids: string[], f: FetchFn): Promise<Rezultat<{ nume: string; email: string; linkedin: string }[]>> {
  if (ids.length === 0) return { ok: true, date: [] };
  try {
    const res = await f(`${LUSHA}/prospecting/contact/enrich`, { method: "POST", headers: headereLusha(cheie), body: JSON.stringify({ requestId: cerereId, contactIds: ids }), signal: AbortSignal.timeout(30000), cache: "no-store" });
    const j = (await res.json().catch(() => ({}))) as { contacts?: { isSuccess?: boolean; data?: Record<string, unknown> }[]; message?: string };
    if (!res.ok) return { ok: false, eroare: eroareHttp("lusha", res.status, j.message), status: res.status };
    const rezultat: { nume: string; email: string; linkedin: string }[] = [];
    for (const c of j.contacts ?? []) {
      if (!c?.isSuccess || !c.data) continue;
      const d = c.data;
      const emailuri = (d.emailAddresses as { email?: string }[] | undefined) || [];
      const social = (d.socialLinks as { linkedin?: string } | undefined) || {};
      const nume = String(d.fullName || `${d.firstName || ""} ${d.lastName || ""}`.trim());
      const email = String(emailuri[0]?.email || "");
      if (nume && (email || social.linkedin)) rezultat.push({ nume, email, linkedin: String(social.linkedin || "") });
    }
    return { ok: true, date: rezultat };
  } catch (e) {
    return { ok: false, eroare: eroareRetea("lusha", e) };
  }
}

// ===== Waalaxy (trimiterea persoanelor aprobate către o listă sau o campanie de pe LinkedIn) =====
// API-ul Waalaxy permite doar trimiterea de prospecți (liste, campanii); răspunsurile se văd în Waalaxy, nu se pot citi prin API.
const WAALAXY = "https://developers.waalaxy.com";
const headereWaalaxy = (cheie: string) => ({ Authorization: `Bearer ${cheie}`, "Content-Type": "application/json", Accept: "application/json" });

export type ElementWaalaxy = { id: string; nume: string };

async function waalaxy<T>(cheie: string, cale: string, f: FetchFn, init: { method?: string; body?: unknown } = {}): Promise<Rezultat<T>> {
  try {
    const res = await f(`${WAALAXY}${cale}`, { method: init.method ?? "GET", headers: headereWaalaxy(cheie), body: init.body ? JSON.stringify(init.body) : undefined, signal: AbortSignal.timeout(20000), cache: "no-store" });
    const text = await res.text().catch(() => "");
    let date: unknown = null;
    try {
      date = text ? JSON.parse(text) : null;
    } catch {
      date = text;
    }
    if (!res.ok) {
      const mesaj = date && typeof date === "object" ? String((date as { message?: unknown; error?: unknown }).message ?? (date as { error?: unknown }).error ?? "") : "";
      return { ok: false, eroare: res.status === 401 || res.status === 403 ? "Waalaxy nu a acceptat cheia: verific-o în Waalaxy → API Keys." : mesaj ? `Waalaxy: ${mesaj}` : `Waalaxy a răspuns cu eroarea ${res.status}.`, status: res.status };
    }
    return { ok: true, date: date as T };
  } catch (e) {
    return { ok: false, eroare: `Waalaxy nu a răspuns (${e instanceof Error ? e.name : "eroare de rețea"}).` };
  }
}

export async function waalaxyValideaza(cheie: string, f: FetchFn): Promise<Rezultat<true>> {
  const r = await waalaxy<unknown>(cheie, "/integrations/test", f);
  return r.ok ? { ok: true, date: true } : r;
}

// Răspunsurile pot fi o listă sau un obiect cu o listă înăuntru; luăm ce are forma { _id | id, name | title }.
export function elementeWaalaxy(date: unknown): ElementWaalaxy[] {
  const lista = Array.isArray(date) ? date : date && typeof date === "object" ? ((Object.values(date as Record<string, unknown>).find(Array.isArray) as unknown[] | undefined) ?? []) : [];
  return lista
    .map((x) => x as { _id?: unknown; id?: unknown; name?: unknown; title?: unknown })
    .map((x) => ({ id: String(x._id ?? x.id ?? ""), nume: String(x.name ?? x.title ?? "Fără nume") }))
    .filter((x) => x.id);
}

export async function waalaxyListe(cheie: string, f: FetchFn): Promise<Rezultat<{ liste: ElementWaalaxy[]; campanii: ElementWaalaxy[] }>> {
  const [l, c] = await Promise.all([waalaxy<unknown>(cheie, "/prospectLists/getProspectLists", f), waalaxy<unknown>(cheie, "/campaigns/getAll", f)]);
  if (!l.ok) return l;
  return { ok: true, date: { liste: elementeWaalaxy(l.date), campanii: c.ok ? elementeWaalaxy(c.date) : [] } };
}

export type ProspectWaalaxy = { linkedinUrl: string; prenume: string; nume: string; firma?: string; rol?: string };

// Împarte un nume complet în prenume și nume de familie (primul cuvânt = prenume).
export function prenumeSiNume(numeComplet: string): { prenume: string; nume: string } {
  const cuvinte = numeComplet.trim().split(/\s+/).filter(Boolean);
  return { prenume: cuvinte[0] ?? "", nume: cuvinte.slice(1).join(" ") };
}

export async function waalaxyTrimite(cheie: string, intrare: { listaId: string; campanieId?: string; prospecti: ProspectWaalaxy[] }, f: FetchFn): Promise<Rezultat<unknown>> {
  const corp: Record<string, unknown> = {
    prospectListId: intrare.listaId,
    origin: { name: "alexandrit" },
    prospects: intrare.prospecti.map((p) => ({
      url: p.linkedinUrl,
      customProfile: { firstName: p.prenume, lastName: p.nume, ...(p.firma ? { company: { name: p.firma } } : {}), ...(p.rol ? { occupation: p.rol } : {}) },
    })),
    canCreateDuplicates: false,
    addExistingProspectInCampaign: Boolean(intrare.campanieId),
  };
  if (intrare.campanieId) corp.campaignId = intrare.campanieId;
  return waalaxy<unknown>(cheie, "/prospects/addProspectFromIntegration", f, { method: "POST", body: corp });
}

// ============================================================================
// Orchestrator: căutarea de decidenți pentru o firmă
// ============================================================================
// Cascada: domeniul firmei → descoperire, de la cel mai ieftin la cel mai scump (Apollo: gratuit; Prospeo, Hunter, Lusha: credite din contul organizației),
// oprită când sunt destui candidați potriviți → alegerea celor mai potriviți după funcție → e-mailul lor (doar pentru cei aleși: Prospeo, Lusha, Apollo, apoi
// Hunter Email Finder) → verificarea e-mailului (Hunter, dacă nu l-a verificat deja furnizorul). Se caută ieftin și se plătește doar pentru ce contează.
// Un furnizor care răspunde cu eroare nu oprește restul; erorile se întorc pentru a fi afișate.

export type Apel = { furnizor: Furnizor; operatie: "cautare" | "email" | "verificare"; ok: boolean; unitati: number };

export type CandidatGasit = CandidatBrut & { scor: number; prioritate: number | null };

export type IntrareCautare = {
  firma: { nume: string; site: string | null; angajati?: number | null };
  domeniuAlternativ?: string | null; // de exemplu domeniul din e-mailul unui contact al firmei
  chei: Partial<Record<Furnizor, string>>;
  // Persoane deja cunoscute (contacte ale firmei sau candidați anteriori): nu se mai propun.
  cunoscute: { chei: ReadonlySet<string>; emailuri: ReadonlySet<string>; linkedin: ReadonlySet<string> };
  // Persoane care nu trebuie propuse niciodată (au cerut ștergerea).
  suprimate: { chei: ReadonlySet<string>; emailuri: ReadonlySet<string>; linkedin: ReadonlySet<string> };
  limite?: { candidati?: number; cautariEmail?: number; verificari?: number; apeluriRamase?: number };
  fetchFn: FetchFn;
};

export type RezultatCautare = { domeniu: string | null; candidati: CandidatGasit[]; apeluri: Apel[]; erori: string[] };

const LIMITA_ATINSA = "Limita zilnică de căutări a organizației a fost atinsă; continuă mâine.";
// Ordinea descoperirii: gratuit întâi.
const ORDINE_DESCOPERIRE: Furnizor[] = ["apollo", "prospeo", "hunter", "lusha"];
// E-mailul se cere întâi de la furnizorii care îl dau după id (Prospeo, Lusha), apoi de la Hunter (după nume și domeniu), la urmă de la Apollo.
const EMAIL_INTAI: Furnizor[] = ["prospeo", "lusha"];

export async function cautaDecidenti(i: IntrareCautare): Promise<RezultatCautare> {
  const apeluri: Apel[] = [];
  const erori: string[] = [];
  const maxCandidati = i.limite?.candidati ?? 5;
  let cautariEmail = i.limite?.cautariEmail ?? 5;
  let verificari = i.limite?.verificari ?? 5;
  let ramase = i.limite?.apeluriRamase ?? Number.POSITIVE_INFINITY;
  const domeniu = domeniuDinSite(i.firma.site) ?? domeniuDinSite(i.domeniuAlternativ ?? null);
  const chei = i.chei;
  const f = i.fetchFn;
  const activi = ORDINE_DESCOPERIRE.filter((p) => chei[p]);

  if (activi.length === 0) return { domeniu, candidati: [], apeluri, erori: ["Nu ai adăugat nicio cheie de furnizor. Adaugă-le în Setări → Prospectare."] };

  // Un apel se numără și se oprește când limita zilnică a organizației e atinsă.
  const poate = (): boolean => {
    if (ramase <= 0) {
      if (!erori.includes(LIMITA_ATINSA)) erori.push(LIMITA_ATINSA);
      return false;
    }
    ramase--;
    return true;
  };
  const noteaza = (furnizor: Furnizor, operatie: Apel["operatie"], r: Rezultat<unknown>, unitati: number) => {
    apeluri.push({ furnizor, operatie, ok: r.ok, unitati: r.ok ? unitati : 0 });
    if (!r.ok && !erori.includes(r.eroare)) erori.push(r.eroare);
  };

  // Unirea a ce au găsit furnizorii (aceeași persoană din mai multe surse devine una), filtrarea și scorul.
  const unite = new Map<string, CandidatBrut>();
  const adauga = (lista: CandidatBrut[]) => {
    for (const b of lista) {
      const cheie = cheieNume(b.nume);
      if (!cheie) continue;
      const existent = unite.get(cheie);
      if (!existent) {
        unite.set(cheie, { ...b, ids: { ...b.ids } });
        continue;
      }
      existent.email ||= b.email;
      existent.emailStatus ||= b.emailStatus;
      existent.linkedin ||= b.linkedin;
      existent.rol ||= b.rol;
      existent.dept ||= b.dept;
      existent.ids = { ...b.ids, ...existent.ids };
      existent.cerereLusha ||= b.cerereLusha;
    }
  };
  const potriviti = (): CandidatGasit[] => {
    const scorate: CandidatGasit[] = [];
    for (const b of unite.values()) {
      const email = b.email.toLowerCase();
      const linkedin = linkedinNormalizat(b.linkedin);
      const cheie = cheieNume(b.nume);
      if (i.suprimate.chei.has(cheie) || (email && i.suprimate.emailuri.has(email)) || (linkedin && i.suprimate.linkedin.has(linkedin))) continue;
      if (i.cunoscute.chei.has(cheie) || (email && i.cunoscute.emailuri.has(email)) || (linkedin && i.cunoscute.linkedin.has(linkedin))) continue;
      const s = scorDecident(b.rol, { seniority: b.seniority, romania: true, angajati: i.firma.angajati });
      if (s.scor <= 0) continue;
      scorate.push({ ...b, scor: s.scor, prioritate: s.prioritate });
    }
    return scorate.sort((a, b) => b.scor - a.scor);
  };

  // 1. Descoperire, de la gratuit la scump, oprită când sunt destui candidați potriviți.
  for (const p of activi) {
    if (potriviti().length >= maxCandidati) break;
    if (p === "hunter" && !domeniu) {
      if (activi.length === 1) erori.push("Hunter caută după domeniu: completează site-ul firmei sau adaugă un contact cu e-mail de firmă (nu Gmail, Yahoo etc.).");
      continue;
    }
    if (!poate()) break;
    if (p === "apollo") {
      const r = await apolloCauta(chei.apollo!, { nume: i.firma.nume, domeniu }, f);
      noteaza("apollo", "cautare", r, 0); // căutarea în Apollo nu consumă credite
      if (r.ok) adauga(r.date);
    } else if (p === "prospeo") {
      const r = await prospeoCauta(chei.prospeo!, { nume: i.firma.nume, domeniu }, f);
      noteaza("prospeo", "cautare", r, r.ok && r.date.length > 0 ? 1 : 0);
      if (r.ok) adauga(r.date);
    } else if (p === "hunter") {
      const r = await hunterDomeniu(chei.hunter!, domeniu!, f);
      noteaza("hunter", "cautare", r, 1);
      if (r.ok) adauga(r.date);
    } else {
      const r = await lushaCauta(chei.lusha!, { nume: i.firma.nume, domeniu }, f);
      noteaza("lusha", "cautare", r, r.ok ? r.date.cereri : 0);
      if (r.ok) adauga(r.date.candidati);
    }
  }
  const alesi = potriviti().slice(0, maxCandidati);

  // 2. E-mailul celor aleși care nu au unul, doar pentru ei.
  const imbogatesteDupaId = async (ordine: readonly Furnizor[]) => {
    for (const p of ordine) {
      const cheie = chei[p];
      if (!cheie) continue;
      const deImbogatit = alesi.filter((c) => !c.email && c.ids?.[p]);
      if (deImbogatit.length === 0) continue;
      if (!poate()) return;
      const ids = deImbogatit.map((c) => c.ids![p] as string);
      if (p === "prospeo") {
        const r = await prospeoImbogateste(cheie, ids, f);
        noteaza("prospeo", "email", r, r.ok ? Object.keys(r.date).length : 0);
        if (r.ok) for (const c of deImbogatit) {
          const g = r.date[c.ids!.prospeo as string];
          if (g) {
            c.email = g.email;
            c.emailStatus = g.verificat ? "valid" : c.emailStatus;
          }
        }
      } else if (p === "apollo") {
        const r = await apolloImbogateste(cheie, ids, f);
        noteaza("apollo", "email", r, r.ok ? Object.keys(r.date).length : 0);
        if (r.ok) for (const c of deImbogatit) if (r.date[c.ids!.apollo as string]) c.email = r.date[c.ids!.apollo as string];
      } else {
        // Lusha: ids aparțin unei cereri de căutare; un lot per cerere
        const peCerere = new Map<string, typeof deImbogatit>();
        for (const c of deImbogatit) if (c.cerereLusha) peCerere.set(c.cerereLusha, [...(peCerere.get(c.cerereLusha) ?? []), c]);
        for (const [cerere, grup] of peCerere) {
          const r = await lushaImbogateste(cheie, cerere, grup.map((c) => c.ids!.lusha as string), f);
          noteaza("lusha", "email", r, r.ok ? r.date.filter((x) => x.email).length : 0);
          if (r.ok) for (const c of grup) {
            const g = r.date.find((x) => cheieNume(x.nume) === cheieNume(c.nume));
            if (g?.email) c.email = g.email;
            if (g?.linkedin && !c.linkedin) c.linkedin = g.linkedin;
          }
        }
      }
    }
  };
  await imbogatesteDupaId(EMAIL_INTAI);
  if (chei.hunter && domeniu) {
    for (const c of alesi) {
      if (c.email || cautariEmail <= 0 || !poate()) continue;
      cautariEmail--;
      const r = await hunterEmail(chei.hunter, domeniu, c.nume, f);
      noteaza("hunter", "email", r, 1);
      if (r.ok && r.date.email) {
        c.email = r.date.email;
        c.emailStatus = r.date.status;
      }
    }
  }
  await imbogatesteDupaId(["apollo"]);

  // 3. Verificarea e-mailurilor care nu au un status (doar cu Hunter; un e-mail verificat deja de furnizor nu se mai plătește).
  if (chei.hunter) {
    for (const c of alesi) {
      if (!c.email || c.emailStatus || verificari <= 0 || !poate()) continue;
      verificari--;
      const r = await hunterVerifica(chei.hunter, c.email, f);
      noteaza("hunter", "verificare", r, 1);
      if (r.ok) c.emailStatus = r.date;
    }
  }

  return { domeniu, candidati: alesi, apeluri, erori };
}
