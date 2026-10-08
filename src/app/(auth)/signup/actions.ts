"use server";

import { sql } from "drizzle-orm";
import { redirect } from "next/navigation";

import { semnalizeazaEveniment } from "@/lib/analytics-server";
import { ensureAppUser, inregistreazaAcceptareTermeni } from "@/lib/auth/dal";
import { cifFolosit, creeazaOrganizatieNoua, MAX_LUNGIME_NUME_ORGANIZATIE } from "@/lib/auth/provizionare";
import { obtineIpClient, verificaLimitaRata } from "@/lib/auth/rate-limit";
import { citestePlanulAlesDinFormular } from "@/lib/billing/plan-from-form";
import { PLAN_QUERY_KEYS } from "@/lib/billing/plan-query";
import { db } from "@/lib/db";
import { esteEmailTemporar } from "@/lib/email-temporar";
import { cifValidFormat } from "@/lib/iban";
import { normalizeazaTelefon } from "@/lib/telefon";
import { AUTH_DICT } from "@/lib/i18n/dictionaries/auth";
import { getLocale } from "@/lib/i18n/get-locale";
import { createClient } from "@/lib/supabase/server";

export async function signupAction(
  _prevState: { error: string | null },
  formData: FormData,
): Promise<{ error: string | null }> {
  const errors = AUTH_DICT[await getLocale()].errors;
  const inviteToken = String(formData.get("inviteToken") ?? "").trim();
  const beneficiarInviteToken = String(formData.get("beneficiarInviteToken") ?? "").trim();
  const orgName = String(formData.get("orgName") ?? "").trim();
  const numeContact = String(formData.get("numeContact") ?? "").trim();
  const telefonBrut = String(formData.get("telefon") ?? "").trim();
  const cifBrut = String(formData.get("cif") ?? "").trim();
  const referralCode = String(formData.get("ref") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password || (!inviteToken && !beneficiarInviteToken && !orgName)) {
    return { error: errors.signupCampuri };
  }
  if (password.length < 8) {
    return { error: errors.parolaMinim };
  }
  if (orgName.length > MAX_LUNGIME_NUME_ORGANIZATIE) {
    return { error: errors.numeOrganizatiePreaLung };
  }
  // Adrese de unică folosință: trial-uri repetate ale aceleiași persoane.
  if (esteEmailTemporar(email)) {
    return { error: errors.emailTemporar };
  }
  // Acceptarea Termenilor + Politicii de confidențialitate e obligatorie și
  // validată pe server (bifa din formular poate fi ocolită) — vezi
  // inregistreazaAcceptareTermeni, care păstrează dovada.
  if (formData.get("acceptTermeni") !== "on") {
    return { error: errors.termeniNeacceptati };
  }

  // Conturi noi per IP: 5/oră (rafală) și 15/zi — creare de cont e rară pentru un
  // utilizator real, dar o țintă pentru crearea automată în masă a conturilor.
  const ip = await obtineIpClient();
  if (!(await verificaLimitaRata("signup", ip, 5, 60)) || !(await verificaLimitaRata("signup-zi", ip, 15, 24 * 60))) {
    return { error: errors.preaMulteIncercari };
  }

  // Organizație nouă: nume, telefon și CIF obligatorii (cei invitați într-o organizație existentă nu le completează).
  const esteOrgNoua = !inviteToken && !beneficiarInviteToken;
  let telefon: string | null = null;
  if (esteOrgNoua) {
    if (!numeContact || numeContact.length > 120) return { error: errors.numeLipsa };
    telefon = normalizeazaTelefon(telefonBrut);
    if (!telefon) return { error: errors.telefonInvalid };
    if (!cifBrut || !cifValidFormat(cifBrut)) return { error: errors.cifInvalid };
    if (await cifFolosit(cifBrut)) return { error: errors.cifExistent };
  }

  // Ce a ales userul la înscriere (numele organizației, planul, codul de
  // recomandare) se păstrează în metadatele contului: dacă emailul trebuie
  // confirmat, organizația se creează abia după confirmare (pasul de finalizare
  // din pagina principală îl preia de aici ca valori inițiale).
  const planQuery: Record<string, string> = {};
  for (const key of PLAN_QUERY_KEYS) {
    const v = formData.get(key);
    if (typeof v === "string" && v) planQuery[key] = v.slice(0, 200);
  }
  const metadate = inviteToken || beneficiarInviteToken ? undefined : { org_name: orgName, full_name: numeContact, telefon, cif: cifBrut.toUpperCase().replace(/\s+/g, ""), ref: referralCode.slice(0, 100), plan_query: planQuery };

  const supabase = await createClient();
  // Mesajul Supabase (error.message) vine mereu în engleză, indiferent de
  // limba UI — nu există un cod de eroare stabil pe care să-l mapăm 1:1 fără
  // riscul de a ascunde detalii utile (email deja folosit, parolă slabă etc.);
  // rămâne netradus intenționat, ca excepție de la restul acestui flux.
  const { data, error } = await supabase.auth.signUp({ email, password, options: metadate ? { data: metadate } : undefined });
  if (error) {
    // Mesajele Supabase vin în engleză și sunt tehnice — le traducem pe cele pe care un utilizator obișnuit le poate întâlni.
    const m = error.message.toLowerCase();
    if (m.includes("already registered") || m.includes("already been registered")) return { error: errors.emailDejaInregistrat };
    if (m.includes("rate limit") || m.includes("security purposes") || m.includes("too many")) return { error: errors.preaMulteIncercari };
    if (m.includes("password") && (m.includes("weak") || m.includes("easy to guess") || m.includes("should contain"))) return { error: errors.parolaSlaba };
    if (m.includes("password") && (m.includes("least") || m.includes("short"))) return { error: errors.parolaMinim };
    if (m.includes("email") && (m.includes("invalid") || m.includes("valid"))) return { error: errors.emailInvalid };
    return { error: errors.signupEsuat };
  }
  if (!data.user) {
    return { error: errors.signupEsuat };
  }
  // Contul de autentificare există acum — orice ramură de mai jos se încheie cu
  // redirect(), deci clientul află de succes prin acest semnal scurt (vezi
  // components/analytics-events.tsx; se trimite doar cu acordul pentru analiză).
  await semnalizeazaEveniment("sign_up");

  // Cont creat printr-un link de invitație sau cu confirmare de email încă
  // necesară: NU se creează o organizație acum — doar rândul app_users (cu dovada
  // acceptării). Membership-ul/profilul de beneficiar se creează la pagina de
  // acceptare a invitației; organizația se creează după confirmarea emailului, la
  // prima autentificare (pasul de finalizare). Altfel cineva s-ar putea înscrie cu
  // emailul altcuiva și i-ar umple contul cu organizații înainte de confirmare.
  if (inviteToken || beneficiarInviteToken || !data.session) {
    await db.transaction(async (tx) => {
      await tx.execute(sql`select set_config('app.current_user_email', ${email}, true)`);
      const appUser = await ensureAppUser(tx, email);
      await tx.execute(sql`select set_config('app.current_user_id', ${appUser.id}, true)`);
      await inregistreazaAcceptareTermeni(tx, appUser.id);
    });
    if (!data.session) {
      // Confirmarea de email e activă în proiectul Supabase — userul nu are încă sesiune.
      redirect(
        inviteToken || beneficiarInviteToken
          ? `/login?confirmare=necesara&${inviteToken ? `invite=${inviteToken}` : `beneficiarInvite=${beneficiarInviteToken}`}`
          : "/login?confirmare=necesara",
      );
    }
    redirect(inviteToken ? `/invite/${inviteToken}` : `/invite-beneficiar/${beneficiarInviteToken}`);
  }

  // Sesiune activă (emailul e deja confirmat sau confirmarea e dezactivată):
  // provizionare imediată — utilizator + organizație + membership de owner.
  const rezultat = await creeazaOrganizatieNoua({
    email,
    numeUtilizator: numeContact,
    telefon,
    cif: cifBrut,
    orgName,
    referralCode,
    planAles: citestePlanulAlesDinFormular(formData),
  });
  if (!rezultat.ok) {
    return { error: rezultat.motiv === "cif_existent" ? errors.cifExistent : errors.limitaOrganizatii };
  }

  // redirect() trebuie apelat DUPĂ ce tranzacția s-a încheiat — aruncă o
  // excepție specială Next.js care nu trebuie prinsă de db.transaction().
  redirect(`/${rezultat.slug}`);
}
