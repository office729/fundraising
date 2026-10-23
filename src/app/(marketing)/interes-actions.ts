"use server";

import { verificaLimitaRata, obtineIpClient } from "@/lib/auth/rate-limit";
import { emailConfigurat, trimiteEmail } from "@/lib/email";
import { emailFaraLink, layoutEmail, paragraf } from "@/lib/email-layout";
import { esteEmailTemporar } from "@/lib/email-temporar";
import { escHtml } from "@/lib/html-escape";
import { valideazaInteres, type EroriInteres } from "@/lib/popup-inscriere";

// Formularul „Descoperă Alexandrit” din pop-up: un ONG își lasă datele și echipa îl contactează. Datele nu se păstrează în baza de date: ajung pe e-mail
// la echipă (cu răspuns direct către persoană). Dacă trimiterea eșuează, persoana primește un mesaj clar cu adresa de contact, nu o confirmare falsă.
const DESTINATAR_IMPLICIT = "vlad.placinta@alexandrit.ro";
const ADRESA_CONTACT = DESTINATAR_IMPLICIT; // adresă existentă pe pagina de contact

export type RezultatInteres = { ok: true } | { ok: false; eroare: string; campuri?: EroriInteres };

export async function trimiteInteresAction(intrare: { nume: string; organizatie: string; email: string; telefon: string; acord: boolean; capcana?: string; cale?: string; campanie?: string; previzualizare?: boolean }): Promise<RezultatInteres> {
  const v = valideazaInteres(intrare ?? {});
  if (!v.ok) return { ok: false, eroare: "Verifică câmpurile marcate.", campuri: v.erori };

  // Capcană pentru roboți: un câmp ascuns oamenilor. Dacă are conținut, răspundem ca la succes și nu trimitem nimic.
  if (typeof intrare.capcana === "string" && intrare.capcana.trim() !== "") return { ok: true };

  if (esteEmailTemporar(v.date.email)) return { ok: false, eroare: "Folosește o adresă de e-mail a organizației, nu una temporară.", campuri: { email: "Folosește o adresă de e-mail a organizației." } };

  const ip = await obtineIpClient();
  const [okIp, okEmail] = await Promise.all([verificaLimitaRata("interes-site-ip", ip, 5, 60), verificaLimitaRata("interes-site-email", v.date.email, 2, 24 * 60)]);
  if (!okIp || !okEmail) return { ok: false, eroare: `Am primit deja cereri de la tine. Dacă e urgent, scrie-ne la ${ADRESA_CONTACT}.` };

  if (!emailConfigurat()) return { ok: false, eroare: `Nu am putut trimite acum. Scrie-ne la ${ADRESA_CONTACT} și te contactăm.` };

  const test = intrare.previzualizare === true;
  const cale = typeof intrare.cale === "string" && intrare.cale.startsWith("/") ? intrare.cale.slice(0, 120) : "/";
  // De unde a venit (utm_source / utm_medium / utm_campaign din adresa paginii): doar caractere simple, scurt.
  const campanie = typeof intrare.campanie === "string" ? intrare.campanie.replace(/[^\p{L}\p{N} _.,:=@/+-]/gu, "").slice(0, 120) : "";
  const rand = (eticheta: string, valoare: string) => paragraf(`<strong>${escHtml(eticheta)}:</strong> ${valoare}`);
  const html = layoutEmail({
    previzualizare: `${v.date.nume}, ${v.date.organizatie}`,
    titlu: test ? "[TEST] Un ONG vrea să afle despre Alexandrit" : "Un ONG vrea să afle despre Alexandrit",
    corpHtml: [
      rand("Nume", escHtml(v.date.nume)),
      rand("Organizație", escHtml(v.date.organizatie)),
      rand("E-mail", emailFaraLink(v.date.email)),
      rand("Telefon", v.date.telefon ? escHtml(v.date.telefon) : "nu a lăsat"),
      rand("Pagina de pe care a scris", escHtml(cale)),
      ...(campanie ? [rand("Campanie", escHtml(campanie))] : []),
      paragraf("A bifat că a citit Politica de confidențialitate. Datele au fost trimise doar prin acest e-mail; nu sunt păstrate în altă parte. Răspunde direct la acest mesaj ca să-i scrii."),
    ].join(""),
  });
  try {
    await trimiteEmail({
      to: process.env.INTERES_EMAIL_TO?.trim() || DESTINATAR_IMPLICIT,
      subiect: `${test ? "[TEST] " : ""}Interes Alexandrit: ${v.date.organizatie}`,
      html,
      replyTo: v.date.email,
    });
    return { ok: true };
  } catch (e) {
    console.error("interes-site: trimitere eșuată", e instanceof Error ? e.name : "eroare");
    return { ok: false, eroare: `Nu am putut trimite acum. Scrie-ne la ${ADRESA_CONTACT} și te contactăm.` };
  }
}
