import "server-only";

import { eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { appUsers } from "@/lib/db/schema";

// Notează o autentificare reușită pe care NU o face formularul de parolă: linkul de confirmare a contului din email, Google, resetarea parolei (/auth/callback).
// Fără asta, cine și-a confirmat contul pe email și a rămas conectat ar apărea în Panou platformă ca „fără activitate”.
// Nu creează nimic: dacă rândul app_users nu există încă (alt flux îl creează), nu face nimic. Eșecul nu trebuie să blocheze autentificarea — apelantul îl ignoră.
export async function noteazaAutentificare(email: string): Promise<void> {
  const normalizat = email.toLowerCase();
  await db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.current_user_email', ${normalizat}, true)`);
    const [u] = await tx.select({ id: appUsers.id, prima: appUsers.firstLoginAt }).from(appUsers).where(eq(appUsers.email, normalizat)).limit(1);
    if (!u) return;
    await tx.execute(sql`select set_config('app.current_user_id', ${u.id}, true)`);
    const acum = new Date();
    await tx.update(appUsers).set({ lastLoginAt: acum, firstLoginAt: u.prima ?? acum }).where(eq(appUsers.id, u.id));
  });
}
