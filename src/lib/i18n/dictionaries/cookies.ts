import type { Locale } from "../config";

export const COOKIES_DICT = {
  ro: {
    homeLabel: "Acasă",
    eyebrow: "Legal",
    titlu: "Politica de cookies",
    actualizatLabel: "Ultima actualizare",
    actualizat: "[DE COMPLETAT — data publicării]",
    banner: {
      titlu: "Cookie-uri și statistici",
      text: "Folosim cookie-uri strict necesare pentru autentificare. Cu acordul tău, folosim și Google Analytics pentru statistici anonime despre utilizarea site-ului. Poți schimba alegerea oricând.",
      accept: "Accept statisticile",
      refuz: "Refuz",
      politica: "Politica de cookies",
    },
    setariLabel: "Modifică alegerea pentru cookie-uri",
    s1: {
      titlu: "1. Ce sunt cookie-urile",
      text: "Cookie-urile sunt fișiere text mici, stocate în browser, care permit unui site să rețină informații între vizite — de exemplu, dacă ești autentificat sau nu.",
    },
    s2: {
      titlu: "2. Cookie-uri strict necesare, folosite efectiv de platformă",
      introBefore: "Platforma Alexandrit folosește",
      introBold: "strict necesare",
      introAfter: "pentru autentificare, fără acordul tău separat, fiindcă fără ele nu poți intra în cont. Nu folosim cookie-uri de marketing sau publicitate.",
      tabelHeaders: { cookie: "Cookie", scop: "Scop", durata: "Durată" },
      randuri: [
        { nume: "sb-*-auth-token", scop: "Menține sesiunea de autentificare (Supabase Auth) — te ține conectat între vizite.", durata: "Sesiune sau persistent, în funcție de „Rămâi conectat” bifat la autentificare" },
        { nume: "sb-*-auth-token-code-verifier", scop: "Verificare tehnică temporară pentru finalizarea autentificării (cod OAuth/email).", durata: "Câteva minute" },
      ],
    },
    sAnalytics: {
      titlu: "3. Cookie-uri de analiză (doar cu acordul tău)",
      text: "Dacă apeși „Accept statisticile”, încărcăm Google Analytics 4 (Google Ireland Limited), care ne arată, agregat, ce pagini sunt vizitate și cum ajung vizitatorii pe site. Dacă refuzi sau nu alegi, scriptul Google nu se încarcă deloc și nu se trimite nimic către Google. Poți retrage acordul oricând, iar cookie-urile de mai jos se șterg.",
      tabelHeaders: { cookie: "Cookie", scop: "Scop", durata: "Durată" },
      randuri: [
        { nume: "_ga", scop: "Distinge vizitatorii, pentru statistici agregate (Google Analytics).", durata: "Până la 2 ani" },
        { nume: "_ga_*", scop: "Păstrează starea sesiunii de vizită (Google Analytics).", durata: "Până la 2 ani" },
      ],
    },
    s3: {
      titlu: "4. Stocare locală (nu e tehnic un cookie)",
      textBefore: "Folosim și",
      textAfter: "în browser — nu se trimite către server — pentru preferința de temă (light/dark), pentru alegerea ta privind cookie-urile de analiză și, în modulul CRM demonstrativ, pentru datele de test introduse local. Se șterge dacă ștergi datele site-ului din browser.",
    },
    s4: {
      titlu: "5. Cookie-uri terțe",
      textBefore: "Dacă activezi autentificarea cu Google, Google poate seta propriile cookie-uri în timpul procesului de autentificare, conform",
      linkText: "politicii de confidențialitate Google",
      textAfter: ". [DE COMPLETAT — orice alt serviciu terț adăugat ulterior, de exemplu procesatorul de plăți.]",
    },
    s5: {
      titlu: "6. Cum gestionezi cookie-urile",
      text: "Îți poți schimba alegerea privind cookie-urile de analiză oricând, cu butonul de mai jos. Poți șterge sau bloca cookie-urile și din setările browserului — reține că blocarea cookie-ului de sesiune te va deconecta din platformă la fiecare vizită.",
    },
  },
  en: {
    homeLabel: "Home",
    eyebrow: "Legal",
    titlu: "Cookie Policy",
    actualizatLabel: "Last updated",
    actualizat: "[TO COMPLETE — publication date]",
    banner: {
      titlu: "Cookies and statistics",
      text: "We use strictly necessary cookies for sign-in. With your consent, we also use Google Analytics for anonymous statistics about how the site is used. You can change your choice at any time.",
      accept: "Accept statistics",
      refuz: "Decline",
      politica: "Cookie policy",
    },
    setariLabel: "Change your cookie choice",
    s1: {
      titlu: "1. What cookies are",
      text: "Cookies are small text files stored in your browser that let a site remember information between visits — for example, whether you're signed in or not.",
    },
    s2: {
      titlu: "2. Strictly necessary cookies, actually used by the platform",
      introBefore: "The Alexandrit platform uses",
      introBold: "strictly necessary",
      introAfter: "cookies for authentication, without separate consent, because you can't sign in without them. We do not use marketing or advertising cookies.",
      tabelHeaders: { cookie: "Cookie", scop: "Purpose", durata: "Duration" },
      randuri: [
        { nume: "sb-*-auth-token", scop: "Maintains the authentication session (Supabase Auth) — keeps you signed in between visits.", durata: "Session or persistent, depending on whether \"Stay signed in\" was checked at login" },
        { nume: "sb-*-auth-token-code-verifier", scop: "Temporary technical verification to complete authentication (OAuth/email code).", durata: "A few minutes" },
      ],
    },
    sAnalytics: {
      titlu: "3. Analytics cookies (only with your consent)",
      text: "If you press \"Accept statistics\", we load Google Analytics 4 (Google Ireland Limited), which shows us, in aggregate, which pages are visited and how visitors reach the site. If you decline or don't choose, the Google script isn't loaded at all and nothing is sent to Google. You can withdraw consent at any time, and the cookies below are deleted.",
      tabelHeaders: { cookie: "Cookie", scop: "Purpose", durata: "Duration" },
      randuri: [
        { nume: "_ga", scop: "Distinguishes visitors, for aggregate statistics (Google Analytics).", durata: "Up to 2 years" },
        { nume: "_ga_*", scop: "Keeps the visit session state (Google Analytics).", durata: "Up to 2 years" },
      ],
    },
    s3: {
      titlu: "4. Local storage (not technically a cookie)",
      textBefore: "We also use",
      textAfter: "in the browser — never sent to the server — for the theme preference (light/dark), for your analytics-cookie choice and, in the demo CRM module, for locally entered test data. It's cleared if you clear the site's data from your browser.",
    },
    s4: {
      titlu: "5. Third-party cookies",
      textBefore: "If you enable sign-in with Google, Google may set its own cookies during the authentication process, per the",
      linkText: "Google privacy policy",
      textAfter: ". [TO COMPLETE — any other third-party service added later, for example the payment processor.]",
    },
    s5: {
      titlu: "6. Managing cookies",
      text: "You can change your analytics-cookie choice at any time with the button below. You can also delete or block cookies from your browser settings — note that blocking the session cookie will sign you out of the platform on every visit.",
    },
  },
} satisfies Record<Locale, unknown>;
