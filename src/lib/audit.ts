import "server-only";

import type { db as dbType } from "@/lib/db";
import { fundraisingAuditLog } from "@/lib/db/schema";

export async function inregistreazaAudit(
  db: typeof dbType,
  params: { orgId: string; actorAppUserId: string; actiune: string; entitate: string; entitateId?: string | null; detalii?: Record<string, unknown> },
): Promise<void> {
  await db.insert(fundraisingAuditLog).values({
    orgId: params.orgId,
    actorAppUserId: params.actorAppUserId,
    actiune: params.actiune,
    entitate: params.entitate,
    entitateId: params.entitateId ?? null,
    detalii: params.detalii ?? null,
  });
}
