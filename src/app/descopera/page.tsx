import type { Metadata } from "next";

import { UrmarirePlatforma } from "@/components/atribuire/urmarire-platforma";
import { INTERES_UI_DICT } from "@/lib/i18n/dictionaries/interes-ui";
import { getLocale } from "@/lib/i18n/get-locale";

import { LandingInteres } from "./landing-interes";

// Pagina de prezentare pentru ONG-uri („Descoperă Alexandrit”): adresa pe care o trimiți potențialilor clienți ca să-și lase datele. Fără meniul și subsolul
// site-ului, ca să rămână o singură acțiune. Deschisă și înainte de lansare (nu e în lista paginilor închise din lib/prelansare.ts). Nu e indexată de motoarele
// de căutare: se distribuie direct, prin mesaje și campanii.
export async function generateMetadata(): Promise<Metadata> {
  const t = INTERES_UI_DICT[await getLocale()];
  return {
    title: t.metaTitlu,
    description: t.metaDescriere,
    robots: { index: false, follow: true },
  };
}

export default async function DescoperaPage() {
  return (
    <>
      <LandingInteres locale={await getLocale()} />
      <UrmarirePlatforma />
    </>
  );
}
