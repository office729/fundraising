"use client";

import { ExternalLink, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { ETICHETE_PREFERINTA, type ProfilFirma } from "@/lib/profil-firma";

import { Badge } from "../../components/ui/badge";
import { Card } from "../../components/ui/card";
import { cercetaFirmaCuAI } from "./profil-ai-actions";

const TRI = { da: "da", nu: "nu", necunoscut: "necunoscut" } as const;
const TON = { da: "green", nu: "neutral", necunoscut: "neutral" } as const;

// „Pregătire apel” cu AI: de ce ar sponsoriza firma, cu ce o abordezi, cui scrii, plus ce s-a găsit pe web (cu surse). Rezultatul trebuie verificat: modelul poate greși.
export function ProfilAiCard({ orgSlug, companyId, profil, aiActiv }: { orgSlug: string; companyId: string; profil: ProfilFirma | null; aiActiv: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [eroare, setEroare] = useState<string | null>(null);

  const cerceteaza = () =>
    start(async () => {
      setEroare(null);
      const r = await cercetaFirmaCuAI(orgSlug, companyId);
      if (!r.ok) setEroare(r.eroare ?? "Cercetarea nu a reușit.");
      else router.refresh();
    });

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-bold text-[var(--ci-text)]">Pregătire apel cu AI</h2>
          <p className="mt-0.5 text-[12.5px] text-[var(--ci-text-muted)]">Cercetează firma pe web: a sponsorizat ONG-uri, ce mecanism preferă și cu ce unghi o abordezi. Verifică sursele înainte de apel.</p>
        </div>
        {aiActiv ? (
          <button type="button" onClick={cerceteaza} disabled={pending} className="inline-flex items-center gap-1.5 rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] px-3 py-1.5 text-[12.5px] font-semibold text-[var(--ci-text)] hover:bg-[var(--ci-surface-2)] disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none">
            <Search className="h-3.5 w-3.5" aria-hidden /> {pending ? "Se cercetează (până la 2 minute)…" : profil ? "Cercetează din nou" : "Cercetează firma"}
          </button>
        ) : (
          <span className="text-[12.5px] text-[var(--ci-text-muted)]">Cercetarea cu AI nu e activată pe această platformă.</span>
        )}
      </div>
      {eroare && (
        <p role="alert" className="mt-3 rounded-lg bg-[var(--ci-red-soft)] px-3 py-2 text-[13px] text-[var(--ci-red)]">
          {eroare}
        </p>
      )}
      {profil && (
        <div className="mt-4 space-y-4 text-[13px] leading-relaxed text-[var(--ci-text)]">
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ["De ce ar sponsoriza", profil.pregatireApel.deCe],
              ["Unghi de abordare", profil.pregatireApel.unghi],
              ["Cui scriem", profil.pregatireApel.cuiScriem],
            ].map(([titlu, text]) => (
              <div key={titlu} className="rounded-lg bg-[var(--ci-surface-2)] p-3">
                <p className="text-[11px] font-bold tracking-wide text-[var(--ci-primary)] uppercase">{titlu}</p>
                <p className="mt-1">{text || "—"}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={TON[profil.aSponsorizatOng]} icon={false}>
              a sponsorizat ONG-uri: {TRI[profil.aSponsorizatOng]}
            </Badge>
            <Badge tone={TON[profil.faceSponsorizari]} icon={false}>
              program de sponsorizări: {TRI[profil.faceSponsorizari]}
            </Badge>
            <Badge tone="blue" icon={false}>
              preferă: {ETICHETE_PREFERINTA[profil.preferinta]}
            </Badge>
            <Badge tone={profil.incredere === "mare" ? "green" : profil.incredere === "medie" ? "amber" : "neutral"} icon={false}>
              încredere {profil.incredere}
            </Badge>
          </div>
          {profil.rezumat && <p>{profil.rezumat}</p>}
          {profil.recomandare && (
            <p>
              <span className="font-semibold">Recomandare: </span>
              {profil.recomandare}
            </p>
          )}
          {profil.exemple.length > 0 && (
            <div>
              <p className="font-semibold">Exemple găsite</p>
              <ul className="mt-1 list-disc space-y-1 pl-5">
                {profil.exemple.map((e) => (
                  <li key={e.url}>
                    {e.ong}
                    {e.an ? ` (${e.an})` : ""}: {e.detaliu}{" "}
                    <a href={e.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-[var(--ci-primary)] hover:underline">
                      sursa <ExternalLink className="h-3 w-3" aria-hidden />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="text-[12px] text-[var(--ci-text-muted)]">
            Cercetat la {new Date(profil.la).toLocaleDateString("ro-RO")} cu AI și căutare web. Afirmațiile „da” au cel puțin o sursă; verifică-le înainte să le folosești la apel.
          </p>
        </div>
      )}
    </Card>
  );
}
