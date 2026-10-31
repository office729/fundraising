"use client";

import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { RECLAME_UI_DICT } from "@/lib/i18n/dictionaries/reclame-ui";

import { useLocale } from "../lib/locale-context";

export type PunctGrafic = { zi: string; cheltuieli: number; donatii: number };

const zi = (iso: string) => {
  const [, l, z] = iso.split("-");
  return `${z}.${l}`;
};
const stilTooltip = { background: "var(--ci-surface)", border: "1px solid var(--ci-border)", borderRadius: 8, fontSize: 12, color: "var(--ci-text)" } as const;
const axa = { fontSize: 11, fill: "var(--ci-text-muted)" } as const;

// Cheltuieli (bare) și donații atribuite (linie), pe aceeași axă în lei, ca să nu inducă în eroare. Datele sunt gata calculate: fiecare zi din perioadă.
export function GraficReclame({ date, etichetaDonatii }: { date: PunctGrafic[]; etichetaDonatii: string }) {
  const locale = useLocale();
  const dict = RECLAME_UI_DICT[locale];
  const loc = locale === "ro" ? "ro-RO" : "en-GB";
  const lei = (v: number) => `${new Intl.NumberFormat(loc, { maximumFractionDigits: 0 }).format(v)} ${dict.moneda}`;
  return (
    <div className="h-[260px]" role="img" aria-label={dict.grafic.aria(etichetaDonatii.toLowerCase())}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={date} margin={{ top: 6, right: 8, left: -8, bottom: 0 }}>
          <CartesianGrid stroke="var(--ci-border)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="zi" tickFormatter={zi} tick={axa} tickLine={false} axisLine={false} minTickGap={24} />
          <YAxis tick={axa} tickLine={false} axisLine={false} tickFormatter={(v) => new Intl.NumberFormat(loc, { notation: "compact" }).format(Number(v))} />
          <Tooltip contentStyle={stilTooltip} labelFormatter={(l) => zi(String(l))} formatter={(v, n) => [lei(Number(v)), String(n)]} cursor={{ fill: "var(--ci-surface-2)" }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="cheltuieli" name={dict.grafic.cheltuieli} fill="var(--ci-text-faint, #94a3b8)" radius={[3, 3, 0, 0]} />
          <Line dataKey="donatii" name={etichetaDonatii} type="monotone" stroke="var(--ci-primary)" strokeWidth={2.5} dot={{ r: 2.5 }} activeDot={{ r: 4 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
