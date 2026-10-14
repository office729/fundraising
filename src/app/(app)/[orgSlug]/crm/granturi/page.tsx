import { requireOrgAccess } from "@/lib/auth/guard";

import { obtineDateGranturi } from "./actions";
import { GranturiClient } from "./granturi-client";

export const dynamic = "force-dynamic";
// Căutarea de apeluri cu AI poate dura (căutare web); acțiunea rulează în această rută.
export const maxDuration = 120;

// Granturi: registrul cererilor de finanțare, dosarul standard al organizației și sursele unde merită căutat.
export default async function GranturiPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const access = await requireOrgAccess(orgSlug);
  const date = await obtineDateGranturi(orgSlug);
  // Datele pe care platforma le știe deja despre organizație pre-completează dosarul (se salvează abia când apeși „Salvează dosarul”).
  const prefill: Record<string, string> = {};
  if (access.orgName) prefill.denumire = access.orgName;
  if (access.orgCif) prefill.cui = access.orgCif;
  const sediu = [access.orgAdresaSediu, access.orgJudet].filter(Boolean).join(", ");
  if (sediu) prefill.sediu = sediu;
  if (access.orgIban) prefill.iban = access.orgIban;
  return <GranturiClient orgSlug={orgSlug} initial={date} prefill={prefill} esteAdmin={access.role === "owner" || access.role === "admin"} />;
}
