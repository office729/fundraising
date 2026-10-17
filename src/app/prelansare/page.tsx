import type { Metadata } from "next";

import { Cronometru } from "./cronometru";
import { FundalMeniu } from "./fundal-meniu";

// Ecranul de așteptare de pe prima pagină până la lansare (vezi lib/prelansare.ts și lib/supabase/session.ts). Publicul îl vede în locul paginii „/”;
// administratorii platformei văd site-ul real și pot deschide oricând și această adresă, ca previzualizare.
export const metadata: Metadata = {
  title: "Alexandrit se lansează pe 26 octombrie 2026",
  description: "Platforma pentru fundraising a ONG-urilor se deschide pe 26 octombrie 2026.",
  robots: { index: false, follow: false },
};

export default function PrelansarePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#08213b]">
      <FundalMeniu />
      <Cronometru oprit={process.env.PRELANSARE_OPRITA === "1"} />
    </main>
  );
}
