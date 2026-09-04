// Pur, fără "server-only" — folosit atât din server (webhook Twilio) cât și
// din client (CallButton, ca să valideze/formateze înainte de a suna).

// Normalizează un număr de telefon românesc scris liber (0722 123 456,
// +40722123456, 0040722123456...) la format E.164, cerut de Twilio. Best
// effort — dacă numărul deja arată internațional (+ altă țară), îl lasă
// neschimbat.
export function normalizeazaTelefonE164(telefon: string): string | null {
  const curatat = telefon.trim().replace(/[\s().-]/g, "");
  if (!curatat) return null;
  if (curatat.startsWith("+")) return curatat;
  if (curatat.startsWith("0040")) return `+${curatat.slice(2)}`;
  if (curatat.startsWith("40") && curatat.length === 11) return `+${curatat}`;
  if (curatat.startsWith("0") && curatat.length === 10) return `+4${curatat}`;
  return curatat.startsWith("00") ? `+${curatat.slice(2)}` : null;
}
