import "server-only";

import { and, asc, eq, sql } from "drizzle-orm";
import { cache } from "react";

import { db, type Tx } from "@/lib/db";
import { organizations, volunteerActivities, volunteerPanelLinks, volunteerShifts, volunteerSignups, volunteerVisitors } from "@/lib/db/schema";
import { linkCoordonatorValabil } from "@/lib/voluntari-prezenta";
import type { OrgPublica } from "@/lib/voluntari-panou-server";

// Pagina coordonatorului (/coordonator/<cod>): un cod secret pe activitate, fără cont. Codul dă acces doar la acea activitate, până la
// câteva zile după încheiere. Căutarea după cod rulează sub app.public_lookup (doar SELECT); orice altceva, în contextul organizației.

export const COD_COORDONATOR_REGEX = /^[2-9A-HJ-NP-Za-km-z]{24}$/;

export type ContextCoordonator = {
  org: OrgPublica;
  activitate: { id: string; titlu: string; locatie: string; localitate: string; inceputLa: Date; seTerminaLa: Date; stare: string };
  codVoluntari: string | null; // linkul voluntarilor (pentru adresa codului QR); null dacă nu există sau e oprit
};

export const rezolvaCodCoordonator = cache(async (cod: string): Promise<ContextCoordonator | null> => {
  if (!COD_COORDONATOR_REGEX.test(String(cod ?? ""))) return null;
  const r = await db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.public_lookup', 'true', true)`);
    const [a] = await tx
      .select({
        id: volunteerActivities.id,
        titlu: volunteerActivities.titlu,
        locatie: volunteerActivities.locatie,
        localitate: volunteerActivities.localitate,
        inceputLa: volunteerActivities.inceputLa,
        seTerminaLa: volunteerActivities.seTerminaLa,
        stare: volunteerActivities.stare,
        orgId: volunteerActivities.orgId,
        slug: organizations.slug,
        nume: organizations.name,
        logoUrl: organizations.logoUrl,
        brandColor: organizations.brandColor,
        cod: volunteerPanelLinks.cod,
        linkActiv: volunteerPanelLinks.activ,
      })
      .from(volunteerActivities)
      .innerJoin(organizations, eq(organizations.id, volunteerActivities.orgId))
      .leftJoin(volunteerPanelLinks, eq(volunteerPanelLinks.orgId, volunteerActivities.orgId))
      .where(eq(volunteerActivities.coordinatorToken, cod))
      .limit(1);
    return a ?? null;
  });
  if (!r || !linkCoordonatorValabil(r.seTerminaLa)) return null;
  return {
    org: { id: r.orgId, slug: r.slug, nume: r.nume, logoUrl: r.logoUrl, brandColor: r.brandColor },
    activitate: { id: r.id, titlu: r.titlu, locatie: r.locatie, localitate: r.localitate ?? "", inceputLa: r.inceputLa, seTerminaLa: r.seTerminaLa, stare: r.stare },
    codVoluntari: r.cod && r.linkActiv ? r.cod : null,
  };
});

export type InscrisCoordonator = { id: string; prenume: string; telefon: string | null; status: string; checkinLa: string | null; laFataLocului: boolean };
export type TuraCoordonator = { id: string; nume: string; inceputLa: string; seTerminaLa: string; locuri: number; inscrisi: InscrisCoordonator[] };

export async function citesteTuriCoordonator(tx: Tx, orgId: string, activityId: string): Promise<TuraCoordonator[]> {
  const ture = await tx
    .select()
    .from(volunteerShifts)
    .where(and(eq(volunteerShifts.orgId, orgId), eq(volunteerShifts.activityId, activityId)))
    .orderBy(asc(volunteerShifts.inceputLa));
  const inscrisi = await tx
    .select({
      id: volunteerSignups.id,
      shiftId: volunteerSignups.shiftId,
      status: volunteerSignups.status,
      checkinLa: volunteerSignups.checkinLa,
      observatii: volunteerSignups.observatii,
      prenume: volunteerVisitors.prenume,
      telefon: volunteerVisitors.telefon,
    })
    .from(volunteerSignups)
    .innerJoin(volunteerVisitors, eq(volunteerVisitors.id, volunteerSignups.visitorId))
    .where(and(eq(volunteerSignups.orgId, orgId), eq(volunteerSignups.activityId, activityId)))
    .orderBy(asc(volunteerSignups.createdAt));
  return ture.map((t) => ({
    id: t.id,
    nume: t.nume,
    inceputLa: t.inceputLa.toISOString(),
    seTerminaLa: t.seTerminaLa.toISOString(),
    locuri: t.locuri,
    inscrisi: inscrisi
      .filter((i) => i.shiftId === t.id && i.status !== "anulata")
      .map((i) => ({ id: i.id, prenume: i.prenume, telefon: i.telefon, status: i.status, checkinLa: i.checkinLa ? i.checkinLa.toISOString() : null, laFataLocului: i.observatii === "la fata locului" })),
  }));
}
