"use server";

import { sql } from "drizzle-orm";

import { verificaLimitaRata, obtineIpClient } from "@/lib/auth/rate-limit";
import { db } from "@/lib/db";
import { emailConfigurat, trimiteEmail } from "@/lib/email";
import { emailFaraLink, layoutEmail, paragraf } from "@/lib/email-layout";
import { esteEmailTemporar } from "@/lib/email-temporar";
import { escHtml } from "@/lib/html-escape";
import { cheieIpPentruLimita, valideazaInteres, type EroriInteres } from "@/lib/popup-inscriere";

// Formularul „Descoperă Alexandrit” din pop-up și de pe /descopera: un ONG își lasă datele și echipa îl contactează. Datele se salvează în lista de lead-uri
// (tabelul interese_ong, vizibil doar echipei platformei: Panou platformă → Lead-uri) și ajung și pe e-mail la echipă, cu răspuns direct către persoană.
// Cererea reușește dacă s-a făcut măcar una dintre cele două; dacă niciuna, persoana primește un mesaj clar cu adresa de contact, nu o confirmare falsă.
const DESTINATAR_IMPLICIT = "vlad.placinta@alexandrit.ro";
const ADRESA_CONTACT = DESTINATAR_IMPLICIT; // adresă existentă pe pagina de contact

// O adresă apare o singură dată în listă: o nouă completare crește numărul de trimiteri și redeschide un lead marcat „pierdut”. Numele, organizația și sursa (pagina,
// campania) rămân cele de la prima completare: adresa nu e verificată, deci cine o știe nu trebuie să poată rescrie datele unui lead real (telefonul se completează doar dacă lipsea). Scrierea trece prin politica interese_ong_site (GUC app.interes_site), setat doar aici, după validare și limitarea cererilor.
async function salveazaLead(d: { nume: string; organizatie: string; email: string; telefon: string }, cale: string, campanie: string): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.interes_site', 'true', true)`);
    await tx.execute(sql`
      insert into interese_ong (nume, organizatie, email, telefon, cale, campanie)
      values (${d.nume}, ${d.organizatie}, ${d.email}, ${d.telefon || null}, ${cale}, ${campanie || null})
      on conflict (lower(email)) do update set
        telefon = coalesce(interese_ong.telefon, excluded.telefon),
        nr_trimiteri = interese_ong.nr_trimiteri + 1,
        ultima_trimitere_la = now(),
        stare = case when interese_ong.stare = 'pierdut' then 'nou' else interese_ong.stare end`);
  });
}

export type RezultatInteres = { ok: true } | { ok: false; eroare: string; campuri?: EroriInteres };

export async function trimiteInteresAction(intrare: { nume: string; organizatie: string; email: string; telefon: string; acord: boolean; capcana?: string; cale?: string; campanie?: string; previzualizare?: boolean }): Promise<RezultatInteres> {
  const v = valideazaInteres(intrare ?? {});
  if (!v.ok) return { ok: false, eroare: "Verifică câmpurile marcate.", campuri: v.erori };

  // Capcană pentru roboți: un câmp ascuns oamenilor. Dacă are conținut, răspundem ca la succes și nu trimitem nimic.
  if (typeof intrare.capcana === "string" && intrare.capcana.trim() !== "") return { ok: true };

  if (esteEmailTemporar(v.date.email)) return { ok: false, eroare: "Folosește o adresă de e-mail a organizației, nu una temporară.", campuri: { email: "Folosește o adresă de e-mail a organizației." } };

  const ip = cheieIpPentruLimita(await obtineIpClient());
  // Pe lângă limitele pe adresă IP (rețea /64 la IPv6) și pe e-mail, un plafon global: un atacator cu multe adrese nu poate umple lista și căsuța echipei.
  const [okIp, okEmail, okGlobal] = await Promise.all([
    verificaLimitaRata("interes-site-ip", ip, 5, 60),
    verificaLimitaRata("interes-site-email", v.date.email, 2, 24 * 60),
    verificaLimitaRata("interes-site-global", "toate", 300, 60),
  ]);
  if (!okIp || !okEmail || !okGlobal) return { ok: false, eroare: `Am primit deja cereri de la tine. Dacă e urgent, scrie-ne la ${ADRESA_CONTACT}.` };

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
      paragraf("A bifat că a citit Politica de confidențialitate. Datele sunt salvate și în lista de lead-uri din Panou platformă. Răspunde direct la acest mesaj ca să-i scrii."),
    ].join(""),
  });
  // Întâi salvăm (lead-ul nu se pierde nici dacă e-mailul eșuează), apoi trimitem e-mailul. Testele din previzualizare nu se salvează.
  let salvat = false;
  if (!test) {
    try {
      await salveazaLead(v.date, cale, campanie);
      salvat = true;
    } catch (e) {
      console.error("interes-site: salvare eșuată", e instanceof Error ? e.name : "eroare");
    }
  }
  let trimis = false;
  if (emailConfigurat()) {
    try {
      await trimiteEmail({
        to: process.env.INTERES_EMAIL_TO?.trim() || DESTINATAR_IMPLICIT,
        subiect: `${test ? "[TEST] " : ""}Interes Alexandrit: ${v.date.organizatie}`,
        html,
        replyTo: v.date.email,
      });
      trimis = true;
    } catch (e) {
      console.error("interes-site: trimitere eșuată", e instanceof Error ? e.name : "eroare");
    }
  }
  if (salvat || trimis) return { ok: true };
  return { ok: false, eroare: `Nu am putut trimite acum. Scrie-ne la ${ADRESA_CONTACT} și te contactăm.` };
}
