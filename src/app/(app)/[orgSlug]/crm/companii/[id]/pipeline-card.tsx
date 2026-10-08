"use client";

import { Trophy, X } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { ETAPE, ETAPE_PATH_KEYS, ETICHETE_REZULTAT, FAZE, etapaCurenta } from "@/lib/etape-companie";

import { Card } from "../../components/ui/card";
import { ProgresPath, StadiiPath, type FazaPath } from "../../components/stadii-path";
import { useLocale } from "../../lib/locale-context";
import { comutaEtapaBifata, seteazaRezultat } from "../actions";

// Etapele firmei, ca path cu faze colorate. Clic pe o etapă o bifează / debifează (se salvează imediat); etapa curentă =
// cea mai avansată bifată. „Sponsorizat” și „Respins” sunt rezultate separate de path.
export function PipelineCard({ companyId, bifate: bifateInitiale, status }: { companyId: string; bifate: string[]; status: string }) {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const router = useRouter();
  const locale = useLocale();
  const [pending, startTransition] = useTransition();
  const [eroare, setEroare] = useState("");
  const [bifate, setBifate] = useState(() => new Set(bifateInitiale));
  const [statusLocal, setStatusLocal] = useState(status);

  const curenta = etapaCurenta(bifate);
  const pas = ETAPE_PATH_KEYS.indexOf(curenta) + 1;
  const eticheta = ETAPE.find((e) => e.k === curenta)?.[locale] ?? curenta;
  const faza = FAZE.find((f) => f.etape.some((e) => e.k === curenta));
  const faze: FazaPath[] = useMemo(
    () => FAZE.map((f) => ({ k: f.k, titlu: locale === "ro" ? f.ro : f.en, culoare: f.culoare, etape: f.etape.map((e) => ({ k: e.k, eticheta: locale === "ro" ? e.ro : e.en })) })),
    [locale],
  );

  function comuta(k: string) {
    const urmator = new Set(bifate);
    if (k === "nou") urmator.clear();
    else if (urmator.has(k)) urmator.delete(k);
    else urmator.add(k);
    const anterior = bifate;
    const statusAnterior = statusLocal;
    setBifate(urmator);
    if (statusLocal === "lost") setStatusLocal("open");
    setEroare("");
    startTransition(async () => {
      const r = await comutaEtapaBifata(orgSlug, companyId, k);
      if (r.error) {
        setEroare(r.error);
        setBifate(anterior);
        setStatusLocal(statusAnterior);
      } else router.refresh();
    });
  }

  function rezultat(r: "sponsorizat" | "respins") {
    const activ = statusLocal !== (r === "sponsorizat" ? "won" : "lost");
    const statusAnterior = statusLocal;
    setStatusLocal(activ ? (r === "sponsorizat" ? "won" : "lost") : "open");
    setEroare("");
    startTransition(async () => {
      const res = await seteazaRezultat(orgSlug, companyId, r, activ);
      if (res.error) {
        setEroare(res.error);
        setStatusLocal(statusAnterior);
      } else router.refresh();
    });
  }

  const sponsorizat = statusLocal === "won";
  const respins = statusLocal === "lost";
  const btnRezultat = "flex min-h-9 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-semibold transition-colors disabled:opacity-60";

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <h2 className="text-[15px] font-bold text-[var(--ci-text)]">{locale === "ro" ? "Etapă în pipeline" : "Pipeline stage"}</h2>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-[var(--ci-text-muted)]">
            <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[12px] font-bold text-white" style={{ background: faza?.culoare }}>
              {eticheta}
            </span>
            <span className="ci-tabular">{locale === "ro" ? `pasul ${pas} din ${ETAPE.length}` : `step ${pas} of ${ETAPE.length}`}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => rezultat("sponsorizat")}
            aria-pressed={sponsorizat}
            className={`${btnRezultat} ${sponsorizat ? "border-[var(--ci-green)] bg-[var(--ci-green)] text-white shadow-sm" : "border-[var(--ci-border)] text-[var(--ci-text-muted)] hover:border-[var(--ci-green)] hover:text-[var(--ci-green)]"}`}
          >
            <Trophy className="h-3.5 w-3.5" /> {ETICHETE_REZULTAT.sponsorizat[locale]}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => rezultat("respins")}
            aria-pressed={respins}
            className={`${btnRezultat} ${respins ? "border-[var(--ci-red)] bg-[var(--ci-red)] text-white shadow-sm" : "border-[var(--ci-border)] text-[var(--ci-text-muted)] hover:border-[var(--ci-red)] hover:text-[var(--ci-red)]"}`}
          >
            <X className="h-3.5 w-3.5" /> {ETICHETE_REZULTAT.respins[locale]}
          </button>
        </div>
      </div>

      <div className="mt-3">
        <ProgresPath pas={pas} total={ETAPE.length} culoare={faza?.culoare ?? "var(--ci-primary)"} />
      </div>

      <div className="mt-4">
        <StadiiPath faze={faze} dezactivat={pending} onAlege={comuta} stare={(k) => (k === curenta ? "curenta" : bifate.has(k) ? "facuta" : "viitoare")} />
      </div>
      {eroare && <p className="mt-2 text-[13px] text-[var(--ci-red)]">{eroare}</p>}
    </Card>
  );
}
