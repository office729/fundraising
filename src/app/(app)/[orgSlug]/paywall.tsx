"use client";

import { logoutAction } from "./actions";
import { PackagePicker } from "./package-picker";

export function Paywall({ orgSlug, orgName }: { orgSlug: string; orgName: string }) {
  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-line bg-panel">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <span className="font-display text-base font-semibold text-brand-blue">{orgName}</span>
          <form action={logoutAction}>
            <button type="submit" className="text-[13px] font-medium text-muted transition hover:text-brand-blue">
              Deconectare
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-14">
        <div className="mx-auto max-w-xl text-center">
          {/* Culori fixe — vezi comentariul din [orgSlug]/layout.tsx (bannerul
              de probă): --brand-amber/-soft au aceeași nuanță per domeniu,
              ceea ce ținea contrastul sub pragul WCAG AA în majoritatea
              domeniilor. */}
          <span className="inline-block rounded-full bg-amber-100 px-3.5 py-1.5 text-xs font-bold tracking-wide text-amber-900 uppercase dark:bg-amber-950 dark:text-amber-200">
            Perioada de probă s-a încheiat
          </span>
          <h1 className="font-display mt-4 text-3xl font-bold text-ink">Alege pachetul organizației tale</h1>
          <p className="mt-3 text-base leading-relaxed text-muted">
            Cele 14 zile gratuite pentru <strong>{orgName}</strong> s-au terminat. Alege un pachet ca să continui să
            folosești Alexandrit — te redirecționăm la plată, accesul se reactivează imediat după confirmare.
          </p>
          <p className="mt-2 text-sm text-muted">
            Probleme la plată? Scrie-ne direct la{" "}
            <a href="mailto:vlad.placinta@alexandrit.ro" className="font-medium text-brand-green">
              vlad.placinta@alexandrit.ro
            </a>
            .
          </p>
        </div>

        <div className="mt-10">
          <PackagePicker orgSlug={orgSlug} />
        </div>
      </main>
    </div>
  );
}
