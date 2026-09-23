"use server";

import { headers } from "next/headers";

import { AUTH_DICT } from "@/lib/i18n/dictionaries/auth";
import { getLocale } from "@/lib/i18n/get-locale";
import { createClient } from "@/lib/supabase/server";

export async function forgotPasswordAction(
  _prevState: { error: string | null; trimis: boolean },
  formData: FormData,
): Promise<{ error: string | null; trimis: boolean }> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  if (!email) {
    return { error: AUTH_DICT[await getLocale()].errors.forgotEmail, trimis: false };
  }

  const origin = (await headers()).get("origin") ?? "";
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  });

  // Același răspuns indiferent dacă emailul are sau nu cont — nu confirmăm
  // existența unei adrese unui vizitator neautentificat.
  return { error: null, trimis: true };
}
