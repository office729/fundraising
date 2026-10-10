import { requireOrgAccess } from "@/lib/auth/guard";
import { titluAbsolut } from "@/lib/page-titles";

// Pagina de aici e componentă client (nu poate exporta metadata) — titlul vine
// din acest layout de server.
export async function generateMetadata() {
  return titluAbsolut("crmInstrumente");
}

const HEX = /^#[0-9a-f]{6}$/i;

// Instrumentele (rapoarte, scrisori, certificate, newsletter…) se personalizează după organizație: accentul urmează culoarea de
// brand, iar fără ea nuanța domeniului de activitate. În restul panoului accentul e mereu cel Alexandrit (vezi crm/shell.tsx).
export default async function Layout({ children, params }: { children: React.ReactNode; params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const access = await requireOrgAccess(orgSlug);
  const brand = access.orgBrandColor && HEX.test(access.orgBrandColor) ? access.orgBrandColor : null;
  return (
    <div
      className="contents"
      data-culoare-domeniu={access.orgDomeniuActivitate ?? undefined}
      style={
        brand
          ? ({
              "--ci-primary": brand,
              "--ci-primary-hover": `color-mix(in srgb, ${brand} 80%, black)`,
              "--ci-primary-soft": `color-mix(in srgb, ${brand} 10%, white)`,
            } as React.CSSProperties)
          : undefined
      }
    >
      {children}
    </div>
  );
}
