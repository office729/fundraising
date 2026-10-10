import "server-only";

import { and, asc, eq, inArray, sql } from "drizzle-orm";

import type { Tx } from "@/lib/db";
import { volunteerActivities, volunteerShifts, volunteerSignups } from "@/lib/db/schema";
import { STATUSURI_CARE_OCUPA_LOC } from "@/lib/voluntari-activitati";

// Reguli comune de înscriere (folosite de pagina publică și de echipă): locurile unei ture se numără doar din înscrierile care
// ocupă loc, iar un loc eliberat merge la primul de pe lista de rezervă (doar la activitățile cu aprobare automată).

export async function locuriOcupate(tx: Tx, orgId: string, shiftId: string): Promise<number> {
  const [r] = await tx
    .select({ n: sql<number>`count(*)::int` })
    .from(volunteerSignups)
    .where(and(eq(volunteerSignups.orgId, orgId), eq(volunteerSignups.shiftId, shiftId), inArray(volunteerSignups.status, STATUSURI_CARE_OCUPA_LOC)));
  return r?.n ?? 0;
}

// Blochează rândul turei până la sfârșitul tranzacției: două înscrieri simultane nu pot depăși numărul de locuri.
export async function blocheazaTura(tx: Tx, orgId: string, shiftId: string) {
  const r = await tx.execute(sql`select id, locuri, activity_id from volunteer_shifts where id = ${shiftId} and org_id = ${orgId} for update`);
  const rand = (r as unknown as { id: string; locuri: number; activity_id: string }[])[0];
  return rand ? { id: rand.id, locuri: Number(rand.locuri), activityId: rand.activity_id } : null;
}

// După o anulare sau o respingere: dacă a rămas un loc liber și activitatea e cu aprobare automată, primul din rezervă devine confirmat.
export async function promoveazaDinRezerva(tx: Tx, orgId: string, shiftId: string): Promise<string | null> {
  const tura = await blocheazaTura(tx, orgId, shiftId);
  if (!tura) return null;
  const [activitate] = await tx
    .select({ aprobare: volunteerActivities.aprobare, stare: volunteerActivities.stare })
    .from(volunteerActivities)
    .where(and(eq(volunteerActivities.id, tura.activityId), eq(volunteerActivities.orgId, orgId)))
    .limit(1);
  if (!activitate || activitate.aprobare !== "automata" || activitate.stare !== "publicata") return null;
  if ((await locuriOcupate(tx, orgId, shiftId)) >= tura.locuri) return null;
  const [urmator] = await tx
    .select({ id: volunteerSignups.id })
    .from(volunteerSignups)
    .where(and(eq(volunteerSignups.orgId, orgId), eq(volunteerSignups.shiftId, shiftId), eq(volunteerSignups.status, "rezerva")))
    .orderBy(asc(volunteerSignups.createdAt))
    .limit(1);
  if (!urmator) return null;
  await tx.update(volunteerSignups).set({ status: "confirmata", updatedAt: new Date() }).where(and(eq(volunteerSignups.id, urmator.id), eq(volunteerSignups.orgId, orgId)));
  return urmator.id;
}

export async function turaCuDate(tx: Tx, orgId: string, shiftId: string) {
  const [t] = await tx
    .select({ id: volunteerShifts.id, activityId: volunteerShifts.activityId, inceputLa: volunteerShifts.inceputLa, seTerminaLa: volunteerShifts.seTerminaLa, locuri: volunteerShifts.locuri })
    .from(volunteerShifts)
    .where(and(eq(volunteerShifts.id, shiftId), eq(volunteerShifts.orgId, orgId)))
    .limit(1);
  return t ?? null;
}
