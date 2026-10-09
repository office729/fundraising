import type { CSSProperties, ReactNode } from "react";

import type { OrgPublica } from "@/lib/voluntari-panou-server";

// Culoarea organizației, doar dacă e un hex valid (altfel roșu cald implicit). Restul paletei e fix: verde = gata, auriu = vedetă.
const HEX = /^#[0-9a-fA-F]{6}$/;
export const culoareOrg = (o: Pick<OrgPublica, "brandColor">) => (o.brandColor && HEX.test(o.brandColor) ? o.brandColor : "#be3a2f");

export function PanouShell({ org, children, antet }: { org: OrgPublica; children: ReactNode; antet?: ReactNode }) {
  const brand = culoareOrg(org);
  const stil = {
    "--vp-brand": brand,
    "--vp-brand-2": `color-mix(in oklab, ${brand} 72%, #ff9a52)`,
    "--vp-bg": "#faf7f4",
    "--vp-card": "#ffffff",
    "--vp-line": "#ece4dc",
    "--vp-ink": "#2b2420",
    "--vp-muted": "#6e625a",
    "--vp-gold": "#b7791f",
    "--vp-gold-bg": "#fff6dc",
    "--vp-gold-line": "#f2d98a",
    "--vp-green": "#15803d",
    "--vp-green-bg": "#e7f6ec",
    background: "var(--vp-bg)",
    color: "var(--vp-ink)",
    colorScheme: "light",
  } as CSSProperties;
  return (
    <div style={stil} className="min-h-screen pb-16">
      <header className="text-white" style={{ background: "linear-gradient(135deg, var(--vp-brand), var(--vp-brand-2))" }}>
        <div className="mx-auto max-w-[720px] px-4 pt-5 pb-6">
          <div className="flex items-center gap-2.5 text-[13px] font-semibold opacity-95">
            {org.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={org.logoUrl} alt="" className="size-7 rounded-md bg-white/90 object-contain p-0.5" />
            ) : null}
            <span>{org.nume}</span>
            <span className="opacity-70">· Panou voluntari</span>
          </div>
          {antet}
        </div>
      </header>
      <main className="mx-auto max-w-[720px] space-y-5 px-4 pt-5">{children}</main>
    </div>
  );
}

export function Bara({ valoare, culoare = "var(--vp-brand)" }: { valoare: number; culoare?: string }) {
  const pct = Math.round(Math.max(0, Math.min(1, valoare)) * 100);
  return (
    <div className="h-2 overflow-hidden rounded-full bg-[#efe7df]" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: culoare }} />
    </div>
  );
}
