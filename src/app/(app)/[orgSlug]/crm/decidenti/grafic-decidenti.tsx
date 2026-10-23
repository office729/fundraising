"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from "recharts";

import { Card, CardHeader } from "../components/ui/card";
import type { EtapaDecidenti } from "./actions";

// Culori pe etape: de la „de aprobat” (neutru) la „a răspuns” (verde) și „închis”/„respins” (gri/roșu discret).
const CULORI: Record<string, string> = {
  de_aprobat: "#64748B",
  de_contactat: "#2563EB",
  contactat: "#7C3AED",
  raspuns: "#16A34A",
  inchis: "#94A3B8",
  respins: "#E63946",
};

// Varianta „grafic” a paginii Decidenți (vezi VARIANTE_PAGINI în lib/personalizare-org.ts): câte persoane sunt în fiecare etapă, sub liste. Primește doar numărători.
export function GraficDecidenti({ etape }: { etape: EtapaDecidenti[] }) {
  const total = etape.reduce((s, e) => s + e.n, 0);
  return (
    <Card>
      <CardHeader title="Persoane pe etape" subtitle="Câți decidenți sunt în fiecare etapă, de la propunere până la răspuns." />
      {total === 0 ? (
        <p className="py-6 text-center text-[13px] text-[var(--ci-text-muted)]">Nu există încă persoane găsite prin prospectare. Graficul apare după prima căutare.</p>
      ) : (
        <>
          <div className="h-64" role="img" aria-label={`Persoane pe etape: ${etape.map((e) => `${e.eticheta} ${e.n}`).join(", ")}.`}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={etape} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="var(--ci-border)" vertical={false} />
                <XAxis dataKey="eticheta" tick={{ fontSize: 12, fill: "var(--ci-text-muted)" }} axisLine={false} tickLine={false} interval={0} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--ci-text-muted)" }} axisLine={false} tickLine={false} width={32} />
                <RTooltip
                  formatter={(v) => [Number(v), "Persoane"]}
                  contentStyle={{ borderRadius: 8, border: "1px solid var(--ci-border)", fontSize: 12 }}
                />
                <Bar dataKey="n" name="Persoane" radius={[4, 4, 0, 0]}>
                  {etape.map((e) => (
                    <Cell key={e.cheie} fill={CULORI[e.cheie] ?? "#2563EB"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-[12px] text-[var(--ci-text-muted)]">Total: {total} persoane.</p>
        </>
      )}
    </Card>
  );
}
