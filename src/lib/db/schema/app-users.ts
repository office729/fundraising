import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

// Persoana autentificată prin Supabase Auth (o replică minimă, legată prin
// e-mail — vezi pattern-ul din SOI_CRM `verifySession()`). NU conține rol
// global: rolul e per-organizație, în tabelul `memberships`. Numit
// `app_users` (nu `users`) ca să nu se confunde cu `auth.users` din Supabase.
export const appUsers = pgTable("app_users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}).enableRLS();
