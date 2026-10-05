import Link from "next/link";
import { redirect } from "next/navigation";

import { requireOrgAccess } from "@/lib/auth/guard";

import { GdprClient } from "./gdpr-client";

export default async function GdprPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const access = await requireOrgAccess(orgSlug);
  if (access.role !== "owner" && access.role !== "admin") {
    redirect(`/${orgSlug}`);
  }

  return (
    <div className="mx-auto max-w-xl">
      <Link prefetch={false} href={`/${orgSlug}/setari`} className="text-sm text-muted hover:text-brand-blue">
        ← Setări
      </Link>
      <h1 className="font-display mt-2 text-2xl font-bold text-ink">Cereri GDPR ale persoanelor</h1>
      <p className="mt-1 text-sm leading-relaxed text-muted">
        Caută după email o persoană care cere acces la date sau ștergerea lor (art. 15 și 17 GDPR): persoane de contact la companii,
        voluntari, creatori de pagini de campanie, expeditori de mesaje și contacte media. Pentru donatori folosește panoul din
        profilul donatorului.
      </p>
      <GdprClient orgSlug={orgSlug} />
    </div>
  );
}

export async function generateMetadata() {
  return { title: "Cereri GDPR" };
}
