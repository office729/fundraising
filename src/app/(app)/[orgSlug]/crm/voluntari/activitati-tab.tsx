"use client";

import { CalendarDays, Check, Copy, Download, Link2, MapPin, Pencil, Plus, Trash2, Users } from "lucide-react";
import { useState } from "react";

import { ETICHETE_INSCRIERE, laOraRo, MAX } from "@/lib/voluntari-activitati";

import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Dialog } from "../components/ui/dialog";
import { Input, Label, Select, Textarea } from "../components/ui/input";
import { EmptyState } from "../components/ui/states";

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

const stareActivitate: Record<string, string> = { ciorna: "Ciornă", publicata: "Publicată", incheiata: "Încheiată", anulata: "Anulată" };

export function ActivitatiTab({ orgSlug, date, deschis, inchideFormular }: { orgSlug: string; date: DateVoluntari; deschis: boolean; inchideFormular: () => void }) {
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
                    {cereri} {cereri === 1 ? "cerere" : "cereri"}
                  </Badge>
                )}
                <Badge tone={a.stare === "publicata" ? "green" : "neutral"} icon={false}>
                  {stareActivitate[a.stare] ?? a.stare}
                </Badge>
              </div>
            </div>
            <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[12.5px] text-[var(--ci-text-muted)]">
              <div className="flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" aria-hidden /> {dataOra(a.inceputLa)} – {ora(a.seTerminaLa)}
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" aria-hidden /> {a.locatie}
                {a.localitate ? `, ${a.localitate}` : ""}
              </div>
              <div className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" aria-hidden /> {ocupate} / {locuri} locuri
              </div>
            </dl>
          </Card>
        </button>
      </li>
    );
  };

  return (
    <div className="space-y-4">
      <Sectiune titlu="Activități pe teren" descriere="Evenimente și acțiuni la care voluntarii vin fizic: colectări, evenimente, vizite. Fiecare are ture sau roluri cu locuri, iar la final se confirmă prezența și orele." />

      {date.activitati.length === 0 ? (
        <EmptyState icon={CalendarDays} title="Nicio activitate încă" description="Creează prima activitate: dată, loc și câte locuri ai. Voluntarii se pot înscrie imediat de pe pagina lor." />
      ) : (
        <>
          {viitoare.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-[12px] font-semibold tracking-wide text-[var(--ci-text-muted)] uppercase">Urmează</h3>
              <ul className="space-y-2">{viitoare.map(rand)}</ul>
            </div>
          )}
          {trecute.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-[12px] font-semibold tracking-wide text-[var(--ci-text-muted)] uppercase">Încheiate sau anulate</h3>
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
            {stareActivitate[a.stare] ?? a.stare}
          </Badge>
          <span>
            {dataOra(a.inceputLa)} – {ora(a.seTerminaLa)} · {a.locatie}
            {a.localitate ? `, ${a.localitate}` : ""}
          </span>
          {a.cuMinori && <Badge tone="amber" icon={false}>Cu minori</Badge>}
        </div>
        {(a.coordonatorNume || a.contactZi) && (
          <p className="text-[13px] text-[var(--ci-text-muted)]">
            Coordonator: <b className="text-[var(--ci-text)]">{a.coordonatorNume || "—"}</b>
            {a.coordonatorTelefon ? ` · ${a.coordonatorTelefon}` : ""}
            {a.contactZi ? ` · Contact în ziua activității: ${a.contactZi}` : ""}
          </p>
        )}

        <div className="overflow-x-auto rounded-[var(--ci-radius-card)] border border-[var(--ci-border)]">
          <table className="w-full min-w-[520px] text-left text-[13px]">
            <thead className="bg-[var(--ci-surface-2)] text-[11.5px] tracking-wide text-[var(--ci-text-muted)] uppercase">
              <tr>
                <th className="px-3 py-2 font-semibold">Tură / rol</th>
                <th className="px-3 py-2 font-semibold">Interval</th>
                <th className="px-3 py-2 text-right font-semibold">Locuri</th>
              </tr>
            </thead>
            <tbody>
              {a.ture.map((t) => (
                <tr key={t.id} className="border-t border-[var(--ci-border)]">
                  <td className="px-3 py-2 font-medium text-[var(--ci-text)]">{t.nume}</td>
                  <td className="px-3 py-2 text-[var(--ci-text-muted)]">
                    {ora(t.inceputLa)} – {ora(t.seTerminaLa)}
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
            <h3 className="text-[14px] font-semibold text-[var(--ci-text)]">Înscriși ({a.inscrisi.filter((i) => i.status !== "anulata").length})</h3>
            {a.inscrisi.length > 0 && (
              <Button
                size="sm"
                onClick={() =>
                  descarcaCsv(`voluntari-${a.titlu.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)}.csv`, [
                    ["Voluntar", "Telefon", "Email", "Tură / rol", "Status", "Ore", "Ore validate"],
                    ...a.inscrisi.map((i) => [i.voluntar, i.telefon, i.email, i.tura, ETICHETE_INSCRIERE[i.status as keyof typeof ETICHETE_INSCRIERE] ?? i.status, i.oreCalculate, i.oreValidate]),
                  ])
                }
              >
                <Download className="h-3.5 w-3.5" /> Export CSV
              </Button>
            )}
          </div>
          {a.inscrisi.length === 0 ? (
            <p className="rounded-lg bg-[var(--ci-surface-2)] px-3 py-3 text-[13px] text-[var(--ci-text-muted)]">Nimeni nu s-a înscris încă.</p>
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
                    <PastilaStatus valoare={i.status} eticheta={ETICHETE_INSCRIERE[i.status as keyof typeof ETICHETE_INSCRIERE] ?? i.status} />
                    {i.status === "in_asteptare" && (
                      <>
                        <Button size="sm" variant="primary" disabled={pending} onClick={() => ruleaza(() => decideInscriereAction(orgSlug, i.id, true), "Cererea a fost aprobată.")}>
                          Aprobă
                        </Button>
                        <Button size="sm" disabled={pending} onClick={() => ruleaza(() => decideInscriereAction(orgSlug, i.id, false), "Cererea a fost respinsă.")}>
                          Respinge
                        </Button>
                      </>
                    )}
                    {(i.status === "confirmata" || i.status === "prezent" || i.status === "absent") && (
                      <>
                        <Button size="sm" variant={i.status === "prezent" ? "primary" : "secondary"} disabled={pending} onClick={() => ruleaza(() => marcheazaPrezentaAction(orgSlug, i.id, i.status === "prezent" ? "confirmata" : "prezent"), "Prezența a fost actualizată.")}>
                          Prezent
                        </Button>
                        <Button size="sm" disabled={pending} onClick={() => ruleaza(() => marcheazaPrezentaAction(orgSlug, i.id, i.status === "absent" ? "confirmata" : "absent"), "Prezența a fost actualizată.")}>
                          Absent
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
            <h3 className="text-[14px] font-semibold text-[var(--ci-text)]">Închide activitatea</h3>
            <p className="mt-0.5 text-[12.5px] text-[var(--ci-text-muted)]">
              {prezenti.length} {prezenti.length === 1 ? "voluntar prezent" : "voluntari prezenți"}. Doar orele validate intră în adeverințe și în rapoarte{deValidat ? "; unele încă nu sunt validate" : ""}.
            </p>
            <div className="mt-2.5 flex flex-wrap items-end gap-3">
              {a.rezultatEticheta && (
                <div>
                  <Label htmlFor="vr-rez">{a.rezultatEticheta}</Label>
                  <Input id="vr-rez" className="w-40" inputMode="decimal" value={rezultat} onChange={(e) => setRezultat(e.target.value.replace(",", "."))} placeholder="valoare" />
                </div>
              )}
              <Button variant="primary" disabled={pending} onClick={() => ruleaza(() => valideazaOreActivitateAction(orgSlug, a.id, a.rezultatEticheta && rezultat ? Number(rezultat) : null), "Orele sunt validate, iar activitatea e încheiată.")}>
                Validează orele și încheie
              </Button>
            </div>
          </div>
        )}

        <MesajActiune mesaj={mesaj} />

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--ci-border)] pt-3">
          <div className="flex flex-wrap gap-1.5">
            <Button size="sm" onClick={onEdit}>
              <Pencil className="h-3.5 w-3.5" /> Editează
            </Button>
            {a.stare === "publicata" && (
              <Button size="sm" disabled={pending} onClick={() => ruleaza(() => seteazaStareActivitateAction(orgSlug, a.id, "anulata"), "Activitatea a fost anulată.")}>
                Anulează activitatea
              </Button>
            )}
            {a.stare === "anulata" && (
              <Button size="sm" disabled={pending} onClick={() => ruleaza(() => seteazaStareActivitateAction(orgSlug, a.id, "publicata"), "Activitatea e din nou publicată.")}>
                Republică
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => setConfirmaSterge(true)} aria-label="Șterge activitatea">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
          <Button onClick={onClose}>Închide</Button>
        </div>

        {confirmaSterge && (
          <div role="alertdialog" aria-label="Confirmare ștergere" className="rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] bg-[var(--ci-surface-2)] p-3 text-[13px]">
            <p className="text-[var(--ci-text)]">Ștergi „{a.titlu}” împreună cu înscrierile și orele? Nu se poate anula. Dacă a fost doar amânată, folosește „Anulează activitatea”.</p>
            <div className="mt-2 flex gap-2">
              <Button size="sm" onClick={() => setConfirmaSterge(false)}>Renunț</Button>
              <Button size="sm" variant="primary" disabled={pending} onClick={() => ruleaza(() => stergeActivitateAction(orgSlug, a.id), "Activitatea a fost ștearsă.", () => onClose())}>
                Șterge definitiv
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
      "Lista a fost încărcată.",
    );
  }

  return (
    <div className="rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-[14px] font-semibold text-[var(--ci-text)]">Invită voluntari</h3>
          <p className="mt-0.5 text-[12.5px] text-[var(--ci-text-muted)]">Doar cei care au bifat că vor invitații, au mai făcut ceva cu organizația și nu au primit o invitație în ultimele 7 zile.</p>
        </div>
        {!stare && (
          <Button size="sm" disabled={pending} onClick={incarca}>
            Vezi cui poți trimite
          </Button>
        )}
      </div>
      {stare && (
        <div className="mt-3 space-y-2">
          {!stare.emailActiv && <p className="rounded-lg bg-[var(--ci-amber-soft)] px-3 py-2 text-[12.5px] text-[var(--ci-text)]">Emailul nu e configurat pe acest server, deci invitațiile nu pot pleca.</p>}
          {!stare.linkActiv && <p className="rounded-lg bg-[var(--ci-amber-soft)] px-3 py-2 text-[12.5px] text-[var(--ci-text)]">Linkul voluntarilor nu e pornit; invitația trimite voluntarii acolo.</p>}
          {stare.candidati.length === 0 ? (
            <p className="text-[13px] text-[var(--ci-text-muted)]">Nu există voluntari de invitat acum.</p>
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
                        {c.activitati > 0 ? `${c.activitati} ${c.activitati === 1 ? "activitate" : "activități"}` : ""}
                        {c.activitati > 0 && c.sarcini > 0 ? " · " : ""}
                        {c.sarcini > 0 ? `${c.sarcini} ${c.sarcini === 1 ? "sarcină" : "sarcini"}` : ""}
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
                        setMesaj({ tip: r.esuate > 0 ? "eroare" : "ok", text: `Trimise: ${r.trimise}${r.esuate > 0 ? `; ${r.esuate} nu au putut pleca` : ""}.` });
                        setStare(null);
                      }
                      return r;
                    },
                    "Invitațiile au fost trimise.",
                  )
                }
              >
                Trimite invitația ({alesi.size})
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
            <Link2 className="h-4 w-4 text-[var(--ci-primary)]" aria-hidden /> Link pentru coordonator
          </h3>
          <p className="mt-0.5 text-[12.5px] text-[var(--ci-text-muted)]">Fără cont. Coordonatorul marchează prezența și arată codul QR de check-in. Valabil până la 3 zile după activitate.</p>
        </div>
        {!link ? (
          <Button size="sm" variant="primary" disabled={pending} onClick={() => ruleaza(async () => { const r = await genereazaLinkCoordonatorAction(orgSlug, a.id); if (r.ok) setNou(r.link); return r; }, "Linkul a fost creat.")}>
            Creează linkul
          </Button>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            <Button size="sm" onClick={copiaza}>
              {copiat ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} {copiat ? "Copiat" : "Copiază"}
            </Button>
            <Button size="sm" disabled={pending} onClick={() => ruleaza(async () => { const r = await genereazaLinkCoordonatorAction(orgSlug, a.id); if (r.ok) setNou(r.link); return r; }, "Link nou creat; cel vechi nu mai funcționează.")}>
              Link nou
            </Button>
            <Button size="sm" variant="ghost" disabled={pending} onClick={() => ruleaza(async () => { const r = await opresteLinkCoordonatorAction(orgSlug, a.id); if (r.ok) setNou(""); return r; }, "Linkul a fost oprit.")}>
              Oprește
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
  const { pending, ruleaza } = useActiune();
  const [valoare, setValoare] = useState(ore != null ? String(ore) : "");
  return (
    <span className="inline-flex items-center gap-1 text-[12px] text-[var(--ci-text-muted)]">
      <label htmlFor={`ore-${id}`} className="sr-only">
        Ore
      </label>
      <Input
        id={`ore-${id}`}
        className="h-8 w-16 px-2 text-[13px]"
        inputMode="decimal"
        value={valoare}
        onChange={(e) => setValoare(e.target.value.replace(",", "."))}
        onBlur={() => {
          const n = Number(valoare);
          if (valoare !== "" && Number.isFinite(n) && n !== ore) ruleaza(() => seteazaOreAction(orgSlug, id, n), "Orele au fost actualizate.");
        }}
        aria-describedby={validat ? `v-${id}` : undefined}
      />
      <span>ore{validat ? " ✓" : ""}</span>
      {validat && (
        <span id={`v-${id}`} className="sr-only">
          validate
        </span>
      )}
      {pending ? "…" : ""}
    </span>
  );
}

// ===== Formular activitate =====
type TuraForm = { id?: string; nume: string; inceputLa: string; seTerminaLa: string; locuri: string };

function FormularActivitate({ orgSlug, initial, onClose }: { orgSlug: string; initial: ActivitateEchipa | null; onClose: () => void }) {
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
    ruleaza(() => salveazaActivitateAction(orgSlug, input), stare === "ciorna" ? "Ciorna a fost salvată." : "Activitatea e publicată.", () => onClose());
  }

  return (
    <Dialog open onClose={onClose} title={initial ? "Editează activitatea" : "Activitate nouă"} width="max-w-2xl">
      <div className="space-y-4">
        <div>
          <Label htmlFor="va-titlu">Titlu</Label>
          <Input id="va-titlu" value={titlu} maxLength={MAX.titlu} onChange={(e) => setTitlu(e.target.value)} placeholder="ex. Colectă de alimente, magazin din centru" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="va-start">Începe</Label>
            <Input id="va-start" type="datetime-local" value={inceputLa} onChange={(e) => setInceputLa(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="va-end">Se termină</Label>
            <Input id="va-end" type="datetime-local" value={seTerminaLa} onChange={(e) => setSeTerminaLa(e.target.value)} />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <Label htmlFor="va-loc">Locul</Label>
            <Input id="va-loc" value={locatie} maxLength={MAX.locatie} onChange={(e) => setLocatie(e.target.value)} placeholder="Adresa sau numele locului" />
          </div>
          <div>
            <Label htmlFor="va-loca">Localitatea</Label>
            <Input id="va-loca" value={localitate} maxLength={80} onChange={(e) => setLocalitate(e.target.value)} />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="va-cn">Coordonator</Label>
            <Input id="va-cn" value={coordonatorNume} maxLength={MAX.nume} onChange={(e) => setCoordonatorNume(e.target.value)} placeholder="Nume" />
          </div>
          <div>
            <Label htmlFor="va-ct">Telefon coordonator</Label>
            <Input id="va-ct" inputMode="tel" value={coordonatorTelefon} maxLength={30} onChange={(e) => setCoordonatorTelefon(e.target.value)} />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="va-aprobare">Înscrierea</Label>
            <Select id="va-aprobare" value={aprobare} onChange={(e) => setAprobare(e.target.value as "automata" | "manuala")}>
              <option value="automata">Se confirmă automat (cu listă de rezervă)</option>
              <option value="manuala">O aprob eu, una câte una</option>
            </Select>
          </div>
          {!pePeTure && (
            <div>
              <Label htmlFor="va-locuri">Locuri</Label>
              <Input id="va-locuri" inputMode="numeric" value={locuri} onChange={(e) => setLocuri(e.target.value.replace(/\D/g, ""))} />
            </div>
          )}
        </div>

        <div className="rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[13px] text-[var(--ci-text-muted)]">{pePeTure ? "Ture și roluri" : "Un singur rol: „Voluntar”, pe tot intervalul."}</p>
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
              {pePeTure ? "Revin la un singur rol" : "Împarte pe ture sau roluri"}
            </Button>
          </div>
          {pePeTure && (
            <div className="mt-3 space-y-3">
              {ture.map((t, idx) => (
                <div key={idx} className="grid gap-2 rounded-lg bg-[var(--ci-surface-2)] p-2.5 sm:grid-cols-[1.4fr_1fr_1fr_5rem_auto]">
                  <Input aria-label="Numele turei sau rolului" value={t.nume} onChange={(e) => setTure((x) => x.map((y, k) => (k === idx ? { ...y, nume: e.target.value } : y)))} placeholder="ex. Primire" />
                  <Input aria-label="Începe (gol = ca activitatea)" type="datetime-local" value={t.inceputLa} onChange={(e) => setTure((x) => x.map((y, k) => (k === idx ? { ...y, inceputLa: e.target.value } : y)))} />
                  <Input aria-label="Se termină (gol = ca activitatea)" type="datetime-local" value={t.seTerminaLa} onChange={(e) => setTure((x) => x.map((y, k) => (k === idx ? { ...y, seTerminaLa: e.target.value } : y)))} />
                  <Input aria-label="Locuri" inputMode="numeric" value={t.locuri} onChange={(e) => setTure((x) => x.map((y, k) => (k === idx ? { ...y, locuri: e.target.value.replace(/\D/g, "") } : y)))} />
                  <Button size="sm" variant="ghost" aria-label="Scoate rândul" disabled={ture.length === 1} onClick={() => setTure((x) => x.filter((_, k) => k !== idx))}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              <p className="text-[12px] text-[var(--ci-text-muted)]">Ora lăsată goală înseamnă „la fel ca activitatea”.</p>
              <Button size="sm" onClick={() => setTure((x) => [...x, { nume: "", inceputLa: "", seTerminaLa: "", locuri: "5" }])}>
                <Plus className="h-3.5 w-3.5" /> Adaugă rând
              </Button>
            </div>
          )}
        </div>

        <button type="button" className="text-[13px] font-semibold text-[var(--ci-primary)] hover:underline" aria-expanded={maiMulte} onClick={() => setMaiMulte((x) => !x)}>
          {maiMulte ? "Ascunde opțiunile" : "Mai multe opțiuni (descriere, cerințe, siguranță, rezultat)"}
        </button>
        {maiMulte && (
          <div className="space-y-4 rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] p-3.5">
            <div>
              <Label htmlFor="va-desc">Descriere</Label>
              <Textarea id="va-desc" rows={2} value={descriere} maxLength={MAX.descriere} onChange={(e) => setDescriere(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="va-cer">Cerințe (vârstă, competențe, echipament, documente)</Label>
              <Textarea id="va-cer" rows={2} value={cerinte} maxLength={MAX.instructiuni} onChange={(e) => setCerinte(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="va-ins">Instrucțiuni (acces, transport, masă, siguranță)</Label>
              <Textarea id="va-ins" rows={2} value={instructiuni} maxLength={MAX.instructiuni} onChange={(e) => setInstructiuni(e.target.value)} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="va-cz">Contact în ziua activității</Label>
                <Input id="va-cz" value={contactZi} maxLength={200} onChange={(e) => setContactZi(e.target.value)} placeholder="nume și telefon" />
              </div>
              <div>
                <Label htmlFor="va-rez">Ce măsurăm la final (opțional)</Label>
                <Input id="va-rez" value={rezultatEticheta} maxLength={60} onChange={(e) => setRezultatEticheta(e.target.value)} placeholder="ex. kg colectate" />
              </div>
            </div>
            <label className="flex items-start gap-2 text-[13px] text-[var(--ci-text)]">
              <input type="checkbox" className="mt-0.5" checked={cuMinori} onChange={(e) => setCuMinori(e.target.checked)} />
              <span>
                Lucrăm cu minori sau persoane vulnerabile. <span className="text-[var(--ci-text-muted)]">Se marchează activitatea; regulile concrete (acord parental, supraveghere, verificări) le stabilești cu juristul.</span>
              </span>
            </label>
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

