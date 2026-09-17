import Link from "next/link";

// Afișat în locul unui instrument când planul PERSONALIZAT al organizației nu
// îl include (vezi orgHasToolAccess, lib/billing/packages.ts) — pachetele
// fixe (trial/start/crestere/impact) includ mereu toate instrumentele, deci
// asta se vede DOAR pe planul personalizat, când instrumentul n-a fost bifat.
//
// `compact`: fără antetul + înălțimea de pagină întreagă proprii — pentru
// instrumentele randate DEJA în interiorul shell-ului CRM (cu sidebar propriu,
// vezi crm/instrumente/*/layout.tsx), unde un al doilea antet ar fi redundant.
export function ToolLocked({
  orgSlug,
  toolName,
  compact = false,
}: {
  orgSlug: string;
  toolName: string;
  compact?: boolean;
}) {
  const card = (
    <div className="max-w-md text-center">
      <span className="inline-block rounded-full bg-amber-100 px-3.5 py-1.5 text-xs font-bold tracking-wide text-amber-900 uppercase dark:bg-amber-950 dark:text-amber-200">
        Nu e inclus în planul tău
      </span>
      <h1 className="font-display mt-4 text-2xl font-bold text-ink">{toolName}</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-muted">
        Planul tău personalizat nu include acest instrument momentan. Adaugă-l din Setări ca să-l activezi.
      </p>
      <Link
        href={`/${orgSlug}/setari`}
        className="mt-5 inline-block rounded-md bg-brand-green px-6 py-3 font-bold text-white transition hover:bg-brand-green-hover"
      >
        Mergi la Setări
      </Link>
    </div>
  );

  if (compact) {
    return <div className="flex min-h-[60vh] items-center justify-center px-6">{card}</div>;
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-canvas">
      <header className="flex shrink-0 items-center gap-3 border-b border-line bg-panel px-4 py-3 sm:px-6">
        <Link href={`/${orgSlug}`} className="text-[13px] text-muted transition hover:text-ink">
          ← Instrumentele tale
        </Link>
      </header>
      <div className="flex flex-1 items-center justify-center px-6">{card}</div>
    </div>
  );
}
