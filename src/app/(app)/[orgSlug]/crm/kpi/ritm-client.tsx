"use client";

import { CalendarDays, CheckCircle2, ClipboardCheck, MessageSquare, Target, Trash2, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Breadcrumb } from "../components/ui/breadcrumb";
import { Button } from "../components/ui/button";
import { Card, CardHeader } from "../components/ui/card";
import { Input, Label, Select, Textarea } from "../components/ui/input";
import { EmptyState } from "../components/ui/states";
import {
  listeazaInteractiuniAction,
  salveaza1la1Action,
  salveazaCheckinAction,
  stergeInteractiuneAction,
  type Checkin,
  type EvenimentCalendar,
  type Intalnire,
  type RitmPagina,
} from "./ritm-actions";

type Tab = "checkin" | "1la1" | "calendar";

const dataRo = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString("ro-RO", { weekday: "short", day: "numeric", month: "long", year: "numeric" });
const dataScurta = (iso: string | null) => (iso ? new Date(`${iso}T12:00:00`).toLocaleDateString("ro-RO", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—");
const AZI = () => new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Bucharest" });

const ICON_EVENIMENT = { "1la1": MessageSquare, checkin: ClipboardCheck, perioada: Target } as const;
const TON_EVENIMENT = { "1la1": "var(--ci-primary)", checkin: "var(--ci-green)", perioada: "var(--ci-amber)" } as const;

export function RitmClient({ orgSlug, ritm, calendar }: { orgSlug: string; ritm: RitmPagina; calendar: EvenimentCalendar[] }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("checkin");
  const [pending, start] = useTransition();
  const [eroare, setEroare] = useState("");

  // Check-in propriu
  const curent = ritm.checkinSaptamanaAceasta;
  const [checkin, setCheckin] = useState({ realizari: curent?.realizari ?? "", blocaje: curent?.blocaje ?? "", prioritate: curent?.prioritate ?? "" });

  // Persoana aleasă pentru vizualizare / 1:1
  const [aleasId, setAleasId] = useState<string>("");
  const [alesDate, setAlesDate] = useState<{ checkinuri: Checkin[]; intalniri: Intalnire[] } | null>(null);
  const [formIntalnire, setFormIntalnire] = useState({ data: AZI(), subiecte: "", decizii: "", actiuni: "", urmatoarea: "" });

  const opt = ritm.echipa;
  const alesNume = opt.find((m) => m.id === aleasId)?.nume ?? "";

  function ruleaza(fn: () => Promise<void>) {
    setEroare("");
    start(async () => {
      try {
        await fn();
      } catch (e) {
        setEroare(e instanceof Error ? e.message : "Eroare.");
      }
    });
  }

  function alege(id: string) {
    setAleasId(id);
    setAlesDate(null);
    if (!id) return;
    ruleaza(async () => setAlesDate(await listeazaInteractiuniAction(orgSlug, id)));
  }

  const salveazaCheckin = () =>
    ruleaza(async () => {
      await salveazaCheckinAction(orgSlug, checkin);
      router.refresh();
    });

  const salveaza1la1 = () =>
    ruleaza(async () => {
      await salveaza1la1Action(orgSlug, aleasId, { ...formIntalnire, urmatoarea: formIntalnire.urmatoarea || null });
      setFormIntalnire({ data: AZI(), subiecte: "", decizii: "", actiuni: "", urmatoarea: "" });
      setAlesDate(await listeazaInteractiuniAction(orgSlug, aleasId));
      router.refresh();
    });

  const sterge = (id: string) => {
    if (!window.confirm("Ștergi această intrare?")) return;
    ruleaza(async () => {
      await stergeInteractiuneAction(orgSlug, id);
      if (aleasId) setAlesDate(await listeazaInteractiuniAction(orgSlug, aleasId));
      router.refresh();
    });
  };

  const taburi: { k: Tab; t: string; icon: typeof CalendarDays }[] = [
    { k: "checkin", t: "Check-in săptămânal", icon: ClipboardCheck },
    { k: "1la1", t: "1:1", icon: MessageSquare },
    { k: "calendar", t: "Calendar", icon: CalendarDays },
  ];

  return (
    <div className="mx-auto max-w-[1000px] space-y-5">
      <Breadcrumb items={[{ label: "Instrumente", href: `/${orgSlug}/crm/instrumente` }, { label: "KPI Library", href: `/${orgSlug}/crm/kpi` }, { label: "Check-in și 1:1" }]} />

      <div>
        <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">Check-in și 1:1</h1>
        <p className="mt-0.5 max-w-2xl text-[13px] text-[var(--ci-text-muted)]">
          Un ritm simplu de discuție, nu un instrument de control: câteva rânduri în fiecare săptămână și notițe comune după fiecare 1:1 — le vede și persoana despre care sunt.
        </p>
      </div>

      <div className="flex gap-1 rounded-[14px] border border-[var(--ci-border)] bg-[var(--ci-surface-2)] p-1">
        {taburi.map(({ k, t, icon: Icon }) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={`flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-[10px] px-3 text-[13px] font-semibold transition-colors ${tab === k ? "bg-[var(--ci-surface)] text-[var(--ci-text)] shadow-sm" : "text-[var(--ci-text-muted)] hover:text-[var(--ci-text)]"}`}
          >
            <Icon className="h-4 w-4" /> {t}
          </button>
        ))}
      </div>

      {eroare && <p className="text-[13px] text-[var(--ci-red)]">{eroare}</p>}

      {tab === "checkin" && (
        <>
          <Card>
            <CardHeader title="Check-in-ul meu" subtitle={ritm.eu ? `Săptămâna care începe pe ${dataScurta(ritm.saptamanaStart)}${curent ? " — salvat, îl poți edita" : ""}` : undefined} />
            {!ritm.eu ? (
              <EmptyState title="Nu ai încă un profil de angajat" description="Un administrator trebuie să te adauge în Organizație & Echipă (legat de contul tău) ca să-ți scrii check-in-ul." />
            ) : (
              <div className="space-y-3">
                <div>
                  <Label>Ce mi-a ieșit bine săptămâna asta</Label>
                  <Textarea rows={3} value={checkin.realizari} onChange={(e) => setCheckin({ ...checkin, realizari: e.target.value })} placeholder="Realizări, lucruri de care ești mulțumit(ă)" />
                </div>
                <div>
                  <Label>Unde am nevoie de ajutor sau ce m-a încurcat</Label>
                  <Textarea rows={3} value={checkin.blocaje} onChange={(e) => setCheckin({ ...checkin, blocaje: e.target.value })} placeholder="Blocaje, lipsă de informații, idei de îmbunătățire" />
                </div>
                <div>
                  <Label>Prioritatea mea pentru săptămâna viitoare</Label>
                  <Textarea rows={2} value={checkin.prioritate} onChange={(e) => setCheckin({ ...checkin, prioritate: e.target.value })} />
                </div>
                <Button variant="primary" onClick={salveazaCheckin} disabled={pending}>
                  {curent ? "Actualizează check-in-ul" : "Salvează check-in-ul"}
                </Button>
              </div>
            )}
          </Card>

          {ritm.checkinuriMele.length > 0 && (
            <Card>
              <CardHeader title="Check-in-urile mele anterioare" />
              <div className="space-y-2">
                {ritm.checkinuriMele.map((c) => (
                  <ChecinCard key={c.id} c={c} />
                ))}
              </div>
            </Card>
          )}

          {opt.length > 0 && (
            <Card>
              <CardHeader title="Echipa" subtitle="Cine și-a scris check-in-ul săptămâna asta" />
              <div className="divide-y divide-[var(--ci-border)]">
                {opt.map((m) => (
                  <div key={m.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-[var(--ci-text)]">{m.nume}</p>
                      <p className="text-[12px] text-[var(--ci-text-muted)]">Ultimul check-in: {dataScurta(m.ultimulCheckin)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {m.checkinSaptamana ? (
                        <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--ci-green)]">
                          <CheckCircle2 className="h-3.5 w-3.5" /> scris
                        </span>
                      ) : (
                        <span className="text-[12px] text-[var(--ci-text-faint)]">încă nu</span>
                      )}
                      <button
                        type="button"
                        className="min-h-8 text-[12px] font-semibold text-[var(--ci-primary)] hover:underline"
                        onClick={() => {
                          setTab("1la1");
                          alege(m.id);
                        }}
                      >
                        Deschide
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}

      {tab === "1la1" && (
        <>
          {opt.length > 0 && (
            <Card>
              <CardHeader title="Persoana" subtitle="Alege un coleg din echipa ta ca să-i vezi check-in-urile și să notezi un 1:1" />
              <Select value={aleasId} onChange={(e) => alege(e.target.value)} className="w-full sm:w-72">
                <option value="">— alege —</option>
                {opt.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nume}
                  </option>
                ))}
              </Select>
            </Card>
          )}

          {aleasId && (
            <>
              <Card>
                <CardHeader title={`1:1 nou — ${alesNume}`} subtitle="Notițele sunt vizibile și pentru persoană" />
                <div className="space-y-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <Label>Data discuției</Label>
                      <Input type="date" value={formIntalnire.data} onChange={(e) => setFormIntalnire({ ...formIntalnire, data: e.target.value })} />
                    </div>
                    <div>
                      <Label>Următorul 1:1 (opțional)</Label>
                      <Input type="date" value={formIntalnire.urmatoarea} onChange={(e) => setFormIntalnire({ ...formIntalnire, urmatoarea: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <Label>Despre ce am vorbit</Label>
                    <Textarea rows={3} value={formIntalnire.subiecte} onChange={(e) => setFormIntalnire({ ...formIntalnire, subiecte: e.target.value })} />
                  </div>
                  <div>
                    <Label>Ce am decis</Label>
                    <Textarea rows={2} value={formIntalnire.decizii} onChange={(e) => setFormIntalnire({ ...formIntalnire, decizii: e.target.value })} />
                  </div>
                  <div>
                    <Label>Pași următori (cine ce face)</Label>
                    <Textarea rows={2} value={formIntalnire.actiuni} onChange={(e) => setFormIntalnire({ ...formIntalnire, actiuni: e.target.value })} />
                  </div>
                  <Button variant="primary" onClick={salveaza1la1} disabled={pending}>
                    Salvează 1:1
                  </Button>
                </div>
              </Card>

              {alesDate && (
                <>
                  <Card>
                    <CardHeader title="1:1-uri anterioare" />
                    {alesDate.intalniri.length === 0 ? <p className="text-[13px] text-[var(--ci-text-muted)]">Niciun 1:1 notat încă.</p> : <ListaIntalniri intalniri={alesDate.intalniri} onSterge={sterge} />}
                  </Card>
                  <Card>
                    <CardHeader title={`Check-in-urile lui ${alesNume}`} />
                    {alesDate.checkinuri.length === 0 ? (
                      <p className="text-[13px] text-[var(--ci-text-muted)]">Niciun check-in încă.</p>
                    ) : (
                      <div className="space-y-2">
                        {alesDate.checkinuri.map((c) => (
                          <ChecinCard key={c.id} c={c} />
                        ))}
                      </div>
                    )}
                  </Card>
                </>
              )}
            </>
          )}

          <Card>
            <CardHeader title="1:1-urile mele" subtitle="Notițele făcute despre mine — le văd și eu" />
            {ritm.intalnirileMele.length === 0 ? <p className="text-[13px] text-[var(--ci-text-muted)]">Niciun 1:1 notat încă.</p> : <ListaIntalniri intalniri={ritm.intalnirileMele} onSterge={null} />}
          </Card>

          {opt.length === 0 && !aleasId && (
            <EmptyState icon={Users} title="Nu coordonezi pe nimeni încă" description="Dacă ești manager, setează „Manager direct” pe colegi în Organizație & Echipă și apar aici." />
          )}
        </>
      )}

      {tab === "calendar" && (
        <Card>
          <CardHeader title="Următoarele 45 de zile" subtitle="1:1-uri programate, check-in-ul săptămânii și sfârșitul perioadelor KPI" />
          {calendar.length === 0 ? (
            <EmptyState icon={CalendarDays} title="Nimic programat" description="Aici apar 1:1-urile cu dată setată, check-in-ul și închiderea perioadelor KPI." />
          ) : (
            <div className="space-y-2">
              {calendar.map((e, i) => {
                const Icon = ICON_EVENIMENT[e.tip];
                return (
                  <div key={`${e.data}-${i}`} className="flex items-start gap-3 rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] px-3.5 py-2.5">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white" style={{ background: TON_EVENIMENT[e.tip] }}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-[var(--ci-text)]">{e.titlu}</p>
                      <p className="text-[12px] text-[var(--ci-text-muted)]">
                        {dataRo(e.data)}
                        {e.detaliu ? ` · ${e.detaliu}` : ""}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

function Rand({ titlu, text }: { titlu: string; text: string }) {
  if (!text) return null;
  return (
    <div className="mt-1.5">
      <p className="text-[11px] font-bold tracking-wide text-[var(--ci-text-faint)] uppercase">{titlu}</p>
      <p className="text-[13px] whitespace-pre-wrap text-[var(--ci-text)]">{text}</p>
    </div>
  );
}

function ChecinCard({ c }: { c: Checkin }) {
  return (
    <div className="rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] px-3.5 py-2.5">
      <p className="text-[12px] font-semibold text-[var(--ci-text-muted)]">Săptămâna din {dataScurta(c.data)}</p>
      <Rand titlu="Ce a ieșit bine" text={c.realizari} />
      <Rand titlu="Unde e nevoie de ajutor" text={c.blocaje} />
      <Rand titlu="Prioritate" text={c.prioritate} />
    </div>
  );
}

function ListaIntalniri({ intalniri, onSterge }: { intalniri: Intalnire[]; onSterge: ((id: string) => void) | null }) {
  return (
    <div className="space-y-2">
      {intalniri.map((i) => (
        <div key={i.id} className="rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] px-3.5 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[12px] font-semibold text-[var(--ci-text-muted)]">
              {dataScurta(i.data)}
              {i.urmatoarea ? ` · următorul: ${dataScurta(i.urmatoarea)}` : ""}
            </p>
            {onSterge && (
              <button type="button" onClick={() => onSterge(i.id)} title="Șterge" className="text-[var(--ci-text-faint)] hover:text-[var(--ci-red)]">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <Rand titlu="Despre ce am vorbit" text={i.subiecte} />
          <Rand titlu="Ce am decis" text={i.decizii} />
          <Rand titlu="Pași următori" text={i.actiuni} />
        </div>
      ))}
    </div>
  );
}
