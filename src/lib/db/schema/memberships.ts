import { pgTable, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { membershipRole } from "./enums";
import { appUsers } from "./app-users";
import { organizations } from "./organizations";

// Leagă un app_user de o organizație, cu un rol specific ACELEI organizații.
// Un user poate aparține (teoretic) mai multor organizații — de aceea rolul
// nu stă pe app_users, ci aici.
export const memberships = pgTable(
  "memberships",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => appUsers.id, { onDelete: "cascade" }),
    role: membershipRole("role").notNull().default("member"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("memberships_org_user_unique").on(t.orgId, t.userId)],
).enableRLS();
