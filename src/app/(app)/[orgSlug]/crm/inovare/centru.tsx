"use client";

import { ArrowRight, Check, ChevronUp, Lightbulb, Rocket, Search, Sparkles, ThumbsUp } from "lucide-react";
import Link from "next/link";
import { useMemo, useRef, useState, useTransition } from "react";

import { CATEGORII, ETICHETE_EFORT, ETICHETE_STARE, ideiSimilare, LIMITE, STARI, type Sortare, type StareIdee } from "@/lib/inovare/model";
import type { IdeeVizibila } from "@/lib/inovare/server";
import type { Inovatie } from "@/content/inovatii";

import { Badge, type StatusTone } from "../components/ui/badge";
import { Breadcrumb } from "../components/ui/breadcrumb";
import { Button } from "../components/ui/button";
import { Card, CardHeader } from "../components/ui/card";
import { Dialog } from "../components/ui/dialog";
import { Input, Label, Select, Textarea } from "../components/ui/input";
import { EmptyState } from "../components/ui/states";
import { propuneIdee, voteazaIdee } from "./actions";

type Noutate = Inovatie & { nou: boolean };

const TON_STARE: Record<StareIdee, StatusTone> = { propus: "neutral", in_planificare: "blue", in_dezvoltare: "orange", finalizat: "green", nu_acum: "neutral" };
const TIP_NOUTATE: Record<string, { eticheta: string; ton: StatusTone }> = { nou: { eticheta: "Funcționalitate nouă", ton: "blue" }, imbunatatire: { eticheta: "Îmbunătățire", ton: "teal" }, reparat: { eticheta: "Reparat", ton: "neutral" } };
const dataRo = (iso: string) => new Intl.DateTimeFormat("ro-RO", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Bucharest" }).format(new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso));
const dataScurta = (iso: string) => new Intl.DateTimeFormat("ro-RO", { day: "numeric", month: "short", timeZone: "Europe/Bucharest" }).format(new Date(iso));
const NOUTATI_INITIAL = 6;

export function CentruInovare({ orgSlug, idei: initiale, noutati }: { orgSlug: string; idei: IdeeVizibila[]; noutati: Noutate[] }) {
  const [idei, setIdei] = useState(initiale);
  const [stare, setStare] = useState<StareIdee | "toate">("toate");
  const [sortare, setSortare] = useState<Sortare>("voturi");
  const [cautare, setCautare] = useState("");
  const [deschisa, setDeschisa] = useState<IdeeVizibila | null>(null);
  const [propune, setPropune] = useState(false);
  const [toateNoutatile, setToateNoutatile] = useState(false);
  const [catNoutati, setCatNoutati] = useState("");
  const [mesaj, setMesaj] = useState("");
  const tabla = useRef<HTMLDivElement>(null);
  const noutatiSectiune = useRef<HTMLDivElement>(null);

  const numara = (s: StareIdee | "toate") => (s === "toate" ? idei.length : idei.filter((i) => i.stare === s).length);
  const lista = useMemo(() => {
    const q = cautare.trim().toLowerCase();
    return idei
      .filter((i) => (stare === "toate" ? true : i.stare === stare) && (!q || `${i.titlu} ${i.descriere} ${i.categorie}`.toLowerCase().includes(q)))
      .sort((a, b) => (sortare === "voturi" ? b.voturi - a.voturi || b.creatLa.localeCompare(a.creatLa) : b.creatLa.localeCompare(a.creatLa)));
  }, [idei, stare, sortare, cautare]);

  const celeMaiVotate = useMemo(() => idei.filter((i) => i.stare !== "finalizat" && i.stare !== "nu_acum").sort((a, b) => b.voturi - a.voturi).slice(0, 3), [idei]);
  const ultimeleFinalizate = useMemo(() => idei.filter((i) => i.stare === "finalizat").sort((a, b) => (b.finalizatLa ?? b.actualizatLa).localeCompare(a.finalizatLa ?? a.actualizatLa)).slice(0, 3), [idei]);
  const totalVoturi = idei.reduce((s, i) => s + i.voturi, 0);

  const categoriiNoutati = [...new Set(noutati.map((n) => n.categorie))];
  const noutatiAfisate = noutati.filter((n) => !catNoutati || n.categorie === catNoutati);
  const vizibile = toateNoutatile ? noutatiAfisate : noutatiAfisate.slice(0, NOUTATI_INITIAL);

  function aplicaVot(id: string, votat: boolean, voturi: number) {
    setIdei((l) => l.map((i) => (i.id === id ? { ...i, votatDeMine: votat, voturi } : i)));
    setDeschisa((d) => (d && d.id === id ? { ...d, votatDeMine: votat, voturi } : d));
  }

  return (
    <div className="mx-auto max-w-[1100px] space-y-6">
      <Breadcrumb items={[{ label: "Platformă", href: `/${orgSlug}/crm/instrumente` }, { label: "Centrul de inovare" }]} />

      <Card className="bg-[var(--ci-primary-soft)]">
        <div className="max-w-2xl">
          <p className="flex items-center gap-1.5 text-[12px] font-semibold tracking-wide text-[var(--ci-primary)] uppercase">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> Centrul de inovare în fundraising
          </p>
          <h1 className="ci-display mt-1.5 text-xl font-bold text-[var(--ci-text)]">Construim Alexandrit împreună cu ONG-urile</h1>
          <p className="mt-1.5 text-[14px] leading-relaxed text-[var(--ci-text-muted)]">
            Ai o idee care ți-ar ușura munca de fundraising? Propune-o aici. Celelalte organizații votează, iar ce adună cele mai multe voturi intră în planul nostru. Mai jos vezi și tot ce am făcut deja.
          </p>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <Pas icon={<Lightbulb className="h-5 w-5" />} titlu="Propune" text="Spune-ne ce ar merita adăugat" actiune="Propune o idee" onClick={() => setPropune(true)} principal />
          <Pas icon={<ThumbsUp className="h-5 w-5" />} titlu="Votează" text={`${idei.length} idei, ${totalVoturi} voturi până acum`} actiune="Vezi ideile" onClick={() => tabla.current?.scrollIntoView({ behavior: "smooth", block: "start" })} />
          <Pas icon={<Rocket className="h-5 w-5" />} titlu="Descoperă" text={`${noutati.length} noutăți, cele mai noi primele`} actiune="Vezi noutățile" onClick={() => noutatiSectiune.current?.scrollIntoView({ behavior: "smooth", block: "start" })} />
        </div>
      </Card>

      {mesaj && (
        <p role="status" className="rounded-[var(--ci-radius-btn)] bg-[var(--ci-green-soft)] px-3.5 py-2.5 text-[13px] text-[var(--ci-green)]">
          {mesaj}
        </p>
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
              </div>
              <p className="mt-2 text-[12px] text-[var(--ci-text-faint)]">
                {dataRo(n.data)} · {n.categorie}
              </p>
              <h3 className="ci-display mt-1 text-[15px] leading-snug font-semibold text-[var(--ci-text)]">{n.titlu}</h3>
              <p className="mt-1.5 flex-1 text-[13px] leading-relaxed text-[var(--ci-text-muted)]">{n.descriere}</p>
              {n.link && (
                <Link prefetch={false} href={`/${orgSlug}/crm/${n.link}`} className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-[var(--ci-primary)] hover:underline">
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

      {/* Statistici */}
      {(celeMaiVotate.length > 0 || ultimeleFinalizate.length > 0) && (
        <section aria-labelledby="h-stat" className="grid gap-3 md:grid-cols-2">
          <h2 id="h-stat" className="sr-only">
            Statistici
          </h2>
          <Card>
            <CardHeader title="Cele mai votate idei" subtitle="Ce își doresc cel mai mult ONG-urile acum" />
            {celeMaiVotate.length === 0 ? (
              <p className="text-[13px] text-[var(--ci-text-muted)]">Încă nu sunt idei de votat.</p>
            ) : (
              <ul className="space-y-2">
                {celeMaiVotate.map((i) => (
                  <li key={i.id}>
                    <button type="button" onClick={() => setDeschisa(i)} className="flex w-full items-center gap-3 rounded-[var(--ci-radius-btn)] p-2 text-left hover:bg-[var(--ci-surface-2)]">
                      <span className="ci-tabular w-10 shrink-0 text-center text-[15px] font-bold text-[var(--ci-primary)]">{i.voturi}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13.5px] font-medium text-[var(--ci-text)]">{i.titlu}</span>
                        <span className="block text-[12px] text-[var(--ci-text-muted)]">{ETICHETE_STARE[i.stare]}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card>
            <CardHeader title="Ultimele idei finalizate" subtitle="Propuse de ONG-uri și făcute de noi" />
            {ultimeleFinalizate.length === 0 ? (
              <p className="text-[13px] text-[var(--ci-text-muted)]">Prima idee finalizată apare aici.</p>
            ) : (
              <ul className="space-y-2">
                {ultimeleFinalizate.map((i) => (
                  <li key={i.id}>
                    <button type="button" onClick={() => setDeschisa(i)} className="flex w-full items-center gap-3 rounded-[var(--ci-radius-btn)] p-2 text-left hover:bg-[var(--ci-surface-2)]">
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
            )}
          </Card>
        </section>
      )}

      {/* Ideile */}
      <section ref={tabla} aria-labelledby="h-idei" className="scroll-mt-4">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 id="h-idei" className="ci-display text-[16px] font-semibold text-[var(--ci-text)]">
              Ideile ONG-urilor
            </h2>
            <p className="text-[13px] text-[var(--ci-text-muted)]">Un vot pe organizație pentru fiecare idee. Poți retrage votul oricând.</p>
          </div>
          <Button variant="primary" onClick={() => setPropune(true)}>
            <Lightbulb className="h-4 w-4" aria-hidden="true" /> Propune o idee
          </Button>
        </div>

        <div role="tablist" aria-label="Starea ideilor" className="ci-scrollbar flex gap-1 overflow-x-auto border-b border-[var(--ci-border)]">
          {([{ cheie: "toate" as const, eticheta: "Toate" }, ...STARI]).map((s) => (
            <button
              key={s.cheie}
              type="button"
              role="tab"
              aria-selected={stare === s.cheie}
              onClick={() => setStare(s.cheie)}
              className={`shrink-0 border-b-2 px-3.5 py-2.5 text-[13px] font-medium whitespace-nowrap transition-colors ${stare === s.cheie ? "border-[var(--ci-primary)] text-[var(--ci-text)]" : "border-transparent text-[var(--ci-text-muted)] hover:text-[var(--ci-text)]"}`}
            >
              {s.eticheta} <span className="ci-tabular text-[var(--ci-text-faint)]">{numara(s.cheie)}</span>
            </button>
          ))}
        </div>

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
          <EmptyState
            icon={Lightbulb}
            title={idei.length === 0 ? "Fii prima organizație cu o idee" : "Nicio idee pentru filtrele alese"}
            description={idei.length === 0 ? "Spune-ne ce ți-ar ușura munca de fundraising. Ce propui aici poate ajunge în platformă." : "Schimbă starea sau căutarea, sau propune tu ideea."}
            action={
              <Button variant="primary" onClick={() => setPropune(true)}>
                Propune o idee
              </Button>
            }
          />
        ) : (
          <ul className="space-y-2">
            {lista.map((i) => (
              <RandIdee key={i.id} orgSlug={orgSlug} idee={i} laDeschide={() => setDeschisa(i)} laVot={aplicaVot} />
            ))}
          </ul>
        )}
      </section>

      <Dialog open={!!deschisa} onClose={() => setDeschisa(null)} title={deschisa?.titlu ?? ""} width="max-w-xl">
        {deschisa && <DetaliuIdee orgSlug={orgSlug} idee={deschisa} laVot={aplicaVot} />}
      </Dialog>

      <Dialog open={propune} onClose={() => setPropune(false)} title="Propune o idee" width="max-w-xl">
        {propune && (
          <FormularPropunere
            orgSlug={orgSlug}
            existente={idei}
            laTrimis={(i) => {
              setIdei((l) => [i, ...l]);
              setPropune(false);
              setMesaj("Mulțumim! Ideea ta a fost trimisă și organizația ta a primit primul vot. Te anunțăm pe email când se schimbă starea ei.");
              setStare("toate");
              setSortare("noi");
              tabla.current?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            laDeschide={(i) => {
              setPropune(false);
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
    <button type="button" aria-pressed={activ} onClick={onClick} className={`rounded-full border px-3 py-1 text-[12.5px] font-medium transition ${activ ? "border-[var(--ci-primary)] bg-[var(--ci-primary)] text-white" : "border-[var(--ci-border)] text-[var(--ci-text-muted)] hover:bg-[var(--ci-surface-2)]"}`}>
      {children}
    </button>
  );
}

function Pas({ icon, titlu, text, actiune, onClick, principal }: { icon: React.ReactNode; titlu: string; text: string; actiune: string; onClick: () => void; principal?: boolean }) {
  return (
    <div className="flex flex-col rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] bg-[var(--ci-surface)] p-4">
      <span className="text-[var(--ci-primary)]" aria-hidden="true">
        {icon}
      </span>
      <p className="ci-display mt-2 text-[15px] font-semibold text-[var(--ci-text)]">{titlu}</p>
      <p className="mt-0.5 flex-1 text-[12.5px] text-[var(--ci-text-muted)]">{text}</p>
      <Button variant={principal ? "primary" : "secondary"} size="sm" className="mt-3 self-start" onClick={onClick}>
        {actiune}
      </Button>
    </div>
  );
}

function ButonVot({ orgSlug, idee, laVot, mare }: { orgSlug: string; idee: IdeeVizibila; laVot: (id: string, votat: boolean, voturi: number) => void; mare?: boolean }) {
  const [pending, start] = useTransition();
  const [eroare, setEroare] = useState("");
  const inchisa = idee.stare === "finalizat";
  return (
    <div className={mare ? "" : "w-14 shrink-0 text-center"}>
      <button
        type="button"
        disabled={pending || inchisa}
        aria-pressed={idee.votatDeMine}
        aria-label={idee.votatDeMine ? `Retrage votul organizației tale (${idee.voturi} voturi)` : `Votează (${idee.voturi} voturi)`}
        onClick={(e) => {
          e.stopPropagation();
          setEroare("");
          const nou = !idee.votatDeMine;
          // Se vede imediat; dacă serverul refuză, revine la valoarea reală.
          laVot(idee.id, nou, Math.max(0, idee.voturi + (nou ? 1 : -1)));
          start(async () => {
            const r = await voteazaIdee(orgSlug, idee.id, nou).catch(() => ({ ok: false as const, eroare: "Nu am putut salva votul." }));
            if (r.ok && typeof r.voturi === "number") laVot(idee.id, nou, r.voturi);
            else {
              laVot(idee.id, !nou, idee.voturi);
              setEroare(("eroare" in r && r.eroare) || "Nu am putut salva votul.");
            }
          });
        }}
        className={`flex ${mare ? "flex-row gap-2 px-4" : "w-14 flex-col"} items-center justify-center rounded-[var(--ci-radius-btn)] border py-2 transition-colors disabled:opacity-60 ${idee.votatDeMine ? "border-[var(--ci-primary)] bg-[var(--ci-primary)] text-white" : "border-[var(--ci-border)] bg-[var(--ci-surface)] text-[var(--ci-text-muted)] hover:border-[var(--ci-primary)] hover:text-[var(--ci-primary)]"}`}
      >
        <ChevronUp className="h-4 w-4" aria-hidden="true" />
        <span className="ci-tabular text-[14px] font-bold">{idee.voturi}</span>
        {mare && <span className="text-[13px] font-medium">{idee.votatDeMine ? "Votat de organizația ta" : "Votează"}</span>}
      </button>
      {eroare && (
        <p role="alert" className="mt-1 max-w-52 text-[11.5px] text-[var(--ci-red)]">
          {eroare}
        </p>
      )}
    </div>
  );
}

function RandIdee({ orgSlug, idee, laDeschide, laVot }: { orgSlug: string; idee: IdeeVizibila; laDeschide: () => void; laVot: (id: string, votat: boolean, voturi: number) => void }) {
  return (
    <li className="flex items-stretch gap-3 rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] bg-[var(--ci-surface)] p-3">
      <ButonVot orgSlug={orgSlug} idee={idee} laVot={laVot} />
      <button type="button" onClick={laDeschide} className="min-w-0 flex-1 text-left">
        <span className="flex flex-wrap items-center gap-1.5">
          <Badge tone={TON_STARE[idee.stare]} icon={false}>
            {ETICHETE_STARE[idee.stare]}
          </Badge>
          <span className="text-[12px] text-[var(--ci-text-muted)]">{idee.categorie}</span>
          {idee.efort && <span className="text-[12px] text-[var(--ci-text-faint)]">· {ETICHETE_EFORT[idee.efort]}</span>}
          {idee.deMine && (
            <Badge tone="purple" icon={false}>
              Ideea ta
            </Badge>
          )}
        </span>
        <span className="mt-1 block text-[14.5px] font-semibold text-[var(--ci-text)]">{idee.titlu}</span>
        <span className="mt-0.5 line-clamp-2 block text-[13px] text-[var(--ci-text-muted)]">{idee.descriere}</span>
        <span className="mt-1 block text-[11.5px] text-[var(--ci-text-faint)]">
          {idee.autor ? `Propusă de ${idee.autor}` : "Propusă de o organizație din Alexandrit"} · actualizată {dataScurta(idee.actualizatLa)}
        </span>
      </button>
    </li>
  );
}

function DetaliuIdee({ orgSlug, idee, laVot }: { orgSlug: string; idee: IdeeVizibila; laVot: (id: string, votat: boolean, voturi: number) => void }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge tone={TON_STARE[idee.stare]} icon={false}>
          {ETICHETE_STARE[idee.stare]}
        </Badge>
        <span className="text-[12.5px] text-[var(--ci-text-muted)]">{idee.categorie}</span>
        {idee.efort && <span className="text-[12.5px] text-[var(--ci-text-faint)]">· {ETICHETE_EFORT[idee.efort]}</span>}
      </div>
      <div>
        <p className="text-[12px] font-semibold text-[var(--ci-text-muted)]">Ce problemă rezolvă</p>
        <p className="mt-0.5 text-[14px] leading-relaxed whitespace-pre-line text-[var(--ci-text)]">{idee.descriere}</p>
      </div>
      {idee.cumFaciAcum && (
        <div>
          <p className="text-[12px] font-semibold text-[var(--ci-text-muted)]">Cum se rezolvă acum</p>
          <p className="mt-0.5 text-[14px] leading-relaxed whitespace-pre-line text-[var(--ci-text)]">{idee.cumFaciAcum}</p>
        </div>
      )}
      {idee.raspunsEchipa && (
        <div className="rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] bg-[var(--ci-surface-2)] p-3">
          <p className="text-[12px] font-semibold text-[var(--ci-primary)]">Răspunsul echipei Alexandrit</p>
          <p className="mt-0.5 text-[13.5px] leading-relaxed whitespace-pre-line text-[var(--ci-text)]">{idee.raspunsEchipa}</p>
        </div>
      )}
      <p className="text-[12px] text-[var(--ci-text-faint)]">
        {idee.autor ? `Propusă de ${idee.autor}` : "Propusă de o organizație din Alexandrit"} · {dataRo(idee.creatLa)}
        {idee.finalizatLa ? ` · finalizată pe ${dataRo(idee.finalizatLa)}` : ""}
      </p>
      {idee.stare !== "finalizat" ? <ButonVot orgSlug={orgSlug} idee={idee} laVot={laVot} mare /> : <p className="text-[13px] text-[var(--ci-green)]">Gata: o poți folosi în platformă.</p>}
    </div>
  );
}

function FormularPropunere({ orgSlug, existente, laTrimis, laDeschide }: { orgSlug: string; existente: IdeeVizibila[]; laTrimis: (i: IdeeVizibila) => void; laDeschide: (i: IdeeVizibila) => void }) {
  const [v, setV] = useState({ titlu: "", descriere: "", cumFaciAcum: "", categorie: "", afiseazaOrganizatia: true });
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
      if (!r) return setEroare("Nu am putut trimite acum. Încearcă din nou.");
      if (!r.ok) {
        setEroare(r.eroare);
        setErori(r.erori as Record<string, string>);
        return;
      }
      const acum = new Date().toISOString();
      laTrimis({ id: r.id, titlu: v.titlu.trim(), descriere: v.descriere.trim(), cumFaciAcum: v.cumFaciAcum.trim() || null, categorie: v.categorie, stare: "propus", efort: null, raspunsEchipa: null, voturi: 1, votatDeMine: true, deMine: true, autor: null, creatLa: acum, actualizatLa: acum, finalizatLa: null });
    });
  }

  return (
    <form onSubmit={trimite} className="space-y-4" noValidate>
      <div>
        <Label htmlFor="idee-categorie">Categorie</Label>
        <Select id="idee-categorie" value={v.categorie} onChange={(e) => setV({ ...v, categorie: e.target.value })} aria-invalid={!!erori.categorie}>
          <option value="">Alege categoria…</option>
          {CATEGORII.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
        {erori.categorie && <p className="mt-1 text-[12.5px] text-[var(--ci-red)]">{erori.categorie}</p>}
      </div>
      <div>
        <Label htmlFor="idee-titlu">Titlul ideii</Label>
        <Input id="idee-titlu" value={v.titlu} maxLength={LIMITE.titluMax} onChange={(e) => setV({ ...v, titlu: e.target.value })} placeholder="ex. Raport lunar automat pentru donatorii recurenți" aria-invalid={!!erori.titlu} />
        {erori.titlu && <p className="mt-1 text-[12.5px] text-[var(--ci-red)]">{erori.titlu}</p>}
        {similare.length > 0 && (
          <div className="mt-2 rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] bg-[var(--ci-surface-2)] p-3 text-[13px]">
            <p className="font-medium text-[var(--ci-text)]">Poate există deja o idee asemănătoare. Votează-o în loc să o dublezi:</p>
            <ul className="mt-1.5 space-y-1">
              {similare.map((s) => (
                <li key={s.id}>
                  <button type="button" onClick={() => laDeschide(s)} className="text-left text-[var(--ci-primary)] hover:underline">
                    {s.titlu} <span className="text-[var(--ci-text-faint)]">· {s.voturi} voturi</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <div>
        <Label htmlFor="idee-descriere">Ce problemă rezolvă?</Label>
        <Textarea id="idee-descriere" rows={4} value={v.descriere} maxLength={LIMITE.descriereMax} onChange={(e) => setV({ ...v, descriere: e.target.value })} placeholder="Descrie situația din organizația ta și ce ți-ar ușura munca." aria-invalid={!!erori.descriere} />
        {erori.descriere && <p className="mt-1 text-[12.5px] text-[var(--ci-red)]">{erori.descriere}</p>}
      </div>
      <div>
        <Label htmlFor="idee-acum">Cum rezolvi asta acum? (opțional)</Label>
        <Textarea id="idee-acum" rows={2} value={v.cumFaciAcum} maxLength={LIMITE.acumMax} onChange={(e) => setV({ ...v, cumFaciAcum: e.target.value })} placeholder="ex. facem manual, într-un Excel, o dată pe lună" />
      </div>
      <label className="flex items-start gap-2.5 text-[13px] text-[var(--ci-text)]">
        <input type="checkbox" checked={v.afiseazaOrganizatia} onChange={(e) => setV({ ...v, afiseazaOrganizatia: e.target.checked })} className="mt-0.5 h-5 w-5 shrink-0" />
        <span>Afișează numele organizației mele lângă idee. Dacă nu, apare „Propusă de o organizație din Alexandrit”. Adresa ta de email nu se vede niciodată; o folosim doar ca să te anunțăm când se schimbă starea ideii.</span>
      </label>
      {eroare && (
        <p role="alert" className="rounded-[var(--ci-radius-btn)] bg-[var(--ci-red-soft)] px-3 py-2 text-[13px] text-[var(--ci-red)]">
          {eroare}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button type="submit" variant="primary" loading={pending}>
          Trimite ideea
        </Button>
      </div>
    </form>
  );
}
