"use server";

import { obtineIpClient, verificaLimitaRata } from "@/lib/auth/rate-limit";
import { valideazaAbonare, type EroriAbonare } from "@/lib/abonare-newsletter";
import { esteEmailTemporar } from "@/lib/email-temporar";
import { aboneazaNewsman } from "@/lib/newsman-abonare";
import { cheieIpPentruLimita } from "@/lib/popup-inscriere";

// Abonarea la newsletter din subsolul site-ului public: o adresă de email și un acord explicit, separat (casetă nebifată dinainte). Abonarea e cu confirmare prin email (double opt-in,
// prin Newsman): adresa devine activă abia după ce persoana apasă linkul din mesaj, deci nimeni nu poate abona pe altcineva. Răspunsul la succes e același indiferent dacă adresa era
// deja în listă sau a cerut recent o confirmare, ca să nu se poată afla cine e abonat.
export type RezultatAbonareSite = { ok: true } | { ok: false; cod: "campuri" | "temporar" | "prea" | "esec" | "indisponibil"; campuri?: EroriAbonare };

export async function aboneazaNewsletterAction(intrare: { email: string; acord: boolean; capcana?: string }): Promise<RezultatAbonareSite> {
  const v = valideazaAbonare(intrare ?? {});
  if (!v.ok) return { ok: false, cod: "campuri", campuri: v.erori };

  // Capcană pentru roboți: un câmp ascuns oamenilor. Dacă are conținut, răspundem ca la succes și nu trimitem nimic.
  if (typeof intrare.capcana === "string" && intrare.capcana.trim() !== "") return { ok: true };

  if (esteEmailTemporar(v.email)) return { ok: false, cod: "temporar" };

  const ipReal = await obtineIpClient();
  const ip = cheieIpPentruLimita(ipReal);
  // Limite pe adresă IP, pe email și un plafon global: nimeni nu poate trimite sute de emailuri de confirmare către adrese străine.
  const [okIp, okEmail, okGlobal] = await Promise.all([
    verificaLimitaRata("newsletter-ip", ip, 5, 60),
    verificaLimitaRata("newsletter-email", v.email, 3, 24 * 60),
    verificaLimitaRata("newsletter-global", "toate", 200, 60),
  ]);
  if (!okIp || !okEmail || !okGlobal) return { ok: false, cod: "prea" };

  const rez = await aboneazaNewsman(v.email, ipReal);
  if (rez === "indisponibil") return { ok: false, cod: "indisponibil" };
  if (rez === "confirmare_trimisa" || rez === "deja_abonat" || rez === "prea_des") return { ok: true };
  if (rez === "email_invalid") return { ok: false, cod: "campuri", campuri: { email: "invalid" } };
  return { ok: false, cod: "esec" };
}
