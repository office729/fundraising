// Abonarea la newsletter de pe site: validarea comună clientului (mesaje imediate) și serverului (singura care contează). Fișier fără importuri, ca să se poată testa direct.

// Fără caractere care n-au ce căuta într-o adresă (< > , " ' ? & ; : parantezele, backslash), la fel ca la formularul „Descoperă Alexandrit” (lib/popup-inscriere.ts).
const RE_EMAIL = /^[^\s@<>,"'`?&;:()[\]\\]+@[^\s@<>,"'`?&;:()[\]\\]+\.[^\s@<>,"'`?&;:()[\]\\]{2,}$/;

export type CampAbonare = "email" | "acord";
export type EroriAbonare = Partial<Record<CampAbonare, "lipsa" | "invalid" | "acord">>;

export function valideazaAbonare(intrare: { email?: unknown; acord?: unknown }): { ok: true; email: string } | { ok: false; erori: EroriAbonare } {
  const email = typeof intrare.email === "string" ? intrare.email.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim().toLowerCase() : "";
  const erori: EroriAbonare = {};
  if (!email) erori.email = "lipsa";
  else if (email.length > 254 || !RE_EMAIL.test(email)) erori.email = "invalid";
  // Acordul e explicit și separat: o casetă nebifată dinainte, bifată de vizitator.
  if (intrare.acord !== true) erori.acord = "acord";
  return Object.keys(erori).length > 0 ? { ok: false, erori } : { ok: true, email };
}
