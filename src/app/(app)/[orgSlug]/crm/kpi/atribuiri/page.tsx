import { requireOrgAccess } from "@/lib/auth/guard";

import { listeazaAtribuiriAction } from "../atribuiri-actions";
import { AtribuiriClient } from "../atribuiri-client";
import { listeazaDefinitiiAction } from "../library-actions";
import { listeazaAngajatiAction } from "../../organizatie/actions";

export default async function AtribuiriPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const access = await requireOrgAccess(orgSlug);
  const [angajatiToti, definitii] = await Promise.all([listeazaAngajatiAction(orgSlug), listeazaDefinitiiAction(orgSlug)]);
  const angajati = angajatiToti.map((a) => ({ id: a.id, nume: a.nume, prenume: a.prenume }));
  const primulAngajatId = angajati[0]?.id ?? null;
  const atribuiri = primulAngajatId ? await listeazaAtribuiriAction(orgSlug, primulAngajatId) : [];

  return (
    <AtribuiriClient
      orgSlug={orgSlug}
      angajati={angajati}
      definitii={definitii}
      initialAngajatId={primulAngajatId}
      initialAtribuiri={atribuiri}
      esteAdmin={access.role === "owner" || access.role === "admin"}
    />
  );
}
