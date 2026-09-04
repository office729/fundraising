"use client";

import { Clock, Filter, GitBranch, Send, Zap, type LucideIcon } from "lucide-react";
import { useState } from "react";

import { SidePanel } from "../components/ui/side-panel";
import { useLocale } from "../lib/locale-context";
import { AUTOMATIZARI_DICT } from "@/lib/i18n/dictionaries/automatizari";
import { AUTOMATIZARI, type Automatizare, type PasAutomatizare } from "../mock";

const PAS_ICON: Record<PasAutomatizare["tip"], LucideIcon> = {
  declansator: Zap,
  conditie: Filter,
  asteptare: Clock,
  actiune: Send,
  ramificatie: GitBranch,
};
const PAS_COLOR: Record<PasAutomatizare["tip"], string> = {
  declansator: "var(--ci-primary)",
  conditie: "var(--ci-amber)",
  asteptare: "var(--ci-text-faint)",
  actiune: "var(--ci-blue)",
  ramificatie: "var(--ci-green)",
};

export default function AutomatizariPage() {
  const locale = useLocale();
  const dict = AUTOMATIZARI_DICT[locale];
  const PAS_LABEL = dict.pasLabel;
  const [items, setItems] = useState(AUTOMATIZARI);
  const [selected, setSelected] = useState<Automatizare | null>(null);

  function toggle(id: string) {
    setItems((prev) => prev.map((a) => (a.id === id ? { ...a, activa: !a.activa } : a)));
    setSelected((prev) => (prev && prev.id === id ? { ...prev, activa: !prev.activa } : prev));
  }

  return (
    <div className="mx-auto max-w-[1200px] space-y-5">
      <div>
        <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">{dict.title}</h1>
        <p className="mt-0.5 text-[13px] text-[var(--ci-text-muted)]">
          {dict.subtitle(items.filter((a) => a.activa).length, items.length)}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((a) => (
          <div
            key={a.id}
            role="button"
            tabIndex={0}
            onClick={() => setSelected(a)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setSelected(a);
              }
            }}
            className="cursor-pointer rounded-xl border border-[var(--ci-border)] bg-[var(--ci-surface)] p-4 text-left shadow-[var(--ci-shadow-sm)] transition-shadow hover:shadow-[var(--ci-shadow-md)]"
          >
            <div className="mb-2 flex items-start justify-between gap-2">
              <p className="text-[13px] font-semibold text-[var(--ci-text)]">{a.nume}</p>
              <Toggle checked={a.activa} onChange={() => toggle(a.id)} />
            </div>
            <p className="text-[12px] text-[var(--ci-text-muted)]">{a.descriere}</p>
            <p className="mt-3 text-[11px] text-[var(--ci-text-faint)]">
              {dict.pasiDeclansari(a.pasi.length, a.declansariLunar)}
            </p>
          </div>
        ))}
      </div>

      <SidePanel open={!!selected} onClose={() => setSelected(null)} title={selected?.nume ?? ""} subtitle={selected?.descriere}>
        {selected && (
          <div>
            <div className="mb-5 flex items-center justify-between rounded-lg bg-[var(--ci-surface-2)] px-3.5 py-2.5">
              <span className="text-[13px] font-medium text-[var(--ci-text)]">{dict.automatizareActiva}</span>
              <Toggle checked={selected.activa} onChange={() => toggle(selected.id)} />
            </div>
            <div className="space-y-0">
              {selected.pasi.map((p, i) => {
                const Icon = PAS_ICON[p.tip];
                const isLast = i === selected.pasi.length - 1;
                return (
                  <div key={i} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white"
                        style={{ background: PAS_COLOR[p.tip] }}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      {!isLast && <span className="my-1 w-px flex-1 bg-[var(--ci-border)]" />}
                    </div>
                    <div className={isLast ? "pb-0" : "pb-5"}>
                      <p className="text-[11px] font-semibold tracking-wide text-[var(--ci-text-faint)] uppercase">
                        {PAS_LABEL[p.tip]}
                      </p>
                      <p className="mt-0.5 text-[13px] font-medium text-[var(--ci-text)]">{p.titlu}</p>
                      <p className="mt-0.5 text-[12px] text-[var(--ci-text-muted)]">{p.detaliu}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </SidePanel>
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={(e) => {
        e.stopPropagation();
        onChange();
      }}
      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${checked ? "bg-[var(--ci-green)]" : "bg-[var(--ci-border-strong)]"}`}
    >
      <span
        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-[18px]" : "translate-x-0.5"}`}
      />
    </button>
  );
}
