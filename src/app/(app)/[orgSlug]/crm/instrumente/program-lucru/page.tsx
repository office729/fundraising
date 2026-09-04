"use client";

import { useParams } from "next/navigation";
import { useMemo, useState } from "react";

import { Badge } from "../../components/ui/badge";
import { Breadcrumb } from "../../components/ui/breadcrumb";
import { Card, CardHeader } from "../../components/ui/card";
import { Select } from "../../components/ui/input";
import { EmptyState } from "../../components/ui/states";
import {
  getTaskStatusOverride,
  getTaskTermenOverride,
  getTaskuriGlobale,
  getTaskuriSterse,
  useLocalStoreValue,
} from "../../lib/local-store";
import { useBeneficiari } from "../../lib/use-data";
import { useLocale } from "../../lib/locale-context";
import { INSTRUMENTE_DICT } from "@/lib/i18n/dictionaries/instrumente";
import { TASKURI } from "../../mock";
import type { Task } from "../../mock";

const RESPONSABILI = ["Andreea Vasilescu", "Vlad Placintă", "Ioana Mureșan"];

export default function ProgramLucruPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const [responsabil, setResponsabil] = useState(RESPONSABILI[0]);
  const BENEFICIARI = useBeneficiari();
  const locale = useLocale();
  const dictRoot = INSTRUMENTE_DICT[locale];
  const dict = dictRoot.programLucru;
  const RUTINA = dict.rutinaItems;

  const globale = useLocalStoreValue(getTaskuriGlobale, []);
  const statusOverride = useLocalStoreValue(getTaskStatusOverride, {});
  const termenOverride = useLocalStoreValue(getTaskTermenOverride, {});
  const sterse = useLocalStoreValue(getTaskuriSterse, {});

  const taskuri: Task[] = useMemo(() => {
    const toate = [...TASKURI, ...globale];
    return toate
      .filter((t) => !sterse[t.id])
      .map((t) => ({ ...t, status: statusOverride[t.id] ?? t.status, termenLa: termenOverride[t.id] ?? t.termenLa }))
      .filter((t) => t.responsabil === responsabil);
  }, [globale, statusOverride, termenOverride, sterse, responsabil]);

  const azi = new Date().toISOString().slice(0, 10);
  const taskuriAzi = taskuri.filter((t) => t.termenLa.slice(0, 10) <= azi && t.status !== "finalizat");
  const cazuriUrgente = BENEFICIARI.filter((b) => b.statusCampanie === "urgenta");

  const orar = useMemo(() => {
    const sloturi: { ora: string; titlu: string; tip: "rutina" | "task" }[] = RUTINA.map((r) => ({ ora: r.ora, titlu: r.titlu, tip: "rutina" }));
    let ora = 10;
    for (const t of taskuriAzi) {
      sloturi.push({ ora: `${String(ora).padStart(2, "0")}:00`, titlu: `${t.titlu} — ${t.legatDe.nume}`, tip: "task" as const });
      ora += 1;
      if (ora === 13) ora = 14;
    }
    return sloturi.sort((a, b) => a.ora.localeCompare(b.ora));
  }, [taskuriAzi, RUTINA]);

  return (
    <div className="mx-auto max-w-[900px] space-y-5">
      <Breadcrumb items={[{ label: dictRoot.breadcrumb, href: `/${orgSlug}/crm/instrumente` }, { label: dict.breadcrumbLabel }]} />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">{dict.title}</h1>
          <p className="mt-0.5 text-[13px] text-[var(--ci-text-muted)]">{dict.subtitle}</p>
        </div>
        <Select value={responsabil} onChange={(e) => setResponsabil(e.target.value)} className="w-52">
          {RESPONSABILI.map((r) => <option key={r} value={r}>{r}</option>)}
        </Select>
      </div>

      <Card>
        <CardHeader title={dict.orarul(responsabil)} subtitle={dict.sarciniProgramate(taskuriAzi.length)} />
        {orar.length ? (
          <div className="space-y-1.5">
            {orar.map((s, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg border border-[var(--ci-border)] px-3.5 py-2.5">
                <span className="ci-tabular w-14 shrink-0 text-[12px] font-semibold text-[var(--ci-text-muted)]">{s.ora}</span>
                <span className="text-[13px] font-medium text-[var(--ci-text)]">{s.titlu}</span>
                {s.tip === "rutina" && <Badge tone="neutral">{dict.rutina}</Badge>}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title={dict.niciunTaskAzi} />
        )}
      </Card>

      <Card>
        <CardHeader title={dict.cazuriUrgente.title} subtitle={dict.cazuriUrgente.subtitle} />
        {cazuriUrgente.length ? (
          <div className="flex flex-wrap gap-2">
            {cazuriUrgente.map((b) => <Badge key={b.id} tone="red">{b.nume}</Badge>)}
          </div>
        ) : (
          <EmptyState title={dict.niciunCazUrgent} />
        )}
      </Card>
    </div>
  );
}
