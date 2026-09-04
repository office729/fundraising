"use server";

import { randomUUID } from "node:crypto";

import { eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";

import { ensureAppUser, getAuthUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { memberships, organizations } from "@/lib/db/schema";
import { slugify } from "@/lib/slugify";

// Pasul de finalizare pentru cine s-a autentificat prin Google fără să fi
// avut deja un cont — spre deosebire de signup/actions.ts, userul e DEJA
// autentificat la Supabase (nu mai chemăm supabase.auth.signUp aici), doar
// îi lipsește organizația.
export async function finalizeazaOrganizatiaAction(
  _prevState: { error: string | null },
  formData: FormData,
): Promise<{ error: string | null }> {
  const orgName = String(formData.get("orgName") ?? "").trim();
  if (!orgName) {
    return { error: "Completează numele organizației." };
  }

  const authUser = await getAuthUser();
  if (!authUser?.email) {
    redirect("/login");
  }
  const email = authUser.email!.toLowerCase();
  const name = (authUser.user_metadata?.full_name as string | undefined) ?? null;

  const baseSlug = slugify(orgName);
  const orgSlug = await db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.current_user_email', ${email}, true)`);
    const appUser = await ensureAppUser(tx, email, name);
    await tx.execute(sql`select set_config('app.current_user_id', ${appUser.id}, true)`);

    let slug = baseSlug;
    for (let attempt = 1; attempt <= 20; attempt++) {
      const existing = await tx.select({ id: organizations.id }).from(organizations).where(eq(organizations.slug, slug)).limit(1);
      if (!existing[0]) break;
      slug = `${baseSlug}-${attempt}`;
    }

    // Fără .returning() — vezi explicația din signup/actions.ts (RLS pe INSERT...RETURNING).
    const orgId = randomUUID();
    await tx.insert(organizations).values({ id: orgId, name: orgName, slug });
    await tx.insert(memberships).values({ orgId, userId: appUser.id, role: "owner" });
    return slug;
  });

  redirect(`/${orgSlug}/crm`);
}
