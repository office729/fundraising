import type { Metadata } from "next";

import { Rezervare } from "@/components/programari/rezervare";
import { paginaPublica } from "@/lib/programari/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Programează o întâlnire — Alexandrit",
  description: "Alege ziua și ora pentru o sesiune 1 la 1 cu Vlad Plăcintă, direct din calendar.",
};

// Calendarul intern de programări (înlocuiește Calendly): programul, tipurile de întâlniri și textele se setează din Panou platformă → Programări.
export default async function ProgramarePage() {
  const { setari, tipuri } = await paginaPublica().catch(() => ({ setari: null, tipuri: [] }));
  return (
    <main className="bg-panel-2 px-[6%] py-14 sm:py-20">
      <div className="mx-auto max-w-4xl">
        <h1 className="font-display text-3xl font-bold text-ink sm:text-4xl">{setari?.titlu ?? "Programează o întâlnire"}</h1>
        {setari?.intro && <p className="mt-3 max-w-2xl text-[16px] leading-relaxed text-muted">{setari.intro}</p>}
        <Rezervare tipuri={tipuri} cereTelefon={setari?.cereTelefon ?? false} sursa="programare" className="mt-8" />
      </div>
    </main>
  );
}
