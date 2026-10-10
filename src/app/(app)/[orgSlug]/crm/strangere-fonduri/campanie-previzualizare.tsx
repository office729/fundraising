"use client";

import { Heart } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { SUME_RAPIDE } from "@/lib/sume-donatie";

import { parseazaSuma, type CampanieForm } from "./campanie-validare";

// Previzualizarea paginii publice a campaniei, actualizată pe măsură ce se completează formularul. Redă structura paginii reale
// (copertă, titlu, progres, caseta de donație, poveste) cu aceleași culori ale domeniului ales; nu e interactivă.
// Aspectul exact diferă ușor între domenii (aranjarea copertei), dar conținutul și ordinea sunt cele ale paginii reale.

const LATIME = { desktop: 880, mobil: 390 } as const;

export type PreviewProps = {
  vedere: "desktop" | "mobil";
  form: CampanieForm;
  orgNume: string;
  orgLogoUrl: string | null;
  pozaUrl: string | null;
  pozaPozitie: string;
};

export function PrevizualizareCampanie({ vedere, ...p }: PreviewProps) {
  const cadru = useRef<HTMLDivElement>(null);
  const continut = useRef<HTMLDivElement>(null);
  const [scara, setScara] = useState(1);
  const [inaltime, setInaltime] = useState(600);
  const baza = LATIME[vedere];

  useEffect(() => {
    const el = cadru.current;
    const inner = continut.current;
    if (!el || !inner) return;
    const masoara = () => {
      const s = Math.min(1, el.clientWidth / baza);
      setScara(s);
      setInaltime(inner.scrollHeight * s);
    };
    masoara();
    const ro = new ResizeObserver(masoara);
    ro.observe(el);
    ro.observe(inner);
    return () => ro.disconnect();
  }, [baza]);

  const telefon = vedere === "mobil";
  return (
    <div ref={cadru} className="w-full" aria-label={`Previzualizare ${telefon ? "pe telefon" : "pe calculator"}`} role="group">
      <div
        className={telefon ? "mx-auto overflow-hidden rounded-[2rem] border-[7px] border-[var(--ci-text)] bg-[var(--ci-text)] shadow-[var(--ci-shadow-lg)]" : "overflow-hidden rounded-xl border border-[var(--ci-border)] shadow-[var(--ci-shadow-md)]"}
        style={{ width: telefon ? baza * scara + 14 : undefined }}
      >
        {!telefon && (
          <div className="flex items-center gap-1.5 border-b border-[var(--ci-border)] bg-[var(--ci-surface-2)] px-3 py-2" aria-hidden="true">
            <span className="h-2 w-2 rounded-full bg-[var(--ci-border-strong)]" />
            <span className="h-2 w-2 rounded-full bg-[var(--ci-border-strong)]" />
            <span className="h-2 w-2 rounded-full bg-[var(--ci-border-strong)]" />
            <span className="ml-2 flex-1 truncate rounded-md bg-[var(--ci-surface)] px-2.5 py-0.5 text-[11px] text-[var(--ci-text-faint)]">alexandrit.ro/strangere-fonduri/…</span>
          </div>
        )}
        <div className="overflow-hidden bg-panel-2" style={{ height: inaltime }}>
          <div ref={continut} style={{ width: baza, transform: `scale(${scara})`, transformOrigin: "top left" }}>
            <PaginaCampanie telefon={telefon} {...p} />
          </div>
        </div>
      </div>
    </div>
  );
}

function PaginaCampanie({ telefon, form, orgNume, orgLogoUrl, pozaUrl, pozaPozitie }: { telefon: boolean } & Omit<PreviewProps, "vedere">) {
  const titlu = form.titlu.trim();
  const poveste = form.poveste.trim();
  const tinta = parseazaSuma(form.sumaTinta).valoare;
  const loc = [form.localitate.trim(), form.judet.trim()].filter(Boolean).join(", ");

  const casetaDonatie = (
    <div className="h-fit rounded-2xl border border-brand-green-soft bg-brand-green-soft/60 p-4">
      <p className="font-display text-sm font-bold text-ink">Sprijină campania</p>
      <p className="mt-1 text-[12.5px] leading-relaxed text-muted-2">Orice sumă contează. Donezi o dată sau lunar, în siguranță, cu cardul.</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {SUME_RAPIDE.map((s, i) => (
          <span key={s} className={`rounded-lg border px-3 py-2 text-center text-sm font-bold ${i === 1 ? "border-brand-green bg-brand-green text-white" : "border-line bg-panel text-ink"}`}>
            {s} lei
          </span>
        ))}
      </div>
      <span className="mt-3 flex items-center justify-center gap-2 rounded-lg bg-brand-green px-4 py-3 text-sm font-bold text-white">
        <Heart className="h-4 w-4" aria-hidden="true" /> Donează
      </span>
    </div>
  );

  return (
    <div data-domeniu={form.template || undefined} className="select-none bg-gradient-to-b from-brand-blue-soft/70 via-panel-2 to-panel-2 text-body" inert aria-hidden="true">
      <div className={telefon ? "px-3 py-4" : "px-10 py-10"}>
        <div className="overflow-hidden rounded-[1.25rem] border border-line bg-panel shadow-[0_20px_50px_-25px_rgba(21,74,133,0.35)]">
          <div className={telefon ? "p-3 pb-0" : "p-5 pb-0"}>
            <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl bg-gradient-to-br from-brand-blue to-brand-green">
              {pozaUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- previzualizare locală (blob:), nu o imagine din Storage
                <img src={pozaUrl} alt="" className="h-full w-full object-cover" style={{ objectPosition: pozaPozitie }} />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-white/90">
                  <Heart className="h-10 w-10" strokeWidth={1.5} />
                  <span className="text-xs font-semibold">Poza campaniei apare aici</span>
                </div>
              )}
            </div>
          </div>

          <div className={telefon ? "px-4 py-5" : "px-10 py-8"}>
            <div className="flex items-center gap-2">
              {orgLogoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- logo din Storage, domeniu dinamic
                <img src={orgLogoUrl} alt="" className="h-6 w-6 rounded-full border border-line bg-white object-contain" />
              ) : null}
              <p className="text-xs font-bold tracking-wide text-brand-green uppercase">Verificată de {orgNume}</p>
            </div>
            <h3 className={`font-display mt-1.5 leading-tight font-bold ${telefon ? "text-[22px]" : "text-[30px]"} ${titlu ? "text-ink" : "text-muted-2 italic"}`}>
              {titlu || "Titlul campaniei tale"}
            </h3>
            {loc && <p className="mt-1 text-[13px] text-muted-2">📍 {loc}</p>}

            <div className={`mt-5 flex items-center gap-4 rounded-2xl border border-line bg-panel-2 ${telefon ? "p-4" : "p-6"}`}>
              <div className="min-w-0 flex-1">
                <span className={`font-display block font-extrabold text-brand-blue ${telefon ? "text-2xl" : "text-3xl"}`}>0 lei</span>
                <span className="text-sm text-muted-2">{tinta ? `din ${tinta.toLocaleString("ro-RO")} lei · 0 donații` : "strânși până acum · 0 donații"}</span>
                {tinta && <span className="mt-2 block h-2 overflow-hidden rounded-full bg-line" />}
              </div>
            </div>

            <div className={`mt-5 grid gap-5 ${telefon ? "" : "grid-cols-[250px_minmax(0,1fr)]"}`}>
              {casetaDonatie}
              <p className={`whitespace-pre-wrap text-[15px] leading-relaxed ${poveste ? "text-body" : "text-muted-2 italic"}`}>
                {poveste || "Povestea campaniei apare aici. Spune cine are nevoie de ajutor, de ce acum și ce se va face cu banii."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
