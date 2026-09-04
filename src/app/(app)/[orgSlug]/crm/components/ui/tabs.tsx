"use client";

import { useState } from "react";

import { cn } from "../../lib/cn";

export function Tabs({
  tabs,
  defaultTab,
  accent = "primary",
  children,
}: {
  tabs: { key: string; label: string }[];
  defaultTab?: string;
  // "red" — folosit de module care vor accentul roșu al paletei (ex. CRM
  // Companii) în loc de albastrul implicit al restului platformei.
  accent?: "primary" | "red";
  children: (active: string) => React.ReactNode;
}) {
  const [active, setActive] = useState(defaultTab ?? tabs[0]?.key);
  const accentVar = accent === "red" ? "var(--ci-red)" : "var(--ci-primary)";
  return (
    <div>
      <div className="ci-scrollbar flex gap-1 overflow-x-auto border-b border-[var(--ci-border)]">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            className={cn(
              "relative shrink-0 px-3.5 py-2.5 text-[13px] font-medium whitespace-nowrap transition-colors",
              active === t.key
                ? "text-[var(--ci-text)]"
                : "text-[var(--ci-text-muted)] hover:text-[var(--ci-text)]",
            )}
          >
            {t.label}
            {active === t.key && (
              <span className="absolute right-0 bottom-0 left-0 h-0.5 rounded-t" style={{ backgroundColor: accentVar }} />
            )}
          </button>
        ))}
      </div>
      <div className="pt-5">{children(active ?? "")}</div>
    </div>
  );
}
