"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

import { starePrelansare } from "@/lib/prelansare";

const nimic = () => () => {};

// Bară pentru administratori: până la lansare, doar ei văd site-ul real, iar publicul vede cronometrul. Dispare singură când site-ul devine public.
export function BaraPrelansare({ admin }: { admin: boolean }) {
  const inPrelansare = useSyncExternalStore(
    nimic,
    () => starePrelansare(Date.now()) !== "live",
    () => false,
  );
  if (!admin || !inPrelansare) return null;
  return (
    <div role="status" className="bg-amber-100 px-4 py-2 text-center text-[13px] text-amber-950">
      Previzualizare pentru administratori: publicul vede cronometrul până pe 26 octombrie 2026, ora 06:00.{" "}
      <Link prefetch={false} href="/prelansare" className="font-semibold underline">
        Vezi pagina de așteptare
      </Link>
    </div>
  );
}
