import { desc, eq } from "drizzle-orm";

import { withBeneficiarSession } from "@/lib/auth/guard";
import { fundraisingCampaignAgents, fundraisingMessages } from "@/lib/db/schema";

import { MesajeThread } from "../mesaje-thread";

// Nu se face JOIN pe app_users — un beneficiar nu are nicio politică RLS
// care să-i permită să vadă rândul app_users al agentului sau al staff-ului
// care a scris un mesaj (nu are membership). Numele/emailul sunt
// denormalizate la scriere (agentNume/agentEmail, senderNume/senderEmail) —
// vezi comentariile din schema.
const getData = withBeneficiarSession(async (ctx) => {
  const agentRows = await ctx.db
    .select({
      nume: fundraisingCampaignAgents.agentNume,
      email: fundraisingCampaignAgents.agentEmail,
      bio: fundraisingCampaignAgents.bio,
      programDisponibilitate: fundraisingCampaignAgents.programDisponibilitate,
      contactAprobat: fundraisingCampaignAgents.contactAprobat,
    })
    .from(fundraisingCampaignAgents)
    .where(eq(fundraisingCampaignAgents.campaignPageId, ctx.campaignPageId))
    .limit(1);

  const mesajeRows = await ctx.db
    .select()
    .from(fundraisingMessages)
    .where(eq(fundraisingMessages.campaignPageId, ctx.campaignPageId))
    .orderBy(desc(fundraisingMessages.createdAt));

  return {
    agent: agentRows[0] ?? null,
    mesaje: mesajeRows.map((m) => ({ ...m, suntEu: m.senderAppUserId === ctx.userId })),
  };
});

export default async function AgentulMeuPage() {
  const data = await getData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-bold text-ink">Agentul tău</h1>
      </div>

      {data.agent ? (
        <div className="rounded-xl border border-line bg-panel p-5">
          <p className="text-[15px] font-bold text-ink">{data.agent.nume || data.agent.email}</p>
          <p className="text-[13px] text-muted-2">{data.agent.email}</p>
          {data.agent.bio && <p className="mt-2 text-[13.5px] text-muted">{data.agent.bio}</p>}
          {data.agent.programDisponibilitate && (
            <p className="mt-1 text-[12.5px] text-muted-2">Program: {data.agent.programDisponibilitate}</p>
          )}
          {data.agent.contactAprobat && <p className="mt-1 text-[12.5px] text-muted-2">Contact: {data.agent.contactAprobat}</p>}
        </div>
      ) : (
        <div className="rounded-xl border border-line bg-panel p-5">
          <p className="text-[13.5px] text-muted-2">Nu ți-a fost atribuit încă un agent — echipa te va contacta în curând.</p>
        </div>
      )}

      <MesajeThread mesaje={data.mesaje.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() }))} />
    </div>
  );
}
