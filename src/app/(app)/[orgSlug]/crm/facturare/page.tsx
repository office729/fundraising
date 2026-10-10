import { requireOrgAccess } from "@/lib/auth/guard";
import { titluAbsolut } from "@/lib/page-titles";

import { obtineDateFacturare } from "./actions";
import { FacturareClient } from "./facturare-client";

export const dynamic = "force-dynamic";

// Facturare: planul, metoda de plată, datele de facturare și facturile emise de Alexandrit (Oblio). Doar owner/admin.
export default async function FacturarePage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const access = await requireOrgAccess(orgSlug);
  if (access.role !== "owner" && access.role !== "admin") {
    return (
      <div className="mx-auto max-w-[900px]">
        <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">Facturare</h1>
        <p className="mt-2 text-[13px] text-[var(--ci-text-muted)]">Doar proprietarul sau administratorii organizației văd facturarea și facturile.</p>
      </div>
    );
  }
  const date = await obtineDateFacturare(orgSlug);
  return <FacturareClient orgSlug={orgSlug} date={date} />;
}

export async function generateMetadata() {
  return titluAbsolut("crmFacturare");
}
