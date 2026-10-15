"use server";

import { desc, eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";

import { getAuthUser } from "@/lib/auth/dal";
import { isPlatformAdmin } from "@/lib/billing/trial";
import { db } from "@/lib/db";
import { appUsers, feedbackPlatforma, organizations } from "@/lib/db/schema";
import { EroareUtilizator } from "@/lib/erori";
import { MAX_MESAJ, esteStareSugestie } from "@/lib/feedback/calcule";

// Garda acțiunilor din acest fișier: doar contul platformei. Citim și scriem peste TOATE organizațiile, deci nu folosim withOrgSession.
async function cerePlatformAdmin(): Promise<string> {
  const authUser = await getAuthUser();
  if (!authUser?.email) redirect("/login");
  if (!isPlatformAdmin(authUser.email)) throw new EroareUtilizator("Acces interzis.");
  return authUser.email;
}

// `app.platform_admin` deschide politica feedback_platforma_admin; `app.public_lookup` lasă să citim numele organizației și e-mailul autorului.
async function inContextPlatforma<T>(f: (tx: typeof db) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.platform_admin', 'true', true)`);
    await tx.execute(sql`select set_config('app.public_lookup', 'true', true)`);
    return f(tx as unknown as typeof db);
  });
}

export type FeedbackAdminRand = {
  id: string;
  tip: string;
  orgNume: string;
  orgSlug: string;
  nps: number | null;
  satisfactie: number | null;
  note: Record<string, number>;
  module: string[];
  cePlace: string | null;
  ceLipseste: string | null;
  categorie: string | null;
  titlu: string | null;
  mesaj: string | null;
  // E-mailul autorului apare doar dacă a bifat că poate fi contactat.
  contact: string | null;
  stare: string;
  raspuns: string | null;
  raspunsLa: string | null;
  createdAt: string;
};

export async function listeazaFeedbackAction(): Promise<FeedbackAdminRand[]> {
  await cerePlatformAdmin();
  const randuri = await inContextPlatforma((tx) =>
    tx
      .select({
        f: feedbackPlatforma,
        orgNume: organizations.name,
        orgSlug: organizations.slug,
        email: appUsers.email,
      })
      .from(feedbackPlatforma)
      .innerJoin(organizations, eq(organizations.id, feedbackPlatforma.orgId))
      .leftJoin(appUsers, eq(appUsers.id, feedbackPlatforma.userId))
      .orderBy(desc(feedbackPlatforma.createdAt))
      .limit(1000),
  );
  return randuri.map(({ f, orgNume, orgSlug, email }) => ({
    id: f.id,
    tip: f.tip,
    orgNume,
    orgSlug,
    nps: f.nps,
    satisfactie: f.satisfactie,
    note: f.note,
    module: f.module,
    cePlace: f.cePlace,
    ceLipseste: f.ceLipseste,
    categorie: f.categorie,
    titlu: f.titlu,
    mesaj: f.mesaj,
    contact: f.poateContacta ? email : null,
    stare: f.stare,
    raspuns: f.raspuns,
    raspunsLa: f.raspunsLa ? f.raspunsLa.toISOString() : null,
    createdAt: f.createdAt.toISOString(),
  }));
}

export type RezultatRaspuns = { ok: true; raspunsLa: string | null } | { ok: false; eroare: string };

// Schimbă starea unei sugestii și/sau scrie răspunsul vizibil autorului (în pagina lui de feedback).
export async function raspundeSugestieAction(id: string, stare: string, raspuns: string): Promise<RezultatRaspuns> {
  const email = await cerePlatformAdmin();
  if (!esteStareSugestie(stare)) return { ok: false, eroare: "Starea aleasă nu există." };
  const text = raspuns.replace(/\r\n/g, "\n").trim().slice(0, MAX_MESAJ);
  const rezultat = await inContextPlatforma(async (tx) => {
    const [curent] = await tx.select({ raspuns: feedbackPlatforma.raspuns, raspunsLa: feedbackPlatforma.raspunsLa }).from(feedbackPlatforma).where(eq(feedbackPlatforma.id, id)).limit(1);
    if (!curent) return null;
    const schimbat = (curent.raspuns ?? "") !== text;
    const raspunsLa = text ? (schimbat ? new Date() : curent.raspunsLa) : null;
    await tx
      .update(feedbackPlatforma)
      .set({ stare, raspuns: text || null, raspunsLa, raspunsDe: text ? email : null })
      .where(eq(feedbackPlatforma.id, id));
    return { raspunsLa };
  });
  if (!rezultat) return { ok: false, eroare: "Sugestia nu a fost găsită." };
  return { ok: true, raspunsLa: rezultat.raspunsLa ? rezultat.raspunsLa.toISOString() : null };
}
