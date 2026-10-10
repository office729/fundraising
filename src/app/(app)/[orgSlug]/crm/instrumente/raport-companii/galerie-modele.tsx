"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { dateImpactExemplu, MODELE_IMPACT, type ModelImpact } from "@/lib/raport-impact";
import { randeazaRaportImpact } from "@/lib/raport-impact-modele";

import { Card, CardHeader } from "../../components/ui/card";

// Lățimea la care se desenează modelul înainte de micșorare (certificatul și prezentarea sunt pe orizontală).
const LATIME: Partial<Record<ModelImpact, number>> = { prezentare: 1040, analitic: 940, "o-pagina": 900 };

// Miniatura se încarcă abia când ajunge în ecran, ca 15 documente să nu se deseneze deodată.
function Miniatura({ html, latime }: { html: string; latime: number }) {
  const cutie = useRef<HTMLDivElement>(null);
  const [vizibil, setVizibil] = useState(false);
  const [scara, setScara] = useState(0.3);
  useEffect(() => {
    const el = cutie.current;
    if (!el) return;
    const masoara = () => setScara(el.clientWidth / latime);
    masoara();
    const ro = new ResizeObserver(masoara);
    ro.observe(el);
    const io = new IntersectionObserver((e) => e.some((x) => x.isIntersecting) && (setVizibil(true), io.disconnect()), { rootMargin: "200px" });
    io.observe(el);
    return () => {
      ro.disconnect();
      io.disconnect();
    };
  }, [latime]);
  return (
    <div ref={cutie} className="relative aspect-[4/5] w-full overflow-hidden bg-[#ece9e9]" aria-hidden>
      {vizibil && (
        <iframe
          title=""
          tabIndex={-1}
          srcDoc={html}
          sandbox=""
          className="pointer-events-none absolute top-0 left-0 border-0 bg-transparent"
          style={{ width: latime, height: 1500, transform: `scale(${scara})`, transformOrigin: "0 0" }}
        />
      )}
    </div>
  );
}

export function GalerieModele({ orgSlug, organizatie, logoOng, culoare, azi }: { orgSlug: string; organizatie: string; logoOng: string; culoare: string | null; azi: string }) {
  const exemplu = useMemo(() => ({ ...dateImpactExemplu(culoare ?? undefined), logoOng }), [culoare, logoOng]);
  const html = useMemo(() => Object.fromEntries(MODELE_IMPACT.map((m) => [m.id, randeazaRaportImpact(exemplu, { organizatie, azi }, m.id)])), [exemplu, organizatie, azi]);
  return (
    <Card>
      <CardHeader title="Raport de impact: alege un model" subtitle={`${MODELE_IMPACT.length} modele, cu date de exemplu. Apasă pe unul ca să-l completezi pentru o firmă.`} />
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {MODELE_IMPACT.map((m) => (
          <li key={m.id} className="min-w-0">
            <Link
              href={`/${orgSlug}/crm/instrumente/raport-companii/impact?model=${m.id}`}
              prefetch={false}
              title={m.hint}
              className="group block overflow-hidden rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] bg-[var(--ci-surface)] transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none"
            >
              <Miniatura html={html[m.id]} latime={LATIME[m.id] ?? 860} />
              <div className="border-t border-[var(--ci-border)] px-3 py-2">
                <p className="truncate text-[13px] font-semibold text-[var(--ci-text)]">{m.eticheta}</p>
                <p className="line-clamp-2 text-[11.5px] leading-snug text-[var(--ci-text-muted)]">{m.hint}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
