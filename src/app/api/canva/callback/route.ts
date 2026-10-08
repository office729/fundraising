import { NextResponse, type NextRequest } from "next/server";

import { requireOrgAccess } from "@/lib/auth/guard";
import { salveazaConexiuneCanva, schimbaCodPeToken, verificaState } from "@/lib/canva";
import { raporteazaEroare } from "@/lib/monitoring";

// Callback OAuth Canva — un singur redirect_uri global, orgId vine din
// `state` (semnat, verificat aici), NU din URL. Sesiunea curentă (cookie-ul
// de autentificare, care a supraviețuit redirectului la Canva și înapoi)
// trebuie să corespundă EXACT organizației din `state` și rolului
// owner/admin — nu ne bazăm doar pe semnătura state-ului.
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const verifier = req.cookies.get("canva_pkce_verifier")?.value;

  const parsed = state ? verificaState(state) : null;
  if (!code || !parsed || !verifier) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  let access;
  try {
    access = await requireOrgAccess(parsed.orgSlug);
  } catch {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if (access.orgId !== parsed.orgId || (access.role !== "owner" && access.role !== "admin")) {
    const res = NextResponse.redirect(new URL(`/${parsed.orgSlug}/crm/setari?canva=eroare`, req.url));
    res.cookies.delete("canva_pkce_verifier");
    return res;
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const redirectUri = `${siteUrl ? siteUrl.replace(/\/$/, "") : url.origin}/api/canva/callback`;

  try {
    const tokens = await schimbaCodPeToken(code, verifier, redirectUri);
    await salveazaConexiuneCanva(access.orgId, access.userId, tokens);
    const res = NextResponse.redirect(new URL(`/${parsed.orgSlug}/crm/setari?canva=ok`, req.url));
    res.cookies.delete("canva_pkce_verifier");
    return res;
  } catch (e) {
    raporteazaEroare("canva-oauth-callback", e, { orgId: access.orgId });
    const res = NextResponse.redirect(new URL(`/${parsed.orgSlug}/crm/setari?canva=eroare`, req.url));
    res.cookies.delete("canva_pkce_verifier");
    return res;
  }
}
