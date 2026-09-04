import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { appUsers } from "./app-users";
import { membershipRole } from "./enums";
import { organizations } from "./organizations";

// Invitație de echipă. `token` e secretul din link (/invite/[token]) —
// singura cale de a citi/accepta o invitație înainte de a fi membru al
// organizației (vezi politica RLS bazată pe token, nu pe membership).
// `orgName` e denormalizat (copie la creare) ca pagina publică de acceptare
// să nu aibă nevoie de o interogare separată pe `organizations`.
export const invites = pgTable(
  "invites",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    orgName: text("org_name").notNull(),
    email: text("email").notNull(),
    role: membershipRole("role").notNull().default("member"),
    token: text("token").notNull().unique(),
    invitedBy: uuid("invited_by").references(() => appUsers.id),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (t) => [index("invites_org_idx").on(t.orgId), index("invites_email_idx").on(t.email)],
).enableRLS();
