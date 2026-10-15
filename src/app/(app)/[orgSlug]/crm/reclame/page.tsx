import { requireOrgAccess } from "@/lib/auth/guard";

import { obtineDateReclame } from "./actions";
import { ReclameVedere } from "./vedere";

export const dynamic = "force-dynamic";

// Performanța reclamelor: cheltuieli, donații confirmate atribuite reclamelor și eficiența lor. Doar owner/admin (conține cheltuieli și sume).
export default async function ReclamePage({ params, searchParams }: { params: Promise<{ orgSlug: string }>; searchParams: Promise<{ preset?: string; de?: string; pana?: string; fer?: string }> }) {
  const { orgSlug } = await params;
  const sp = await searchParams;
  const access = await requireOrgAccess(orgSlug);
  if (access.role !== "owner" && access.role !== "admin") {
    return (
      <div className="mx-auto max-w-[900px]">
        <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">Performanța reclamelor</h1>
        <p className="mt-2 text-[13px] text-[var(--ci-text-muted)]">Doar proprietarul sau administratorii organizației văd cheltuielile pentru reclame și donațiile atribuite lor.</p>
      </div>
    );
  }
  const date = await obtineDateReclame(orgSlug, { preset: sp.preset, de: sp.de, pana: sp.pana, fer: sp.fer });
  return <ReclameVedere orgSlug={orgSlug} date={date} />;
}
