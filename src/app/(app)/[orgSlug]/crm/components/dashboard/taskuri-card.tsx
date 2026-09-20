"use client";

import { AlertTriangle, ArrowRight, CalendarClock, CheckCircle2, ListTodo } from "lucide-react";
import Link from "next/link";

import type { Locale } from "@/lib/i18n/config";

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
  },
  en: {
    title: "Tasks",
    subtitle: "Synced with the team",
    all: "See all",
    azi: "Today",
    intarziate: "Overdue",
    programate: "Scheduled",
    inchise: "Closed",
  },
} as const;

const eDataAzi = (iso: string) => new Date(iso).toDateString() === new Date().toDateString();
const eTrecut = (iso: string) => new Date(iso).getTime() < new Date().setHours(0, 0, 0, 0);

// Pe prima pagină, în capul ei: totalurile taskurilor pe categorii.
export function TaskuriCard({ taskuri, base, locale }: { taskuri: Task[]; base: string; locale: Locale }) {
  const t = TEXT[locale];
  const deschise = taskuri.filter((x) => x.status !== "finalizat");
  const intarziate = deschise.filter((x) => eTrecut(x.termenLa) && !eDataAzi(x.termenLa));
  const azi = deschise.filter((x) => eDataAzi(x.termenLa));
  const programate = deschise.filter((x) => !eTrecut(x.termenLa) && !eDataAzi(x.termenLa));
  const inchise = taskuri.length - deschise.length;

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
