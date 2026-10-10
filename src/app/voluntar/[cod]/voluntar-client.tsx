"use client";

import { ArrowRight, CalendarDays, Check, ChevronDown, Clock, Copy, ExternalLink, Laptop, MapPin, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { ETICHETE_INSCRIERE, formateazaOre, linkCuUtm, numeTipSarcina } from "@/lib/voluntari-activitati";
import { CANALE_VOLUNTAR } from "@/lib/voluntari-panou";
import type { ActivitatePublica, IstoricVoluntar, SarcinaPublica } from "@/lib/voluntari-public";

import {
  anuleazaInscriereAction,
  finalizeazaSarcinaAction,
  inscrieAction,
  maImplicAction,
  raporteazaProblemaAction,
  renuntaSarcinaAction,
  salveazaEmailAction,
  stergeDateleMeleAction,
} from "./actions-voluntari";

type Tab = "online" | "teren" | "ale";
export type Urmatoarea = { tip: "sarcina" | "activitate" | "inscriere"; id: string; titlu: string; detaliu: string } | null;
export type CampaniePentruLista = { slug: string; titlu: string; progres: number | null };

const FUS = "Europe/Bucharest";
const dataOra = (iso: string) => new Date(iso).toLocaleString("ro-RO", { timeZone: FUS, weekday: "short", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
const ora = (iso: string) => new Date(iso).toLocaleTimeString("ro-RO", { timeZone: FUS, hour: "2-digit", minute: "2-digit" });
const ziScurta = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("ro-RO", { timeZone: "UTC", day: "numeric", month: "long" });

const camp = "w-full rounded-xl border border-[var(--vp-line)] bg-white px-3.5 py-2.5 text-[15px] text-[var(--vp-ink)] placeholder:text-[#94a3b8] focus:border-[var(--vp-brand)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--vp-brand)]/30";
const butonPrimar = "inline-flex items-center justify-center gap-1.5 rounded-xl bg-[var(--vp-brand)] px-4 py-2.5 text-[14.5px] font-semibold text-white transition active:scale-[.99] disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-[var(--vp-brand)] focus-visible:ring-offset-2 focus-visible:outline-none";
const butonSecundar = "inline-flex items-center justify-center gap-1.5 rounded-xl border border-[var(--vp-line)] bg-white px-3.5 py-2.5 text-[14px] font-semibold text-[var(--vp-ink)] transition hover:border-[var(--vp-brand)] disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-[var(--vp-brand)] focus-visible:outline-none";

type Props = {
  cod: string;
  orgNume: string;
  sarcini: SarcinaPublica[];
  activitati: ActivitatePublica[];
  istoric: IstoricVoluntar;
  campanii: CampaniePentruLista[];
  emailMeu: string | null;
  acordInvitatii: boolean;
  urmatoarea: Urmatoarea;
  legatCrm: boolean;
};

export function VoluntarClient(p: Props) {
  const [tab, setTab] = useState<Tab>(p.sarcini.length > 0 || p.activitati.length === 0 ? "online" : "teren");
  const [deschis, setDeschis] = useState<string | null>(null);

  const tabs: { id: Tab; eticheta: string; nr?: number }[] = [
    { id: "online", eticheta: "Online", nr: p.sarcini.filter((s) => s.stareMea !== "finalizat").length },
    { id: "teren", eticheta: "Pe teren", nr: p.activitati.length },
    { id: "ale", eticheta: "Ale mele" },
  ];

  return (
    <div className="space-y-5">
      {p.urmatoarea && (
        <section aria-labelledby="urm" className="rounded-2xl border border-[var(--vp-gold-line)] bg-[var(--vp-gold-bg)] p-4">
          <h2 id="urm" className="text-[12px] font-bold tracking-wide text-[var(--vp-brand)] uppercase">
            Următoarea ta acțiune
          </h2>
          <p className="mt-1 text-[16px] font-semibold">{p.urmatoarea.titlu}</p>
          <p className="text-[13.5px] text-[var(--vp-muted)]">{p.urmatoarea.detaliu}</p>
          <button
            type="button"
            className={`${butonPrimar} mt-3`}
            onClick={() => {
              setTab(p.urmatoarea!.tip === "sarcina" ? "online" : p.urmatoarea!.tip === "inscriere" ? "ale" : "teren");
              setDeschis(p.urmatoarea!.id);
            }}
          >
            {p.urmatoarea.tip === "sarcina" ? "Deschide sarcina" : p.urmatoarea.tip === "inscriere" ? "Vezi detaliile" : "Vezi activitatea"} <ArrowRight className="size-4" aria-hidden />
          </button>
        </section>
      )}

      <div role="tablist" aria-label="Cum vrei să ajuți" className="grid grid-cols-3 gap-1.5 rounded-2xl border border-[var(--vp-line)] bg-white p-1.5">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-xl px-2 py-2.5 text-[14px] font-semibold transition focus-visible:ring-2 focus-visible:ring-[var(--vp-brand)] focus-visible:outline-none ${tab === t.id ? "bg-[var(--vp-brand)] text-white" : "text-[var(--vp-muted)] hover:bg-[#f1f5fa]"}`}
          >
            {t.eticheta}
            {t.nr ? <span className={`ml-1.5 rounded-full px-1.5 text-[12px] ${tab === t.id ? "bg-white/20" : "bg-[#e6ecf4]"}`}>{t.nr}</span> : null}
          </button>
        ))}
      </div>

      {tab === "online" && <Online {...p} deschis={deschis} />}
      {tab === "teren" && <PeTeren {...p} deschis={deschis} />}
      {tab === "ale" && <AleMele {...p} />}
    </div>
  );
}

function useRula() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [eroare, setEroare] = useState("");
  const [info, setInfo] = useState("");
  function ruleaza<T extends { ok: boolean }>(f: () => Promise<T | { ok: false; eroare: string }>, ok?: string, dupa?: () => void) {
    setEroare("");
    setInfo("");
    start(async () => {
      const r = await f();
      if (r.ok) {
        if (ok) setInfo(ok);
        dupa?.();
        router.refresh();
      } else setEroare((r as { eroare: string }).eroare);
    });
  }
  return { pending, eroare, info, ruleaza, setEroare, setInfo };
}

function Mesaje({ eroare, info }: { eroare: string; info: string }) {
  return (
    <>
      {eroare && (
        <p role="alert" className="mt-2 rounded-lg bg-[#fdecea] px-3 py-2 text-[13.5px] text-[#9b2c20]">
          {eroare}
        </p>
      )}
      {info && (
        <p role="status" className="mt-2 rounded-lg bg-[var(--vp-green-bg)] px-3 py-2 text-[13.5px] font-semibold text-[var(--vp-green)]">
          {info}
        </p>
      )}
    </>
  );
}

// ===== Online =====
function Online({ cod, sarcini, campanii, deschis }: Props & { deschis: string | null }) {
  return (
    <div className="space-y-5">
      {sarcini.length === 0 ? (
        <section className="rounded-2xl border border-[var(--vp-line)] bg-white p-6 text-center">
          <Laptop className="mx-auto size-8 text-[var(--vp-muted)]" aria-hidden />
          <h2 className="mt-2 text-[17px] font-bold">Nicio sarcină acum</h2>
          <p className="mt-1 text-[14px] text-[var(--vp-muted)]">Echipa publică aici lucruri pe care le poți face de acasă. Revino curând.</p>
        </section>
      ) : (
        <ul className="space-y-3">
          {sarcini.map((s) => (
            <li key={s.id}>
              <CardSarcina cod={cod} s={s} deschisInitial={deschis === s.id} />
            </li>
          ))}
        </ul>
      )}
      {campanii.length > 0 && (
        <section aria-labelledby="camp">
          <h2 id="camp" className="text-[15px] font-bold">
            Campanii de dat mai departe
          </h2>
          <p className="text-[13px] text-[var(--vp-muted)]">Alege una, copiază mesajul și trimite-l oamenilor pe care îi cunoști.</p>
          <ul className="mt-2 divide-y divide-[var(--vp-line)] rounded-2xl border border-[var(--vp-line)] bg-white">
            {campanii.map((c) => (
              <li key={c.slug}>
                <Link href={`/voluntar/${cod}/campanie/${c.slug}`} className="flex items-center gap-3 px-4 py-3 focus-visible:ring-2 focus-visible:ring-[var(--vp-brand)] focus-visible:outline-none">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14.5px] font-semibold">{c.titlu}</span>
                    {c.progres != null && <span className="text-[12.5px] text-[var(--vp-muted)]">{Math.round(c.progres * 100)}% din țintă</span>}
                  </span>
                  <ArrowRight className="size-4 shrink-0 text-[var(--vp-muted)]" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function CardSarcina({ cod, s, deschisInitial }: { cod: string; s: SarcinaPublica; deschisInitial: boolean }) {
  // „Următoarea acțiune” poate deschide cardul din afară; un clic al voluntarului are întâietate.
  const [manual, setManual] = useState<boolean | null>(null);
  const deschisa = manual ?? deschisInitial;
  const [mesaj, setMesaj] = useState(s.textRecomandat);
  const [linkPostare, setLinkPostare] = useState(s.linkPostareMeu ?? "");
  const [copiat, setCopiat] = useState("");
  const { pending, eroare, info, ruleaza, setEroare } = useRula();
  const gata = s.stareMea === "finalizat";
  const canale = s.canale.length > 0 ? CANALE_VOLUNTAR.filter((c) => s.canale.includes(c.id)) : CANALE_VOLUNTAR;

  const linkPentru = (canal: string) => (s.linkBaza ? linkCuUtm(s.linkBaza, { canal, campanie: s.campanieSlug ?? s.titlu, sarcina: s.id.slice(0, 8) }) : "");
  const compune = (canal: string) => [mesaj.trim(), linkPentru(canal)].filter(Boolean).join("\n");

  async function copiaza(text: string, eticheta: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiat(eticheta);
      setTimeout(() => setCopiat(""), 2000);
    } catch {
      setEroare("Nu am putut copia automat. Selectează textul și copiază-l manual.");
    }
  }

  function urlCanal(id: string): string | null {
    const text = compune(id);
    const link = linkPentru(id);
    if (id === "whatsapp") return `https://wa.me/?text=${encodeURIComponent(text)}`;
    if (id === "facebook" && link) return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`;
    if (id === "linkedin" && link) return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(link)}`;
    if (id === "email") return `mailto:?subject=${encodeURIComponent(s.titlu)}&body=${encodeURIComponent(text)}`;
    return null;
  }

  return (
    <article className={`rounded-2xl border bg-white ${gata ? "border-[var(--vp-green)]/40" : "border-[var(--vp-line)]"}`}>
      <button type="button" aria-expanded={deschisa} onClick={() => setManual(!deschisa)} className="flex w-full items-start gap-3 p-4 text-left focus-visible:rounded-2xl focus-visible:ring-2 focus-visible:ring-[var(--vp-brand)] focus-visible:outline-none">
        <span className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full ${gata ? "bg-[var(--vp-green-bg)] text-[var(--vp-green)]" : "bg-[var(--vp-gold-bg)] text-[var(--vp-brand)]"}`} aria-hidden>
          {gata ? <Check className="size-4" /> : <Laptop className="size-4" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15.5px] leading-snug font-semibold">{s.titlu}</span>
          <span className="mt-0.5 flex flex-wrap gap-x-3 text-[12.5px] text-[var(--vp-muted)]">
            <span>{numeTipSarcina(s.tip, s.tipPersonalizat)}</span>
            {s.minuteEstimate ? (
              <span className="inline-flex items-center gap-1">
                <Clock className="size-3" aria-hidden /> ~{s.minuteEstimate} min
              </span>
            ) : null}
            {s.termen ? <span>până pe {ziScurta(s.termen)}</span> : null}
            {s.locuriRamase != null ? <span>{s.locuriRamase} {s.locuriRamase === 1 ? "loc" : "locuri"} rămase</span> : null}
          </span>
          {gata && <span className="mt-1 block text-[13px] font-semibold text-[var(--vp-green)]">Făcută. Mulțumim!</span>}
        </span>
        <ChevronDown className={`mt-1 size-4 shrink-0 text-[var(--vp-muted)] transition-transform ${deschisa ? "rotate-180" : ""}`} aria-hidden />
      </button>

      {deschisa && (
        <div className="space-y-3 border-t border-[var(--vp-line)] p-4 pt-3">
          <p className="text-[14.5px] whitespace-pre-wrap">{s.descriere}</p>
          {s.instructiuni && <p className="rounded-lg bg-[#f1f5fa] px-3 py-2 text-[13.5px] whitespace-pre-wrap text-[var(--vp-muted)]">{s.instructiuni}</p>}

          {s.stareMea === null && (
            <button type="button" className={`${butonPrimar} w-full`} disabled={pending} onClick={() => ruleaza(() => maImplicAction(cod, s.id))}>
              {pending ? "Un moment…" : "Mă implic"}
            </button>
          )}

          {s.stareMea === "angajat" && (
            <>
              {(s.textRecomandat || s.linkBaza) && (
                <div>
                  <label htmlFor={`m-${s.id}`} className="text-[13px] font-semibold">
                    Mesajul tău <span className="font-normal text-[var(--vp-muted)]">(îl poți schimba, e mai bine cu propriile cuvinte)</span>
                  </label>
                  <textarea id={`m-${s.id}`} className={`${camp} mt-1`} rows={4} value={mesaj} onChange={(e) => setMesaj(e.target.value)} />
                  {s.linkBaza && <p className="mt-1 truncate text-[12.5px] text-[var(--vp-muted)]">Se adaugă linkul: {s.linkBaza}</p>}
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button type="button" className={butonSecundar} onClick={() => copiaza(compune("copiat"), "mesaj")}>
                      <Copy className="size-4" aria-hidden /> {copiat === "mesaj" ? "Copiat" : "Copiază mesajul"}
                    </button>
                    {s.linkBaza && (
                      <button type="button" className={butonSecundar} onClick={() => copiaza(linkPentru("copiat"), "link")}>
                        <Copy className="size-4" aria-hidden /> {copiat === "link" ? "Copiat" : "Copiază linkul"}
                      </button>
                    )}
                  </div>
                  {s.tip === "distribuie" && (
                    <>
                      <p className="mt-3 text-[13px] font-semibold">Trimite pe</p>
                      <div className="mt-1.5 flex flex-wrap gap-2">
                        {canale.map((c) => {
                          const url = urlCanal(c.id);
                          return url ? (
                            <a key={c.id} href={url} target="_blank" rel="noopener noreferrer" className={butonSecundar}>
                              {c.nume} <ExternalLink className="size-3.5" aria-hidden />
                            </a>
                          ) : (
                            <button key={c.id} type="button" className={butonSecundar} onClick={() => copiaza(compune(c.id), c.id)}>
                              {copiat === c.id ? "Mesaj copiat" : `${c.nume}: copiază`}
                            </button>
                          );
                        })}
                      </div>
                      <p className="mt-2 text-[12.5px] text-[var(--vp-muted)]">Trimite oamenilor pe care îi cunoști. În grupuri, doar dacă regulile grupului permit. O singură dată pe canal ajunge.</p>
                    </>
                  )}
                </div>
              )}
              <div>
                <label htmlFor={`l-${s.id}`} className="text-[13px] font-semibold">
                  Linkul postării <span className="font-normal text-[var(--vp-muted)]">(opțional)</span>
                </label>
                <input id={`l-${s.id}`} className={`${camp} mt-1`} inputMode="url" value={linkPostare} onChange={(e) => setLinkPostare(e.target.value)} placeholder="https://" />
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" className={`${butonPrimar} flex-1`} disabled={pending} onClick={() => ruleaza(() => finalizeazaSarcinaAction(cod, s.id, linkPostare), "Mulțumim! Sarcina e bifată.")}>
                  <Check className="size-4" aria-hidden /> Am terminat
                </button>
                <button type="button" className={butonSecundar} disabled={pending} onClick={() => ruleaza(() => renuntaSarcinaAction(cod, s.id))}>
                  Nu pot acum
                </button>
              </div>
            </>
          )}
          <Mesaje eroare={eroare} info={info} />
        </div>
      )}
    </article>
  );
}

// ===== Pe teren =====
function PeTeren({ cod, activitati, emailMeu, acordInvitatii, deschis }: Props & { deschis: string | null }) {
  return (
    <div className="space-y-4">
      {activitati.length === 0 ? (
        <section className="rounded-2xl border border-[var(--vp-line)] bg-white p-6 text-center">
          <CalendarDays className="mx-auto size-8 text-[var(--vp-muted)]" aria-hidden />
          <h2 className="mt-2 text-[17px] font-bold">Nicio activitate programată</h2>
          <p className="mt-1 text-[14px] text-[var(--vp-muted)]">Când echipa organizează o colectă sau un eveniment, îl vezi aici și te poți înscrie.</p>
        </section>
      ) : (
        <>
          {!emailMeu && <EmailForm cod={cod} mesaj="Vrei confirmarea înscrierii pe email? Adaugă adresa (opțional)." acordInitial={acordInvitatii} />}
          <ul className="space-y-3">
            {activitati.map((a) => (
              <li key={a.id}>
                <CardActivitate cod={cod} a={a} deschisInitial={deschis === a.id} />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function CardActivitate({ cod, a, deschisInitial }: { cod: string; a: ActivitatePublica; deschisInitial: boolean }) {
  // „Următoarea acțiune” poate deschide cardul din afară; un clic al voluntarului are întâietate.
  const [manual, setManual] = useState<boolean | null>(null);
  const deschisa = manual ?? deschisInitial;
  const { pending, eroare, info, ruleaza } = useRula();
  const inscris = a.ture.some((t) => t.inscrierea);

  return (
    <article className={`rounded-2xl border bg-white ${inscris ? "border-[var(--vp-green)]/40" : "border-[var(--vp-line)]"}`}>
      <button type="button" aria-expanded={deschisa} onClick={() => setManual(!deschisa)} className="flex w-full items-start gap-3 p-4 text-left focus-visible:rounded-2xl focus-visible:ring-2 focus-visible:ring-[var(--vp-brand)] focus-visible:outline-none">
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--vp-gold-bg)] text-[var(--vp-brand)]" aria-hidden>
          <MapPin className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15.5px] leading-snug font-semibold">{a.titlu}</span>
          <span className="mt-0.5 block text-[13px] text-[var(--vp-muted)]">
            {dataOra(a.inceputLa)} – {ora(a.seTerminaLa)}
          </span>
          <span className="block text-[13px] text-[var(--vp-muted)]">
            {a.locatie}
            {a.localitate ? `, ${a.localitate}` : ""}
          </span>
          {inscris && <span className="mt-1 block text-[13px] font-semibold text-[var(--vp-green)]">Ești înscris(ă)</span>}
        </span>
        <ChevronDown className={`mt-1 size-4 shrink-0 text-[var(--vp-muted)] transition-transform ${deschisa ? "rotate-180" : ""}`} aria-hidden />
      </button>

      {deschisa && (
        <div className="space-y-3 border-t border-[var(--vp-line)] p-4 pt-3">
          {a.descriere && <p className="text-[14.5px] whitespace-pre-wrap">{a.descriere}</p>}
          {a.cuMinori && <p className="rounded-lg bg-[#fff6dc] px-3 py-2 text-[13px] text-[#7a5200]">La această activitate participă minori sau persoane vulnerabile. Echipa îți poate cere acorduri sau documente suplimentare.</p>}
          {a.cerinte && (
            <div>
              <p className="text-[13px] font-semibold">Ce trebuie să știi</p>
              <p className="text-[13.5px] whitespace-pre-wrap text-[var(--vp-muted)]">{a.cerinte}</p>
            </div>
          )}
          {a.instructiuni && (
            <div>
              <p className="text-[13px] font-semibold">Cum ajungi și ce aduci</p>
              <p className="text-[13.5px] whitespace-pre-wrap text-[var(--vp-muted)]">{a.instructiuni}</p>
            </div>
          )}
          {a.coordonator && (a.coordonator.nume || a.coordonator.telefon || a.coordonator.contactZi) && (
            <p className="rounded-lg bg-[var(--vp-green-bg)] px-3 py-2 text-[13.5px]">
              <span className="font-semibold">Contact: </span>
              {[a.coordonator.nume, a.coordonator.telefon, a.coordonator.contactZi].filter(Boolean).join(" · ")}
            </p>
          )}

          <ul className="divide-y divide-[var(--vp-line)] rounded-xl border border-[var(--vp-line)]">
            {a.ture.map((t) => {
              const libere = Math.max(0, t.locuri - t.ocupate);
              return (
                <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold">{t.nume}</p>
                    <p className="inline-flex items-center gap-2 text-[12.5px] text-[var(--vp-muted)]">
                      <span>
                        {ora(t.inceputLa)} – {ora(t.seTerminaLa)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Users className="size-3" aria-hidden /> {libere > 0 ? `${libere} ${libere === 1 ? "loc liber" : "locuri libere"}` : "ocupat"}
                      </span>
                    </p>
                  </div>
                  {t.inscrierea ? (
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-[var(--vp-green-bg)] px-2.5 py-1 text-[12.5px] font-semibold text-[var(--vp-green)]">{ETICHETE_INSCRIERE[t.inscrierea.status as keyof typeof ETICHETE_INSCRIERE] ?? t.inscrierea.status}</span>
                      <button type="button" className={butonSecundar} disabled={pending} onClick={() => ruleaza(() => anuleazaInscriereAction(cod, t.inscrierea!.id), "Înscrierea a fost anulată.")}>
                        Anulează
                      </button>
                    </div>
                  ) : (
                    <button type="button" className={butonPrimar} disabled={pending} onClick={() => ruleaza(() => inscrieAction(cod, t.id), a.aprobare === "manuala" ? "Cererea a fost trimisă. Echipa îți răspunde." : libere > 0 ? "Ești înscris(ă). Mulțumim!" : "Ești pe lista de rezervă. Te anunțăm dacă se eliberează un loc.")}>
                      {libere > 0 ? "Mă înscriu" : "Lista de rezervă"}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
          <Mesaje eroare={eroare} info={info} />
        </div>
      )}
    </article>
  );
}

function EmailForm({ cod, mesaj, acordInitial }: { cod: string; mesaj: string; acordInitial: boolean }) {
  const [email, setEmail] = useState("");
  const [acord, setAcord] = useState(acordInitial);
  const { pending, eroare, info, ruleaza } = useRula();
  return (
    <form
      className="rounded-2xl border border-[var(--vp-line)] bg-white p-4"
      onSubmit={(e) => {
        e.preventDefault();
        ruleaza(() => salveazaEmailAction(cod, email, acord), email.trim() ? "Salvat." : "Adresa a fost ștearsă.");
      }}
    >
      <label htmlFor="vp-email" className="text-[14px] font-semibold">
        {mesaj}
      </label>
      <div className="mt-2 flex gap-2">
        <input id="vp-email" type="email" autoComplete="email" className={camp} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="adresa@exemplu.ro" />
        <button type="submit" className={butonSecundar} disabled={pending || (email.trim() !== "" && email.trim().length < 5)}>
          Salvează
        </button>
      </div>
      <label className="mt-2.5 flex items-start gap-2 text-[13.5px]">
        <input type="checkbox" className="mt-1 size-4" checked={acord} onChange={(e) => setAcord(e.target.checked)} />
        <span>Vreau și invitații la activități care mi se potrivesc (cel mult una pe săptămână).</span>
      </label>
      <p className="mt-1.5 text-[12.5px] text-[var(--vp-muted)]">Adresa e folosită pentru confirmări și remindere. Poți bifa sau debifa invitațiile oricând, sau poți șterge adresa lăsând câmpul gol și apăsând „Salvează”.</p>
      <Mesaje eroare={eroare} info={info} />
    </form>
  );
}

// ===== Ale mele =====
function AleMele({ cod, istoric, emailMeu, acordInvitatii }: Props) {
  const router = useRouter();
  const { pending, eroare, info, ruleaza } = useRula();
  const [problema, setProblema] = useState("");
  const [confirma, setConfirma] = useState(false);

  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-3 gap-2 text-center">
        {[
          { n: formateazaOre(istoric.ore), e: "ore confirmate" },
          { n: istoric.activitati, e: "activități" },
          { n: istoric.sarcini, e: "sarcini online" },
        ].map((x) => (
          <div key={x.e} className="rounded-xl border border-[var(--vp-line)] bg-white px-2 py-3">
            <dd className="text-[22px] leading-none font-bold tabular-nums">{x.n}</dd>
            <dt className="mt-1 text-[12px] text-[var(--vp-muted)]">{x.e}</dt>
          </div>
        ))}
      </dl>

      <section aria-labelledby="ins">
        <h2 id="ins" className="text-[15px] font-bold">
          Înscrierile tale
        </h2>
        {istoric.inscrieri.length === 0 ? (
          <p className="mt-1 text-[14px] text-[var(--vp-muted)]">Nu te-ai înscris încă la nicio activitate.</p>
        ) : (
          <ul className="mt-2 divide-y divide-[var(--vp-line)] rounded-2xl border border-[var(--vp-line)] bg-white">
            {istoric.inscrieri.map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="min-w-0">
                  <span className="block truncate text-[14.5px] font-semibold">{i.activitate}</span>
                  <span className="text-[12.5px] text-[var(--vp-muted)]">
                    {dataOra(i.inceputLa)}
                    {i.ore != null ? ` · ${formateazaOre(i.ore)} ore` : ""}
                  </span>
                </span>
                <span className="shrink-0 rounded-full bg-[#eef2f8] px-2.5 py-1 text-[12.5px] font-semibold text-[var(--vp-muted)]">{ETICHETE_INSCRIERE[i.status as keyof typeof ETICHETE_INSCRIERE] ?? i.status}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-[12.5px] text-[var(--vp-muted)]">Orele devin „confirmate” după ce echipa validează activitatea. Pentru o adeverință de voluntariat, scrie-le celor de la organizație.</p>
      </section>

      <EmailForm key={`${emailMeu ?? ""}|${acordInvitatii}`} cod={cod} mesaj={emailMeu ? `Email pentru confirmări: ${emailMeu}. Îl poți schimba:` : "Email pentru confirmări (opțional)"} acordInitial={acordInvitatii} />

      <section className="rounded-2xl border border-[var(--vp-line)] bg-white p-4">
        <h2 className="text-[15px] font-bold">Ceva nu e în regulă?</h2>
        <p className="text-[13px] text-[var(--vp-muted)]">Spune-ne ce s-a întâmplat. Mesajul ajunge doar la echipă.</p>
        <label htmlFor="vp-problema" className="sr-only">
          Descrie problema
        </label>
        <textarea id="vp-problema" className={`${camp} mt-2`} rows={3} maxLength={1200} value={problema} onChange={(e) => setProblema(e.target.value)} />
        <button type="button" className={`${butonSecundar} mt-2`} disabled={pending || problema.trim().length < 5} onClick={() => ruleaza(() => raporteazaProblemaAction(cod, problema, null), "Mulțumim. Am trimis mesajul echipei.", () => setProblema(""))}>
          Trimite
        </button>
        <Mesaje eroare={eroare} info={info} />
      </section>

      <section className="rounded-2xl border border-[var(--vp-line)] bg-white p-4">
        <h2 className="text-[15px] font-bold">Datele tale</h2>
        <p className="text-[13px] text-[var(--vp-muted)]">Poți cere oricând ștergerea datelor tale de aici: profilul, sarcinile și înscrierile dispar.</p>
        {confirma ? (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-[13.5px]">Sigur? Nu se poate anula.</span>
            <button type="button" className={butonSecundar} onClick={() => setConfirma(false)}>
              Renunț
            </button>
            <button
              type="button"
              className={butonPrimar}
              disabled={pending}
              onClick={() =>
                ruleaza(() => stergeDateleMeleAction(cod), undefined, () => {
                  router.refresh();
                })
              }
            >
              Șterge-mi datele
            </button>
          </div>
        ) : (
          <button type="button" className={`${butonSecundar} mt-2`} onClick={() => setConfirma(true)}>
            Șterge-mi datele
          </button>
        )}
      </section>
    </div>
  );
}
