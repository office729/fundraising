import type { ReactNode } from "react";

// Header tip "capitol de revistă" — familia elegant-editorial (Cultură):
// linie subțire + majuscule spațiate, în loc de CardHeader boxat.
export function ChapterHeader({ eyebrow, title, action }: { eyebrow: string; title: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3 border-b border-[var(--ci-border)] pb-2">
      <div>
        <p className="text-[10px] font-semibold tracking-[0.15em] text-[var(--ci-text-faint)] uppercase">{eyebrow}</p>
        <h3 className="ci-display mt-0.5 text-[16px] font-semibold text-[var(--ci-text)]">{title}</h3>
      </div>
      {action}
    </div>
  );
}
