"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { Card, CardHeader } from "../../components/ui/card";

export type ModelGalerie = { id: string; eticheta: string; hint: string; html: string; lat?: number; inalt?: number };

// Miniatura se încarcă abia când ajunge în ecran, ca documentele să nu se deseneze toate deodată.
function Miniatura({ html, lat, inalt }: { html: string; lat: number; inalt: number }) {
  const cutie = useRef<HTMLDivElement>(null);
  const [vizibil, setVizibil] = useState(false);
  const [scara, setScara] = useState(0.3);
  useEffect(() => {
    const el = cutie.current;
    if (!el) return;
    const masoara = () => setScara(el.clientWidth / lat);
    masoara();
    const ro = new ResizeObserver(masoara);
    ro.observe(el);
    const io = new IntersectionObserver((e) => e.some((x) => x.isIntersecting) && (setVizibil(true), io.disconnect()), { rootMargin: "200px" });
    io.observe(el);
    return () => {
      ro.disconnect();
      io.disconnect();
    };
  }, [lat]);
  return (
    <div ref={cutie} className="relative w-full overflow-hidden bg-[#ebe8e8]" style={{ aspectRatio: `${lat} / ${inalt}` }} aria-hidden>
      {vizibil && <iframe title="" tabIndex={-1} srcDoc={html} sandbox="" className="pointer-events-none absolute top-0 left-0 border-0 bg-transparent" style={{ width: lat, height: inalt + 80, transform: `scale(${scara})`, transformOrigin: "0 0" }} />}
    </div>
  );
}

// Galeria de șabloane a unui instrument: miniaturi live; un click deschide generatorul cu modelul ales (?model=…).
// „recomandate”: id-urile arătate la început; restul apar la „Vezi toate modelele”.
export function GalerieSabloane({ titlu, subtitlu, hrefGenerator, modele, lat, inalt, coloane, recomandate }: { titlu: string; subtitlu: string; hrefGenerator: string; modele: ModelGalerie[]; lat: number; inalt: number; coloane: string; recomandate?: string[] }) {
  const [toate, setToate] = useState(false);
  const esteSelectie = !!recomandate && recomandate.length > 0 && recomandate.length < modele.length;
  const vizibile = esteSelectie && !toate ? modele.filter((m) => recomandate!.includes(m.id)) : modele;
  return (
    <Card>
      <CardHeader title={titlu} subtitle={subtitlu} />
      <ul className={`grid gap-3 ${coloane}`}>
        {vizibile.map((m) => (
          <li key={m.id} className="min-w-0">
            <Link href={`${hrefGenerator}?model=${m.id}`} prefetch={false} title={m.hint} className="group block overflow-hidden rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] bg-[var(--ci-surface)] transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none">
              <Miniatura html={m.html} lat={m.lat ?? lat} inalt={m.inalt ?? inalt} />
              <div className="border-t border-[var(--ci-border)] px-3 py-2">
                <p className="truncate text-[13px] font-semibold text-[var(--ci-text)]">{m.eticheta}</p>
                <p className="line-clamp-2 text-[11.5px] leading-snug text-[var(--ci-text-muted)]">{m.hint}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
      {esteSelectie && (
        <div className="mt-4 flex justify-center">
          <button type="button" onClick={() => setToate((v) => !v)} aria-expanded={toate} className="rounded-[var(--ci-radius-btn,8px)] border border-[var(--ci-border)] px-4 py-2 text-[13px] font-medium text-[var(--ci-text)] hover:bg-black/5 focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none">
            {toate ? "Arată doar modelele recomandate" : `Vezi toate cele ${modele.length} modele`}
          </button>
        </div>
      )}
    </Card>
  );
}
