"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { STATISTICI_CAMPANII_UI_DICT } from "@/lib/i18n/dictionaries/statistici-campanii-ui";

import { useLocale } from "../lib/locale-context";

export type PunctZi = { zi: string; vizitatori: number; donatii: number; venituri: number };

const zi = (iso: string) => {
  const [, l, z] = iso.split("-");
  return `${z}.${l}`;
};

const stilTooltip = { background: "var(--ci-surface)", border: "1px solid var(--ci-border)", borderRadius: 8, fontSize: 12, color: "var(--ci-text)" } as const;
const axa = { fontSize: 11, fill: "var(--ci-text-muted)" } as const;

// Două grafice pe zile: vizitatori unici și venituri. Datele vin gata calculate din server (fiecare zi din perioadă, inclusiv zilele fără trafic).
export function GraficeTrafic({ date }: { date: PunctZi[] }) {
  const locale = useLocale();
  const dict = STATISTICI_CAMPANII_UI_DICT[locale].grafic;
  const loc = locale === "ro" ? "ro-RO" : "en-GB";
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div>
        <p className="mb-2 text-[13px] font-medium text-[var(--ci-text)]">{dict.vizitatoriPeZi}</p>
        <div className="h-[220px]" role="img" aria-label={dict.vizitatoriAria}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={date} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="gradVizitatori" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--ci-primary)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--ci-primary)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--ci-border)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="zi" tickFormatter={zi} tick={axa} tickLine={false} axisLine={false} minTickGap={24} />
              <YAxis allowDecimals={false} tick={axa} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={stilTooltip} labelFormatter={(l) => zi(String(l))} formatter={(v) => [String(v), dict.vizitatoriTooltip]} />
              <Area type="monotone" dataKey="vizitatori" stroke="var(--ci-primary)" strokeWidth={2} fill="url(#gradVizitatori)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div>
        <p className="mb-2 text-[13px] font-medium text-[var(--ci-text)]">{dict.venituriPeZi}</p>
        <div className="h-[220px]" role="img" aria-label={dict.venituriAria}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={date} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid stroke="var(--ci-border)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="zi" tickFormatter={zi} tick={axa} tickLine={false} axisLine={false} minTickGap={24} />
              <YAxis allowDecimals={false} tick={axa} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={stilTooltip} labelFormatter={(l) => zi(String(l))} formatter={(v) => [`${Number(v).toLocaleString(loc)} ${dict.lei}`, dict.venituriTooltip]} cursor={{ fill: "var(--ci-surface-2)" }} />
              <Bar dataKey="venituri" fill="var(--ci-green, #2a7d44)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
