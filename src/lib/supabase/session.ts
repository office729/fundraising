import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { isPlatformAdmin } from "@/lib/billing/trial";
import { esteCaleInchisaPublicului, starePrelansare } from "@/lib/prelansare";

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
    "/intrebari-frecvente",
    "/previzualizare-campanii",
    "/ce-facem",
    "/portofoliu",
    "/portofoliu-clienti",
    "/premii",
    "/vlad-placinta",
    "/contact",
    "/automatizare",
    "/automatizari",
    "/cum-functioneaza",
    "/studii-de-caz",
    "/blog",
    "/termeni",
    "/termeni-donatori",
    "/gdpr",
    "/dpa",
    "/cookies",
    "/descopera",
  ];
  const isPublicRoute =
    MARKETING_ROUTES.includes(path) ||
    path === "/prelansare" ||
    // Calendarul intern de programări (/programare) și paginile personale ale unei programări (/programare/<token>): publice, fără cont; accesul la o programare îl dă tokenul.
    path === "/programare" ||
    path.startsWith("/programare/") ||
    path === "/api/health" ||
    path === "/robots.txt" ||
    path === "/embed.js" ||
    path === "/sitemap.xml" ||
    // Imaginea de previzualizare (Open Graph): o cer rețelele sociale și Google fără sesiune.
    path === "/opengraph-image" ||
    path === "/twitter-image" ||
    path === "/login" ||
    path === "/signup" ||
    path === "/forgot-password" ||
    path === "/reset-password" ||
    path.startsWith("/auth") ||
    path === "/dezabonare" ||
    path === "/api/dezabonare" ||
    path === "/dezabonare-notificare" ||
    path === "/api/dezabonare-notificare" ||
    path.startsWith("/invite/") ||
    path.startsWith("/invite-beneficiar/") ||
    // Webhook-urile Stripe ale ONG-urilor (/api/stripe/webhook/<slug>) și IPN-ul
    // Netopia (abonamentele platformei) — apelate de serverele lor, nu de un
    // vizitator cu sesiune; fiecare rută își verifică singură semnătura.
    path.startsWith("/api/stripe/webhook") ||
    path.startsWith("/api/netopia/ipn") ||
    // Webhook-urile Twilio (voice, voice-status) — apelate de serverele Twilio;
    // fiecare rută validează semnătura X-Twilio-Signature (403 altfel).
    path.startsWith("/api/twilio/") ||
    // Cron-uri Vercel — invocate de infrastructura Vercel, nu de un vizitator
    // cu sesiune; ruta își face propria verificare (CRON_SECRET).
    path.startsWith("/api/cron/") ||
    // API-ul public (/api/v1/…): apelat de sisteme, nu de utilizatori cu sesiune; fiecare rută verifică cheia API (Authorization: Bearer) și permisiunea ei.
    path.startsWith("/api/v1/") ||
    // Webhook-ul Waalaxy (răspunsuri și acceptări de invitație pe LinkedIn): apelat de serverele lor, fără sesiune; adresa e secretă (?t=…) și se verifică în rută.
    path.startsWith("/api/waalaxy/webhook") ||
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
    // Panoul voluntarilor (/voluntar/<cod>): pagină publică, fără cont; accesul îl dă codul din link, verificat în server.
    path.startsWith("/voluntar/") ||
    // Pagina coordonatorului unei activități (/coordonator/<cod secret>): fără cont, accesul îl dă codul.
    path.startsWith("/coordonator/") ||
    // Verificarea publică a unui certificat (/v/<cod>): oricine primește linkul sau scanează codul QR, fără cont.
    path.startsWith("/v/") ||
    // Paginile de strângere fonduri create de susținători (peer-to-peer) —
    // creare, vizualizare și donație sunt toate publice, neautentificate.
    path.startsWith("/strangere-fonduri/");

  // Pre-lansare (vezi lib/prelansare.ts): până pe 26 octombrie 2026 paginile comerciale ale site-ului sunt vizibile doar administratorilor platformei.
  // Publicul vede cronometrul în locul paginii „/”, iar celelalte pagini comerciale îl duc la „/”. Rămân deschise: autentificarea, paginile de donație și
  // Formularul 230 ale organizațiilor, widgetul, webhook-urile, cron-urile, textele legale și contactul (vezi esteCaleInchisaPublicului).
  const areInvitatie = request.nextUrl.searchParams.has("invite") || request.nextUrl.searchParams.has("beneficiarInvite");
  if (
    esteCaleInchisaPublicului(path, areInvitatie) &&
    starePrelansare(Date.now(), process.env.PRELANSARE_OPRITA === "1") !== "live" &&
    !isPlatformAdmin(user?.email)
  ) {
    if (path !== "/") {
      const acasa = request.nextUrl.clone();
      acasa.pathname = "/";
      acasa.search = "";
      return NextResponse.redirect(acasa);
    }
    const rescris = NextResponse.rewrite(new URL("/prelansare", request.url), { request });
    supabaseResponse.cookies.getAll().forEach((c) => rescris.cookies.set(c));
    return rescris;
  }

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
    url.pathname = "/intra";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
