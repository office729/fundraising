"use server";

import { eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";

import { ensureAppUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { memberships, organizations } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";

export async function loginAction(
  _prevState: { error: string | null },
  formData: FormData,
): Promise<{ error: string | null }> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const inviteToken = String(formData.get("inviteToken") ?? "").trim();
  const ramaiConectat = formData.get("ramaiConectat") != null;

  if (!email || !password) {
    return { error: "Completează emailul și parola." };
  }

  const supabase = await createClient({ persist: ramaiConectat });
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { error: "Email sau parolă incorectă." };
  }

  if (inviteToken) {
    redirect(`/invite/${inviteToken}`);
  }

  // Găsește prima organizație a userului și redirecționează acolo. Cu
  // multiple organizații per user (Faza 1+), aici devine un selector.
  const orgSlug = await db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.current_user_email', ${email}, true)`);
    const appUser = await ensureAppUser(tx, email);
    await tx.execute(sql`select set_config('app.current_user_id', ${appUser.id}, true)`);

    const rows = await tx
      .select({ slug: organizations.slug })
      .from(memberships)
      .innerJoin(organizations, eq(organizations.id, memberships.orgId))
      .where(eq(memberships.userId, appUser.id))
      .limit(1);
    return rows[0]?.slug ?? null;
  });

  if (!orgSlug) {
    redirect("/signup");
  }
  redirect(`/${orgSlug}/crm`);
}
