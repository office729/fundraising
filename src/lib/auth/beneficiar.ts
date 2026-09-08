import "server-only";

import { and, eq, sql } from "drizzle-orm";

import { fundraisingBeneficiaries, fundraisingPages, organizations } from "@/lib/db/schema";

// Query pur — primește tranzacția (tx) în care rulează, la fel ca
// findOrgMembership (src/lib/auth/org.ts). Apelat DUPĂ ce app.current_user_id
// a fost setat în acea tranzacție, altfel politica RLS
// fundraising_beneficiaries_self_select nu ar returna nimic.
export async function findBeneficiaryProfile(
  tx: { select: typeof import("@/lib/db").db.select; execute: typeof import("@/lib/db").db.execute },
  userId: string,
) {
  // JOIN pe organizations — tabel fără politică publică decât gated de
  // app.public_lookup (un beneficiar nu are membership, deci
  // organizations_member nu s-ar aplica). Scopat corect prin JOIN-ul propriu
  // al interogării (org.id = beneficiary.org_id + appUserId + status),
  // exact ca restul lookup-urilor publice — vezi avertismentul din
  // scripts/restore-rls.mjs. Setat AICI, nu la fiecare apelant, ca să nu
  // depindă de ca fiecare caller să-și amintească asta.
  await tx.execute(sql`select set_config('app.public_lookup', 'true', true)`);

  const rows = await tx
    .select({
      beneficiary: fundraisingBeneficiaries,
      page: fundraisingPages,
      orgSlug: organizations.slug,
      orgName: organizations.name,
    })
    .from(fundraisingBeneficiaries)
    .innerJoin(fundraisingPages, eq(fundraisingPages.id, fundraisingBeneficiaries.campaignPageId))
    .innerJoin(organizations, eq(organizations.id, fundraisingBeneficiaries.orgId))
    .where(and(eq(fundraisingBeneficiaries.appUserId, userId), eq(fundraisingBeneficiaries.status, "activ")))
    .limit(1);
  return rows[0] ?? null;
}
