import type { ReactNode } from "react";

// Sigla organizației din popup-ul de mulțumire (sau 🎉 dacă organizația nu are sigla încărcată).
export function LogoMultumire({ logo, nume }: { logo: ReactNode | null; nume: string }) {
  return (
    <div
      className="mx-auto flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-line bg-white p-3 shadow-md"
      role="img"
      aria-label={nume}
    >
      {logo ?? <span className="text-4xl">🎉</span>}
    </div>
  );
}
