import type { Locale } from "../config";

export const COOKIES_DICT = {
  ro: {
    homeLabel: "Acasă",
    eyebrow: "Legal",
    titlu: "Politica de cookies",
    actualizatLabel: "Ultima actualizare",
    actualizat: "[DE COMPLETAT — data publicării]",
    s1: {
      titlu: "1. Ce sunt cookie-urile",
      text: "Cookie-urile sunt fișiere text mici, stocate în browser, care permit unui site să rețină informații între vizite — de exemplu, dacă ești autentificat sau nu.",
    },
    s2: {
      titlu: "2. Cookie-uri strict necesare, folosite efectiv de platformă",
      introBefore: "Platforma Fundraising Academy folosește exclusiv cookie-uri",
      introBold: "strict necesare",
      introAfter: "pentru autentificare — nu folosim cookie-uri de marketing, publicitate sau analiză a traficului bazate pe identificatori individuali.",
      tabelHeaders: { cookie: "Cookie", scop: "Scop", durata: "Durată" },
      randuri: [
        { nume: "sb-*-auth-token", scop: "Menține sesiunea de autentificare (Supabase Auth) — te ține conectat între vizite.", durata: "Sesiune sau persistent, în funcție de „Rămâi conectat” bifat la autentificare" },
        { nume: "sb-*-auth-token-code-verifier", scop: "Verificare tehnică temporară pentru finalizarea autentificării (cod OAuth/email).", durata: "Câteva minute" },
      ],
    },
    s3: {
      titlu: "3. Stocare locală (nu e tehnic un cookie)",
      textBefore: "Folosim și",
      textAfter: "în browser — nu se trimite către server — pentru preferința de temă (light/dark) și, în modulul CRM demonstrativ, pentru datele de test introduse local. Se șterge dacă ștergi datele site-ului din browser.",
    },
    s4: {
      titlu: "4. Cookie-uri terțe",
      textBefore: "Dacă activezi autentificarea cu Google, Google poate seta propriile cookie-uri în timpul procesului de autentificare, conform",
      linkText: "politicii de confidențialitate Google",
      textAfter: ". [DE COMPLETAT — orice alt serviciu terț adăugat ulterior: procesator de plăți, analytics etc.]",
    },
    s5: {
      titlu: "5. Cum gestionezi cookie-urile",
      text: "Poți șterge sau bloca cookie-urile din setările browserului — reține că blocarea cookie-ului de sesiune te va deconecta din platformă la fiecare vizită.",
    },
  },
  en: {
    homeLabel: "Home",
    eyebrow: "Legal",
    titlu: "Cookie Policy",
    actualizatLabel: "Last updated",
    actualizat: "[TO COMPLETE — publication date]",
    s1: {
      titlu: "1. What cookies are",
      text: "Cookies are small text files stored in your browser that let a site remember information between visits — for example, whether you're signed in or not.",
    },
    s2: {
      titlu: "2. Strictly necessary cookies, actually used by the platform",
      introBefore: "The Fundraising Academy platform uses exclusively",
      introBold: "strictly necessary",
      introAfter: "cookies for authentication — we do not use marketing, advertising, or traffic-analysis cookies based on individual identifiers.",
      tabelHeaders: { cookie: "Cookie", scop: "Purpose", durata: "Duration" },
      randuri: [
        { nume: "sb-*-auth-token", scop: "Maintains the authentication session (Supabase Auth) — keeps you signed in between visits.", durata: "Session or persistent, depending on whether \"Stay signed in\" was checked at login" },
        { nume: "sb-*-auth-token-code-verifier", scop: "Temporary technical verification to complete authentication (OAuth/email code).", durata: "A few minutes" },
      ],
    },
    s3: {
      titlu: "3. Local storage (not technically a cookie)",
      textBefore: "We also use",
      textAfter: "in the browser — never sent to the server — for the theme preference (light/dark) and, in the demo CRM module, for locally entered test data. It's cleared if you clear the site's data from your browser.",
    },
    s4: {
      titlu: "4. Third-party cookies",
      textBefore: "If you enable sign-in with Google, Google may set its own cookies during the authentication process, per the",
      linkText: "Google privacy policy",
      textAfter: ". [TO COMPLETE — any other third-party service added later: payment processor, analytics, etc.]",
    },
    s5: {
      titlu: "5. Managing cookies",
      text: "You can delete or block cookies from your browser settings — note that blocking the session cookie will sign you out of the platform on every visit.",
    },
  },
} satisfies Record<Locale, unknown>;
