"use client";

import { CheckCircle2, Lightbulb, MessageSquareHeart, Send } from "lucide-react";
import { useId, useState, useTransition } from "react";

import { ARII_NOTE, CATEGORII_SUGESTIE, MAX_MESAJ, MAX_TEXT_CHESTIONAR, MAX_TITLU, MODULE_FOLOSITE, STARI_SUGESTIE } from "@/lib/feedback/calcule";

import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input, Label, Select, Textarea } from "../components/ui/input";
import { EmptyState } from "../components/ui/states";
import { Tabs } from "../components/ui/tabs";

import { obtineDateFeedback, trimiteChestionarAction, trimiteSugestieAction, type DateFeedback } from "./actions";

const dataRo = (iso: string) => new Date(iso).toLocaleDateString("ro-RO", { day: "numeric", month: "long", year: "numeric" });

// Rând de butoane numerotate (0–10 sau 1–5), ca un grup de opțiuni accesibil. `golPermis`: apăsat încă o dată pe valoarea aleasă, o șterge.
function Scala({ de, pana, valoare, onChange, eticheta, golPermis = false }: { de: number; pana: number; valoare: number | null; onChange: (v: number | null) => void; eticheta: string; golPermis?: boolean }) {
  const valori = Array.from({ length: pana - de + 1 }, (_, i) => de + i);
  return (
    <div role="radiogroup" aria-label={eticheta} className="flex flex-wrap gap-1.5">
      {valori.map((n) => {
        const ales = valoare === n;
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={ales}
            onClick={() => onChange(ales && golPermis ? null : n)}
            className={`h-9 min-w-9 rounded-[var(--ci-radius-btn)] border px-2 text-sm font-semibold tabular-nums transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ci-blue)]/40 focus-visible:outline-none ${
              ales
                ? "border-[var(--ci-primary)] bg-[var(--ci-primary)] text-white"
                : "border-[var(--ci-border)] bg-[var(--ci-surface)] text-[var(--ci-text)] hover:border-[var(--ci-border-strong)] hover:bg-[var(--ci-surface-2)]"
            }`}
          >
            {n}
          </button>
        );
      })}
    </div>
  );
}

function Intrebare({ titlu, ajutor, children }: { titlu: string; ajutor?: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-sm font-semibold text-[var(--ci-text)]">{titlu}</p>
      {ajutor && <p className="mt-0.5 text-[12.5px] text-[var(--ci-text-muted)]">{ajutor}</p>}
      <div className="mt-2.5">{children}</div>
    </div>
  );
}

function Bifa({ id, bifat, onChange, children }: { id: string; bifat: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-2.5 text-[13px] text-[var(--ci-text)]">
      <input id={id} type="checkbox" checked={bifat} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--ci-primary)]" />
      <span>{children}</span>
    </label>
  );
}

function Chestionar({ orgSlug, zileRamase, onTrimis }: { orgSlug: string; zileRamase: number; onTrimis: () => void }) {
  const id = useId();
  const [nps, setNps] = useState<number | null>(null);
  const [satisfactie, setSatisfactie] = useState<number | null>(null);
  const [note, setNote] = useState<Record<string, number | null>>({});
  const [module, setModule] = useState<string[]>([]);
  const [cePlace, setCePlace] = useState("");
  const [ceLipseste, setCeLipseste] = useState("");
  const [poateContacta, setPoateContacta] = useState(false);
  const [eroare, setEroare] = useState<string | null>(null);
  const [trimis, setTrimis] = useState(false);
  const [pending, startTransition] = useTransition();

  if (trimis || zileRamase > 0) {
    return (
      <Card>
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[var(--ci-green)]" />
          <div>
            <p className="text-sm font-semibold text-[var(--ci-text)]">{trimis ? "Mulțumim! Răspunsul tău a ajuns la echipa Alexandrit." : "Ai răspuns deja la chestionar."}</p>
            <p className="mt-1 text-[13px] text-[var(--ci-text-muted)]">
              {trimis ? "Îl citim cu atenție și îl folosim la deciziile despre ce construim mai departe." : `Poți trimite din nou peste ${zileRamase} ${zileRamase === 1 ? "zi" : "zile"}.`} Dacă ți-a venit o idee între timp, o poți scrie la fila „Sugestii și idei”.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  function trimite() {
    setEroare(null);
    startTransition(async () => {
      try {
        const r = await trimiteChestionarAction(orgSlug, { nps, satisfactie, note, module, cePlace, ceLipseste, poateContacta });
        if (r.ok) {
          setTrimis(true);
          onTrimis();
        } else setEroare(r.eroare);
      } catch {
        setEroare("Nu am putut trimite chestionarul acum. Încearcă din nou peste puțin timp.");
      }
    });
  }

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        trimite();
      }}
    >
      <Card className="space-y-6">
        <Intrebare titlu="Cât de probabil ai recomanda Alexandrit altui ONG?" ajutor="0 = deloc probabil, 10 = foarte probabil">
          <Scala de={0} pana={10} valoare={nps} onChange={setNps} eticheta="Probabilitatea de a recomanda Alexandrit, de la 0 la 10" />
          <div className="mt-1.5 flex max-w-md justify-between text-[11.5px] text-[var(--ci-text-faint)]">
            <span>Deloc probabil</span>
            <span>Foarte probabil</span>
          </div>
        </Intrebare>

        <Intrebare titlu="În general, cât de mulțumit ești de platformă?" ajutor="1 = foarte nemulțumit, 5 = foarte mulțumit">
          <Scala de={1} pana={5} valoare={satisfactie} onChange={setSatisfactie} eticheta="Satisfacția generală, de la 1 la 5" />
        </Intrebare>

        <Intrebare titlu="Cum o evaluezi pe arii?" ajutor="Opțional: lasă gol ce nu ai folosit. 1 = slab, 5 = excelent.">
          <div className="space-y-3.5">
            {ARII_NOTE.map((a) => (
              <div key={a.cheie} className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-[13px] text-[var(--ci-text)]">{a.eticheta}</span>
                <Scala de={1} pana={5} valoare={note[a.cheie] ?? null} onChange={(v) => setNote((p) => ({ ...p, [a.cheie]: v }))} eticheta={a.eticheta} golPermis />
              </div>
            ))}
          </div>
        </Intrebare>

        <Intrebare titlu="Ce părți ale platformei folosești?" ajutor="Poți alege mai multe. Ne ajută să vedem ce contează cel mai mult.">
          <div className="grid gap-2 sm:grid-cols-2">
            {MODULE_FOLOSITE.map((m) => (
              <Bifa key={m.cheie} id={`${id}-m-${m.cheie}`} bifat={module.includes(m.cheie)} onChange={(v) => setModule((p) => (v ? [...p, m.cheie] : p.filter((x) => x !== m.cheie)))}>
                {m.eticheta}
              </Bifa>
            ))}
          </div>
        </Intrebare>

        <div>
          <Label htmlFor={`${id}-place`}>Ce îți place cel mai mult la Alexandrit?</Label>
          <Textarea id={`${id}-place`} value={cePlace} onChange={(e) => setCePlace(e.target.value)} maxLength={MAX_TEXT_CHESTIONAR} rows={3} placeholder="Ce te ajută cel mai mult în munca de zi cu zi?" />
        </div>
        <div>
          <Label htmlFor={`${id}-lipseste`}>Ce ți-ar îmbunătăți munca sau ce îți lipsește?</Label>
          <Textarea id={`${id}-lipseste`} value={ceLipseste} onChange={(e) => setCeLipseste(e.target.value)} maxLength={MAX_TEXT_CHESTIONAR} rows={4} placeholder="Ce ai vrea să poți face și acum nu poți, sau ce merge greu?" />
        </div>

        <div className="space-y-3 border-t border-[var(--ci-border)] pt-4">
          <Bifa id={`${id}-contact`} bifat={poateContacta} onChange={setPoateContacta}>
            Sunt de acord să fiu contactat de echipa Alexandrit, pe adresa de e-mail a contului, pentru detalii despre acest răspuns.
          </Bifa>
          <p className="text-[12.5px] text-[var(--ci-text-muted)]">
            Răspunsul ajunge doar la echipa Alexandrit și e legat de organizația ta. Adresa ta de e-mail apare în analiză doar dacă bifezi căsuța de mai sus.
          </p>
        </div>
      </Card>

      {eroare && (
        <p role="alert" className="rounded-[var(--ci-radius-btn)] border border-[var(--ci-red)]/30 bg-[var(--ci-red-soft)] px-3 py-2 text-[13px] text-[var(--ci-red)]">
          {eroare}
        </p>
      )}
      <div className="flex items-center gap-3">
        <Button type="submit" variant="primary" size="lg" loading={pending} disabled={pending}>
          <Send className="h-4 w-4" />
          Trimite chestionarul
        </Button>
        <span className="text-[12.5px] text-[var(--ci-text-muted)]">Durează cam două minute.</span>
      </div>
    </form>
  );
}

function Sugestii({ orgSlug, date, onTrimisa }: { orgSlug: string; date: DateFeedback; onTrimisa: () => void }) {
  const id = useId();
  const [categorie, setCategorie] = useState("functie-noua");
  const [titlu, setTitlu] = useState("");
  const [mesaj, setMesaj] = useState("");
  const [poateContacta, setPoateContacta] = useState(false);
  const [eroare, setEroare] = useState<string | null>(null);
  const [multumire, setMultumire] = useState(false);
  const [pending, startTransition] = useTransition();

  function trimite() {
    setEroare(null);
    setMultumire(false);
    startTransition(async () => {
      try {
        const r = await trimiteSugestieAction(orgSlug, { categorie, titlu, mesaj, poateContacta });
        if (r.ok) {
          setTitlu("");
          setMesaj("");
          setMultumire(true);
          onTrimisa();
        } else setEroare(r.eroare);
      } catch {
        setEroare("Nu am putut trimite sugestia acum. Încearcă din nou peste puțin timp.");
      }
    });
  }

  const etichetaCategorie = (c: string) => CATEGORII_SUGESTIE.find((x) => x.cheie === c)?.eticheta ?? c;
  const stare = (s: string) => STARI_SUGESTIE.find((x) => x.cheie === s) ?? STARI_SUGESTIE[0];

  return (
    <div className="space-y-8">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          trimite();
        }}
      >
        <Card className="space-y-4">
          <div>
            <p className="text-sm font-semibold text-[var(--ci-text)]">Spune-ne ce ai vrea să găsești în Alexandrit</p>
            <p className="mt-0.5 text-[12.5px] text-[var(--ci-text-muted)]">O funcție nouă, o îmbunătățire, o problemă întâlnită. Citim fiecare sugestie și îți răspundem aici.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-[220px_1fr]">
            <div>
              <Label htmlFor={`${id}-cat`}>Tipul sugestiei</Label>
              <Select id={`${id}-cat`} value={categorie} onChange={(e) => setCategorie(e.target.value)}>
                {CATEGORII_SUGESTIE.map((c) => (
                  <option key={c.cheie} value={c.cheie}>
                    {c.eticheta}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor={`${id}-titlu`}>Titlu scurt</Label>
              <Input id={`${id}-titlu`} value={titlu} onChange={(e) => setTitlu(e.target.value)} maxLength={MAX_TITLU} placeholder="De exemplu: export al donatorilor în Excel" />
            </div>
          </div>
          <div>
            <Label htmlFor={`${id}-mesaj`}>Descrie pe scurt</Label>
            <Textarea id={`${id}-mesaj`} value={mesaj} onChange={(e) => setMesaj(e.target.value)} maxLength={MAX_MESAJ} rows={5} placeholder="Ce vrei să poți face și de ce ți-ar fi de folos? Cu cât ne spui mai concret, cu atât o putem face mai bine." />
            <p className="mt-1 text-right text-[11.5px] text-[var(--ci-text-faint)] tabular-nums">
              {mesaj.length} / {MAX_MESAJ}
            </p>
          </div>
          <Bifa id={`${id}-contact`} bifat={poateContacta} onChange={setPoateContacta}>
            Sunt de acord să fiu contactat de echipa Alexandrit, pe adresa de e-mail a contului, pentru detalii.
          </Bifa>
          {eroare && (
            <p role="alert" className="rounded-[var(--ci-radius-btn)] border border-[var(--ci-red)]/30 bg-[var(--ci-red-soft)] px-3 py-2 text-[13px] text-[var(--ci-red)]">
              {eroare}
            </p>
          )}
          {multumire && (
            <p role="status" className="rounded-[var(--ci-radius-btn)] border border-[var(--ci-green)]/30 bg-[var(--ci-green-soft)] px-3 py-2 text-[13px] text-[var(--ci-green)]">
              Mulțumim! Sugestia a ajuns la echipa Alexandrit. O vezi mai jos, iar răspunsul nostru va apărea chiar acolo.
            </p>
          )}
          <Button type="submit" variant="primary" loading={pending} disabled={pending}>
            <Send className="h-4 w-4" />
            Trimite sugestia
          </Button>
        </Card>
      </form>

      <div>
        <h2 className="ci-display text-base font-semibold text-[var(--ci-text)]">Sugestiile organizației tale</h2>
        <div className="mt-3 space-y-3">
          {date.sugestii.length === 0 ? (
            <EmptyState icon={Lightbulb} title="Nu ați trimis încă nicio sugestie" description="Prima idee poate fi exact ce ne lipsea. Scrie-o mai sus." />
          ) : (
            date.sugestii.map((s) => {
              const st = stare(s.stare);
              return (
                <Card key={s.id}>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={st.ton} icon={false}>
                      {st.eticheta}
                    </Badge>
                    <span className="text-[12px] text-[var(--ci-text-muted)]">
                      {etichetaCategorie(s.categorie)} · {dataRo(s.createdAt)}
                      {s.alMeu ? " · trimisă de tine" : ""}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-[var(--ci-text)]">{s.titlu}</p>
                  <p className="mt-1 text-[13px] whitespace-pre-line text-[var(--ci-text-muted)]">{s.mesaj}</p>
                  {s.raspuns && (
                    <div className="mt-3 rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] bg-[var(--ci-surface-2)] px-3.5 py-3">
                      <p className="text-[12px] font-semibold text-[var(--ci-text)]">
                        Răspunsul echipei Alexandrit{s.raspunsLa ? ` · ${dataRo(s.raspunsLa)}` : ""}
                      </p>
                      <p className="mt-1 text-[13px] whitespace-pre-line text-[var(--ci-text-muted)]">{s.raspuns}</p>
                    </div>
                  )}
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export function FeedbackClient({ orgSlug, initial }: { orgSlug: string; initial: DateFeedback }) {
  const [date, setDate] = useState(initial);

  async function reincarca() {
    try {
      setDate(await obtineDateFeedback(orgSlug));
    } catch {
      // lista rămâne cea veche; apare la următoarea deschidere
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--ci-primary)] text-white">
          <MessageSquareHeart className="h-[18px] w-[18px]" />
        </span>
        <div>
          <h1 className="ci-display text-xl font-bold text-[var(--ci-text)]">Părerea ta contează</h1>
          <p className="mt-0.5 max-w-2xl text-[13px] text-[var(--ci-text-muted)]">
            Alexandrit se construiește împreună cu organizațiile care îl folosesc. Spune-ne cât ești de mulțumit și ce ai vrea să găsești în platformă; fiecare răspuns e citit de echipă.
          </p>
        </div>
      </div>

      <Tabs
        tabs={[
          { key: "chestionar", label: "Chestionar de satisfacție" },
          { key: "sugestii", label: `Sugestii și idei${date.sugestii.length ? ` (${date.sugestii.length})` : ""}` },
        ]}
      >
        {(activ) => (
          <>
            <div hidden={activ !== "chestionar"}>
              <Chestionar orgSlug={orgSlug} zileRamase={date.zileRamaseChestionar} onTrimis={reincarca} />
            </div>
            <div hidden={activ !== "sugestii"}>
              <Sugestii orgSlug={orgSlug} date={date} onTrimisa={reincarca} />
            </div>
          </>
        )}
      </Tabs>
    </div>
  );
}
