import { Badge } from "../components/ui/badge";
import { Breadcrumb } from "../components/ui/breadcrumb";
import { Card, CardHeader } from "../components/ui/card";
import { EmptyState } from "../components/ui/states";
import { getPanouBeneficiari } from "./actions";
import { PanouBeneficiari } from "./panou-beneficiari";
import { PORTAL_BENEFICIARI_UI_DICT } from "@/lib/i18n/dictionaries/portal-beneficiari-ui";
import { getLocale } from "@/lib/i18n/get-locale";
import { titluAbsolut } from "@/lib/page-titles";

export default async function PortalBeneficiariPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const locale = await getLocale();
  const dict = PORTAL_BENEFICIARI_UI_DICT[locale];
  const intl = locale === "ro" ? "ro-RO" : "en-GB";
  const { beneficiari, taskuriNefinalizate, campaniiStagnante, auditLog } = await getPanouBeneficiari(orgSlug);

  return (
    <div className="mx-auto max-w-[1100px] space-y-5">
      <Breadcrumb items={[{ label: dict.strangereFonduri, href: `/${orgSlug}/crm/strangere-fonduri` }, { label: dict.titlu }]} />
      <div>
        <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">{dict.titlu}</h1>
        <p className="mt-0.5 text-[13px] text-[var(--ci-text-muted)]">{dict.descriere}</p>
      </div>

      <PanouBeneficiari orgSlug={orgSlug} beneficiari={beneficiari.map((b) => ({ ...b, createdAt: b.createdAt.toISOString() }))} />

      <Card>
        <CardHeader title={dict.sarcini} subtitle={dict.sarciniSub(taskuriNefinalizate.length)} />
        {taskuriNefinalizate.length ? (
          <div className="flex flex-col gap-2">
            {taskuriNefinalizate.map((t) => (
              <a
                key={t.id}
                href={`/${orgSlug}/crm/strangere-fonduri/${t.campaignPageId}`}
                className="flex items-center justify-between gap-2 rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] px-3.5 py-2.5 hover:border-[var(--ci-border-strong)]"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-[13px] font-medium text-[var(--ci-text)]">{t.titlu}</span>
                    {t.tip === "sponsorizare" && (
                      <Badge tone="purple" icon={false}>
                        {dict.sponsorizare}
                      </Badge>
                    )}
                  </div>
                  <p className="truncate text-[12px] text-[var(--ci-text-muted)]">{t.campaignTitlu}</p>
                </div>
                {t.dataLimita && <span className="shrink-0 text-[12px] text-[var(--ci-text-faint)]">{new Date(t.dataLimita).toLocaleDateString(intl)}</span>}
              </a>
            ))}
          </div>
        ) : (
          <EmptyState title={dict.faraSarcini} description={dict.faraSarciniDescriere} />
        )}
      </Card>

      <Card>
        <CardHeader title={dict.stagnante} subtitle={dict.stagnanteSub} />
        {campaniiStagnante.length ? (
          <div className="flex flex-col gap-2">
            {campaniiStagnante.map((c) => (
              <a
                key={c.id}
                href={`/${orgSlug}/crm/strangere-fonduri/${c.id}`}
                className="flex items-center justify-between gap-2 rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] px-3.5 py-2.5 hover:border-[var(--ci-border-strong)]"
              >
                <span className="truncate text-[13px] font-medium text-[var(--ci-text)]">{c.titlu}</span>
                <Badge tone="amber" icon={false}>
                  {c.zileFaraActualizare != null ? dict.zileFaraUpdate(c.zileFaraActualizare) : dict.nicioActualizare}
                </Badge>
              </a>
            ))}
          </div>
        ) : (
          <EmptyState title={dict.faraStagnante} description={dict.faraStagnanteDescriere} />
        )}
      </Card>

      <Card>
        <CardHeader title={dict.audit} subtitle={dict.auditSub} />
        {auditLog.length ? (
          <div className="flex flex-col gap-1.5">
            {auditLog.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-2 border-b border-[var(--ci-border)] px-1 py-2 text-[12.5px] last:border-0">
                <div className="min-w-0">
                  <span className="font-medium text-[var(--ci-text)]">{dict.actiuni[a.actiune] ?? a.actiune}</span>
                  <span className="ml-2 text-[var(--ci-text-muted)]">{a.actorNume || a.actorEmail || dict.sistem}</span>
                </div>
                <span className="shrink-0 text-[var(--ci-text-faint)]">{new Date(a.createdAt).toLocaleString(intl)}</span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title={dict.faraEvenimente} description={dict.faraEvenimenteDescriere} />
        )}
      </Card>
    </div>
  );
}

export async function generateMetadata() {
  return titluAbsolut("crmPortalBeneficiari");
}
