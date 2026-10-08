"use server";

import { eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";

import { findBeneficiaryProfile } from "@/lib/auth/beneficiar";
import { ensureAppUser } from "@/lib/auth/dal";
import { finalizeazaAutomatDinInscriere } from "@/lib/auth/finalizare-automata";
import { obtineIpClient, verificaLimitaRata } from "@/lib/auth/rate-limit";
import { db } from "@/lib/db";
import { appUsers, memberships, organizations } from "@/lib/db/schema";
import { AUTH_DICT } from "@/lib/i18n/dictionaries/auth";
import { getLocale } from "@/lib/i18n/get-locale";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { error: string | null; reTrimite?: boolean };

// Retrimite emailul de confirmare (cont creat, dar adresa neconfirmată). Răspunsul e mereu același,
// indiferent dacă adresa există — nu confirmăm existența conturilor. Limitat per email și per IP.
export async function retrimiteConfirmareAction(email: string): Promise<{ ok: boolean; error: string | null }> {
  const errors = AUTH_DICT[await getLocale()].errors;
  const adresa = email.trim().toLowerCase();
  if (!adresa || !adresa.includes("@")) return { ok: false, error: errors.loginCampuri };
  const ip = await obtineIpClient();
  if (!(await verificaLimitaRata("retrimite-confirmare-ip", ip, 5, 60)) || !(await verificaLimitaRata("retrimite-confirmare", adresa, 3, 60))) {
    return { ok: false, error: errors.preaMulteIncercari };
  }
  const supabase = await createClient();
  await supabase.auth.resend({ type: "signup", email: adresa });
  return { ok: true, error: null };
}

export async function loginAction(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const errors = AUTH_DICT[await getLocale()].errors;
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const inviteToken = String(formData.get("inviteToken") ?? "").trim();
  const beneficiarInviteToken = String(formData.get("beneficiarInviteToken") ?? "").trim();
  const ramaiConectat = formData.get("ramaiConectat") != null;

  if (!email || !password) {
    return { error: errors.loginCampuri };
  }

  // 10 încercări/15 min per IP — suficient pentru un utilizator care-și
  // greșește parola de câteva ori, dar blochează brute-force-ul pe un cont țintă.
  const ip = await obtineIpClient();
  if (!(await verificaLimitaRata("login", ip, 10, 15))) {
    return { error: errors.preaMulteIncercari };
  }
  // Și per cont: un atac distribuit (IP-uri multe) asupra unui singur cont țintă nu mai trece de
  // limita pe IP. Compromis asumat: cineva poate bloca temporar (15 min) un cont străin.
  if (!(await verificaLimitaRata("login-cont", email, 10, 15))) {
    return { error: errors.preaMulteIncercari };
  }

  const supabase = await createClient({ persist: ramaiConectat });
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    // Cont creat, dar emailul încă neconfirmat: mesaj clar + buton de retrimitere (nu „date invalide").
    if (error.code === "email_not_confirmed") {
      return { error: errors.emailNeconfirmat, reTrimite: true };
    }
    return { error: errors.loginInvalid };
  }

  if (inviteToken) {
    redirect(`/invite/${inviteToken}`);
  }
  if (beneficiarInviteToken) {
    redirect(`/invite-beneficiar/${beneficiarInviteToken}`);
  }

  // Verifică întâi profilul de beneficiar, apoi membership-ul de organizație
  // — un cont are DOAR unul dintre cele două (vezi decizia de design din
  // planul modulului „Persoană fizică / Beneficiar").
  const { isBeneficiar, orgSlug } = await db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.current_user_email', ${email}, true)`);
    const appUser = await ensureAppUser(tx, email);
    await tx.execute(sql`select set_config('app.current_user_id', ${appUser.id}, true)`);
    await tx.update(appUsers).set({ lastLoginAt: new Date() }).where(eq(appUsers.id, appUser.id));

    const beneficiar = await findBeneficiaryProfile(tx, appUser.id);
    if (beneficiar) return { isBeneficiar: true, orgSlug: null };

    const rows = await tx
      .select({ slug: organizations.slug })
      .from(memberships)
      .innerJoin(organizations, eq(organizations.id, memberships.orgId))
      .where(eq(memberships.userId, appUser.id))
      .limit(1);
    return { isBeneficiar: false, orgSlug: rows[0]?.slug ?? null };
  });

  if (isBeneficiar) {
    redirect("/beneficiar");
  }
  if (!orgSlug) {
    // Cont confirmat, dar organizația nu a apucat să se creeze (ex. a confirmat emailul din alt browser): o creăm din datele
    // de la înscriere; dacă nu se poate, „/" arată formularul „Încă un pas", precompletat.
    const { data } = await supabase.auth.getUser();
    const slug = data.user ? await finalizeazaAutomatDinInscriere(data.user).catch(() => null) : null;
    redirect(slug ? `/${slug}/crm` : "/");
  }
  redirect(`/${orgSlug}/crm`);
}
