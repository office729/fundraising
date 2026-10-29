import type { Metadata } from "next";

import { UrmarirePlatforma } from "@/components/atribuire/urmarire-platforma";

import { LandingInteres } from "./landing-interes";

// Pagina de prezentare pentru ONG-uri („Descoperă Alexandrit”): adresa pe care o trimiți potențialilor clienți ca să-și lase datele. Fără meniul și subsolul
// site-ului, ca să rămână o singură acțiune. Deschisă și înainte de lansare (nu e în lista paginilor închise din lib/prelansare.ts). Nu e indexată de motoarele
// de căutare: se distribuie direct, prin mesaje și campanii.
export const metadata: Metadata = {
  title: "Descoperă Alexandrit",
  description: "Donatorii, campaniile și echipa, într-un singur loc. Lasă-ne datele organizației tale și te contactăm.",
  robots: { index: false, follow: true },
};

export default function DescoperaPage() {
  return (
    <>
      <LandingInteres />
      <UrmarirePlatforma />
    </>
  );
}
