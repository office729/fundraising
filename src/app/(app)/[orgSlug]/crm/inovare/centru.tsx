"use client";

import { ArrowRight, Check, ChevronUp, Flag, Lightbulb, Search, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import { INOVARE_UI_DICT } from "@/lib/i18n/dictionaries/inovare-ui";
import {
  CATEGORII,
  CATEGORIE_IMPLICITA,
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
import { useLocale } from "../lib/locale-context";
import { propuneIdee, raporteazaIdee, voteazaIdee } from "./actions";

type Noutate = Inovatie & { nou: boolean };
type Dict = (typeof INOVARE_UI_DICT)["ro"] | (typeof INOVARE_UI_DICT)["en"];

const TON_STARE: Record<StareIdee, StatusTone> = { propus: "neutral", vazuta: "teal", in_planificare: "blue", in_dezvoltare: "orange", finalizat: "green", nu_acum: "neutral" };
const TON_TIP_NOUTATE: Record<string, StatusTone> = { nou: "blue", imbunatatire: "teal", reparat: "neutral" };
const dataLunga = (iso: string, numere: string) => new Intl.DateTimeFormat(numere, { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Bucharest" }).format(new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso));
const dataScurta = (iso: string, numere: string) => new Intl.DateTimeFormat(numere, { day: "numeric", month: "short", timeZone: "Europe/Bucharest" }).format(new Date(iso));
const NOUTATI_INITIAL = 6;
const IDEI_INITIAL = 8;
// Statistica din antet apare doar când e ce arăta; „0 idei, 0 voturi" descurajează.
const PRAG_STATISTICI = 5;

const deruleaza = (el: HTMLElement | null) => el?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });

export function CentruInovare({ orgSlug, idei: initiale, noutati }: { orgSlug: string; idei: IdeeVizibila[]; noutati: Noutate[] }) {
  const d = INOVARE_UI_DICT[useLocale()];
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
      .filter((i) => (stare === "toate" ? true : i.stare === stare) && (!q || `${i.titlu} ${i.descriere} ${i.categorie} ${d.categorii[i.categorie] ?? ""}`.toLowerCase().includes(q)))
      .sort((a, b) => (sortare === "voturi" ? b.voturi - a.voturi || b.creatLa.localeCompare(a.creatLa) : b.creatLa.localeCompare(a.creatLa)));
  }, [idei, stare, sortare, cautare, d]);
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
    setDeschisa((x) => (x && x.id === id ? { ...x, votatDeMine: votat, voturi } : x));
  }

  function dupaRaportare(id: string) {
    setIdei((l) => l.filter((i) => i.id !== id));
    setDeschisa(null);
    setMesaj(d.mesajRaportata);
  }

  return (
    <div className="mx-auto max-w-[1100px] space-y-6">
      <Breadcrumb items={[{ label: d.breadcrumbPlatforma, href: `/${orgSlug}/crm/instrumente` }, { label: d.breadcrumbCentru }]} />

      <Card className="bg-[var(--ci-primary-soft)]">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <p className="flex items-center gap-1.5 text-[12px] font-semibold tracking-wide text-[var(--ci-primary)] uppercase">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> {d.eyebrow}
            </p>
            <h1 className="ci-display mt-1.5 text-xl font-bold text-[var(--ci-text)]">{d.titlu}</h1>
            <p className="mt-1.5 text-[14px] leading-relaxed text-[var(--ci-text-muted)]">{d.intro}</p>
            {idei.length >= PRAG_STATISTICI && <p className="mt-2 text-[12.5px] text-[var(--ci-text-muted)]">{d.statistica(idei.length, totalVoturi)}</p>}
          </div>
          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            <Button variant="primary" size="lg" className="w-full justify-center sm:h-9 sm:w-auto" onClick={() => setPropune({ titlu: "" })}>
              <Lightbulb className="h-4 w-4" aria-hidden="true" /> {d.propune}
            </Button>
            <Button variant="secondary" size="lg" className="w-full justify-center sm:h-9 sm:w-auto" onClick={() => deruleaza(noutatiSectiune.current)}>
              {d.vezi}
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
            {d.ideiTitlu}
          </h2>
          <p className="text-[13px] text-[var(--ci-text-muted)]">{d.ideiSubtitlu}</p>
          {(ideileMele > 0 || voturileMele > 0 || deVotat >= 3) && (
            <p className="mt-1.5 text-[12.5px] text-[var(--ci-text-muted)]">
              {d.ideileTale} <strong className="text-[var(--ci-text)]">{ideileMele}</strong> · {d.voturileOrg} <strong className="text-[var(--ci-text)]">{voturileMele}</strong>
              {voturileMele === 0 && deVotat >= 3 ? <span className="text-[var(--ci-primary)]">{d.nuAVotat}</span> : null}
            </p>
          )}
        </div>

        <div role="group" aria-label={d.starea} className="ci-scrollbar flex gap-1.5 overflow-x-auto pb-1">
          {([{ cheie: "toate" as const, eticheta: d.toate }, ...STARI.map((s) => ({ cheie: s.cheie, eticheta: d.stari[s.cheie]?.eticheta ?? s.eticheta }))]).map((s) => (
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
        {stare !== "toate" && <p className="mt-2 text-[12.5px] text-[var(--ci-text-muted)]">{d.stari[stare]?.descriere}</p>}

        <div className="my-3 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--ci-text-faint)]" aria-hidden="true" />
            <Input value={cautare} onChange={(e) => setCautare(e.target.value)} placeholder={d.cauta} aria-label={d.cautaAria} className="pl-9" />
          </div>
          <Select value={sortare} onChange={(e) => setSortare(e.target.value as Sortare)} aria-label={d.sorteaza} className="w-auto min-w-[170px]">
            <option value="voturi">{d.celeMaiVotate}</option>
            <option value="noi">{d.celeMaiNoi}</option>
          </Select>
        </div>

        {lista.length === 0 ? (
          idei.length === 0 ? (
            <EmptyState
              icon={Lightbulb}
              title={d.gol.titlu}
              description={d.gol.desc}
              action={
                <Button variant="primary" onClick={() => setPropune({ titlu: "" })}>
                  {d.propune}
                </Button>
              }
            />
          ) : cautare.trim() ? (
            <EmptyState
              icon={Search}
              title={d.faraRezultate.titlu}
              description={d.faraRezultate.desc}
              action={
                <Button variant="primary" onClick={() => setPropune({ titlu: cautare.trim().slice(0, LIMITE.titluMax) })}>
                  {d.faraRezultate.propune(cautare.trim().slice(0, 40))}
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={Lightbulb}
              title={d.nicioStare(stare === "toate" ? "" : (d.stari[stare]?.eticheta ?? ""))}
              description={stare === "finalizat" ? d.nicioStareDesc.finalizat : d.nicioStareDesc.alta}
              action={
                <Button variant="primary" onClick={() => setPropune({ titlu: "" })}>
                  {d.propune}
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
                  {d.veziToate(lista.length)}
                </Button>
              </div>
            )}
          </>
        )}

        <p className="mt-4 rounded-[var(--ci-radius-btn)] bg-[var(--ci-surface-2)] px-3.5 py-2.5 text-[12.5px] leading-relaxed text-[var(--ci-text-muted)]">
          <strong className="text-[var(--ci-text)]">{d.cumAlegem}</strong>
          {d.cumAlegemText}
        </p>

        {/* Un singur buton lipicios pe telefon, ca propunerea să fie mereu la îndemână */}
        <div className="sticky bottom-3 z-10 mt-4 sm:hidden">
          <Button variant="primary" size="lg" className="w-full justify-center shadow-lg" onClick={() => setPropune({ titlu: "" })}>
            <Lightbulb className="h-4 w-4" aria-hidden="true" /> {d.propune}
          </Button>
        </div>
      </section>

      {ultimeleFinalizate.length > 0 && (
        <section aria-labelledby="h-fin">
          <Card>
            <CardHeader title={d.ultimeleTitlu} subtitle={d.ultimeleSubtitlu} />
            <ul className="space-y-2" id="h-fin">
              {ultimeleFinalizate.map((i) => (
                <li key={i.id}>
                  <button type="button" onClick={() => setDeschisa(i)} className="flex min-h-11 w-full items-center gap-3 rounded-[var(--ci-radius-btn)] p-2 text-left hover:bg-[var(--ci-surface-2)]">
                    <Check className="h-5 w-5 shrink-0 text-[var(--ci-green)]" aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-medium text-[var(--ci-text)]">{i.titlu}</span>
                      <span className="block text-[12px] text-[var(--ci-text-muted)]">
                        {d.categorii[i.categorie] ?? i.categorie} · {dataScurta(i.finalizatLa ?? i.actualizatLa, d.numere)}
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
              {d.inovatTitlu}
            </h2>
            <p className="text-[13px] text-[var(--ci-text-muted)]">{d.inovatSubtitlu}</p>
          </div>
          {categoriiNoutati.length > 1 && (
            <div className="flex flex-wrap gap-1.5" role="group" aria-label={d.filtreazaNoutati}>
              <Chip activ={!catNoutati} onClick={() => setCatNoutati("")}>
                {d.toate}
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
                    {d.nou}
                  </Badge>
                )}
                <Badge tone={TON_TIP_NOUTATE[n.tip] ?? "neutral"} icon={false}>
                  {d.tipNoutate[n.tip] ?? n.tip}
                </Badge>
                {n.dinPropunere && (
                  <Badge tone="purple" icon={false}>
                    {d.propusaDeOng}
                  </Badge>
                )}
                {n.ideeId && ideiAleMele.has(n.ideeId) && (
                  <Badge tone="green" icon={false}>
                    {d.aiCerut}
                  </Badge>
                )}
              </div>
              <p className="mt-2 text-[12px] text-[var(--ci-text-muted)]">
                {dataLunga(n.data, d.numere)} · {n.categorie}
              </p>
              <h3 className="ci-display mt-1 text-[15px] leading-snug font-semibold text-[var(--ci-text)]">{n.titlu}</h3>
              <p className="mt-1.5 flex-1 text-[13px] leading-relaxed text-[var(--ci-text-muted)]">{n.descriere}</p>
              {n.cumFolosesti && (
                <p className="mt-2 rounded-[var(--ci-radius-btn)] bg-[var(--ci-surface-2)] px-2.5 py-2 text-[12.5px] leading-relaxed text-[var(--ci-text)]">
                  <strong>{d.cumFolosesti}</strong> {n.cumFolosesti}
                </p>
              )}
              {n.link && (
                <Link prefetch={false} href={`/${orgSlug}/crm/${n.link}`} className="mt-3 inline-flex min-h-9 items-center gap-1 text-[13px] font-medium text-[var(--ci-primary)] hover:underline">
                  {d.deschide} <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              )}
            </Card>
          ))}
        </div>
        {noutatiAfisate.length > NOUTATI_INITIAL && (
          <div className="mt-3 text-center">
            <Button variant="secondary" onClick={() => setToateNoutatile((v) => !v)}>
              {toateNoutatile ? d.maiPutine : d.veziToateNoutati(noutatiAfisate.length)}
            </Button>
          </div>
        )}
      </section>

      <Dialog open={!!deschisa} onClose={() => setDeschisa(null)} title={deschisa?.titlu ?? ""} width="max-w-xl">
        {deschisa && <DetaliuIdee orgSlug={orgSlug} idee={deschisa} laVot={aplicaVot} laRaportat={dupaRaportare} />}
      </Dialog>

      <Dialog open={!!propune} onClose={() => setPropune(null)} title={d.propuneDialog} width="max-w-xl">
        {propune && (
          <FormularPropunere
            orgSlug={orgSlug}
            existente={idei}
            titluInitial={propune.titlu}
            laTrimis={(i) => {
              setIdei((l) => [i, ...l]);
              setPropune(null);
              setMesaj(d.mesajTrimisa);
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

function ButonVot({ orgSlug, idee, laVot, laEroare, mare, d }: { orgSlug: string; idee: IdeeVizibila; laVot: (id: string, votat: boolean, voturi: number) => void; laEroare: (m: string) => void; mare?: boolean; d: Dict }) {
  const [pending, start] = useTransition();
  const inchisa = idee.stare === "finalizat";
  return (
    <button
      type="button"
      disabled={pending || inchisa}
      aria-pressed={idee.votatDeMine}
      aria-label={d.vot.aria(idee.titlu)}
      title={idee.votatDeMine ? d.vot.titluVotat : d.vot.titluNevotat}
      onClick={(e) => {
        e.stopPropagation();
        laEroare("");
        const nou = !idee.votatDeMine;
        // Se vede imediat; dacă serverul refuză, revine la valoarea reală.
        laVot(idee.id, nou, Math.max(0, idee.voturi + (nou ? 1 : -1)));
        start(async () => {
          const r = await voteazaIdee(orgSlug, idee.id, nou).catch(() => ({ ok: false as const, eroare: d.vot.nuAmPututSalva }));
          if (r.ok && typeof r.voturi === "number") laVot(idee.id, nou, r.voturi);
          else {
            laVot(idee.id, !nou, idee.voturi);
            laEroare(("eroare" in r && r.eroare) || d.vot.nuAmPututSalva);
          }
        });
      }}
      className={`flex shrink-0 items-center justify-center rounded-[var(--ci-radius-btn)] border transition-colors disabled:opacity-60 ${mare ? "min-h-11 flex-row gap-2 px-4" : "min-h-[60px] w-16 flex-col py-1.5"} ${idee.votatDeMine ? "border-[var(--ci-primary)] bg-[var(--ci-primary)] text-white" : "border-[var(--ci-border)] bg-[var(--ci-surface)] text-[var(--ci-text-muted)] hover:border-[var(--ci-primary)] hover:text-[var(--ci-primary)]"}`}
    >
      <ChevronUp className="h-4 w-4" aria-hidden="true" />
      <span className="ci-tabular text-[14px] leading-tight font-bold">{idee.voturi}</span>
      <span className={mare ? "text-[13px] font-medium" : "text-[11px] leading-tight font-medium"}>{idee.votatDeMine ? (mare ? d.vot.votatMare : d.vot.votat) : d.vot.voteaza}</span>
    </button>
  );
}

function RandIdee({ orgSlug, idee, evidentiata, laDeschide, laVot }: { orgSlug: string; idee: IdeeVizibila; evidentiata: boolean; laDeschide: () => void; laVot: (id: string, votat: boolean, voturi: number) => void }) {
  const d = INOVARE_UI_DICT[useLocale()];
  const [eroare, setEroare] = useState("");
  return (
    <li id={idee.id} className={`rounded-[var(--ci-radius-card)] border bg-[var(--ci-surface)] p-3 transition-shadow ${evidentiata ? "border-[var(--ci-primary)] ring-2 ring-[var(--ci-primary)]" : "border-[var(--ci-border)]"}`}>
      <div className="flex items-stretch gap-3">
        <ButonVot orgSlug={orgSlug} idee={idee} laVot={laVot} laEroare={setEroare} d={d} />
        <button type="button" onClick={laDeschide} className="min-w-0 flex-1 text-left">
          <span className="flex flex-wrap items-center gap-1.5">
            <Badge tone={TON_STARE[idee.stare]} icon={false}>
              {d.stari[idee.stare]?.eticheta ?? idee.stare}
            </Badge>
            <span className="text-[12px] text-[var(--ci-text-muted)]">{d.categorii[idee.categorie] ?? idee.categorie}</span>
            {idee.efort && <span className="text-[12px] text-[var(--ci-text-muted)]">· {d.efort[idee.efort]}</span>}
            {idee.deMine && (
              <Badge tone="purple" icon={false}>
                {d.ideeaTa}
              </Badge>
            )}
          </span>
          <span className="mt-1 block text-[14.5px] font-semibold text-[var(--ci-text)]">{idee.titlu}</span>
          <span className="mt-0.5 line-clamp-2 block text-[13px] text-[var(--ci-text-muted)]">{idee.descriere}</span>
          <span className="mt-1 block text-[12px] text-[var(--ci-text-muted)]">
            {d.propusaDe(idee.autor)} · {d.actualizata} {dataScurta(idee.actualizatLa, d.numere)}
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
  const d = INOVARE_UI_DICT[useLocale()];
  const [eroareVot, setEroareVot] = useState("");
  const [raporteaza, setRaporteaza] = useState(false);
  const [motiv, setMotiv] = useState("");
  const [eroareRaportare, setEroareRaportare] = useState("");
  const [pending, start] = useTransition();

  function trimiteRaportarea() {
    setEroareRaportare("");
    start(async () => {
      const r = await raporteazaIdee(orgSlug, idee.id, motiv).catch(() => ({ ok: false as const, eroare: d.detaliu.nuAmPututRaporta }));
      if (r.ok) laRaportat(idee.id);
      else setEroareRaportare(("eroare" in r && r.eroare) || d.detaliu.nuAmPututRaporta);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge tone={TON_STARE[idee.stare]} icon={false}>
          {d.stari[idee.stare]?.eticheta ?? idee.stare}
        </Badge>
        <span className="text-[12.5px] text-[var(--ci-text-muted)]">{d.categorii[idee.categorie] ?? idee.categorie}</span>
        {idee.efort && <span className="text-[12.5px] text-[var(--ci-text-muted)]">· {d.efort[idee.efort]}</span>}
      </div>
      <div>
        <p className="text-[12px] font-semibold text-[var(--ci-text-muted)]">{d.detaliu.situatia}</p>
        <p className="mt-0.5 text-[14px] leading-relaxed whitespace-pre-line text-[var(--ci-text)]">{idee.descriere}</p>
      </div>
      {idee.cumFaciAcum && (
        <div>
          <p className="text-[12px] font-semibold text-[var(--ci-text-muted)]">{d.detaliu.cumSeRezolva}</p>
          <p className="mt-0.5 text-[14px] leading-relaxed whitespace-pre-line text-[var(--ci-text)]">{idee.cumFaciAcum}</p>
        </div>
      )}
      {(idee.obiectiv || idee.frecventa) && (
        <p className="text-[12.5px] text-[var(--ci-text-muted)]">
          {idee.obiectiv ? <>{d.detaliu.vreaSaCresca} <strong className="text-[var(--ci-text)]">{d.obiective[idee.obiectiv] ?? idee.obiectiv}</strong></> : null}
          {idee.obiectiv && idee.frecventa ? " · " : ""}
          {idee.frecventa ? <>{d.detaliu.problemaApare} <strong className="text-[var(--ci-text)]">{(d.frecvente[idee.frecventa] ?? idee.frecventa).toLowerCase()}</strong></> : null}
        </p>
      )}
      {idee.raspunsEchipa && (
        <div className="rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] bg-[var(--ci-surface-2)] p-3">
          <p className="text-[12px] font-semibold text-[var(--ci-primary)]">{d.detaliu.raspuns}</p>
          <p className="mt-0.5 text-[13.5px] leading-relaxed whitespace-pre-line text-[var(--ci-text)]">{idee.raspunsEchipa}</p>
          {idee.stare === "nu_acum" && idee.reevaluareLa && <p className="mt-1.5 text-[12.5px] text-[var(--ci-text-muted)]">{d.detaliu.reevaluare} {dataLunga(idee.reevaluareLa, d.numere)}.</p>}
        </div>
      )}
      <p className="text-[12px] text-[var(--ci-text-muted)]">
        {d.propusaDe(idee.autor)} · {dataLunga(idee.creatLa, d.numere)}
        {idee.finalizatLa ? ` · ${d.detaliu.finalizataPe} ${dataLunga(idee.finalizatLa, d.numere)}` : ""}
      </p>
      {idee.stare !== "finalizat" ? (
        <div>
          <ButonVot orgSlug={orgSlug} idee={idee} laVot={laVot} laEroare={setEroareVot} mare d={d} />
          <p className="mt-1.5 text-[12px] text-[var(--ci-text-muted)]">{d.detaliu.votOrg}</p>
          {eroareVot && (
            <p role="alert" className="mt-1 text-[12.5px] text-[var(--ci-red)]">
              {eroareVot}
            </p>
          )}
        </div>
      ) : (
        <p className="text-[13px] text-[var(--ci-green)]">{d.detaliu.gata}</p>
      )}

      {!idee.deMine && (
        <div className="border-t border-[var(--ci-border)] pt-3">
          {!raporteaza ? (
            <button type="button" onClick={() => setRaporteaza(true)} className="inline-flex min-h-9 items-center gap-1.5 text-[12.5px] text-[var(--ci-text-muted)] hover:text-[var(--ci-text)] hover:underline">
              <Flag className="h-3.5 w-3.5" aria-hidden="true" /> {d.detaliu.raporteaza}
            </button>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="raportare-motiv">{d.detaliu.deCeRaportezi}</Label>
              <Textarea id="raportare-motiv" rows={2} value={motiv} maxLength={LIMITE.motivRaportareMax} onChange={(e) => setMotiv(e.target.value)} placeholder={d.detaliu.motivPlaceholder} />
              <p className="text-[12px] text-[var(--ci-text-muted)]">{d.detaliu.ascunsa}</p>
              {eroareRaportare && (
                <p role="alert" className="text-[12.5px] text-[var(--ci-red)]">
                  {eroareRaportare}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <Button variant="danger" loading={pending} onClick={trimiteRaportarea}>
                  {d.detaliu.raporteazaButon}
                </Button>
                <Button variant="secondary" onClick={() => setRaporteaza(false)}>
                  {d.detaliu.renunt}
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
  const d = INOVARE_UI_DICT[useLocale()];
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
      if (!r) return setEroare(d.form.nuAmPututTrimite);
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
        <Label htmlFor="idee-titlu">{d.form.titluLabel}</Label>
        <Input id="idee-titlu" value={v.titlu} maxLength={LIMITE.titluMax} onChange={(e) => setV({ ...v, titlu: e.target.value })} placeholder={d.form.titluPlaceholder} aria-invalid={!!erori.titlu} />
        {erori.titlu && <p className="mt-1 text-[12.5px] text-[var(--ci-red)]">{erori.titlu}</p>}
        {similare.length > 0 && (
          <div className="mt-2 rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] bg-[var(--ci-surface-2)] p-3 text-[13px]">
            <p className="font-medium text-[var(--ci-text)]">{d.form.asemanatoare}</p>
            <ul className="mt-1.5 space-y-1">
              {similare.map((s) => (
                <li key={s.id}>
                  <button type="button" onClick={() => laDeschide(s)} className="min-h-9 text-left text-[var(--ci-primary)] hover:underline">
                    {s.titlu} <span className="text-[var(--ci-text-muted)]">· {d.form.voturi(s.voturi)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <div>
        <Label htmlFor="idee-descriere">{d.form.descriereLabel}</Label>
        <Textarea id="idee-descriere" rows={4} value={v.descriere} maxLength={LIMITE.descriereMax} onChange={(e) => setV({ ...v, descriere: e.target.value })} placeholder={d.form.descrierePlaceholder} aria-invalid={!!erori.descriere} />
        {erori.descriere && <p className="mt-1 text-[12.5px] text-[var(--ci-red)]">{erori.descriere}</p>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="idee-obiectiv">{d.form.obiectivLabel}</Label>
          <Select id="idee-obiectiv" value={v.obiectiv} onChange={(e) => setV({ ...v, obiectiv: e.target.value })} aria-invalid={!!erori.obiectiv}>
            <option value="">{d.form.alege}</option>
            {OBIECTIVE.map((o) => (
              <option key={o.cheie} value={o.cheie}>
                {d.obiective[o.cheie] ?? o.eticheta}
              </option>
            ))}
          </Select>
          {erori.obiectiv && <p className="mt-1 text-[12.5px] text-[var(--ci-red)]">{erori.obiectiv}</p>}
        </div>
        <div>
          <Label htmlFor="idee-frecventa">{d.form.frecventaLabel}</Label>
          <Select id="idee-frecventa" value={v.frecventa} onChange={(e) => setV({ ...v, frecventa: e.target.value })} aria-invalid={!!erori.frecventa}>
            <option value="">{d.form.alege}</option>
            {FRECVENTE.map((f) => (
              <option key={f.cheie} value={f.cheie}>
                {d.frecvente[f.cheie] ?? f.eticheta}
              </option>
            ))}
          </Select>
          {erori.frecventa && <p className="mt-1 text-[12.5px] text-[var(--ci-red)]">{erori.frecventa}</p>}
        </div>
      </div>
      <div>
        <Label htmlFor="idee-categorie">{d.form.categorieLabel}</Label>
        <Select id="idee-categorie" value={v.categorie} onChange={(e) => setV({ ...v, categorie: e.target.value })} aria-invalid={!!erori.categorie}>
          <option value="">{d.form.categorieNuStiu}</option>
          {CATEGORII.filter((c) => c !== CATEGORIE_IMPLICITA).map((c) => (
            <option key={c} value={c}>
              {d.categorii[c] ?? c}
            </option>
          ))}
        </Select>
        {erori.categorie && <p className="mt-1 text-[12.5px] text-[var(--ci-red)]">{erori.categorie}</p>}
      </div>
      <div>
        <Label htmlFor="idee-acum">{d.form.acumLabel}</Label>
        <Textarea id="idee-acum" rows={2} value={v.cumFaciAcum} maxLength={LIMITE.acumMax} onChange={(e) => setV({ ...v, cumFaciAcum: e.target.value })} placeholder={d.form.acumPlaceholder} aria-invalid={!!erori.cumFaciAcum} />
        {erori.cumFaciAcum && <p className="mt-1 text-[12.5px] text-[var(--ci-red)]">{erori.cumFaciAcum}</p>}
      </div>
      <label className="flex items-start gap-2.5 text-[13px] text-[var(--ci-text)]">
        <input type="checkbox" checked={v.afiseazaOrganizatia} onChange={(e) => setV({ ...v, afiseazaOrganizatia: e.target.checked })} className="mt-0.5 h-5 w-5 shrink-0" />
        <span>
          {d.form.arataOrg}
          <span className="mt-0.5 block text-[12px] text-[var(--ci-text-muted)]">{d.form.arataOrgNota}</span>
        </span>
      </label>
      <p className="rounded-[var(--ci-radius-btn)] bg-[var(--ci-surface-2)] px-3 py-2.5 text-[12.5px] leading-relaxed text-[var(--ci-text-muted)]">
        {d.form.aviz}{" "}
        <Link href="/gdpr" target="_blank" className="text-[var(--ci-primary)] underline">
          {d.form.politica}
        </Link>
      </p>
      {eroare && (
        <p role="alert" className="rounded-[var(--ci-radius-btn)] bg-[var(--ci-red-soft)] px-3 py-2 text-[13px] text-[var(--ci-red)]">
          {eroare}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button type="submit" variant="primary" size="lg" className="w-full justify-center sm:h-9 sm:w-auto" loading={pending}>
          {d.form.trimite}
        </Button>
      </div>
    </form>
  );
}
