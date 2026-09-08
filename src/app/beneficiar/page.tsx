import { and, asc, eq, sql } from "drizzle-orm";
import Link from "next/link";

import { requireBeneficiarAccess, withBeneficiarSession } from "@/lib/auth/guard";
import { fundraisingCampaignAgents, fundraisingInvoices, fundraisingTasks } from "@/lib/db/schema";

function formatLei(n: number): string {
  return `${n.toLocaleString("ro-RO")} lei`;
}

const getDashboardData = withBeneficiarSession(async (ctx) => {
  const [{ facturiAchitate }] = await ctx.db
    .select({ facturiAchitate: sql<number>`coalesce(sum(${fundraisingInvoices.suma}), 0)::int` })
    .from(fundraisingInvoices)
    .where(and(eq(fundraisingInvoices.campaignPageId, ctx.campaignPageId), eq(fundraisingInvoices.status, "achitata")));

  // Fără JOIN pe app_users — un beneficiar nu are politică RLS care să-i
  // permită să vadă rândul app_users al agentului; nume/email denormalizate
  // pe fundraising_campaign_agents la atribuire (vezi schema).
  const agentRows = await ctx.db
    .select({ nume: fundraisingCampaignAgents.agentNume, email: fundraisingCampaignAgents.agentEmail })
    .from(fundraisingCampaignAgents)
    .where(and(eq(fundraisingCampaignAgents.campaignPageId, ctx.campaignPageId), eq(fundraisingCampaignAgents.active, true)))
    .limit(1);

  const sarcini = await ctx.db
    .select()
    .from(fundraisingTasks)
    .where(and(eq(fundraisingTasks.campaignPageId, ctx.campaignPageId), eq(fundraisingTasks.status, "de_facut")))
    .orderBy(asc(fundraisingTasks.dataLimita))
    .limit(5);

  return { facturiAchitate, agent: agentRows[0] ?? null, sarcini };
});

export default async function BeneficiarDashboardPage() {
  const [access, data] = await Promise.all([requireBeneficiarAccess(), getDashboardData()]);

  const sumaStransa = access.campaignSumaStransa ?? 0;
  const sumaTinta = access.campaignSumaTinta;
  const procent = sumaTinta ? Math.min(100, Math.round((sumaStransa / sumaTinta) * 100)) : null;
  const contributieOperationala = Math.round(sumaStransa * 0.1);
  const sumaNeta = sumaStransa - contributieOperationala;
  const soldNet = sumaNeta - data.facturiAchitate;
  const ramasDeStrans = sumaTinta ? Math.max(0, sumaTinta - sumaStransa) : null;

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-2xl border border-line bg-panel shadow-sm">
        {access.campaignImagineUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- domeniu Supabase Storage dinamic
          <img src={access.campaignImagineUrl} alt={access.campaignTitlu} className="aspect-[21/9] w-full object-cover" />
        ) : (
          <div className="aspect-[21/9] w-full bg-gradient-to-br from-brand-blue to-brand-green" />
        )}
        <div className="p-6">
          <p className="text-xs font-bold tracking-wide text-brand-green uppercase">Bună, {access.userName || access.userEmail}</p>
          <h1 className="font-display mt-1 text-2xl font-bold text-ink">{access.campaignTitlu}</h1>
          <a
            href={`/strangere-fonduri/${access.orgSlug}/${access.campaignSlug}`}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-block text-[13px] font-medium text-brand-green hover:underline"
          >
            Vezi pagina publică a campaniei →
          </a>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {sumaTinta && (
          <div className="rounded-xl border border-line bg-panel p-4">
            <p className="text-[12px] text-muted-2">Sumă necesară</p>
            <p className="mt-1 text-lg font-bold text-ink">{formatLei(sumaTinta)}</p>
          </div>
        )}
        <div className="rounded-xl border border-line bg-panel p-4">
          <p className="text-[12px] text-muted-2">Sumă brută strânsă</p>
          <p className="mt-1 text-lg font-bold text-brand-blue">{formatLei(sumaStransa)}</p>
        </div>
        {procent != null && (
          <div className="rounded-xl border border-line bg-panel p-4">
            <p className="text-[12px] text-muted-2">Procent campanie</p>
            <p className="mt-1 text-lg font-bold text-ink">{procent}%</p>
          </div>
        )}
        {ramasDeStrans != null && (
          <div className="rounded-xl border border-line bg-panel p-4">
            <p className="text-[12px] text-muted-2">Mai e nevoie de</p>
            <p className="mt-1 text-lg font-bold text-ink">{formatLei(ramasDeStrans)}</p>
          </div>
        )}
        <div className="rounded-xl border-2 border-brand-green bg-brand-green-soft p-4">
          <p className="text-[12px] text-ink/70">Sold net disponibil</p>
          <p className="mt-1 text-lg font-bold text-ink">{formatLei(soldNet)}</p>
        </div>
      </div>

      <div className="rounded-xl border border-line bg-panel p-5">
        <h2 className="font-display text-sm font-bold text-ink">Detaliu financiar</h2>
        <div className="mt-3 flex flex-col gap-2 text-[13.5px]">
          <div className="flex justify-between border-b border-line pb-2">
            <span className="text-muted">Sumă brută strânsă</span>
            <span className="font-medium text-ink">{formatLei(sumaStransa)}</span>
          </div>
          <div className="flex justify-between border-b border-line pb-2">
            <span className="text-muted">Contribuție operațională (10%)</span>
            <span className="font-medium text-ink">− {formatLei(contributieOperationala)}</span>
          </div>
          <div className="flex justify-between border-b border-line pb-2">
            <span className="text-muted">Sumă netă disponibilă</span>
            <span className="font-medium text-ink">{formatLei(sumaNeta)}</span>
          </div>
          <div className="flex justify-between border-b border-line pb-2">
            <span className="text-muted">Facturi achitate</span>
            <span className="font-medium text-ink">− {formatLei(data.facturiAchitate)}</span>
          </div>
          <div className="flex justify-between pt-1">
            <span className="font-semibold text-ink">Sold net disponibil</span>
            <span className="font-bold text-brand-green">{formatLei(soldNet)}</span>
          </div>
        </div>
        <Link href="/beneficiar/situatie-financiara" className="mt-3 inline-block text-[13px] font-medium text-brand-green hover:underline">
          Vezi detaliile complete →
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-line bg-panel p-5">
          <h2 className="font-display text-sm font-bold text-ink">Agentul tău dedicat</h2>
          {data.agent ? (
            <div className="mt-2">
              <p className="text-[14px] font-medium text-ink">{data.agent.nume || data.agent.email}</p>
              <p className="text-[12px] text-muted-2">{data.agent.email}</p>
            </div>
          ) : (
            <p className="mt-2 text-[13px] text-muted-2">Nu ți-a fost atribuit încă un agent — echipa te va contacta în curând.</p>
          )}
          <Link href="/beneficiar/agentul-meu" className="mt-3 inline-block text-[13px] font-medium text-brand-green hover:underline">
            {data.agent ? "Vezi profilul și mesajele →" : "Vezi mesaje →"}
          </Link>
        </div>

        <div className="rounded-xl border border-line bg-panel p-5">
          <h2 className="font-display text-sm font-bold text-ink">Următoarele sarcini</h2>
          {data.sarcini.length ? (
            <div className="mt-2 flex flex-col gap-2">
              {data.sarcini.map((s) => (
                <div key={s.id} className="flex items-center justify-between text-[13px]">
                  <span className="text-ink">{s.titlu}</span>
                  {s.dataLimita && <span className="text-muted-2">{new Date(s.dataLimita).toLocaleDateString("ro-RO")}</span>}
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-[13px] text-muted-2">Nu ai sarcini în așteptare momentan.</p>
          )}
        </div>
      </div>
    </div>
  );
}
