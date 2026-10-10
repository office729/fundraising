import type { CSSProperties, ReactNode } from "react";

import type { OrgPublica } from "@/lib/voluntari-panou-server";

// Pagina voluntarilor folosește mereu culorile Alexandrit (albastru + verde, fond rece), indiferent de organizație: unele culori de brand
// nu se vedeau bine pe alb. Numele variabilelor (--vp-*) rămân, ca să nu schimbăm și paginile de distribuire.
export const culoareOrg = () => "#154a85";

export function PanouShell({ org, children, antet }: { org: OrgPublica; children: ReactNode; antet?: ReactNode }) {
  const stil = {
    "--vp-brand": "#154a85",
    "--vp-brand-2": "#1f64ad",
    "--vp-bg": "#f6f8fb",
    "--vp-card": "#ffffff",
    "--vp-line": "#dde4ee",
    "--vp-ink": "#14213d",
    "--vp-muted": "#475569",
    "--vp-gold": "#154a85",
    "--vp-gold-bg": "#e6eef8",
    "--vp-gold-line": "#c9dcf1",
    "--vp-green": "#2f8a4a",
    "--vp-green-bg": "#e4f4e9",
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
            <span className="opacity-70">· Voluntari</span>
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
    <div className="h-2 overflow-hidden rounded-full bg-[#e6ecf4]" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: culoare }} />
    </div>
  );
}
