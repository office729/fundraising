"use server";

import { sql } from "drizzle-orm";
import { redirect } from "next/navigation";

import { ensureAppUser, getAuthUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { invites, memberships } from "@/lib/db/schema";

export type InviteLookup = {
  email: string;
  role: string;
  orgName: string;
  orgSlug: string | null; // rezolvat abia la acceptare (nu expunem slug-ul altei organizații degeaba)
  expired: boolean;
  accepted: boolean;
};

// Singura cale de a citi o invitație înainte de a fi membru: prin token,
// nu prin membership — vezi politica invites_token_select din rls-setup.sql.
export async function lookupInviteByToken(token: string): Promise<InviteLookup | null> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.invite_lookup_token', ${token}, true)`);
    const rows = await tx
      .select({
        email: invites.email,
        role: invites.role,
        orgName: invites.orgName,
        expiresAt: invites.expiresAt,
        acceptedAt: invites.acceptedAt,
      })
      .from(invites)
      .where(sql`${invites.token} = ${token}`)
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    return {
      email: row.email,
      role: row.role,
      orgName: row.orgName,
      orgSlug: null,
      expired: row.expiresAt.getTime() < Date.now(),
      accepted: !!row.acceptedAt,
    };
  });
}

export async function acceptInviteAction(token: string): Promise<{ error: string | null }> {
  const authUser = await getAuthUser();
  if (!authUser?.email) {
    redirect(`/login?invite=${token}`);
  }

  let orgSlug: string | null = null;
  try {
    orgSlug = await db.transaction(async (tx) => {
      await tx.execute(sql`select set_config('app.invite_lookup_token', ${token}, true)`);
      const rows = await tx
        .select({
          id: invites.id,
          orgId: invites.orgId,
          email: invites.email,
          role: invites.role,
          expiresAt: invites.expiresAt,
          acceptedAt: invites.acceptedAt,
        })
        .from(invites)
        .where(sql`${invites.token} = ${token}`)
        .limit(1);
      const invite = rows[0];
      if (!invite) throw new Error("Invitație inexistentă sau expirată.");
      if (invite.acceptedAt) throw new Error("Invitația a fost deja folosită.");
      if (invite.expiresAt.getTime() < Date.now()) throw new Error("Invitația a expirat.");
      if (invite.email.toLowerCase() !== authUser.email!.toLowerCase()) {
        throw new Error(
          `Invitația e pentru ${invite.email} — ești logat cu alt email. Deconectează-te și intră cu adresa corectă.`,
        );
      }

      await tx.execute(sql`select set_config('app.current_user_email', ${authUser.email}, true)`);
      const appUser = await ensureAppUser(tx as unknown as typeof db, authUser.email!);
      await tx.execute(sql`select set_config('app.current_user_id', ${appUser.id}, true)`);

      await tx
        .insert(memberships)
        .values({ orgId: invite.orgId, userId: appUser.id, role: invite.role })
        .onConflictDoNothing();

      await tx
        .update(invites)
        .set({ acceptedAt: new Date() })
        .where(sql`${invites.token} = ${token}`);

      const orgRows = await tx.execute(sql`select slug from organizations where id = ${invite.orgId}`);
      return (orgRows as unknown as { slug: string }[])[0]?.slug ?? null;
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Acceptarea a eșuat." };
  }

  if (orgSlug) redirect(`/${orgSlug}`);
  return { error: null };
}
