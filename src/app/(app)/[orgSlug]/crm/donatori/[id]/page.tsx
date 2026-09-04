"use client";

import { Check, Mail, MessageCircle, Pencil, Phone, PlusCircle, StickyNote, Trash2, X as XIcon } from "lucide-react";
import { notFound, useParams } from "next/navigation";
import { useState } from "react";

import { Avatar } from "../../components/ui/avatar";
import { Badge, type StatusTone } from "../../components/ui/badge";
import { Breadcrumb } from "../../components/ui/breadcrumb";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { HeartToggle } from "../../components/heart-toggle";
import { Input, Label, Select, Textarea } from "../../components/ui/input";
import { Pagination } from "../../components/ui/pagination";
import { EmptyState } from "../../components/ui/states";
import { Tabs } from "../../components/ui/tabs";
import { formatData, formatDataOra, formatDataRelativa, formatSuma } from "../../lib/format";
import {
  addNotita,
  addProiectDonator,
  addTaskDonator,
  editeazaNotita,
  getComunicareLog,
  getDonatiiExtra,
  getNotite,
  getProiecteDonator,
  getTaskuriDonator,
  logComunicare,
  stergeNotita,
  toggleTaskDonator,
  useLocalStoreValue,
  type Notita,
} from "../../lib/local-store";
import { useDonator } from "../../lib/use-data";
import { useLocale } from "../../lib/locale-context";
import { DONATOR_PROFIL_DICT } from "@/lib/i18n/dictionaries/donator-profil";
import { COMUNICARI, DONATII, TASKURI } from "../../mock";
import { AddDonationDialog } from "./add-donation-dialog";

const SEGMENT_TONE: Record<string, StatusTone> = {
  nou: "blue", fidel: "green", major: "green", recurent: "blue",
  in_risc: "amber", inactiv: "neutral", reactivat: "blue",
};
const RESPONSABILI = ["Andreea Vasilescu", "Vlad Placintă", "Ioana Mureșan"];
const NOTITE_PE_PAGINA = 5;

const EMPTY: never[] = [];

function whatsappHref(telefon: string) {
  const digits = telefon.replace(/[^0-9]/g, "").replace(/^0/, "40");
  return `https://wa.me/${digits}`;
}

export default function DonatorProfilPage() {
  const { orgSlug, id } = useParams<{ orgSlug: string; id: string }>();
  const donator = useDonator(id);
  const locale = useLocale();
  const dict = DONATOR_PROFIL_DICT[locale];
  if (!donator) notFound();

  const [donatieOpen, setDonatieOpen] = useState(false);
  const [notaText, setNotaText] = useState("");
  const [paginaNotite, setPaginaNotite] = useState(1);
  const [proiectNou, setProiectNou] = useState("");
  const [taskTitlu, setTaskTitlu] = useState("");
  const [taskResponsabil, setTaskResponsabil] = useState(RESPONSABILI[0]);
  const [taskTermen, setTaskTermen] = useState("");

  const notite = useLocalStoreValue(() => getNotite(donator.id), EMPTY);
  const donatiiManuale = useLocalStoreValue(() => getDonatiiExtra(donator.id), EMPTY);
  const proiecteAdaugate = useLocalStoreValue(() => getProiecteDonator(donator.id), EMPTY);
  const taskuriLocale = useLocalStoreValue(() => getTaskuriDonator(donator.id), EMPTY);
  const comunicareLog = useLocalStoreValue(() => getComunicareLog(donator.id), EMPTY);

  const donatii = DONATII.filter((d) => d.sursaId === donator.id);
  const comunicariStatice = COMUNICARI.filter((c) => c.legatDe.id === donator.id);
  const taskuriStatice = TASKURI.filter((t) => t.legatDe.id === donator.id);
  const proiecte = [...new Set([...donator.campaniiPreferate, ...proiecteAdaugate])];
  const urmatoareaActiune =
    donator.segment === "in_risc"
      ? dict.urmatoareaActiune.inRisc
      : donator.segment === "inactiv"
        ? dict.urmatoareaActiune.inactiv
        : dict.urmatoareaActiune.implicit;

  function salveazaNota() {
    if (!notaText.trim() || !donator) return;
    addNotita(donator.id, notaText.trim(), dict.notite.autorTu);
    setNotaText("");
    setPaginaNotite(1);
  }

  function salveazaProiect() {
    if (!proiectNou.trim() || !donator) return;
    addProiectDonator(donator.id, proiectNou.trim());
    setProiectNou("");
  }

  function salveazaTask() {
    if (!taskTitlu.trim() || !donator) return;
    addTaskDonator(donator.id, taskTitlu.trim(), taskResponsabil, taskTermen);
    setTaskTitlu("");
    setTaskTermen("");
  }

  const notitePagina = notite.slice((paginaNotite - 1) * NOTITE_PE_PAGINA, paginaNotite * NOTITE_PE_PAGINA);
  const paginiNotite = Math.max(1, Math.ceil(notite.length / NOTITE_PE_PAGINA));

  return (
    <div className="mx-auto max-w-[1200px] space-y-5">
      <Breadcrumb items={[{ label: dict.breadcrumbLabel, href: `/${orgSlug}/crm/donatori` }, { label: donator.nume }]} />

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <Avatar name={donator.nume} size="lg" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">{donator.nume}</h1>
                <HeartToggle id={donator.id} />
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <Badge tone={SEGMENT_TONE[donator.segment]}>{donator.segment.replace("_", " ")}</Badge>
                <Badge tone={donator.status === "activ" ? "green" : donator.status === "nou" ? "blue" : "neutral"}>
                  {donator.status}
                </Badge>
                <Badge tone="neutral">{donator.tip === "recurent" ? dict.status.tip.recurent : dict.status.tip.unic}</Badge>
                <Badge tone="purple" icon={false}>
                  {dict.dateDemonstrative}
                </Badge>
              </div>
              <p className="mt-2 text-[13px] text-[var(--ci-text-muted)]">
                {donator.localitate} · {dict.responsabil(donator.responsabil)}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <QuickAction
              icon={Mail}
              label={dict.quickActions.email}
              href={`mailto:${donator.email}`}
              onClick={() => logComunicare(donator.id, "email", dict.notite.autorTu, dict.logMesaje.email(donator.email))}
            />
            <QuickAction
              icon={Phone}
              label={dict.quickActions.apel}
              href={`tel:${donator.telefon}`}
              onClick={() => logComunicare(donator.id, "apel", dict.notite.autorTu, dict.logMesaje.apel(donator.telefon))}
            />
            <QuickAction
              icon={MessageCircle}
              label={dict.quickActions.whatsapp}
              href={whatsappHref(donator.telefon)}
              external
              onClick={() => logComunicare(donator.id, "whatsapp", dict.notite.autorTu, dict.logMesaje.whatsapp(donator.telefon))}
            />
            <QuickAction icon={PlusCircle} label={dict.quickActions.donatie} primary onClick={() => setDonatieOpen(true)} />
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4 border-t border-[var(--ci-border)] pt-4 sm:grid-cols-4">
          <Stat label={dict.stats.scorImplicare} value={String(donator.scorImplicare)} />
          <Stat label={dict.stats.rfm} value={`${donator.rfm.r}-${donator.rfm.f}-${donator.rfm.m}`} />
          <Stat label={dict.stats.totalDonat} value={formatSuma(donator.totalDonat, donator.moneda)} />
          <Stat label={dict.stats.ultimaDonatie} value={formatDataRelativa(donator.ultimaDonatieLa)} />
        </div>
      </Card>

      <Card className="border-[var(--ci-blue-soft)] bg-[var(--ci-blue-soft)]">
        <p className="text-[11px] font-semibold tracking-wide text-[var(--ci-blue)] uppercase">{dict.urmatoareaActiune.title}</p>
        <p className="mt-1 text-sm font-medium text-[var(--ci-text)]">{urmatoareaActiune}</p>
      </Card>

      <Tabs
        tabs={[
          { key: "prezentare", label: dict.tabs.prezentare },
          { key: "notite", label: dict.tabs.notite(notite.length) },
          { key: "donatii", label: dict.tabs.donatii },
          { key: "comunicare", label: dict.tabs.comunicare },
          { key: "proiecte", label: dict.tabs.proiecte },
          { key: "taskuri", label: dict.tabs.taskuri },
        ]}
      >
        {(active) => {
          if (active === "prezentare")
            return (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Card>
                  <p className="mb-2 text-[13px] font-semibold text-[var(--ci-text)]">{dict.prezentare.dateContact}</p>
                  <InfoRow label={dict.prezentare.email} value={donator.email} />
                  <InfoRow label={dict.prezentare.telefon} value={donator.telefon} />
                  <InfoRow label={dict.prezentare.localitate} value={donator.localitate} />
                </Card>
                <Card>
                  <p className="mb-2 text-[13px] font-semibold text-[var(--ci-text)]">{dict.prezentare.preferinte}</p>
                  <InfoRow label={dict.prezentare.proiectePreferate} value={proiecte.join(", ") || "—"} />
                  <InfoRow label={dict.prezentare.tipDonator} value={donator.tip === "recurent" ? dict.prezentare.recurent : dict.prezentare.unic} />
                </Card>
              </div>
            );
          if (active === "notite")
            return (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Textarea
                    value={notaText}
                    onChange={(e) => setNotaText(e.target.value)}
                    placeholder={dict.notite.placeholder}
                    rows={2}
                    className="flex-1"
                  />
                  <Button variant="primary" onClick={salveazaNota} disabled={!notaText.trim()}>{dict.notite.adauga}</Button>
                </div>
                {notite.length ? (
                  <>
                    <div className="space-y-2.5">
                      {notitePagina.map((n) => (
                        <NoteCard key={n.id} nota={n} donatorId={donator.id} />
                      ))}
                    </div>
                    {notite.length > NOTITE_PE_PAGINA && (
                      <Pagination
                        page={paginaNotite}
                        pageCount={paginiNotite}
                        onChange={setPaginaNotite}
                        total={notite.length}
                        pageSize={NOTITE_PE_PAGINA}
                      />
                    )}
                  </>
                ) : (
                  <EmptyState title={dict.notite.niciunaInca.title} description={dict.notite.niciunaInca.description} />
                )}
              </div>
            );
          if (active === "donatii")
            return donatii.length || donatiiManuale.length ? (
              <div className="space-y-2">
                {donatiiManuale.map((d) => (
                  <div key={d.id} className="flex items-center justify-between rounded-lg border border-[var(--ci-primary-soft)] bg-[var(--ci-primary-soft)]/40 px-3.5 py-2.5">
                    <div>
                      <p className="text-[13px] font-medium text-[var(--ci-text)]">{d.campanie}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-1 text-[12px] text-[var(--ci-text-muted)]">
                        {formatData(d.data)} · {dict.donatii.adaugataManual}
                        {d.recurenta && <Badge tone="blue" icon={false}>{dict.donatii.recurenta}</Badge>}
                        {d.proiect && <Badge tone="green" icon={false}>{d.proiect}</Badge>}
                        {d.formular230 && <Badge tone="amber" icon={false}>{dict.donatii.formular230}</Badge>}
                      </p>
                    </div>
                    <span className="ci-tabular text-sm font-semibold text-[var(--ci-text)]">{formatSuma(d.suma, d.moneda)}</span>
                  </div>
                ))}
                {donatii.map((d) => (
                  <div key={d.id} className="flex items-center justify-between rounded-lg border border-[var(--ci-border)] px-3.5 py-2.5">
                    <div>
                      <p className="text-[13px] font-medium text-[var(--ci-text)]">{d.campanie}</p>
                      <p className="text-[12px] text-[var(--ci-text-muted)]">{formatData(d.data)}{d.recurenta ? ` · ${dict.donatii.recurenta}` : ""}</p>
                    </div>
                    <span className="ci-tabular text-sm font-semibold text-[var(--ci-text)]">{formatSuma(d.suma, d.moneda)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title={dict.donatii.nicioDonatie} />
            );
          if (active === "comunicare") {
            const toate = [
              ...comunicareLog.map((c) => ({ id: c.id, tip: c.tip, la: c.la, autor: c.autor, rezumat: c.rezumat })),
              ...comunicariStatice.map((c) => ({ id: c.id, tip: c.tip, la: c.la, autor: c.autor, rezumat: c.rezumat })),
            ].sort((a, b) => +new Date(b.la) - +new Date(a.la));
            return toate.length ? (
              <div className="space-y-2">
                {toate.map((c) => (
                  <div key={c.id} className="rounded-lg border border-[var(--ci-border)] px-3.5 py-2.5">
                    <div className="flex items-center justify-between">
                      <Badge tone="neutral">{c.tip}</Badge>
                      <span className="text-[12px] text-[var(--ci-text-muted)]">{formatDataRelativa(c.la)}</span>
                    </div>
                    <p className="mt-1.5 text-[13px] text-[var(--ci-text)]">{c.rezumat}</p>
                    <p className="mt-1 text-[12px] text-[var(--ci-text-faint)]">{c.autor}</p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title={dict.comunicare.nicioComunicare.title} description={dict.comunicare.nicioComunicare.description} icon={StickyNote} />
            );
          }
          if (active === "proiecte")
            return (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    value={proiectNou}
                    onChange={(e) => setProiectNou(e.target.value)}
                    placeholder={dict.proiecte.placeholder}
                    className="flex-1"
                  />
                  <Button variant="primary" onClick={salveazaProiect} disabled={!proiectNou.trim()}>{dict.proiecte.adauga}</Button>
                </div>
                {proiecte.length ? (
                  <div className="flex flex-wrap gap-2">
                    {proiecte.map((p) => (
                      <Badge key={p} tone="blue">{p}</Badge>
                    ))}
                  </div>
                ) : (
                  <EmptyState title={dict.proiecte.niciunulInca} />
                )}
              </div>
            );
          if (active === "taskuri") {
            const toateTaskurile = [
              ...taskuriLocale.map((t) => ({ id: t.id, titlu: t.titlu, responsabil: t.responsabil, termen: t.termen, status: t.status, local: true })),
              ...taskuriStatice.map((t) => ({ id: t.id, titlu: t.titlu, responsabil: t.responsabil, termen: "", status: t.status, local: false })),
            ];
            return (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end">
                  <div>
                    <Label>{dict.taskuri.taskNou}</Label>
                    <Input value={taskTitlu} onChange={(e) => setTaskTitlu(e.target.value)} placeholder={dict.taskuri.taskNouPlaceholder} />
                  </div>
                  <div>
                    <Label>{dict.taskuri.responsabil}</Label>
                    <Select value={taskResponsabil} onChange={(e) => setTaskResponsabil(e.target.value)} className="w-full sm:w-44">
                      {RESPONSABILI.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <Label>{dict.taskuri.termen}</Label>
                    <Input type="date" value={taskTermen} onChange={(e) => setTaskTermen(e.target.value)} />
                  </div>
                  <Button variant="primary" onClick={salveazaTask} disabled={!taskTitlu.trim()}>{dict.taskuri.trimiteTask}</Button>
                </div>

                {toateTaskurile.length ? (
                  <div className="space-y-2">
                    {toateTaskurile.map((t) => (
                      <div key={t.id} className="flex items-center justify-between rounded-lg border border-[var(--ci-border)] px-3.5 py-2.5">
                        <div>
                          <p className="text-[13px] font-medium text-[var(--ci-text)]">{t.titlu}</p>
                          <p className="text-[12px] text-[var(--ci-text-muted)]">
                            {t.responsabil}{t.termen ? ` · ${dict.taskuri.termenLabel(formatData(t.termen))}` : ""}
                          </p>
                        </div>
                        {t.local ? (
                          <button onClick={() => toggleTaskDonator(donator.id, t.id)}>
                            <Badge tone={t.status === "finalizat" ? "green" : "neutral"}>{t.status === "finalizat" ? dict.taskuri.finalizat : dict.taskuri.deFacut}</Badge>
                          </button>
                        ) : (
                          <Badge tone={t.status === "intarziat" ? "red" : t.status === "finalizat" ? "green" : "neutral"}>
                            {t.status.replace("_", " ")}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState title={dict.taskuri.niciunul} />
                )}
              </div>
            );
          }
          return null;
        }}
      </Tabs>

      <AddDonationDialog
        donatorId={donator.id}
        proiectePreferate={donator.campaniiPreferate}
        open={donatieOpen}
        onClose={() => setDonatieOpen(false)}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[12px] text-[var(--ci-text-muted)]">{label}</p>
      <p className="ci-tabular mt-0.5 text-[15px] font-semibold text-[var(--ci-text)]">{value}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-[var(--ci-border)] py-2 last:border-0">
      <span className="text-[13px] text-[var(--ci-text-muted)]">{label}</span>
      <span className="text-[13px] font-medium text-[var(--ci-text)]">{value}</span>
    </div>
  );
}

function QuickAction({
  icon: Icon,
  label,
  primary,
  href,
  external,
  onClick,
}: {
  icon: typeof Mail;
  label: string;
  primary?: boolean;
  href?: string;
  external?: boolean;
  onClick?: () => void;
}) {
  const cls = `inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium transition-colors ${
    primary
      ? "bg-[var(--ci-primary)] text-white hover:bg-[var(--ci-primary-hover)]"
      : "border border-[var(--ci-border)] text-[var(--ci-text)] hover:bg-[var(--ci-surface-2)]"
  }`;
  if (href) {
    return (
      <a
        href={href}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
        onClick={onClick}
        className={cls}
      >
        <Icon className="h-3.5 w-3.5" /> {label}
      </a>
    );
  }
  return (
    <button onClick={onClick} className={cls}>
      <Icon className="h-3.5 w-3.5" /> {label}
    </button>
  );
}

function NoteCard({ nota, donatorId }: { nota: Notita; donatorId: string }) {
  const locale = useLocale();
  const dict = DONATOR_PROFIL_DICT[locale].notite;
  const [editare, setEditare] = useState(false);
  const [text, setText] = useState(nota.text);

  function salveaza() {
    if (!text.trim()) return;
    editeazaNotita(donatorId, nota.id, text.trim());
    setEditare(false);
  }

  return (
    <div className="rounded-xl border border-[var(--ci-border)] bg-[var(--ci-surface)] p-3.5 shadow-[var(--ci-shadow-sm)]">
      {editare ? (
        <div className="space-y-2">
          <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} autoFocus />
          <div className="flex justify-end gap-1.5">
            <button
              onClick={() => { setText(nota.text); setEditare(false); }}
              aria-label={dict.anuleazaEditarea}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--ci-text-muted)] hover:bg-[var(--ci-surface-2)]"
            >
              <XIcon className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={salveaza}
              aria-label={dict.salveazaNotita}
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--ci-green-soft)] text-[var(--ci-green)] hover:opacity-80"
            >
              <Check className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[13px] whitespace-pre-wrap text-[var(--ci-text)]">{nota.text}</p>
            <p className="mt-1 text-[12px] text-[var(--ci-text-faint)]">
              {nota.autor} · {formatDataOra(nota.la)}
              {nota.editatLa && dict.editata}
            </p>
          </div>
          <div className="flex shrink-0 gap-0.5">
            <button
              onClick={() => setEditare(true)}
              aria-label={dict.editeazaNotita}
              className="rounded-lg p-1.5 text-[var(--ci-text-faint)] hover:bg-[var(--ci-surface-2)] hover:text-[var(--ci-text)]"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => stergeNotita(donatorId, nota.id)}
              aria-label={dict.stergeNotita}
              className="rounded-lg p-1.5 text-[var(--ci-text-faint)] hover:bg-[var(--ci-red-soft)] hover:text-[var(--ci-red)]"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
