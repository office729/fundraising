import type { Metadata, Viewport } from "next";
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
  // Nu se preîncarcă pe paginile publice (unde nu e folosit); se descarcă la prima utilizare în CRM.
  preload: false,
});

// Doar temă albă: fără comutare automată pe întunecat după setarea telefonului/computerului (amesteca părți închise cu părți albe).
// colorScheme „light” ține și controalele browserului (câmpuri, bare de derulare) în aspect deschis.
export const viewport: Viewport = { colorScheme: "light" };

export const metadata: Metadata = {
  // Baza pentru adresele relative din metadate (canonical, og:image) — fără ea rămâneau relative sau lipseau.
  metadataBase: new URL("https://alexandrit.ro"),
  // Fiecare pagină își pune titlul propriu (lib/page-titles.ts); sufixul e adăugat aici.
  title: { default: "Alexandrit", template: `%s${SUFIX_TITLU}` },
  description: "Instrumente de fundraising pentru ONG-uri din România",
};

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
      <body className="min-h-full">
        {children}
        <AnalyticsConsent texts={COOKIES_DICT[locale].banner} />
        <AnalyticsEvents />
      </body>
    </html>
  );
}
