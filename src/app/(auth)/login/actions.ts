"use server";

import { eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";

import { findBeneficiaryProfile } from "@/lib/auth/beneficiar";
import { ensureAppUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { memberships, organizations } from "@/lib/db/schema";
import { AUTH_DICT } from "@/lib/i18n/dictionaries/auth";
import { getLocale } from "@/lib/i18n/get-locale";
import { createClient } from "@/lib/supabase/server";

export async function loginAction(
  _prevState: { error: string | null },
  formData: FormData,
): Promise<{ error: string | null }> {
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

  const supabase = await createClient({ persist: ramaiConectat });
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
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
    redirect("/signup");
  }
  redirect(`/${orgSlug}/crm`);
}
