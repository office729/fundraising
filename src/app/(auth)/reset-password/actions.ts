"use server";

import { redirect } from "next/navigation";

import { AUTH_DICT } from "@/lib/i18n/dictionaries/auth";
import { getLocale } from "@/lib/i18n/get-locale";
import { createClient } from "@/lib/supabase/server";

export async function resetPasswordAction(
  _prevState: { error: string | null },
  formData: FormData,
): Promise<{ error: string | null }> {
  const errors = AUTH_DICT[await getLocale()].errors;
  const password = String(formData.get("password") ?? "");
  const confirmare = String(formData.get("confirmare") ?? "");

  if (password.length < 8) {
    return { error: errors.parolaMinim };
  }
  if (password !== confirmare) {
    return { error: errors.resetParoleDiferite };
  }

  const supabase = await createClient();
  // Necesită sesiunea temporară de recuperare stabilită de /auth/callback —
  // dacă lipsește (link expirat/deja folosit), updateUser eșuează.
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { error: errors.resetLinkExpirat };
  }

  redirect("/");
}
