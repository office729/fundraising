import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

// Punct de ieșire comun pentru toate link-urile trimise pe email de Supabase
// Auth (confirmare cont, resetare parolă) — acestea vin cu ?code=..., pe
// care îl schimbăm aici pe o sesiune reală (flux PKCE), apoi redirecționăm
// mai departe către `next`.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") || "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?eroare=link_invalid`);
}
