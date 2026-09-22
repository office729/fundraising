import type { Metadata } from "next";
import { Inter, Manrope, Sora } from "next/font/google";

import { AnalyticsConsent } from "@/components/analytics-consent";
import { AnalyticsEvents } from "@/components/analytics-events";
import { COOKIES_DICT } from "@/lib/i18n/dictionaries/cookies";
import { getLocale } from "@/lib/i18n/get-locale";
import { SUFIX_TITLU } from "@/lib/page-titles";

import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "latin-ext"],
});

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin", "latin-ext"],
  weight: ["600", "700", "800"],
});

// Folosit doar de modulul CRM „Calm Impact" (text/tabele/cifre) — restul
// aplicației rămâne pe Manrope/Sora.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  // Fiecare pagină își pune titlul propriu (lib/page-titles.ts); sufixul e adăugat aici.
  title: { default: "Alexandrit", template: `%s${SUFIX_TITLU}` },
  description: "Instrumente de fundraising pentru ONG-uri din România",
};

const themeScript = `(function(){try{var t=localStorage.getItem('theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.documentElement.classList.add('dark');}catch(e){}})();`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${manrope.variable} ${sora.variable} ${inter.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full">
        {children}
        <AnalyticsConsent texts={COOKIES_DICT[locale].banner} />
        <AnalyticsEvents />
      </body>
    </html>
  );
}
