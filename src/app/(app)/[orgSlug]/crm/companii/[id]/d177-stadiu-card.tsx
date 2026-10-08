"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { FAZE_D177, STADII_D177, etichetaStadiuD177 } from "@/lib/stadii-d177";

import { Card } from "../../components/ui/card";
import { ProgresPath, StadiiPath } from "../../components/stadii-path";
import { seteazaStadiuD177 } from "./fisa-actions";

// Stadiul contractului D177: Nou → Email trimis → Discuție telefonică → Întâlnire one to one → Trimis → În așteptare → Semnat.
// Un singur stadiu curent; cele dinainte apar ca făcute. Clic pe stadiul curent îl resetează la „Nou”.
export function D177StadiuCard({ companyId, stadiu: initial }: { companyId: string; stadiu: string }) {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [stadiu, setStadiu] = useState(initial);
  const [eroare, setEroare] = useState("");

  const idx = STADII_D177.indexOf(stadiu);
  const faza = FAZE_D177.find((f) => f.etape.some((e) => e.k === stadiu)) ?? FAZE_D177[0];

  function alege(k: string) {
    const nou = k === stadiu ? "nou" : k;
    const anterior = stadiu;
    setStadiu(nou);
    setEroare("");
    start(async () => {
      const r = await seteazaStadiuD177(orgSlug, companyId, nou);
      if (r.error) {
        setEroare(r.error);
        setStadiu(anterior);
      } else router.refresh();
    });
  }

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-[15px] font-bold text-[var(--ci-text)]">Contract D177 — stadiu</h2>
          <p className="mt-0.5 text-[12px] text-[var(--ci-text-muted)]">Redirecționarea impozitului pe profit. Alege stadiul în care ești acum.</p>
        </div>
        <p className="flex items-center gap-2 text-[13px] text-[var(--ci-text-muted)]">
          <span className="inline-flex rounded-full px-2.5 py-0.5 text-[12px] font-bold text-white" style={{ background: faza.culoare }}>
            {etichetaStadiuD177(stadiu)}
          </span>
          <span className="ci-tabular">{`pasul ${idx + 1} din ${STADII_D177.length}`}</span>
        </p>
      </div>
      <div className="mt-3">
        <ProgresPath pas={idx + 1} total={STADII_D177.length} culoare={faza.culoare} />
      </div>
      <div className="mt-4">
        <StadiiPath
          faze={FAZE_D177}
          dezactivat={pending}
          coloaneMari={3}
          onAlege={alege}
          stare={(k) => (k === stadiu ? "curenta" : STADII_D177.indexOf(k) < idx ? "facuta" : "viitoare")}
        />
      </div>
      {eroare && <p className="mt-2 text-[13px] text-[var(--ci-red)]">{eroare}</p>}
    </Card>
  );
}
