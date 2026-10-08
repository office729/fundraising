import { requireOrgAccess } from "@/lib/auth/guard";

import { SetariContinut } from "../../setari/setari-continut";
import { RoluriIntegrari } from "./roluri-integrari";

// Toate setările într-un singur loc: cele ale organizației (logo, adresă, abonament, plăți donații, acorduri, date) pentru
// owner/admin, urmate de rolurile din CRM și integrările viitoare (vizibile tuturor membrilor).
export default async function CrmSetariPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ canva?: string }>;
}) {
  const { orgSlug } = await params;
  const { canva } = await searchParams;
  const access = await requireOrgAccess(orgSlug);
  const esteAdmin = access.role === "owner" || access.role === "admin";

  return (
    <div className="mx-auto max-w-[960px] space-y-8">
      {esteAdmin && <SetariContinut orgSlug={orgSlug} canva={canva} />}
      <RoluriIntegrari arataTitlu={!esteAdmin} />
    </div>
  );
}
