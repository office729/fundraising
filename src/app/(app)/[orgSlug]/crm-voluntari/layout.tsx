import { PoartaModul } from "@/modules/crm/shared/poarta-modul";

// Modul inclus doar începând cu un anumit pachet — vezi MODULE_PACHET în lib/billing/packages.ts.
export default async function Layout({ children, params }: { children: React.ReactNode; params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  return (
    <PoartaModul orgSlug={orgSlug} modul="voluntari" inCrm={false}>
      {children}
    </PoartaModul>
  );
}
