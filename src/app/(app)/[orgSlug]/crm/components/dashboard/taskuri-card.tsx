"use client";

import { AlertTriangle, ArrowRight, CalendarClock, CheckCircle2, ListTodo, Mail, Phone } from "lucide-react";
import Link from "next/link";

import type { Locale } from "@/lib/i18n/config";

import { setTaskStatus } from "../../lib/local-store";
import type { Task } from "../../mock";
import { Card } from "../ui/card";

const TEXT = {
  ro: {
    title: "Taskuri",
    subtitle: "Sincronizate cu echipa",
    all: "Vezi toate",
    azi: "Azi",
    intarziate: "Întârziate",
    programate: "Programate",
    inchise: "Închise",
    urmatoarele: "Ce ai de făcut",
    nimic: "Niciun task deschis. Adaugă unul din pagina Taskuri.",
  },
  en: {
    title: "Tasks",
    subtitle: "Synced with the team",
    all: "See all",
    azi: "Today",
    intarziate: "Overdue",
    programate: "Scheduled",
    inchise: "Closed",
    urmatoarele: "What to do next",
    nimic: "No open tasks. Add one from the Tasks page.",
  },
} as const;

const eDataAzi = (iso: string) => new Date(iso).toDateString() === new Date().toDateString();
const eTrecut = (iso: string) => new Date(iso).getTime() < new Date().setHours(0, 0, 0, 0);

// Pe prima pagină: totalurile pe categorii + următoarele taskuri deschise (ex.
// „trimite email către companie", „sună persoana fizică"), cele întârziate primele.
export function TaskuriCard({ taskuri, base, locale }: { taskuri: Task[]; base: string; locale: Locale }) {
  const t = TEXT[locale];
  const deschise = taskuri.filter((x) => x.status !== "finalizat");
  const intarziate = deschise.filter((x) => eTrecut(x.termenLa) && !eDataAzi(x.termenLa));
  const azi = deschise.filter((x) => eDataAzi(x.termenLa));
  const programate = deschise.filter((x) => !eTrecut(x.termenLa) && !eDataAzi(x.termenLa));
  const inchise = taskuri.length - deschise.length;
  const urmatoarele = [...intarziate, ...azi, ...programate].slice(0, 6);

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-bold text-[var(--ci-text)]">{t.title}</h2>
          <p className="mt-0.5 text-[13px] text-[var(--ci-text-muted)]">{t.subtitle}</p>
        </div>
        <Link href={`${base}/taskuri`} className="flex items-center gap-1 text-[13px] font-medium text-[var(--ci-primary)] hover:underline">
          {t.all} <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile icon={ListTodo} label={t.azi} value={azi.length} color="var(--ci-blue)" href={`${base}/taskuri`} />
        <Tile icon={AlertTriangle} label={t.intarziate} value={intarziate.length} color="var(--ci-red)" href={`${base}/taskuri`} />
        <Tile icon={CalendarClock} label={t.programate} value={programate.length} color="var(--ci-text)" href={`${base}/taskuri`} />
        <Tile icon={CheckCircle2} label={t.inchise} value={inchise} color="var(--ci-green)" href={`${base}/taskuri`} />
      </div>

      <p className="mt-5 text-[12px] font-semibold tracking-wide text-[var(--ci-text-muted)] uppercase">{t.urmatoarele}</p>
      {urmatoarele.length === 0 ? (
        <p className="mt-2 text-[13px] text-[var(--ci-text-muted)]">{t.nimic}</p>
      ) : (
        <ul className="mt-2 divide-y divide-[var(--ci-border)]">
          {urmatoarele.map((x) => {
            const tarziu = eTrecut(x.termenLa) && !eDataAzi(x.termenLa);
            const Icon = /sun[aă]|apel|call/i.test(x.titlu) ? Phone : Mail;
            const href = x.legatDe.tip === "companie" ? `${base}/companii` : `${base}/donatori/${x.legatDe.id}`;
            return (
              <li key={x.id} className="flex items-center gap-3 py-2.5">
                <input
                  type="checkbox"
                  aria-label={x.titlu}
                  onChange={() => setTaskStatus(x.id, "finalizat")}
                  className="h-4 w-4 shrink-0 rounded border-[var(--ci-border)]"
                />
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--ci-surface-2)] text-[var(--ci-text-muted)]">
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <p className="min-w-0 flex-1 truncate text-[13px] text-[var(--ci-text)]">
                  {x.titlu} ·{" "}
                  <Link href={href} className="font-medium text-[var(--ci-primary)] hover:underline">
                    {x.legatDe.nume}
                  </Link>
                </p>
                <span
                  className={`ci-tabular shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                    tarziu ? "bg-[var(--ci-red-soft)] text-[var(--ci-red)]" : "bg-[var(--ci-surface-2)] text-[var(--ci-text-muted)]"
                  }`}
                >
                  {x.termenLa.slice(0, 10)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function Tile({ icon: Icon, label, value, color, href }: { icon: typeof ListTodo; label: string; value: number; color: string; href: string }) {
  return (
    <Link href={href} className="rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] p-4 transition-shadow hover:shadow-[var(--ci-shadow-md)]">
      <p className="flex items-center gap-1.5 text-[13px] text-[var(--ci-text-muted)]">
        <Icon className="h-3.5 w-3.5" /> {label}
      </p>
      <p className="ci-tabular mt-2 text-2xl font-bold" style={{ color }}>
        {value}
      </p>
    </Link>
  );
}
