import "server-only";

import { desc, eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { appUsers, memberships, organizations } from "@/lib/db/schema";
import { primaIntrare, stareUtilizator, ultimulSemn, type StareUtilizator } from "@/lib/utilizatori/activitate";

// Lista tuturor utilizatorilor, cu activitatea lor — pentru Panou platformă → Utilizatori. Apelantul a verificat deja isPlatformAdmin (pagina).
// Rulează în contextul de încredere `app.public_lookup`, singurul care citește app_users/memberships/organizations peste toate organizațiile.

export type RandUtilizator = {
  id: string;
  email: string;
  nume: string | null;
  tipCont: string | null;
  orgNume: string | null;
  orgSlug: string | null;
  rol: string | null;
  creatLa: Date;
  primaIntrare: Date | null;
  primaIntrareEstimata: boolean;
  ultimaAutentificare: Date | null;
  ultimaVizita: Date | null;
  ultimaLucrare: Date | null;
  stare: StareUtilizator;
  zileDeLaUltimulSemn: number | null;
};

export async function listeazaUtilizatori(acum: Date = new Date()): Promise<RandUtilizator[]> {
  const randuri = await db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.public_lookup', 'true', true)`);
    return tx
      .select({
        id: appUsers.id,
        email: appUsers.email,
        nume: appUsers.name,
        tipCont: appUsers.accountType,
        creatLa: appUsers.createdAt,
        primaAutentificare: appUsers.firstLoginAt,
        ultimaAutentificare: appUsers.lastLoginAt,
        ultimaVizita: appUsers.lastSeenAt,
        ultimaLucrare: appUsers.lastActionAt,
        orgNume: organizations.name,
        orgSlug: organizations.slug,
        rol: memberships.role,
      })
      .from(appUsers)
      .leftJoin(memberships, eq(memberships.userId, appUsers.id))
      .leftJoin(organizations, eq(organizations.id, memberships.orgId))
      .orderBy(desc(appUsers.createdAt));
  });
  const iesire = randuri.map<RandUtilizator>((r) => {
    const { stare, zileDeLaUltimulSemn } = stareUtilizator(r, acum);
    const prima = primaIntrare(r);
    return {
      id: r.id,
      email: r.email,
      nume: r.nume,
      tipCont: r.tipCont,
      orgNume: r.orgNume,
      orgSlug: r.orgSlug,
      rol: r.rol,
      creatLa: r.creatLa,
      primaIntrare: prima.data,
      primaIntrareEstimata: prima.estimata,
      ultimaAutentificare: r.ultimaAutentificare,
      ultimaVizita: r.ultimaVizita,
      ultimaLucrare: r.ultimaLucrare,
      stare,
      zileDeLaUltimulSemn,
    };
  });
  // Cei mai recenți primii; cei care nu au intrat niciodată la sfârșit.
  const semn = (r: RandUtilizator) => ultimulSemn(r)?.getTime() ?? -1;
  return iesire.sort((a, b) => semn(b) - semn(a));
}
