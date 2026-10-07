import { cn } from "../../lib/cn";

// Fiecare culoare are cel puțin 4,5:1 cu textul alb al inițialelor (WCAG AA).
const PALETTE = ["#2563EB", "#15803d", "#b45309", "#c92a3a", "#7C3AED", "#0e7490"];

function hashColor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

const SIZE = { sm: "h-7 w-7 text-[11px]", md: "h-9 w-9 text-[13px]", lg: "h-14 w-14 text-lg" };

export function Avatar({
  name,
  size = "md",
  className,
}: {
  name: string;
  size?: keyof typeof SIZE;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white",
        SIZE[size],
        className,
      )}
      style={{ background: hashColor(name) }}
    >
      {initials(name)}
    </span>
  );
}
