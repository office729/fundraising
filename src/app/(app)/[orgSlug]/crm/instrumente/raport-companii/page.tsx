"use client";

import { Printer } from "lucide-react";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";

import { Breadcrumb } from "../../components/ui/breadcrumb";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardHeader } from "../../components/ui/card";
import { Select } from "../../components/ui/input";
import { formatData, formatSuma } from "../../lib/format";
import { useCompanii } from "../../lib/use-data";
import { useLocale } from "../../lib/locale-context";
import { INSTRUMENTE_DICT } from "@/lib/i18n/dictionaries/instrumente";

const RESPONSABILI = ["Toți", "Andreea Vasilescu", "Vlad Placintă", "Ioana Mureșan"];

export default function RaportCompaniiPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const COMPANII = useCompanii();
  const [responsabil, setResponsabil] = useState("Toți");
  const [luna, setLuna] = useState(() => new Date().toISOString().slice(0, 7));
  const locale = useLocale();
  const dictRoot = INSTRUMENTE_DICT[locale];
  const dict = dictRoot.raportCompanii;

  const filtrate = useMemo(() => {
    return COMPANII.filter((c) => responsabil === "Toți" || c.responsabil === responsabil).sort(
      (a, b) => new Date(b.ultimaActivitateLa).getTime() - new Date(a.ultimaActivitateLa).getTime(),
    );
  }, [COMPANII, responsabil]);

  const totalSponsorizat = filtrate.reduce((s, c) => s + c.sumaSponsorizata, 0);
  const contracteTrimise = filtrate.filter((c) => c.stage.startsWith("contract")).length;
  const intalniri = filtrate.filter((c) => ["telefon", "online", "onepager"].includes(c.stage)).length;

  return (
    <div className="mx-auto max-w-[1100px] space-y-5">
      <div className="print:hidden">
        <Breadcrumb items={[{ label: dictRoot.breadcrumb, href: `/${orgSlug}/crm/instrumente` }, { label: dict.title }]} />
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">{dict.title}</h1>
          <p className="mt-0.5 text-[13px] text-[var(--ci-text-muted)]">
            {dict.subtitle(new Intl.DateTimeFormat(locale === "ro" ? "ro-RO" : "en-US", { month: "long", year: "numeric" }).format(new Date(luna + "-01")))}
          </p>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          <Select value={responsabil} onChange={(e) => setResponsabil(e.target.value)} className="w-44">
            {RESPONSABILI.map((r) => <option key={r} value={r}>{r}</option>)}
          </Select>
          <input type="month" value={luna} onChange={(e) => setLuna(e.target.value)} className="h-9 rounded-lg border border-[var(--ci-border)] bg-[var(--ci-surface)] px-3 text-sm text-[var(--ci-text)]" />
          <Button variant="secondary" onClick={() => window.print()}>
            <Printer className="h-3.5 w-3.5" /> {dict.printeaza}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card><p className="text-[12px] text-[var(--ci-text-muted)]">{dict.sumeIncasate}</p><p className="ci-tabular mt-1 text-lg font-bold text-[var(--ci-text)]">{formatSuma(totalSponsorizat)}</p></Card>
        <Card><p className="text-[12px] text-[var(--ci-text-muted)]">{dict.contracteInLucru}</p><p className="ci-tabular mt-1 text-lg font-bold text-[var(--ci-text)]">{contracteTrimise}</p></Card>
        <Card><p className="text-[12px] text-[var(--ci-text-muted)]">{dict.intalniriOferte}</p><p className="ci-tabular mt-1 text-lg font-bold text-[var(--ci-text)]">{intalniri}</p></Card>
      </div>

      <Card>
        <CardHeader title={dict.firmeActivitate.title} subtitle={dict.firmeActivitate.subtitle(filtrate.length)} />
        <div className="space-y-2">
          {filtrate.map((c) => (
            <div key={c.id} className="flex items-center justify-between rounded-lg border border-[var(--ci-border)] px-3.5 py-2.5">
              <div>
                <p className="text-[13px] font-medium text-[var(--ci-text)]">{c.nume}</p>
                <p className="text-[12px] text-[var(--ci-text-muted)]">{c.responsabil} · {dict.ultimaActivitate(formatData(c.ultimaActivitateLa))}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="ci-tabular text-[13px] font-semibold text-[var(--ci-text)]">{formatSuma(c.sumaSponsorizata)}</span>
                <Badge tone={c.status === "won" ? "green" : c.status === "lost" ? "red" : "blue"}>{c.stage.replace(/_/g, " ")}</Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
