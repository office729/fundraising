import type { Locale } from "../config";

export const DONATORI_DICT = {
  ro: {
    real: {
      title: "Donatori reali",
      subtitle: (n: number) => `${n} persoane care au donat efectiv, prin Strângere fonduri — date reale, nu demonstrative`,
      faraTelefon: "fără telefon",
      donatie: "donație",
      donatii: "donații",
      seeDetails: "Vezi detaliile fiecărei donații în",
      strangereFonduri: "Strângere fonduri",
    },
    demo: {
      badge: "Date demonstrative",
      note: "Lista de mai jos e un prototip de design, cu date locale (salvate doar în acest browser) — nu are legătură cu donatorii reali de mai sus.",
    },
  },
  en: {
    real: {
      title: "Real donors",
      subtitle: (n: number) => `${n} people who actually donated, through Fundraising pages — real data, not demo data`,
      faraTelefon: "no phone",
      donatie: "donation",
      donatii: "donations",
      seeDetails: "See each donation's details in",
      strangereFonduri: "Fundraising pages",
    },
    demo: {
      badge: "Demo data",
      note: "The list below is a design prototype, with local data (saved only in this browser) — unrelated to the real donors above.",
    },
  },
} satisfies Record<Locale, unknown>;
