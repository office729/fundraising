import type { Locale } from "../config";

export const COMUNICARE_DICT = {
  ro: {
    tipLabel: { email: "Email", telefon: "Apel", intalnire: "Întâlnire", sms: "SMS" },
    title: "Comunicare",
    subtitle: (n: number) => `Istoric unificat — ${n} interacțiuni cu donatori și companii`,
    toateTipurile: "Toate tipurile",
    toataEchipa: "Toată echipa",
    empty: { title: "Nicio comunicare găsită", description: "Încearcă alte filtre." },
  },
  en: {
    tipLabel: { email: "Email", telefon: "Call", intalnire: "Meeting", sms: "SMS" },
    title: "Communication",
    subtitle: (n: number) => `Unified history — ${n} interactions with donors and companies`,
    toateTipurile: "All types",
    toataEchipa: "Whole team",
    empty: { title: "No communication found", description: "Try different filters." },
  },
} satisfies Record<Locale, unknown>;
