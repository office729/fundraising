"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export async function resetPasswordAction(
  _prevState: { error: string | null },
  formData: FormData,
): Promise<{ error: string | null }> {
  const password = String(formData.get("password") ?? "");
  const confirmare = String(formData.get("confirmare") ?? "");

  if (password.length < 8) {
    return { error: "Parola trebuie să aibă cel puțin 8 caractere." };
  }
  if (password !== confirmare) {
    return { error: "Parolele nu coincid." };
  }

  const supabase = await createClient();
  // Necesită sesiunea temporară de recuperare stabilită de /auth/callback —
  // dacă lipsește (link expirat/deja folosit), updateUser eșuează.
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { error: "Link-ul de resetare a expirat sau a fost deja folosit — cere unul nou." };
  }

  redirect("/");
}
