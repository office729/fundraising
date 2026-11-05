"use client";

import { useEffect } from "react";

import { refuzStatistici, urmareste } from "@/lib/atribuire/client";
import { memoreazaTouch } from "@/lib/reclame/touch-client";
import { reinoiesteMemoria } from "@/lib/surse-donatii/client";
import { inregistreazaEveniment } from "@/lib/statistici-campanii/inregistreaza";

// Numără vizualizarea paginii de campanie (o dată la încărcare). Fără cookie-uri; cu acordul pentru statistici se păstrează doar un identificator
// pseudonim de vizitator și de sesiune (vezi lib/atribuire/client.ts), iar fără acord vizita se numără ca amprentă zilnică, fără urmărire între zile.
// Cine a refuzat statisticile nu mai e numărat deloc. Nu afișează nimic.
export function UrmarireVizite({ orgSlug, pageSlug }: { orgSlug: string; pageSlug: string }) {
  useEffect(() => {
    memoreazaTouch();
    // Memoria „Sursele donațiilor” (prima/ultima sursă externă): doar sesiune fără acord, 90 de zile cu acord; se actualizează și la refuz (fără identificatori, fără eveniment).
    reinoiesteMemoria();
    if (refuzStatistici()) return;
    urmareste("campanie", "vizita", { orgSlug, pageSlug });
    const q = new URLSearchParams(window.location.search);
    void inregistreazaEveniment(orgSlug, pageSlug, "vizita", {
      referrer: document.referrer || undefined,
      utmSource: q.get("utm_source") ?? undefined,
      utmMedium: q.get("utm_medium") ?? undefined,
      utmCampaign: q.get("utm_campaign") ?? undefined,
    });
  }, [orgSlug, pageSlug]);
  return null;
}
