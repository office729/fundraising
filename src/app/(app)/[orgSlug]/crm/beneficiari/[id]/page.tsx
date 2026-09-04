"use client";

import { notFound, useParams } from "next/navigation";

import { Badge } from "../../components/ui/badge";
import { Breadcrumb } from "../../components/ui/breadcrumb";
import { Card, CardHeader } from "../../components/ui/card";
import { ProgressBar } from "../../components/ui/progress-bar";
import { EmptyState } from "../../components/ui/states";
import { Tabs } from "../../components/ui/tabs";
import { Tooltip } from "../../components/ui/tooltip";
import { formatData, formatSuma } from "../../lib/format";
import { useBeneficiar } from "../../lib/use-data";
import { useLocale } from "../../lib/locale-context";
import { BENEFICIARI_DICT } from "@/lib/i18n/dictionaries/beneficiari";
import { ALOCARI_PLATI, COMPANII, DONATII } from "../../mock";

export default function BeneficiarProfilPage() {
  const { orgSlug, id } = useParams<{ orgSlug: string; id: string }>();
  const b = useBeneficiar(id);
  const locale = useLocale();
  const dict = BENEFICIARI_DICT[locale].profil;
  if (!b) notFound();

  const donatii = DONATII.filter((d) => d.beneficiarId === b.id);
  const plati = ALOCARI_PLATI.filter((p) => p.beneficiarId === b.id);
  const sponsori = COMPANII.filter((c) => b.sponsoriIds.includes(c.id));
  const disponibil = b.sumaAlocata - b.sumaAchitata;
  const ramasDeStrans = Math.max(0, b.obiectiv - b.sumaStransa);
  const pct = Math.round((b.sumaStransa / b.obiectiv) * 100);

  return (
    <div className="mx-auto max-w-[1200px] space-y-5">
      <Breadcrumb items={[{ label: dict.breadcrumb, href: `/${orgSlug}/crm/beneficiari` }, { label: b.nume }]} />

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">{b.nume}</h1>
              <Badge tone={b.statusCampanie === "urgenta" ? "red" : b.statusCampanie === "finalizata" ? "green" : "blue"}>
                {b.statusCampanie}
              </Badge>
            </div>
            <p className="mt-1 text-[13px] text-[var(--ci-text-muted)]">
              {dict.varstaLocalitateZile(b.varsta, b.localitate, b.zileActive)}
            </p>
          </div>
        </div>
        <ProgressBar value={pct} className="mt-4" />
        <div className="mt-2 flex items-center justify-between text-[13px]">
          <span className="ci-tabular text-[var(--ci-text-muted)]">{formatSuma(b.sumaStransa)} {dict.din} {formatSuma(b.obiectiv)}</span>
          <span className="ci-tabular font-semibold text-[var(--ci-text)]">{pct}%</span>
        </div>
      </Card>

      <Card>
        <CardHeader title={dict.cardFinanciar.title} subtitle={dict.cardFinanciar.subtitle} />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <FinStat label={dict.fin.necesar.label} value={b.obiectiv} tip={dict.fin.necesar.tip} />
          <FinStat label={dict.fin.incasat.label} value={b.sumaStransa} tip={dict.fin.incasat.tip} />
          <FinStat label={dict.fin.alocat.label} value={b.sumaAlocata} tip={dict.fin.alocat.tip} />
          <FinStat label={dict.fin.achitat.label} value={b.sumaAchitata} tip={dict.fin.achitat.tip} />
          <FinStat label={dict.fin.disponibil.label} value={disponibil} tip={dict.fin.disponibil.tip} />
          <FinStat label={dict.fin.ramasDeStrans.label} value={ramasDeStrans} tip={dict.fin.ramasDeStrans.tip} />
        </div>
      </Card>

      <Tabs
        tabs={[
          { key: "poveste", label: dict.tabs.poveste },
          { key: "medical", label: dict.tabs.medical },
          { key: "donatii", label: dict.tabs.donatii },
          { key: "sponsori", label: dict.tabs.sponsori },
          { key: "plati", label: dict.tabs.plati },
          { key: "actualizari", label: dict.tabs.actualizari },
          { key: "rapoarte", label: dict.tabs.rapoarte },
        ]}
      >
        {(active) => {
          if (active === "poveste") return <Card><p className="text-sm leading-relaxed text-[var(--ci-text)]">{b.poveste}</p></Card>;
          if (active === "medical")
            return <EmptyState title={dict.medicalEmpty.title} description={dict.medicalEmpty.description} />;
          if (active === "donatii")
            return donatii.length ? (
              <div className="space-y-2">
                {donatii.map((d) => (
                  <div key={d.id} className="flex items-center justify-between rounded-lg border border-[var(--ci-border)] px-3.5 py-2.5">
                    <div>
                      <p className="text-[13px] font-medium text-[var(--ci-text)]">{d.sursaNume}</p>
                      <p className="text-[12px] text-[var(--ci-text-muted)]">{formatData(d.data)}</p>
                    </div>
                    <span className="ci-tabular text-sm font-semibold text-[var(--ci-text)]">{formatSuma(d.suma, d.moneda)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title={dict.niciodonatie} />
            );
          if (active === "sponsori")
            return sponsori.length ? (
              <div className="flex flex-wrap gap-2">
                {sponsori.map((s) => <Badge key={s.id} tone="blue">{s.nume}</Badge>)}
              </div>
            ) : (
              <EmptyState title={dict.niciunSponsor} />
            );
          if (active === "plati")
            return plati.length ? (
              <div className="space-y-2">
                {plati.map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-lg border border-[var(--ci-border)] px-3.5 py-2.5">
                    <div>
                      <p className="text-[13px] font-medium text-[var(--ci-text)]">{formatData(p.la)}</p>
                      <p className="text-[12px] text-[var(--ci-text-muted)]">{p.documentJustificativ ?? dict.faraDocument}</p>
                    </div>
                    <Badge tone={p.status === "achitat" ? "green" : p.status === "in_asteptare" ? "amber" : "blue"}>{p.status.replace("_", " ")}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title={dict.nicioPlata} />
            );
          if (active === "actualizari") return <EmptyState title={dict.nicioActualizare} />;
          return <EmptyState title={dict.niciunRaport} />;
        }}
      </Tabs>
    </div>
  );
}

function FinStat({ label, value, tip }: { label: string; value: number; tip: string }) {
  return (
    <div>
      <div className="flex items-center gap-1">
        <p className="text-[12px] text-[var(--ci-text-muted)]">{label}</p>
        <Tooltip label={tip}><span className="text-[var(--ci-text-faint)]">ⓘ</span></Tooltip>
      </div>
      <p className="ci-tabular mt-0.5 text-sm font-bold text-[var(--ci-text)]">{formatSuma(value)}</p>
    </div>
  );
}
