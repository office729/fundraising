"use client";

import { Check, Trophy, X } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { ETAPE, ETAPE_PATH_KEYS, ETICHETE_REZULTAT, FAZE, etapaCurenta } from "@/lib/etape-companie";

import { Card } from "../../components/ui/card";
import { useLocale } from "../../lib/locale-context";
import { comutaEtapaBifata, seteazaRezultat } from "../actions";

const SAGEATA = 10; // px — vârful săgeții (chevron)

function formaSageata(prima: boolean): string {
  const s = SAGEATA;
  return prima
    ? `polygon(0 0, calc(100% - ${s}px) 0, 100% 50%, calc(100% - ${s}px) 100%, 0 100%)`
    : `polygon(0 0, calc(100% - ${s}px) 0, 100% 50%, calc(100% - ${s}px) 100%, 0 100%, ${s}px 50%)`;
}

// Path în stil Salesforce / HubSpot: 4 faze colorate, fiecare etapă e o săgeată bifabilă. Clic = bifează / debifează
// (se salvează imediat); etapa curentă = cea mai avansată bifată. „Sponsorizat” și „Respins” sunt rezultate separate.
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

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h2 className="text-[15px] font-bold text-[var(--ci-text)]">{locale === "ro" ? "Etapă în pipeline" : "Pipeline stage"}</h2>
          <p className="mt-0.5 text-[13px] text-[var(--ci-text-muted)]">
            {locale === "ro" ? "Etapa curentă" : "Current stage"}:{" "}
            <span className="font-semibold" style={{ color: faza?.culoare }}>{eticheta}</span> · {locale === "ro" ? `pasul ${pas} din ${ETAPE.length}` : `step ${pas} of ${ETAPE.length}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => rezultat("sponsorizat")}
            aria-pressed={sponsorizat}
            className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-semibold transition-colors ${
              sponsorizat ? "bg-[var(--ci-green)] text-white" : "border border-[var(--ci-border)] text-[var(--ci-text-muted)] hover:border-[var(--ci-green)] hover:text-[var(--ci-green)]"
            }`}
          >
            <Trophy className="h-3.5 w-3.5" /> {ETICHETE_REZULTAT.sponsorizat[locale]}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => rezultat("respins")}
            aria-pressed={respins}
            className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-semibold transition-colors ${
              respins ? "bg-[var(--ci-red)] text-white" : "border border-[var(--ci-border)] text-[var(--ci-text-muted)] hover:border-[var(--ci-red)] hover:text-[var(--ci-red)]"
            }`}
          >
            <X className="h-3.5 w-3.5" /> {ETICHETE_REZULTAT.respins[locale]}
          </button>
        </div>
      </div>

      <div className={`mt-4 grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 min-[1500px]:grid-cols-4 ${pending ? "opacity-80" : ""}`}>
        {FAZE.map((f) => (
          <div key={f.k} className="min-w-0">
            <p className="mb-1 text-[10px] font-bold tracking-wide uppercase" style={{ color: f.culoare }}>
              {locale === "ro" ? f.ro : f.en}
            </p>
            <div className="flex">
              {f.etape.map((e, i) => {
                const esteCurenta = e.k === curenta;
                const esteFacuta = !esteCurenta && bifate.has(e.k);
                const text = locale === "ro" ? e.ro : e.en;
                return (
                  <button
                    key={e.k}
                    type="button"
                    disabled={pending}
                    onClick={() => comuta(e.k)}
                    title={text}
                    aria-pressed={bifate.has(e.k)}
                    className={`flex h-9 min-w-0 flex-1 items-center justify-center gap-1 text-[12px] font-semibold transition-[filter] hover:brightness-95 ${i > 0 ? "-ml-[3px]" : ""} ${
                      esteCurenta ? "text-white" : esteFacuta ? "" : "bg-[var(--ci-surface-2)] text-[var(--ci-text-muted)]"
                    }`}
                    style={{
                      clipPath: formaSageata(i === 0),
                      paddingLeft: i === 0 ? 8 : SAGEATA + 4,
                      paddingRight: SAGEATA + 2,
                      ...(esteCurenta
                        ? { background: f.culoare }
                        : esteFacuta
                          ? { background: `color-mix(in srgb, ${f.culoare} 18%, white)`, color: f.culoare }
                          : {}),
                    }}
                  >
                    {esteCurenta && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-white" />}
                    {esteFacuta && <Check className="h-3 w-3 shrink-0" />}
                    <span className="truncate">{text}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      {eroare && <p className="mt-2 text-[13px] text-[var(--ci-red)]">{eroare}</p>}
    </Card>
  );
}
