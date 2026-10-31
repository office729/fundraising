"use client";

import { CalendarDays, Check, Copy, Download, Link2, MapPin, Pencil, Plus, Trash2, Users } from "lucide-react";
import { useState } from "react";

import { VOLUNTARI_UI_DICT } from "@/lib/i18n/dictionaries/voluntari-ui";
import { laOraRo, MAX } from "@/lib/voluntari-activitati";

import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Dialog } from "../components/ui/dialog";
import { Input, Label, Select, Textarea } from "../components/ui/input";
import { EmptyState } from "../components/ui/states";
import { useLocale } from "../lib/locale-context";

import {
  candidatiInvitatiiAction,
  decideInscriereAction,
  genereazaLinkCoordonatorAction,
  opresteLinkCoordonatorAction,
  marcheazaPrezentaAction,
  salveazaActivitateAction,
  seteazaOreAction,
  seteazaStareActivitateAction,
  stergeActivitateAction,
  trimiteInvitatiiAction,
  valideazaOreActivitateAction,
  type ActivitateEchipa,
  type ActivitateInput,
  type CandidatInvitatie,
  type DateVoluntari,
} from "./actions";
import { dataOra, descarcaCsv, MesajActiune, ora, PastilaStatus, Sectiune, useActiune } from "./ui";

export function ActivitatiTab({ orgSlug, date, deschis, inchideFormular }: { orgSlug: string; date: DateVoluntari; deschis: boolean; inchideFormular: () => void }) {
  const dict = VOLUNTARI_UI_DICT[useLocale()];
  const d = dict.activitati;
  const [detaliu, setDetaliu] = useState<string | null>(null);
  const [editare, setEditare] = useState<ActivitateEchipa | null>(null);
  const acum = new Date(date.acumIso).getTime();
  const viitoare = date.activitati.filter((a) => new Date(a.seTerminaLa).getTime() >= acum && a.stare !== "incheiata" && a.stare !== "anulata").sort((a, b) => a.inceputLa.localeCompare(b.inceputLa));
  const trecute = date.activitati.filter((a) => !viitoare.includes(a));
  const selectata = date.activitati.find((a) => a.id === detaliu) ?? null;

  const rand = (a: ActivitateEchipa) => {
    const locuri = a.ture.reduce((s, t) => s + t.locuri, 0);
    const ocupate = a.ture.reduce((s, t) => s + t.ocupate, 0);
    const cereri = a.inscrisi.filter((i) => i.status === "in_asteptare").length;
    return (
      <li key={a.id}>
        <button type="button" onClick={() => setDetaliu(a.id)} className="block w-full text-left">
          <Card className="transition-colors hover:border-[var(--ci-primary)]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-[14.5px] font-semibold text-[var(--ci-text)]">{a.titlu}</h3>
              <div className="flex items-center gap-1.5">
                {cereri > 0 && (
                  <Badge tone="amber" icon={false}>
                    {cereri} {d.cerere(cereri)}
                  </Badge>
                )}
                <Badge tone={a.stare === "publicata" ? "green" : "neutral"} icon={false}>
                  {dict.stareActivitate[a.stare] ?? a.stare}
                </Badge>
              </div>
            </div>
            <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[12.5px] text-[var(--ci-text-muted)]">
              <div className="flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" aria-hidden /> {dataOra(a.inceputLa, dict.numere)} – {ora(a.seTerminaLa, dict.numere)}
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" aria-hidden /> {a.locatie}
                {a.localitate ? `, ${a.localitate}` : ""}
              </div>
              <div className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" aria-hidden /> {d.locuri(ocupate, locuri)}
              </div>
            </dl>
          </Card>
        </button>
      </li>
    );
  };

  return (
    <div className="space-y-4">
      <Sectiune titlu={d.titlu} descriere={d.desc} />

      {date.activitati.length === 0 ? (
        <EmptyState icon={CalendarDays} title={d.golTitlu} description={d.golDesc} />
      ) : (
        <>
          {viitoare.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-[12px] font-semibold tracking-wide text-[var(--ci-text-muted)] uppercase">{d.urmeaza}</h3>
              <ul className="space-y-2">{viitoare.map(rand)}</ul>
            </div>
          )}
          {trecute.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-[12px] font-semibold tracking-wide text-[var(--ci-text-muted)] uppercase">{d.incheiate}</h3>
              <ul className="space-y-2">{trecute.map(rand)}</ul>
            </div>
          )}
        </>
      )}

      {selectata && <DetaliuActivitate key={selectata.id} orgSlug={orgSlug} a={selectata} acumIso={date.acumIso} onClose={() => setDetaliu(null)} onEdit={() => { setEditare(selectata); setDetaliu(null); }} />}
      {(deschis || editare) && (
        <FormularActivitate
          key={editare?.id ?? "nou"}
          orgSlug={orgSlug}
          initial={editare}
          onClose={() => {
            setEditare(null);
            inchideFormular();
          }}
        />
      )}
    </div>
  );
}

// ===== Detaliu: înscriși, prezență, ore =====
function DetaliuActivitate({ orgSlug, a, acumIso, onClose, onEdit }: { orgSlug: string; a: ActivitateEchipa; acumIso: string; onClose: () => void; onEdit: () => void }) {
  const dict = VOLUNTARI_UI_DICT[useLocale()];
  const d = dict.activitati;
  const etInscriere = (s: string) => dict.statusInscriere[s] ?? s;
  const { pending, mesaj, ruleaza } = useActiune();
  const [rezultat, setRezultat] = useState(a.rezultatValoare != null ? String(a.rezultatValoare) : "");
  const [confirmaSterge, setConfirmaSterge] = useState(false);
  const trecuta = new Date(a.seTerminaLa).getTime() < new Date(acumIso).getTime();
  const prezenti = a.inscrisi.filter((i) => i.status === "prezent");
  const deValidat = prezenti.some((i) => i.oreValidate == null);

  return (
    <Dialog open onClose={onClose} title={a.titlu} width="max-w-3xl">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-[13px] text-[var(--ci-text-muted)]">
          <Badge tone={a.stare === "publicata" ? "green" : "neutral"} icon={false}>
            {dict.stareActivitate[a.stare] ?? a.stare}
          </Badge>
          <span>
            {dataOra(a.inceputLa, dict.numere)} – {ora(a.seTerminaLa, dict.numere)} · {a.locatie}
            {a.localitate ? `, ${a.localitate}` : ""}
          </span>
          {a.cuMinori && <Badge tone="amber" icon={false}>{d.cuMinori}</Badge>}
        </div>
        {(a.coordonatorNume || a.contactZi) && (
          <p className="text-[13px] text-[var(--ci-text-muted)]">
            {d.coordonator} <b className="text-[var(--ci-text)]">{a.coordonatorNume || "—"}</b>
            {a.coordonatorTelefon ? ` · ${a.coordonatorTelefon}` : ""}
            {a.contactZi ? ` · ${d.contactZi} ${a.contactZi}` : ""}
          </p>
        )}

        <div className="overflow-x-auto rounded-[var(--ci-radius-card)] border border-[var(--ci-border)]">
          <table className="w-full min-w-[520px] text-left text-[13px]">
            <thead className="bg-[var(--ci-surface-2)] text-[11.5px] tracking-wide text-[var(--ci-text-muted)] uppercase">
              <tr>
                <th className="px-3 py-2 font-semibold">{d.tura}</th>
                <th className="px-3 py-2 font-semibold">{d.interval}</th>
                <th className="px-3 py-2 text-right font-semibold">{d.locuriCap}</th>
              </tr>
            </thead>
            <tbody>
              {a.ture.map((t) => (
                <tr key={t.id} className="border-t border-[var(--ci-border)]">
                  <td className="px-3 py-2 font-medium text-[var(--ci-text)]">{t.nume}</td>
                  <td className="px-3 py-2 text-[var(--ci-text-muted)]">
                    {ora(t.inceputLa, dict.numere)} – {ora(t.seTerminaLa, dict.numere)}
                  </td>
                  <td className="ci-tabular px-3 py-2 text-right">
                    {t.ocupate} / {t.locuri}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <LinkCoordonator orgSlug={orgSlug} a={a} />
        {a.stare === "publicata" && !trecuta && <Invitatii orgSlug={orgSlug} activityId={a.id} />}

        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-[14px] font-semibold text-[var(--ci-text)]">{d.inscrisi(a.inscrisi.filter((i) => i.status !== "anulata").length)}</h3>
            {a.inscrisi.length > 0 && (
              <Button
                size="sm"
                onClick={() =>
                  descarcaCsv(`voluntari-${a.titlu.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)}.csv`, [
                    d.csvCap,
                    ...a.inscrisi.map((i) => [i.voluntar, i.telefon, i.email, i.tura, etInscriere(i.status), i.oreCalculate, i.oreValidate]),
                  ])
                }
              >
                <Download className="h-3.5 w-3.5" /> {dict.comun.exportCsv}
              </Button>
            )}
          </div>
          {a.inscrisi.length === 0 ? (
            <p className="rounded-lg bg-[var(--ci-surface-2)] px-3 py-3 text-[13px] text-[var(--ci-text-muted)]">{d.nimeniInscris}</p>
          ) : (
            <ul className="divide-y divide-[var(--ci-border)] rounded-[var(--ci-radius-card)] border border-[var(--ci-border)]">
              {a.inscrisi.map((i) => (
                <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-[13.5px] font-semibold text-[var(--ci-text)]">{i.voluntar}</p>
                    <p className="text-[12px] text-[var(--ci-text-muted)]">
                      {i.tura}
                      {i.telefon ? ` · ${i.telefon}` : ""}
                      {i.email ? ` · ${i.email}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <PastilaStatus valoare={i.status} eticheta={etInscriere(i.status)} />
                    {i.status === "in_asteptare" && (
                      <>
                        <Button size="sm" variant="primary" disabled={pending} onClick={() => ruleaza(() => decideInscriereAction(orgSlug, i.id, true), d.aprobata)}>
                          {d.aproba}
                        </Button>
                        <Button size="sm" disabled={pending} onClick={() => ruleaza(() => decideInscriereAction(orgSlug, i.id, false), d.respinsa)}>
                          {d.respinge}
                        </Button>
                      </>
                    )}
                    {(i.status === "confirmata" || i.status === "prezent" || i.status === "absent") && (
                      <>
                        <Button size="sm" variant={i.status === "prezent" ? "primary" : "secondary"} disabled={pending} onClick={() => ruleaza(() => marcheazaPrezentaAction(orgSlug, i.id, i.status === "prezent" ? "confirmata" : "prezent"), d.prezentaActualizata)}>
                          {d.prezent}
                        </Button>
                        <Button size="sm" disabled={pending} onClick={() => ruleaza(() => marcheazaPrezentaAction(orgSlug, i.id, i.status === "absent" ? "confirmata" : "absent"), d.prezentaActualizata)}>
                          {d.absent}
                        </Button>
                      </>
                    )}
                    {i.status === "prezent" && <OreInput orgSlug={orgSlug} id={i.id} ore={i.oreCalculate} validat={i.oreValidate != null} />}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {(trecuta || a.stare === "incheiata") && prezenti.length > 0 && (
          <div className="rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] bg-[var(--ci-surface-2)] p-3.5">
            <h3 className="text-[14px] font-semibold text-[var(--ci-text)]">{d.inchideTitlu}</h3>
            <p className="mt-0.5 text-[12.5px] text-[var(--ci-text-muted)]">
              {d.prezenti(prezenti.length)}{d.doarValidate}{deValidat ? d.nuToateValidate : ""}.
            </p>
            <div className="mt-2.5 flex flex-wrap items-end gap-3">
              {a.rezultatEticheta && (
                <div>
                  <Label htmlFor="vr-rez">{a.rezultatEticheta}</Label>
                  <Input id="vr-rez" className="w-40" inputMode="decimal" value={rezultat} onChange={(e) => setRezultat(e.target.value.replace(",", "."))} placeholder={d.valoare} />
                </div>
              )}
              <Button variant="primary" disabled={pending} onClick={() => ruleaza(() => valideazaOreActivitateAction(orgSlug, a.id, a.rezultatEticheta && rezultat ? Number(rezultat) : null), d.validate)}>
                {d.valideaza}
              </Button>
            </div>
          </div>
        )}

        <MesajActiune mesaj={mesaj} />

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--ci-border)] pt-3">
          <div className="flex flex-wrap gap-1.5">
            <Button size="sm" onClick={onEdit}>
              <Pencil className="h-3.5 w-3.5" /> {dict.comun.editeaza}
            </Button>
            {a.stare === "publicata" && (
              <Button size="sm" disabled={pending} onClick={() => ruleaza(() => seteazaStareActivitateAction(orgSlug, a.id, "anulata"), d.anulata)}>
                {d.anuleaza}
              </Button>
            )}
            {a.stare === "anulata" && (
              <Button size="sm" disabled={pending} onClick={() => ruleaza(() => seteazaStareActivitateAction(orgSlug, a.id, "publicata"), d.republicata)}>
                {d.republica}
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => setConfirmaSterge(true)} aria-label={d.stergeAria}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
          <Button onClick={onClose}>{dict.comun.inchide}</Button>
        </div>

        {confirmaSterge && (
          <div role="alertdialog" aria-label={d.confirmareAria} className="rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] bg-[var(--ci-surface-2)] p-3 text-[13px]">
            <p className="text-[var(--ci-text)]">{d.stergiText(a.titlu)}</p>
            <div className="mt-2 flex gap-2">
              <Button size="sm" onClick={() => setConfirmaSterge(false)}>{dict.comun.renunt}</Button>
              <Button size="sm" variant="primary" disabled={pending} onClick={() => ruleaza(() => stergeActivitateAction(orgSlug, a.id), d.stearsa, () => onClose())}>
                {d.stergeDefinitiv}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
}

// Invitații către voluntari care au bifat că vor invitații: cei care au mai făcut ceva cu organizația și nu s-au înscris încă.
function Invitatii({ orgSlug, activityId }: { orgSlug: string; activityId: string }) {
  const dict = VOLUNTARI_UI_DICT[useLocale()];
  const d = dict.activitati.invita;
  const { pending, mesaj, ruleaza, setMesaj } = useActiune();
  const [stare, setStare] = useState<{ candidati: CandidatInvitatie[]; emailActiv: boolean; linkActiv: boolean } | null>(null);
  const [alesi, setAlesi] = useState<Set<string>>(new Set());

  function incarca() {
    ruleaza(
      async () => {
        const r = await candidatiInvitatiiAction(orgSlug, activityId);
        if (r.ok) {
          setStare({ candidati: r.candidati, emailActiv: r.emailActiv, linkActiv: r.linkActiv });
          setAlesi(new Set(r.candidati.map((c) => c.id)));
        }
        return r;
      },
      d.incarcata,
    );
  }

  return (
    <div className="rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-[14px] font-semibold text-[var(--ci-text)]">{d.titlu}</h3>
          <p className="mt-0.5 text-[12.5px] text-[var(--ci-text-muted)]">{d.desc}</p>
        </div>
        {!stare && (
          <Button size="sm" disabled={pending} onClick={incarca}>
            {d.vezi}
          </Button>
        )}
      </div>
      {stare && (
        <div className="mt-3 space-y-2">
          {!stare.emailActiv && <p className="rounded-lg bg-[var(--ci-amber-soft)] px-3 py-2 text-[12.5px] text-[var(--ci-text)]">{d.faraEmail}</p>}
          {!stare.linkActiv && <p className="rounded-lg bg-[var(--ci-amber-soft)] px-3 py-2 text-[12.5px] text-[var(--ci-text)]">{d.faraLink}</p>}
          {stare.candidati.length === 0 ? (
            <p className="text-[13px] text-[var(--ci-text-muted)]">{d.nimeni}</p>
          ) : (
            <>
              <ul className="max-h-48 divide-y divide-[var(--ci-border)] overflow-auto rounded-lg border border-[var(--ci-border)]">
                {stare.candidati.map((c) => (
                  <li key={c.id}>
                    <label className="flex cursor-pointer items-center gap-2.5 px-3 py-2 text-[13px]">
                      <input
                        type="checkbox"
                        checked={alesi.has(c.id)}
                        onChange={(e) =>
                          setAlesi((x) => {
                            const n = new Set(x);
                            if (e.target.checked) n.add(c.id);
                            else n.delete(c.id);
                            return n;
                          })
                        }
                      />
                      <span className="font-medium text-[var(--ci-text)]">{c.prenume}</span>
                      <span className="text-[12px] text-[var(--ci-text-muted)]">
                        {c.activitati > 0 ? d.activitati(c.activitati) : ""}
                        {c.activitati > 0 && c.sarcini > 0 ? " · " : ""}
                        {c.sarcini > 0 ? d.sarcini(c.sarcini) : ""}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
              <Button
                variant="primary"
                disabled={pending || alesi.size === 0 || !stare.emailActiv || !stare.linkActiv}
                onClick={() =>
                  ruleaza(
                    async () => {
                      const r = await trimiteInvitatiiAction(orgSlug, activityId, [...alesi]);
                      if (r.ok) {
                        setMesaj({ tip: r.esuate > 0 ? "eroare" : "ok", text: d.trimise(r.trimise, r.esuate) });
                        setStare(null);
                      }
                      return r;
                    },
                    d.trimiteOk,
                  )
                }
              >
                {d.trimite(alesi.size)}
              </Button>
            </>
          )}
        </div>
      )}
      <MesajActiune mesaj={mesaj} />
    </div>
  );
}

// Linkul coordonatorului: fără cont, valabil până la 3 zile după activitate; arată lista tură cu tură, prezența dintr-un clic și codul QR.
function LinkCoordonator({ orgSlug, a }: { orgSlug: string; a: ActivitateEchipa }) {
  const dict = VOLUNTARI_UI_DICT[useLocale()];
  const d = dict.activitati.link;
  const { pending, mesaj, ruleaza } = useActiune();
  const [copiat, setCopiat] = useState(false);
  const [nou, setNou] = useState<string | null>(null);
  const link = nou ?? a.linkCoordonator;
  async function copiaza() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopiat(true);
      setTimeout(() => setCopiat(false), 2000);
    } catch {
      // clipboard indisponibil: linkul rămâne selectabil
    }
  }
  return (
    <div className="rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="flex items-center gap-1.5 text-[14px] font-semibold text-[var(--ci-text)]">
            <Link2 className="h-4 w-4 text-[var(--ci-primary)]" aria-hidden /> {d.titlu}
          </h3>
          <p className="mt-0.5 text-[12.5px] text-[var(--ci-text-muted)]">{d.desc}</p>
        </div>
        {!link ? (
          <Button size="sm" variant="primary" disabled={pending} onClick={() => ruleaza(async () => { const r = await genereazaLinkCoordonatorAction(orgSlug, a.id); if (r.ok) setNou(r.link); return r; }, d.creat)}>
            {d.creeaza}
          </Button>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            <Button size="sm" onClick={copiaza}>
              {copiat ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} {copiat ? dict.comun.copiat : dict.comun.copiaza}
            </Button>
            <Button size="sm" disabled={pending} onClick={() => ruleaza(async () => { const r = await genereazaLinkCoordonatorAction(orgSlug, a.id); if (r.ok) setNou(r.link); return r; }, d.noutCreat)}>
              {d.nou}
            </Button>
            <Button size="sm" variant="ghost" disabled={pending} onClick={() => ruleaza(async () => { const r = await opresteLinkCoordonatorAction(orgSlug, a.id); if (r.ok) setNou(""); return r; }, d.oprit)}>
              {d.opreste}
            </Button>
          </div>
        )}
      </div>
      {link && <p className="mt-2 truncate rounded-lg bg-[var(--ci-surface-2)] px-2.5 py-1.5 text-[12.5px] select-all text-[var(--ci-text)]">{link}</p>}
      <MesajActiune mesaj={mesaj} />
    </div>
  );
}

function OreInput({ orgSlug, id, ore, validat }: { orgSlug: string; id: string; ore: number | null; validat: boolean }) {
  const d = VOLUNTARI_UI_DICT[useLocale()].activitati.ore;
  const { pending, ruleaza } = useActiune();
  const [valoare, setValoare] = useState(ore != null ? String(ore) : "");
  return (
    <span className="inline-flex items-center gap-1 text-[12px] text-[var(--ci-text-muted)]">
      <label htmlFor={`ore-${id}`} className="sr-only">
        {d.eticheta}
      </label>
      <Input
        id={`ore-${id}`}
        className="h-8 w-16 px-2 text-[13px]"
        inputMode="decimal"
        value={valoare}
        onChange={(e) => setValoare(e.target.value.replace(",", "."))}
        onBlur={() => {
          const n = Number(valoare);
          if (valoare !== "" && Number.isFinite(n) && n !== ore) ruleaza(() => seteazaOreAction(orgSlug, id, n), d.actualizate);
        }}
        aria-describedby={validat ? `v-${id}` : undefined}
      />
      <span>{d.ore}{validat ? " ✓" : ""}</span>
      {validat && (
        <span id={`v-${id}`} className="sr-only">
          {d.validate}
        </span>
      )}
      {pending ? "…" : ""}
    </span>
  );
}

// ===== Formular activitate =====
type TuraForm = { id?: string; nume: string; inceputLa: string; seTerminaLa: string; locuri: string };

function FormularActivitate({ orgSlug, initial, onClose }: { orgSlug: string; initial: ActivitateEchipa | null; onClose: () => void }) {
  const dict = VOLUNTARI_UI_DICT[useLocale()];
  const d = dict.activitati.form;
  const { pending, mesaj, ruleaza } = useActiune();
  const [titlu, setTitlu] = useState(initial?.titlu ?? "");
  const [inceputLa, setInceputLa] = useState(initial ? laOraRo(initial.inceputLa) : "");
  const [seTerminaLa, setSeTerminaLa] = useState(initial ? laOraRo(initial.seTerminaLa) : "");
  const [locatie, setLocatie] = useState(initial?.locatie ?? "");
  const [localitate, setLocalitate] = useState(initial?.localitate ?? "");
  const [coordonatorNume, setCoordonatorNume] = useState(initial?.coordonatorNume ?? "");
  const [coordonatorTelefon, setCoordonatorTelefon] = useState(initial?.coordonatorTelefon ?? "");
  const [aprobare, setAprobare] = useState<"automata" | "manuala">((initial?.aprobare as "automata" | "manuala") ?? "automata");
  const [descriere, setDescriere] = useState(initial?.descriere ?? "");
  const [cerinte, setCerinte] = useState(initial?.cerinte ?? "");
  const [instructiuni, setInstructiuni] = useState(initial?.instructiuni ?? "");
  const [contactZi, setContactZi] = useState(initial?.contactZi ?? "");
  const [cuMinori, setCuMinori] = useState(initial?.cuMinori ?? false);
  const [rezultatEticheta, setRezultatEticheta] = useState(initial?.rezultatEticheta ?? "");
  const [locuri, setLocuri] = useState(initial && initial.ture.length === 1 ? String(initial.ture[0].locuri) : "10");
  const [ture, setTure] = useState<TuraForm[]>(
    initial && initial.ture.length > 1 ? initial.ture.map((t) => ({ id: t.id, nume: t.nume, inceputLa: laOraRo(t.inceputLa), seTerminaLa: laOraRo(t.seTerminaLa), locuri: String(t.locuri) })) : [],
  );
  const [pePeTure, setPePeTure] = useState(ture.length > 0);
  const [maiMulte, setMaiMulte] = useState(!!initial && !!(initial.descriere || initial.cerinte || initial.instructiuni || initial.contactZi || initial.cuMinori || initial.rezultatEticheta));

  function trimite(stare: "ciorna" | "publicata") {
    const turiTrimise = pePeTure && ture.length > 0
      ? ture.map((t) => ({ id: t.id, nume: t.nume, inceputLa: t.inceputLa || inceputLa, seTerminaLa: t.seTerminaLa || seTerminaLa, locuri: Number(t.locuri) }))
      : [{ id: initial && initial.ture.length === 1 ? initial.ture[0].id : undefined, nume: initial && initial.ture.length === 1 ? initial.ture[0].nume : "Voluntar", inceputLa, seTerminaLa, locuri: Number(locuri) }];
    const input: ActivitateInput = {
      id: initial?.id,
      titlu,
      descriere,
      locatie,
      localitate,
      inceputLa,
      seTerminaLa,
      coordonatorNume,
      coordonatorTelefon,
      aprobare,
      cerinte,
      instructiuni,
      contactZi,
      cuMinori,
      rezultatEticheta,
      ture: turiTrimise,
      stare,
    };
    ruleaza(() => salveazaActivitateAction(orgSlug, input), stare === "ciorna" ? d.ciornaSalvata : d.publicata, () => onClose());
  }

  return (
    <Dialog open onClose={onClose} title={initial ? d.editeaza : d.noua} width="max-w-2xl">
      <div className="space-y-4">
        <div>
          <Label htmlFor="va-titlu">{d.titlu}</Label>
          <Input id="va-titlu" value={titlu} maxLength={MAX.titlu} onChange={(e) => setTitlu(e.target.value)} placeholder={d.titluPlaceholder} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="va-start">{d.incepe}</Label>
            <Input id="va-start" type="datetime-local" value={inceputLa} onChange={(e) => setInceputLa(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="va-end">{d.seTermina}</Label>
            <Input id="va-end" type="datetime-local" value={seTerminaLa} onChange={(e) => setSeTerminaLa(e.target.value)} />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <Label htmlFor="va-loc">{d.locul}</Label>
            <Input id="va-loc" value={locatie} maxLength={MAX.locatie} onChange={(e) => setLocatie(e.target.value)} placeholder={d.locPlaceholder} />
          </div>
          <div>
            <Label htmlFor="va-loca">{d.localitatea}</Label>
            <Input id="va-loca" value={localitate} maxLength={80} onChange={(e) => setLocalitate(e.target.value)} />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="va-cn">{d.coordonator}</Label>
            <Input id="va-cn" value={coordonatorNume} maxLength={MAX.nume} onChange={(e) => setCoordonatorNume(e.target.value)} placeholder={d.numePlaceholder} />
          </div>
          <div>
            <Label htmlFor="va-ct">{d.telCoord}</Label>
            <Input id="va-ct" inputMode="tel" value={coordonatorTelefon} maxLength={30} onChange={(e) => setCoordonatorTelefon(e.target.value)} />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="va-aprobare">{d.inscrierea}</Label>
            <Select id="va-aprobare" value={aprobare} onChange={(e) => setAprobare(e.target.value as "automata" | "manuala")}>
              <option value="automata">{d.automata}</option>
              <option value="manuala">{d.manuala}</option>
            </Select>
          </div>
          {!pePeTure && (
            <div>
              <Label htmlFor="va-locuri">{d.locuri}</Label>
              <Input id="va-locuri" inputMode="numeric" value={locuri} onChange={(e) => setLocuri(e.target.value.replace(/\D/g, ""))} />
            </div>
          )}
        </div>

        <div className="rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[13px] text-[var(--ci-text-muted)]">{pePeTure ? d.ture : d.unRol}</p>
            <Button
              size="sm"
              onClick={() => {
                if (!pePeTure) {
                  setPePeTure(true);
                  setTure([{ nume: "Voluntar", inceputLa: "", seTerminaLa: "", locuri }]);
                } else {
                  setPePeTure(false);
                }
              }}
            >
              {pePeTure ? d.revin : d.imparte}
            </Button>
          </div>
          {pePeTure && (
            <div className="mt-3 space-y-3">
              {ture.map((t, idx) => (
                <div key={idx} className="grid gap-2 rounded-lg bg-[var(--ci-surface-2)] p-2.5 sm:grid-cols-[1.4fr_1fr_1fr_5rem_auto]">
                  <Input aria-label={d.numeTura} value={t.nume} onChange={(e) => setTure((x) => x.map((y, k) => (k === idx ? { ...y, nume: e.target.value } : y)))} placeholder={d.numeTuraPlaceholder} />
                  <Input aria-label={d.incepeGol} type="datetime-local" value={t.inceputLa} onChange={(e) => setTure((x) => x.map((y, k) => (k === idx ? { ...y, inceputLa: e.target.value } : y)))} />
                  <Input aria-label={d.seTerminaGol} type="datetime-local" value={t.seTerminaLa} onChange={(e) => setTure((x) => x.map((y, k) => (k === idx ? { ...y, seTerminaLa: e.target.value } : y)))} />
                  <Input aria-label={d.locuri} inputMode="numeric" value={t.locuri} onChange={(e) => setTure((x) => x.map((y, k) => (k === idx ? { ...y, locuri: e.target.value.replace(/\D/g, "") } : y)))} />
                  <Button size="sm" variant="ghost" aria-label={d.scoateRand} disabled={ture.length === 1} onClick={() => setTure((x) => x.filter((_, k) => k !== idx))}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              <p className="text-[12px] text-[var(--ci-text-muted)]">{d.oraGoala}</p>
              <Button size="sm" onClick={() => setTure((x) => [...x, { nume: "", inceputLa: "", seTerminaLa: "", locuri: "5" }])}>
                <Plus className="h-3.5 w-3.5" /> {d.adaugaRand}
              </Button>
            </div>
          )}
        </div>

        <button type="button" className="text-[13px] font-semibold text-[var(--ci-primary)] hover:underline" aria-expanded={maiMulte} onClick={() => setMaiMulte((x) => !x)}>
          {maiMulte ? d.ascunde : d.maiMulte}
        </button>
        {maiMulte && (
          <div className="space-y-4 rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] p-3.5">
            <div>
              <Label htmlFor="va-desc">{d.descriere}</Label>
              <Textarea id="va-desc" rows={2} value={descriere} maxLength={MAX.descriere} onChange={(e) => setDescriere(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="va-cer">{d.cerinte}</Label>
              <Textarea id="va-cer" rows={2} value={cerinte} maxLength={MAX.instructiuni} onChange={(e) => setCerinte(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="va-ins">{d.instructiuni}</Label>
              <Textarea id="va-ins" rows={2} value={instructiuni} maxLength={MAX.instructiuni} onChange={(e) => setInstructiuni(e.target.value)} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="va-cz">{d.contactZi}</Label>
                <Input id="va-cz" value={contactZi} maxLength={200} onChange={(e) => setContactZi(e.target.value)} placeholder={d.contactPlaceholder} />
              </div>
              <div>
                <Label htmlFor="va-rez">{d.ceMasuram}</Label>
                <Input id="va-rez" value={rezultatEticheta} maxLength={60} onChange={(e) => setRezultatEticheta(e.target.value)} placeholder={d.masuramPlaceholder} />
              </div>
            </div>
            <label className="flex items-start gap-2 text-[13px] text-[var(--ci-text)]">
              <input type="checkbox" className="mt-0.5" checked={cuMinori} onChange={(e) => setCuMinori(e.target.checked)} />
              <span>
                {d.minori} <span className="text-[var(--ci-text-muted)]">{d.minoriNota}</span>
              </span>
            </label>
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

