import { cn } from "../../lib/cn";

export function ProgressBar({
  value,
  tone = "primary",
  className,
}: {
  value: number;
  tone?: "primary" | "green" | "blue";
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, value));
  const color =
    tone === "green" ? "var(--ci-green)" : tone === "blue" ? "var(--ci-blue)" : "var(--ci-primary)";
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-[var(--ci-surface-2)]", className)}>
      <div
        className="h-full rounded-full transition-[width]"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  );
}
