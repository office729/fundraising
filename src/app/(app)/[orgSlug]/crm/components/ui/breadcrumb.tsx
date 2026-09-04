import { ChevronRight } from "lucide-react";
import Link from "next/link";

export function Breadcrumb({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="breadcrumb" className="mb-1 flex items-center gap-1.5 text-[13px]">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-[var(--ci-text-faint)]" />}
          {item.href ? (
            <Link href={item.href} className="text-[var(--ci-text-muted)] hover:text-[var(--ci-text)]">
              {item.label}
            </Link>
          ) : (
            <span className="font-medium text-[var(--ci-text)]">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
