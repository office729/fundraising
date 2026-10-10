"use client";

import { ArrowRight, Baby, FileText, GraduationCap, Heart, HeartHandshake, LayoutTemplate, Leaf, MapPin, Palette, PawPrint, Search, ShieldCheck, Sparkles, Stethoscope, Trophy, Wallet, type LucideIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

import type { AsociatiePublica, CampanieInFocus, CampaniePublica } from "@/lib/campanii-publice";
import { PACKAGE_LIMITS } from "@/lib/billing/packages";
import { TRIAL_DAYS } from "@/lib/billing/trial";
import { CAMPAIGN_TEMPLATES, type CampaignPageTemplate } from "@/lib/campaign-templates";

// Fiecare domeniu: pictogramă + degrade bogat, folosite când campania nu are poză proprie (coperta arată „ilustrată”, nu goală).
const DOMENII: Record<string, { icon: LucideIcon; de: string; la: string }> = {
  copii: { icon: Baby, de: "#f59e0b", la: "#ea580c" },
  animale: { icon: PawPrint, de: "#84a63a", la: "#4d7c0f" },
  mediu: { icon: Leaf, de: "#10b981", la: "#0f766e" },
  educatie: { icon: GraduationCap, de: "#6366f1", la: "#2563eb" },
  sanatate: { icon: Stethoscope, de: "#ef4444", la: "#be123c" },
  social_incluziune: { icon: HeartHandshake, de: "#a855f7", la: "#6d28d9" },
  cultura: { icon: Palette, de: "#f59e0b", la: "#b45309" },
  sport: { icon: Trophy, de: "#06b6d4", la: "#0e7490" },
  altele: { icon: Heart, de: "#64748b", la: "#334155" },
};
const dom = (d: string | null) => DOMENII[d ?? "altele"] ?? DOMENII.altele;
const eticheta = (d: string | null) => (d ? (CAMPAIGN_TEMPLATES[d as CampaignPageTemplate]?.nume ?? "Altele") : "Altele");
const lei = (n: number) => `${n.toLocaleString("ro-RO")} lei`;
const initiala = (nume: string) => nume.trim().charAt(0).toUpperCase();
const fara = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const procentDin = (s: number, t: number | null) => (t && t > 0 ? Math.min(100, Math.round((s / t) * 100)) : null);

export type StareCampanii = {
  organizatii: number;
  prag: number;
  active: boolean;
  asociatii: AsociatiePublica[];
  inFocus: CampanieInFocus | null;
  statistici: { asociatii: number; campanii: number; strans: number };
};

export function CampaniiSectiune({ stare }: { stare: StareCampanii }) {
  if (stare.active && stare.asociatii.length === 0) return null;
  return stare.active ? <Activ stare={stare} /> : <InCurand />;
}

// ===== Copertă: poza, sau ilustrația domeniului =====
function Coperta({ imagineUrl, domeniu, className = "", mare = false }: { imagineUrl: string | null; domeniu: string | null; className?: string; mare?: boolean }) {
  const d = dom(domeniu);
  const Icon = d.icon;
  return (
    <div className={`overflow-hidden ${className}`} style={{ background: `linear-gradient(135deg, ${d.de}, ${d.la})` }}>
      {imagineUrl ? (
        <Image src={imagineUrl} alt="" fill unoptimized sizes="(min-width: 1024px) 400px, 100vw" className="object-cover" />
      ) : (
        <>
          <span className="absolute -top-10 -right-10 h-44 w-44 rounded-full bg-white/10" aria-hidden="true" />
          <span className="absolute -bottom-14 left-8 h-40 w-40 rounded-full bg-black/10" aria-hidden="true" />
          <Icon className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white/85 ${mare ? "h-24 w-24" : "h-14 w-14"}`} strokeWidth={1.4} aria-hidden="true" />
        </>
      )}
    </div>
  );
}

function Sigla({ nume, logoUrl, marime, className = "" }: { nume: string; logoUrl: string | null; marime: number; className?: string }) {
  const baza = `shrink-0 rounded-xl bg-white ${className}`;
  return logoUrl ? (
    <Image src={logoUrl} alt={`Logo ${nume}`} width={marime} height={marime} unoptimized className={`${baza} object-contain p-1.5`} style={{ width: marime, height: marime }} />
  ) : (
    <span className={`font-display flex items-center justify-center font-extrabold text-brand-solid ${baza}`} style={{ width: marime, height: marime, fontSize: marime * 0.42 }} aria-hidden="true">
      {initiala(nume)}
    </span>
  );
}

function Progres({ procent, inalt = false }: { procent: number; inalt?: boolean }) {
  return (
    <span className={`block overflow-hidden rounded-full bg-line ${inalt ? "h-2.5" : "h-1.5"}`} role="progressbar" aria-valuenow={procent} aria-valuemin={0} aria-valuemax={100} aria-label={`${procent}% din țintă`}>
      <span className="block h-full rounded-full bg-brand-green" style={{ width: `${Math.max(procent, 3)}%` }} />
    </span>
  );
}

// ===== Activ =====
function Activ({ stare }: { stare: StareCampanii }) {
  const [domeniu, setDomeniu] = useState("toate");
  const [cauta, setCauta] = useState("");
  const [toate, setToate] = useState(false);

  const domenii = useMemo(() => [...new Set(stare.asociatii.map((a) => a.domeniu ?? "altele"))], [stare.asociatii]);
  const q = fara(cauta.trim());
  const filtrate = useMemo(
    () =>
      stare.asociatii.filter((a) => {
        if (domeniu !== "toate" && (a.domeniu ?? "altele") !== domeniu) return false;
        if (!q) return true;
        return fara(a.nume).includes(q) || a.campanii.some((c) => fara(c.titlu).includes(q));
      }),
    [stare.asociatii, domeniu, q],
  );
  const vizibile = toate || q || domeniu !== "toate" ? filtrate : filtrate.slice(0, 6);
  const filtrat = q !== "" || domeniu !== "toate";
  const { statistici: st } = stare;

  return (
    <section id="campanii" className="bg-panel-2 px-[6%] py-16 sm:py-20">
      <div className="mx-auto max-w-6xl">
        {/* Antet: titlu + cifre */}
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-1.5 text-[12px] font-bold tracking-[0.12em] text-brand-green uppercase">
              <Heart className="h-3.5 w-3.5" aria-hidden="true" /> Donează online
            </span>
            <h2 className="font-display mt-3 text-[26px] leading-[1.15] font-bold text-balance text-ink sm:text-[32px]">Descoperă campanii și susține o cauză</h2>
            <p className="mt-3 text-[15.5px] leading-relaxed text-muted">Asociații din toată țara, cu mai multe campanii pentru proiecte diferite. Donezi în câteva secunde și vezi exact cât s-a strâns.</p>
          </div>
          <dl className="grid shrink-0 grid-cols-3 divide-x divide-line rounded-2xl border border-line bg-panel shadow-sm">
            {[
              { n: st.asociatii.toLocaleString("ro-RO"), l: st.asociatii === 1 ? "asociație" : "asociații" },
              { n: st.campanii.toLocaleString("ro-RO"), l: st.campanii === 1 ? "campanie activă" : "campanii active" },
              { n: lei(st.strans), l: "strânși" },
            ].map((x) => (
              <div key={x.l} className="px-4 py-3.5 text-center sm:px-6">
                <dt className="sr-only">{x.l}</dt>
                <dd>
                  <span className="font-display block text-[20px] leading-none font-extrabold text-ink sm:text-[24px]">{x.n}</span>
                  <span className="mt-1.5 block text-[11.5px] text-muted sm:text-xs">{x.l}</span>
                </dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Căutare + domenii */}
        <div className="mt-9 flex flex-col gap-3 lg:flex-row lg:items-center">
          <label className="relative block lg:w-72 lg:shrink-0">
            <span className="sr-only">Caută o asociație sau o campanie</span>
            <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted-2" aria-hidden="true" />
            <input
              type="search"
              value={cauta}
              onChange={(e) => setCauta(e.target.value)}
              placeholder="Caută asociație sau campanie"
              className="w-full rounded-full border border-line bg-panel py-2.5 pr-4 pl-10 text-[14px] text-ink placeholder:text-muted-2 focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 focus:outline-none"
            />
          </label>
          {domenii.length > 1 && (
            <div role="tablist" aria-label="Filtrează după domeniu" className="-mx-[6%] flex gap-2 overflow-x-auto px-[6%] pb-1 lg:mx-0 lg:px-0">
              {["toate", ...domenii].map((d) => {
                const activ = d === domeniu;
                const Icon = d === "toate" ? Sparkles : dom(d).icon;
                return (
                  <button
                    key={d}
                    role="tab"
                    aria-selected={activ}
                    onClick={() => setDomeniu(d)}
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-[13px] font-semibold transition ${
                      activ ? "border-brand-solid bg-brand-solid text-white shadow-sm" : "border-line bg-panel text-body hover:border-brand-blue hover:text-brand-blue"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    {d === "toate" ? "Toate" : eticheta(d)}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Campania în focus */}
        {stare.inFocus && !filtrat && <InFocus f={stare.inFocus} />}

        {/* Asociații */}
        <div className="mt-12 flex items-baseline justify-between gap-3">
          <h3 className="font-display text-[22px] font-bold text-ink">{filtrat ? "Rezultate" : "Asociații cu campanii active"}</h3>
          <span className="text-[13px] text-muted">
            {filtrate.length} {filtrate.length === 1 ? "asociație" : "asociații"}
          </span>
        </div>
        {vizibile.length === 0 ? (
          <p className="mt-6 rounded-2xl border border-dashed border-line bg-panel px-6 py-12 text-center text-[14.5px] text-muted">Nicio asociație nu se potrivește căutării. Încearcă alt cuvânt sau alt domeniu.</p>
        ) : (
          <div className="mt-5 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {vizibile.map((a) => (
              <CardAsociatie key={a.slug + a.nume} a={a} />
            ))}
          </div>
        )}
        {!toate && !filtrat && filtrate.length > 6 && (
          <div className="mt-8 text-center">
            <button onClick={() => setToate(true)} className="rounded-full border border-line bg-panel px-6 py-2.5 text-[14px] font-semibold text-ink shadow-sm transition hover:border-brand-blue hover:text-brand-blue">
              Arată toate cele {filtrate.length} asociații
            </button>
          </div>
        )}

        {/* Încredere + invitație pentru ONG-uri */}
        <div className="mt-14 grid gap-6 overflow-hidden rounded-3xl bg-brand-solid p-7 text-white sm:p-10 lg:grid-cols-[1.4fr_1fr] lg:items-center">
          <div>
            <h3 className="font-display text-[24px] leading-tight font-extrabold sm:text-[28px]">Ai o asociație? Deschide-ți campaniile aici.</h3>
            <p className="mt-2.5 max-w-xl text-[15px] leading-relaxed text-white/80">Pagină proprie pentru fiecare proiect, donații online cu cardul, raport al sumelor strânse și un link de distribuit pe rețele.</p>
            <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-white/85">
              <li className="inline-flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-brand-green" aria-hidden="true" /> Plată securizată cu cardul</li>
              <li className="inline-flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-brand-green" aria-hidden="true" /> Mai multe campanii pe asociație</li>
              <li className="inline-flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-brand-green" aria-hidden="true" /> Fără dezvoltare, în câteva minute</li>
            </ul>
          </div>
          <div className="lg:text-right">
            <Link href="/signup" className="inline-flex items-center gap-2 rounded-lg bg-brand-green px-7 py-3.5 text-[15px] font-bold text-white shadow-lg shadow-black/20 transition hover:bg-brand-green-hover">
              Începe gratuit <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

// ===== Campania în focus (stil „campanie recomandată”) =====
function InFocus({ f }: { f: CampanieInFocus }) {
  const c = f.campanie;
  const procent = procentDin(c.sumaStransa, c.sumaTinta);
  return (
    <article className="mt-10 grid overflow-hidden rounded-3xl border border-line bg-panel shadow-md lg:grid-cols-[1.2fr_1fr]">
      <Link href={c.href} className="relative block min-h-[240px] lg:min-h-[400px]" tabIndex={-1} aria-hidden="true">
        <Coperta imagineUrl={c.imagineUrl} domeniu={c.domeniu} mare className="absolute inset-0" />
        <span className="absolute top-4 left-4 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[12px] font-bold text-ink shadow">
          <Sparkles className="h-3.5 w-3.5 text-brand-green" aria-hidden="true" /> Campanie în focus
        </span>
      </Link>
      <div className="flex flex-col p-7 sm:p-9">
        <Link href={`/strangere-fonduri/${f.asociatie.slug}`} className="inline-flex items-center gap-2.5 self-start">
          <Sigla nume={f.asociatie.nume} logoUrl={f.asociatie.logoUrl} marime={36} className="border border-line" />
          <span className="text-[13.5px] font-semibold text-muted transition hover:text-brand-blue">{f.asociatie.nume}</span>
        </Link>
        <h3 className="font-display mt-4 text-[26px] leading-[1.15] font-extrabold text-balance text-ink sm:text-[30px]">
          <Link href={c.href} className="hover:text-brand-blue">{c.titlu}</Link>
        </h3>
        <p className="mt-3 line-clamp-3 text-[15px] leading-relaxed text-muted">{c.poveste}</p>

        <div className="mt-auto pt-6">
          {procent != null && <Progres procent={procent} inalt />}
          <div className="mt-3 flex items-end justify-between gap-3">
            <p>
              <span className="font-display text-[28px] leading-none font-extrabold text-ink">{lei(c.sumaStransa)}</span>
              <span className="mt-1 block text-[13px] text-muted">{c.sumaTinta ? `strânși din ${lei(c.sumaTinta)}` : "strânși până acum"}</span>
            </p>
            {procent != null && <span className="rounded-full bg-brand-green-soft px-3 py-1 text-[13px] font-bold text-brand-green">{procent}%</span>}
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={c.href} className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-brand-green px-6 py-3.5 text-[15px] font-bold text-white transition hover:bg-brand-green-hover sm:flex-none">
              <Heart className="h-4 w-4" aria-hidden="true" /> Donează acum
            </Link>
            <Link href={c.href} className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-line px-6 py-3.5 text-[15px] font-semibold text-ink transition hover:border-brand-blue hover:text-brand-blue sm:flex-none">
              Citește povestea
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

// ===== Cardul unei asociații: copertă, logo suprapus, campanii =====
function CardAsociatie({ a }: { a: AsociatiePublica }) {
  const restul = a.nrCampanii - a.campanii.length;
  const domeniuCard = a.domeniu ?? a.campanii[0]?.domeniu ?? null;
  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-panel shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-xl">
      <Link href={`/strangere-fonduri/${a.slug}`} className="relative block h-36" aria-label={`Pagina asociației ${a.nume}`}>
        <Coperta imagineUrl={a.coperta} domeniu={domeniuCard} className="absolute inset-0" />
        <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-[11.5px] font-bold text-ink shadow-sm">
          {(() => {
            const Icon = dom(domeniuCard).icon;
            return <Icon className="h-3.5 w-3.5" aria-hidden="true" />;
          })()}
          {eticheta(domeniuCard)}
        </span>
      </Link>

      <div className="relative px-5">
        <Sigla nume={a.nume} logoUrl={a.logoUrl} marime={60} className="-mt-8 border-[3px] border-white shadow-md ring-1 ring-line" />
        <div className="mt-3">
          <h4 className="font-display line-clamp-2 text-[18px] leading-snug font-extrabold text-ink">
            <Link href={`/strangere-fonduri/${a.slug}`} className="hover:text-brand-blue">{a.nume}</Link>
          </h4>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-muted">
            {a.judet && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" aria-hidden="true" /> {a.judet}
              </span>
            )}
            <span>
              <b className="font-bold text-ink">{lei(a.totalStrans)}</b> strânși
            </span>
          </p>
        </div>
      </div>

      <ul className="mt-4 divide-y divide-line border-t border-line">
        {a.campanii.map((c) => (
          <li key={c.id}>
            <RandCampanie c={c} />
          </li>
        ))}
      </ul>

      <Link href={`/strangere-fonduri/${a.slug}`} className="mt-auto flex items-center justify-between gap-2 border-t border-line bg-panel-2 px-5 py-3.5 text-[13.5px] font-bold text-brand-blue transition hover:bg-brand-blue-soft">
        <span>{restul > 0 ? `Vezi cele ${a.nrCampanii} campanii` : a.nrCampanii > 1 ? `Vezi cele ${a.nrCampanii} campanii` : "Vezi pagina asociației"}</span>
        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden="true" />
      </Link>
    </article>
  );
}

function RandCampanie({ c }: { c: CampaniePublica }) {
  const procent = procentDin(c.sumaStransa, c.sumaTinta);
  return (
    <Link href={c.href} className="block px-5 py-3.5 transition hover:bg-panel-2 focus-visible:bg-panel-2 focus-visible:outline-none">
      <span className="flex items-start justify-between gap-3">
        <span className="line-clamp-2 text-[14px] leading-snug font-semibold text-ink">{c.titlu}</span>
        <span className="mt-0.5 shrink-0 rounded-full border border-brand-green/40 px-2.5 py-0.5 text-[11.5px] font-bold text-brand-green">Donează</span>
      </span>
      {procent != null && (
        <span className="mt-2.5 block">
          <Progres procent={procent} />
        </span>
      )}
      <span className="mt-2 flex items-baseline justify-between gap-2 text-[12.5px] text-muted">
        <span>
          <b className="font-bold text-ink">{lei(c.sumaStransa)}</b> {c.sumaTinta ? `din ${lei(c.sumaTinta)}` : "strânși"}
        </span>
        {procent != null && <span className="font-bold text-brand-green">{procent}%</span>}
      </span>
    </Link>
  );
}

// ===== Până sunt campanii publice: invitația pentru organizații =====
// Fără contor, fără „se deschide mai târziu”: secțiunea spune ce primește o organizație și cum pornește. Cifrele vin din PACKAGE_LIMITS.
const PASI = [
  { t: "Creezi campania", d: "Un asistent în 5 pași: povestea, suma-țintă, sumele sugerate, poza, termenul. Vezi previzualizarea pe telefon și pe calculator." },
  { t: "Distribui linkul", d: "Fiecare campanie are adresa ei scurtă, ușor de pus pe rețele, în mesaje sau pe afișe." },
  { t: "Primești donațiile", d: "Plata cu cardul intră direct în contul Stripe al asociației. Vezi fiecare donație în CRM, baza ta de donatori." },
];

const AVANTAJE: { icon: LucideIcon; t: string; d: string }[] = [
  { icon: LayoutTemplate, t: "O pagină pentru fiecare proiect", d: "Povestea, poza, progresul și butonul de donație, într-o singură pagină, ușor de citit pe telefon." },
  { icon: Wallet, t: "Fără comision din donații", d: "Alexandrit nu reține niciun comision din donații. Se aplică doar comisionul procesatorului de plăți, Stripe." },
  { icon: FileText, t: "Formular 230 în aceeași platformă", d: "Pagina publică pentru redirecționarea de 3,5% e în aceeași platformă, lângă campaniile tale." },
];

function InCurand() {
  const start = PACKAGE_LIMITS.start;
  const crestere = PACKAGE_LIMITS.crestere;
  return (
    <section id="campanii" className="bg-panel-2 px-[6%] py-16 sm:py-20">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-1.5 text-[12px] font-bold tracking-[0.12em] text-brand-green uppercase">
            <Heart className="h-3.5 w-3.5" aria-hidden="true" /> Pentru organizații
          </span>
          <h2 className="font-display mt-3 text-[26px] leading-[1.15] font-bold text-balance text-ink sm:text-[32px]">Deschide campaniile asociației tale în câteva minute</h2>
          <p className="mt-3 text-[15.5px] leading-relaxed text-muted">
            Strângi fonduri online pentru fiecare proiect, cu o pagină proprie și un link scurt de distribuit. Începi gratuit, fără card.
          </p>
        </div>

        <div className="mt-12 grid items-start gap-10 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <ol className="grid gap-4">
              {PASI.map((p, i) => (
                <li key={p.t} className="flex gap-4 rounded-2xl border border-line bg-panel p-5 shadow-sm">
                  <span className="font-display flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-solid text-[15px] font-extrabold text-white" aria-hidden="true">
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="font-display text-[17px] font-bold text-ink">{p.t}</h3>
                    <p className="mt-1 text-[14px] leading-relaxed text-muted">{p.d}</p>
                  </div>
                </li>
              ))}
            </ol>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link href="/signup" className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-green px-6 py-3.5 text-[15px] font-bold text-white shadow-sm transition hover:bg-brand-green-hover sm:w-auto">
                Începe {TRIAL_DAYS} de zile gratuit <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link href="/hub" className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-line bg-panel px-6 py-3.5 text-[15px] font-semibold text-ink transition hover:border-brand-blue hover:text-brand-blue sm:w-auto">
                Vezi abonamentele
              </Link>
            </div>
            <p className="mt-4 text-[13.5px] text-muted">{TRIAL_DAYS} de zile de probă, fără card. Apoi, campanii active simultan:</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {[
                { n: "START", v: String(start.campaniiActive), p: `${start.pretLunar} lei/lună` },
                { n: "CREȘTERE", v: String(crestere.campaniiActive), p: `${crestere.pretLunar} lei/lună` },
                { n: "IMPACT", v: "nelimitate", p: `${PACKAGE_LIMITS.impact.pretLunar} lei/lună` },
              ].map((x) => (
                <li key={x.n} className="rounded-lg border border-line bg-panel px-3 py-2 text-[13px]">
                  <b className="font-bold text-ink">{x.n}</b> · {x.v} · <span className="text-muted">{x.p}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Cum arată pagina unei campanii: schemă, fără sume sau organizații inventate */}
          <figure>
            <div className="overflow-hidden rounded-3xl border border-line bg-panel shadow-lg" aria-hidden="true">
              <div className="flex items-center gap-2 border-b border-line bg-panel-2 px-4 py-2.5" aria-hidden="true">
                <span className="h-2.5 w-2.5 rounded-full bg-line" />
                <span className="h-2.5 w-2.5 rounded-full bg-line" />
                <span className="h-2.5 w-2.5 rounded-full bg-line" />
                <span className="ml-2 truncate rounded-full bg-panel px-3 py-1 text-[13px] text-muted ring-1 ring-line">alexandrit.ro/asociatia-ta/campania-ta</span>
              </div>
              <div className="relative h-36 bg-gradient-to-br from-brand-green to-brand-solid" aria-hidden="true">
                <Heart className="absolute top-1/2 left-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 text-white/80" strokeWidth={1.4} />
              </div>
              <div className="px-5 pb-5">
                <p className="font-display mt-4 text-[20px] leading-tight font-extrabold text-ink">Numele campaniei tale</p>
                <p className="mt-1 text-[13px] text-muted">Povestea proiectului, într-un text scurt și clar.</p>
                <div className="mt-4">
                  <Progres procent={60} inalt />
                  <p className="mt-2 text-[12.5px] text-muted">Progresul față de suma-țintă, actualizat la fiecare donație</p>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2" aria-hidden="true">
                  {["Suma 1", "Suma 2", "Suma 3"].map((x) => (
                    <span key={x} className="rounded-lg border border-line py-2 text-center text-[12.5px] font-semibold text-body">
                      {x}
                    </span>
                  ))}
                </div>
                <span className="mt-4 flex cursor-default items-center justify-center gap-2 rounded-lg bg-brand-green py-3 text-[14.5px] font-bold text-white">
                  <Heart className="h-4 w-4" /> Donează
                </span>
                <p className="mt-3 flex items-center justify-center gap-1.5 text-[13px] text-muted">
                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> Plată securizată cu cardul
                </p>
              </div>
            </div>
            <figcaption className="mt-3 text-center text-[13px] text-muted">Schemă: așa se structurează pagina fiecărei campanii. Textele, culorile și sumele sunt ale asociației tale.</figcaption>
          </figure>
        </div>

        <ul className="mx-auto mt-14 grid max-w-5xl gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {AVANTAJE.map((a) => (
            <li key={a.t} className="rounded-2xl border border-line bg-panel p-5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-green-soft text-brand-green">
                <a.icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <h3 className="font-display mt-3 text-[16px] leading-snug font-bold text-ink">{a.t}</h3>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">{a.d}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
