import type { Locale } from "../config";

// Deep Search în lista de persoane fizice (CRM Donatori): butonul de lângă căutare și textul din câmp.
const ro = {
  deep: "Deep Search",
  deepTitle: "Căutare profundă: caută în TOATE datele donatorului — nume, email, telefon (orice format), localitate, județ, proiecte, notițe. Toate cuvintele scrise trebuie să apară undeva.",
  deepPlaceholder: "Caută peste tot: nume, email, telefon, localitate, proiect, notițe…",
};
const en: typeof ro = {
  deep: "Deep Search",
  deepTitle: "Deep search: looks in ALL the donor's data — name, email, phone (any format), city, county, projects, notes. Every word you type must appear somewhere.",
  deepPlaceholder: "Search everywhere: name, email, phone, city, project, notes…",
};
export const DONATORI_DEEP_DICT = { ro, en } satisfies Record<Locale, unknown>;
