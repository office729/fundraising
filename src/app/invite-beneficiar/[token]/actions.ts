"use server";

import { sql } from "drizzle-orm";
import { redirect } from "next/navigation";

import { ensureAppUser, getAuthUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { fundraisingBeneficiaries, fundraisingBeneficiaryInvites } from "@/lib/db/schema";

export type BeneficiaryInviteLookup = {
  email: string;
  campaignTitlu: string;
  orgName: string;
  expired: boolean;
  accepted: boolean;
};

// Singura cale de a citi o invitație de beneficiar înainte de a avea profil:
// prin token — vezi fundraising_beneficiary_invites_token_select în
// scripts/restore-rls.mjs (la fel ca lookupInviteByToken pentru echipă).
export async function lookupBeneficiaryInviteByToken(token: string): Promise<BeneficiaryInviteLookup | null> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.beneficiary_invite_token', ${token}, true)`);
    // organizations nu are politică publică decât gated de app.public_lookup
    // (vezi organizations_public_lookup) — fundraising_pages e deja public
    // (fundraising_pages_public_select), nu are nevoie de acest GUC.
    await tx.execute(sql`select set_config('app.public_lookup', 'true', true)`);
    const rows = await tx.execute(sql`
      select i.email, i.expires_at, i.accepted_at, p.titlu as campaign_titlu, o.name as org_name
      from fundraising_beneficiary_invites i
      join fundraising_pages p on p.id = i.campaign_page_id
      join organizations o on o.id = i.org_id
      where i.token = ${token}
      limit 1
    `);
    const row = (rows as unknown as {
      email: string;
      expires_at: string;
      accepted_at: string | null;
      campaign_titlu: string;
      org_name: string;
    }[])[0];
    if (!row) return null;
    return {
      email: row.email,
      campaignTitlu: row.campaign_titlu,
      orgName: row.org_name,
      expired: new Date(row.expires_at).getTime() < Date.now(),
      accepted: !!row.accepted_at,
    };
  });
}

export async function acceptBeneficiaryInviteAction(token: string): Promise<{ error: string | null }> {
  const authUser = await getAuthUser();
  if (!authUser?.email) {
    redirect(`/login?beneficiarInvite=${token}`);
  }

  try {
    await db.transaction(async (tx) => {
      await tx.execute(sql`select set_config('app.beneficiary_invite_token', ${token}, true)`);
      const rows = await tx
        .select()
        .from(fundraisingBeneficiaryInvites)
        .where(sql`${fundraisingBeneficiaryInvites.token} = ${token}`)
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
        .insert(fundraisingBeneficiaries)
        .values({
          appUserId: appUser.id,
          campaignPageId: invite.campaignPageId,
          orgId: invite.orgId,
          status: "activ",
        })
        .onConflictDoNothing();

      await tx.update(fundraisingBeneficiaryInvites).set({ acceptedAt: new Date() }).where(sql`${fundraisingBeneficiaryInvites.token} = ${token}`);

      // account_type e determinat de felul invitației acceptate, nu ales
      // liber — vezi decizia de design din planul modulului.
      await tx.execute(sql`update app_users set account_type = 'beneficiar' where id = ${appUser.id}`);
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Acceptarea a eșuat." };
  }

  // redirect() trebuie apelat DUPĂ ce tranzacția s-a încheiat — aruncă o
  // excepție specială Next.js care nu trebuie prinsă de db.transaction().
  redirect("/beneficiar");
}
