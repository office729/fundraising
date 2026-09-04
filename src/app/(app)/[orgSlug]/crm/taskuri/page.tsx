"use client";

import { AlertTriangle, CalendarClock, CheckCircle2, ListTodo, X } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { Button } from "../components/ui/button";
import { Input, Label, Select } from "../components/ui/input";
import { Dialog } from "../components/ui/dialog";
import {
  addTaskGlobal,
  getTaskStatusOverride,
  getTaskTermenOverride,
  getTaskuriGlobale,
  getTaskuriSterse,
  setTaskStatus,
  setTaskTermen,
  stergeTask,
  useLocalStoreValue,
} from "../lib/local-store";
import { useCompanii, useDonatori } from "../lib/use-data";
import { useLocale } from "../lib/locale-context";
import { TASKURI_DICT } from "@/lib/i18n/dictionaries/taskuri";
import { TASKURI, type Task } from "../mock";

const RESPONSABILI = ["Vlad Placintă", "Andreea Vasilescu", "Ioana Mureșan"];
const EU = "Vlad Placintă";
const EMPTY_TASKURI: Task[] = [];
const EMPTY_MAP: Record<string, string> = {};
const EMPTY_BOOL_MAP: Record<string, boolean> = {};

function eDataAzi(iso: string) {
  return new Date(iso).toDateString() === new Date().toDateString();
}
function eTrecut(iso: string) {
  return new Date(iso).getTime() < new Date().setHours(0, 0, 0, 0);
}
function ziuaUrmatoare(iso: string) {
  const d = new Date(iso);
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

type FiltruTask = "toate" | "azi" | "intarziate" | "inchise" | "programate";

export default function TaskuriPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const router = useRouter();
  const locale = useLocale();
  const dict = TASKURI_DICT[locale];
  const [filtru, setFiltru] = useState<FiltruTask>("toate");
  const [dialogOpen, setDialogOpen] = useState(false);

  const globale = useLocalStoreValue(getTaskuriGlobale, EMPTY_TASKURI);
  const statusOverride = useLocalStoreValue(getTaskStatusOverride, EMPTY_MAP as Record<string, Task["status"]>);
  const termenOverride = useLocalStoreValue(getTaskTermenOverride, EMPTY_MAP);
  const sterse = useLocalStoreValue(getTaskuriSterse, EMPTY_BOOL_MAP);

  const toate = useMemo(() => {
    const mock = TASKURI.filter((t) => !sterse[t.id]).map((t) => ({
      ...t,
      status: statusOverride[t.id] ?? t.status,
      termenLa: termenOverride[t.id] ?? t.termenLa,
    }));
    return [...globale, ...mock];
  }, [globale, statusOverride, termenOverride, sterse]);

  const counts = useMemo(
    () => ({
      azi: toate.filter((t) => t.status !== "finalizat" && eDataAzi(t.termenLa)).length,
      intarziate: toate.filter((t) => t.status !== "finalizat" && eTrecut(t.termenLa) && !eDataAzi(t.termenLa)).length,
      inchise: toate.filter((t) => t.status === "finalizat").length,
      programate: toate.filter((t) => t.status !== "finalizat" && !eTrecut(t.termenLa) && !eDataAzi(t.termenLa)).length,
    }),
    [toate],
  );

  const filtrate = useMemo(() => {
    switch (filtru) {
      case "azi": return toate.filter((t) => t.status !== "finalizat" && eDataAzi(t.termenLa));
      case "intarziate": return toate.filter((t) => t.status !== "finalizat" && eTrecut(t.termenLa) && !eDataAzi(t.termenLa));
      case "inchise": return toate.filter((t) => t.status === "finalizat");
      case "programate": return toate.filter((t) => t.status !== "finalizat" && !eTrecut(t.termenLa) && !eDataAzi(t.termenLa));
      default: return toate;
    }
  }, [toate, filtru]);

  const grupuri = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of filtrate) {
      const cheie = t.responsabil === EU ? dict.aleMele : t.responsabil;
      map.set(cheie, [...(map.get(cheie) ?? []), t]);
    }
    const ordine = [dict.aleMele, ...RESPONSABILI.filter((r) => r !== EU)];
    return ordine.filter((g) => map.has(g)).map((g) => ({ grup: g, taskuri: map.get(g)! }));
  }, [filtrate, dict.aleMele]);

  function linkTinta(t: Task) {
    // "companii" (lista) — modulul Companii e conectat la date reale, iar
    // id-urile din taskurile mock nu corespund unui rând real (ar da 404).
    return t.legatDe.tip === "companie" ? `/${orgSlug}/crm/companii` : `/${orgSlug}/crm/donatori/${t.legatDe.id}`;
  }

  return (
    <div className="mx-auto max-w-[1000px] space-y-5">
      <div>
        <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">{dict.title}</h1>
        <p className="mt-0.5 text-[13px] text-[var(--ci-text-muted)]">{dict.subtitle}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile icon={ListTodo} label={dict.stats.azi} value={counts.azi} tone="blue" activ={filtru === "azi"} onClick={() => setFiltru(filtru === "azi" ? "toate" : "azi")} />
        <StatTile icon={AlertTriangle} label={dict.stats.intarziate} value={counts.intarziate} tone="red" activ={filtru === "intarziate"} onClick={() => setFiltru(filtru === "intarziate" ? "toate" : "intarziate")} />
        <StatTile icon={CheckCircle2} label={dict.stats.inchise} value={counts.inchise} tone="green" activ={filtru === "inchise"} onClick={() => setFiltru(filtru === "inchise" ? "toate" : "inchise")} />
        <StatTile icon={CalendarClock} label={dict.stats.programate} value={counts.programate} tone="neutral" activ={filtru === "programate"} onClick={() => setFiltru(filtru === "programate" ? "toate" : "programate")} />
      </div>

      <Button variant="primary" onClick={() => setDialogOpen(true)}>{dict.taskNou}</Button>

      {grupuri.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[var(--ci-border)] px-4 py-8 text-center text-[13px] text-[var(--ci-text-muted)]">
          {dict.niciunTask}
        </p>
      ) : (
        grupuri.map(({ grup, taskuri }) => (
          <div key={grup} className="space-y-2">
            <p className="flex items-center gap-2 text-[13px] font-semibold text-[var(--ci-text)]">
              {grup} <span className="text-[12px] font-normal text-[var(--ci-text-faint)]">{taskuri.length} {dict.active}</span>
            </p>
            <div className="space-y-2">
              {taskuri.map((t) => (
                <TaskRow key={t.id} t={t} linkHref={linkTinta(t)} onOpen={() => router.push(linkTinta(t))} />
              ))}
            </div>
          </div>
        ))
      )}

      <TaskDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </div>
  );
}

function TaskRow({ t, linkHref }: { t: Task; linkHref: string; onOpen: () => void }) {
  const locale = useLocale();
  const dict = TASKURI_DICT[locale];
  const inchis = t.status === "finalizat";
  const intarziat = !inchis && eTrecut(t.termenLa) && !eDataAzi(t.termenLa);

  return (
    <div className={`flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3 ${intarziat ? "border-[var(--ci-red-soft)]" : "border-[var(--ci-border)]"} bg-[var(--ci-surface)]`}>
      <input
        type="checkbox"
        checked={inchis}
        onChange={() => setTaskStatus(t.id, inchis ? "de_facut" : "finalizat")}
        className="h-4 w-4 shrink-0 rounded border-[var(--ci-border)]"
      />
      <div className="min-w-0 flex-1">
        <p className={`truncate text-[13px] font-medium ${inchis ? "text-[var(--ci-text-faint)] line-through" : "text-[var(--ci-text)]"}`}>
          {t.titlu} · <a href={linkHref} onClick={(e) => e.stopPropagation()} className="text-[var(--ci-primary)] hover:underline">{t.legatDe.nume.toUpperCase()}</a>
        </p>
        <p className="mt-0.5 text-[12px] text-[var(--ci-text-muted)]">{dict.creatDeCatre(EU.split(" ")[0], t.responsabil)}</p>
      </div>
      <span className={`ci-tabular shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${intarziat ? "bg-[var(--ci-red-soft)] text-[var(--ci-red)]" : "bg-[var(--ci-surface-2)] text-[var(--ci-text-muted)]"}`}>
        {t.termenLa.slice(0, 10)}
      </span>
      <input
        type="date"
        value={t.termenLa.slice(0, 10)}
        onChange={(e) => e.target.value && setTaskTermen(t.id, new Date(e.target.value).toISOString())}
        className="h-8 shrink-0 rounded-lg border border-[var(--ci-border)] bg-[var(--ci-surface)] px-2 text-[12px] text-[var(--ci-text)]"
      />
      <button
        type="button"
        onClick={() => setTaskTermen(t.id, new Date(ziuaUrmatoare(t.termenLa)).toISOString())}
        className="shrink-0 rounded-lg border border-[var(--ci-border)] px-2.5 py-1.5 text-[12px] font-medium text-[var(--ci-text-muted)] transition-colors hover:border-[var(--ci-primary)] hover:text-[var(--ci-primary)]"
      >
        {dict.maine}
      </button>
      <button type="button" onClick={() => stergeTask(t.id)} title={dict.stergeTaskul} className="shrink-0 rounded-lg p-1.5 text-[var(--ci-text-faint)] hover:bg-[var(--ci-red-soft)] hover:text-[var(--ci-red)]">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  tone,
  activ,
  onClick,
}: {
  icon: typeof ListTodo;
  label: string;
  value: number;
  tone: "blue" | "red" | "green" | "neutral";
  activ: boolean;
  onClick: () => void;
}) {
  const TONE_BG: Record<string, string> = {
    blue: "bg-[var(--ci-blue-soft)] text-[var(--ci-blue)] border-[var(--ci-blue)]",
    red: "bg-[var(--ci-red-soft)] text-[var(--ci-red)] border-[var(--ci-red)]",
    green: "bg-[var(--ci-green-soft)] text-[var(--ci-green)] border-[var(--ci-green)]",
    neutral: "bg-[var(--ci-surface)] text-[var(--ci-text-muted)] border-[var(--ci-border)]",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border p-4 text-left transition-shadow hover:shadow-[var(--ci-shadow-md)] ${
        activ ? TONE_BG[tone] : "border-[var(--ci-border)] bg-[var(--ci-surface)]"
      }`}
    >
      <p className={`flex items-center gap-1.5 text-[13px] font-medium ${activ ? "" : tone === "red" ? "text-[var(--ci-red)]" : tone === "green" ? "text-[var(--ci-green)]" : tone === "blue" ? "text-[var(--ci-blue)]" : "text-[var(--ci-text-muted)]"}`}>
        <Icon className="h-3.5 w-3.5" /> {label}
      </p>
      <p className="ci-tabular mt-1.5 text-2xl font-bold text-[var(--ci-text)]">{value}</p>
    </button>
  );
}

function TaskDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const DONATORI = useDonatori();
  const COMPANII = useCompanii();
  const locale = useLocale();
  const dict = TASKURI_DICT[locale].dialog;
  const [titlu, setTitlu] = useState("");
  const [tip, setTip] = useState<"donator" | "companie">("companie");
  const [tinta, setTinta] = useState("");
  const [responsabil, setResponsabil] = useState(RESPONSABILI[0]);
  const [termen, setTermen] = useState(() => new Date().toISOString().slice(0, 10));
  const [prioritate, setPrioritate] = useState<Task["prioritate"]>("medie");

  const optiuni = tip === "companie" ? COMPANII : DONATORI;

  function reset() {
    setTitlu("");
    setTinta("");
    setResponsabil(RESPONSABILI[0]);
    setPrioritate("medie");
  }

  function salveaza() {
    const gasit = optiuni.find((o) => o.nume.toLowerCase() === tinta.trim().toLowerCase());
    if (!titlu.trim() || !gasit) return;
    addTaskGlobal({
      titlu: titlu.trim(),
      legatDe: { tip, id: gasit.id, nume: gasit.nume },
      responsabil,
      termenLa: new Date(termen).toISOString(),
      prioritate,
    });
    reset();
    onClose();
  }

  return (
    <Dialog open={open} onClose={() => { reset(); onClose(); }} title={dict.title} width="max-w-sm">
      <div className="space-y-3">
        <div>
          <Label>{dict.titlu}</Label>
          <Input value={titlu} onChange={(e) => setTitlu(e.target.value)} placeholder={dict.titluPlaceholder} autoFocus />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label>{dict.legatDe}</Label>
            <Select value={tip} onChange={(e) => { setTip(e.target.value as "donator" | "companie"); setTinta(""); }}>
              <option value="companie">{dict.companie}</option>
              <option value="donator">{dict.persoanaFizica}</option>
            </Select>
          </div>
          <div>
            <Label>{tip === "companie" ? dict.companie : dict.persoanaFizica}</Label>
            <Input list="taskuri-tinte" value={tinta} onChange={(e) => setTinta(e.target.value)} placeholder={dict.cautaPlaceholder} />
            <datalist id="taskuri-tinte">
              {optiuni.map((o) => (
                <option key={o.id} value={o.nume} />
              ))}
            </datalist>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label>{dict.responsabil}</Label>
            <Select value={responsabil} onChange={(e) => setResponsabil(e.target.value)}>
              {RESPONSABILI.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label>{dict.termen}</Label>
            <Input type="date" value={termen} onChange={(e) => setTermen(e.target.value)} />
          </div>
        </div>
        <div>
          <Label>{dict.prioritate}</Label>
          <Select value={prioritate} onChange={(e) => setPrioritate(e.target.value as Task["prioritate"])}>
            <option value="mare">{dict.mare}</option>
            <option value="medie">{dict.medie}</option>
            <option value="mica">{dict.mica}</option>
          </Select>
        </div>

        <div className="flex justify-end gap-2 border-t border-[var(--ci-border)] pt-3">
          <Button variant="secondary" onClick={() => { reset(); onClose(); }}>{dict.anuleaza}</Button>
          <Button variant="primary" onClick={salveaza} disabled={!titlu.trim() || !tinta.trim()}>{dict.salveaza}</Button>
        </div>
      </div>
    </Dialog>
  );
}
