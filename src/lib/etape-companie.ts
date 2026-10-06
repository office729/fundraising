// Etapele din pipeline-ul unei firme (CRM Companii) — O SINGURĂ listă, folosită de interfață (path-ul din fișă),
// de jurnal/scor și de server (acțiunea care salvează bifele). Ordinea de aici decide „etapa curentă”.

export type FazaEtape = {
  k: string;
  ro: string;
  en: string;
  culoare: string;
  etape: readonly { k: string; ro: string; en: string }[];
};

export const FAZE: readonly FazaEtape[] = [
  {
    k: "prospectare", ro: "Prospectare", en: "Prospecting", culoare: "#6b7280",
    etape: [
      { k: "nou", ro: "Nou", en: "New" },
      { k: "pe_viitor", ro: "Pe viitor", en: "Later" },
    ],
  },
  {
    k: "primul_contact", ro: "Primul contact", en: "First contact", culoare: "#2563eb",
    etape: [
      { k: "email", ro: "Email trimis", en: "Email sent" },
      { k: "mesaj", ro: "Mesaj trimis", en: "Message sent" },
      { k: "onepager", ro: "One pager trimis", en: "One-pager sent" },
    ],
  },
  {
    k: "discutii", ro: "Discuții", en: "Discussions", culoare: "#7c3aed",
    etape: [
      { k: "telefon", ro: "Discuție telefonică", en: "Phone call" },
      { k: "online", ro: "Întâlnire online", en: "Online meeting" },
    ],
  },
  {
    k: "contract", ro: "Contract", en: "Contract", culoare: "#ea580c",
    etape: [
      { k: "contract_trimis", ro: "Trimis", en: "Sent" },
      { k: "contract_asteptare", ro: "În așteptare", en: "On hold" },
      { k: "contract_semnat", ro: "Semnat", en: "Signed" },
    ],
  },
];

// Cele 10 pași, în ordine (Nou … Semnat), cu faza din care fac parte.
export const ETAPE = FAZE.flatMap((f) => f.etape.map((e) => ({ ...e, faza: f.k, culoare: f.culoare })));
export const ETAPE_PATH_KEYS: readonly string[] = ETAPE.map((e) => e.k);

// „Sponsorizat” și „Respins” sunt rezultate, nu pași în path.
export const ETICHETE_REZULTAT = {
  sponsorizat: { ro: "Sponsorizat", en: "Sponsored" },
  respins: { ro: "Respins", en: "Rejected" },
} as const;

// Toate valorile acceptate de server pentru companies.stage (path + rezultatul „sponsorizat”).
export const ETAPE_VALIDE_SERVER: ReadonlySet<string> = new Set([...ETAPE_PATH_KEYS, "sponsorizat"]);

// Etapa curentă = cea mai avansată bifată, după ordinea din listă; fără nicio bifă → „nou”.
export function etapaCurenta(bifate: Iterable<string>): string {
  const set = new Set(bifate);
  let curenta = "nou";
  for (const k of ETAPE_PATH_KEYS) if (set.has(k)) curenta = k;
  return curenta;
}

// Firmele mai vechi n-au bife salvate: se consideră făcute toate etapele până la cea curentă (comportamentul vechi).
export function bifeDinEtapa(stage: string | null): string[] {
  const idx = ETAPE_PATH_KEYS.indexOf(stage ?? "nou");
  if (idx <= 0) return [];
  return ETAPE_PATH_KEYS.slice(1, idx + 1);
}

export function etichetaEtapa(stage: string | null, status: string | null, locale: "ro" | "en"): string {
  if (status === "lost") return ETICHETE_REZULTAT.respins[locale];
  if (stage === "sponsorizat") return ETICHETE_REZULTAT.sponsorizat[locale];
  const e = ETAPE.find((x) => x.k === stage);
  if (!e) return stage ?? "—";
  // În path, etapele din faza Contract apar ca „Trimis / În așteptare / Semnat”; în jurnal au nevoie de context.
  return e.faza === "contract" ? `Contract ${e[locale].toLowerCase()}` : e[locale];
}
