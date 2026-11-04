// Curățarea datelor personale dintr-un text liber scris de colegi, ÎNAINTE să plece la un model AI extern (Anthropic). Fișier pur, fără importuri (testat în tests/curata-pii.test.mjs).
// Elimină adresele de email, IBAN-urile și numerele de telefon / CNP (șiruri de 9+ cifre). Nu poate recunoaște un nume sau o boală scrisă liber:
// de aceea câmpurile care ajung aici au și o notă în interfață („Nu scrie date medicale sau personale”). Curățarea e a doua plasă, nu o garanție.

const CONTROL = /[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u2028-\u202E\u2060-\u2069\uFEFF]/g;
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const IBAN = /\b[A-Z]{2}\d{2}[A-Z0-9]{10,30}\b/g;
// Telefon / CNP: 9+ cifre cu separatori obișnuiți între ele. O dată calendaristică (15.12.2026) e recunoscută întâi și rămâne, ca „15.12.2026 ora 19” să nu fie luat drept număr.
const NUMAR_SAU_DATA = /(\b\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\b)|((?:[+(]?\d[\s.\-()]*){9,})/g;

export function curataPii(brut: unknown, max = 400): string {
  if (typeof brut !== "string") return "";
  // Se taie înainte de curățare (expresiile sunt rapide pe text obișnuit, dar nu are rost să primească zeci de mii de caractere), cu o rezervă pentru ce se scurtează.
  let s = brut.slice(0, max * 3).replace(CONTROL, " ");
  s = s.replace(EMAIL, "[email eliminat]");
  s = s.replace(IBAN, "[cont eliminat]");
  // separatorii de la capătul numărului (spațiu, punct) rămân: nu lipim cuvintele
  s = s.replace(NUMAR_SAU_DATA, (m, data: string | undefined) => (data ? m : "[număr eliminat]" + /[\s.\-()]*$/.exec(m)![0]));
  s = s.replace(/\s+/g, " ").trim();
  return s.length > max ? s.slice(0, max).trim() : s;
}
