"use client";

import { caleCampanie } from "@/lib/link-campanie";
import { Clock, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { VOLUNTARI_UI_DICT } from "@/lib/i18n/dictionaries/voluntari-ui";
import { esteTipSarcina, MAX, MAX_TIP_PERSONALIZAT, TIPURI_SARCINA } from "@/lib/voluntari-activitati";
import { CANALE_VOLUNTAR } from "@/lib/voluntari-panou";

import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Dialog } from "../components/ui/dialog";
import { Input, Label, Select, Textarea } from "../components/ui/input";
import { EmptyState } from "../components/ui/states";
import { useLocale } from "../lib/locale-context";

import { salveazaSarcinaAction, seteazaStareSarcinaAction, stergeSarcinaAction, type DateVoluntari, type SarcinaEchipa, type SarcinaInput } from "./actions";
import { MesajActiune, Sectiune, useActiune, ziData } from "./ui";

export function SarciniTab({ orgSlug, date, deschis, inchideFormular }: { orgSlug: string; date: DateVoluntari; deschis: boolean; inchideFormular: () => void; }) {
  const dict = VOLUNTARI_UI_DICT[useLocale()];
  const d = dict.sarcini;
  const numeTip = (tip: string, personalizat: string | null | undefined) => (tip === "altceva" && personalizat?.trim() ? personalizat.trim() : (dict.tipuriSarcina[tip] ?? tip));
  const { pending, mesaj, ruleaza } = useActiune();
  const [editare, setEditare] = useState<SarcinaEchipa | null>(null);
  const [confirmaSterge, setConfirmaSterge] = useState<SarcinaEchipa | null>(null);
  const azi = date.azi;

  return (
    <div className="space-y-4">
      <Sectiune titlu={d.titlu} descriere={d.desc} />
      <MesajActiune mesaj={mesaj} />

      {date.sarcini.length === 0 ? (
        <EmptyState icon={Plus} title={d.golTitlu} description={d.golDesc} />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {date.sarcini.map((s) => {
            const expirata = s.termen != null && s.termen < azi;
            const activa = s.stare === "publicata" && !expirata;
            return (
              <li key={s.id}>
                <Card className="flex h-full flex-col">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={activa ? "green" : "neutral"} icon={false}>
                      {s.stare === "ciorna" ? d.stare.ciorna : s.stare === "inchisa" ? d.stare.inchisa : expirata ? d.stare.expirata : d.stare.deschisa}
                    </Badge>
                    <span className="text-[12px] text-[var(--ci-text-muted)]">{numeTip(s.tip, s.tipPersonalizat)}</span>
                  </div>
                  <h3 className="mt-2 text-[14.5px] font-semibold text-[var(--ci-text)]">{s.titlu}</h3>
                  <p className="mt-1 line-clamp-2 text-[13px] text-[var(--ci-text-muted)]">{s.descriere}</p>
                  <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-[var(--ci-text-muted)]">
                    {s.termen && <div>{d.termen} <b className="text-[var(--ci-text)]">{ziData(s.termen, dict.numere)}</b></div>}
                    {s.minuteEstimate && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" aria-hidden /> ~{s.minuteEstimate} min
                      </div>
                    )}
                    <div>
                      {d.finalizate} <b className="text-[var(--ci-text)]">{s.finalizate}</b>
                      {s.nrVoluntari ? d.dinN(s.nrVoluntari) : ""}{d.implicati} <b className="text-[var(--ci-text)]">{s.angajati}</b>
                    </div>
                  </dl>
                  <div className="mt-auto flex flex-wrap gap-1.5 pt-3">
                    <Button size="sm" onClick={() => setEditare(s)}>
                      <Pencil className="h-3.5 w-3.5" /> {dict.comun.editeaza}
                    </Button>
                    {s.stare === "publicata" ? (
                      <Button size="sm" disabled={pending} onClick={() => ruleaza(() => seteazaStareSarcinaAction(orgSlug, s.id, "inchisa"), d.inchisaMsg)}>
                        {d.inchide}
                      </Button>
                    ) : (
                      <Button size="sm" disabled={pending} onClick={() => ruleaza(() => seteazaStareSarcinaAction(orgSlug, s.id, "publicata"), d.redeschisaMsg)}>
                        {d.redeschide}
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" aria-label={d.stergeAria(s.titlu)} onClick={() => setConfirmaSterge(s)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      {(deschis || editare) && (
        <FormularSarcina
          key={editare?.id ?? "nou"}
          orgSlug={orgSlug}
          campanii={date.campanii}
          initial={editare}
          onClose={() => {
            setEditare(null);
            inchideFormular();
          }}
        />
      )}

      <Dialog open={!!confirmaSterge} onClose={() => setConfirmaSterge(null)} title={d.stergiTitlu} width="max-w-md">
        <p className="text-[14px] text-[var(--ci-text-muted)]">
          {d.stergiText(confirmaSterge?.titlu ?? "")}
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={() => setConfirmaSterge(null)}>{dict.comun.renunt}</Button>
          <Button
            variant="primary"
            disabled={pending}
            onClick={() => {
              const s = confirmaSterge;
              setConfirmaSterge(null);
              if (s) ruleaza(() => stergeSarcinaAction(orgSlug, s.id), d.stearsa);
            }}
          >
            {d.stergeButon}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

function FormularSarcina({ orgSlug, campanii, initial, onClose }: { orgSlug: string; campanii: DateVoluntari["campanii"]; initial: SarcinaEchipa | null; onClose: () => void }) {
  const dict = VOLUNTARI_UI_DICT[useLocale()];
  const d = dict.sarcini;
  const { pending, mesaj, ruleaza } = useActiune();
  const [tip, setTip] = useState<string>(initial?.tip ?? "distribuie");
  const [tipPersonalizat, setTipPersonalizat] = useState(initial?.tipPersonalizat ?? "");
  const [titlu, setTitlu] = useState(initial?.titlu ?? "");
  const [descriere, setDescriere] = useState(initial?.descriere ?? "");
  const [termen, setTermen] = useState(initial?.termen ?? "");
  const [campanieId, setCampanieId] = useState(initial?.campanieId ?? "");
  const [textRecomandat, setTextRecomandat] = useState(initial?.textRecomandat ?? "");
  const [linkBaza, setLinkBaza] = useState(initial?.linkBaza ?? "");
  const [imagineUrl, setImagineUrl] = useState(initial?.imagineUrl ?? "");
  const [canale, setCanale] = useState<string[]>(initial?.canale ?? []);
  const [inceputLa, setInceputLa] = useState(initial?.inceputLa ?? "");
  const [nrVoluntari, setNrVoluntari] = useState(initial?.nrVoluntari ? String(initial.nrVoluntari) : "");
  const [minute, setMinute] = useState(initial?.minuteEstimate ? String(initial.minuteEstimate) : "");
  const [instructiuni, setInstructiuni] = useState(initial?.instructiuni ?? "");
  const [maiMulte, setMaiMulte] = useState(!!initial && !!(initial.campanieId || initial.linkBaza || initial.textRecomandat || initial.instructiuni || initial.nrVoluntari || initial.minuteEstimate));

  function alegeCampania(id: string) {
    setCampanieId(id);
    const c = campanii.find((x) => x.id === id);
    if (!c) return;
    // Completăm doar câmpurile goale: nu suprascriem ce a scris deja echipa.
    if (!linkBaza) setLinkBaza(`${window.location.origin}${caleCampanie(orgSlug, c.slug)}`);
    if (!textRecomandat) setTextRecomandat(`Susțin „${c.titlu}”. Dacă poți, ajută și tu:`);
    if (!titlu) setTitlu(`Dă mai departe: ${c.titlu}`);
  }

  function trimite(stare: "ciorna" | "publicata") {
    const input: SarcinaInput = {
      id: initial?.id,
      titlu,
      descriere,
      tip: esteTipSarcina(tip) ? tip : "altceva",
      tipPersonalizat,
      campanieId: campanieId || null,
      textRecomandat,
      linkBaza,
      imagineUrl,
      canale,
      inceputLa,
      termen,
      nrVoluntari: nrVoluntari ? Number(nrVoluntari) : null,
      minuteEstimate: minute ? Number(minute) : null,
      instructiuni,
      stare,
    };
    ruleaza(() => salveazaSarcinaAction(orgSlug, input), stare === "ciorna" ? d.ciornaSalvata : d.publicata, () => onClose());
  }

  return (
    <Dialog open onClose={onClose} title={initial ? d.formEditeaza : d.formNoua} width="max-w-xl">
      <div className="space-y-4">
        <p className="rounded-lg bg-[var(--ci-surface-2)] px-3 py-2 text-[12.5px] text-[var(--ci-text-muted)]">
          {d.formNota1} <b className="text-[var(--ci-text)]">{d.formNota2}</b>{d.formNota3}
        </p>
        <div>
          <Label>{d.ceFel}</Label>
          <div className="mt-1 grid grid-cols-2 gap-2" role="radiogroup" aria-label={d.tipAria}>
            {TIPURI_SARCINA.map((t) => (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={tip === t.id}
                onClick={() => setTip(t.id)}
                className={`rounded-[var(--ci-radius-btn)] border px-3 py-2 text-left text-[13px] transition ${tip === t.id ? "border-[var(--ci-primary)] bg-[var(--ci-primary-soft)] font-semibold text-[var(--ci-primary)]" : "border-[var(--ci-border)] text-[var(--ci-text)] hover:border-[var(--ci-border-strong)]"}`}
              >
                {dict.tipuriSarcina[t.id] ?? t.nume}
              </button>
            ))}
          </div>
        </div>
        {tip === "altceva" && (
          <div>
            <Label htmlFor="vs-tip-personalizat">{d.ceSarcina}</Label>
            <Input id="vs-tip-personalizat" value={tipPersonalizat} maxLength={MAX_TIP_PERSONALIZAT} onChange={(e) => setTipPersonalizat(e.target.value)} placeholder={d.ceSarcinaPlaceholder} />
            <p className="mt-1 text-[12px] text-[var(--ci-text-muted)]">{d.ceSarcinaNota}</p>
          </div>
        )}
        <div>
          <Label htmlFor="vs-titlu">{d.titluLabel}</Label>
          <Input id="vs-titlu" value={titlu} maxLength={MAX.titlu} onChange={(e) => setTitlu(e.target.value)} placeholder={d.titluPlaceholder} />
        </div>
        <div>
          <Label htmlFor="vs-descriere">{d.ceTrebuie}</Label>
          <Textarea id="vs-descriere" rows={3} value={descriere} maxLength={MAX.descriere} onChange={(e) => setDescriere(e.target.value)} placeholder={d.ceTrebuiePlaceholder} />
        </div>
        <div>
          <Label htmlFor="vs-termen">{d.termenLabel}</Label>
          <Input id="vs-termen" type="date" value={termen} onChange={(e) => setTermen(e.target.value)} />
        </div>

        <button type="button" className="text-[13px] font-semibold text-[var(--ci-primary)] hover:underline" aria-expanded={maiMulte} onClick={() => setMaiMulte((x) => !x)}>
          {maiMulte ? d.ascunde : d.maiMulte}
        </button>

        {maiMulte && (
          <div className="space-y-4 rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] p-3.5">
            <div>
              <Label htmlFor="vs-campanie">{d.campanieLegata}</Label>
              <Select id="vs-campanie" value={campanieId} onChange={(e) => alegeCampania(e.target.value)}>
                <option value="">{d.faraCampanie}</option>
                {campanii.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.titlu}
                  </option>
                ))}
              </Select>
              <p className="mt-1 text-[12px] text-[var(--ci-text-muted)]">{d.campanieNota}</p>
            </div>
            <div>
              <Label htmlFor="vs-text">{d.textRecomandat}</Label>
              <Textarea id="vs-text" rows={3} value={textRecomandat} maxLength={MAX.text} onChange={(e) => setTextRecomandat(e.target.value)} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="vs-link">{d.linkDistribuit}</Label>
                <Input id="vs-link" value={linkBaza} onChange={(e) => setLinkBaza(e.target.value)} placeholder="https://" />
              </div>
              <div>
                <Label htmlFor="vs-img">{d.imagine}</Label>
                <Input id="vs-img" value={imagineUrl} onChange={(e) => setImagineUrl(e.target.value)} placeholder="https://" />
              </div>
            </div>
            <div>
              <Label>{d.canalePotrivite}</Label>
              <div className="mt-1 flex flex-wrap gap-2">
                {CANALE_VOLUNTAR.map((c) => {
                  const pus = canale.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      aria-pressed={pus}
                      onClick={() => setCanale((x) => (pus ? x.filter((y) => y !== c.id) : [...x, c.id]))}
                      className={`rounded-full border px-3 py-1 text-[12.5px] font-medium ${pus ? "border-[var(--ci-primary)] bg-[var(--ci-primary-soft)] text-[var(--ci-primary)]" : "border-[var(--ci-border)] text-[var(--ci-text-muted)]"}`}
                    >
                      {dict.canale[c.id] ?? c.nume}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <Label htmlFor="vs-start">{d.deLaData}</Label>
                <Input id="vs-start" type="date" value={inceputLa} onChange={(e) => setInceputLa(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="vs-nr">{d.caciVoluntari}</Label>
                <Input id="vs-nr" inputMode="numeric" value={nrVoluntari} onChange={(e) => setNrVoluntari(e.target.value.replace(/\D/g, ""))} placeholder={d.oricati} />
              </div>
              <div>
                <Label htmlFor="vs-min">{d.timpEstimat}</Label>
                <Input id="vs-min" inputMode="numeric" value={minute} onChange={(e) => setMinute(e.target.value.replace(/\D/g, ""))} placeholder={dict.locutor === "ro" ? "ex. 5" : "e.g. 5"} />
              </div>
            </div>
            <div>
              <Label htmlFor="vs-instr">{d.instructiuni}</Label>
              <Textarea id="vs-instr" rows={2} value={instructiuni} maxLength={MAX.instructiuni} onChange={(e) => setInstructiuni(e.target.value)} placeholder={d.instructiuniPlaceholder} />
            </div>
          </div>
        )}

        <MesajActiune mesaj={mesaj} />
        <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--ci-border)] pt-3">
          <Button onClick={onClose}>{dict.comun.renunt}</Button>
          <Button disabled={pending} onClick={() => trimite("ciorna")}>
            {dict.comun.salveazaCiorna}
          </Button>
          <Button variant="primary" loading={pending} onClick={() => trimite("publicata")}>
            {dict.comun.publica}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
