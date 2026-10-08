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
      {/* Semantică de tab-uri (cititoare de ecran) + săgeți stânga/dreapta pentru navigare de la tastatură. */}
      <div
        role="tablist"
        className="ci-scrollbar flex gap-1 overflow-x-auto border-b border-[var(--ci-border)]"
        onKeyDown={(e) => {
          if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
          const i = tabs.findIndex((x) => x.key === active);
          const urm = tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
          if (!urm) return;
          setActive(urm.key);
          e.currentTarget.querySelector<HTMLElement>(`[data-tab="${urm.key}"]`)?.focus();
        }}
      >
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            data-tab={t.key}
            aria-selected={active === t.key}
            tabIndex={active === t.key ? 0 : -1}
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
      <div role="tabpanel" className="pt-5">{children(active ?? "")}</div>
    </div>
  );
}
