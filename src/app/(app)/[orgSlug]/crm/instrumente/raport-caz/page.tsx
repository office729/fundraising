"use client";

import { Printer } from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";

import { Breadcrumb } from "../../components/ui/breadcrumb";
import { Button } from "../../components/ui/button";
import { Card, CardHeader } from "../../components/ui/card";
import { Input, Label, Select, Textarea } from "../../components/ui/input";
import { ProgressBar } from "../../components/ui/progress-bar";
import { formatSuma } from "../../lib/format";
import { useBeneficiari } from "../../lib/use-data";
import { useLocale } from "../../lib/locale-context";
import { INSTRUMENTE_DICT } from "@/lib/i18n/dictionaries/instrumente";

export default function RaportCazPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const BENEFICIARI = useBeneficiari();
  const locale = useLocale();
  const dictRoot = INSTRUMENTE_DICT[locale];
  const dict = dictRoot.raportCaz;
  const [benId, setBenId] = useState(BENEFICIARI[0]?.id ?? "");
  const [donatiiOnline, setDonatiiOnline] = useState("");
  const [donatiiBanca, setDonatiiBanca] = useState("");
  const [topDonatori, setTopDonatori] = useState("");
  const [interesWeb, setInteresWeb] = useState("");

  const b = BENEFICIARI.find((x) => x.id === benId);
  const pct = b ? Math.round((b.sumaStransa / b.obiectiv) * 100) : 0;

  return (
    <div className="mx-auto max-w-[900px] space-y-5">
      <div className="flex items-center justify-between print:hidden">
        <Breadcrumb items={[{ label: dictRoot.breadcrumb, href: `/${orgSlug}/crm/instrumente` }, { label: dict.breadcrumbLabel }]} />
        <Button variant="secondary" onClick={() => window.print()} disabled={!b}>
          <Printer className="h-3.5 w-3.5" /> {dict.genereazaPdf}
        </Button>
      </div>

      <Card className="print:hidden">
        <CardHeader title={dict.completeazaDate} />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>{dict.caz}</Label>
            <Select value={benId} onChange={(e) => setBenId(e.target.value)}>
              {BENEFICIARI.map((x) => <option key={x.id} value={x.id}>{x.nume}</option>)}
            </Select>
          </div>
          <div>
            <Label>{dict.donatiiOnline}</Label>
            <Input type="number" min="0" value={donatiiOnline} onChange={(e) => setDonatiiOnline(e.target.value)} placeholder="0" />
          </div>
          <div>
            <Label>{dict.donatiiBanca}</Label>
            <Input type="number" min="0" value={donatiiBanca} onChange={(e) => setDonatiiBanca(e.target.value)} placeholder="0" />
          </div>
          <div className="sm:col-span-2">
            <Label>{dict.topDonatoriOptional}</Label>
            <Textarea rows={2} value={topDonatori} onChange={(e) => setTopDonatori(e.target.value)} placeholder={dict.topDonatoriPlaceholder} />
          </div>
          <div className="sm:col-span-2">
            <Label>{dict.interesWebOptional}</Label>
            <Textarea rows={2} value={interesWeb} onChange={(e) => setInteresWeb(e.target.value)} placeholder={dict.interesWebPlaceholder} />
          </div>
        </div>
      </Card>

      {b && (
        <Card className="space-y-4">
          <div className="text-center">
            <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">{dict.raportActivitate(b.nume)}</h1>
            <p className="mt-0.5 text-[13px] text-[var(--ci-text-muted)]">{b.localitate} · {new Intl.DateTimeFormat(locale === "ro" ? "ro-RO" : "en-US", { day: "2-digit", month: "long", year: "numeric" }).format(new Date())}</p>
          </div>

          <ProgressBar value={pct} />
          <p className="ci-tabular text-center text-[13px] text-[var(--ci-text-muted)]">{formatSuma(b.sumaStransa)} {dict.din} {formatSuma(b.obiectiv)} ({pct}%)</p>

          <div className="grid grid-cols-2 gap-3 border-t border-[var(--ci-border)] pt-4 sm:grid-cols-4">
            <Stat label={dict.donatiiOnline} value={formatSuma(Number(donatiiOnline) || 0)} />
            <Stat label={dict.donatiiBanca} value={formatSuma(Number(donatiiBanca) || 0)} />
            <Stat label={dict.zileActive} value={String(b.zileActive)} />
            <Stat label={dict.sponsori} value={String(b.sponsoriIds.length)} />
          </div>

          {topDonatori.trim() && (
            <div>
              <p className="text-[13px] font-semibold text-[var(--ci-text)]">{dict.topDonatori}</p>
              <p className="mt-1 whitespace-pre-line text-[13px] text-[var(--ci-text-muted)]">{topDonatori}</p>
            </div>
          )}

          {interesWeb.trim() && (
            <div>
              <p className="text-[13px] font-semibold text-[var(--ci-text)]">{dict.interesWeb}</p>
              <p className="mt-1 whitespace-pre-line text-[13px] text-[var(--ci-text-muted)]">{interesWeb}</p>
            </div>
          )}

          <p className="text-center text-[11px] text-[var(--ci-text-faint)]">{dict.footer}</p>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="ci-tabular text-sm font-bold text-[var(--ci-text)]">{value}</p>
      <p className="text-[11px] text-[var(--ci-text-muted)]">{label}</p>
    </div>
  );
}
