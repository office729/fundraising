import { aziRo, trimestruDin } from "@/lib/performanta-masurare";

// Perioada afișată în Echipă & Performanță: un trimestru (ex. 2026-T3) sau un an întreg (an-2026). Pură, importabilă și din browser.

export type Perioada = { cod: string; start: string; end: string; eticheta: string; tip: "trimestru" | "an" };

const p2 = (n: number) => String(n).padStart(2, "0");

export function rezolvaPerioada(cod: string | undefined | null, azi: string = aziRo()): Perioada {
  const t = /^(\d{4})-T([1-4])$/.exec(cod ?? "");
  if (t) {
    const q = trimestruDin(`${t[1]}-${p2(Number(t[2]) * 3 - 2)}-01`, 0);
    return { ...q, tip: "trimestru" };
  }
  const a = /^an-(\d{4})$/.exec(cod ?? "");
  if (a) return { cod: `an-${a[1]}`, start: `${a[1]}-01-01`, end: `${a[1]}-12-31`, eticheta: `Anul ${a[1]}`, tip: "an" };
  return { ...trimestruDin(azi, 0), tip: "trimestru" };
}

// Perioada vecină (decalaj -1 = anterioară, +1 = următoare), de același tip.
export function perioadaVecina(p: Perioada, decalaj: number): Perioada {
  if (p.tip === "an") {
    const an = Number(p.cod.slice(3)) + decalaj;
    return rezolvaPerioada(`an-${an}`);
  }
  return { ...trimestruDin(p.start, decalaj), tip: "trimestru" };
}

export const codPerioadaCurenta = (azi: string = aziRo()) => trimestruDin(azi, 0).cod;
