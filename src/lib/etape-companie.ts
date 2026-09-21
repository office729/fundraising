// Etapele din pipeline-ul unei firme (CRM Companii) — o singură sursă pentru chips, jurnal și scor.
export const ETAPE = [
  { k: "nou", ro: "Nou", en: "New" },
  { k: "pe_viitor", ro: "Pe viitor", en: "Later" },
  { k: "email", ro: "Email trimis", en: "Email sent" },
  { k: "mesaj", ro: "Mesaj trimis", en: "Message sent" },
  { k: "onepager", ro: "One pager trimis", en: "One-pager sent" },
  { k: "telefon", ro: "Discuție telefonică", en: "Phone call" },
  { k: "online", ro: "Întâlnire online", en: "Online meeting" },
  { k: "contract_trimis", ro: "Contract trimis", en: "Contract sent" },
  { k: "contract_semnat", ro: "Contract semnat", en: "Contract signed" },
  { k: "contract_asteptare", ro: "În așteptare", en: "On hold" },
  { k: "sponsorizat", ro: "Sponsorizat", en: "Sponsored" },
] as const;

export function etichetaEtapa(stage: string | null, status: string | null, locale: "ro" | "en"): string {
  if (status === "lost") return locale === "ro" ? "Respins" : "Rejected";
  const e = ETAPE.find((x) => x.k === stage);
  return e ? e[locale] : (stage ?? "—");
}
