import { NextResponse, type NextRequest } from "next/server";

import { requireOrgAccess } from "@/lib/auth/guard";
import { canvaConfigurat, genereazaPkce, semneazaState, urlAutorizareCanva } from "@/lib/canva";

// Pornește conectarea Canva pentru o organizație — doar owner/admin.
// redirect_uri e FIX (din NEXT_PUBLIC_SITE_URL, ca la Netopia — Canva permite
// UN SINGUR redirect URI per integrare), orgId circulă prin `state` semnat.
export async function GET(req: NextRequest, { params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const access = await requireOrgAccess(orgSlug);

  if (access.role !== "owner" && access.role !== "admin") {
    return NextResponse.redirect(new URL(`/${orgSlug}/crm/setari`, req.url));
  }
  if (!canvaConfigurat()) {
    return NextResponse.redirect(new URL(`/${orgSlug}/crm/setari?canva=neconfigurat`, req.url));
  }

  const { verifier, challenge } = genereazaPkce();
  const state = semneazaState({ orgId: access.orgId, orgSlug });
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const redirectUri = `${siteUrl ? siteUrl.replace(/\/$/, "") : new URL(req.url).origin}/api/canva/callback`;

  const res = NextResponse.redirect(urlAutorizareCanva({ state, codeChallenge: challenge, redirectUri }));
  res.cookies.set("canva_pkce_verifier", verifier, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/api/canva",
  });
  return res;
}
