"use client";

import { ErrorState } from "../components/ui/states";

// Eroare la încărcarea unei pagini din zona Donatori (listă, importuri, dubluri, parcursuri): mesaj clar și „Încearcă din nou”, în loc de ecranul generic al aplicației.
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-[1100px]">
      <ErrorState title="Nu am putut încărca pagina" description="Nu s-a schimbat nimic la donatori. Încearcă din nou; dacă se repetă, scrie-ne." retry={reset} />
    </div>
  );
}
