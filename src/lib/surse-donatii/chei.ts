// Cheile din stocarea browserului pentru „Sursele donațiilor” (vezi client.ts). Fișier separat, fără cod de browser, ca bannerul de cookie-uri să le poată șterge
// fără să tragă tot urmăritorul.
export const CHEIE_SURSE_PERSISTENT = "fa_src_v1"; // localStorage: doar cu acord pentru statistici sau marketing, maximum 90 de zile
export const CHEIE_SURSE_SESIUNE = "fa_src_s_v1"; // sessionStorage: doar pe durata sesiunii curente, fără acord
