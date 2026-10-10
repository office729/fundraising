import type { Metadata, Viewport } from "next";

// Pagina coordonatorului: acces prin cod secret, nu se indexează niciodată.
export const metadata: Metadata = {
  title: "Coordonator activitate",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#154a85" };

export default function CoordonatorLayout({ children }: { children: React.ReactNode }) {
  return children;
}
