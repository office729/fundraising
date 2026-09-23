"use server";

import { headers } from "next/headers";

import { obtineIpClient, verificaLimitaRata } from "@/lib/auth/rate-limit";
import { AUTH_DICT } from "@/lib/i18n/dictionaries/auth";
import { getLocale } from "@/lib/i18n/get-locale";
import { createClient } from "@/lib/supabase/server";

export async function forgotPasswordAction(
  _prevState: { error: string | null; trimis: boolean },
  formData: FormData,
): Promise<{ error: string | null; trimis: boolean }> {
  const errors = AUTH_DICT[await getLocale()].errors;
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  if (!email) {
    return { error: errors.forgotEmail, trimis: false };
  }

  // Două dimensiuni: 5/oră per IP (un vizitator care greșește adresa de
  // câteva ori) ȘI separat ~3/oră per email țintă — altfel un atacator ar
  // putea "mail-bomb-ui" inbox-ul unei singure victime rotind IP-uri diferite.
  const ip = await obtineIpClient();
  const limitaIp = await verificaLimitaRata("forgot-password", ip, 5, 60);
  const limitaEmail = await verificaLimitaRata("forgot-password-email", email, 3, 60);
  if (!limitaIp || !limitaEmail) {
    return { error: errors.preaMulteIncercari, trimis: false };
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
