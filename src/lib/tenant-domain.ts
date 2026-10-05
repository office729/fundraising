import "server-only";

import { eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { organizations } from "@/lib/db/schema";

// Rezolvă slug-ul organizației al cărei domeniu propriu (organizations.custom_domain)
// se potrivește cu host-ul cererii curente — apelat din proxy, la fiecare request pe
// un host care nu e domeniul platformei. Lookup public (fără sesiune), la fel ca
// f230/strangere-fonduri — vezi organizations_public_lookup în documentation/rls-setup.sql.
// Cache în memorie, per instanță: proxy-ul îl apelează la FIECARE cerere (și prefetch) de pe un domeniu propriu,
// iar maparea domeniu → organizație se schimbă foarte rar. Rezultatele negative expiră repede, ca un domeniu
// tocmai configurat să nu rămână „necunoscut" minute în șir.
const CACHE_DOMENII = new Map<string, { slug: string | null; expira: number }>();
const TTL_POZITIV_MS = 60_000;
const TTL_NEGATIV_MS = 10_000;

export async function getSlugPentruDomeniu(host: string): Promise<string | null> {
  const acum = Date.now();
  const cached = CACHE_DOMENII.get(host);
  if (cached && cached.expira > acum) return cached.slug;
  const slug = await cautaSlugPentruDomeniu(host);
  if (CACHE_DOMENII.size > 500) CACHE_DOMENII.clear(); // plasă de siguranță împotriva hosturilor arbitrare
  CACHE_DOMENII.set(host, { slug, expira: acum + (slug ? TTL_POZITIV_MS : TTL_NEGATIV_MS) });
  return slug;
}

async function cautaSlugPentruDomeniu(host: string): Promise<string | null> {
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
