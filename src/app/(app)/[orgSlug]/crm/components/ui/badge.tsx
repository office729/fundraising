import {
  AlertTriangle,
  CheckCircle2,
  CircleDot,
  Clock,
  XCircle,
} from "lucide-react";

import { cn } from "../../lib/cn";

export type StatusTone = "neutral" | "blue" | "green" | "amber" | "red" | "orange" | "purple" | "pink" | "indigo" | "teal";

const TONE: Record<StatusTone, string> = {
  neutral: "bg-[var(--ci-surface-2)] text-[var(--ci-text-muted)] border-[var(--ci-border)]",
  blue: "bg-[var(--ci-blue-soft)] text-[var(--ci-blue)] border-transparent",
  green: "bg-[var(--ci-green-soft)] text-[var(--ci-green)] border-transparent",
  amber: "bg-[var(--ci-amber-soft)] text-[var(--ci-amber)] border-transparent",
  red: "bg-[var(--ci-red-soft)] text-[var(--ci-red)] border-transparent",
  orange: "bg-[var(--ci-orange-soft)] text-[var(--ci-orange)] border-transparent",
  purple: "bg-[var(--ci-purple-soft)] text-[var(--ci-purple)] border-transparent",
  pink: "bg-[var(--ci-pink-soft)] text-[var(--ci-pink)] border-transparent",
  indigo: "bg-[var(--ci-indigo-soft)] text-[var(--ci-indigo)] border-transparent",
  teal: "bg-[var(--ci-teal-soft)] text-[var(--ci-teal)] border-transparent",
};

const ICON: Record<StatusTone, typeof CircleDot> = {
  neutral: CircleDot,
  blue: Clock,
  green: CheckCircle2,
  amber: AlertTriangle,
  red: XCircle,
  orange: CircleDot,
  purple: CircleDot,
  pink: CircleDot,
  indigo: CircleDot,
  teal: CircleDot,
};

export function Badge({
  tone = "neutral",
  children,
  icon = true,
  className,
}: {
  tone?: StatusTone;
  children: React.ReactNode;
  icon?: boolean;
  className?: string;
}) {
  const Icon = ICON[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[12px] font-medium",
        TONE[tone],
        className,
      )}
    >
      {icon && <Icon className="h-3 w-3" />}
      {children}
    </span>
  );
}
