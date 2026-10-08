"use client";

import { Check } from "lucide-react";

// Path de stadii în stil CRM (Salesforce / HubSpot), reutilizat de pipeline-ul firmei și de stadiul contractului D177:
// faze colorate, fiecare cu propriul contor, iar etapele sunt săgeți clicabile — făcută = nuanță deschisă + ✓,
// curentă = plină în culoarea fazei, viitoare = neutră. Fără scroll orizontal: 1 fază pe rând pe telefon, 2 pe
// laptop/tabletă, iar pe ecrane foarte late atâtea câte sunt (max. 4).
export type FazaPath = { k: string; titlu: string; culoare: string; etape: readonly { k: string; eticheta: string }[] };
export type StarePas = "curenta" | "facuta" | "viitoare";

const VARF = 12; // px — vârful săgeții

function forma(prima: boolean): string {
  return prima
    ? `polygon(0 0, calc(100% - ${VARF}px) 0, 100% 50%, calc(100% - ${VARF}px) 100%, 0 100%)`
    : `polygon(0 0, calc(100% - ${VARF}px) 0, 100% 50%, calc(100% - ${VARF}px) 100%, 0 100%, ${VARF}px 50%)`;
}

export function StadiiPath({
  faze,
  stare,
  onAlege,
  dezactivat,
  coloaneMari = 4,
}: {
  faze: readonly FazaPath[];
  stare: (k: string) => StarePas;
  onAlege: (k: string) => void;
  dezactivat?: boolean;
  coloaneMari?: 3 | 4;
}) {
  const coloane = coloaneMari === 3 ? "min-[1400px]:grid-cols-3" : "min-[1500px]:grid-cols-4";
  return (
    <div className={`grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2 ${coloane} ${dezactivat ? "opacity-80" : ""}`}>
      {faze.map((f) => {
        const facute = f.etape.filter((e) => stare(e.k) !== "viitoare").length;
        return (
          <div key={f.k} className="min-w-0">
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-[11px] font-bold tracking-wider uppercase" style={{ color: f.culoare }}>
                <span className="h-2 w-2 rounded-full" style={{ background: f.culoare }} />
                {f.titlu}
              </p>
              <span className="ci-tabular text-[11px] font-medium text-[var(--ci-text-faint)]">
                {facute}/{f.etape.length}
              </span>
            </div>
            <div className="flex" style={{ filter: "drop-shadow(0 1px 1px rgb(15 23 42 / 0.10))" }}>
              {f.etape.map((e, i) => {
                const s = stare(e.k);
                return (
                  <button
                    key={e.k}
                    type="button"
                    disabled={dezactivat}
                    onClick={() => onAlege(e.k)}
                    title={e.eticheta}
                    aria-pressed={s !== "viitoare"}
                    aria-current={s === "curenta" ? "step" : undefined}
                    className={`flex h-11 min-w-0 flex-1 items-center justify-center gap-1.5 text-[12.5px] transition-[filter,background-color] hover:brightness-[0.97] focus-visible:outline-none focus-visible:brightness-95 ${i > 0 ? "-ml-[3px]" : ""} ${
                      s === "curenta" ? "font-bold text-white" : s === "facuta" ? "font-semibold" : "bg-white font-medium text-[var(--ci-text-muted)]"
                    }`}
                    style={{
                      clipPath: forma(i === 0),
                      paddingLeft: i === 0 ? 12 : VARF + 6,
                      paddingRight: VARF + 4,
                      ...(s === "curenta"
                        ? { background: `linear-gradient(180deg, ${f.culoare}, color-mix(in srgb, ${f.culoare} 82%, black))` }
                        : s === "facuta"
                          ? { background: `color-mix(in srgb, ${f.culoare} 14%, white)`, color: `color-mix(in srgb, ${f.culoare} 85%, black)` }
                          : {}),
                    }}
                  >
                    {s === "curenta" && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-white shadow-[0_0_0_3px_rgb(255_255_255/0.25)]" />}
                    {s === "facuta" && <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={3} />}
                    <span className="truncate">{e.eticheta}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Bară de progres subțire (pași făcuți din total), în culoarea fazei curente.
export function ProgresPath({ pas, total, culoare }: { pas: number; total: number; culoare: string }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--ci-surface-2)]" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={pas}>
      <div className="h-full rounded-full transition-[width] duration-300" style={{ width: `${Math.round((pas / total) * 100)}%`, background: culoare }} />
    </div>
  );
}
