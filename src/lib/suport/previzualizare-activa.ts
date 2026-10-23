import "server-only";

import { cookies } from "next/headers";

import { isPlatformAdmin } from "@/lib/billing/trial";
import type { PersonalizareOrg } from "@/lib/personalizare-org";
import { COOKIE_PREVIZUALIZARE, ORG_DEMO_SLUG, decodeazaStare } from "@/lib/previzualizare";

import { citesteOrgPentruPersonalizare, type OrgPentruPersonalizare } from "./personalizare-admin";

// Contul unui administrator al platformei care lucrează în organizația demo: nu primește ferestrele de bun venit (onboarding), bannerul DPA și nici contorul de
// probă ale organizației demo, pentru că nu e o organizație reală a lui.
export const esteAdminInDemo = (orgSlug: string, userEmail: string): boolean => orgSlug === ORG_DEMO_SLUG && isPlatformAdmin(userEmail);

export type PrevizualizareActiva = { tinta: OrgPentruPersonalizare; config: PersonalizareOrg | null };

// Previzualizarea navigabilă de suport (vezi lib/previzualizare.ts): activă doar pentru un administrator al platformei, doar pe organizația demo și doar cât
// cookie-ul de stare e valid. Orice altă combinație întoarce null și cookie-ul e ignorat.
export async function previzualizareActiva(orgSlug: string, userEmail: string): Promise<PrevizualizareActiva | null> {
  if (!esteAdminInDemo(orgSlug, userEmail)) return null;
  const cod = (await cookies()).get(COOKIE_PREVIZUALIZARE)?.value;
  const stare = cod ? decodeazaStare(cod) : null;
  if (!stare) return null;
  const tinta = await citesteOrgPentruPersonalizare(stare.slug);
  if (!tinta) return null;
  return { tinta, config: stare.config ?? tinta.config };
}
