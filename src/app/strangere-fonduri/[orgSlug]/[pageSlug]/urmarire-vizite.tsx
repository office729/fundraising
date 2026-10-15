"use client";

import { useEffect } from "react";

import { memoreazaTouch } from "@/lib/reclame/touch-client";
import { inregistreazaEveniment } from "@/lib/statistici-campanii/inregistreaza";

// Numără vizualizarea paginii de campanie (o dată la încărcare). Fără cookie-uri sau stocare în browser; vezi
// lib/statistici-campanii/inregistreaza.ts pentru ce se păstrează. Nu afișează nimic.
export function UrmarireVizite({ orgSlug, pageSlug }: { orgSlug: string; pageSlug: string }) {
  useEffect(() => {
    memoreazaTouch();
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
