import type { TendintaOrg } from "@/lib/kpi-obiective";

function lunaScurt(ym: string): string {
  return new Date(ym + "-01T12:00:00").toLocaleDateString("ro-RO", { month: "short" });
}
function fmt(n: number, bani?: boolean): string {
  if (bani) return n >= 1000 ? `${Math.round(n / 1000)}k lei` : `${Math.round(n)} lei`;
  return n.toLocaleString("ro-RO");
}

// Mini-grafic (sparkline) pe 6 luni pentru un indicator.
function Sparkline({ valori }: { valori: number[] }) {
  const W = 280;
  const H = 52;
  const pad = 6;
  const n = valori.length;
  const min = Math.min(...valori);
  const max = Math.max(...valori);
  const span = max - min || 1;
  const x = (i: number) => pad + (i / (n - 1)) * (W - 2 * pad);
  const y = (v: number) => H - pad - ((v - min) / span) * (H - 2 * pad);
  const pts = valori.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area = `${x(0).toFixed(1)},${(H - pad).toFixed(1)} ${pts} ${x(n - 1).toFixed(1)},${(H - pad).toFixed(1)}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="52" preserveAspectRatio="none" role="img">
      <polygon points={area} fill="var(--ci-primary)" opacity="0.08" />
      <polyline points={pts} fill="none" stroke="var(--ci-primary)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {valori.map((v, i) => (
        <circle
          key={i}
          cx={x(i)}
          cy={y(v)}
          r={i === n - 1 ? 3.5 : 2}
          fill={i === n - 1 ? "var(--ci-primary)" : "var(--ci-surface)"}
          stroke="var(--ci-primary)"
          strokeWidth="1.5"
        />
      ))}
    </svg>
  );
}

// Tendință pe 6 luni (organizație): un mini-grafic per indicator, cu valoarea curentă + variația.
export function Tendinta({ date }: { date: TendintaOrg }) {
  return (
    <div>
      <h2 className="ci-display text-lg font-bold text-[var(--ci-text)]">
        Tendință <span className="text-[13px] font-normal text-[var(--ci-text-muted)]">(ultimele 6 luni)</span>
      </h2>
      <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {date.serii.map((s) => {
          const acum = s.valori[s.valori.length - 1] ?? 0;
          const inainte = s.valori[s.valori.length - 2] ?? 0;
          const delta = inainte ? Math.round(((acum - inainte) / inainte) * 100) : acum > 0 ? 100 : null;
          return (
            <div key={s.cheie} className="rounded-xl border border-[var(--ci-border)] bg-[var(--ci-surface)] p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[12px] text-[var(--ci-text-muted)]">{s.label}</p>
                  <p className="ci-tabular mt-0.5 text-[19px] font-bold text-[var(--ci-text)]">{fmt(acum, s.bani)}</p>
                </div>
                {delta !== null && (
                  <span
                    className={`ci-tabular shrink-0 rounded-full px-2 py-0.5 text-[11.5px] font-semibold ${
                      delta >= 0 ? "bg-[var(--ci-green-soft)] text-[var(--ci-green)]" : "bg-[var(--ci-red-soft)] text-[var(--ci-red)]"
                    }`}
                    title="față de luna precedentă"
                  >
                    {delta >= 0 ? "▲" : "▼"} {Math.abs(delta)}%
                  </span>
                )}
              </div>
              <div className="mt-2">
                <Sparkline valori={s.valori} />
              </div>
              <div className="mt-1 flex justify-between text-[10.5px] text-[var(--ci-text-faint)]">
                {date.luni.map((m, i) => (
                  <span key={m} title={`${lunaScurt(m)}: ${fmt(s.valori[i], s.bani)}`}>
                    {lunaScurt(m)}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-[12px] text-[var(--ci-text-muted)]">
        Fiecare grafic e evoluția lunară a indicatorului. Cifra mare = luna curentă; eticheta = variația față de luna trecută. Treci cu mouse-ul peste lună ca să vezi valoarea exactă.
      </p>
    </div>
  );
}
