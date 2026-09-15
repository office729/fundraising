import { ArrowRight, Calendar, CheckCircle2, Mail, Phone } from "lucide-react";
import Link from "next/link";

import { CAMPAIGN_TEMPLATES } from "@/lib/campaign-templates";

import { Badge } from "../ui/badge";
import { Card, CardHeader } from "../ui/card";
import { ProgressBar } from "../ui/progress-bar";
import { formatDataRelativa, formatSuma } from "../../lib/format";
import type { DashboardData } from "./types";

const PRIORITATE_TONE = { mare: "red", medie: "amber", mica: "neutral" } as const;

// Familia cald-protector (Copii/Sănătate/Social-Incluziune) — dashboard-uri
// de tip donor-portal citite pe internet (St. Jude, charity: water): accentul
// e pe POVESTEA individuală, nu pe cifre. Proiectele/beneficiarii activi
// devin hero-ul paginii (carduri mari, progres proeminent), KPI-urile devin
// o bandă de pastile compactă, iar graficul de donații trece secundar, mai
// jos și mai mic. Social/Incluziune primește text și spațiere puțin mai
// generoase — recomandare reală de accesibilitate pentru organizații de
// incluziune/dizabilitate, nu doar decor.
export function CaldProtectorDashboard({
  base,
  dict,
  domeniu,
  kpis,
  actiuni,
  evolutie,
  pipeline,
  inLucruPipeline,
  campaniiActive,
  blocate,
  apeluriReale,
  prioritateLabels,
}: DashboardData) {
  const spatios = domeniu === "social_incluziune";
  const textCard = spatios ? "text-[15px]" : "text-sm";
  const textMic = spatios ? "text-[13px]" : "text-[12px]";
  const spatiereCard = spatios ? "p-5" : "p-4";
  const itemLabel = domeniu ? CAMPAIGN_TEMPLATES[domeniu].itemLabel : undefined;

  return (
    <>
      <div>
        <CardHeader
          title={itemLabel ?? dict.proiecte.title}
          subtitle={dict.proiecte.subtitle}
          action={
            <Link href={`${base}/beneficiari`} className="text-[13px] font-medium text-[var(--ci-primary)] hover:underline">
              {dict.proiecte.seeAll}
            </Link>
          }
        />
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {campaniiActive.map((b) => {
            const pct = Math.round((b.sumaStransa / b.obiectiv) * 100);
            return (
              <Link
                key={b.id}
                href={`${base}/beneficiari/${b.id}`}
                className={`rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] bg-gradient-to-br from-[var(--ci-primary-soft)] to-[var(--ci-surface)] ${spatiereCard} shadow-[var(--ci-card-shadow)] transition-shadow hover:shadow-[var(--ci-shadow-lg)]`}
              >
                <div className="mb-2.5 flex items-center justify-between">
                  <p className={`${textCard} font-semibold text-[var(--ci-text)]`}>{b.nume}</p>
                  <Badge tone={b.statusCampanie === "urgenta" ? "red" : "blue"}>
                    {b.statusCampanie === "urgenta" ? dict.proiecte.urgenta : dict.proiecte.activa}
                  </Badge>
                </div>
                <ProgressBar value={pct} tone={b.statusCampanie === "urgenta" ? "primary" : "blue"} className="h-2.5" />
                <div className={`mt-2.5 flex items-center justify-between ${textMic} text-[var(--ci-text-muted)]`}>
                  <span className="ci-tabular">
                    {formatSuma(b.sumaStransa)} {dict.proiecte.din} {formatSuma(b.obiectiv)}
                  </span>
                  <span className="ci-tabular font-semibold text-[var(--ci-primary)]">{pct}%</span>
                </div>
                <p className={`mt-1 ${textMic} text-[var(--ci-text-faint)]`}>{dict.proiecte.zileActive(b.zileActive)}</p>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-2.5">
        {kpis.map((k) => (
          <Link
            key={k.key}
            href={`${base}/${k.href}`}
            className="flex items-center gap-2 rounded-full border border-[var(--ci-border)] bg-[var(--ci-surface)] px-4 py-2 shadow-[var(--ci-shadow-sm)] transition-shadow hover:shadow-[var(--ci-shadow-md)]"
          >
            <span className="ci-display ci-tabular text-[15px] font-bold text-[var(--ci-primary)]">
              {k.unitate === "count" ? Math.round(k.valoare) : k.unitate === "percent" ? `${Math.round(k.valoare)}%` : formatSuma(k.valoare)}
            </span>
            <span className={`${textMic} text-[var(--ci-text-muted)]`}>{k.label}</span>
          </Link>
        ))}
      </div>

      <Card className={spatios ? "p-6" : undefined}>
        <CardHeader title={dict.actionCenter.title} subtitle={dict.actionCenter.subtitle} />
        <div className={spatios ? "space-y-3" : "space-y-2"}>
          {actiuni.map((a) => (
            <div key={a.id} className={`flex items-center gap-3 rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] px-4 ${spatios ? "py-3.5" : "py-3"}`}>
              <Badge tone={PRIORITATE_TONE[a.prioritate]}>{prioritateLabels[a.prioritate]}</Badge>
              <div className="min-w-0 flex-1">
                <p className={`truncate ${textCard} font-medium text-[var(--ci-text)]`}>{a.motiv}</p>
                <p className={`mt-0.5 ${textMic} text-[var(--ci-text-muted)]`}>
                  {a.responsabil} · termen {formatDataRelativa(a.termen)}
                </p>
              </div>
              <Link
                href={`${base}/${a.href}`}
                className="inline-flex h-8 shrink-0 items-center gap-1 rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] px-3 text-[12px] font-medium text-[var(--ci-text)] transition-colors hover:border-[var(--ci-primary)] hover:text-[var(--ci-primary)]"
              >
                {dict.actionCenter.resolve} <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title={dict.donationChart.title} subtitle={dict.donationChart.subtitle} />
          <MiniEvolutie evolutie={evolutie} />
        </Card>
        <Card>
          <CardHeader title={dict.pipeline.titlePrefix} subtitle={dict.pipeline.inLucru(inLucruPipeline)} />
          <div className="space-y-3">
            {pipeline.map((p) => (
              <div key={p.stage} className="flex items-center justify-between">
                <span className={`${textMic} text-[var(--ci-text-muted)]`}>{p.label}</span>
                <span className={`ci-tabular text-sm font-semibold ${p.count > 0 && blocate > 0 && p.stage !== "sponsorizat" ? "text-[var(--ci-amber)]" : "text-[var(--ci-text)]"}`}>
                  {p.stage === "sponsorizat" ? formatSuma(p.suma) : String(p.count)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title={dict.team.title} subtitle={dict.team.subtitle} />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <TeamStat icon={Phone} label={dict.team.calls} value={apeluriReale ?? 0} />
          <TeamStat icon={Mail} label={dict.team.emails} value={112} />
          <TeamStat icon={Calendar} label={dict.team.meetings} value={9} />
          <TeamStat icon={CheckCircle2} label={dict.team.tasksDone} value={41} />
        </div>
      </Card>
    </>
  );
}

// Grafic simplificat, fără recharts — familia cald-protector nu vrea un
// grafic tehnic dominant, doar un rezumat vizual discret sub formă de bare.
function MiniEvolutie({ evolutie }: { evolutie: DashboardData["evolutie"] }) {
  const max = Math.max(1, ...evolutie.map((e) => e.pf + e.pj + e.recurent));
  return (
    <div className="flex h-40 items-end gap-1.5">
      {evolutie.map((e) => {
        const total = e.pf + e.pj + e.recurent;
        return (
          <div key={e.label} className="flex flex-1 flex-col items-center gap-1">
            <div
              className="w-full rounded-t-md bg-[var(--ci-primary)] opacity-80"
              style={{ height: `${Math.max(4, (total / max) * 100)}%` }}
              title={formatSuma(total)}
            />
            <span className="text-[10px] text-[var(--ci-text-faint)]">{e.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function TeamStat({ icon: Icon, label, value }: { icon: typeof Phone; label: string; value: number }) {
  return (
    <div className="rounded-[var(--ci-radius-card)] bg-[var(--ci-surface-2)] p-3.5">
      <Icon className="mb-2 h-4 w-4 text-[var(--ci-text-muted)]" />
      <p className="ci-tabular text-lg font-bold text-[var(--ci-text)]">{value}</p>
      <p className="text-[12px] text-[var(--ci-text-muted)]">{label}</p>
    </div>
  );
}
