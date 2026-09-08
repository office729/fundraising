import type { Locale } from "../config";

export const BLOG_DICT = {
  ro: {
    breadcrumb: "Blog",
    eyebrow: "Blog",
    titlu: "Primele articole vin în curând",
    desc: "Lucrăm la ghiduri practice de fundraising, direct din experiența lui Vlad Plăcintă. Până atunci, scrie-ne orice întrebare ai — răspundem direct.",
    cta: "Scrie-ne o întrebare",
  },
  en: {
    breadcrumb: "Blog",
    eyebrow: "Blog",
    titlu: "The first articles are coming soon",
    desc: "We're working on practical fundraising guides, straight from Vlad Plăcintă's experience. In the meantime, send us any question — we answer directly.",
    cta: "Send us a question",
  },
} satisfies Record<Locale, unknown>;
