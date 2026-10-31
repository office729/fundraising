"use client";

import { CheckCircle2, Lightbulb, MessageSquareHeart, Send } from "lucide-react";
import { useId, useState, useTransition } from "react";

import { ARII_NOTE, CATEGORII_SUGESTIE, MAX_MESAJ, MAX_TEXT_CHESTIONAR, MAX_TITLU, MODULE_FOLOSITE, STARI_SUGESTIE } from "@/lib/feedback/calcule";
import { FEEDBACK_UI_DICT } from "@/lib/i18n/dictionaries/feedback-ui";

import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input, Label, Select, Textarea } from "../components/ui/input";
import { EmptyState } from "../components/ui/states";
import { Tabs } from "../components/ui/tabs";
import { useLocale } from "../lib/locale-context";

import { obtineDateFeedback, trimiteChestionarAction, trimiteSugestieAction, type DateFeedback } from "./actions";

const dataLunga = (iso: string, numere: string) => new Date(iso).toLocaleDateString(numere, { day: "numeric", month: "long", year: "numeric" });

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
  const dict = FEEDBACK_UI_DICT[useLocale()];
  const d = dict.chestionar;
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
            <p className="text-sm font-semibold text-[var(--ci-text)]">{trimis ? d.multumimTrimis : d.deja}</p>
            <p className="mt-1 text-[13px] text-[var(--ci-text-muted)]">
              {trimis ? d.citimTrimis : d.repeta(zileRamase)}{d.ideeNota}
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
        setEroare(d.eroareTrimitere);
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
        <Intrebare titlu={d.qNps} ajutor={d.qNpsAjutor}>
          <Scala de={0} pana={10} valoare={nps} onChange={setNps} eticheta={d.npsAria} />
          <div className="mt-1.5 flex max-w-md justify-between text-[11.5px] text-[var(--ci-text-faint)]">
            <span>{d.deloc}</span>
            <span>{d.foarte}</span>
          </div>
        </Intrebare>

        <Intrebare titlu={d.qSatisfactie} ajutor={d.qSatisfactieAjutor}>
          <Scala de={1} pana={5} valoare={satisfactie} onChange={setSatisfactie} eticheta={d.satisfactieAria} />
        </Intrebare>

        <Intrebare titlu={d.qArii} ajutor={d.qAriiAjutor}>
          <div className="space-y-3.5">
            {ARII_NOTE.map((a) => (
              <div key={a.cheie} className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-[13px] text-[var(--ci-text)]">{dict.arii[a.cheie] ?? a.eticheta}</span>
                <Scala de={1} pana={5} valoare={note[a.cheie] ?? null} onChange={(v) => setNote((p) => ({ ...p, [a.cheie]: v }))} eticheta={dict.arii[a.cheie] ?? a.eticheta} golPermis />
              </div>
            ))}
          </div>
        </Intrebare>

        <Intrebare titlu={d.qModule} ajutor={d.qModuleAjutor}>
          <div className="grid gap-2 sm:grid-cols-2">
            {MODULE_FOLOSITE.map((m) => (
              <Bifa key={m.cheie} id={`${id}-m-${m.cheie}`} bifat={module.includes(m.cheie)} onChange={(v) => setModule((p) => (v ? [...p, m.cheie] : p.filter((x) => x !== m.cheie)))}>
                {dict.module[m.cheie] ?? m.eticheta}
              </Bifa>
            ))}
          </div>
        </Intrebare>

        <div>
          <Label htmlFor={`${id}-place`}>{d.cePlace}</Label>
          <Textarea id={`${id}-place`} value={cePlace} onChange={(e) => setCePlace(e.target.value)} maxLength={MAX_TEXT_CHESTIONAR} rows={3} placeholder={d.cePlacePlaceholder} />
        </div>
        <div>
          <Label htmlFor={`${id}-lipseste`}>{d.ceLipseste}</Label>
          <Textarea id={`${id}-lipseste`} value={ceLipseste} onChange={(e) => setCeLipseste(e.target.value)} maxLength={MAX_TEXT_CHESTIONAR} rows={4} placeholder={d.ceLipsestePlaceholder} />
        </div>

        <div className="space-y-3 border-t border-[var(--ci-border)] pt-4">
          <Bifa id={`${id}-contact`} bifat={poateContacta} onChange={setPoateContacta}>
            {d.contact}
          </Bifa>
          <p className="text-[12.5px] text-[var(--ci-text-muted)]">
            {d.confidentialitate}
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
          {d.trimite}
        </Button>
        <span className="text-[12.5px] text-[var(--ci-text-muted)]">{d.doarDouaMinute}</span>
      </div>
    </form>
  );
}

function Sugestii({ orgSlug, date, onTrimisa }: { orgSlug: string; date: DateFeedback; onTrimisa: () => void }) {
  const dict = FEEDBACK_UI_DICT[useLocale()];
  const d = dict.sugestii;
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
        setEroare(d.eroareTrimitere);
      }
    });
  }

  const etichetaCategorie = (c: string) => dict.categorii[c] ?? CATEGORII_SUGESTIE.find((x) => x.cheie === c)?.eticheta ?? c;
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
            <p className="text-sm font-semibold text-[var(--ci-text)]">{d.titluForm}</p>
            <p className="mt-0.5 text-[12.5px] text-[var(--ci-text-muted)]">{d.subtitluForm}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-[220px_1fr]">
            <div>
              <Label htmlFor={`${id}-cat`}>{d.tip}</Label>
              <Select id={`${id}-cat`} value={categorie} onChange={(e) => setCategorie(e.target.value)}>
                {CATEGORII_SUGESTIE.map((c) => (
                  <option key={c.cheie} value={c.cheie}>
                    {dict.categorii[c.cheie] ?? c.eticheta}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor={`${id}-titlu`}>{d.titluScurt}</Label>
              <Input id={`${id}-titlu`} value={titlu} onChange={(e) => setTitlu(e.target.value)} maxLength={MAX_TITLU} placeholder={d.titluPlaceholder} />
            </div>
          </div>
          <div>
            <Label htmlFor={`${id}-mesaj`}>{d.descrie}</Label>
            <Textarea id={`${id}-mesaj`} value={mesaj} onChange={(e) => setMesaj(e.target.value)} maxLength={MAX_MESAJ} rows={5} placeholder={d.descriePlaceholder} />
            <p className="mt-1 text-right text-[11.5px] text-[var(--ci-text-faint)] tabular-nums">
              {mesaj.length} / {MAX_MESAJ}
            </p>
          </div>
          <Bifa id={`${id}-contact`} bifat={poateContacta} onChange={setPoateContacta}>
            {d.contact}
          </Bifa>
          {eroare && (
            <p role="alert" className="rounded-[var(--ci-radius-btn)] border border-[var(--ci-red)]/30 bg-[var(--ci-red-soft)] px-3 py-2 text-[13px] text-[var(--ci-red)]">
              {eroare}
            </p>
          )}
          {multumire && (
            <p role="status" className="rounded-[var(--ci-radius-btn)] border border-[var(--ci-green)]/30 bg-[var(--ci-green-soft)] px-3 py-2 text-[13px] text-[var(--ci-green)]">
              {d.multumire}
            </p>
          )}
          <Button type="submit" variant="primary" loading={pending} disabled={pending}>
            <Send className="h-4 w-4" />
            {d.trimite}
          </Button>
        </Card>
      </form>

      <div>
        <h2 className="ci-display text-base font-semibold text-[var(--ci-text)]">{d.ale}</h2>
        <div className="mt-3 space-y-3">
          {date.sugestii.length === 0 ? (
            <EmptyState icon={Lightbulb} title={d.golTitlu} description={d.golDesc} />
          ) : (
            date.sugestii.map((s) => {
              const st = stare(s.stare);
              return (
                <Card key={s.id}>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={st.ton} icon={false}>
                      {dict.stari[st.cheie] ?? st.eticheta}
                    </Badge>
                    <span className="text-[12px] text-[var(--ci-text-muted)]">
                      {etichetaCategorie(s.categorie)} · {dataLunga(s.createdAt, dict.numere)}
                      {s.alMeu ? d.trimisaDeTine : ""}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-[var(--ci-text)]">{s.titlu}</p>
                  <p className="mt-1 text-[13px] whitespace-pre-line text-[var(--ci-text-muted)]">{s.mesaj}</p>
                  {s.raspuns && (
                    <div className="mt-3 rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] bg-[var(--ci-surface-2)] px-3.5 py-3">
                      <p className="text-[12px] font-semibold text-[var(--ci-text)]">
                        {d.raspuns}{s.raspunsLa ? ` · ${dataLunga(s.raspunsLa, dict.numere)}` : ""}
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
  const d = FEEDBACK_UI_DICT[useLocale()];
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
          <h1 className="ci-display text-xl font-bold text-[var(--ci-text)]">{d.titlu}</h1>
          <p className="mt-0.5 max-w-2xl text-[13px] text-[var(--ci-text-muted)]">
            {d.intro}
          </p>
        </div>
      </div>

      <Tabs
        tabs={[
          { key: "chestionar", label: d.taburi.chestionar },
          { key: "sugestii", label: `${d.taburi.sugestii}${date.sugestii.length ? ` (${date.sugestii.length})` : ""}` },
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
