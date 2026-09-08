import { Badge } from "../components/ui/badge";
import { Breadcrumb } from "../components/ui/breadcrumb";
import { Card, CardHeader } from "../components/ui/card";
import { EmptyState } from "../components/ui/states";
import { getPanouBeneficiari } from "./actions";
import { PanouBeneficiari } from "./panou-beneficiari";

const ACTIUNE_LABEL: Record<string, string> = {
  factura_incarcata: "Factură încărcată",
  factura_stearsa: "Factură ștearsă",
  agent_atribuit: "Agent atribuit",
  beneficiar_dezactivat: "Beneficiar dezactivat",
  comunicat_aprobat: "Comunicat aprobat",
};

export default async function PortalBeneficiariPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const { beneficiari, taskuriNefinalizate, campaniiStagnante, auditLog } = await getPanouBeneficiari(orgSlug);

  return (
    <div className="mx-auto max-w-[1100px] space-y-5">
      <Breadcrumb items={[{ label: "Strângere fonduri", href: `/${orgSlug}/crm/strangere-fonduri` }, { label: "Panou beneficiari" }]} />
      <div>
        <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">Panou beneficiari</h1>
        <p className="mt-0.5 text-[13px] text-[var(--ci-text-muted)]">Vizualizare centralizată peste toate campaniile cu beneficiar — filtrare, rapoarte, jurnal de audit.</p>
      </div>

      <PanouBeneficiari orgSlug={orgSlug} beneficiari={beneficiari.map((b) => ({ ...b, createdAt: b.createdAt.toISOString() }))} />

      <Card>
        <CardHeader title="Sarcini nefinalizate" subtitle={`${taskuriNefinalizate.length} sarcini în așteptare, pe toate campaniile`} />
        {taskuriNefinalizate.length ? (
          <div className="flex flex-col gap-2">
            {taskuriNefinalizate.map((t) => (
              <a
                key={t.id}
                href={`/${orgSlug}/crm/strangere-fonduri/${t.campaignPageId}`}
                className="flex items-center justify-between gap-2 rounded-lg border border-[var(--ci-border)] px-3.5 py-2.5 hover:border-[var(--ci-border-strong)]"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-[13px] font-medium text-[var(--ci-text)]">{t.titlu}</span>
                    {t.tip === "sponsorizare" && (
                      <Badge tone="purple" icon={false}>
                        Sponsorizare
                      </Badge>
                    )}
                  </div>
                  <p className="truncate text-[12px] text-[var(--ci-text-muted)]">{t.campaignTitlu}</p>
                </div>
                {t.dataLimita && <span className="shrink-0 text-[12px] text-[var(--ci-text-faint)]">{new Date(t.dataLimita).toLocaleDateString("ro-RO")}</span>}
              </a>
            ))}
          </div>
        ) : (
          <EmptyState title="Nicio sarcină în așteptare" description="Toate sarcinile beneficiarilor sunt finalizate." />
        )}
      </Card>

      <Card>
        <CardHeader title="Campanii stagnante" subtitle="Nicio actualizare publicată în ultimele 14 zile" />
        {campaniiStagnante.length ? (
          <div className="flex flex-col gap-2">
            {campaniiStagnante.map((c) => (
              <a
                key={c.id}
                href={`/${orgSlug}/crm/strangere-fonduri/${c.id}`}
                className="flex items-center justify-between gap-2 rounded-lg border border-[var(--ci-border)] px-3.5 py-2.5 hover:border-[var(--ci-border-strong)]"
              >
                <span className="truncate text-[13px] font-medium text-[var(--ci-text)]">{c.titlu}</span>
                <Badge tone="amber" icon={false}>
                  {c.zileFaraActualizare != null ? `${c.zileFaraActualizare} zile fără update` : "Nicio actualizare încă"}
                </Badge>
              </a>
            ))}
          </div>
        ) : (
          <EmptyState title="Nicio campanie stagnantă" description="Toate campaniile active au primit o actualizare recentă." />
        )}
      </Card>

      <Card>
        <CardHeader title="Jurnal de audit" subtitle="Operațiuni financiare și administrative sensibile — vizibil doar admin/owner" />
        {auditLog.length ? (
          <div className="flex flex-col gap-1.5">
            {auditLog.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-2 border-b border-[var(--ci-border)] px-1 py-2 text-[12.5px] last:border-0">
                <div className="min-w-0">
                  <span className="font-medium text-[var(--ci-text)]">{ACTIUNE_LABEL[a.actiune] ?? a.actiune}</span>
                  <span className="ml-2 text-[var(--ci-text-muted)]">{a.actorNume || a.actorEmail || "sistem"}</span>
                </div>
                <span className="shrink-0 text-[var(--ci-text-faint)]">{new Date(a.createdAt).toLocaleString("ro-RO")}</span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="Niciun eveniment înregistrat" description="Jurnalul de audit e gol momentan." />
        )}
      </Card>
    </div>
  );
}
