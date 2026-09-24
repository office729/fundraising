import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

// Punct de ieșire comun pentru toate link-urile trimise pe email de Supabase
// Auth (confirmare cont, resetare parolă) — acestea vin cu ?code=..., pe
// care îl schimbăm aici pe o sesiune reală (flux PKCE), apoi redirecționăm
// mai departe către `next`.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // `next` vine din query string — doar cale relativă pe același site. Altfel
  // `next=@evil.com` sau `next=.evil.com` produce `https://alexandrit.ro@evil.com`
  // (redirect extern, phishing de pe un domeniu de încredere). Rezolvăm prin URL
  // și cerem aceeași origine, în loc să concatenăm șiruri.
  const nextBrut = searchParams.get("next") || "/";
  let destinatie = `${origin}/`;
  if (nextBrut.startsWith("/") && !nextBrut.startsWith("//") && !nextBrut.includes("\\")) {
    const url = new URL(nextBrut, origin);
    if (url.origin === origin) destinatie = url.toString();
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(destinatie);
    }
  }

  return NextResponse.redirect(`${origin}/login?eroare=link_invalid`);
}
