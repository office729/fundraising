import type { NextRequest } from "next/server";

import { esteSlugRezervat } from "@/lib/reserved-slugs";
import { updateSession } from "@/lib/supabase/session";
import { getSlugPentruDomeniu } from "@/lib/tenant-domain";

// Host-urile platformei — orice altceva e candidat la lookup de domeniu
// propriu de organizație (organizations.custom_domain). Localhost/*.local
// acoperă dezvoltarea; *.vercel.app acoperă producția și preview deploys.
function esteHostPlatforma(host: string): boolean {
  const faraPort = host.split(":")[0];
  return faraPort === "localhost" || faraPort.endsWith(".local") || faraPort.endsWith(".vercel.app");
}

// Next.js 16: „Middleware" se numește „Proxy" (proxy.ts, export `proxy`).
//
// Pe un domeniu propriu de organizație (Setări → Adresă și domeniu), cererea
// rămâne vizibil pe acel domeniu, dar e rescrisă intern către /<orgSlug>/...
// — vezi lib/tenant-domain.ts pentru lookup și lib/supabase/session.ts pentru
// cum ține cont gate-ul de autentificare de path-ul REAL, nu de cel vizibil.
// Rutele „rezervate" (login, api, f230 etc. — lib/reserved-slugs.ts) nu se
// rescriu niciodată, ca autentificarea și rutele publice existente să
// funcționeze identic pe orice domeniu.
export async function proxy(request: NextRequest) {
  const host = request.headers.get("host");
  const pathname = request.nextUrl.pathname;

  if (host && !esteHostPlatforma(host) && !pathname.startsWith("/_next") && !pathname.startsWith("/api")) {
    const primulSegment = pathname.split("/")[1] ?? "";
    if (!esteSlugRezervat(primulSegment)) {
      const orgSlug = await getSlugPentruDomeniu(host);
      // Un link intern deja generat cu slug-ul explicit (ex. <Link href={`/${orgSlug}/crm`}>,
      // folosit peste tot în aplicație) nu trebuie prefixat din nou — doar
      // path-urile „goale" (vizitate direct pe domeniul propriu) au nevoie de rescriere.
      if (orgSlug && primulSegment !== orgSlug) {
        const rewriteTo = request.nextUrl.clone();
        rewriteTo.pathname = `/${orgSlug}${pathname}`;
        return await updateSession(request, rewriteTo);
      }
    }
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    // Fișiere statice din public/ (fonturi, PDF-uri șablon) — trebuie servite
    // direct, fără gate-ul de sesiune, altfel un vizitator NEautentificat
    // (formularul public 230) le primește redirecționate spre /login în loc
    // de conținutul lor real. Descoperit real: fetch() client-side pentru
    // /fonts/*.ttf și /formular-230-template.pdf urma redirect-ul și primea
    // HTML-ul paginii de login în loc de font/PDF.
    "/((?!_next/static|_next/image|icon(?:\\.png)?|apple-icon(?:\\.png)?|api/stripe/webhook|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ttf|woff|woff2|pdf)$).*)",
  ],
};
