import "server-only";

import { sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { donatieAtribuiri } from "@/lib/db/schema";
import { raporteazaEroare } from "@/lib/monitoring";

import { MODEL_ATRIBUIRE, valideazaTouch } from "./atribuire";

// Fixează contextul de atribuire al unei donații în clipa creării ei (înainte de trimiterea la procesator). Nu aruncă niciodată:
// măsurarea nu are voie să strice o donație. Nu schimbă suma, starea sau confirmarea plății; donația se numără în rapoarte abia după webhook.
// Fără context valid (acces direct, fără UTM, JSON invalid) nu se scrie nimic, iar donația rămâne „neatribuită”.
export async function inregistreazaAtribuireDonatie(orgId: string, donatieId: string, brut: string | null | undefined): Promise<void> {
  try {
    if (!brut || brut.length > 400) return;
    let parsat: unknown;
    try {
      parsat = JSON.parse(brut);
    } catch {
      return;
    }
    const touch = valideazaTouch(parsat, Date.now());
    if (!touch) return;
    await db.transaction(async (tx) => {
      await tx.execute(sql`select set_config('app.current_org_id', ${orgId}, true)`);
      await tx
        .insert(donatieAtribuiri)
        .values({
          donatieId,
          orgId,
          clasa: touch.clasa,
          platforma: touch.platforma,
          utmSource: touch.s,
          utmMedium: touch.m,
          utmCampaign: touch.c,
          utmContent: touch.k,
          clickLa: new Date(touch.t),
          consimtamant: touch.st === 1 ? "analytics-acordat" : "fara-stocare",
          model: MODEL_ATRIBUIRE,
        })
        .onConflictDoNothing();
    });
  } catch (e) {
    raporteazaEroare("donatie-atribuire", e, { orgId });
  }
}
