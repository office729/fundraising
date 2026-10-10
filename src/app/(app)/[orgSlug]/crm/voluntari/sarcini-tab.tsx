"use client";

import { Clock, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { esteTipSarcina, MAX, MAX_TIP_PERSONALIZAT, numeTipSarcina, TIPURI_SARCINA } from "@/lib/voluntari-activitati";
import { CANALE_VOLUNTAR } from "@/lib/voluntari-panou";

import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Dialog } from "../components/ui/dialog";
import { Input, Label, Select, Textarea } from "../components/ui/input";
import { EmptyState } from "../components/ui/states";

import { salveazaSarcinaAction, seteazaStareSarcinaAction, stergeSarcinaAction, type DateVoluntari, type SarcinaEchipa, type SarcinaInput } from "./actions";
import { MesajActiune, Sectiune, useActiune, ziData } from "./ui";

export function SarciniTab({ orgSlug, date, deschis, inchideFormular }: { orgSlug: string; date: DateVoluntari; deschis: boolean; inchideFormular: () => void; }) {
  const { pending, mesaj, ruleaza } = useActiune();
  const [editare, setEditare] = useState<SarcinaEchipa | null>(null);
  const [confirmaSterge, setConfirmaSterge] = useState<SarcinaEchipa | null>(null);
  const azi = date.azi;

  return (
    <div className="space-y-4">
      <Sectiune titlu="Sarcini online" descriere="Lucruri mici și clare pe care voluntarii le fac de acasă: distribuie o campanie, scrie un text, fă o grafică. Fiecare sarcină are termen și, opțional, un număr de voluntari." />
      <MesajActiune mesaj={mesaj} />

      {date.sarcini.length === 0 ? (
        <EmptyState icon={Plus} title="Nicio sarcină încă" description="Creează prima sarcină: alegi ce trebuie făcut și până când. Voluntarii o văd pe pagina lor imediat." />
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
                      {s.stare === "ciorna" ? "Ciornă" : s.stare === "inchisa" ? "Închisă" : expirata ? "Expirată" : "Deschisă"}
                    </Badge>
                    <span className="text-[12px] text-[var(--ci-text-muted)]">{numeTipSarcina(s.tip, s.tipPersonalizat)}</span>
                  </div>
                  <h3 className="mt-2 text-[14.5px] font-semibold text-[var(--ci-text)]">{s.titlu}</h3>
                  <p className="mt-1 line-clamp-2 text-[13px] text-[var(--ci-text-muted)]">{s.descriere}</p>
                  <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-[var(--ci-text-muted)]">
                    {s.termen && <div>Termen: <b className="text-[var(--ci-text)]">{ziData(s.termen)}</b></div>}
                    {s.minuteEstimate && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" aria-hidden /> ~{s.minuteEstimate} min
                      </div>
                    )}
                    <div>
                      Finalizate: <b className="text-[var(--ci-text)]">{s.finalizate}</b>
                      {s.nrVoluntari ? ` din ${s.nrVoluntari}` : ""} · implicați: <b className="text-[var(--ci-text)]">{s.angajati}</b>
                    </div>
                  </dl>
                  <div className="mt-auto flex flex-wrap gap-1.5 pt-3">
                    <Button size="sm" onClick={() => setEditare(s)}>
                      <Pencil className="h-3.5 w-3.5" /> Editează
                    </Button>
                    {s.stare === "publicata" ? (
                      <Button size="sm" disabled={pending} onClick={() => ruleaza(() => seteazaStareSarcinaAction(orgSlug, s.id, "inchisa"), "Sarcina a fost închisă.")}>
                        Închide
                      </Button>
                    ) : (
                      <Button size="sm" disabled={pending} onClick={() => ruleaza(() => seteazaStareSarcinaAction(orgSlug, s.id, "publicata"), "Sarcina e din nou deschisă.")}>
                        Redeschide
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" aria-label={`Șterge sarcina ${s.titlu}`} onClick={() => setConfirmaSterge(s)}>
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

      <Dialog open={!!confirmaSterge} onClose={() => setConfirmaSterge(null)} title="Ștergi sarcina?" width="max-w-md">
        <p className="text-[14px] text-[var(--ci-text-muted)]">
          „{confirmaSterge?.titlu}” se șterge împreună cu implicările voluntarilor. Dacă vrei doar s-o oprești, folosește „Închide”.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={() => setConfirmaSterge(null)}>Renunț</Button>
          <Button
            variant="primary"
            disabled={pending}
            onClick={() => {
              const s = confirmaSterge;
              setConfirmaSterge(null);
              if (s) ruleaza(() => stergeSarcinaAction(orgSlug, s.id), "Sarcina a fost ștearsă.");
            }}
          >
            Șterge sarcina
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

function FormularSarcina({ orgSlug, campanii, initial, onClose }: { orgSlug: string; campanii: DateVoluntari["campanii"]; initial: SarcinaEchipa | null; onClose: () => void }) {
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
    if (!linkBaza) setLinkBaza(`${window.location.origin}/strangere-fonduri/${orgSlug}/${c.slug}`);
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
    ruleaza(() => salveazaSarcinaAction(orgSlug, input), stare === "ciorna" ? "Ciorna a fost salvată." : "Sarcina e publicată.", () => onClose());
  }

  return (
    <Dialog open onClose={onClose} title={initial ? "Editează sarcina online" : "Sarcină online nouă"} width="max-w-xl">
      <div className="space-y-4">
        <p className="rounded-lg bg-[var(--ci-surface-2)] px-3 py-2 text-[12.5px] text-[var(--ci-text-muted)]">
          Sarcinile online se fac de acasă, pe telefon sau calculator. Pentru o colectă, un eveniment sau orice altceva la fața locului, creează o <b className="text-[var(--ci-text)]">activitate pe teren</b> (butonul din dreapta sus).
        </p>
        <div>
          <Label>Ce fel de sarcină e?</Label>
          <div className="mt-1 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Tipul sarcinii">
            {TIPURI_SARCINA.map((t) => (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={tip === t.id}
                onClick={() => setTip(t.id)}
                className={`rounded-[var(--ci-radius-btn)] border px-3 py-2 text-left text-[13px] transition ${tip === t.id ? "border-[var(--ci-primary)] bg-[var(--ci-primary-soft)] font-semibold text-[var(--ci-primary)]" : "border-[var(--ci-border)] text-[var(--ci-text)] hover:border-[var(--ci-border-strong)]"}`}
              >
                {t.nume}
              </button>
            ))}
          </div>
        </div>
        {tip === "altceva" && (
          <div>
            <Label htmlFor="vs-tip-personalizat">Ce sarcină sau proiect este?</Label>
            <Input id="vs-tip-personalizat" value={tipPersonalizat} maxLength={MAX_TIP_PERSONALIZAT} onChange={(e) => setTipPersonalizat(e.target.value)} placeholder="ex. Traducere site, Proiect de cercetare, Suport la telefon" />
            <p className="mt-1 text-[12px] text-[var(--ci-text-muted)]">Numele apare voluntarilor în loc de „Altceva”.</p>
          </div>
        )}
        <div>
          <Label htmlFor="vs-titlu">Titlu</Label>
          <Input id="vs-titlu" value={titlu} maxLength={MAX.titlu} onChange={(e) => setTitlu(e.target.value)} placeholder="ex. Dă mai departe campania pentru Mihai" />
        </div>
        <div>
          <Label htmlFor="vs-descriere">Ce trebuie făcut</Label>
          <Textarea id="vs-descriere" rows={3} value={descriere} maxLength={MAX.descriere} onChange={(e) => setDescriere(e.target.value)} placeholder="1–3 propoziții, pe înțelesul oricui." />
        </div>
        <div>
          <Label htmlFor="vs-termen">Termen</Label>
          <Input id="vs-termen" type="date" value={termen} onChange={(e) => setTermen(e.target.value)} />
        </div>

        <button type="button" className="text-[13px] font-semibold text-[var(--ci-primary)] hover:underline" aria-expanded={maiMulte} onClick={() => setMaiMulte((x) => !x)}>
          {maiMulte ? "Ascunde opțiunile" : "Mai multe opțiuni (campanie, text, canale, număr de voluntari)"}
        </button>

        {maiMulte && (
          <div className="space-y-4 rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] p-3.5">
            <div>
              <Label htmlFor="vs-campanie">Campanie legată</Label>
              <Select id="vs-campanie" value={campanieId} onChange={(e) => alegeCampania(e.target.value)}>
                <option value="">Fără campanie</option>
                {campanii.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.titlu}
                  </option>
                ))}
              </Select>
              <p className="mt-1 text-[12px] text-[var(--ci-text-muted)]">Alegerea completează linkul și un text de pornire, pe care le poți modifica.</p>
            </div>
            <div>
              <Label htmlFor="vs-text">Text recomandat pentru postare</Label>
              <Textarea id="vs-text" rows={3} value={textRecomandat} maxLength={MAX.text} onChange={(e) => setTextRecomandat(e.target.value)} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="vs-link">Link de distribuit</Label>
                <Input id="vs-link" value={linkBaza} onChange={(e) => setLinkBaza(e.target.value)} placeholder="https://" />
              </div>
              <div>
                <Label htmlFor="vs-img">Imagine aprobată (link)</Label>
                <Input id="vs-img" value={imagineUrl} onChange={(e) => setImagineUrl(e.target.value)} placeholder="https://" />
              </div>
            </div>
            <div>
              <Label>Canale potrivite</Label>
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
                      {c.nume}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <Label htmlFor="vs-start">De la data</Label>
                <Input id="vs-start" type="date" value={inceputLa} onChange={(e) => setInceputLa(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="vs-nr">Câți voluntari</Label>
                <Input id="vs-nr" inputMode="numeric" value={nrVoluntari} onChange={(e) => setNrVoluntari(e.target.value.replace(/\D/g, ""))} placeholder="oricâți" />
              </div>
              <div>
                <Label htmlFor="vs-min">Timp estimat (min)</Label>
                <Input id="vs-min" inputMode="numeric" value={minute} onChange={(e) => setMinute(e.target.value.replace(/\D/g, ""))} placeholder="ex. 5" />
              </div>
            </div>
            <div>
              <Label htmlFor="vs-instr">Instrucțiuni</Label>
              <Textarea id="vs-instr" rows={2} value={instructiuni} maxLength={MAX.instructiuni} onChange={(e) => setInstructiuni(e.target.value)} placeholder="ex. Postează doar pe profilul tău; în grupuri doar dacă regulile permit." />
            </div>
          </div>
        )}

        <MesajActiune mesaj={mesaj} />
        <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--ci-border)] pt-3">
          <Button onClick={onClose}>Renunț</Button>
          <Button disabled={pending} onClick={() => trimite("ciorna")}>
            Salvează ciorna
          </Button>
          <Button variant="primary" loading={pending} onClick={() => trimite("publicata")}>
            Publică
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
