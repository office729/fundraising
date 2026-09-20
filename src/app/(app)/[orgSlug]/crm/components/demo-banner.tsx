import { Info } from "lucide-react";

// Ecranele care încă lucrează pe date demonstrative / stocate doar în browser au
// această bandă, ca un ONG să nu creadă că ce vede sau introduce aici e salvat pe server.
export function DemoBanner({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-2 rounded-[var(--ci-radius-card)] bg-[var(--ci-amber-soft)] px-3.5 py-2.5 text-[12px] text-[var(--ci-text)]">
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>{children}</span>
    </p>
  );
}
