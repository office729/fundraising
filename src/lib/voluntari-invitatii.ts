import "server-only";

import { and, eq, isNull, lt, or, sql } from "drizzle-orm";

import type { OrgContext } from "@/lib/auth/guard";
import { volunteerVisitors } from "@/lib/db/schema";

// Cine poate primi o invitație la o activitate: doar voluntarii care au bifat explicit că vor invitații, au un email, au mai făcut
// ceva cu organizația (au fost prezenți, au terminat o sarcină sau au distribuit) și nu au primit o invitație în ultimele 7 zile.
// Cei deja înscriși la activitate (în afară de înscrierile anulate) nu apar. Ținut aici, nu în acțiunile de server, ca să nu poată fi
// apelat direct din browser.
export const ZILE_INTRE_INVITATII = 7;
export const MAX_INVITATII = 100;

export type CandidatInvitatie = { id: string; prenume: string; activitati: number; sarcini: number };

export async function candidatiPentru(ctx: { db: OrgContext["db"]; orgId: string }, activityId: string, acum: number = Date.now()): Promise<CandidatInvitatie[]> {
  const limita = new Date(acum - ZILE_INTRE_INVITATII * 86_400_000);
  const randuri = await ctx.db
    .select({
      id: volunteerVisitors.id,
      prenume: volunteerVisitors.prenume,
      // Referința la voluntar e scrisă explicit în subinterogări: într-un select fără join, Drizzle ar scoate prefixul tabelei.
      activitati: sql<number>`(select count(*)::int from volunteer_signups g where g.visitor_id = "volunteer_visitors"."id" and g.status = 'prezent')`,
      sarcini: sql<number>`(select count(*)::int from volunteer_task_engagements e where e.visitor_id = "volunteer_visitors"."id" and e.stare = 'finalizat')`,
      distribuiri: sql<number>`(select count(*)::int from volunteer_shares h where h.visitor_id = "volunteer_visitors"."id")`,
    })
    .from(volunteerVisitors)
    .where(
      and(
        eq(volunteerVisitors.orgId, ctx.orgId),
        eq(volunteerVisitors.acordInvitatii, true),
        sql`${volunteerVisitors.email} is not null`,
        or(isNull(volunteerVisitors.ultimaInvitatieLa), lt(volunteerVisitors.ultimaInvitatieLa, limita)),
        sql`not exists (select 1 from volunteer_signups x where x.visitor_id = "volunteer_visitors"."id" and x.activity_id = ${activityId} and x.status <> 'anulata')`,
      ),
    )
    .limit(500);
  return randuri
    .filter((r) => r.activitati + r.sarcini + r.distribuiri > 0)
    .sort((x, y) => y.activitati - x.activitati || y.sarcini - x.sarcini)
    .map((r) => ({ id: r.id, prenume: r.prenume, activitati: r.activitati, sarcini: r.sarcini }));
}
