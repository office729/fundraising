"use server";

import { headers } from "next/headers";

import { createClient } from "@/lib/supabase/server";

export async function forgotPasswordAction(
  _prevState: { error: string | null; trimis: boolean },
  formData: FormData,
): Promise<{ error: string | null; trimis: boolean }> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  if (!email) {
    return { error: "Completează adresa de email.", trimis: false };
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
