import "server-only";

import { eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { organizations } from "@/lib/db/schema";

// Rezolvă slug-ul organizației al cărei domeniu propriu (organizations.custom_domain)
// se potrivește cu host-ul cererii curente — apelat din proxy, la fiecare request pe
// un host care nu e domeniul platformei. Lookup public (fără sesiune), la fel ca
// f230/strangere-fonduri — vezi organizations_public_lookup în documentation/rls-setup.sql.
export async function getSlugPentruDomeniu(host: string): Promise<string | null> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.public_lookup', 'true', true)`);
    const rows = await tx
      .select({ slug: organizations.slug })
      .from(organizations)
      .where(eq(organizations.customDomain, host))
      .limit(1);
    return rows[0]?.slug ?? null;
  });
}
