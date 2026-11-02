import { NextResponse, type NextRequest } from "next/server";

import { getAuthUser } from "@/lib/auth/dal";
import { isPlatformAdmin } from "@/lib/billing/trial";
import { googleConfigurat, semneazaStateGoogle, urlAutorizareGoogle } from "@/lib/google-meet";

const INAPOI = "/platform-admin/programari?tab=programeaza";

// Pornește conectarea contului Google (pentru linkuri Meet create automat): doar contul platformei. redirect_uri e fix (NEXT_PUBLIC_SITE_URL), iar administratorul care a pornit
// conectarea circulă prin `state` semnat, verificat la întoarcere.
export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user?.email) return NextResponse.redirect(new URL("/login", req.url));
  if (!isPlatformAdmin(user.email)) return NextResponse.redirect(new URL("/", req.url));
  if (!googleConfigurat()) return NextResponse.redirect(new URL(`${INAPOI}&google=neconfigurat`, req.url));

  const site = process.env.NEXT_PUBLIC_SITE_URL;
  const redirectUri = `${site ? site.replace(/\/$/, "") : new URL(req.url).origin}/api/google/callback`;
  return NextResponse.redirect(urlAutorizareGoogle(semneazaStateGoogle(user.email), redirectUri));
}
