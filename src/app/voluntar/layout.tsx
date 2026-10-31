import type { Metadata, Viewport } from "next";

import { VOLUNTAR_UI_DICT } from "@/lib/i18n/dictionaries/voluntar-ui";
import { getLocale } from "@/lib/i18n/get-locale";

// Panoul voluntarilor: pagină cu acces prin link, nu se indexează niciodată.
export async function generateMetadata(): Promise<Metadata> {
  return {
    title: VOLUNTAR_UI_DICT[await getLocale()].metaTitlu,
    robots: { index: false, follow: false, nocache: true },
    referrer: "no-referrer",
  };
}

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#154a85" };

export default function VoluntarLayout({ children }: { children: React.ReactNode }) {
  return children;
}
