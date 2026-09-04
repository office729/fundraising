import "server-only";

import { eq, sql } from "drizzle-orm";
import { cache } from "react";

import { db } from "@/lib/db";
import { appUsers, memberships, organizations } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";

// User-ul autentificat la nivel Supabase (sau null). Memoizat pe render.
export const getAuthUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

// Găsește sau creează rândul `app_users` pentru emailul verificat de Supabase Auth.
// Trebuie apelat DINTR-O tranzacție unde app.current_user_email a fost deja
// setat (vezi guard.ts) — politica RLS de SELECT pe app_users se bazează pe
// asta, nu pe current_user_id (care încă nu există la primul login).
export async function ensureAppUser(
  tx: { select: typeof import("@/lib/db").db.select; insert: typeof import("@/lib/db").db.insert },
  email: string,
  name?: string | null,
) {
  const normalized = email.toLowerCase();
  const existing = await tx.select().from(appUsers).where(eq(appUsers.email, normalized)).limit(1);
  if (existing[0]) return existing[0];

  const inserted = await tx
    .insert(appUsers)
    .values({ email: normalized, name: name ?? null })
    .returning();
  return inserted[0];
}

// Pentru pagina de start (marketing): dacă userul e deja logat, la ce
// organizație a lui îl trimitem? Ia prima (nu presupune un singur org).
// Nu creează nimic (spre deosebire de ensureAppUser din guard.ts) — dacă
// userul e logat la Supabase dar nu are încă rând app_users/membership,
// întoarce null și pagina de start rămâne cea publică.
export async function getMyOrgSlug(): Promise<string | null> {
  const authUser = await getAuthUser();
  if (!authUser?.email) return null;

  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.current_user_email', ${authUser.email}, true)`);

    const appUserRows = await tx.select().from(appUsers).where(eq(appUsers.email, authUser.email!.toLowerCase())).limit(1);
    const appUser = appUserRows[0];
    if (!appUser) return null;

    await tx.execute(sql`select set_config('app.current_user_id', ${appUser.id}, true)`);

    const rows = await tx
      .select({ slug: organizations.slug })
      .from(memberships)
      .innerJoin(organizations, eq(memberships.orgId, organizations.id))
      .where(eq(memberships.userId, appUser.id))
      .orderBy(memberships.createdAt)
      .limit(1);

    return rows[0]?.slug ?? null;
  });
}
