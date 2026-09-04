import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Rulat din proxy la fiecare request: reîmprospătează sesiunea Supabase.
// Verificarea de membership/organizație se face în DAL (org.ts), nu aici —
// aici doar decidem dacă userul e autentificat sau nu (gate „optimist").
//
// `rewriteTo`, dacă e prezent, vine de la rezolvarea unui domeniu propriu de
// organizație (vezi src/proxy.ts + lib/tenant-domain.ts): cererea rămâne pe
// domeniul lor vizibil, dar e servită intern de ruta /<orgSlug>/... . Gate-ul
// de mai jos trebuie să judece dupa acel path REAL (rewriteTo.pathname), nu
// după path-ul vizibil — altfel „/" pe un domeniu propriu ar trece drept
// homepage-ul de marketing, nu ar cere autentificare.
export async function updateSession(request: NextRequest, rewriteTo?: URL) {
  const buildResponse = () =>
    rewriteTo ? NextResponse.rewrite(rewriteTo, { request }) : NextResponse.next({ request });
  let supabaseResponse = buildResponse();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = buildResponse();
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: nu rula cod între createServerClient și getUser().
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = rewriteTo ? rewriteTo.pathname : request.nextUrl.pathname;
  // Site-ul de marketing (grupul de rute (marketing)) — pagini publice de
  // prezentare, nu au nevoie de autentificare. Vezi src/app/(marketing)/.
  const MARKETING_ROUTES = [
    "/",
    "/hub",
    "/cine-suntem",
    "/ce-facem",
    "/portofoliu",
    "/portofoliu-clienti",
    "/premii",
    "/website-fundraising",
    "/studii-de-caz",
    "/blog",
    "/termeni",
    "/gdpr",
    "/cookies",
  ];
  const isPublicRoute =
    MARKETING_ROUTES.includes(path) ||
    path === "/login" ||
    path === "/signup" ||
    path === "/forgot-password" ||
    path === "/reset-password" ||
    path.startsWith("/auth") ||
    path.startsWith("/invite/") ||
    path.startsWith("/api/stripe/webhook") ||
    // Cron-uri Vercel — invocate de infrastructura Vercel, nu de un vizitator
    // cu sesiune; ruta își face propria verificare (CRON_SECRET).
    path.startsWith("/api/cron/") ||
    // Formularul 230: link public, distribuit — cine completează NU e
    // autentificat niciodată. Pagina publică (/f230/<orgSlug>/<beneficiarSlug>)
    // și ruta ei de trimitere (/api/<orgSlug>/formular230/<beneficiarSlug>,
    // POST) trebuie să rămână afară din gate-ul de sesiune, altfel niciun
    // vizitator nu poate ajunge la ele.
    path.startsWith("/f230/") ||
    /^\/api\/[^/]+\/formular230\/[^/]+$/.test(path) ||
    // Link-uri scurte (/s/<cod>) — redirecționează spre pagini publice
    // (Formularul 230, deocamdată), deci trebuie să rămână afară din gate.
    path.startsWith("/s/") ||
    // Paginile de strângere fonduri create de susținători (peer-to-peer) —
    // creare, vizualizare și donație sunt toate publice, neautentificate.
    path.startsWith("/strangere-fonduri/");

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Un user logat care are un link de invitație activ (?invite=) NU e
  // redirecționat din /login sau /signup — trebuie să treacă prin acțiunea
  // de acolo (care îl duce la /invite/[token]), altfel invitația se pierde.
  const hasInviteParam = request.nextUrl.searchParams.has("invite");
  if (user && (path === "/login" || path === "/signup") && !hasInviteParam) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
