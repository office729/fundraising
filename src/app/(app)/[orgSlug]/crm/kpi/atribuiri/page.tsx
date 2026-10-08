import { requireOrgAccess } from "@/lib/auth/guard";

import { listeazaAtribuiriAction } from "../atribuiri-actions";
import { AtribuiriClient } from "../atribuiri-client";
import { listeazaDefinitiiAction } from "../library-actions";
import { listeazaAngajatiAccesibiliAction } from "../permisiuni-actions";
import { titluAbsolut } from "@/lib/page-titles";

export default async function AtribuiriPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  await requireOrgAccess(orgSlug);
  // Doar oamenii la care ai acces (tu, echipa ta; adminii — toți), fiecare cu drepturile tale pe el.
  const [angajati, definitii] = await Promise.all([listeazaAngajatiAccesibiliAction(orgSlug), listeazaDefinitiiAction(orgSlug)]);
  const primulAngajatId = angajati[0]?.id ?? null;
  const atribuiri = primulAngajatId ? await listeazaAtribuiriAction(orgSlug, primulAngajatId) : [];

  return (
    <AtribuiriClient
      orgSlug={orgSlug}
      angajati={angajati}
      definitii={definitii}
      initialAngajatId={primulAngajatId}
      initialAtribuiri={atribuiri}

    />
  );
}

export async function generateMetadata() {
  return titluAbsolut("crmKpiAtribuiri");
}
