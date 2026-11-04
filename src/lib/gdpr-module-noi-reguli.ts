// Reguli pure pentru cererile GDPR care acoperă modulele noi (Agent email, Prospectare, Influenceri, lista de suprimare)
// și pentru retenția emailurilor trimise. Fără importuri de valori, ca să poată fi testate direct (tests/gdpr-module-noi.test.mjs).

// Retenție: emailurile TRIMISE de Agentul email și răspunsurile primite păstrează datele destinatarului 24 de luni de la trimitere,
// apoi se anonimizează (rândul rămâne, pentru statistici). Analizele ONG și căutările profunde AI nu sunt afectate de această regulă.
export const LUNI_RETENTIE_EMAILURI = 24;

// Valori puse în locul datelor personale. „[șters]” = la cererea persoanei, „[expirat]” = la expirarea retenției.
export const VALOARE_STEARSA = "[șters]";
export const VALOARE_EXPIRATA = "[expirat]";

export const esteValoareAnonimizata = (v: string | null | undefined): boolean => v === VALOARE_STEARSA || v === VALOARE_EXPIRATA;

const zileInLuna = (an: number, luna: number): number => new Date(Date.UTC(an, luna + 1, 0)).getUTCDate();

// Limita de retenție: tot ce a fost trimis ÎNAINTE de această dată a depășit termenul. Luni calendaristice (în UTC);
// 31 mai − 24 de luni = 31 mai, iar 29 februarie − 24 de luni cade pe 28 februarie dacă luna nu are acea zi.
export function limitaRetentieEmailuri(acum: Date, luni: number = LUNI_RETENTIE_EMAILURI): Date {
  const total = acum.getUTCFullYear() * 12 + acum.getUTCMonth() - Math.max(0, Math.trunc(luni));
  const an = Math.floor(total / 12);
  const luna = total - an * 12;
  const zi = Math.min(acum.getUTCDate(), zileInLuna(an, luna));
  return new Date(Date.UTC(an, luna, zi, acum.getUTCHours(), acum.getUTCMinutes(), acum.getUTCSeconds(), acum.getUTCMilliseconds()));
}

// Handle / link de profil introdus în panou: tăiat, fără caractere de control, cel mult 300 de caractere; gol → null.
export function curataHandle(brut: unknown): string | null {
  if (typeof brut !== "string") return null;
  const t = brut.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  return t ? t.slice(0, 300) : null;
}

// Doar un link LinkedIn de profil (linkedin.com/in/<nume>) identifică fără echivoc un candidat din Prospectare; un handle simplu nu.
export function slugLinkedinDinHandle(handle: string | null | undefined): string | null {
  const m = /^(?:https?:\/\/)?(?:[a-z0-9-]+\.)*linkedin\.com\/in\/([^/?#\s]+)/i.exec((handle ?? "").trim());
  if (!m) return null;
  let slug = m[1];
  try {
    slug = decodeURIComponent(slug);
  } catch {
    // rămâne forma din link
  }
  slug = slug.toLowerCase();
  return slug ? slug : null;
}

export type SurseNoi = { emailuriAgent: number; candidatiProspectare: number; influenceri: number };

// Cât se poate șterge/anonimiza din modulele noi (butonul „Șterge” se activează dacă totalul > 0). Răspunsurile primite și lista de suprimare nu contează aici:
// răspunsurile pleacă odată cu emailurile lor, iar lista de suprimare se completează la ștergere, nu se „șterge”.
export const totalSurseNoi = (s: SurseNoi): number => s.emailuriAgent + s.candidatiProspectare + s.influenceri;
