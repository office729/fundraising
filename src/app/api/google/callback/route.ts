import { NextResponse, type NextRequest } from "next/server";

import { getAuthUser } from "@/lib/auth/dal";
import { isPlatformAdmin } from "@/lib/billing/trial";
import { conecteazaGoogle, googleConfigurat, verificaStateGoogle } from "@/lib/google-meet";
import { raporteazaEroare } from "@/lib/monitoring";

const INAPOI = "/platform-admin/programari?tab=programeaza";

// Întoarcerea de la Google după acordul pentru Calendar. Nu ne bazăm doar pe semnătura `state`: sesiunea curentă trebuie să fie chiar administratorul care a pornit conectarea.
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const user = await getAuthUser();
  if (!user?.email) return NextResponse.redirect(new URL("/login", req.url));
  if (!isPlatformAdmin(user.email)) return NextResponse.redirect(new URL("/", req.url));

  const spre = (rezultat: string) => NextResponse.redirect(new URL(`${INAPOI}&google=${rezultat}`, req.url));
  if (url.searchParams.get("error")) return spre("refuzat"); // de exemplu access_denied: nu a acceptat permisiunile
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!googleConfigurat()) return spre("neconfigurat");
  const emailState = state ? verificaStateGoogle(state) : null;
  if (!code || !emailState || emailState !== user.email.toLowerCase()) return spre("eroare");

  const site = process.env.NEXT_PUBLIC_SITE_URL;
  const redirectUri = `${site ? site.replace(/\/$/, "") : url.origin}/api/google/callback`;
  const r = await conecteazaGoogle(code, redirectUri, user.email);
  if (!r.ok) {
    raporteazaEroare("google-meet-callback", new Error(r.eroare));
    return spre("eroare");
  }
  return spre("ok");
}
