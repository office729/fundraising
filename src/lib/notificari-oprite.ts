import "server-only";

import { and, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { appUsers, notificariOprite } from "@/lib/db/schema";

import { esteTipNotificare, semneazaNotificare, verificaSemnaturaNotificare, type TipNotificare } from "./notificari-token";

// Notificările pe e-mail pe care utilizatorul le-a oprit. Rutele care le folosesc sunt publice (link semnat din e-mail), din „Contul meu” sau cron, deci
// rulează în contextul app.public_lookup, cu predicat EXPLICIT pe user_id (RLS nu scopează aici; vezi CAPCANA #4 din documentation/rls-setup.sql).

const URL_BAZA = () => (process.env.NEXT_PUBLIC_SITE_URL || "https://alexandrit.ro").replace(/\/+$/, "");
const cheie = () => {
  const c = process.env.ORG_SECRETS_KEY;
  if (!c) throw new Error("ORG_SECRETS_KEY lipsește — nu se pot semna linkuri de dezabonare.");
  return c;
};

export function linkDezabonareNotificare(tip: TipNotificare, userId: string, oneClick = false): string {
  const q = new URLSearchParams({ tip, u: userId, t: semneazaNotificare(cheie(), tip, userId) });
  return `${URL_BAZA()}${oneClick ? "/api/dezabonare-notificare" : "/dezabonare-notificare"}?${q.toString()}`;
}

export function linkNotificareValid(tip: string | null, userId: string | null, t: string | null): tip is TipNotificare {
  try {
    return verificaSemnaturaNotificare(cheie(), tip, userId, t);
  } catch {
    return false;
  }
}

async function inLookup<T>(f: (tx: typeof db) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.public_lookup', 'true', true)`);
    return f(tx as unknown as typeof db);
  });
}

export async function opreNotificare(userId: string, tip: TipNotificare): Promise<void> {
  await inLookup((tx) => tx.insert(notificariOprite).values({ userId, tip }).onConflictDoNothing());
}

export async function reiaNotificare(userId: string, tip: TipNotificare): Promise<void> {
  await inLookup((tx) => tx.delete(notificariOprite).where(and(eq(notificariOprite.userId, userId), eq(notificariOprite.tip, tip))));
}

export async function estePrimitaOprita(userId: string, tip: TipNotificare): Promise<boolean> {
  const r = await inLookup((tx) => tx.select({ u: notificariOprite.userId }).from(notificariOprite).where(and(eq(notificariOprite.userId, userId), eq(notificariOprite.tip, tip))).limit(1));
  return r.length > 0;
}

// Dintr-o listă de utilizatori, cei care au oprit acest tip de notificare.
export async function utilizatoriCuNotificareOprita(userIds: string[], tip: TipNotificare): Promise<Set<string>> {
  if (userIds.length === 0) return new Set();
  const r = await inLookup((tx) => tx.select({ u: notificariOprite.userId }).from(notificariOprite).where(and(eq(notificariOprite.tip, tip), inArray(notificariOprite.userId, userIds))));
  return new Set(r.map((x) => x.u));
}

export async function idUtilizatorDupaEmail(email: string): Promise<string | null> {
  const e = email.trim().toLowerCase();
  const r = await inLookup((tx) => tx.select({ id: appUsers.id }).from(appUsers).where(sql`lower(${appUsers.email}) = ${e}`).limit(1));
  return r[0]?.id ?? null;
}

export { esteTipNotificare };
export type { TipNotificare };
