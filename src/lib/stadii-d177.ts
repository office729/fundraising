// Stadiul contractului D177 (redirecționarea impozitului pe profit) al unei firme — un singur stadiu curent, în ordine:
// Nou → Email trimis → Discuție telefonică → Întâlnire one to one → Trimis → În așteptare → Semnat.
// Se păstrează în companies.extra.d177Stadiu (fără migrare); lipsă = „nou”.
export const FAZE_D177 = [
  { k: "prospectare", titlu: "Început", culoare: "#6b7280", etape: [{ k: "nou", eticheta: "Nou" }] },
  {
    k: "contact", titlu: "Contact", culoare: "#2563eb",
    etape: [
      { k: "email", eticheta: "Email trimis" },
      { k: "telefon", eticheta: "Discuție telefonică" },
      { k: "intalnire", eticheta: "Întâlnire one to one" },
    ],
  },
  {
    k: "contract", titlu: "Contract", culoare: "#ea580c",
    etape: [
      { k: "trimis", eticheta: "Trimis" },
      { k: "asteptare", eticheta: "În așteptare" },
      { k: "semnat", eticheta: "Semnat" },
    ],
  },
] as const;

export const STADII_D177: readonly string[] = FAZE_D177.flatMap((f) => f.etape.map((e) => e.k));

export function stadiuD177Valid(k: unknown): k is string {
  return typeof k === "string" && STADII_D177.includes(k);
}

// Etichetele stadiilor în engleză, pe cheie (fazele: Început → Start, Contact → Contact, Contract → Contract).
export const ETICHETE_STADIU_D177_EN: Record<string, string> = {
  nou: "New",
  email: "Email sent",
  telefon: "Phone call",
  intalnire: "One-to-one meeting",
  trimis: "Sent",
  asteptare: "Pending",
  semnat: "Signed",
};
export const TITLURI_FAZA_D177_EN: Record<string, string> = { prospectare: "Start", contact: "Contact", contract: "Contract" };

export function etichetaStadiuD177(k: string | null | undefined, locale: "ro" | "en" = "ro"): string {
  if (locale === "en") return (k && ETICHETE_STADIU_D177_EN[k]) || ETICHETE_STADIU_D177_EN.nou;
  for (const f of FAZE_D177) for (const e of f.etape) if (e.k === k) return e.eticheta;
  return "Nou";
}
