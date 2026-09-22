"use client";

import { CheckCircle2, RefreshCw, ShieldAlert, ShieldCheck } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "../../components/ui/button";
import { formatDataOra } from "../../lib/format";
import { verificaAnaf } from "../actions";

// Buton „Verifică ANAF" din tabul Financiar — cere datele reale (stare
// fiscală + ultimul bilanț) de la ANAF și le scrie pe firmă (vezi
// companii/actions.ts → verificaAnaf). Scorul de „Mărime & profitabilitate"
// de pe fișă se actualizează singur, fără nimic altceva de schimbat.
export function VerificaAnafButton({
  companyId,
  cui,
  anafActiv,
  anafVerificatLa,
}: {
  companyId: string;
  cui: string | null;
  anafActiv: boolean | null;
  anafVerificatLa: string | null;
}) {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const router = useRouter();
  const [seVerifica, setSeVerifica] = useState(false);
  const [eroare, setEroare] = useState("");

  async function verifica() {
    setSeVerifica(true);
    setEroare("");
    const r = await verificaAnaf(orgSlug, companyId);
    setSeVerifica(false);
    if (r.error) {
      setEroare(r.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] bg-[var(--ci-surface-2)] px-3.5 py-3">
      <Button variant="secondary" size="sm" onClick={verifica} loading={seVerifica} disabled={!cui}>
        <RefreshCw className="h-3.5 w-3.5" /> Verifică ANAF
      </Button>
      {!cui && <span className="text-[12px] text-[var(--ci-text-faint)]">Completează CUI-ul în tabul Editare ca să poți verifica.</span>}
      {anafVerificatLa && (
        <span className="flex items-center gap-1.5 text-[12px] text-[var(--ci-text-muted)]">
          {anafActiv ? (
            <ShieldCheck className="h-3.5 w-3.5 text-[var(--ci-green)]" />
          ) : (
            <ShieldAlert className="h-3.5 w-3.5 text-[var(--ci-red)]" />
          )}
          {anafActiv ? "Activă la ANAF" : "Inactivă fiscal la ANAF — verifică înainte să o abordezi"} · verificat {formatDataOra(anafVerificatLa)}
        </span>
      )}
      {!eroare && !anafVerificatLa && cui && (
        <span className="flex items-center gap-1.5 text-[12px] text-[var(--ci-text-faint)]">
          <CheckCircle2 className="h-3.5 w-3.5" /> Aduce date reale (CA, profit, angajați) direct din bilanțul depus la ANAF
        </span>
      )}
      {eroare && <span className="text-[12px] text-[var(--ci-red)]">{eroare}</span>}
    </div>
  );
}
