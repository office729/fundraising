import { boolean, date, index, integer, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { appUsers } from "./app-users";
import { fundraisingPages } from "./fundraising-pages";
import { organizations } from "./organizations";

// Panoul voluntarilor: o pagină publică (fără cont) pe care voluntarii distribuie campaniile organizației.
// Toate tabelele au org_id + RLS de izolare pe organizație. Accesul public nu are politici proprii: serverul
// verifică întâi codul linkului (volunteer_panel_links, singurul tabel citit sub app.public_lookup) și apoi
// lucrează într-o tranzacție cu app.current_org_id setat, exact ca orice utilizator al organizației.

// Linkul comun al voluntarilor: /voluntar/<cod>. Un singur rând pe organizație; schimbarea codului invalidează linkul vechi.
export const volunteerPanelLinks = pgTable(
  "volunteer_panel_links",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .unique()
      .references(() => organizations.id, { onDelete: "cascade" }),
    cod: text("cod").notNull().unique(), // 12 caractere aleatoare
    activ: boolean("activ").notNull().default(true),
    // Mesajul implicit de distribuire (poate conține {titlu} și {link}); gol = textul generat de platformă.
    mesajImplicit: text("mesaj_implicit"),
    createdBy: uuid("created_by").references(() => appUsers.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    schimbatLa: timestamp("schimbat_la", { withTimezone: true }),
  },
).enableRLS();

// Un voluntar care a intrat pe link. `id` este valoarea din cookie-ul httpOnly (aleatoare, 122 de biți).
export const volunteerVisitors = pgTable(
  "volunteer_visitors",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    prenume: text("prenume").notNull(),
    telefon: text("telefon"), // doar cifre, ultimele 9 (pentru potrivirea cu fișa din CRM)
    email: text("email"), // opțional; folosit doar pentru confirmările de înscriere
    acordInvitatii: boolean("acord_invitatii").notNull().default(false), // a bifat explicit că vrea invitații la activități
    ultimaInvitatieLa: timestamp("ultima_invitatie_la", { withTimezone: true }),
    // Fișa din CRM Voluntari (id-ul din lista voluntarilor) dacă telefonul se potrivește cu un singur voluntar activ.
    voluntarId: text("voluntar_id"),
    legatLa: timestamp("legat_la", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    ultimaActivitateLa: timestamp("ultima_activitate_la", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("volunteer_visitors_org_idx").on(t.orgId, t.ultimaActivitateLa.desc()), index("volunteer_visitors_telefon_idx").on(t.orgId, t.telefon)],
).enableRLS();

// O distribuire bifată de un voluntar: campanie + canal + zi (ora României). O singură dată pe zi pentru aceeași combinație.
export const volunteerShares = pgTable(
  "volunteer_shares",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    visitorId: uuid("visitor_id")
      .notNull()
      .references(() => volunteerVisitors.id, { onDelete: "cascade" }),
    campaignPageId: uuid("campaign_page_id")
      .notNull()
      .references(() => fundraisingPages.id, { onDelete: "cascade" }),
    canal: text("canal").notNull(),
    ziua: date("ziua").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("volunteer_shares_unic_idx").on(t.visitorId, t.campaignPageId, t.canal, t.ziua),
    index("volunteer_shares_org_idx").on(t.orgId, t.createdAt.desc()),
    index("volunteer_shares_campanie_idx").on(t.campaignPageId),
  ],
).enableRLS();

// Misiunea zilei: până la 5 acțiuni (campanie + canal) alocate fiecărui voluntar, o singură dată pe zi.
export const volunteerMissions = pgTable(
  "volunteer_missions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    visitorId: uuid("visitor_id")
      .notNull()
      .references(() => volunteerVisitors.id, { onDelete: "cascade" }),
    ziua: date("ziua").notNull(),
    ordine: integer("ordine").notNull(),
    campaignPageId: uuid("campaign_page_id")
      .notNull()
      .references(() => fundraisingPages.id, { onDelete: "cascade" }),
    canal: text("canal").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("volunteer_missions_ordine_idx").on(t.visitorId, t.ziua, t.ordine),
    uniqueIndex("volunteer_missions_unic_idx").on(t.visitorId, t.ziua, t.campaignPageId, t.canal),
  ],
).enableRLS();

// Campania săptămânii: una singură pe săptămână (de luni), aleasă de coordonatoare.
export const volunteerFeatured = pgTable(
  "volunteer_featured",
  {
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    saptamana: date("saptamana").notNull(), // data de luni
    campaignPageId: uuid("campaign_page_id")
      .notNull()
      .references(() => fundraisingPages.id, { onDelete: "cascade" }),
    setatDe: uuid("setat_de").references(() => appUsers.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.orgId, t.saptamana] })],
).enableRLS();

// Setări per campanie pentru panou: ascunde campania voluntarilor sau dă un mesaj propriu de distribuire.
export const volunteerCampaignSettings = pgTable(
  "volunteer_campaign_settings",
  {
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    campaignPageId: uuid("campaign_page_id")
      .notNull()
      .references(() => fundraisingPages.id, { onDelete: "cascade" }),
    ascunsa: boolean("ascunsa").notNull().default(false),
    mesaj: text("mesaj"),
    actualizatLa: timestamp("actualizat_la", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.orgId, t.campaignPageId] })],
).enableRLS();
