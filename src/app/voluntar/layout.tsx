import type { Metadata, Viewport } from "next";

// Panoul voluntarilor: pagină cu acces prin link, nu se indexează niciodată.
export const metadata: Metadata = {
  title: "Panou voluntari",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#be3a2f" };

export default function VoluntarLayout({ children }: { children: React.ReactNode }) {
  return children;
}
