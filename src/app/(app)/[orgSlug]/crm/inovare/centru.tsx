"use client";

import { ArrowRight, Check, ChevronUp, Flag, Lightbulb, Search, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import {
  CATEGORII,
  CATEGORIE_IMPLICITA,
  ETICHETE_EFORT,
  ETICHETE_FRECVENTA,
  ETICHETE_OBIECTIV,
  ETICHETE_STARE,
  FRECVENTE,
  ideiSimilare,
  LIMITE,
  OBIECTIVE,
  STARI,
  type Sortare,
  type StareIdee,
} from "@/lib/inovare/model";
import type { IdeeVizibila } from "@/lib/inovare/server";
import type { Inovatie } from "@/content/inovatii";

import { Badge, type StatusTone } from "../components/ui/badge";
import { Breadcrumb } from "../components/ui/breadcrumb";
import { Button } from "../components/ui/button";
import { Card, CardHeader } from "../components/ui/card";
import { Dialog } from "../components/ui/dialog";
import { Input, Label, Select, Textarea } from "../components/ui/input";
import { EmptyState } from "../components/ui/states";
import { propuneIdee, raporteazaIdee, voteazaIdee } from "./actions";

type Noutate = Inovatie & { nou: boolean };

const TON_STARE: Record<StareIdee, StatusTone> = { propus: "neutral", vazuta: "teal", in_planificare: "blue", in_dezvoltare: "orange", finalizat: "green", nu_acum: "neutral" };
const TIP_NOUTATE: Record<string, { eticheta: string; ton: StatusTone }> = { nou: { eticheta: "Funcționalitate nouă", ton: "blue" }, imbunatatire: { eticheta: "Îmbunătățire", ton: "teal" }, reparat: { eticheta: "Reparat", ton: "neutral" } };
const dataRo = (iso: string) => new Intl.DateTimeFormat("ro-RO", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Bucharest" }).format(new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso));
const dataScurta = (iso: string) => new Intl.DateTimeFormat("ro-RO", { day: "numeric", month: "short", timeZone: "Europe/Bucharest" }).format(new Date(iso));
const NOUTATI_INITIAL = 6;
const IDEI_INITIAL = 8;
// Statistica din antet apare doar când e ce arăta; „0 idei, 0 voturi" descurajează.
const PRAG_STATISTICI = 5;

const deruleaza = (el: HTMLElement | null) => el?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });

export function CentruInovare({ orgSlug, idei: initiale, noutati }: { orgSlug: string; idei: IdeeVizibila[]; noutati: Noutate[] }) {
  const [idei, setIdei] = useState(initiale);
  const [stare, setStare] = useState<StareIdee | "toate">("toate");
  const [sortare, setSortare] = useState<Sortare>("voturi");
  const [cautare, setCautare] = useState("");
  const [toateIdeile, setToateIdeile] = useState(false);
  const [deschisa, setDeschisa] = useState<IdeeVizibila | null>(null);
  const [propune, setPropune] = useState<{ titlu: string } | null>(null);
  const [toateNoutatile, setToateNoutatile] = useState(false);
  const [catNoutati, setCatNoutati] = useState("");
  const [mesaj, setMesaj] = useState("");
  const [evidentiata, setEvidentiata] = useState<string | null>(null);
  const tabla = useRef<HTMLDivElement>(null);
  const noutatiSectiune = useRef<HTMLDivElement>(null);

  // Ideea nou trimisă se evidențiază câteva secunde, ca să se vadă unde a ajuns.
  useEffect(() => {
    if (!evidentiata) return;
    const t = window.setTimeout(() => setEvidentiata(null), 4000);
    return () => window.clearTimeout(t);
  }, [evidentiata]);

  const numara = (s: StareIdee | "toate") => (s === "toate" ? idei.length : idei.filter((i) => i.stare === s).length);
  const lista = useMemo(() => {
    const q = cautare.trim().toLowerCase();
    return idei
      .filter((i) => (stare === "toate" ? true : i.stare === stare) && (!q || `${i.titlu} ${i.descriere} ${i.categorie}`.toLowerCase().includes(q)))
      .sort((a, b) => (sortare === "voturi" ? b.voturi - a.voturi || b.creatLa.localeCompare(a.creatLa) : b.creatLa.localeCompare(a.creatLa)));
  }, [idei, stare, sortare, cautare]);
  const taiat = !toateIdeile && stare === "toate" && !cautare.trim() && lista.length > IDEI_INITIAL;
  const afisate = taiat ? lista.slice(0, IDEI_INITIAL) : lista;

  const ultimeleFinalizate = useMemo(() => idei.filter((i) => i.stare === "finalizat").sort((a, b) => (b.finalizatLa ?? b.actualizatLa).localeCompare(a.finalizatLa ?? a.actualizatLa)).slice(0, 3), [idei]);
  const totalVoturi = idei.reduce((s, i) => s + i.voturi, 0);
  const ideileMele = idei.filter((i) => i.deMine).length;
  const voturileMele = idei.filter((i) => i.votatDeMine).length;
  const deVotat = idei.filter((i) => !i.votatDeMine && i.stare !== "finalizat" && i.stare !== "nu_acum").length;

  const categoriiNoutati = [...new Set(noutati.map((n) => n.categorie))];
  const noutatiAfisate = noutati.filter((n) => !catNoutati || n.categorie === catNoutati);
  const vizibile = toateNoutatile ? noutatiAfisate : noutatiAfisate.slice(0, NOUTATI_INITIAL);
  // „Ai cerut tu, am făcut": noutatea vine dintr-o idee pe care a propus-o sau a votat-o organizația.
  const ideiAleMele = useMemo(() => new Set(idei.filter((i) => i.deMine || i.votatDeMine).map((i) => i.id)), [idei]);

  function aplicaVot(id: string, votat: boolean, voturi: number) {
    setIdei((l) => l.map((i) => (i.id === id ? { ...i, votatDeMine: votat, voturi } : i)));
    setDeschisa((d) => (d && d.id === id ? { ...d, votatDeMine: votat, voturi } : d));
  }

  function dupaRaportare(id: string) {
    setIdei((l) => l.filter((i) => i.id !== id));
    setDeschisa(null);
    setMesaj("Mulțumim. Ideea a fost ascunsă până o verifică echipa noastră.");
  }

  return (
    <div className="mx-auto max-w-[1100px] space-y-6">
      <Breadcrumb items={[{ label: "Platformă", href: `/${orgSlug}/crm/instrumente` }, { label: "Centrul de inovare" }]} />

      <Card className="bg-[var(--ci-primary-soft)]">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <p className="flex items-center gap-1.5 text-[12px] font-semibold tracking-wide text-[var(--ci-primary)] uppercase">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> Centrul de inovare în fundraising
            </p>
            <h1 className="ci-display mt-1.5 text-xl font-bold text-[var(--ci-text)]">Construim Alexandrit împreună cu ONG-urile</h1>
            <p className="mt-1.5 text-[14px] leading-relaxed text-[var(--ci-text-muted)]">
              Ai o idee care ți-ar ușura munca? Propune-o. Votul organizațiilor ne ajută să alegem ce facem întâi; decizia finală rămâne a echipei Alexandrit.
            </p>
            {idei.length >= PRAG_STATISTICI && (
              <p className="mt-2 text-[12.5px] text-[var(--ci-text-muted)]">
                {idei.length} idei și {totalVoturi} voturi de la organizațiile din Alexandrit
              </p>
            )}
          </div>
          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            <Button variant="primary" size="lg" className="w-full justify-center sm:h-9 sm:w-auto" onClick={() => setPropune({ titlu: "" })}>
              <Lightbulb className="h-4 w-4" aria-hidden="true" /> Propune o idee
            </Button>
            <Button variant="secondary" size="lg" className="w-full justify-center sm:h-9 sm:w-auto" onClick={() => deruleaza(noutatiSectiune.current)}>
              Vezi ce am livrat
            </Button>
          </div>
        </div>
      </Card>

      {mesaj && (
        <p role="status" className="rounded-[var(--ci-radius-btn)] bg-[var(--ci-green-soft)] px-3.5 py-2.5 text-[13px] text-[var(--ci-green)]">
          {mesaj}
        </p>
      )}

      {/* Ideile */}
      <section ref={tabla} aria-labelledby="h-idei" className="scroll-mt-4">
        <div className="mb-3">
          <h2 id="h-idei" className="ci-display text-[16px] font-semibold text-[var(--ci-text)]">
            Ideile altor organizații. Votează-le pe cele care contează și pentru tine
          </h2>
          <p className="text-[13px] text-[var(--ci-text-muted)]">Votul e al organizației tale, nu al tău personal: colegii îl văd și ei. Îl poți retrage oricând.</p>
          {(ideileMele > 0 || voturileMele > 0 || deVotat >= 3) && (
            <p className="mt-1.5 text-[12.5px] text-[var(--ci-text-muted)]">
              Ideile tale: <strong className="text-[var(--ci-text)]">{ideileMele}</strong> · Voturile organizației: <strong className="text-[var(--ci-text)]">{voturileMele}</strong>
              {voturileMele === 0 && deVotat >= 3 ? <span className="text-[var(--ci-primary)]"> · Organizația ta n-a votat nicio idee încă: votează 3 în 1 minut.</span> : null}
            </p>
          )}
        </div>

        <div role="group" aria-label="Starea ideilor" className="ci-scrollbar flex gap-1.5 overflow-x-auto pb-1">
          {([{ cheie: "toate" as const, eticheta: "Toate" }, ...STARI]).map((s) => (
            <button
              key={s.cheie}
              type="button"
              aria-pressed={stare === s.cheie}
              onClick={() => setStare(s.cheie)}
              className={`inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-medium whitespace-nowrap transition-colors sm:min-h-9 ${stare === s.cheie ? "border-[var(--ci-primary)] bg-[var(--ci-primary)] text-white" : "border-[var(--ci-border)] text-[var(--ci-text-muted)] hover:bg-[var(--ci-surface-2)]"}`}
            >
              {s.eticheta} <span className={`ci-tabular text-[12px] ${stare === s.cheie ? "text-white/80" : "text-[var(--ci-text-muted)]"}`}>{numara(s.cheie)}</span>
            </button>
          ))}
        </div>
        {stare !== "toate" && <p className="mt-2 text-[12.5px] text-[var(--ci-text-muted)]">{STARI.find((s) => s.cheie === stare)?.descriere}</p>}

        <div className="my-3 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--ci-text-faint)]" aria-hidden="true" />
            <Input value={cautare} onChange={(e) => setCautare(e.target.value)} placeholder="Caută în idei…" aria-label="Caută în idei" className="pl-9" />
          </div>
          <Select value={sortare} onChange={(e) => setSortare(e.target.value as Sortare)} aria-label="Sortează" className="w-auto min-w-[170px]">
            <option value="voturi">Cele mai votate</option>
            <option value="noi">Cele mai noi</option>
          </Select>
        </div>

        {lista.length === 0 ? (
          idei.length === 0 ? (
            <EmptyState
              icon={Lightbulb}
              title="Fii printre primele organizații cu o idee"
              description="Spune-ne ce ți-ar ușura munca de fundraising. Ideile cu cele mai multe voturi ne ajută să alegem ce construim."
              action={
                <Button variant="primary" onClick={() => setPropune({ titlu: "" })}>
                  Propune o idee
                </Button>
              }
            />
          ) : cautare.trim() ? (
            <EmptyState
              icon={Search}
              title="Nicio idee nu se potrivește căutării"
              description="Poate nimeni nu a propus încă asta."
              action={
                <Button variant="primary" onClick={() => setPropune({ titlu: cautare.trim().slice(0, LIMITE.titluMax) })}>
                  Propune „{cautare.trim().slice(0, 40)}”
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={Lightbulb}
              title={`Nicio idee „${stare === "toate" ? "" : ETICHETE_STARE[stare]}” acum`}
              description={stare === "finalizat" ? "Prima idee finalizată apare aici. Propune tu una." : "Schimbă starea sau propune tu o idee nouă."}
              action={
                <Button variant="primary" onClick={() => setPropune({ titlu: "" })}>
                  Propune o idee
                </Button>
              }
            />
          )
        ) : (
          <>
            <ul className="space-y-2">
              {afisate.map((i) => (
                <RandIdee key={i.id} orgSlug={orgSlug} idee={i} evidentiata={evidentiata === i.id} laDeschide={() => setDeschisa(i)} laVot={aplicaVot} />
              ))}
            </ul>
            {taiat && (
              <div className="mt-3 text-center">
                <Button variant="secondary" onClick={() => setToateIdeile(true)}>
                  Vezi toate cele {lista.length} idei
                </Button>
              </div>
            )}
          </>
        )}

        <p className="mt-4 rounded-[var(--ci-radius-btn)] bg-[var(--ci-surface-2)] px-3.5 py-2.5 text-[12.5px] leading-relaxed text-[var(--ci-text-muted)]">
          <strong className="text-[var(--ci-text)]">Cum alegem ce facem:</strong> după trei criterii: câte organizații o cer, cât de mult ne ia și cât ajută la strângerea de fonduri. Voturile contează, dar nu decid singure. Primul răspuns îl primești în 5 zile lucrătoare.
        </p>

        {/* Un singur buton lipicios pe telefon, ca propunerea să fie mereu la îndemână */}
        <div className="sticky bottom-3 z-10 mt-4 sm:hidden">
          <Button variant="primary" size="lg" className="w-full justify-center shadow-lg" onClick={() => setPropune({ titlu: "" })}>
            <Lightbulb className="h-4 w-4" aria-hidden="true" /> Propune o idee
          </Button>
        </div>
      </section>

      {ultimeleFinalizate.length > 0 && (
        <section aria-labelledby="h-fin">
          <Card>
            <CardHeader title="Ultimele idei finalizate" subtitle="Propuse de ONG-uri și făcute de noi" />
            <ul className="space-y-2" id="h-fin">
              {ultimeleFinalizate.map((i) => (
                <li key={i.id}>
                  <button type="button" onClick={() => setDeschisa(i)} className="flex min-h-11 w-full items-center gap-3 rounded-[var(--ci-radius-btn)] p-2 text-left hover:bg-[var(--ci-surface-2)]">
                    <Check className="h-5 w-5 shrink-0 text-[var(--ci-green)]" aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-medium text-[var(--ci-text)]">{i.titlu}</span>
                      <span className="block text-[12px] text-[var(--ci-text-muted)]">
                        {i.categorie} · {dataScurta(i.finalizatLa ?? i.actualizatLa)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      )}

      {/* Ce am inovat */}
      <section ref={noutatiSectiune} aria-labelledby="h-noutati" className="scroll-mt-4">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 id="h-noutati" className="ci-display text-[16px] font-semibold text-[var(--ci-text)]">
              Ce am inovat în ultima perioadă
            </h2>
            <p className="text-[13px] text-[var(--ci-text-muted)]">Fiecare îmbunătățire adusă platformei apare aici, cu cele mai noi primele.</p>
          </div>
          {categoriiNoutati.length > 1 && (
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrează noutățile">
              <Chip activ={!catNoutati} onClick={() => setCatNoutati("")}>
                Toate
              </Chip>
              {categoriiNoutati.map((c) => (
                <Chip key={c} activ={catNoutati === c} onClick={() => setCatNoutati(c)}>
                  {c}
                </Chip>
              ))}
            </div>
          )}
        </div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {vizibile.map((n) => (
            <Card key={n.id} className="flex flex-col">
              <div className="flex flex-wrap items-center gap-1.5">
                {n.nou && (
                  <Badge tone="green" icon={false}>
                    Nou
                  </Badge>
                )}
                <Badge tone={TIP_NOUTATE[n.tip]!.ton} icon={false}>
                  {TIP_NOUTATE[n.tip]!.eticheta}
                </Badge>
                {n.dinPropunere && (
                  <Badge tone="purple" icon={false}>
                    Propusă de ONG-uri
                  </Badge>
                )}
                {n.ideeId && ideiAleMele.has(n.ideeId) && (
                  <Badge tone="green" icon={false}>
                    Ai cerut tu, am făcut
                  </Badge>
                )}
              </div>
              <p className="mt-2 text-[12px] text-[var(--ci-text-muted)]">
                {dataRo(n.data)} · {n.categorie}
              </p>
              <h3 className="ci-display mt-1 text-[15px] leading-snug font-semibold text-[var(--ci-text)]">{n.titlu}</h3>
              <p className="mt-1.5 flex-1 text-[13px] leading-relaxed text-[var(--ci-text-muted)]">{n.descriere}</p>
              {n.cumFolosesti && (
                <p className="mt-2 rounded-[var(--ci-radius-btn)] bg-[var(--ci-surface-2)] px-2.5 py-2 text-[12.5px] leading-relaxed text-[var(--ci-text)]">
                  <strong>Cum o folosești ca să strângi mai mult:</strong> {n.cumFolosesti}
                </p>
              )}
              {n.link && (
                <Link prefetch={false} href={`/${orgSlug}/crm/${n.link}`} className="mt-3 inline-flex min-h-9 items-center gap-1 text-[13px] font-medium text-[var(--ci-primary)] hover:underline">
                  Deschide <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              )}
            </Card>
          ))}
        </div>
        {noutatiAfisate.length > NOUTATI_INITIAL && (
          <div className="mt-3 text-center">
            <Button variant="secondary" onClick={() => setToateNoutatile((v) => !v)}>
              {toateNoutatile ? "Arată mai puține" : `Vezi toate cele ${noutatiAfisate.length} noutăți`}
            </Button>
          </div>
        )}
      </section>

      <Dialog open={!!deschisa} onClose={() => setDeschisa(null)} title={deschisa?.titlu ?? ""} width="max-w-xl">
        {deschisa && <DetaliuIdee orgSlug={orgSlug} idee={deschisa} laVot={aplicaVot} laRaportat={dupaRaportare} />}
      </Dialog>

      <Dialog open={!!propune} onClose={() => setPropune(null)} title="Propune o idee" width="max-w-xl">
        {propune && (
          <FormularPropunere
            orgSlug={orgSlug}
            existente={idei}
            titluInitial={propune.titlu}
            laTrimis={(i) => {
              setIdei((l) => [i, ...l]);
              setPropune(null);
              setMesaj("Mulțumim! Ideea e publicată și organizația ta i-a dat primul vot. Te anunțăm pe email când se schimbă starea ei.");
              setStare("toate");
              setSortare("noi");
              setCautare("");
              setEvidentiata(i.id);
              deruleaza(tabla.current);
            }}
            laDeschide={(i) => {
              setPropune(null);
              setDeschisa(i);
            }}
          />
        )}
      </Dialog>
    </div>
  );
}

function Chip({ activ, onClick, children }: { activ: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-pressed={activ} onClick={onClick} className={`min-h-9 rounded-full border px-3 py-1 text-[12.5px] font-medium transition ${activ ? "border-[var(--ci-primary)] bg-[var(--ci-primary)] text-white" : "border-[var(--ci-border)] text-[var(--ci-text-muted)] hover:bg-[var(--ci-surface-2)]"}`}>
      {children}
    </button>
  );
}

function ButonVot({ orgSlug, idee, laVot, laEroare, mare }: { orgSlug: string; idee: IdeeVizibila; laVot: (id: string, votat: boolean, voturi: number) => void; laEroare: (m: string) => void; mare?: boolean }) {
  const [pending, start] = useTransition();
  const inchisa = idee.stare === "finalizat";
  return (
    <button
      type="button"
      disabled={pending || inchisa}
      aria-pressed={idee.votatDeMine}
      aria-label={`Votează ideea: ${idee.titlu}`}
      title={idee.votatDeMine ? "Votat de organizația ta. Apasă ca să retragi votul." : "Votează în numele organizației tale"}
      onClick={(e) => {
        e.stopPropagation();
        laEroare("");
        const nou = !idee.votatDeMine;
        // Se vede imediat; dacă serverul refuză, revine la valoarea reală.
        laVot(idee.id, nou, Math.max(0, idee.voturi + (nou ? 1 : -1)));
        start(async () => {
          const r = await voteazaIdee(orgSlug, idee.id, nou).catch(() => ({ ok: false as const, eroare: "Nu am putut salva votul." }));
          if (r.ok && typeof r.voturi === "number") laVot(idee.id, nou, r.voturi);
          else {
            laVot(idee.id, !nou, idee.voturi);
            laEroare(("eroare" in r && r.eroare) || "Nu am putut salva votul.");
          }
        });
      }}
      className={`flex shrink-0 items-center justify-center rounded-[var(--ci-radius-btn)] border transition-colors disabled:opacity-60 ${mare ? "min-h-11 flex-row gap-2 px-4" : "min-h-[60px] w-16 flex-col py-1.5"} ${idee.votatDeMine ? "border-[var(--ci-primary)] bg-[var(--ci-primary)] text-white" : "border-[var(--ci-border)] bg-[var(--ci-surface)] text-[var(--ci-text-muted)] hover:border-[var(--ci-primary)] hover:text-[var(--ci-primary)]"}`}
    >
      <ChevronUp className="h-4 w-4" aria-hidden="true" />
      <span className="ci-tabular text-[14px] leading-tight font-bold">{idee.voturi}</span>
      <span className={mare ? "text-[13px] font-medium" : "text-[11px] leading-tight font-medium"}>{idee.votatDeMine ? (mare ? "Votat de organizația ta" : "Votat") : "Votează"}</span>
    </button>
  );
}

function RandIdee({ orgSlug, idee, evidentiata, laDeschide, laVot }: { orgSlug: string; idee: IdeeVizibila; evidentiata: boolean; laDeschide: () => void; laVot: (id: string, votat: boolean, voturi: number) => void }) {
  const [eroare, setEroare] = useState("");
  return (
    <li id={idee.id} className={`rounded-[var(--ci-radius-card)] border bg-[var(--ci-surface)] p-3 transition-shadow ${evidentiata ? "border-[var(--ci-primary)] ring-2 ring-[var(--ci-primary)]" : "border-[var(--ci-border)]"}`}>
      <div className="flex items-stretch gap-3">
        <ButonVot orgSlug={orgSlug} idee={idee} laVot={laVot} laEroare={setEroare} />
        <button type="button" onClick={laDeschide} className="min-w-0 flex-1 text-left">
          <span className="flex flex-wrap items-center gap-1.5">
            <Badge tone={TON_STARE[idee.stare]} icon={false}>
              {ETICHETE_STARE[idee.stare]}
            </Badge>
            <span className="text-[12px] text-[var(--ci-text-muted)]">{idee.categorie}</span>
            {idee.efort && <span className="text-[12px] text-[var(--ci-text-muted)]">· {ETICHETE_EFORT[idee.efort]}</span>}
            {idee.deMine && (
              <Badge tone="purple" icon={false}>
                Ideea ta
              </Badge>
            )}
          </span>
          <span className="mt-1 block text-[14.5px] font-semibold text-[var(--ci-text)]">{idee.titlu}</span>
          <span className="mt-0.5 line-clamp-2 block text-[13px] text-[var(--ci-text-muted)]">{idee.descriere}</span>
          <span className="mt-1 block text-[12px] text-[var(--ci-text-muted)]">
            {idee.autor ? `Propusă de ${idee.autor}` : "Propusă de o organizație din Alexandrit"} · actualizată {dataScurta(idee.actualizatLa)}
          </span>
        </button>
      </div>
      {eroare && (
        <p role="alert" className="mt-2 text-[12.5px] text-[var(--ci-red)]">
          {eroare}
        </p>
      )}
    </li>
  );
}

function DetaliuIdee({ orgSlug, idee, laVot, laRaportat }: { orgSlug: string; idee: IdeeVizibila; laVot: (id: string, votat: boolean, voturi: number) => void; laRaportat: (id: string) => void }) {
  const [eroareVot, setEroareVot] = useState("");
  const [raporteaza, setRaporteaza] = useState(false);
  const [motiv, setMotiv] = useState("");
  const [eroareRaportare, setEroareRaportare] = useState("");
  const [pending, start] = useTransition();

  function trimiteRaportarea() {
    setEroareRaportare("");
    start(async () => {
      const r = await raporteazaIdee(orgSlug, idee.id, motiv).catch(() => ({ ok: false as const, eroare: "Nu am putut trimite raportarea." }));
      if (r.ok) laRaportat(idee.id);
      else setEroareRaportare(("eroare" in r && r.eroare) || "Nu am putut trimite raportarea.");
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge tone={TON_STARE[idee.stare]} icon={false}>
          {ETICHETE_STARE[idee.stare]}
        </Badge>
        <span className="text-[12.5px] text-[var(--ci-text-muted)]">{idee.categorie}</span>
        {idee.efort && <span className="text-[12.5px] text-[var(--ci-text-muted)]">· {ETICHETE_EFORT[idee.efort]}</span>}
      </div>
      <div>
        <p className="text-[12px] font-semibold text-[var(--ci-text-muted)]">Situația descrisă</p>
        <p className="mt-0.5 text-[14px] leading-relaxed whitespace-pre-line text-[var(--ci-text)]">{idee.descriere}</p>
      </div>
      {idee.cumFaciAcum && (
        <div>
          <p className="text-[12px] font-semibold text-[var(--ci-text-muted)]">Cum se rezolvă acum</p>
          <p className="mt-0.5 text-[14px] leading-relaxed whitespace-pre-line text-[var(--ci-text)]">{idee.cumFaciAcum}</p>
        </div>
      )}
      {(idee.obiectiv || idee.frecventa) && (
        <p className="text-[12.5px] text-[var(--ci-text-muted)]">
          {idee.obiectiv ? <>Vrea să crească: <strong className="text-[var(--ci-text)]">{ETICHETE_OBIECTIV[idee.obiectiv] ?? idee.obiectiv}</strong></> : null}
          {idee.obiectiv && idee.frecventa ? " · " : ""}
          {idee.frecventa ? <>Problema apare: <strong className="text-[var(--ci-text)]">{(ETICHETE_FRECVENTA[idee.frecventa] ?? idee.frecventa).toLowerCase()}</strong></> : null}
        </p>
      )}
      {idee.raspunsEchipa && (
        <div className="rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] bg-[var(--ci-surface-2)] p-3">
          <p className="text-[12px] font-semibold text-[var(--ci-primary)]">Răspunsul echipei Alexandrit</p>
          <p className="mt-0.5 text-[13.5px] leading-relaxed whitespace-pre-line text-[var(--ci-text)]">{idee.raspunsEchipa}</p>
          {idee.stare === "nu_acum" && idee.reevaluareLa && <p className="mt-1.5 text-[12.5px] text-[var(--ci-text-muted)]">Ne uităm din nou la ea după {dataRo(idee.reevaluareLa)}.</p>}
        </div>
      )}
      <p className="text-[12px] text-[var(--ci-text-muted)]">
        {idee.autor ? `Propusă de ${idee.autor}` : "Propusă de o organizație din Alexandrit"} · {dataRo(idee.creatLa)}
        {idee.finalizatLa ? ` · finalizată pe ${dataRo(idee.finalizatLa)}` : ""}
      </p>
      {idee.stare !== "finalizat" ? (
        <div>
          <ButonVot orgSlug={orgSlug} idee={idee} laVot={laVot} laEroare={setEroareVot} mare />
          <p className="mt-1.5 text-[12px] text-[var(--ci-text-muted)]">Votul e al organizației tale; colegii tăi îl văd și ei.</p>
          {eroareVot && (
            <p role="alert" className="mt-1 text-[12.5px] text-[var(--ci-red)]">
              {eroareVot}
            </p>
          )}
        </div>
      ) : (
        <p className="text-[13px] text-[var(--ci-green)]">Gata, o poți folosi acum în platformă.</p>
      )}

      {!idee.deMine && (
        <div className="border-t border-[var(--ci-border)] pt-3">
          {!raporteaza ? (
            <button type="button" onClick={() => setRaporteaza(true)} className="inline-flex min-h-9 items-center gap-1.5 text-[12.5px] text-[var(--ci-text-muted)] hover:text-[var(--ci-text)] hover:underline">
              <Flag className="h-3.5 w-3.5" aria-hidden="true" /> Raportează această idee
            </button>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="raportare-motiv">De ce o raportezi? (opțional)</Label>
              <Textarea id="raportare-motiv" rows={2} value={motiv} maxLength={LIMITE.motivRaportareMax} onChange={(e) => setMotiv(e.target.value)} placeholder="ex. conține date personale ale unui donator" />
              <p className="text-[12px] text-[var(--ci-text-muted)]">Ideea se ascunde imediat și o verifică echipa noastră în 48 de ore.</p>
              {eroareRaportare && (
                <p role="alert" className="text-[12.5px] text-[var(--ci-red)]">
                  {eroareRaportare}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <Button variant="danger" loading={pending} onClick={trimiteRaportarea}>
                  Raportează și ascunde
                </Button>
                <Button variant="secondary" onClick={() => setRaporteaza(false)}>
                  Renunț
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FormularPropunere({ orgSlug, existente, titluInitial, laTrimis, laDeschide }: { orgSlug: string; existente: IdeeVizibila[]; titluInitial: string; laTrimis: (i: IdeeVizibila) => void; laDeschide: (i: IdeeVizibila) => void }) {
  const [v, setV] = useState({ titlu: titluInitial, descriere: "", cumFaciAcum: "", categorie: "", obiectiv: "", frecventa: "", afiseazaOrganizatia: true });
  const [erori, setErori] = useState<Record<string, string>>({});
  const [eroare, setEroare] = useState("");
  const [pending, start] = useTransition();
  // Înainte de a trimite, vezi dacă ideea există deja: mai bine un vot în plus decât o idee dublată.
  const similare = useMemo(() => ideiSimilare(v.titlu, existente.filter((i) => i.stare !== "nu_acum")), [v.titlu, existente]);

  function trimite(e: React.FormEvent) {
    e.preventDefault();
    setErori({});
    setEroare("");
    start(async () => {
      const r = await propuneIdee(orgSlug, v).catch(() => null);
      if (!r) return setEroare("Nu am putut trimite acum. Încearcă din nou: textul tău a rămas aici.");
      if (!r.ok) {
        setEroare(r.eroare);
        setErori(r.erori as Record<string, string>);
        return;
      }
      const acum = new Date().toISOString();
      laTrimis({
        id: r.id,
        titlu: v.titlu.replace(/\s+/g, " ").trim(),
        descriere: v.descriere.trim(),
        cumFaciAcum: v.cumFaciAcum.trim() || null,
        categorie: v.categorie || CATEGORIE_IMPLICITA,
        stare: "propus",
        efort: null,
        obiectiv: v.obiectiv,
        frecventa: v.frecventa,
        raspunsEchipa: null,
        reevaluareLa: null,
        voturi: 1,
        votatDeMine: true,
        deMine: true,
        autor: null,
        creatLa: acum,
        actualizatLa: acum,
        finalizatLa: null,
      });
    });
  }

  return (
    <form onSubmit={trimite} className="space-y-4" noValidate>
      <div>
        <Label htmlFor="idee-titlu">Ce ți-ar ușura munca?</Label>
        <Input id="idee-titlu" value={v.titlu} maxLength={LIMITE.titluMax} onChange={(e) => setV({ ...v, titlu: e.target.value })} placeholder="ex. Raport lunar automat pentru donatorii recurenți" aria-invalid={!!erori.titlu} />
        {erori.titlu && <p className="mt-1 text-[12.5px] text-[var(--ci-red)]">{erori.titlu}</p>}
        {similare.length > 0 && (
          <div className="mt-2 rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] bg-[var(--ci-surface-2)] p-3 text-[13px]">
            <p className="font-medium text-[var(--ci-text)]">Poate există deja o idee asemănătoare. Votează-o în loc să o dublezi:</p>
            <ul className="mt-1.5 space-y-1">
              {similare.map((s) => (
                <li key={s.id}>
                  <button type="button" onClick={() => laDeschide(s)} className="min-h-9 text-left text-[var(--ci-primary)] hover:underline">
                    {s.titlu} <span className="text-[var(--ci-text-muted)]">· {s.voturi} voturi</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <div>
        <Label htmlFor="idee-descriere">Povestește pe scurt situația</Label>
        <Textarea id="idee-descriere" rows={4} value={v.descriere} maxLength={LIMITE.descriereMax} onChange={(e) => setV({ ...v, descriere: e.target.value })} placeholder="ex. În fiecare lună refac manual raportul pentru donatori și pierd o zi." aria-invalid={!!erori.descriere} />
        {erori.descriere && <p className="mt-1 text-[12.5px] text-[var(--ci-red)]">{erori.descriere}</p>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="idee-obiectiv">Ce vrei să crești?</Label>
          <Select id="idee-obiectiv" value={v.obiectiv} onChange={(e) => setV({ ...v, obiectiv: e.target.value })} aria-invalid={!!erori.obiectiv}>
            <option value="">Alege…</option>
            {OBIECTIVE.map((o) => (
              <option key={o.cheie} value={o.cheie}>
                {o.eticheta}
              </option>
            ))}
          </Select>
          {erori.obiectiv && <p className="mt-1 text-[12.5px] text-[var(--ci-red)]">{erori.obiectiv}</p>}
        </div>
        <div>
          <Label htmlFor="idee-frecventa">Cât de des apare problema?</Label>
          <Select id="idee-frecventa" value={v.frecventa} onChange={(e) => setV({ ...v, frecventa: e.target.value })} aria-invalid={!!erori.frecventa}>
            <option value="">Alege…</option>
            {FRECVENTE.map((f) => (
              <option key={f.cheie} value={f.cheie}>
                {f.eticheta}
              </option>
            ))}
          </Select>
          {erori.frecventa && <p className="mt-1 text-[12.5px] text-[var(--ci-red)]">{erori.frecventa}</p>}
        </div>
      </div>
      <div>
        <Label htmlFor="idee-categorie">Categorie (opțional)</Label>
        <Select id="idee-categorie" value={v.categorie} onChange={(e) => setV({ ...v, categorie: e.target.value })} aria-invalid={!!erori.categorie}>
          <option value="">Nu știu / altceva</option>
          {CATEGORII.filter((c) => c !== CATEGORIE_IMPLICITA).map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
        {erori.categorie && <p className="mt-1 text-[12.5px] text-[var(--ci-red)]">{erori.categorie}</p>}
      </div>
      <div>
        <Label htmlFor="idee-acum">Cum rezolvi asta acum? (opțional)</Label>
        <Textarea id="idee-acum" rows={2} value={v.cumFaciAcum} maxLength={LIMITE.acumMax} onChange={(e) => setV({ ...v, cumFaciAcum: e.target.value })} placeholder="ex. facem manual, într-un Excel, o dată pe lună" aria-invalid={!!erori.cumFaciAcum} />
        {erori.cumFaciAcum && <p className="mt-1 text-[12.5px] text-[var(--ci-red)]">{erori.cumFaciAcum}</p>}
      </div>
      <label className="flex items-start gap-2.5 text-[13px] text-[var(--ci-text)]">
        <input type="checkbox" checked={v.afiseazaOrganizatia} onChange={(e) => setV({ ...v, afiseazaOrganizatia: e.target.checked })} className="mt-0.5 h-5 w-5 shrink-0" />
        <span>
          Arată numele organizației mele lângă idee
          <span className="mt-0.5 block text-[12px] text-[var(--ci-text-muted)]">Dacă nu, apare „Propusă de o organizație din Alexandrit”.</span>
        </span>
      </label>
      <p className="rounded-[var(--ci-radius-btn)] bg-[var(--ci-surface-2)] px-3 py-2.5 text-[12.5px] leading-relaxed text-[var(--ci-text-muted)]">
        Ideea ta (titlu, descriere, „cum rezolvi acum”) va fi vizibilă tuturor organizațiilor din Alexandrit și echipei noastre. Nu scrie date personale (nume, telefon, email, CNP) ale donatorilor, beneficiarilor sau colegilor, nici informații pe care nu vrei să le vadă alte ONG-uri. Nu numi persoane sau organizații în termeni negativi. Prenumele tău nu se afișează. Emailul tău îl vede doar echipa Alexandrit, ca să te anunțe când se schimbă starea ideii.{" "}
        <Link href="/gdpr" target="_blank" className="text-[var(--ci-primary)] underline">
          Politica de confidențialitate
        </Link>
      </p>
      {eroare && (
        <p role="alert" className="rounded-[var(--ci-radius-btn)] bg-[var(--ci-red-soft)] px-3 py-2 text-[13px] text-[var(--ci-red)]">
          {eroare}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button type="submit" variant="primary" size="lg" className="w-full justify-center sm:h-9 sm:w-auto" loading={pending}>
          Trimite ideea
        </Button>
      </div>
    </form>
  );
}
