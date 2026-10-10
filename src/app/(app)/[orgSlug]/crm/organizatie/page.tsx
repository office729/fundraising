import { requireOrgAccess } from "@/lib/auth/guard";

import { listeazaAngajatiAction, listeazaDepartamenteAction, listeazaRoluriAction } from "./actions";
import { OrganizatieClient } from "./organizatie-client";
import { titluAbsolut } from "@/lib/page-titles";

export default async function OrganizatiePage({ params, searchParams }: { params: Promise<{ orgSlug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { orgSlug } = await params;
  const { nou } = await searchParams;
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
      deschideMembruNou={nou === "membru"}
    />
  );
}

export async function generateMetadata() {
  return titluAbsolut("crmOrganizatie");
}
