"use server";

import { desc, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAuthUser } from "@/lib/auth/dal";
import { isPlatformAdmin } from "@/lib/billing/trial";
import { db } from "@/lib/db";
import { intereseOng } from "@/lib/db/schema";
import { EroareUtilizator } from "@/lib/erori";
import { curataNotita, esteStareLead, type StareLead } from "@/lib/lead-uri";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Garda acțiunilor din acest fișier: doar contul platformei. Lead-urile nu aparțin unei organizații, deci nu folosim withOrgSession.
async function cerePlatformAdmin(): Promise<string> {
  const authUser = await getAuthUser();
  if (!authUser?.email) redirect("/login");
  if (!isPlatformAdmin(authUser.email)) throw new EroareUtilizator("Acces interzis.");
  return authUser.email;
}

// `app.platform_admin` deschide politica interese_ong_admin; `app.public_lookup` lasă să căutăm dacă adresa are deja cont în platformă.
async function inContextPlatforma<T>(f: (tx: typeof db) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.platform_admin', 'true', true)`);
    await tx.execute(sql`select set_config('app.public_lookup', 'true', true)`);
    return f(tx as unknown as typeof db);
  });
}

export type LeadRand = {
  id: string;
  nume: string;
  organizatie: string;
  email: string;
  telefon: string | null;
  cale: string | null;
  campanie: string | null;
  stare: StareLead;
  notita: string | null;
  nrTrimiteri: number;
  creatLa: string;
  ultimaTrimitereLa: string;
  actualizatDe: string | null;
  // Adresa are deja cont în platformă (s-a înscris): lead-ul se poate marca „Înscris”.
  areCont: boolean;
};

export async function listeazaLeaduriAction(): Promise<LeadRand[]> {
  await cerePlatformAdmin();
  const randuri = await inContextPlatforma(async (tx) => {
    const lead = await tx.select().from(intereseOng).orderBy(desc(intereseOng.creatLa)).limit(2000);
    const conturi = (await tx.execute(sql`select lower(email) as email from app_users where lower(email) in (select lower(email) from interese_ong)`)) as unknown as { email: string }[];
    return { lead, conturi: new Set(conturi.map((c) => c.email)) };
  });
  return randuri.lead.map((l) => ({
    id: l.id,
    nume: l.nume,
    organizatie: l.organizatie,
    email: l.email,
    telefon: l.telefon,
    cale: l.cale,
    campanie: l.campanie,
    stare: esteStareLead(l.stare) ? l.stare : "nou",
    notita: l.notita,
    nrTrimiteri: l.nrTrimiteri,
    creatLa: l.creatLa.toISOString(),
    ultimaTrimitereLa: l.ultimaTrimitereLa.toISOString(),
    actualizatDe: l.actualizatDe,
    areCont: randuri.conturi.has(l.email.toLowerCase()),
  }));
}

export type RezultatLead = { ok: true } | { ok: false; eroare: string };

export async function schimbaStareLeadAction(id: string, stare: string): Promise<RezultatLead> {
  const email = await cerePlatformAdmin();
  if (!UUID.test(String(id)) || !esteStareLead(stare)) return { ok: false, eroare: "Cerere invalidă." };
  await inContextPlatforma((tx) => tx.execute(sql`update interese_ong set stare = ${stare}, actualizat_la = now(), actualizat_de = ${email} where id = ${id}`));
  revalidatePath("/platform-admin/lead-uri");
  return { ok: true };
}

export async function salveazaNotitaLeadAction(id: string, notita: string): Promise<RezultatLead> {
  const email = await cerePlatformAdmin();
  if (!UUID.test(String(id))) return { ok: false, eroare: "Cerere invalidă." };
  await inContextPlatforma((tx) => tx.execute(sql`update interese_ong set notita = ${curataNotita(notita)}, actualizat_la = now(), actualizat_de = ${email} where id = ${id}`));
  revalidatePath("/platform-admin/lead-uri");
  return { ok: true };
}

// Ștergerea e definitivă (o persoană poate cere ștergerea datelor sale): interfața cere confirmare înainte.
export async function stergeLeadAction(id: string): Promise<RezultatLead> {
  await cerePlatformAdmin();
  if (!UUID.test(String(id))) return { ok: false, eroare: "Cerere invalidă." };
  await inContextPlatforma((tx) => tx.execute(sql`delete from interese_ong where id = ${id}`));
  revalidatePath("/platform-admin/lead-uri");
  return { ok: true };
}
