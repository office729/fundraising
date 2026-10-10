import { requireOrgAccess } from "@/lib/auth/guard";

import { listeazaAngajatiAction, listeazaDepartamenteAction, listeazaRoluriAction } from "./actions";
import { OrganizatieClient } from "./organizatie-client";
import { titluAbsolut } from "@/lib/page-titles";

export default async function OrganizatiePage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const access = await requireOrgAccess(orgSlug);
  const [departamente, roluri, angajati] = await Promise.all([
    listeazaDepartamenteAction(orgSlug),
    listeazaRoluriAction(orgSlug),
    listeazaAngajatiAction(orgSlug),
  ]);

  return (
    <OrganizatieClient
      initialDepartamente={departamente}
      initialRoluri={roluri}
      initialAngajati={angajati}
      esteAdmin={access.role === "owner" || access.role === "admin"}
    />
  );
}

export async function generateMetadata() {
  return titluAbsolut("crmOrganizatie");
}
