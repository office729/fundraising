"use client";

import { useEffect } from "react";

import { urmareste } from "@/lib/atribuire/client";

// Numără vizualizarea paginii publice a Formularului 230 (o dată la încărcare); vezi lib/atribuire/client.ts pentru ce se păstrează. Nu afișează nimic.
export function UrmarireF230({ orgSlug, beneficiarSlug }: { orgSlug: string; beneficiarSlug: string }) {
  useEffect(() => {
    urmareste("f230", "vizita", { orgSlug, beneficiarSlug });
  }, [orgSlug, beneficiarSlug]);
  return null;
}
