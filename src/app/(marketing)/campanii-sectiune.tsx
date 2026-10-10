"use client";

import { ArrowRight, Heart, Lock, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

import type { AsociatiePublica, CampaniePublica } from "@/lib/campanii-publice";
import { CAMPAIGN_TEMPLATES, type CampaignPageTemplate } from "@/lib/campaign-templates";

const eticheta = (d: string | null) => (d ? (CAMPAIGN_TEMPLATES[d as CampaignPageTemplate]?.nume ?? "Altele") : "Altele");
const lei = (n: number) => `${n.toLocaleString("ro-RO")} lei`;
const initiala = (nume: string) => nume.trim().charAt(0).toUpperCase();

export type StareCampanii = { organizatii: number; prag: number; active: boolean; asociatii: AsociatiePublica[] };

export function CampaniiSectiune({ stare }: { stare: StareCampanii }) {
  if (stare.active && stare.asociatii.length === 0) return null;
  return (
    <section id="campanii" className="px-[6%] py-16">
      <div className="mx-auto max-w-5xl text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-green-soft px-3 py-1 text-xs font-bold tracking-wide text-brand-green uppercase">
          <Heart className="h-3.5 w-3.5" aria-hidden="true" />
          Campanii de strângere de fonduri
        </span>
        <h2 className="font-display mx-auto mt-4 max-w-2xl text-[32px] leading-tight font-bold text-balance text-ink">
          {stare.active ? "Asociații pe care le poți susține chiar acum" : "Campaniile ONG‑urilor, într‑un singur loc"}
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-muted">
          {stare.active
            ? "Fiecare asociație are mai multe campanii, pentru proiecte diferite. Alegi cauza care te atinge, donezi în câteva secunde și vezi cât s-a strâns."
            : "Pe măsură ce organizațiile își deschid campaniile, le găsești aici. Secțiunea se activează după primele 20 de organizații înscrise."}
        </p>
      </div>

      {stare.active ? <ListaAsociatii asociatii={stare.asociatii} /> : <InCurand organizatii={stare.organizatii} prag={stare.prag} />}
    </section>
  );
}

// ===== Activ: filtre pe domeniu + un card pe asociație, cu mai multe campanii =====
function ListaAsociatii({ asociatii }: { asociatii: AsociatiePublica[] }) {
  const [domeniu, setDomeniu] = useState("toate");
  const domenii = useMemo(() => [...new Set(asociatii.map((a) => a.domeniu ?? "altele"))], [asociatii]);
  const vizibile = domeniu === "toate" ? asociatii : asociatii.filter((a) => (a.domeniu ?? "altele") === domeniu);

  return (
    <div className="mx-auto mt-8 max-w-5xl">
      {domenii.length > 1 && (
        <div role="tablist" aria-label="Filtrează asociațiile după domeniu" className="-mx-[6%] flex gap-2 overflow-x-auto px-[6%] pb-2 sm:mx-0 sm:flex-wrap sm:justify-center sm:overflow-visible sm:px-0">
          {["toate", ...domenii].map((d) => {
            const activ = d === domeniu;
            return (
              <button
                key={d}
                role="tab"
                aria-selected={activ}
                onClick={() => setDomeniu(d)}
                className={`shrink-0 rounded-full border px-4 py-1.5 text-[13px] font-semibold transition ${
                  activ ? "border-brand-solid bg-brand-solid text-white" : "border-line bg-panel text-muted hover:border-brand-blue hover:text-brand-blue"
                }`}
              >
                {d === "toate" ? "Toate" : eticheta(d)}
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        {vizibile.map((a) => (
          <CardAsociatie key={a.slug} a={a} />
        ))}
      </div>

      <div className="mt-8 flex flex-col items-center justify-between gap-3 rounded-2xl border border-line bg-panel-2 px-5 py-4 text-center sm:flex-row sm:text-left">
        <p className="text-[14px] text-body">
          <b className="font-bold text-ink">Ai o organizație?</b> Îți deschizi campaniile aici, cu donații online și pagină proprie de distribuit.
        </p>
        <Link href="/signup" className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-brand-green px-5 py-2.5 text-[14px] font-bold text-white transition hover:bg-brand-green-hover">
          Începe gratuit <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}

function Sigla({ nume, logoUrl, marime }: { nume: string; logoUrl: string | null; marime: number }) {
  return logoUrl ? (
    <Image src={logoUrl} alt={`Logo ${nume}`} width={marime} height={marime} unoptimized className="shrink-0 rounded-xl bg-white object-contain p-1.5" style={{ width: marime, height: marime }} />
  ) : (
    <span className="font-display flex shrink-0 items-center justify-center rounded-xl bg-white font-extrabold text-brand-solid" style={{ width: marime, height: marime, fontSize: marime * 0.45 }} aria-hidden="true">
      {initiala(nume)}
    </span>
  );
}

function CardAsociatie({ a }: { a: AsociatiePublica }) {
  const restul = a.nrCampanii - a.campanii.length;
  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-line bg-panel shadow-sm transition hover:shadow-lg">
      {/* Antet: numele ASOCIAȚIEI, nu al unui proiect */}
      <Link href={`/strangere-fonduri/${a.slug}`} className="flex items-center gap-3.5 bg-brand-solid px-5 py-4 text-white focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none focus-visible:ring-inset">
        <Sigla nume={a.nume} logoUrl={a.logoUrl} marime={60} />
        <div className="min-w-0 flex-1">
          <h3 className="font-display truncate text-[18px] leading-tight font-bold">{a.nume}</h3>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12.5px] text-white/80">
            <span className="rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-semibold text-white">{eticheta(a.domeniu)}</span>
            <span>
              {a.nrCampanii} {a.nrCampanii === 1 ? "campanie activă" : "campanii active"}
            </span>
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-display text-[17px] leading-none font-extrabold">{a.totalStrans.toLocaleString("ro-RO")}</p>
          <p className="mt-1 text-[11px] text-white/75">lei strânși</p>
        </div>
      </Link>

      {/* Campaniile asociației, pentru proiecte diferite */}
      <ul className="divide-y divide-line">
        {a.campanii.map((c) => (
          <li key={c.id}>
            <RandCampanie c={c} nume={a.nume} logoUrl={a.logoUrl} />
          </li>
        ))}
      </ul>

      <Link
        href={`/strangere-fonduri/${a.slug}`}
        className="mt-auto flex items-center justify-between gap-2 border-t border-line bg-panel-2 px-5 py-3 text-[13.5px] font-semibold text-brand-blue transition hover:bg-brand-blue-soft"
      >
        <span>{restul > 0 ? `Vezi toate cele ${a.nrCampanii} campanii` : "Vezi pagina asociației"}</span>
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </article>
  );
}

function RandCampanie({ c, nume, logoUrl }: { c: CampaniePublica; nume: string; logoUrl: string | null }) {
  const procent = c.sumaTinta && c.sumaTinta > 0 ? Math.min(100, Math.round((c.sumaStransa / c.sumaTinta) * 100)) : null;
  return (
    <Link href={c.href} className="group flex items-center gap-4 px-5 py-4 transition hover:bg-panel-2 focus-visible:bg-panel-2 focus-visible:outline-none">
      <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-line bg-white">
        {c.imagineUrl ? (
          <Image src={c.imagineUrl} alt="" fill unoptimized sizes="56px" className="object-cover" />
        ) : logoUrl ? (
          <Image src={logoUrl} alt={`Logo ${nume}`} fill unoptimized sizes="56px" className="object-contain p-1.5" />
        ) : (
          <Heart className="absolute inset-0 m-auto h-6 w-6 text-brand-blue/60" aria-hidden="true" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14.5px] font-bold text-ink">{c.titlu}</span>
        {procent != null && (
          <span className="mt-2 block h-2 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={procent} aria-valuemin={0} aria-valuemax={100} aria-label={`${procent}% din țintă`}>
            <span className="block h-full rounded-full bg-brand-green" style={{ width: `${Math.max(procent, 3)}%` }} />
          </span>
        )}
        <span className="mt-1.5 flex items-baseline justify-between gap-2 text-[12.5px]">
          <span className="font-semibold text-ink">
            {lei(c.sumaStransa)}
            {c.sumaTinta ? <span className="font-normal text-muted"> din {lei(c.sumaTinta)}</span> : <span className="font-normal text-muted"> strânși</span>}
          </span>
          {procent != null && <span className="font-bold text-brand-green">{procent}%</span>}
        </span>
      </span>
      <span className="shrink-0 rounded-md bg-brand-green px-3.5 py-2 text-[13px] font-bold text-white transition group-hover:bg-brand-green-hover">Donează</span>
    </Link>
  );
}

// ===== În curând: progres spre primele 20 de organizații =====
function InCurand({ organizatii, prag }: { organizatii: number; prag: number }) {
  const nr = Math.min(organizatii, prag);
  const ramase = Math.max(0, prag - organizatii);
  return (
    <div className="mx-auto mt-10 grid max-w-5xl items-center gap-8 overflow-hidden rounded-3xl border border-line bg-panel p-6 sm:p-8 md:grid-cols-[1.15fr_1fr]">
      <div className="text-left">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-blue-soft text-brand-blue">
          <Lock className="h-5 w-5" aria-hidden="true" />
        </span>
        <h3 className="font-display mt-4 text-[22px] leading-snug font-bold text-ink">Se deschid după primele {prag} organizații</h3>
        <p className="mt-2 text-[14.5px] leading-relaxed text-muted">
          Odată atins pragul, asociațiile apar pe prima pagină cu campaniile lor active, suma strânsă și buton de donație.
          {ramase > 0 ? ` Mai e nevoie de ${ramase} ${ramase === 1 ? "organizație" : "organizații"}.` : ""}
        </p>

        <div className="mt-5" role="progressbar" aria-valuenow={nr} aria-valuemin={0} aria-valuemax={prag} aria-label={`${nr} din ${prag} organizații înscrise`}>
          <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${prag}, minmax(0, 1fr))` }}>
            {Array.from({ length: prag }, (_, i) => (
              <span key={i} className={`h-2.5 rounded-sm ${i < nr ? "bg-brand-green" : "bg-panel-2 ring-1 ring-line ring-inset"}`} />
            ))}
          </div>
          <p className="mt-2 flex items-baseline justify-between text-[13px]">
            <span className="font-bold text-ink">
              {nr} din {prag} organizații înscrise
            </span>
            <span className="text-muted">{Math.round((nr / prag) * 100)}%</span>
          </p>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link href="/signup" className="inline-flex items-center gap-1.5 rounded-md bg-brand-green px-5 py-3 text-[14px] font-bold text-white transition hover:bg-brand-green-hover">
            Înscrie organizația ta <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <span className="inline-flex items-center gap-1.5 text-[12.5px] text-muted">
            <Sparkles className="h-3.5 w-3.5 text-brand-amber" aria-hidden="true" /> Fii printre primele {prag}
          </span>
        </div>
      </div>

      {/* Previzualizare a ceea ce urmează: card-fantomă de asociație, fără date inventate */}
      <div className="hidden md:block" aria-hidden="true">
        <div className="overflow-hidden rounded-2xl border border-line bg-panel shadow-sm">
          <div className="flex items-center gap-3 bg-brand-solid/90 px-4 py-3">
            <span className="h-10 w-10 shrink-0 rounded-full bg-white/90" />
            <div className="flex-1 space-y-2">
              <div className="h-2.5 w-2/3 rounded-full bg-white/70" />
              <div className="h-2 w-1/3 rounded-full bg-white/40" />
            </div>
          </div>
          {[62, 35, 80].map((p, i) => (
            <div key={i} className="flex items-center gap-3 border-t border-line px-4 py-3" style={{ opacity: 1 - i * 0.22 }}>
              <span className="h-10 w-10 shrink-0 rounded-lg bg-brand-blue-soft" />
              <div className="flex-1 space-y-2">
                <div className="h-2.5 w-3/4 rounded-full bg-line" />
                <div className="h-2 overflow-hidden rounded-full bg-line/60">
                  <div className="h-full rounded-full bg-brand-green/70" style={{ width: `${p}%` }} />
                </div>
              </div>
              <span className="h-7 w-14 rounded-md bg-brand-green/80" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
