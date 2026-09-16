// Insignă circulară de impact — familia natural-ancorat (Animale/Mediu):
// cifra centrală (ex. suma totală strânsă) devine o "insignă" mare, gen
// certificare/adopție simbolică (model WWF: nu un card mic într-un grid).
export function ImpactBadge({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex items-center gap-4">
      <div className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-4 border-[var(--ci-primary-soft)] bg-[var(--ci-surface)] shadow-[var(--ci-shadow-md)]">
        <div className="absolute inset-1 rounded-full border-2 border-dashed border-[var(--ci-primary)] opacity-40" />
        <span className="ci-display ci-tabular px-1 text-center text-[15px] leading-none font-bold text-[var(--ci-primary)]">
          {value}
        </span>
      </div>
      <div>
        <p className="text-[11px] font-semibold tracking-wide text-[var(--ci-text-faint)] uppercase">Impact total</p>
        <p className="mt-0.5 text-[15px] font-medium text-[var(--ci-text)]">{label}</p>
      </div>
    </div>
  );
}
