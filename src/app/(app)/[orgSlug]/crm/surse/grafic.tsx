"use client";

import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export type PunctGrafic = { zi: string; vizitatori: number; donatii: number; formulare: number };

const zi = (iso: string) => {
  const [, l, z] = iso.split("-");
  return `${z}.${l}`;
};
const stilTooltip = { background: "var(--ci-surface)", border: "1px solid var(--ci-border)", borderRadius: 8, fontSize: 12, color: "var(--ci-text)" } as const;
const axa = { fontSize: 11, fill: "var(--ci-text-muted)" } as const;

// Evoluția în timp: vizitatorii (linie) și rezultatele (bare): donații confirmate și formulare 230 trimise. Fiecare zi din perioadă apare, inclusiv cele fără trafic.
export function GraficEvolutie({ date }: { date: PunctGrafic[] }) {
  return (
    <div className="h-[260px]" role="img" aria-label="Grafic cu vizitatorii, donațiile confirmate și formularele 230 trimise, pe zile">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={date} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid stroke="var(--ci-border)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="zi" tickFormatter={zi} tick={axa} tickLine={false} axisLine={false} minTickGap={24} />
          <YAxis allowDecimals={false} tick={axa} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={stilTooltip} labelFormatter={(l) => zi(String(l))} cursor={{ fill: "var(--ci-surface-2)" }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="donatii" name="Donații confirmate" fill="var(--ci-green, #2a7d44)" radius={[3, 3, 0, 0]} />
          <Bar dataKey="formulare" name="Formulare 230 trimise" fill="var(--ci-orange, #ea580c)" radius={[3, 3, 0, 0]} />
          <Line type="monotone" dataKey="vizitatori" name="Vizitatori" stroke="var(--ci-primary)" strokeWidth={2} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
