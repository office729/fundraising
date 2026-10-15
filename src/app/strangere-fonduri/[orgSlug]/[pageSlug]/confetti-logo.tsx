import type { ReactNode } from "react";

// Ilustrația din popup-ul de mulțumire: confetti în jurul siglei organizației (sau o inimă dacă organizația nu are sigla încărcată).
// Doar markup + CSS, fără JavaScript: confetti-ul „apare” scurt la deschidere și stă nemișcat dacă utilizatorul preferă mișcare redusă.
const BUCATI: Array<{ x: number; y: number; r: number; forma: "p" | "c" | "t"; culoare: string }> = [
  { x: 10, y: 22, r: 20, forma: "p", culoare: "text-brand-green" },
  { x: 26, y: 8, r: -30, forma: "c", culoare: "text-amber-400" },
  { x: 48, y: 4, r: 15, forma: "t", culoare: "text-pink-400" },
  { x: 72, y: 10, r: -10, forma: "p", culoare: "text-brand-blue" },
  { x: 92, y: 20, r: 35, forma: "c", culoare: "text-brand-green" },
  { x: 104, y: 40, r: -25, forma: "t", culoare: "text-amber-400" },
  { x: 100, y: 68, r: 10, forma: "p", culoare: "text-pink-400" },
  { x: 90, y: 92, r: -40, forma: "c", culoare: "text-brand-blue" },
  { x: 66, y: 104, r: 20, forma: "t", culoare: "text-brand-green" },
  { x: 42, y: 102, r: -15, forma: "p", culoare: "text-amber-400" },
  { x: 18, y: 92, r: 30, forma: "c", culoare: "text-pink-400" },
  { x: 6, y: 66, r: -35, forma: "t", culoare: "text-brand-blue" },
  { x: 4, y: 44, r: 25, forma: "c", culoare: "text-amber-400" },
  { x: 34, y: 20, r: 45, forma: "t", culoare: "text-brand-blue" },
  { x: 80, y: 28, r: -20, forma: "c", culoare: "text-pink-400" },
  { x: 24, y: 80, r: 10, forma: "p", culoare: "text-brand-green" },
  { x: 86, y: 80, r: -30, forma: "p", culoare: "text-amber-400" },
];

export function ConfettiLogo({ logo, nume }: { logo: ReactNode | null; nume: string }) {
  return (
    <div className="relative mx-auto h-28 w-28" role="img" aria-label={nume}>
      <svg viewBox="0 0 112 112" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
        {BUCATI.map((b, i) => (
          <g key={i} transform={`translate(${b.x} ${b.y}) rotate(${b.r})`} className={`${b.culoare} confetti-bucata`} style={{ animationDelay: `${(i % 6) * 60}ms` }}>
            {b.forma === "p" && <rect x={-4} y={-2} width={8} height={4} rx={1} fill="currentColor" />}
            {b.forma === "c" && <circle r={2.8} fill="currentColor" />}
            {b.forma === "t" && <path d="M0 -4 L4 3 L-4 3 Z" fill="currentColor" />}
          </g>
        ))}
      </svg>
      <div className="absolute inset-0 m-auto flex h-[72px] w-[72px] items-center justify-center overflow-hidden rounded-full border-2 border-white bg-white p-2 shadow-lg ring-2 ring-brand-green-soft">
        {logo ?? <span className="text-3xl">🎉</span>}
      </div>
      <style>{`.confetti-bucata{transform-box:fill-box;transform-origin:center;animation:confetti-apare .55s ease-out both}@keyframes confetti-apare{from{opacity:0;scale:.2}to{opacity:1;scale:1}}@media (prefers-reduced-motion:reduce){.confetti-bucata{animation:none}}`}</style>
    </div>
  );
}
