import { pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { appUsers } from "./app-users";

// Notificări pe e-mail oprite de un utilizator (per utilizator, pentru toate organizațiile lui). Vezi documentation/notificari-oprite.sql.
export const notificariOprite = pgTable(
  "notificari_oprite",
  {
    userId: uuid("user_id").notNull().references(() => appUsers.id, { onDelete: "cascade" }),
    tip: text("tip").notNull(), // rezumat-calendar | invitatie-feedback
    creatLa: timestamp("creat_la", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.tip] })],
).enableRLS();
